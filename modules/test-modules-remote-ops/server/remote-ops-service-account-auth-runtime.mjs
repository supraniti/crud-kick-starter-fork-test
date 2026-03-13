import { createSign } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeOptionalText } from "./remote-ops-shared-runtime.mjs";
import { resolveRemoteOpsCredentialsRoot } from "./remote-ops-root.mjs";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DEFAULT_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

function toAbsoluteCredentialPath(inputPath) {
  const normalized = normalizeOptionalText(inputPath);
  if (!normalized) {
    throw new Error("Service account key file path is required.");
  }
  return path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.resolve(process.cwd(), normalized);
}

function parseCredentialPayload(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error("Service account key file must contain valid JSON.");
  }
}

function sanitizeCredentialFileName(inputName) {
  const normalized = normalizeOptionalText(inputName) ?? "service-account.json";
  const baseName = path.basename(normalized);
  const sanitized = baseName.replace(/[^A-Za-z0-9._-]+/g, "-");
  return sanitized.length > 0 ? sanitized : "service-account.json";
}

function requireText(value, label) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw new Error(`Service account key is missing '${label}'.`);
  }
  return normalized;
}

export function validateServiceAccountCredentialPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Service account key file must contain a JSON object.");
  }
  const credentialType = requireText(payload.type, "type");
  if (credentialType !== "service_account") {
    throw new Error("The credential file must be a Google service-account key.");
  }

  return {
    type: credentialType,
    projectId: normalizeOptionalText(payload.project_id),
    privateKeyId: requireText(payload.private_key_id, "private_key_id"),
    privateKey: requireText(payload.private_key, "private_key"),
    clientEmail: requireText(payload.client_email, "client_email"),
    tokenUri: requireText(payload.token_uri, "token_uri"),
    clientId: normalizeOptionalText(payload.client_id)
  };
}

export async function readServiceAccountCredentialFromPath(inputPath) {
  const absolutePath = toAbsoluteCredentialPath(inputPath);
  let rawText;
  try {
    rawText = await readFile(absolutePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        "Stored service-account key file is missing. Choose the JSON key file again to re-import it."
      );
    }
    throw error;
  }
  const parsed = parseCredentialPayload(rawText);
  const credential = validateServiceAccountCredentialPayload(parsed);
  return {
    absolutePath,
    fileName: path.basename(absolutePath),
    credential
  };
}

export async function importServiceAccountCredentialFile({
  connectionId,
  fileName,
  fileContent,
  previousPath = null
}) {
  const normalizedConnectionId = normalizeOptionalText(connectionId);
  if (!normalizedConnectionId) {
    throw new Error("Connection id is required before importing a service-account key file.");
  }
  if (typeof fileContent !== "string" || fileContent.trim().length === 0) {
    throw new Error("Service account key file content is required.");
  }

  const parsed = parseCredentialPayload(fileContent);
  const credential = validateServiceAccountCredentialPayload(parsed);
  const safeFileName = sanitizeCredentialFileName(fileName);
  const credentialsRoot = resolveRemoteOpsCredentialsRoot();
  const targetDir = path.join(credentialsRoot, normalizedConnectionId);
  const absolutePath = path.join(targetDir, safeFileName);

  await mkdir(targetDir, { recursive: true });
  await writeFile(absolutePath, JSON.stringify(parsed, null, 2), "utf8");

  const normalizedPreviousPath = normalizeOptionalText(previousPath);
  if (
    normalizedPreviousPath &&
    normalizedPreviousPath !== absolutePath &&
    normalizedPreviousPath.startsWith(credentialsRoot)
  ) {
    await rm(normalizedPreviousPath, { force: true });
  }

  return {
    absolutePath,
    fileName: safeFileName,
    credential
  };
}

function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function buildSignedJwtAssertion({ credential, scope = DEFAULT_SCOPE }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: credential.privateKeyId
  };
  const payload = {
    iss: credential.clientEmail,
    scope,
    aud: credential.tokenUri || GOOGLE_TOKEN_ENDPOINT,
    exp: issuedAt + 3600,
    iat: issuedAt
  };
  const unsignedToken = `${encodeJwtPart(header)}.${encodeJwtPart(payload)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(credential.privateKey).toString("base64url");
  return `${unsignedToken}.${signature}`;
}

async function exchangeAssertionForAccessToken(assertion, tokenUri) {
  const response = await fetch(tokenUri || GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    }).toString()
  });
  const rawText = await response.text();
  const payload = rawText ? JSON.parse(rawText) : {};
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description ?? payload?.error ?? "Failed to obtain a GCP access token from the service-account key.");
  }
  return payload.access_token;
}

export async function getServiceAccountAccessToken(connectionProfile, scope = DEFAULT_SCOPE) {
  const loaded = await readServiceAccountCredentialFromPath(connectionProfile.credentialPathHint);
  const assertion = buildSignedJwtAssertion({
    credential: loaded.credential,
    scope
  });
  return {
    accessToken: await exchangeAssertionForAccessToken(assertion, loaded.credential.tokenUri),
    loadedCredential: loaded
  };
}

export function buildServiceAccountConnectionMetadata(loadedCredential) {
  return {
    authMode: "service-account-key",
    credentialPathHint: loadedCredential.absolutePath,
    credentialLabel: loadedCredential.fileName,
    serviceAccountEmail: loadedCredential.credential.clientEmail,
    serviceAccountKeyId: loadedCredential.credential.privateKeyId,
    projectId: loadedCredential.credential.projectId
  };
}
