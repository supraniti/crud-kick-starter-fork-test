import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeScriptUrlList, normalizeOptionalText } from "./distribution-shared-runtime.mjs";
import { appendRuntimeAssetVersion } from "./page-runtime-asset-version-runtime.mjs";
import { attachPageContextManifest } from "./page-context-manifest-runtime.mjs";
import { resolveReaderRouteManifestAssetUrl } from "./page-route-manifest-runtime.mjs";

const DEFAULT_CLIENT_RUNTIME_ASSET_PATH = "assets/client-runtime.global.js";
const DEFAULT_READER_BOOTSTRAP_DATASET = "reader-page-bootstrap";
const DEFAULT_READER_DEFERRED_DATASET = "reader-page-deferred";
const DEFAULT_READER_ROUTE_MANIFEST_DATASET = "reader-route-manifest";
const DEFAULT_READER_PAGE_RESOURCE = "readerPage";
const DEFAULT_READER_DEFERRED_RESOURCE = "readerDeferred";
const DEFAULT_READER_ROUTE_MANIFEST_RESOURCE = "readerRouteManifest";
function countPathSegments(pagePath) {
  return String(pagePath || "")
    .split("/")
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

function buildRelativeClientRuntimeAssetUrl(pagePath) {
  const segmentCount = countPathSegments(pagePath);
  return `${"../".repeat(segmentCount)}${DEFAULT_CLIENT_RUNTIME_ASSET_PATH}`;
}

function resolveClientRuntimeSourcePath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../../../client-runtime/dist/client-runtime.global.js");
}

function normalizeOrigin(value) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.replace(/\/+$/g, "") : null;
}

function readCurrentApplication(payload = {}) {
  return payload?.application && typeof payload.application === "object" ? payload.application : null;
}

function readCurrentModel(payload = {}) {
  const application = readCurrentApplication(payload);
  return application?.model && typeof application.model === "object" ? application.model : null;
}

function readCurrentRouteManifestAssetUrl(payload = {}) {
  const application = readCurrentApplication(payload);
  const applicationRouteManifest =
    application?.routeManifest && typeof application.routeManifest === "object"
      ? application.routeManifest
      : null;
  return (
    normalizeOptionalText(applicationRouteManifest?.assetUrl) ??
    resolveReaderRouteManifestAssetUrl(payload)
  );
}

function readCurrentPrimaryRecordId(payload = {}) {
  const model = readCurrentModel(payload);
  if (!model || typeof model !== "object") {
    return null;
  }
  if (model.kind === "post-detail") {
    return model.post?.id ?? null;
  }
  if (model.kind === "category-detail") {
    return model.category?.id ?? null;
  }
  return null;
}

function resolveReaderApiOrigin(payload = {}) {
  return normalizeOrigin(
    payload?.delivery?.applicationApiOrigin ?? payload?.delivery?.publicApplicationApiOrigin
  );
}

function createReaderCurrentQueryDefinition() {
  return {
    resource: DEFAULT_READER_PAGE_RESOURCE,
    query: "current",
    policy: "local-first",
    dataset: DEFAULT_READER_BOOTSTRAP_DATASET
  };
}

function createReaderByPathQueryDefinition(payload = {}) {
  return {
    resource: DEFAULT_READER_PAGE_RESOURCE,
    query: "byPath",
    policy: "local-first",
    dataset: DEFAULT_READER_BOOTSTRAP_DATASET,
    localLookupField: "path",
    allowRemoteOnEmptyLocal: true,
    persist: {
      dataset: DEFAULT_READER_BOOTSTRAP_DATASET,
      storageKeyPath: "path"
    }
  };
}

function createReaderDeferredByPathQueryDefinition(payload = {}) {
  return {
    resource: DEFAULT_READER_DEFERRED_RESOURCE,
    query: "byPath",
    policy: "local-first",
    dataset: DEFAULT_READER_DEFERRED_DATASET,
    localLookupField: "path",
    allowRemoteOnEmptyLocal: true,
    persist: {
      dataset: DEFAULT_READER_DEFERRED_DATASET,
      storageKeyPath: "path"
    }
  };
}

function createReaderRouteManifestCurrentQueryDefinition(payload = {}) {
  return {
    resource: DEFAULT_READER_ROUTE_MANIFEST_RESOURCE,
    query: "current",
    policy: "local-first",
    dataset: DEFAULT_READER_ROUTE_MANIFEST_DATASET,
    allowRemoteOnEmptyLocal: true,
    persist: {
      dataset: DEFAULT_READER_ROUTE_MANIFEST_DATASET
    },
    remote: {
      path: readCurrentRouteManifestAssetUrl(payload)
    }
  };
}

