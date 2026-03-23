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
process.env.CRUD_CONTROL_REMOTE_OPS_SIM_ROOT = path.relative(
  process.cwd(),
  path.join(TEST_RUNTIME_ROOT, "remote-ops-sim")
);
process.env.CRUD_CONTROL_REMOTE_OPS_LIVE_ROOT = path.relative(
  process.cwd(),
  path.join(TEST_RUNTIME_ROOT, "remote-ops-live")
);

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

function buildSettingsRoute(moduleId) {
  return `/api/reference/settings/modules/${moduleId}`;
}

async function removeIfExists(targetPath) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 3_000) {
    try {
      await fs.rm(targetPath, {
        recursive: true,
        force: true
      });
      return;
    } catch (error) {
      if (!["ENOTEMPTY", "EPERM", "EBUSY"].includes(error?.code ?? "")) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

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

async function writeCredentialFixture(fileName, payload) {
  await fs.mkdir(TEST_RUNTIME_ROOT, { recursive: true });
  const credentialPath = path.join(TEST_RUNTIME_ROOT, fileName);
  await fs.writeFile(credentialPath, JSON.stringify(payload, null, 2), "utf8");
  return credentialPath;
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

test("remote ops restores a missing imported key file from its local recovery copy", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const payload = createServiceAccountCredentialPayload();
    const fetchMock = vi.fn(async (url) => {
      const normalized = String(url);
      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "access-token-recovered",
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
      throw new Error(`Unexpected request: ${normalized}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const connection = await seedConnection(server, {
      credentialPathHint: null,
      projectId: "",
      projectNumber: "",
      projectDisplayName: ""
    });

    const imported = await injectJson(server, "POST", buildConnectionRoute(connection.id, "import-key-file"), {
      fileName: "demo-recoverable-key.json",
      fileContent: JSON.stringify(payload)
    });
    expect(imported.statusCode, JSON.stringify(imported.body)).toBe(200);

    await fs.rm(imported.body.item.credentialPathHint, { force: true });

    const validated = await injectJson(server, "POST", buildConnectionRoute(connection.id, "validate"));
    expect(validated.statusCode, JSON.stringify(validated.body)).toBe(200);
    expect(validated.body.item.connectionStatus).toBe("validated");
    expect(existsSync(imported.body.item.credentialPathHint)).toBe(true);
  } finally {
    await server.close();
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops loads GCP billing linkage and visible budgets for a validated live connection", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const credentialPath = await writeCredentialFixture(
      "merchant-guild-service-account.json",
      createServiceAccountCredentialPayload({
        project_id: "merchant-guild",
        private_key_id: "billing-key-001",
        client_email: "merchant-guild@appspot.gserviceaccount.com"
      })
    );

    const fetchMock = vi.fn(async (url) => {
      const normalized = String(url);
      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "billing-access-token-001",
          expires_in: 3600,
          token_type: "Bearer"
        });
      }
      if (normalized === "https://cloudresourcemanager.googleapis.com/v1/projects/merchant-guild:testIamPermissions") {
        return createGoogleJsonResponse(200, {
          permissions: ["billing.resourceAssociations.get", "billing.resourcebudgets.read"]
        });
      }
      if (normalized === "https://cloudbilling.googleapis.com/v1/projects/merchant-guild/billingInfo") {
        return createGoogleJsonResponse(200, {
          name: "projects/merchant-guild/billingInfo",
          projectId: "merchant-guild",
          billingAccountName: "billingAccounts/ABCDEF-123456-7890AB",
          billingEnabled: true
        });
      }
      if (normalized === "https://cloudbilling.googleapis.com/v1/billingAccounts/ABCDEF-123456-7890AB") {
        return createGoogleJsonResponse(200, {
          name: "billingAccounts/ABCDEF-123456-7890AB",
          displayName: "Merchant Guild Billing",
          open: true
        });
      }
      if (normalized === "https://billingbudgets.googleapis.com/v1/billingAccounts/ABCDEF-123456-7890AB/budgets") {
        return createGoogleJsonResponse(200, {
          budgets: [
            {
              name: "billingAccounts/ABCDEF-123456-7890AB/budgets/primary",
              displayName: "Primary Monthly Budget",
              budgetFilter: {
                projects: ["projects/merchant-guild"],
                calendarPeriod: "MONTH"
              },
              amount: {
                specifiedAmount: {
                  currencyCode: "USD",
                  units: "150",
                  nanos: 0
                }
              },
              thresholdRules: [
                {
                  spendBasis: "CURRENT_SPEND",
                  thresholdPercent: 0.5
                },
                {
                  spendBasis: "FORECASTED_SPEND",
                  thresholdPercent: 1
                }
              ]
            }
          ]
        });
      }
      throw new Error(`Unexpected fetch URL: ${normalized}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const connection = await seedConnection(server, {
      profileName: "Merchant Guild",
      projectId: "merchant-guild",
      projectNumber: "679134333951",
      projectDisplayName: "Merchant Guild",
      credentialPathHint: credentialPath,
      serviceAccountEmail: "merchant-guild@appspot.gserviceaccount.com",
      serviceAccountKeyId: "billing-key-001",
      connectionStatus: "validated"
    });

    const response = await server.inject({
      method: "GET",
      url: buildConnectionRoute(connection.id, "billing-overview")
    });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.report).toEqual(
      expect.objectContaining({
        provider: "gcp",
        billingInfo: expect.objectContaining({
          state: "enabled",
          billingEnabled: true,
          billingAccountId: "ABCDEF-123456-7890AB",
          billingAccountDisplayName: "Merchant Guild Billing"
        }),
        permissions: expect.objectContaining({
          summaries: expect.objectContaining({
            canReadProjectCosts: false,
            canReadProjectBudgets: true
          })
        }),
        budgets: expect.objectContaining({
          state: "loaded",
          visibleCount: 1,
          forecastRuleCount: 1,
          items: expect.arrayContaining([
            expect.objectContaining({
              displayName: "Primary Monthly Budget",
              scope: "project",
              hasForecastRule: true
            })
          ])
        })
      })
    );
  } finally {
    await server.close();
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops validation auto-prepares the standard product target bundle and binds module settings", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const payload = createServiceAccountCredentialPayload();
    const fetchMock = vi.fn(async (url) => {
      const normalized = String(url);
      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "access-token-product-bundle",
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
      throw new Error(`Unexpected request: ${normalized}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const connection = await seedConnection(server, {
      credentialPathHint: null,
      projectId: "",
      projectNumber: "",
      projectDisplayName: ""
    });

    const imported = await injectJson(server, "POST", buildConnectionRoute(connection.id, "import-key-file"), {
      fileName: "demo-product-bundle.json",
      fileContent: JSON.stringify(payload)
    });
    expect(imported.statusCode, JSON.stringify(imported.body)).toBe(200);

    const validated = await injectJson(server, "POST", buildConnectionRoute(connection.id, "validate"));
    expect(validated.statusCode, JSON.stringify(validated.body)).toBe(200);
    expect(validated.body.item.connectionStatus).toBe("validated");
    expect(Object.keys(validated.body.productBundle?.targetsByBindingKey ?? {})).toEqual([
      "posts-projection",
      "categories-projection",
      "tags-projection",
      "deployment-storage",
      "media-storage",
      "browser-delivery"
    ]);
    expect(validated.body.productBundle?.settingBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleId: "test-modules-content",
          fieldId: "remoteProjectionTargetProfileId",
          updated: true
        }),
        expect.objectContaining({
          moduleId: "test-modules-taxonomy",
          fieldId: "remoteCategoriesProjectionTargetProfileId",
          updated: true
        }),
        expect.objectContaining({
          moduleId: "test-modules-taxonomy",
          fieldId: "remoteTagsProjectionTargetProfileId",
          updated: true
        }),
        expect.objectContaining({
          moduleId: "test-modules-pages",
          fieldId: "remoteDeploymentTargetProfileId",
          updated: true
        }),
        expect.objectContaining({
          moduleId: "test-modules-pages",
          fieldId: "remoteBrowserDeliveryTargetProfileId",
          updated: true
        }),
        expect.objectContaining({
          moduleId: "test-modules-media-manager",
          fieldId: "remoteMediaTargetProfileId",
          updated: true
        })
      ])
    );

    const targets = await injectJson(server, "GET", buildItemsRoute("remote-target-profiles"));
    expect(targets.statusCode).toBe(200);
    const managedTargets = targets.body.items.filter((item) => item.connectionProfileId === connection.id);
    expect(managedTargets.map((item) => item.productBindingKey)).toEqual(
      expect.arrayContaining([
        "posts-projection",
        "categories-projection",
        "tags-projection",
        "deployment-storage",
        "media-storage",
        "browser-delivery"
      ])
    );
    expect(
      managedTargets.find((item) => item.productBindingKey === "deployment-storage")?.config?.bucketName
    ).toBe("demo-project-dev-deployment-1234567890");
    expect(
      managedTargets.find((item) => item.productBindingKey === "media-storage")?.config?.bucketName
    ).toBe("demo-project-dev-media-1234567890");
    expect(
      managedTargets.find((item) => item.productBindingKey === "browser-delivery")?.config
        ?.deploymentTargetProfileId
    ).toBe(
      managedTargets.find((item) => item.productBindingKey === "deployment-storage")?.id
    );
    expect(
      managedTargets.find((item) => item.productBindingKey === "browser-delivery")?.config
        ?.mediaTargetProfileId
    ).toBe(managedTargets.find((item) => item.productBindingKey === "media-storage")?.id);

    const postSettings = await injectJson(server, "GET", buildSettingsRoute("test-modules-content"));
    const taxonomySettings = await injectJson(server, "GET", buildSettingsRoute("test-modules-taxonomy"));
    const pageSettings = await injectJson(server, "GET", buildSettingsRoute("test-modules-pages"));
    const mediaSettings = await injectJson(server, "GET", buildSettingsRoute("test-modules-media-manager"));

    expect(postSettings.statusCode).toBe(200);
    expect(taxonomySettings.statusCode).toBe(200);
    expect(pageSettings.statusCode).toBe(200);
    expect(mediaSettings.statusCode).toBe(200);

    expect(postSettings.body.settings.values.remoteProjectionTargetProfileId).toBe(
      managedTargets.find((item) => item.productBindingKey === "posts-projection")?.id
    );
    expect(taxonomySettings.body.settings.values.remoteCategoriesProjectionTargetProfileId).toBe(
      managedTargets.find((item) => item.productBindingKey === "categories-projection")?.id
    );
    expect(taxonomySettings.body.settings.values.remoteTagsProjectionTargetProfileId).toBe(
      managedTargets.find((item) => item.productBindingKey === "tags-projection")?.id
    );
    expect(pageSettings.body.settings.values.remoteDeploymentTargetProfileId).toBe(
      managedTargets.find((item) => item.productBindingKey === "deployment-storage")?.id
    );
    expect(pageSettings.body.settings.values.remoteBrowserDeliveryTargetProfileId).toBe(
      managedTargets.find((item) => item.productBindingKey === "browser-delivery")?.id
    );
    expect(mediaSettings.body.settings.values.remoteMediaTargetProfileId).toBe(
      managedTargets.find((item) => item.productBindingKey === "media-storage")?.id
    );
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
          id: "dns-zone",
          phaseStatus: "execution-started"
        }),
        expect.objectContaining({
          id: "https-forwarding-rule",
          phaseStatus: "execution-started"
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

test("remote ops analyzes and provisions an HTTPS browser-delivery stack for a live custom domain", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const payload = createServiceAccountCredentialPayload();
    const enabledServices = new Set(["storage.googleapis.com"]);
    const dnsZones = new Map();
    const dnsAuthorizations = new Map();
    const certificates = new Map();
    const certificateMaps = new Map();
    const certificateMapEntries = new Map();
    const globalAddresses = new Map();
    const backendBuckets = new Map();
    const urlMaps = new Map();
    const httpsProxies = new Map();
    const forwardingRules = new Map();
    const dnsRecordsByZone = new Map();

    const fetchMock = vi.fn(async (url, options = {}) => {
      const normalized = String(url);
      const method = options?.method ?? "GET";

      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "access-token-browser-delivery",
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
        const requestPayload = JSON.parse(options.body);
        return createGoogleJsonResponse(200, {
          permissions: requestPayload.permissions
        });
      }

      if (
        normalized === "https://serviceusage.googleapis.com/v1/projects/1234567890/services:batchEnable" &&
        method === "POST"
      ) {
        const requestPayload = JSON.parse(options.body);
        requestPayload.serviceIds.forEach((serviceName) => enabledServices.add(serviceName));
        return createGoogleJsonResponse(200, {
          name: "operations/serviceusage-batch-enable-browser-delivery"
        });
      }

      if (normalized === "https://serviceusage.googleapis.com/v1/operations/serviceusage-batch-enable-browser-delivery") {
        return createGoogleJsonResponse(200, {
          done: true,
          response: {}
        });
      }

      if (normalized.startsWith("https://serviceusage.googleapis.com/v1/projects/1234567890/services/")) {
        const serviceName = normalized.split("/services/")[1];
        return createGoogleJsonResponse(200, {
          name: `projects/1234567890/services/${serviceName}`,
          state: enabledServices.has(serviceName) ? "ENABLED" : "DISABLED"
        });
      }

      if (normalized === "https://storage.googleapis.com/storage/v1/b/deployment-bucket") {
        return createGoogleJsonResponse(200, {
          name: "deployment-bucket",
          location: "ME-WEST1"
        });
      }

      if (normalized === "https://storage.googleapis.com/storage/v1/b/media-bucket") {
        return createGoogleJsonResponse(200, {
          name: "media-bucket",
          location: "ME-WEST1"
        });
      }

      if (
        normalized.startsWith("https://storage.googleapis.com/storage/v1/b/deployment-bucket/iam/testPermissions?") ||
        normalized.startsWith("https://storage.googleapis.com/storage/v1/b/media-bucket/iam/testPermissions?")
      ) {
        const requestUrl = new URL(normalized);
        return createGoogleJsonResponse(200, {
          permissions: requestUrl.searchParams.getAll("permissions")
        });
      }

      if (normalized.startsWith("https://dns.googleapis.com/dns/v1/projects/demo-project/managedZones/")) {
        const requestUrl = new URL(normalized);
        const relativePath = requestUrl.pathname.split("/managedZones/")[1];
        const [zoneName, remainder] = relativePath.split("/");
        const zone = dnsZones.get(decodeURIComponent(zoneName));
        if (!zone) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Zone not found"
            }
          });
        }
        if (!remainder) {
          return createGoogleJsonResponse(200, zone);
        }
        if (remainder === "rrsets") {
          const key = `${requestUrl.searchParams.get("name") ?? ""}:${requestUrl.searchParams.get("type") ?? ""}`;
          const records = dnsRecordsByZone.get(zone.name) ?? new Map();
          const record = records.get(key);
          return createGoogleJsonResponse(200, {
            rrsets: record ? [record] : []
          });
        }
        if (remainder === "changes" && method === "POST") {
          const requestPayload = JSON.parse(options.body);
          const records = dnsRecordsByZone.get(zone.name) ?? new Map();
          (requestPayload.deletions ?? []).forEach((record) => {
            records.delete(`${record.name}:${record.type}`);
          });
          (requestPayload.additions ?? []).forEach((record) => {
            records.set(`${record.name}:${record.type}`, record);
          });
          dnsRecordsByZone.set(zone.name, records);
          return createGoogleJsonResponse(200, {
            id: "dns-change-001"
          });
        }
      }

      if (normalized === "https://dns.googleapis.com/dns/v1/projects/demo-project/managedZones" && method === "POST") {
        const requestPayload = JSON.parse(options.body);
        const zone = {
          name: requestPayload.name,
          dnsName: requestPayload.dnsName,
          nameServers: ["ns-cloud-a1.googledomains.com.", "ns-cloud-a2.googledomains.com."]
        };
        dnsZones.set(zone.name, zone);
        dnsRecordsByZone.set(zone.name, new Map());
        return createGoogleJsonResponse(200, zone);
      }

      if (normalized.startsWith("https://certificatemanager.googleapis.com/v1/projects/demo-project/locations/global/dnsAuthorizations/")) {
        const dnsAuthorizationName = decodeURIComponent(normalized.split("/dnsAuthorizations/")[1]);
        const entry = dnsAuthorizations.get(dnsAuthorizationName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "DNS authorization not found"
            }
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (
        normalized.startsWith("https://certificatemanager.googleapis.com/v1/projects/demo-project/locations/global/dnsAuthorizations?") &&
        method === "POST"
      ) {
        const requestUrl = new URL(normalized);
        const dnsAuthorizationName = requestUrl.searchParams.get("dnsAuthorizationId");
        const requestPayload = JSON.parse(options.body);
        dnsAuthorizations.set(dnsAuthorizationName, {
          name: `projects/demo-project/locations/global/dnsAuthorizations/${dnsAuthorizationName}`,
          domain: requestPayload.domain,
          dnsResourceRecord: {
            name: `_acme-challenge.${requestPayload.domain}.`,
            type: "CNAME",
            data: "auth.example.gcp."
          }
        });
        return createGoogleJsonResponse(200, {
          name: "operations/certificatemanager.dnsauth.create-001"
        });
      }

      if (normalized.startsWith("https://certificatemanager.googleapis.com/v1/projects/demo-project/locations/global/certificates/")) {
        const certificateName = decodeURIComponent(normalized.split("/certificates/")[1]);
        const entry = certificates.get(certificateName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Certificate not found"
            }
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (
        normalized.startsWith("https://certificatemanager.googleapis.com/v1/projects/demo-project/locations/global/certificates?") &&
        method === "POST"
      ) {
        const requestUrl = new URL(normalized);
        const certificateName = requestUrl.searchParams.get("certificateId");
        const requestPayload = JSON.parse(options.body);
        certificates.set(certificateName, {
          name: `projects/demo-project/locations/global/certificates/${certificateName}`,
          managed: {
            state: "ACTIVE",
            domains: requestPayload.managed.domains
          }
        });
        return createGoogleJsonResponse(200, {
          name: "operations/certificatemanager.certificate.create-001"
        });
      }

      if (normalized.startsWith("https://certificatemanager.googleapis.com/v1/projects/demo-project/locations/global/certificateMaps/")) {
        const suffix = normalized.split("/certificateMaps/")[1];
        const [certificateMapName, maybeEntrySegment, entryName] = suffix.split("/");
        if (!maybeEntrySegment) {
          const entry = certificateMaps.get(decodeURIComponent(certificateMapName));
          if (!entry) {
            return createGoogleJsonResponse(404, {
              error: {
                message: "Certificate map not found"
              }
            });
          }
          return createGoogleJsonResponse(200, entry);
        }
        if (maybeEntrySegment === "certificateMapEntries") {
          const entry = certificateMapEntries.get(decodeURIComponent(entryName));
          if (!entry) {
            return createGoogleJsonResponse(404, {
              error: {
                message: "Certificate map entry not found"
              }
            });
          }
          return createGoogleJsonResponse(200, entry);
        }
      }

      if (
        normalized.startsWith("https://certificatemanager.googleapis.com/v1/projects/demo-project/locations/global/certificateMaps?") &&
        method === "POST"
      ) {
        const requestUrl = new URL(normalized);
        const certificateMapName = requestUrl.searchParams.get("certificateMapId");
        certificateMaps.set(certificateMapName, {
          name: `projects/demo-project/locations/global/certificateMaps/${certificateMapName}`
        });
        return createGoogleJsonResponse(200, {
          name: "operations/certificatemanager.certmap.create-001"
        });
      }

      if (
        normalized.includes("/certificateMapEntries?") &&
        method === "POST"
      ) {
        const requestUrl = new URL(normalized);
        const entryName = requestUrl.searchParams.get("certificateMapEntryId");
        const requestPayload = JSON.parse(options.body);
        certificateMapEntries.set(entryName, {
          name: `${normalized.split("?")[0]}/${entryName}`,
          hostname: requestPayload.hostname,
          certificates: requestPayload.certificates
        });
        return createGoogleJsonResponse(200, {
          name: "operations/certificatemanager.certmapentry.create-001"
        });
      }

      if (normalized.startsWith("https://certificatemanager.googleapis.com/v1/operations/")) {
        return createGoogleJsonResponse(200, {
          done: true,
          response: {}
        });
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/addresses/")) {
        const addressName = decodeURIComponent(normalized.split("/addresses/")[1]);
        const address = globalAddresses.get(addressName);
        if (!address) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Address not found"
            }
          });
        }
        return createGoogleJsonResponse(200, address);
      }

      if (normalized === "https://compute.googleapis.com/compute/v1/projects/demo-project/global/addresses" && method === "POST") {
        const requestPayload = JSON.parse(options.body);
        globalAddresses.set(requestPayload.name, {
          name: requestPayload.name,
          address: "203.0.113.10"
        });
        return createGoogleJsonResponse(200, {
          name: "operation-global-address-001"
        });
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/backendBuckets/")) {
        const backendBucketName = decodeURIComponent(normalized.split("/backendBuckets/")[1]);
        const entry = backendBuckets.get(backendBucketName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Backend bucket not found"
            }
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (normalized === "https://compute.googleapis.com/compute/v1/projects/demo-project/global/backendBuckets" && method === "POST") {
        const requestPayload = JSON.parse(options.body);
        backendBuckets.set(requestPayload.name, {
          name: requestPayload.name,
          bucketName: requestPayload.bucketName
        });
        return createGoogleJsonResponse(200, {
          name: "operation-backend-bucket-001"
        });
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/urlMaps/")) {
        const urlMapName = decodeURIComponent(normalized.split("/urlMaps/")[1]);
        const entry = urlMaps.get(urlMapName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "URL map not found"
            }
          });
        }
        if (method === "PATCH") {
          const requestPayload = JSON.parse(options.body);
          urlMaps.set(urlMapName, {
            ...entry,
            ...requestPayload
          });
          return createGoogleJsonResponse(200, {
            name: "operation-url-map-patch-001"
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (normalized === "https://compute.googleapis.com/compute/v1/projects/demo-project/global/urlMaps" && method === "POST") {
        const requestPayload = JSON.parse(options.body);
        urlMaps.set(requestPayload.name, requestPayload);
        return createGoogleJsonResponse(200, {
          name: "operation-url-map-create-001"
        });
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/targetHttpsProxies/")) {
        const suffix = normalized.split("/targetHttpsProxies/")[1];
        const [proxyName, action] = suffix.split("/");
        const entry = httpsProxies.get(decodeURIComponent(proxyName));
        if (!action) {
          if (!entry) {
            return createGoogleJsonResponse(404, {
              error: {
                message: "Proxy not found"
              }
            });
          }
          return createGoogleJsonResponse(200, entry);
        }
        if (action === "setUrlMap" && method === "POST") {
          const requestPayload = JSON.parse(options.body);
          httpsProxies.set(decodeURIComponent(proxyName), {
            ...(entry ?? { name: decodeURIComponent(proxyName) }),
            urlMap: requestPayload.urlMap
          });
          return createGoogleJsonResponse(200, {
            name: "operation-https-proxy-set-url-map-001"
          });
        }
        if (action === "setCertificateMap" && method === "POST") {
          const requestPayload = JSON.parse(options.body);
          httpsProxies.set(decodeURIComponent(proxyName), {
            ...(entry ?? { name: decodeURIComponent(proxyName) }),
            certificateMap: requestPayload.certificateMap
          });
          return createGoogleJsonResponse(200, {
            name: "operation-https-proxy-set-certificate-map-001"
          });
        }
      }

      if (normalized === "https://compute.googleapis.com/compute/v1/projects/demo-project/global/targetHttpsProxies" && method === "POST") {
        const requestPayload = JSON.parse(options.body);
        httpsProxies.set(requestPayload.name, {
          name: requestPayload.name,
          urlMap: requestPayload.urlMap
        });
        return createGoogleJsonResponse(200, {
          name: "operation-https-proxy-create-001"
        });
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/forwardingRules/")) {
        const ruleName = decodeURIComponent(normalized.split("/forwardingRules/")[1]);
        const entry = forwardingRules.get(ruleName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Forwarding rule not found"
            }
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (normalized === "https://compute.googleapis.com/compute/v1/projects/demo-project/global/forwardingRules" && method === "POST") {
        const requestPayload = JSON.parse(options.body);
        forwardingRules.set(requestPayload.name, {
          name: requestPayload.name,
          IPAddress: requestPayload.IPAddress,
          target: requestPayload.target
        });
        return createGoogleJsonResponse(200, {
          name: "operation-forwarding-rule-create-001"
        });
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/operations/")) {
        return createGoogleJsonResponse(200, {
          status: "DONE"
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
      fileName: "demo-browser-delivery.json",
      fileContent: JSON.stringify(payload)
    });
    expect(imported.statusCode, JSON.stringify(imported.body)).toBe(200);

    const validatedConnection = await injectJson(server, "POST", buildConnectionRoute(connection.id, "validate"));
    expect(validatedConnection.statusCode, JSON.stringify(validatedConnection.body)).toBe(200);

    const deploymentTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
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
        allowDeletes: true,
        allowRestore: true,
        requireDryRunFirst: true
      }
    });
    expect(deploymentTarget.statusCode).toBe(201);

    const mediaTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Media Live Bucket",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "media-bucket",
        prefix: "library",
        localRootHint: "media"
      },
      policy: {
        allowDeletes: true,
        allowRestore: true,
        requireDryRunFirst: true
      }
    });
    expect(mediaTarget.statusCode).toBe(201);

    const browserTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Delivery Domain",
      connectionProfileId: connection.id,
      targetKind: "browser-delivery",
      adapterMode: "live-gcp",
      config: {
        accessMode: "custom-domain",
        stackMode: "https-load-balancer",
        dnsMode: "gcp-managed",
        hostname: "content.example.com",
        deploymentTargetProfileId: deploymentTarget.body.item.id,
        mediaTargetProfileId: mediaTarget.body.item.id
      },
      policy: {
        allowDeletes: false,
        allowRestore: false,
        requireDryRunFirst: true
      }
    });
    expect(browserTarget.statusCode).toBe(201);

    const analyze = await injectJson(
      server,
      "POST",
      `/api/reference/modules/test-modules-remote-ops/connections/${connection.id}/analyze-compatibility`
    );
    expect(analyze.statusCode, JSON.stringify(analyze.body)).toBe(200);
    const browserBundle = analyze.body.report.bundles.find((bundle) => bundle.id === "browser-delivery");
    expect(browserBundle.state).toBe("action-required");
    expect(browserBundle.configurationWarnings).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("requires the linked deployment target prefix to be empty")
      ])
    );
    expect(browserBundle.provisionableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resourceKind: "dns-zone" }),
        expect.objectContaining({ resourceKind: "https-forwarding-rule" })
      ])
    );
    expect(browserBundle.deliveryReports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stackMode: "https-load-balancer",
          publicOrigin: "https://content.example.com",
          publicUrl: "https://content.example.com/posts/example-post",
          publicMediaBaseUrl: "https://content.example.com/library",
          dnsInstructions: expect.arrayContaining([
            expect.objectContaining({
              label: "Traffic record",
              recordType: "A"
            })
          ])
        })
      ])
    );

    const provision = await injectJson(
      server,
      "POST",
      `/api/reference/modules/test-modules-remote-ops/connections/${connection.id}/provision-missing`,
      {
        confirmedSafeguardIds: ["cost-confirmation", "singleton-hygiene", "minimum-footprint"],
        actionIds: null
      }
    );
    expect(provision.statusCode, JSON.stringify(provision.body)).toBe(200);
    expect(provision.body.executedActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resourceKind: "dns-zone" }),
        expect.objectContaining({ resourceKind: "dns-authorization" }),
        expect.objectContaining({ resourceKind: "managed-certificate" }),
        expect.objectContaining({ resourceKind: "global-address" }),
        expect.objectContaining({ resourceKind: "https-forwarding-rule" }),
        expect.objectContaining({ resourceKind: "dns-a-record" }),
        expect.objectContaining({ resourceKind: "dns-authorization-record" })
      ])
    );
    const provisionedBrowserBundle = provision.body.report.bundles.find((bundle) => bundle.id === "browser-delivery");
    expect(provisionedBrowserBundle.state).toBe("compatible");
    expect(urlMaps.get("content-example-com-url-map")).toEqual(
      expect.objectContaining({
        pathMatchers: expect.arrayContaining([
          expect.objectContaining({
            routeRules: expect.arrayContaining([
              expect.objectContaining({
                priority: 20,
                routeAction: {
                  urlRewrite: {
                    pathPrefixRewrite: "/site/assets"
                  }
                }
              }),
              expect.objectContaining({
                priority: 21,
                routeAction: {
                  urlRewrite: {
                    pathTemplateRewrite: "/site/assets/{assetPath}"
                  }
                }
              }),
              expect.objectContaining({
                priority: 30,
                routeAction: {
                  urlRewrite: {
                    pathPrefixRewrite: "/site/index.html"
                  }
                }
              }),
              expect.objectContaining({
                priority: 40,
                routeAction: {
                  urlRewrite: {
                    pathTemplateRewrite: "/site/{pagePath}/index.html"
                  }
                }
              })
            ])
          })
        ])
      })
    );
    expect(provisionedBrowserBundle.deliveryReports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicOrigin: "https://content.example.com",
          publicMediaBaseUrl: "https://content.example.com/library",
          nameServers: expect.arrayContaining(["ns-cloud-a1.googledomains.com."])
        })
      ])
    );
  } finally {
    await server.close();
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops detects and repairs HTTPS browser-delivery URL map drift", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const payload = createServiceAccountCredentialPayload();
    const enabledServices = new Set([
      "storage.googleapis.com",
      "dns.googleapis.com",
      "certificatemanager.googleapis.com",
      "compute.googleapis.com"
    ]);
    const dnsZones = new Map([
      [
        "content-example-com-zone",
        {
          name: "content-example-com-zone",
          dnsName: "content.example.com.",
          nameServers: ["ns-cloud-a1.googledomains.com.", "ns-cloud-a2.googledomains.com."]
        }
      ]
    ]);
    const dnsAuthorizations = new Map([
      [
        "content-example-com-dns-auth",
        {
          name: "projects/demo-project/locations/global/dnsAuthorizations/content-example-com-dns-auth",
          domain: "content.example.com",
          dnsResourceRecord: {
            name: "_acme-challenge.content.example.com.",
            type: "CNAME",
            data: "auth.example.gcp."
          }
        }
      ]
    ]);
    const certificates = new Map([
      [
        "content-example-com-cert",
        {
          name: "projects/demo-project/locations/global/certificates/content-example-com-cert",
          managed: {
            state: "ACTIVE",
            domains: ["content.example.com"]
          }
        }
      ]
    ]);
    const certificateMaps = new Map([
      [
        "content-example-com-cert-map",
        {
          name: "projects/demo-project/locations/global/certificateMaps/content-example-com-cert-map"
        }
      ]
    ]);
    const certificateMapEntries = new Map([
      [
        "content-example-com-cert-map-entry",
        {
          name: "projects/demo-project/locations/global/certificateMaps/content-example-com-cert-map/certificateMapEntries/content-example-com-cert-map-entry"
        }
      ]
    ]);
    const globalAddresses = new Map([
      [
        "content-example-com-ip",
        {
          name: "content-example-com-ip",
          address: "34.111.205.190"
        }
      ]
    ]);
    const backendBuckets = new Map([
      [
        "content-example-com-deploy-bb",
        {
          name: "content-example-com-deploy-bb",
          bucketName: "deployment-bucket"
        }
      ],
      [
        "content-example-com-media-bb",
        {
          name: "content-example-com-media-bb",
          bucketName: "media-bucket"
        }
      ]
    ]);
    const deploymentBackendBucketLink =
      "https://compute.googleapis.com/compute/v1/projects/demo-project/global/backendBuckets/content-example-com-deploy-bb";
    const mediaBackendBucketLink =
      "https://compute.googleapis.com/compute/v1/projects/demo-project/global/backendBuckets/content-example-com-media-bb";
    const urlMaps = new Map([
      [
        "content-example-com-url-map",
        {
          name: "content-example-com-url-map",
          defaultService: deploymentBackendBucketLink,
          hostRules: [
            {
              hosts: ["content.example.com"],
              pathMatcher: "primary-matcher"
            }
          ],
          pathMatchers: [
            {
              name: "primary-matcher",
              defaultService: deploymentBackendBucketLink,
              routeRules: [
                {
                  priority: 10,
                  matchRules: [
                    {
                      fullPathMatch: "/library"
                    },
                    {
                      prefixMatch: "/library/"
                    }
                  ],
                  service: mediaBackendBucketLink
                },
                {
                  priority: 40,
                  matchRules: [
                    {
                      pathTemplateMatch: "/{pagePath=**}"
                    }
                  ],
                  service: deploymentBackendBucketLink,
                  routeAction: {
                    urlRewrite: {
                      pathTemplateRewrite: "/site/{pagePath}"
                    }
                  }
                }
              ]
            }
          ]
        }
      ]
    ]);
    const httpsProxies = new Map([
      [
        "content-example-com-https-proxy",
        {
          name: "content-example-com-https-proxy",
          urlMap: "https://compute.googleapis.com/compute/v1/projects/demo-project/global/urlMaps/content-example-com-url-map",
          certificateMap:
            "//certificatemanager.googleapis.com/projects/demo-project/locations/global/certificateMaps/content-example-com-cert-map"
        }
      ]
    ]);
    const forwardingRules = new Map([
      [
        "content-example-com-https-fr",
        {
          name: "content-example-com-https-fr",
          IPAddress: "https://compute.googleapis.com/compute/v1/projects/demo-project/global/addresses/content-example-com-ip",
          target:
            "https://compute.googleapis.com/compute/v1/projects/demo-project/global/targetHttpsProxies/content-example-com-https-proxy"
        }
      ]
    ]);
    const dnsRecordsByZone = new Map([
      [
        "content-example-com-zone",
        new Map([
          [
            "content.example.com.:A",
            {
              name: "content.example.com.",
              type: "A",
              ttl: 300,
              rrdatas: ["34.111.205.190"]
            }
          ],
          [
            "_acme-challenge.content.example.com.:CNAME",
            {
              name: "_acme-challenge.content.example.com.",
              type: "CNAME",
              ttl: 300,
              rrdatas: ["auth.example.gcp."]
            }
          ]
        ])
      ]
    ]);

    const fetchMock = vi.fn(async (url, options = {}) => {
      const normalized = String(url);
      const method = options?.method ?? "GET";

      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "access-token-browser-delivery-drift",
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
        const requestPayload = JSON.parse(options.body);
        return createGoogleJsonResponse(200, {
          permissions: requestPayload.permissions
        });
      }

      if (
        normalized === "https://serviceusage.googleapis.com/v1/projects/1234567890/services:batchEnable" &&
        method === "POST"
      ) {
        const requestPayload = JSON.parse(options.body);
        requestPayload.serviceIds.forEach((serviceName) => enabledServices.add(serviceName));
        return createGoogleJsonResponse(200, {
          name: "operations/serviceusage-batch-enable-browser-delivery-drift"
        });
      }

      if (
        normalized ===
        "https://serviceusage.googleapis.com/v1/operations/serviceusage-batch-enable-browser-delivery-drift"
      ) {
        return createGoogleJsonResponse(200, {
          done: true,
          response: {}
        });
      }

      if (normalized.startsWith("https://serviceusage.googleapis.com/v1/projects/1234567890/services/")) {
        const serviceName = normalized.split("/services/")[1];
        return createGoogleJsonResponse(200, {
          name: `projects/1234567890/services/${serviceName}`,
          state: enabledServices.has(serviceName) ? "ENABLED" : "DISABLED"
        });
      }

      if (normalized === "https://storage.googleapis.com/storage/v1/b/deployment-bucket") {
        return createGoogleJsonResponse(200, {
          name: "deployment-bucket",
          location: "ME-WEST1"
        });
      }

      if (normalized === "https://storage.googleapis.com/storage/v1/b/media-bucket") {
        return createGoogleJsonResponse(200, {
          name: "media-bucket",
          location: "ME-WEST1"
        });
      }

      if (
        normalized.startsWith("https://storage.googleapis.com/storage/v1/b/deployment-bucket/iam/testPermissions?") ||
        normalized.startsWith("https://storage.googleapis.com/storage/v1/b/media-bucket/iam/testPermissions?")
      ) {
        const requestUrl = new URL(normalized);
        return createGoogleJsonResponse(200, {
          permissions: requestUrl.searchParams.getAll("permissions")
        });
      }

      if (normalized.startsWith("https://dns.googleapis.com/dns/v1/projects/demo-project/managedZones/")) {
        const requestUrl = new URL(normalized);
        const relativePath = requestUrl.pathname.split("/managedZones/")[1];
        const [zoneName, remainder] = relativePath.split("/");
        const zone = dnsZones.get(decodeURIComponent(zoneName));
        if (!zone) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Zone not found"
            }
          });
        }
        if (!remainder) {
          return createGoogleJsonResponse(200, zone);
        }
        if (remainder === "rrsets") {
          const key = `${requestUrl.searchParams.get("name") ?? ""}:${requestUrl.searchParams.get("type") ?? ""}`;
          const records = dnsRecordsByZone.get(zone.name) ?? new Map();
          const record = records.get(key);
          return createGoogleJsonResponse(200, {
            rrsets: record ? [record] : []
          });
        }
        if (remainder === "changes" && method === "POST") {
          const requestPayload = JSON.parse(options.body);
          const records = dnsRecordsByZone.get(zone.name) ?? new Map();
          (requestPayload.deletions ?? []).forEach((record) => {
            records.delete(`${record.name}:${record.type}`);
          });
          (requestPayload.additions ?? []).forEach((record) => {
            records.set(`${record.name}:${record.type}`, record);
          });
          dnsRecordsByZone.set(zone.name, records);
          return createGoogleJsonResponse(200, {
            id: "dns-change-drift-001"
          });
        }
      }

      if (normalized.startsWith("https://certificatemanager.googleapis.com/v1/projects/demo-project/locations/global/dnsAuthorizations/")) {
        const dnsAuthorizationName = decodeURIComponent(normalized.split("/dnsAuthorizations/")[1]);
        const entry = dnsAuthorizations.get(dnsAuthorizationName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "DNS authorization not found"
            }
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (normalized.startsWith("https://certificatemanager.googleapis.com/v1/projects/demo-project/locations/global/certificates/")) {
        const certificateName = decodeURIComponent(normalized.split("/certificates/")[1]);
        const entry = certificates.get(certificateName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Certificate not found"
            }
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (normalized.startsWith("https://certificatemanager.googleapis.com/v1/projects/demo-project/locations/global/certificateMaps/")) {
        const suffix = normalized.split("/certificateMaps/")[1];
        const [certificateMapName, maybeEntrySegment, entryName] = suffix.split("/");
        if (!maybeEntrySegment) {
          const entry = certificateMaps.get(decodeURIComponent(certificateMapName));
          if (!entry) {
            return createGoogleJsonResponse(404, {
              error: {
                message: "Certificate map not found"
              }
            });
          }
          return createGoogleJsonResponse(200, entry);
        }
        if (maybeEntrySegment === "certificateMapEntries") {
          const entry = certificateMapEntries.get(decodeURIComponent(entryName));
          if (!entry) {
            return createGoogleJsonResponse(404, {
              error: {
                message: "Certificate map entry not found"
              }
            });
          }
          return createGoogleJsonResponse(200, entry);
        }
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/addresses/")) {
        const addressName = decodeURIComponent(normalized.split("/addresses/")[1]);
        const entry = globalAddresses.get(addressName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Address not found"
            }
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/backendBuckets/")) {
        const backendBucketName = decodeURIComponent(normalized.split("/backendBuckets/")[1]);
        const entry = backendBuckets.get(backendBucketName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Backend bucket not found"
            }
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/urlMaps/")) {
        const urlMapName = decodeURIComponent(normalized.split("/urlMaps/")[1]);
        const entry = urlMaps.get(urlMapName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "URL map not found"
            }
          });
        }
        if (method === "PATCH") {
          const requestPayload = JSON.parse(options.body);
          urlMaps.set(urlMapName, {
            ...entry,
            ...requestPayload
          });
          return createGoogleJsonResponse(200, {
            name: "operation-url-map-patch-drift-001"
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/targetHttpsProxies/")) {
        const proxyName = decodeURIComponent(normalized.split("/targetHttpsProxies/")[1]);
        const entry = httpsProxies.get(proxyName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Proxy not found"
            }
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/forwardingRules/")) {
        const ruleName = decodeURIComponent(normalized.split("/forwardingRules/")[1]);
        const entry = forwardingRules.get(ruleName);
        if (!entry) {
          return createGoogleJsonResponse(404, {
            error: {
              message: "Forwarding rule not found"
            }
          });
        }
        return createGoogleJsonResponse(200, entry);
      }

      if (normalized.startsWith("https://compute.googleapis.com/compute/v1/projects/demo-project/global/operations/")) {
        return createGoogleJsonResponse(200, {
          status: "DONE"
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
      fileName: "demo-browser-delivery-drift.json",
      fileContent: JSON.stringify(payload)
    });
    expect(imported.statusCode, JSON.stringify(imported.body)).toBe(200);

    const validatedConnection = await injectJson(server, "POST", buildConnectionRoute(connection.id, "validate"));
    expect(validatedConnection.statusCode, JSON.stringify(validatedConnection.body)).toBe(200);

    const deploymentTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
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
        allowDeletes: true,
        allowRestore: true,
        requireDryRunFirst: true
      }
    });
    expect(deploymentTarget.statusCode).toBe(201);

    const mediaTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Media Live Bucket",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "media-bucket",
        prefix: "library",
        localRootHint: "media"
      },
      policy: {
        allowDeletes: true,
        allowRestore: true,
        requireDryRunFirst: true
      }
    });
    expect(mediaTarget.statusCode).toBe(201);

    const browserTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Delivery Domain",
      connectionProfileId: connection.id,
      targetKind: "browser-delivery",
      adapterMode: "live-gcp",
      config: {
        accessMode: "custom-domain",
        stackMode: "https-load-balancer",
        dnsMode: "gcp-managed",
        hostname: "content.example.com",
        deploymentTargetProfileId: deploymentTarget.body.item.id,
        mediaTargetProfileId: mediaTarget.body.item.id
      },
      policy: {
        allowDeletes: false,
        allowRestore: false,
        requireDryRunFirst: true
      }
    });
    expect(browserTarget.statusCode).toBe(201);

    const analyze = await injectJson(
      server,
      "POST",
      `/api/reference/modules/test-modules-remote-ops/connections/${connection.id}/analyze-compatibility`
    );
    expect(analyze.statusCode, JSON.stringify(analyze.body)).toBe(200);
    const browserBundle = analyze.body.report.bundles.find((bundle) => bundle.id === "browser-delivery");
    expect(browserBundle.state).toBe("action-required");
    expect(browserBundle.provisionableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resourceKind: "url-map" })
      ])
    );
    expect(browserBundle.resourceChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "url-map",
          state: "drifted"
        })
      ])
    );

    const provision = await injectJson(
      server,
      "POST",
      `/api/reference/modules/test-modules-remote-ops/connections/${connection.id}/provision-missing`,
      {
        confirmedSafeguardIds: ["cost-confirmation", "singleton-hygiene", "minimum-footprint"],
        actionIds: null
      }
    );
    expect(provision.statusCode, JSON.stringify(provision.body)).toBe(200);
    expect(provision.body.executedActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resourceKind: "url-map" })
      ])
    );
    const provisionedBrowserBundle = provision.body.report.bundles.find((bundle) => bundle.id === "browser-delivery");
    expect(provisionedBrowserBundle.state).toBe("compatible");
    expect(urlMaps.get("content-example-com-url-map")).toEqual(
      expect.objectContaining({
        pathMatchers: expect.arrayContaining([
          expect.objectContaining({
            routeRules: expect.arrayContaining([
              expect.objectContaining({
                priority: 20,
                routeAction: {
                  urlRewrite: {
                    pathPrefixRewrite: "/site/assets"
                  }
                }
              }),
              expect.objectContaining({
                priority: 21,
                routeAction: {
                  urlRewrite: {
                    pathTemplateRewrite: "/site/assets/{assetPath}"
                  }
                }
              }),
              expect.objectContaining({
                priority: 30,
                routeAction: {
                  urlRewrite: {
                    pathPrefixRewrite: "/site/index.html"
                  }
                }
              }),
              expect.objectContaining({
                priority: 40,
                routeAction: {
                  urlRewrite: {
                    pathTemplateRewrite: "/site/{pagePath}/index.html"
                  }
                }
              })
            ])
          })
        ])
      })
    );
  } finally {
    await server.close();
  }
}, REMOTE_OPS_TEST_TIMEOUT_MS);

test("remote ops provisions temporary browser-delivery public-read access with storage permissions only", async () => {
  const server = await createRemoteOpsTestServer();

  try {
    const payload = createServiceAccountCredentialPayload();
    const enabledServices = new Set(["storage.googleapis.com"]);
    const bucketPolicies = new Map([
      [
        "deployment-bucket",
        {
          bindings: []
        }
      ],
      [
        "media-bucket",
        {
          bindings: []
        }
      ]
    ]);
    const grantedProjectPermissions = new Set([
      "serviceusage.services.get",
      "storage.buckets.get",
      "storage.buckets.getIamPolicy",
      "storage.objects.list",
      "storage.objects.create",
      "storage.objects.get",
      "storage.objects.delete",
      "storage.buckets.create",
      "storage.buckets.update",
      "storage.buckets.setIamPolicy"
    ]);

    const fetchMock = vi.fn(async (url, options = {}) => {
      const normalized = String(url);
      const method = options?.method ?? "GET";

      if (normalized === "https://oauth2.googleapis.com/token") {
        return createGoogleJsonResponse(200, {
          access_token: "access-token-browser-temporary",
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
          "https://cloudresourcemanager.googleapis.com/v1/projects/demo-project:testIamPermissions" &&
        method === "POST"
      ) {
        return createGoogleJsonResponse(200, {
          permissions: [...grantedProjectPermissions]
        });
      }

      if (normalized === "https://serviceusage.googleapis.com/v1/projects/1234567890/services/storage.googleapis.com") {
        return createGoogleJsonResponse(200, {
          name: "projects/1234567890/services/storage.googleapis.com",
          state: enabledServices.has("storage.googleapis.com") ? "ENABLED" : "DISABLED"
        });
      }

      if (normalized === "https://storage.googleapis.com/storage/v1/b/deployment-bucket") {
        return createGoogleJsonResponse(200, {
          name: "deployment-bucket",
          location: "ME-WEST1"
        });
      }
      if (normalized === "https://storage.googleapis.com/storage/v1/b/media-bucket") {
        return createGoogleJsonResponse(200, {
          name: "media-bucket",
          location: "ME-WEST1"
        });
      }

      if (
        normalized.startsWith("https://storage.googleapis.com/storage/v1/b/deployment-bucket/iam/testPermissions?") ||
        normalized.startsWith("https://storage.googleapis.com/storage/v1/b/media-bucket/iam/testPermissions?")
      ) {
        return createGoogleJsonResponse(200, {
          permissions: [
            "storage.objects.create",
            "storage.objects.get",
            "storage.objects.delete"
          ]
        });
      }

      if (normalized === "https://storage.googleapis.com/storage/v1/b/deployment-bucket/iam" && method === "GET") {
        return createGoogleJsonResponse(200, bucketPolicies.get("deployment-bucket"));
      }
      if (normalized === "https://storage.googleapis.com/storage/v1/b/media-bucket/iam" && method === "GET") {
        return createGoogleJsonResponse(200, bucketPolicies.get("media-bucket"));
      }
      if (normalized === "https://storage.googleapis.com/storage/v1/b/deployment-bucket/iam" && method === "PUT") {
        const nextPolicy = JSON.parse(options.body);
        bucketPolicies.set("deployment-bucket", nextPolicy);
        return createGoogleJsonResponse(200, nextPolicy);
      }
      if (normalized === "https://storage.googleapis.com/storage/v1/b/media-bucket/iam" && method === "PUT") {
        const nextPolicy = JSON.parse(options.body);
        bucketPolicies.set("media-bucket", nextPolicy);
        return createGoogleJsonResponse(200, nextPolicy);
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
      fileName: "demo-browser-temporary.json",
      fileContent: JSON.stringify(payload)
    });
    expect(imported.statusCode, JSON.stringify(imported.body)).toBe(200);

    const deploymentTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Deployment Bucket",
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
    expect(deploymentTarget.statusCode).toBe(201);

    const mediaTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Media Bucket",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "media-bucket",
        prefix: "library",
        localRootHint: "media"
      },
      policy: {
        allowDeletes: true,
        allowRestore: true,
        requireDryRunFirst: true
      }
    });
    expect(mediaTarget.statusCode).toBe(201);

    const browserTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Temporary Browser Delivery",
      connectionProfileId: connection.id,
      targetKind: "browser-delivery",
      adapterMode: "live-gcp",
      config: {
        accessMode: "gcp-temporary",
        stackMode: "direct-storage",
        dnsMode: "external",
        deploymentTargetProfileId: deploymentTarget.body.item.id,
        mediaTargetProfileId: mediaTarget.body.item.id
      },
      policy: {
        allowDeletes: false,
        allowRestore: false,
        requireDryRunFirst: true
      }
    });
    expect(browserTarget.statusCode).toBe(201);

    const analyze = await injectJson(
      server,
      "POST",
      `/api/reference/modules/test-modules-remote-ops/connections/${connection.id}/analyze-compatibility`
    );
    expect(analyze.statusCode, JSON.stringify(analyze.body)).toBe(200);
    const browserBundle = analyze.body.report.bundles.find((bundle) => bundle.id === "browser-delivery");
    expect(browserBundle.state).toBe("action-required");
    expect(browserBundle.provisionableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourceKind: "public-read",
          availableNow: true,
          missingPermissions: []
        })
      ])
    );

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
        expect.objectContaining({ resourceKind: "public-read" })
      ])
    );
    const nextBrowserBundle = provision.body.report.bundles.find((bundle) => bundle.id === "browser-delivery");
    expect(nextBrowserBundle.state).toBe("compatible");
    expect(bucketPolicies.get("deployment-bucket")?.bindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "roles/storage.objectViewer",
          members: expect.arrayContaining(["allUsers"])
        })
      ])
    );
    expect(bucketPolicies.get("media-bucket")?.bindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "roles/storage.objectViewer",
          members: expect.arrayContaining(["allUsers"])
        })
      ])
    );
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
            md5Hash: item.md5Hash,
            contentType: item.contentType,
            cacheControl: item.cacheControl ?? null
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
        const contentType =
          typeof options?.headers?.["content-type"] === "string"
            ? options.headers["content-type"]
            : "application/octet-stream";
        remoteObjects.set(objectName, {
          name: objectName,
          content,
          md5Hash: hashStorageContent(content),
          contentType
        });
        return createGoogleJsonResponse(200, {
          name: objectName
        });
      }
      if (
        normalized.startsWith("https://storage.googleapis.com/storage/v1/b/deployment-bucket/o/") &&
        !normalized.endsWith("?alt=media") &&
        method === "PATCH"
      ) {
        const requestUrl = new URL(normalized);
        const objectName = decodeURIComponent(
          requestUrl.pathname.replace("/storage/v1/b/deployment-bucket/o/", "")
        );
        const existing = remoteObjects.get(objectName);
        const metadata = JSON.parse(String(options.body ?? "{}"));
        remoteObjects.set(objectName, {
          ...(existing ?? {
            name: objectName,
            content: Buffer.from(""),
            md5Hash: null,
            contentType: "application/octet-stream"
          }),
          ...(typeof metadata.contentType === "string" ? { contentType: metadata.contentType } : {}),
          ...(typeof metadata.cacheControl === "string" ? { cacheControl: metadata.cacheControl } : {})
        });
        return createGoogleJsonResponse(200, {
          name: objectName,
          contentType: remoteObjects.get(objectName)?.contentType ?? null,
          cacheControl: remoteObjects.get(objectName)?.cacheControl ?? null
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
    await removeIfExists(resolveSimulatedFirestoreRoot(firestoreTargetId));

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

test("remote ops executes taxonomy Firestore projection procedures with simulated GCP roots", async () => {
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
    const category = await seedCategory(server);
    const internalCategory = await injectJson(server, "POST", buildItemsRoute("blog-categories"), {
      name: "Internal Ops",
      description: "Internal category",
      parentCategoryId: null,
      sortOrder: 20,
      visibility: "internal"
    });
    expect(internalCategory.statusCode).toBe(201);

    const createTarget = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
      title: "Categories Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      adapterMode: "simulated-gcp",
      config: {
        projectionScope: "public-blog-categories",
        firestoreCollectionPath: "publicCategories"
      },
      policy: {
        allowDeletes: false,
        allowRestore: true,
        requireDryRunFirst: true
      }
    });
    expect(createTarget.statusCode).toBe(201);
    firestoreTargetId = createTarget.body.item.id;
    await removeIfExists(resolveSimulatedFirestoreRoot(firestoreTargetId));

    const validateTarget = await injectJson(server, "POST", buildTargetRoute(firestoreTargetId, "validate"));
    expect(validateTarget.statusCode).toBe(200);
    expect(validateTarget.body.item.targetStatus).toBe("validated");

    const compare = await injectJson(server, "POST", buildTargetRoute(firestoreTargetId, "compare"));
    expect(compare.statusCode).toBe(200);
    expect(compare.body.item.compareSummary.createCount).toBeGreaterThanOrEqual(1);

    const execute = await injectJson(server, "POST", buildTargetRoute(firestoreTargetId, "execute"));
    expect(execute.statusCode).toBe(200);
    expect(execute.body.item.compareSummary.state).toBe("clean");

    const publicProjectedPath = path.join(
      resolveSimulatedFirestoreRoot(firestoreTargetId),
      "publicCategories",
      `${category.slug}.json`
    );
    const internalProjectedPath = path.join(
      resolveSimulatedFirestoreRoot(firestoreTargetId),
      "publicCategories",
      `${internalCategory.body.item.slug}.json`
    );
    const projectedContent = await fs.readFile(publicProjectedPath, "utf8");
    expect(projectedContent).toContain('"name": "Operations"');
    expect(existsSync(internalProjectedPath)).toBe(false);
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
    await removeIfExists(resolveSimulatedStorageRoot(storageTargetId));

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

