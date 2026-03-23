import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeScriptUrlList, normalizeOptionalText } from "./distribution-shared-runtime.mjs";
import { appendRuntimeAssetVersion } from "./page-runtime-asset-version-runtime.mjs";

const DEFAULT_CLIENT_RUNTIME_ASSET_PATH = "assets/client-runtime.global.js";
const DEFAULT_READER_BOOTSTRAP_DATASET = "reader-page-bootstrap";
const DEFAULT_READER_DEFERRED_DATASET = "reader-page-deferred";
const DEFAULT_READER_PAGE_RESOURCE = "readerPage";
const DEFAULT_READER_DEFERRED_RESOURCE = "readerDeferred";
const DEFAULT_PUBLIC_READER_BOOTSTRAP_API_PATH =
  "/api/reference/modules/test-modules-pages/public/reader/bootstrap";
const DEFAULT_PUBLIC_READER_DEFERRED_API_PATH =
  "/api/reference/modules/test-modules-pages/public/reader/deferred";
const DEFAULT_DEPLOYED_READER_BOOTSTRAP_API_PATH = "/reader/bootstrap";
const DEFAULT_DEPLOYED_READER_DEFERRED_API_PATH = "/reader/deferred";

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

function createCollectionRemoteResult() {
  return {
    type: "collection",
    itemsPath: "items",
    totalPath: "total"
  };
}

function resolveReaderApiOrigin(payload = {}) {
  return normalizeOrigin(
    payload?.delivery?.applicationApiOrigin ?? payload?.delivery?.publicApplicationApiOrigin
  );
}

function buildReaderApiUrl(payload = {}, localPath, deployedPath) {
  const apiOrigin = resolveReaderApiOrigin(payload);
  if (apiOrigin) {
    return `${apiOrigin}${deployedPath}`;
  }
  return localPath;
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
    remote: {
      method: "GET",
      path: buildReaderApiUrl(
        payload,
        DEFAULT_PUBLIC_READER_BOOTSTRAP_API_PATH,
        DEFAULT_DEPLOYED_READER_BOOTSTRAP_API_PATH
      ),
      queryParams: {
        path: "params.path"
      }
    },
    remoteResult: createCollectionRemoteResult(),
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
    remote: {
      method: "GET",
      path: buildReaderApiUrl(
        payload,
        DEFAULT_PUBLIC_READER_DEFERRED_API_PATH,
        DEFAULT_DEPLOYED_READER_DEFERRED_API_PATH
      ),
      queryParams: {
        path: "params.path"
      }
    },
    remoteResult: createCollectionRemoteResult(),
    persist: {
      dataset: DEFAULT_READER_DEFERRED_DATASET,
      storageKeyPath: "path"
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

export function buildClientRuntimeContract(payload = {}) {
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
      createReaderDeferredByPathQueryDefinition(payload)
    ],
    actions: [],
    datasets: [
      createReaderBootstrapDatasetDefinition(),
      createReaderDeferredDatasetDefinition()
    ]
  };
}

export function attachClientRuntimeContract(payload = {}) {
  return {
    ...payload,
    runtime: {
      ...(payload?.runtime && typeof payload.runtime === "object" ? payload.runtime : {}),
      clientRuntime: buildClientRuntimeContract(payload)
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