function createReaderBootstrapDatasetDefinition() {
  return {
    dataset: DEFAULT_READER_BOOTSTRAP_DATASET,
    bootstrapMode: "inline-json-script",
    inlineScriptId: "page-data",
    valuePath: "application",
    recordMode: "single-item",
    versionPath: "application.resolvedAt",
    syncTokenPath: "application.path",
    storageKeyPath: "path"
  };
}

function createReaderDeferredDatasetDefinition() {
  return {
    dataset: DEFAULT_READER_DEFERRED_DATASET,
    recordMode: "single-item",
    storageKeyPath: "path"
  };
}

function createReaderRouteManifestDatasetDefinition() {
  return {
    dataset: DEFAULT_READER_ROUTE_MANIFEST_DATASET,
    recordMode: "single-item"
  };
}

function buildRuntimeContext(payload = {}) {
  const application = readCurrentApplication(payload);
  const model = readCurrentModel(payload);
  const commentsEnabled = Boolean(
    model &&
      model.kind === "post-detail" &&
      model.comments &&
      model.comments.enabled
  );
  return {
    pagePayloadScriptId: "page-data",
    pageId: payload?.page?.id ?? null,
    pagePath: payload?.page?.path ?? application?.path ?? "/",
    primaryRecordId: readCurrentPrimaryRecordId(payload),
    primarySourceType: payload?.page?.primarySourceType ?? application?.primarySourceType ?? "none",
    routeManifest:
      application && typeof application.routeManifest === "object" ? application.routeManifest : null,
    routeManifestAssetUrl: readCurrentRouteManifestAssetUrl(payload),
    commentsEnabled,
    publicOrigin: payload?.delivery?.publicOrigin ?? null,
    publicUrl:
      payload?.delivery?.publicUrl ??
      payload?.delivery?.canonicalUrl ??
      payload?.head?.canonicalUrl ??
      null,
    applicationApiOrigin: resolveReaderApiOrigin(payload)
  };
}

export function buildClientRuntimeContract(payload = {}, pageContextManifest = null) {
  const publicOrigin = payload?.delivery?.publicOrigin ?? null;
  const apiOrigin = resolveReaderApiOrigin(payload);
  const pagePath = payload?.page?.path ?? "/";
  const publicAssetUrl = publicOrigin
    ? appendRuntimeAssetVersion(
        `${String(publicOrigin).replace(/\/+$/, "")}/${DEFAULT_CLIENT_RUNTIME_ASSET_PATH}`,
        payload,
        resolveClientRuntimeSourcePath()
      )
    : null;

  return {
    contractVersion: 2,
    assetUrl: publicAssetUrl ?? buildRelativeClientRuntimeAssetUrl(pagePath),
    bootstrapDatasets: [DEFAULT_READER_BOOTSTRAP_DATASET],
    context: buildRuntimeContext(payload),
    contextManifest: pageContextManifest ?? payload?.pageContextManifest ?? null,
    remote: {
      ...(apiOrigin ? { baseUrl: apiOrigin } : {}),
      defaultHeaders: {
        Accept: "application/json"
      }
    },
    slots: [],
    queries: [
      createReaderCurrentQueryDefinition(),
      createReaderByPathQueryDefinition(payload),
      createReaderDeferredByPathQueryDefinition(payload),
      createReaderRouteManifestCurrentQueryDefinition(payload)
    ],
    actions: [],
    datasets: [
      createReaderBootstrapDatasetDefinition(),
      createReaderDeferredDatasetDefinition(),
      createReaderRouteManifestDatasetDefinition()
    ]
  };
}

export function attachClientRuntimeContract(payload = {}) {
  const manifestAwarePayload = attachPageContextManifest(payload);
  return {
    ...manifestAwarePayload,
    runtime: {
      ...(manifestAwarePayload?.runtime && typeof manifestAwarePayload.runtime === "object" ? manifestAwarePayload.runtime : {}),
      clientRuntime: buildClientRuntimeContract(
        manifestAwarePayload,
        manifestAwarePayload?.pageContextManifest ?? null
      )
    }
  };
}

export function resolvePageRuntimeScriptUrls(payload, runtimeScriptUrls = []) {
  const normalizedUrls = normalizeScriptUrlList(runtimeScriptUrls);
  const clientRuntimeAssetUrl =
    payload?.runtime?.clientRuntime?.assetUrl ??
    buildRelativeClientRuntimeAssetUrl(payload?.page?.path ?? "/");
  if (normalizedUrls.includes(clientRuntimeAssetUrl)) {
    return normalizedUrls;
  }
  return [clientRuntimeAssetUrl, ...normalizedUrls];
}

export async function syncClientRuntimeAsset(deploymentRootDir) {
  const sourcePath = resolveClientRuntimeSourcePath();
  const targetPath = path.resolve(deploymentRootDir, DEFAULT_CLIENT_RUNTIME_ASSET_PATH);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  return targetPath;
}
