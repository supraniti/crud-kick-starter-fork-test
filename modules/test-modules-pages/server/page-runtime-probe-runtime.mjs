import { normalizeTargetConfig } from "../../test-modules-remote-ops/server/remote-ops-shared-runtime.mjs";
import { requestGoogleJson } from "../../test-modules-remote-ops/server/remote-ops-live-google-runtime.mjs";
import { getServiceAccountAccessToken } from "../../test-modules-remote-ops/server/remote-ops-service-account-auth-runtime.mjs";
import { resolvePageByPath } from "./page-delivery-runtime.mjs";
import { normalizeOptionalText, normalizePagePath } from "./distribution-shared-runtime.mjs";
import { resolvePublishedFirestoreDescriptor } from "./page-firestore-publication-runtime.mjs";

const CONTENT_MODULE_ID = "test-modules-content";
const TAXONOMY_MODULE_ID = "test-modules-taxonomy";
const PROBE_QUERY_PARAM = "runtimeProbe";
const PROBE_DATASET_ID = "runtime-probe-firestore-document";
const PROBE_RESOURCE_ID = "runtime-probe";
const PROBE_QUERY_ID = "firestore-document";
export const RUNTIME_PROBE_DOCUMENT_FILE_NAME = "runtime-probe.document.json";
const PROBE_STYLE_RULES = [
  "#page-runtime-probe{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;border:1px solid rgba(15,23,42,0.16);border-radius:16px;background:rgba(255,255,255,0.98);box-shadow:0 20px 40px rgba(15,23,42,0.22);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#0f172a;}",
  "#page-runtime-probe .probe-stack{display:grid;gap:12px;padding:16px;}",
  "#page-runtime-probe h2,#page-runtime-probe p,#page-runtime-probe pre{margin:0;}",
  "#page-runtime-probe .probe-badges{display:flex;gap:8px;flex-wrap:wrap;}",
  "#page-runtime-probe .probe-badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:12px;}",
  "#page-runtime-probe .probe-actions{display:grid;gap:8px;}",
  "#page-runtime-probe button{border:0;border-radius:10px;padding:10px 12px;background:#0f766e;color:#fff;font:inherit;cursor:pointer;text-align:left;}",
  "#page-runtime-probe button.alt{background:#334155;}",
  "#page-runtime-probe button:disabled{opacity:0.65;cursor:default;}",
  "#page-runtime-probe img{display:block;width:100%;height:auto;border-radius:12px;background:#e2e8f0;}",
  "#page-runtime-probe .probe-empty{padding:12px;border:1px dashed rgba(148,163,184,0.65);border-radius:12px;color:#475569;}",
  "#page-runtime-probe pre{padding:12px;border-radius:12px;background:#0f172a;color:#e2e8f0;overflow:auto;font:12px/1.45 Consolas,monospace;white-space:pre-wrap;word-break:break-word;}"
];

