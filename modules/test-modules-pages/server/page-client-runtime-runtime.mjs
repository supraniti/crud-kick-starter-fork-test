import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeScriptUrlList } from "./distribution-shared-runtime.mjs";

const DEFAULT_CLIENT_RUNTIME_ASSET_URL = "/assets/client-runtime.global.js";
const DEFAULT_PAGE_PAYLOAD_DATASET = "page-payload";
const DEFAULT_PAGE_MEDIA_DATASET = "page-media";
const DEFAULT_POST_COMMENTS_DATASET = "post-comments";
const DEFAULT_PAGE_REMOTE_QUERY = "currentRemote";

function resolveAssetRelativePath(assetUrl) {
  return String(assetUrl || "")
    .split(/[?#]/, 1)[0]
    .replace(/^\/+/, "");
}

function resolveClientRuntimeSourcePath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../../../client-runtime/dist/client-runtime.global.js");
}

function createPagePayloadQueryDefinition() {
  return {
    resource: "page",
    query: "current",
    policy: "local-first",
    dataset: DEFAULT_PAGE_PAYLOAD_DATASET
  };
}

function createPagePayloadDatasetDefinition(payload = {}) {
  const syncPath = payload?.followUp?.pageByPathRoute ?? null;
  const definition = {
    dataset: DEFAULT_PAGE_PAYLOAD_DATASET,
    bootstrapMode: "inline-json-script",
    inlineScriptId: "page-data",
    recordMode: "single-item",
    versionPath: "resolvedAt",
    syncTokenPath: "page.id"
  };
  if (!syncPath) {
    return definition;
  }
  return {
    ...definition,
    remoteSync: {
      method: "GET",
      path: syncPath
    },
    responsePath: "payload",
    remoteValuePath: "payload",
    remoteVersionPath: "payload.resolvedAt",
    remoteSyncTokenPath: "payload.page.id"
  };
}

function createRemotePageQueryDefinition(payload = {}) {
  const syncPath = payload?.followUp?.pageByPathRoute ?? null;
  if (!syncPath) {
    return null;
  }
  return {
    resource: "page",
    query: DEFAULT_PAGE_REMOTE_QUERY,
    policy: "network-first",
    remote: {
      method: "GET",
      path: syncPath,
      responsePath: "payload"
    }
  };
}

function hasResolvedMediaItems(payload = {}) {
  return Array.isArray(payload?.media?.items) && payload.media.items.length > 0;
}

function createMediaQueryDefinitions() {
  return [
    {
      resource: "media",
      query: "list",
      policy: "local-first",
      dataset: DEFAULT_PAGE_MEDIA_DATASET
    },
    {
      resource: "media",
      query: "byId",
      policy: "local-first",
      dataset: DEFAULT_PAGE_MEDIA_DATASET
    }
  ];
}

function createMediaDatasetDefinition(payload = {}) {
  const syncPath = payload?.followUp?.pageByPathRoute ?? null;
  const definition = {
    dataset: DEFAULT_PAGE_MEDIA_DATASET,
    bootstrapMode: "inline-json-script",
    inlineScriptId: "page-data",
    valuePath: "media.items",
    recordMode: "array",
    versionPath: "resolvedAt",
    syncTokenPath: "page.id"
  };
  if (!syncPath) {
    return definition;
  }
  return {
    ...definition,
    remoteSync: {
      method: "GET",
      path: syncPath
    },
    responsePath: "payload",
    remoteValuePath: "payload.media.items",
    remoteVersionPath: "payload.resolvedAt",
    remoteSyncTokenPath: "payload.page.id"
  };
}

function readPrimaryRecord(payload = {}) {
  return payload?.data?.primary?.record && typeof payload.data.primary.record === "object"
    ? payload.data.primary.record
    : null;
}

function supportsCommentsRuntime(payload = {}) {
  const primaryRecord = readPrimaryRecord(payload);
  if (payload?.page?.primarySourceType !== "blog-post" || !primaryRecord) {
    return false;
  }
  if (primaryRecord.allowComments === false) {
    return false;
  }
  return primaryRecord.commentPolicy !== "closed";
}

function createCommentsRemoteDefinition() {
  return {
    method: "GET",
    path: "/api/reference/collections/blog-comments/items",
    queryParams: {
      postId: "context.primaryRecordId",
      status: "approved"
    }
  };
}

function createCommentsQueryDefinitions() {
  return [
    {
      resource: "comments",
      query: "byPost",
      policy: "network-first",
      dataset: DEFAULT_POST_COMMENTS_DATASET,
      remote: createCommentsRemoteDefinition(),
      remoteResult: {
        type: "collection",
        itemsPath: "items",
        totalPath: "meta.total"
      }
    },
    {
      resource: "comments",
      query: "byId",
      policy: "local-first",
      dataset: DEFAULT_POST_COMMENTS_DATASET
    }
  ];
}

function createCommentsDatasetDefinition() {
  return {
    dataset: DEFAULT_POST_COMMENTS_DATASET,
    remoteInstall: createCommentsRemoteDefinition(),
    remoteSync: createCommentsRemoteDefinition(),
    recordMode: "array",
    remoteValuePath: "items"
  };
}

function createCommentsActionDefinitions() {
  return [
    {
      action: "comments.submit",
      policy: "remote-with-local-update",
      markDatasetsDirty: [DEFAULT_POST_COMMENTS_DATASET],
      remote: {
        method: "POST",
        path: "/api/reference/collections/blog-comments/items",
        body: {
          postId: "context.primaryRecordId",
          parentCommentId: "payload.parentCommentId",
          authorDisplayName: "payload.authorDisplayName",
          authorEmail: "payload.authorEmail",
          body: "payload.body"
        }
      }
    }
  ];
}

function buildRuntimeRegistries(payload = {}) {
  const remotePageQuery = createRemotePageQueryDefinition(payload);
  const registries = {
    bootstrapDatasets: [DEFAULT_PAGE_PAYLOAD_DATASET],
    queries: [createPagePayloadQueryDefinition(), ...(remotePageQuery ? [remotePageQuery] : [])],
    actions: [],
    datasets: [createPagePayloadDatasetDefinition(payload)]
  };
  if (!hasResolvedMediaItems(payload)) {
    if (!supportsCommentsRuntime(payload)) {
      return registries;
    }
    return {
      bootstrapDatasets: registries.bootstrapDatasets,
      queries: [...registries.queries, ...createCommentsQueryDefinitions()],
      actions: createCommentsActionDefinitions(),
      datasets: [...registries.datasets, createCommentsDatasetDefinition()]
    };
  }
  const withMedia = {
    bootstrapDatasets: [...registries.bootstrapDatasets, DEFAULT_PAGE_MEDIA_DATASET],
    queries: [...registries.queries, ...createMediaQueryDefinitions()],
    actions: registries.actions,
    datasets: [...registries.datasets, createMediaDatasetDefinition(payload)]
  };
  if (!supportsCommentsRuntime(payload)) {
    return withMedia;
  }
  return {
    bootstrapDatasets: withMedia.bootstrapDatasets,
    queries: [...withMedia.queries, ...createCommentsQueryDefinitions()],
    actions: createCommentsActionDefinitions(),
    datasets: [...withMedia.datasets, createCommentsDatasetDefinition()]
  };
}

function resolveMediaRegistrySize(payload = {}) {
  return Array.isArray(payload?.media?.items) ? payload.media.items.length : 0;
}

function buildPageContext(payload = {}) {
  const primaryRecord = readPrimaryRecord(payload);
  return {
    pagePayloadScriptId: "page-data",
    pageId: payload?.page?.id ?? "",
    pagePath: payload?.page?.path ?? "",
    pageSyncPath: payload?.followUp?.pageByPathRoute ?? null,
    primaryRecordId: primaryRecord?.id ?? null,
    primarySourceType: payload?.page?.primarySourceType ?? "none",
    commentsEnabled: supportsCommentsRuntime(payload)
  };
}

function buildDeliveryContext(payload = {}) {
  const delivery = payload?.delivery && typeof payload.delivery === "object" ? payload.delivery : {};
  return {
    publicOrigin: delivery.publicOrigin ?? null,
    publicUrl: delivery.publicUrl ?? null,
    publicMediaBaseUrl: delivery.publicMediaBaseUrl ?? null,
    temporaryMediaBaseUrl: delivery.temporaryMediaBaseUrl ?? null
  };
}

function buildRuntimeContext(payload = {}) {
  return {
    ...buildPageContext(payload),
    ...buildDeliveryContext(payload),
    mediaRegistrySize: resolveMediaRegistrySize(payload)
  };
}

export function buildClientRuntimeContract(payload = {}) {
  const runtimeRegistries = buildRuntimeRegistries(payload);
  const publicOrigin = payload?.delivery?.publicOrigin ?? null;

  return {
    contractVersion: 1,
    assetUrl: DEFAULT_CLIENT_RUNTIME_ASSET_URL,
    bootstrapDatasets: runtimeRegistries.bootstrapDatasets,
    context: buildRuntimeContext(payload),
    remote: {
      ...(publicOrigin ? { baseUrl: publicOrigin } : {}),
      defaultHeaders: {
        Accept: "application/json"
      }
    },
    queries: runtimeRegistries.queries,
    actions: runtimeRegistries.actions,
    datasets: runtimeRegistries.datasets
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
  const clientRuntimeAssetUrl = payload?.runtime?.clientRuntime?.assetUrl ?? DEFAULT_CLIENT_RUNTIME_ASSET_URL;
  if (normalizedUrls.includes(clientRuntimeAssetUrl)) {
    return normalizedUrls;
  }
  return [clientRuntimeAssetUrl, ...normalizedUrls];
}

export async function syncClientRuntimeAsset(deploymentRootDir, assetUrl = DEFAULT_CLIENT_RUNTIME_ASSET_URL) {
  const sourcePath = resolveClientRuntimeSourcePath();
  const targetPath = path.resolve(deploymentRootDir, resolveAssetRelativePath(assetUrl));
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  return targetPath;
}
