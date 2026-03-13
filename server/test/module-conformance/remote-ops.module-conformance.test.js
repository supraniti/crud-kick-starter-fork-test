import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash, generateKeyPairSync } from "node:crypto";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { buildServer } from "../../src/app.js";
import {
  resolveDeploymentRoot,
  resolveRemoteOpsCredentialsRoot,
  resolveRemoteOpsLiveConnectionsRoot,
  resolveRemoteOpsLiveSessionsRoot,
  resolveSimulatedFirestoreRoot,
  resolveSimulatedStorageRoot
} from "../../../modules/test-modules-remote-ops/server/remote-ops-root.mjs";

const REMOTE_OPS_TEST_TIMEOUT_MS = 20_000;
const TEST_RUNTIME_ROOT = path.resolve(process.cwd(), ".codex-runtime", "remote-ops-tests");

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await removeIfExists(resolveRemoteOpsCredentialsRoot());
  await removeIfExists(resolveRemoteOpsLiveConnectionsRoot());
  await removeIfExists(resolveRemoteOpsLiveSessionsRoot());
  await removeIfExists(TEST_RUNTIME_ROOT);
});

function resolveModulesDir() {
  const repoModulesDir = path.resolve(process.cwd(), "modules");
  if (existsSync(repoModulesDir)) {
    return repoModulesDir;
  }
  return path.resolve(process.cwd(), "..", "modules");
}

async function createRemoteOpsTestServer() {
  await removeIfExists(resolveRemoteOpsCredentialsRoot());
  await removeIfExists(resolveRemoteOpsLiveConnectionsRoot());
  await removeIfExists(resolveRemoteOpsLiveSessionsRoot());
  const instance = buildServer({
    logger: false,
    modulesDir: resolveModulesDir(),
    moduleRuntimeStateFile: null
  });
  await instance.listen({
    host: "127.0.0.1",
    port: 0
  });
  return instance;
}

async function injectJson(instance, method, url, payload) {
  const response = await instance.inject({
    method,
    url,
    payload
  });

  return {
    statusCode: response.statusCode,
    body: JSON.parse(response.body)
  };
}

function buildItemsRoute(collectionId) {
  return `/api/reference/collections/${collectionId}/items`;
}

function buildConnectionRoute(connectionId, action) {
  return `/api/reference/modules/test-modules-remote-ops/connections/${connectionId}/${action}`;
}

function buildTargetRoute(targetId, action) {
  return `/api/reference/modules/test-modules-remote-ops/targets/${targetId}/${action}`;
}

async function removeIfExists(targetPath) {
  await fs.rm(targetPath, {
    recursive: true,
    force: true
  });
}

async function seedConnection(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("remote-connection-profiles"), {
    profileName: "Primary GCP Dev",
    provider: "gcp",
    environmentLabel: "dev",
    authMode: "service-account-key",
    projectId: "demo-project",
    operatorEmail: "operator@example.com",
    region: "me-west1",
    credentialLabel: null,
    connectionStatus: "draft",
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

function createGoogleJsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(payload);
    }
  };
}

function createGoogleBufferResponse(status, content, contentType = "application/octet-stream") {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(headerName) {
        return headerName?.toLowerCase() === "content-type" ? contentType : null;
      }
    },
    async text() {
      return buffer.toString("utf8");
    },
    async arrayBuffer() {
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
  };
}

function hashStorageContent(content) {
  return createHash("md5").update(content).digest("base64");
}

function createServiceAccountCredentialPayload(overrides = {}) {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    type: "service_account",
    project_id: "demo-project",
    private_key_id: "key-001",
    private_key: privateKey.export({ type: "pkcs1", format: "pem" }).toString(),
    client_email: "crud-control@demo-project.iam.gserviceaccount.com",
    client_id: "1234567890",
    token_uri: "https://oauth2.googleapis.com/token",
    ...overrides
  };
}

async function seedAuthor(server) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-authors"), {
    displayName: "Remote Ops Editor",
    legalName: "Remote Ops Editor",
    bio: "Remote ops proof author",
    email: "remote-ops@example.com",
    role: "editor",
    status: "active",
    locale: "en-US",
    expertiseTagIds: []
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedCategory(server) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-categories"), {
    name: "Operations",
    description: "Operations category",
    parentCategoryId: null,
    sortOrder: 10,
    visibility: "public"
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedTag(server) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-tags"), {
    name: "Remote Ops",
    description: "Remote ops tag",
    color: "#225588",
    visibility: "public",
    seoTitle: "Remote Ops",
    seoDescription: "Remote ops tag"
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

function createLongBody(label) {
  return `<p>${label} `.repeat(24) + "</p>";
}

