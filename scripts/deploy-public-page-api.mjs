import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { getServiceAccountAccessToken } from "../modules/test-modules-remote-ops/server/remote-ops-service-account-auth-runtime.mjs";

function normalizeText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseArgs(argv) {
  const result = {};
  argv.forEach((entry) => {
    if (!entry.startsWith("--")) {
      return;
    }
    const [key, rawValue = "true"] = entry.slice(2).split("=");
    result[key] = rawValue;
  });
  return result;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        ...(options.env ?? {})
      }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}\n${stderr}`));
    });
  });
}

async function requestGoogleJson(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const payload = text.length > 0 ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? `Google API request failed with status ${response.status} for ${url}`
    );
  }
  return payload;
}

async function requestGoogleNoContent(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  if (!response.ok) {
    let payload = null;
    try {
      payload = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    throw new Error(
      payload?.error?.message ?? `Google API request failed with status ${response.status} for ${url}`
    );
  }
  return text.length > 0 ? JSON.parse(text) : null;
}

async function waitForOperation(operationUrl, accessToken) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const operation = await requestGoogleJson(operationUrl, accessToken, {
      method: "GET"
    });
    if (operation.done) {
      if (operation.error) {
        throw new Error(operation.error.message ?? "Cloud Run operation failed.");
      }
      return operation;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Timed out waiting for operation ${operationUrl}`);
}

async function ensureServiceEnabled(projectId, serviceName, accessToken) {
  const payload = await requestGoogleJson(
    `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${serviceName}`,
    accessToken,
    { method: "GET" }
  );
  if (payload.state === "ENABLED") {
    return;
  }
  const operation = await requestGoogleJson(
    `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${serviceName}:enable`,
    accessToken,
    { method: "POST", body: "{}" }
  );
  await waitForOperation(`https://serviceusage.googleapis.com/v1/${operation.name}`, accessToken);
}

function buildCloudRunServiceBody({
  imageTag,
  projectId,
  serviceAccountKeyBase64,
  allowComments,
  commentsCollectionPath,
  runtimeServiceAccount = null
}) {
  return {
    ingress: "INGRESS_TRAFFIC_ALL",
    template: {
      ...(runtimeServiceAccount ? { serviceAccount: runtimeServiceAccount } : {}),
      timeout: "30s",
      maxInstanceRequestConcurrency: 80,
      scaling: {
        maxInstanceCount: 2
      },
      containers: [
        {
          image: imageTag,
          ports: [{ containerPort: 8080 }],
          env: [
            { name: "PUBLIC_PAGE_API_PROJECT_ID", value: projectId },
            {
              name: "PUBLIC_PAGE_API_ALLOWED_COLLECTIONS",
              value: "publishedPosts,publishedPages,publicBlogCategories,publicBlogTags"
            },
            {
              name: "PUBLIC_PAGE_API_ALLOW_COMMENTS",
              value: allowComments ? "true" : "false"
            },
            {
              name: "PUBLIC_PAGE_API_COMMENTS_COLLECTION",
              value: commentsCollectionPath
            },
            {
              name: "PUBLIC_PAGE_API_SERVICE_ACCOUNT_JSON_BASE64",
              value: serviceAccountKeyBase64
            }
          ]
        }
      ]
    }
  };
}

async function upsertCloudRunService({
  projectId,
  region,
  serviceName,
  imageTag,
  accessToken,
  serviceAccountKeyBase64,
  allowComments,
  commentsCollectionPath,
  runtimeServiceAccount = null
}) {
  const serviceUrl = `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/services/${serviceName}`;
  const body = buildCloudRunServiceBody({
    imageTag,
    projectId,
    serviceAccountKeyBase64,
    allowComments,
    commentsCollectionPath,
    runtimeServiceAccount
  });

  const existingResponse = await fetch(serviceUrl, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (existingResponse.status === 404) {
    const createOperation = await requestGoogleJson(
      `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/services?serviceId=${encodeURIComponent(serviceName)}`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
    await waitForOperation(`https://run.googleapis.com/v2/${createOperation.name}`, accessToken);
    return;
  }

  if (!existingResponse.ok) {
    const text = await existingResponse.text();
    throw new Error(`Failed to load existing Cloud Run service: ${text}`);
  }

  const updateOperation = await requestGoogleJson(
    `${serviceUrl}?updateMask=template.containers,template.serviceAccount,template.scaling,template.timeout,ingress`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(body)
    }
  );
  await waitForOperation(`https://run.googleapis.com/v2/${updateOperation.name}`, accessToken);
}

async function allowUnauthenticatedInvoker(projectId, region, serviceName, accessToken) {
  const iamUrl = `https://run.googleapis.com/v1/projects/${projectId}/locations/${region}/services/${serviceName}:setIamPolicy`;
  await requestGoogleJson(iamUrl, accessToken, {
    method: "POST",
    body: JSON.stringify({
      policy: {
        bindings: [
          {
            role: "roles/run.invoker",
            members: ["allUsers"]
          }
        ]
      }
    })
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectId = normalizeText(args.project);
  const region = normalizeText(args.region) ?? "us-central1";
  const serviceName = normalizeText(args.service) ?? "page-public-api";
  const keyPath = normalizeText(args["key-file"]);
  const runtimeServiceAccount = normalizeText(args["runtime-service-account"]);
  const allowComments = String(args["allow-comments"] ?? "true").toLowerCase() !== "false";
  const commentsCollectionPath = normalizeText(args["comments-collection"]) ?? "publicComments";

  if (!projectId || !keyPath) {
    throw new Error(
      "Usage: node scripts/deploy-public-page-api.mjs --project=<project> --key-file=<path> [--region=us-central1] [--service=page-public-api] [--runtime-service-account=<email>]"
    );
  }

  const resolvedKeyPath = path.resolve(keyPath);
  const credentialsRaw = await readFile(resolvedKeyPath, "utf8");
  const credentials = JSON.parse(credentialsRaw);
  const serviceAccountKeyBase64 = Buffer.from(credentialsRaw).toString("base64");
  const { accessToken } = await getServiceAccountAccessToken({
    credentialPathHint: resolvedKeyPath,
    credentialsStoredPath: resolvedKeyPath,
    serviceAccountEmail: credentials.client_email,
    projectId
  });

  await ensureServiceEnabled(projectId, "run.googleapis.com", accessToken);

  const imageTag = `gcr.io/${projectId}/${serviceName}:${Date.now()}`;
  const buildContext = path.resolve("modules/test-modules-pages/public-app-api");

  await runCommand("docker", ["login", "-u", "oauth2accesstoken", "-p", accessToken, "https://gcr.io"]);
  await runCommand("docker", ["build", "-t", imageTag, buildContext]);
  await runCommand("docker", ["push", imageTag]);

  await upsertCloudRunService({
    projectId,
    region,
    serviceName,
    imageTag,
    accessToken,
    serviceAccountKeyBase64,
    allowComments,
    commentsCollectionPath,
    runtimeServiceAccount
  });

  await allowUnauthenticatedInvoker(projectId, region, serviceName, accessToken);

  const service = await requestGoogleJson(
    `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/services/${serviceName}`,
    accessToken,
    { method: "GET" }
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        serviceName,
        serviceUrl: service.uri,
        imageTag
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error?.message ?? String(error)}\n`);
  process.exitCode = 1;
});