function escapeForInlineScript(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function buildRuntimeProbeHeaderLines() {
  return [
    "<script>",
    "(function () {",
    `  var PROBE_QUERY_PARAM = \"${escapeForInlineScript(PROBE_QUERY_PARAM)}\";`,
    `  var PROBE_DATASET_ID = \"${escapeForInlineScript(PROBE_DATASET_ID)}\";`,
    `  var PROBE_RESOURCE_ID = \"${escapeForInlineScript(PROBE_RESOURCE_ID)}\";`,
    `  var PROBE_QUERY_ID = \"${escapeForInlineScript(PROBE_QUERY_ID)}\";`,
    `  var PROBE_DOCUMENT_FILE_NAME = \"${escapeForInlineScript(RUNTIME_PROBE_DOCUMENT_FILE_NAME)}\";`,
    "  function isProbeEnabled() {",
    "    var rawValue = new URLSearchParams(window.location.search).get(PROBE_QUERY_PARAM);",
    "    if (!rawValue) {",
    "      return false;",
    "    }",
    "    var normalized = String(rawValue).trim().toLowerCase();",
    "    return normalized === '1' || normalized === 'true' || normalized === 'yes';",
    "  }",
    "  if (!isProbeEnabled()) {",
    "    return;",
    "  }",
    "  function parsePagePayload() {",
    "    try {",
    "      var script = document.getElementById('page-data');",
    "      return script ? JSON.parse(script.textContent || 'null') || {} : {};",
    "    } catch (error) {",
    "      return {};",
    "    }",
    "  }",
    "  var payload = parsePagePayload();",
    "  var pagePath = (payload && payload.page && payload.page.path) || '/';"
  ];
}

function buildRuntimeProbeNetworkLines() {
  return [
    "  function resolveProbeDocumentUrl() {",
    "    return new URL('./' + PROBE_DOCUMENT_FILE_NAME, window.location.href).toString();",
    "  }",
    "  async function fetchProbePayload() {",
    "    var probeUrl = resolveProbeDocumentUrl();",
    "    var response = await fetch(probeUrl, {",
    "      method: 'GET',",
    "      headers: { accept: 'application/json' },",
    "      credentials: 'omit'",
    "    });",
    "    var rawText = await response.text();",
    "    var body = rawText ? JSON.parse(rawText) : {};",
    "    if (!response.ok || body.ok === false) {",
    "      var message = body && body.error && body.error.message ? body.error.message : 'Runtime probe request failed';",
    "      var error = new Error(message);",
    "      error.status = response.status;",
    "      error.body = body;",
    "      throw error;",
    "    }",
    "    return { url: probeUrl, body: body };",
    "  }"
  ];
}

function buildRuntimeProbeRuntimeConfigLines() {
  return [
    "  function ensureProbeConfig() {",
    "    var config = window.__CRUD_CLIENT_RUNTIME_CONFIG__ || {};",
    "    config.queries = Array.isArray(config.queries) ? config.queries.filter(function (entry) {",
    "      return !(entry && entry.resource === PROBE_RESOURCE_ID && entry.query === PROBE_QUERY_ID);",
    "    }) : [];",
    "    config.datasets = Array.isArray(config.datasets) ? config.datasets.filter(function (entry) {",
    "      return !(entry && entry.dataset === PROBE_DATASET_ID);",
    "    }) : [];",
    "    config.datasets.push({",
    "      dataset: PROBE_DATASET_ID,",
    "      recordMode: 'single-item',",
    "      fetchInstall: async function () {",
    "        var result = await fetchProbePayload();",
    "        return {",
    "          items: result.body && result.body.document ? [result.body.document] : [],",
    "          version: (result.body && result.body.document && result.body.document.updatedOn) || new Date().toISOString(),",
    "          syncToken: (result.body && result.body.documentId) || pagePath",
    "        };",
    "      }",
    "    });",
    "    config.queries.push({",
    "      resource: PROBE_RESOURCE_ID,",
    "      query: PROBE_QUERY_ID,",
    "      policy: 'local-first',",
    "      dataset: PROBE_DATASET_ID",
    "    });",
    "    window.__CRUD_CLIENT_RUNTIME_CONFIG__ = config;",
    "  }",
    "  ensureProbeConfig();"
  ];
}

function buildRuntimeProbeRenderLines() {
  return [
    "  function resolveFeaturedMedia() {",
    "    var primaryRecord = payload && payload.data && payload.data.primary && payload.data.primary.record;",
    "    if (primaryRecord && primaryRecord.featuredMedia && primaryRecord.featuredMedia.preferredUrl) {",
    "      return primaryRecord.featuredMedia;",
    "    }",
    "    var openGraphImage = payload && payload.head && payload.head.openGraph && payload.head.openGraph.image;",
    "    if (openGraphImage && openGraphImage.preferredUrl) {",
    "      return openGraphImage;",
    "    }",
    "    return null;",
    "  }",
    "  function ensureProbeStyles() {",
    "    if (document.getElementById('page-runtime-probe-style')) {",
    "      return;",
    "    }",
    "    var style = document.createElement('style');",
    "    style.id = 'page-runtime-probe-style';",
    `    style.textContent = ${JSON.stringify(PROBE_STYLE_RULES.join(""))};`,
    "    document.head.appendChild(style);",
    "  }",
    "  function setOutput(node, value) {",
    "    node.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);",
    "  }",
    "  function appendBadges(container) {",
    "    ['image preview', 'remote published document', 'indexeddb install'].forEach(function (label) {",
    "      var badge = document.createElement('span');",
    "      badge.className = 'probe-badge';",
    "      badge.textContent = label;",
    "      container.appendChild(badge);",
    "    });",
    "  }",
    "  function appendFeaturedMedia(stack) {",
    "    var featuredMedia = resolveFeaturedMedia();",
    "    if (featuredMedia && featuredMedia.preferredUrl) {",
    "      var image = document.createElement('img');",
    "      image.src = featuredMedia.preferredUrl;",
    "      image.alt = featuredMedia.altText || featuredMedia.displayName || 'Referenced media';",
    "      stack.appendChild(image);",
    "      return;",
    "    }",
    "    var empty = document.createElement('div');",
    "    empty.className = 'probe-empty';",
    "    empty.textContent = 'No referenced image was resolved for this page payload.';",
    "    stack.appendChild(empty);",
    "  }",
    "  function renderProbe() {",
    "    ensureProbeStyles();",
    "    var panel = document.getElementById('page-runtime-probe');",
    "    if (!panel) {",
    "      panel = document.createElement('aside');",
    "      panel.id = 'page-runtime-probe';",
    "      document.body.appendChild(panel);",
    "    }",
    "    panel.innerHTML = '';",
    "    var stack = document.createElement('div');",
    "    stack.className = 'probe-stack';",
    "    var title = document.createElement('h2');",
    "    title.textContent = 'Runtime Probe';",
    "    stack.appendChild(title);",
    "    var intro = document.createElement('p');",
    "    intro.textContent = 'Temporary deployed-page probe. Uses the published document sidecar and IndexedDB. Enabled by ?' + PROBE_QUERY_PARAM + '=1.';",
    "    stack.appendChild(intro);",
    "    var badges = document.createElement('div');",
    "    badges.className = 'probe-badges';",
    "    appendBadges(badges);",
    "    stack.appendChild(badges);",
    "    appendFeaturedMedia(stack);",
    "    var actions = document.createElement('div');",
    "    actions.className = 'probe-actions';",
    "    var loadButton = document.createElement('button');",
    "    loadButton.textContent = 'Load Remote Published Document';",
    "    var installButton = document.createElement('button');",
    "    installButton.className = 'alt';",
    "    installButton.textContent = 'Install Remote Document To IndexedDB';",
    "    actions.appendChild(loadButton);",
    "    actions.appendChild(installButton);",
    "    stack.appendChild(actions);",
    "    var output = document.createElement('pre');",
    "    output.textContent = 'Awaiting probe action...';",
    "    stack.appendChild(output);",
    "    panel.appendChild(stack);",
    "    bindProbeActions(loadButton, installButton, output);",
    "  }",
    "  if (document.readyState === 'loading') {",
    "    document.addEventListener('DOMContentLoaded', renderProbe, { once: true });",
    "  } else {",
    "    renderProbe();",
    "  }"
  ];
}

function buildRuntimeProbeActionLines() {
  return [
    "  function bindProbeActions(loadButton, installButton, output) {",
    "    loadButton.addEventListener('click', async function () {",
    "      loadButton.disabled = true;",
    "      try {",
    "        var remoteResult = await fetchProbePayload();",
    "        setOutput(output, { source: remoteResult.url, payload: remoteResult.body });",
    "      } catch (error) {",
    "        setOutput(output, { ok: false, error: error && error.message ? error.message : String(error), status: error && error.status ? error.status : null, payload: error && error.body ? error.body : null });",
    "      } finally {",
    "        loadButton.disabled = false;",
    "      }",
    "    });",
    "    installButton.addEventListener('click', async function () {",
    "      installButton.disabled = true;",
    "      try {",
    "        if (!window.dataLayer || typeof window.dataLayer.installDataset !== 'function') {",
    "          throw new Error('client runtime is not available on this page yet');",
    "        }",
    "        var installResult = await window.dataLayer.installDataset({ dataset: PROBE_DATASET_ID });",
    "        var status = await window.dataLayer.getDatasetStatus(PROBE_DATASET_ID);",
    "        var queryResult = await window.dataLayer.query({ resource: PROBE_RESOURCE_ID, query: PROBE_QUERY_ID });",
    "        setOutput(output, { installResult: installResult, datasetStatus: status, indexedDbQueryResult: queryResult });",
    "      } catch (error) {",
    "        setOutput(output, { ok: false, error: error && error.message ? error.message : String(error) });",
    "      } finally {",
    "        installButton.disabled = false;",
    "      }",
    "    });",
    "  }"
  ];
}

function buildRuntimeProbeScript() {
  return [
    ...buildRuntimeProbeHeaderLines(),
    ...buildRuntimeProbeNetworkLines(),
    ...buildRuntimeProbeRuntimeConfigLines(),
    ...buildRuntimeProbeActionLines(),
    ...buildRuntimeProbeRenderLines(),
    "})();",
    "</script>"
  ].join("");
}

export function buildRuntimeProbeSupportMarkup() {
  return buildRuntimeProbeScript();
}

function readPrimaryRecord(payload = {}) {
  return payload?.data?.primary?.record && typeof payload.data.primary.record === "object"
    ? payload.data.primary.record
    : null;
}

function resolveProjectionSettingsDescriptor(primarySourceType) {
  if (primarySourceType === "blog-post") {
    return {
      moduleId: CONTENT_MODULE_ID,
      fieldId: "remoteProjectionTargetProfileId",
      bindingKey: "posts-projection"
    };
  }
  if (primarySourceType === "blog-category") {
    return {
      moduleId: TAXONOMY_MODULE_ID,
      fieldId: "remoteCategoriesProjectionTargetProfileId",
      bindingKey: "categories-projection"
    };
  }
  if (primarySourceType === "blog-tag") {
    return {
      moduleId: TAXONOMY_MODULE_ID,
      fieldId: "remoteTagsProjectionTargetProfileId",
      bindingKey: "tags-projection"
    };
  }
  return null;
}

async function readRawModuleSettings(resolveSettingsRepository, moduleId) {
  const repository =
    typeof resolveSettingsRepository === "function" ? resolveSettingsRepository(moduleId) : null;
  if (!repository || typeof repository.readState !== "function") {
    return {};
  }
  try {
    const state = await repository.readState();
    if (state?.[moduleId] && typeof state[moduleId] === "object") {
      return state[moduleId];
    }
    return state && typeof state === "object" && !Array.isArray(state) ? state : {};
  } catch {
    return {};
  }
}

async function resolveBindingFromTarget(routeContext, targetProfile = null) {
  if (!targetProfile) {
    return null;
  }
  const connectionProfile = await routeContext.remoteConnectionsHandler?.findById?.(
    targetProfile.connectionProfileId
  );
  if (!connectionProfile) {
    return null;
  }
  return {
    targetProfile,
    connectionProfile
  };
}

async function resolveBindingFromModuleSettings(routeContext, descriptor) {
  const settings = await readRawModuleSettings(routeContext.resolveSettingsRepository, descriptor.moduleId);
  const targetProfileId = normalizeOptionalText(settings?.[descriptor.fieldId]);
  if (!targetProfileId) {
    return null;
  }
  const targetProfile = await routeContext.remoteTargetsHandler?.findById?.(targetProfileId);
  return resolveBindingFromTarget(routeContext, targetProfile);
}

async function resolveBindingFromProductTargets(routeContext, descriptor) {
  const listedTargetsPayload = await routeContext.remoteTargetsHandler?.list?.({
    limit: 500,
    offset: 0
  });
  const listedTargets = Array.isArray(listedTargetsPayload?.items) ? listedTargetsPayload.items : [];
  const fallbackTarget = listedTargets.find(
    (target) =>
      normalizeOptionalText(target?.productBindingKey) === descriptor.bindingKey &&
      target?.targetKind === "firestore-projection"
  );
  return resolveBindingFromTarget(routeContext, fallbackTarget);
}

async function resolveProjectionBinding(routeContext, payload) {
  const descriptor = resolveProjectionSettingsDescriptor(payload?.page?.primarySourceType ?? "none");
  if (!descriptor) {
    return null;
  }
  return (
    (await resolveBindingFromModuleSettings(routeContext, descriptor)) ??
    (await resolveBindingFromProductTargets(routeContext, descriptor))
  );
}

function resolveProjectionDocumentId(primaryRecord = null) {
  return normalizeOptionalText(primaryRecord?.slug) ?? normalizeOptionalText(primaryRecord?.id);
}

function buildFirestoreDocumentUrl(projectId, collectionPath, documentId) {
  return [
    "https://firestore.googleapis.com/v1/projects",
    encodeURIComponent(projectId),
    "databases",
    "(default)",
    "documents",
    ...String(collectionPath)
      .split("/")
      .map((segment) => encodeURIComponent(segment)),
    encodeURIComponent(documentId)
  ].join("/");
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if ("nullValue" in value) {
    return null;
  }
  if ("booleanValue" in value) {
    return Boolean(value.booleanValue);
  }
  if ("integerValue" in value) {
    return Number.parseInt(value.integerValue, 10);
  }
  if ("doubleValue" in value) {
    return Number(value.doubleValue);
  }
  if ("stringValue" in value) {
    return String(value.stringValue);
  }
  if ("timestampValue" in value) {
    return String(value.timestampValue);
  }
  if ("arrayValue" in value) {
    const values = Array.isArray(value.arrayValue?.values) ? value.arrayValue.values : [];
    return values.map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    const fields = value.mapValue?.fields ?? {};
    return Object.entries(fields).reduce((result, [key, fieldValue]) => {
      result[key] = decodeFirestoreValue(fieldValue);
      return result;
    }, {});
  }
  return null;
}

function decodeFirestoreDocument(document = {}) {
  const fields = document?.fields ?? {};
  return Object.entries(fields).reduce((result, [key, value]) => {
    result[key] = decodeFirestoreValue(value);
    return result;
  }, {});
}

function buildProbeError(code, message, statusCode = 400, extras = {}) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  Object.assign(error, extras);
  return error;
}