async function seedPublishedPost(server) {
  const author = await seedAuthor(server);
  const category = await seedCategory(server);
  const tag = await seedTag(server);
  const response = await injectJson(server, "POST", buildItemsRoute("blog-posts"), {
    title: "Remote Ops Launch Story",
    excerpt: "Remote ops launch story excerpt",
    body: createLongBody("Remote ops launch story body"),
    status: "published",
    publishedOn: "2026-03-11T09:00:00.000Z",
    format: "article",
    primaryAuthorId: author.id,
    coAuthorIds: [],
    categoryIds: [category.id],
    tagIds: [tag.id],
    galleryMediaIds: [],
    allowComments: true,
    commentPolicy: "open",
    seoTitle: "Remote Ops Launch Story",
    seoDescription: "Remote ops launch story",
    ogTitle: "Remote Ops Launch Story",
    ogDescription: "Remote ops launch story",
    createdByAuthorId: author.id,
    updatedByAuthorId: author.id
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

test("remote ops loads a service-account key, validates the project, and validates a live storage target", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const payload = createServiceAccountCredentialPayload();
    const fetchMock = vi.fn(async (url) => {
      const normalized = String(url);
      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "access-token-001",
          expires_in: 3600,
          token_type: "Bearer"
        });
      }
      if (normalized === "https://cloudresourcemanager.googleapis.com/v3/projects/demo-project") {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890",
          projectId: "demo-project",
          projectNumber: "1234567890",
          displayName: "Demo Project",
          state: "ACTIVE"
        });
      }
      if (normalized === "https://storage.googleapis.com/storage/v1/b/deployment-bucket") {
        return createGoogleJsonResponse(200, {
          name: "deployment-bucket",
          location: "ME-WEST1"
        });
      }
      throw new Error(`Unexpected request: ${normalized}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const connection = await seedConnection(server, {
      credentialPathHint: null,
      projectId: "",
      projectNumber: "",
      projectDisplayName: ""
    });

    const connect = await injectJson(server, "POST", buildConnectionRoute(connection.id, "import-key-file"), {
      fileName: "demo-service-account.json",
      fileContent: JSON.stringify(payload)
    });
    expect(connect.statusCode, JSON.stringify(connect.body)).toBe(200);
    expect(connect.body.item.connectionStatus).toBe("connected");
    expect(connect.body.item.serviceAccountEmail).toBe(payload.client_email);
    expect(connect.body.item.serviceAccountKeyId).toBe(payload.private_key_id);
    expect(connect.body.item.projectId).toBe(payload.project_id);
    expect(connect.body.item.credentialLabel).toBe("demo-service-account.json");
    expect(connect.body.item.credentialPathHint).toContain("remote-ops-live");
    expect(connect.body.item.credentialPathHint).toContain("demo-service-account.json");

    const validate = await injectJson(server, "POST", buildConnectionRoute(connection.id, "validate"));
    expect(validate.statusCode, JSON.stringify(validate.body)).toBe(200);
    expect(validate.body.item.connectionStatus).toBe("validated");
    expect(validate.body.item.projectDisplayName).toBe("Demo Project");
    expect(validate.body.item.projectNumber).toBe("1234567890");

    const createTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Deployment Live Bucket",
      connectionProfileId: connection.id,
      targetKind: "deployment-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "deployment-bucket",
        prefix: "site",
        localRootHint: "deployment"
      },
      policy: {
        allowDeletes: false,
        allowRestore: false,
        requireDryRunFirst: true
      }
    });
    expect(createTarget.statusCode).toBe(201);

    const validateTarget = await injectJson(server, "POST", buildTargetRoute(createTarget.body.item.id, "validate"));
    expect(validateTarget.statusCode, JSON.stringify(validateTarget.body)).toBe(200);
    expect(validateTarget.body.item.targetStatus).toBe("validated");
    expect(validateTarget.body.item.validationSummary.message).toContain("deployment-bucket");
  } finally {
    await server.close();
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops exposes a module-local GCP provisioning model for compatibility planning", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/reference/modules/test-modules-remote-ops/gcp/provisioning-model"
    });
    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.body);
    expect(payload.ok).toBe(true);
    expect(payload.model.provider).toBe("gcp");
    expect(payload.model.authentication.primaryMode).toBe("service-account-key");
    expect(payload.model.authentication.rawCredentialStorageAllowed).toBe(false);
    expect(payload.model.compatibilityBundles.map((bundle) => bundle.id)).toEqual([
      "firestore-projection",
      "deployment-storage",
      "media-storage",
      "browser-delivery"
    ]);
    expect(
      payload.model.compatibilityBundles.find((bundle) => bundle.id === "firestore-projection")?.provisionableResources
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "firestore-default-database",
          createSupported: true
        })
      ])
    );
    expect(
      payload.model.compatibilityBundles.find((bundle) => bundle.id === "browser-delivery")?.provisionableResources
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "load-balancer-stack",
          phaseStatus: "planned"
        })
      ])
    );
  } finally {
    await server.close();
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops analyzes project compatibility against the module-local GCP provisioning model", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const payload = createServiceAccountCredentialPayload();
    const fetchMock = vi.fn(async (url, options = {}) => {
      const normalized = String(url);
      const method = options?.method ?? "GET";
      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "access-token-compatibility",
          expires_in: 3600,
          token_type: "Bearer"
        });
      }
      if (normalized === "https://cloudresourcemanager.googleapis.com/v3/projects/demo-project") {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890",
          projectId: "demo-project",
          projectNumber: "1234567890",
          displayName: "Demo Project",
          state: "ACTIVE"
        });
      }
      if (
        normalized === "https://cloudresourcemanager.googleapis.com/v1/projects/demo-project:testIamPermissions" &&
        method === "POST"
      ) {
        return createGoogleJsonResponse(200, {
          permissions: [
            "serviceusage.services.get",
            "serviceusage.services.enable",
            "resourcemanager.projects.get",
            "datastore.databases.get",
            "storage.buckets.get",
            "storage.buckets.getIamPolicy",
            "storage.objects.list",
            "storage.objects.create",
            "storage.objects.get",
            "storage.objects.delete"
          ]
        });
      }
      if (
        normalized ===
        "https://serviceusage.googleapis.com/v1/projects/1234567890/services/firestore.googleapis.com"
      ) {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890/services/firestore.googleapis.com",
          state: "DISABLED"
        });
      }
      if (
        normalized ===
        "https://serviceusage.googleapis.com/v1/projects/1234567890/services/storage.googleapis.com"
      ) {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890/services/storage.googleapis.com",
          state: "ENABLED"
        });
      }
      if (
        normalized ===
        "https://serviceusage.googleapis.com/v1/projects/1234567890/services/dns.googleapis.com"
      ) {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890/services/dns.googleapis.com",
          state: "DISABLED"
        });
      }
      if (
        normalized ===
        "https://serviceusage.googleapis.com/v1/projects/1234567890/services/certificatemanager.googleapis.com"
      ) {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890/services/certificatemanager.googleapis.com",
          state: "DISABLED"
        });
      }
      if (
        normalized ===
        "https://serviceusage.googleapis.com/v1/projects/1234567890/services/compute.googleapis.com"
      ) {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890/services/compute.googleapis.com",
          state: "DISABLED"
        });
      }
      if (normalized === "https://storage.googleapis.com/storage/v1/b/media-live-bucket") {
        return createGoogleJsonResponse(404, {
          error: {
            message: "Bucket not found"
          }
        });
      }
      throw new Error(`Unexpected request: ${method} ${normalized}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const connection = await seedConnection(server, {
      credentialPathHint: null,
      projectId: "",
      projectNumber: "",
      projectDisplayName: ""
    });
    const imported = await injectJson(server, "POST", buildConnectionRoute(connection.id, "import-key-file"), {
      fileName: "demo-compatibility.json",
      fileContent: JSON.stringify(payload)
    });
    expect(imported.statusCode, JSON.stringify(imported.body)).toBe(200);

    const createTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Live Media Bucket",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "media-live-bucket",
        prefix: "library",
        localRootHint: "media"
      },
      policy: {
        allowDeletes: true,
        allowRestore: true,
        requireDryRunFirst: true
      }
    });
    expect(createTarget.statusCode).toBe(201);

    const analyze = await injectJson(
      server,
      "POST",
      `/api/reference/modules/test-modules-remote-ops/connections/${connection.id}/analyze-compatibility`
    );
    expect(analyze.statusCode, JSON.stringify(analyze.body)).toBe(200);
    expect(analyze.body.report.project.projectId).toBe("demo-project");
    expect(analyze.body.report.bundles.map((bundle) => bundle.id)).toEqual([
      "firestore-projection",
      "deployment-storage",
      "media-storage",
      "browser-delivery"
    ]);
    expect(analyze.body.report.bundles.find((bundle) => bundle.id === "firestore-projection")?.state).toBe(
      "compatible"
    );
    expect(analyze.body.report.bundles.find((bundle) => bundle.id === "firestore-projection")?.notes).toEqual(
      expect.arrayContaining(["No live target is configured for this bundle yet."])
    );
    expect(
      analyze.body.report.bundles.find((bundle) => bundle.id === "media-storage")?.missingResources
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bucketName: "media-live-bucket"
        })
      ])
    );
    expect(
      analyze.body.report.bundles.find((bundle) => bundle.id === "media-storage")?.provisionableActions
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Create bucket 'media-live-bucket'",
          resourceKind: "bucket"
        })
      ])
    );
  } finally {
    await server.close();
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops provisions missing supported GCP resources for configured live targets", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const payload = createServiceAccountCredentialPayload();
    const enabledServices = new Set(["storage.googleapis.com"]);
    let firestoreCreated = false;
    let mediaBucketCreated = false;

    const fetchMock = vi.fn(async (url, options = {}) => {
      const normalized = String(url);
      const method = options?.method ?? "GET";
      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "access-token-provision",
          expires_in: 3600,
          token_type: "Bearer"
        });
      }
      if (normalized === "https://cloudresourcemanager.googleapis.com/v3/projects/demo-project") {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890",
          projectId: "demo-project",
          projectNumber: "1234567890",
          displayName: "Demo Project",
          state: "ACTIVE"
        });
      }
      if (
        normalized === "https://cloudresourcemanager.googleapis.com/v1/projects/demo-project:testIamPermissions" &&
        method === "POST"
      ) {
        return createGoogleJsonResponse(200, {
          permissions: [
            "serviceusage.services.get",
            "serviceusage.services.enable",
            "resourcemanager.projects.get",
            "datastore.databases.get",
            "datastore.databases.create",
            "storage.buckets.get",
            "storage.buckets.getIamPolicy",
            "storage.buckets.create",
            "storage.buckets.update",
            "storage.buckets.setIamPolicy",
            "storage.objects.list",
            "storage.objects.create",
            "storage.objects.get",
            "storage.objects.delete"
          ]
        });
      }
      if (normalized.startsWith("https://serviceusage.googleapis.com/v1/projects/1234567890/services/") && method === "GET") {
        const serviceName = normalized.split("/services/").at(-1);
        return createGoogleJsonResponse(200, {
          name: `projects/1234567890/services/${serviceName}`,
          state: enabledServices.has(serviceName) ? "ENABLED" : "DISABLED"
        });
      }
      if (
        normalized === "https://serviceusage.googleapis.com/v1/projects/1234567890/services:batchEnable" &&
        method === "POST"
      ) {
        const requestPayload = JSON.parse(options.body);
        (requestPayload.serviceIds ?? []).forEach((serviceName) => enabledServices.add(serviceName));
        return createGoogleJsonResponse(200, {
          name: "operations/serviceusage.batchEnable.001"
        });
      }
      if (normalized === "https://serviceusage.googleapis.com/v1/operations/serviceusage.batchEnable.001") {
        return createGoogleJsonResponse(200, {
          name: "operations/serviceusage.batchEnable.001",
          done: true,
          response: {}
        });
      }
      if (normalized === "https://firestore.googleapis.com/v1/projects/demo-project/databases/(default)") {
        if (!firestoreCreated) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Database not found"
            }
          });
        }
        return createGoogleJsonResponse(200, {
          name: "projects/demo-project/databases/(default)",
          type: "FIRESTORE_NATIVE"
        });
      }
      if (
        normalized ===
          "https://firestore.googleapis.com/v1/projects/demo-project/databases?databaseId=(default)" &&
        method === "POST"
      ) {
        firestoreCreated = true;
        return createGoogleJsonResponse(200, {
          name: "operations/firestore.create.001"
        });
      }
      if (normalized === "https://firestore.googleapis.com/v1/operations/firestore.create.001") {
        return createGoogleJsonResponse(200, {
          name: "operations/firestore.create.001",
          done: true,
          response: {
            name: "projects/demo-project/databases/(default)"
          }
        });
      }
      if (normalized === "https://storage.googleapis.com/storage/v1/b/media-live-bucket") {
        if (!mediaBucketCreated) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Bucket not found"
            }
          });
        }
        return createGoogleJsonResponse(200, {
          name: "media-live-bucket",
          location: "ME-WEST1"
        });
      }
      if (normalized === "https://storage.googleapis.com/storage/v1/b?project=demo-project" && method === "POST") {
        const requestPayload = JSON.parse(options.body);
        expect(requestPayload.name).toBe("media-live-bucket");
        mediaBucketCreated = true;
        return createGoogleJsonResponse(200, {
          name: "media-live-bucket"
        });
      }
      throw new Error(`Unexpected request: ${method} ${normalized}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const connection = await seedConnection(server, {
      credentialPathHint: null,
      projectId: "",
      projectNumber: "",
      projectDisplayName: ""
    });
    const imported = await injectJson(server, "POST", buildConnectionRoute(connection.id, "import-key-file"), {
      fileName: "demo-provision.json",
      fileContent: JSON.stringify(payload)
    });
    expect(imported.statusCode, JSON.stringify(imported.body)).toBe(200);

    const createFirestoreTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Live Posts Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      adapterMode: "live-gcp",
      config: {
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "publishedPosts"
      },
      policy: {
        allowDeletes: false,
        allowRestore: false,
        requireDryRunFirst: true
      }
    });
    expect(createFirestoreTarget.statusCode).toBe(201);

    const createMediaTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Live Media Bucket",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "media-live-bucket",
        prefix: "library",
        localRootHint: "media"
      },
      policy: {
        allowDeletes: true,
        allowRestore: true,
        requireDryRunFirst: true
      }
    });
    expect(createMediaTarget.statusCode).toBe(201);

    const provision = await injectJson(
      server,
      "POST",
      `/api/reference/modules/test-modules-remote-ops/connections/${connection.id}/provision-missing`,
      {
        confirmedSafeguardIds: ["cost-confirmation", "singleton-hygiene", "minimum-footprint"]
      }
    );
    expect(provision.statusCode, JSON.stringify(provision.body)).toBe(200);
    expect(provision.body.executedActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "enable-firestore.googleapis.com", resourceKind: "api" }),
        expect.objectContaining({ id: "create-firestore-default-database", resourceKind: "firestore-database" }),
        expect.objectContaining({ resourceKind: "bucket", label: "Create bucket 'media-live-bucket'" })
      ])
    );
    expect(provision.body.report.bundles.find((bundle) => bundle.id === "firestore-projection")?.state).toBe(
      "compatible"
    );
    expect(provision.body.report.bundles.find((bundle) => bundle.id === "media-storage")?.state).toBe(
      "compatible"
    );
    expect(provision.body.run.summary.createCount).toBe(3);
    expect(firestoreCreated).toBe(true);
    expect(mediaBucketCreated).toBe(true);
    expect(enabledServices.has("firestore.googleapis.com")).toBe(true);
  } finally {
    await server.close();
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops compares and executes a live Firestore projection against GCP APIs", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const payload = createServiceAccountCredentialPayload();
    const remoteDocuments = new Map();
    const fetchMock = vi.fn(async (url, options = {}) => {
      const normalized = String(url);
      const method = options?.method ?? "GET";
      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "access-token-firestore-live",
          expires_in: 3600,
          token_type: "Bearer"
        });
      }
      if (normalized === "https://cloudresourcemanager.googleapis.com/v3/projects/demo-project") {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890",
          projectId: "demo-project",
          projectNumber: "1234567890",
          displayName: "Demo Project",
          state: "ACTIVE"
        });
      }
      if (
        normalized ===
        "https://serviceusage.googleapis.com/v1/projects/1234567890/services/firestore.googleapis.com"
      ) {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890/services/firestore.googleapis.com",
          state: "ENABLED"
        });
      }
      if (normalized === "https://firestore.googleapis.com/v1/projects/demo-project/databases/(default)") {
        return createGoogleJsonResponse(200, {
          name: "projects/demo-project/databases/(default)",
          type: "FIRESTORE_NATIVE"
        });
      }
      if (
        normalized ===
        "https://firestore.googleapis.com/v1/projects/demo-project/databases/(default)/documents/publishedPosts?pageSize=200"
      ) {
        return createGoogleJsonResponse(200, {
          documents: [...remoteDocuments.values()]
        });
      }

      const documentBase =
        "https://firestore.googleapis.com/v1/projects/demo-project/databases/(default)/documents/publishedPosts/";
      if (normalized.startsWith(documentBase)) {
        const documentId = decodeURIComponent(normalized.slice(documentBase.length));
        if (method === "DELETE") {
          if (remoteDocuments.has(documentId)) {
            remoteDocuments.delete(documentId);
            return createGoogleJsonResponse(200, {});
          }
          return createGoogleJsonResponse(404, {
            error: {
              message: "Document not found"
            }
          });
        }
        if (method === "PATCH") {
          const requestPayload = JSON.parse(options.body);
          remoteDocuments.set(documentId, {
            name: `projects/demo-project/databases/(default)/documents/publishedPosts/${documentId}`,
            fields: requestPayload.fields
          });
          return createGoogleJsonResponse(200, remoteDocuments.get(documentId));
        }
      }

      throw new Error(`Unexpected request: ${method} ${normalized}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const connection = await seedConnection(server, {
      credentialPathHint: null,
      projectId: "",
      projectNumber: "",
      projectDisplayName: ""
    });
    const imported = await injectJson(server, "POST", buildConnectionRoute(connection.id, "import-key-file"), {
      fileName: "demo-firestore-live.json",
      fileContent: JSON.stringify(payload)
    });
    expect(imported.statusCode, JSON.stringify(imported.body)).toBe(200);

    const validateConnection = await injectJson(server, "POST", buildConnectionRoute(connection.id, "validate"));
    expect(validateConnection.statusCode, JSON.stringify(validateConnection.body)).toBe(200);
    expect(validateConnection.body.item.connectionStatus).toBe("validated");

    const post = await seedPublishedPost(server);

    const createTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Live Posts Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      adapterMode: "live-gcp",
      config: {
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "publishedPosts"
      },
      policy: {
        allowDeletes: false,
        allowRestore: false,
        requireDryRunFirst: true
      }
    });
    expect(createTarget.statusCode).toBe(201);

    const validateTarget = await injectJson(server, "POST", buildTargetRoute(createTarget.body.item.id, "validate"));
    expect(validateTarget.statusCode, JSON.stringify(validateTarget.body)).toBe(200);
    expect(validateTarget.body.item.targetStatus).toBe("validated");

    const compare = await injectJson(server, "POST", buildTargetRoute(createTarget.body.item.id, "compare"));
    expect(compare.statusCode, JSON.stringify(compare.body)).toBe(200);
    expect(compare.body.item.compareSummary.createCount).toBeGreaterThanOrEqual(1);
    expect(compare.body.item.compareSummary.sampleKeys).toContain(`publishedPosts/${post.slug}.json`);

    const execute = await injectJson(server, "POST", buildTargetRoute(createTarget.body.item.id, "execute"));
    expect(execute.statusCode, JSON.stringify(execute.body)).toBe(200);
    expect(execute.body.item.compareSummary.state).toBe("clean");
    expect(remoteDocuments.has(post.slug)).toBe(true);
    const remoteDocument = remoteDocuments.get(post.slug);
    expect(remoteDocument?.name).toBe(
      `projects/demo-project/databases/(default)/documents/publishedPosts/${post.slug}`
    );
    expect(remoteDocument?.fields?.id?.stringValue).toBe(post.id);
    expect(remoteDocument?.fields?.slug?.stringValue).toBe(post.slug);
    expect(remoteDocument?.fields?.title?.stringValue).toBe("Remote Ops Launch Story");
    expect(remoteDocument?.fields?.excerpt?.stringValue).toBe("Remote ops launch story excerpt");
    expect(remoteDocument?.fields?.status?.stringValue).toBe("published");
    expect(remoteDocument?.fields?.publishedOn?.stringValue).toBe("2026-03-11T09:00:00.000Z");
    expect(remoteDocument?.fields?.updatedOn?.stringValue).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(remoteDocument?.fields?.pagePath?.nullValue).toBeNull();
    expect(remoteDocument?.fields?.seoTitle?.stringValue).toBe("Remote Ops Launch Story");
    expect(remoteDocument?.fields?.seoDescription?.stringValue).toBe("Remote ops launch story");
  } finally {
    await server.close();
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops compares, executes, and restores a live deployment storage target", async () => {
  const deploymentRoot = resolveDeploymentRoot();
  const deploymentBackupPath = path.join(TEST_RUNTIME_ROOT, "deployment-root-backup");
  const localRelativePath = path.join("remote-ops-live", "posts", "index.html");
  const localAbsolutePath = path.join(deploymentRoot, localRelativePath);
  const server = await createRemoteOpsTestServer();
  let deploymentRootWasBackedUp = false;

  try {
    await fs.mkdir(TEST_RUNTIME_ROOT, { recursive: true });
    if (existsSync(deploymentRoot)) {
      await removeIfExists(deploymentBackupPath);
      await fs.cp(deploymentRoot, deploymentBackupPath, {
        recursive: true,
        force: true
      });
      await removeIfExists(deploymentRoot);
      deploymentRootWasBackedUp = true;
    }
    await fs.mkdir(deploymentRoot, { recursive: true });
    await fs.mkdir(path.dirname(localAbsolutePath), { recursive: true });
    await fs.writeFile(localAbsolutePath, "<html><body>remote ops live</body></html>", "utf8");

    const payload = createServiceAccountCredentialPayload();
    const remoteObjects = new Map();
    const fetchMock = vi.fn(async (url, options = {}) => {
      const normalized = String(url);
      const method = options?.method ?? "GET";
      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "access-token-storage-live",
          expires_in: 3600,
          token_type: "Bearer"
        });
      }
      if (normalized === "https://cloudresourcemanager.googleapis.com/v3/projects/demo-project") {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890",
          projectId: "demo-project",
          projectNumber: "1234567890",
          displayName: "Demo Project",
          state: "ACTIVE"
        });
      }
      if (normalized === "https://storage.googleapis.com/storage/v1/b/deployment-bucket") {
        return createGoogleJsonResponse(200, {
          name: "deployment-bucket",
          location: "ME-WEST1"
        });
      }
      if (
        normalized ===
        "https://storage.googleapis.com/storage/v1/b/deployment-bucket/o?maxResults=1000&prefix=site%2F"
      ) {
        return createGoogleJsonResponse(200, {
          items: [...remoteObjects.values()].map((item) => ({
            name: item.name,
            size: String(item.content.length),
            md5Hash: item.md5Hash
          }))
        });
      }
      if (
        normalized.startsWith("https://storage.googleapis.com/upload/storage/v1/b/deployment-bucket/o?") &&
        method === "POST"
      ) {
        const requestUrl = new URL(normalized);
        const objectName = requestUrl.searchParams.get("name");
        const content = Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body);
        remoteObjects.set(objectName, {
          name: objectName,
          content,
          md5Hash: hashStorageContent(content)
        });
        return createGoogleJsonResponse(200, {
          name: objectName
        });
      }
      if (
        normalized.startsWith("https://storage.googleapis.com/storage/v1/b/deployment-bucket/o/") &&
        normalized.endsWith("?alt=media") &&
        method === "GET"
      ) {
        const requestUrl = new URL(normalized);
        const objectName = decodeURIComponent(
          requestUrl.pathname.replace("/storage/v1/b/deployment-bucket/o/", "")
        );
        const object = remoteObjects.get(objectName);
        return createGoogleBufferResponse(200, object?.content ?? "");
      }
      if (
        normalized ===
          "https://storage.googleapis.com/storage/v1/b/deployment-bucket/o/site/remote-ops-live/posts/index.html" &&
        method === "DELETE"
      ) {
        remoteObjects.delete("site/remote-ops-live/posts/index.html");
        return createGoogleJsonResponse(200, {});
      }

      throw new Error(`Unexpected request: ${method} ${normalized}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const connection = await seedConnection(server, {
      credentialPathHint: null,
      projectId: "",
      projectNumber: "",
      projectDisplayName: ""
    });
    const imported = await injectJson(server, "POST", buildConnectionRoute(connection.id, "import-key-file"), {
      fileName: "demo-storage-live.json",
      fileContent: JSON.stringify(payload)
    });
    expect(imported.statusCode, JSON.stringify(imported.body)).toBe(200);

    const validateConnection = await injectJson(server, "POST", buildConnectionRoute(connection.id, "validate"));
    expect(validateConnection.statusCode, JSON.stringify(validateConnection.body)).toBe(200);

    const createTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Live Deployment Mirror",
      connectionProfileId: connection.id,
      targetKind: "deployment-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "deployment-bucket",
        prefix: "site",
        localRootHint: "deployment"
      },
      policy: {
        allowDeletes: true,
        allowRestore: true,
        requireDryRunFirst: true
      }
    });
    expect(createTarget.statusCode).toBe(201);

    const validateTarget = await injectJson(server, "POST", buildTargetRoute(createTarget.body.item.id, "validate"));
    expect(validateTarget.statusCode, JSON.stringify(validateTarget.body)).toBe(200);
    expect(validateTarget.body.item.targetStatus).toBe("validated");

    const compare = await injectJson(server, "POST", buildTargetRoute(createTarget.body.item.id, "compare"));
    expect(compare.statusCode, JSON.stringify(compare.body)).toBe(200);
    expect(compare.body.item.compareSummary.createCount).toBeGreaterThanOrEqual(1);
    expect(compare.body.item.compareSummary.sampleKeys).toContain("remote-ops-live/posts/index.html");

    const execute = await injectJson(server, "POST", buildTargetRoute(createTarget.body.item.id, "execute"));
    expect(execute.statusCode, JSON.stringify(execute.body)).toBe(200);
    expect(execute.body.item.compareSummary.state).toBe("clean");
    expect(remoteObjects.has("site/remote-ops-live/posts/index.html")).toBe(true);

    await removeIfExists(localAbsolutePath);

    const restore = await injectJson(server, "POST", buildTargetRoute(createTarget.body.item.id, "restore"));
    expect(restore.statusCode, JSON.stringify(restore.body)).toBe(200);
    expect(restore.body.run.status).toBe("succeeded");
    expect(restore.body.run.summary.restoredCount).toBe(1);

    const restoredContent = await fs.readFile(localAbsolutePath, "utf8");
    expect(restoredContent).toContain("remote ops live");
  } finally {
    await server.close();
    await removeIfExists(deploymentRoot);
    if (deploymentRootWasBackedUp) {
      await fs.cp(deploymentBackupPath, deploymentRoot, {
        recursive: true,
        force: true
      });
    }
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops executes Firestore projection procedures with simulated GCP roots", async () => {
  let firestoreTargetId = null;
  const server = await createRemoteOpsTestServer();

  try {
    const connection = await seedConnection(server, {
      credentialPathHint: "C:/keys/demo-service-account.json",
      credentialLabel: "demo-service-account.json",
      serviceAccountEmail: "crud-control@demo-project.iam.gserviceaccount.com",
      serviceAccountKeyId: "key-001",
      projectNumber: "1234567890",
      projectDisplayName: "Demo Project",
      connectionStatus: "validated",
      lastConnectedOn: "2026-03-11T09:00:00.000Z",
      lastValidatedOn: "2026-03-11T09:01:00.000Z"
    });
    const post = await seedPublishedPost(server);

    const createTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Posts Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      adapterMode: "simulated-gcp",
      config: {
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "publishedPosts"
      },
      policy: {
        allowDeletes: false,
        allowRestore: true,
        requireDryRunFirst: true
      }
    });
    expect(createTarget.statusCode).toBe(201);
    firestoreTargetId = createTarget.body.item.id;

    const validateTarget = await injectJson(server, "POST", buildTargetRoute(firestoreTargetId, "validate"));
    expect(validateTarget.statusCode).toBe(200);
    expect(validateTarget.body.item.targetStatus).toBe("validated");

    const compare = await injectJson(server, "POST", buildTargetRoute(firestoreTargetId, "compare"));
    expect(compare.statusCode).toBe(200);
    expect(compare.body.item.compareSummary.createCount).toBeGreaterThanOrEqual(1);

    const execute = await injectJson(server, "POST", buildTargetRoute(firestoreTargetId, "execute"));
    expect(execute.statusCode).toBe(200);
    expect(execute.body.item.compareSummary.state).toBe("clean");

    const projectedPath = path.join(
      resolveSimulatedFirestoreRoot(firestoreTargetId),
      "publishedPosts",
      `${post.slug}.json`
    );
    const projectedContent = await fs.readFile(projectedPath, "utf8");
    expect(projectedContent).toContain('"title": "Remote Ops Launch Story"');
  } finally {
    await server.close();
    if (firestoreTargetId) {
      await removeIfExists(resolveSimulatedFirestoreRoot(firestoreTargetId));
    }
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops can seed a simulated remote-only deployment artifact and restore it locally", async () => {
  const restoredPath = path.join(resolveDeploymentRoot(), "simulated", "orphan-page", "index.html");
  let storageTargetId = null;
  const server = await createRemoteOpsTestServer();

  try {
    await removeIfExists(restoredPath);

    const connection = await seedConnection(server, {
      credentialPathHint: "C:/keys/demo-service-account.json",
      credentialLabel: "demo-service-account.json",
      serviceAccountEmail: "crud-control@demo-project.iam.gserviceaccount.com",
      serviceAccountKeyId: "key-001",
      projectNumber: "1234567890",
      projectDisplayName: "Demo Project",
      connectionStatus: "validated",
      lastConnectedOn: "2026-03-11T09:00:00.000Z",
      lastValidatedOn: "2026-03-11T09:01:00.000Z"
    });

    const createTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Deployment Mirror",
      connectionProfileId: connection.id,
      targetKind: "deployment-storage",
      adapterMode: "simulated-gcp",
      config: {
        bucketName: "deployment-bucket",
        prefix: "site",
        localRootHint: "deployment"
      },
      policy: {
        allowDeletes: true,
        allowRestore: true,
        requireDryRunFirst: false
      }
    });
    expect(createTarget.statusCode).toBe(201);
    storageTargetId = createTarget.body.item.id;

    const validateTarget = await injectJson(server, "POST", buildTargetRoute(storageTargetId, "validate"));
    expect(validateTarget.statusCode).toBe(200);

    const seedExtra = await injectJson(server, "POST", buildTargetRoute(storageTargetId, "seed-remote-extra"));
    expect(seedExtra.statusCode).toBe(200);

    const compare = await injectJson(server, "POST", buildTargetRoute(storageTargetId, "compare"));
    expect(compare.statusCode).toBe(200);
    expect(compare.body.item.compareSummary.remoteOnlyCount).toBeGreaterThanOrEqual(1);

    const restore = await injectJson(server, "POST", buildTargetRoute(storageTargetId, "restore"));
    expect(restore.statusCode).toBe(200);
    expect(restore.body.run.status).toBe("succeeded");

    const restoredContent = await fs.readFile(restoredPath, "utf8");
    expect(restoredContent).toContain("seeded");
  } finally {
    await server.close();
    await removeIfExists(restoredPath);
    if (storageTargetId) {
      await removeIfExists(resolveSimulatedStorageRoot(storageTargetId));
    }
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);