function buildProbePayload(payload) {
  return {
    ...payload,
    timestamp: new Date().toISOString()
  };
}

function setProbeCorsHeaders(reply) {
  reply.header("access-control-allow-origin", "*");
  reply.header("access-control-allow-methods", "GET, OPTIONS");
  reply.header("access-control-allow-headers", "content-type");
}

export async function resolveRuntimeProbeFirestoreDocument(routeContext, pagePath) {
  const normalizedPath = normalizePagePath(pagePath);
  const payload = await resolvePageByPath({
    collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
    path: normalizedPath,
    preview: false,
    resolveSettingsRepository: routeContext.resolveSettingsRepository,
    settingsDefinition: routeContext.manifest?.settings ?? null
  });
  if (!payload) {
    throw buildProbeError(
      "RUNTIME_PROBE_PAGE_NOT_FOUND",
      `No deliverable page matched path '${normalizedPath}'`,
      404
    );
  }

  const primaryRecord = readPrimaryRecord(payload);
  if (!primaryRecord) {
    throw buildProbeError(
      "RUNTIME_PROBE_PRIMARY_RECORD_MISSING",
      "The resolved page does not contain a primary content record.",
      409
    );
  }

  const firestoreDescriptor = await resolvePublishedFirestoreDescriptor({
    collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
    resolveSettingsRepository: routeContext.resolveSettingsRepository,
    payload
  });
  if (!firestoreDescriptor) {
    throw buildProbeError(
      "RUNTIME_PROBE_TARGET_NOT_CONFIGURED",
      "No Firestore projection target is configured for this page source type.",
      409
    );
  }

  const connectionProfile = await routeContext.remoteConnectionsHandler?.findById?.(
    firestoreDescriptor.connectionProfileId
  );
  if (!connectionProfile) {
    throw buildProbeError(
      "RUNTIME_PROBE_CONNECTION_NOT_FOUND",
      "No connection profile is available for the Firestore projection target.",
      409
    );
  }

  const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
  const documentUrl = firestoreDescriptor.documentUrl;
  const document = await requestGoogleJson(documentUrl, accessToken, {
    method: "GET"
  });

  return {
    pagePath: normalizedPath,
    primarySourceType: payload.page.primarySourceType,
    documentId: firestoreDescriptor.documentId,
    firestore: {
      projectId: firestoreDescriptor.projectId,
      collectionPath: firestoreDescriptor.collectionPath,
      documentUrl
    },
    document: decodeFirestoreDocument(document)
  };
}

export function registerRuntimeProbeRoutes(fastify, routeContext) {
  const routePath = `/api/reference/modules/${routeContext.moduleId}/runtime-probe/firestore-document`;

  fastify.options(routePath, async function runtimeProbeOptionsRoute(_request, reply) {
    setProbeCorsHeaders(reply);
    reply.code(204);
    return null;
  });

  fastify.get(routePath, async function runtimeProbeFirestoreRoute(request, reply) {
    setProbeCorsHeaders(reply);
    try {
      const rawPath = typeof request.query?.path === "string" ? request.query.path : "";
      const normalizedPath = normalizeOptionalText(rawPath);
      if (!normalizedPath) {
        throw buildProbeError("RUNTIME_PROBE_PATH_REQUIRED", "path query parameter is required", 400);
      }

      const result = await resolveRuntimeProbeFirestoreDocument(routeContext, normalizedPath);
      return buildProbePayload({
        ok: true,
        ...result
      });
    } catch (error) {
      reply.code(error?.statusCode ?? 500);
      return buildProbePayload({
        ok: false,
        error: {
          code: error?.code ?? "RUNTIME_PROBE_FAILED",
          message: error?.message ?? "Failed to resolve the runtime probe document."
        }
      });
    }
  });
}
