import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIME_PROBE_DOCUMENT_FILE_NAME } from "./page-runtime-probe-runtime.mjs";
import { resolvePublishedFirestoreDescriptor } from "./page-firestore-publication-runtime.mjs";

const DEFAULT_APPLICATION_TESTER_ASSET_PATH = "assets/page-application-tester.global.js";
const DEFAULT_APPLICATION_TESTER_SUPPORT_ASSET_PATH = "assets/page-application-tester-support.global.js";
const DEFAULT_APPLICATION_TESTER_DATASET = "page-application-tester-published-document";
const DEFAULT_APPLICATION_TESTER_RESOURCE = "pageApplicationTester";
const DEFAULT_REMOTE_QUERY = "publishedDocumentSnapshot";
const DEFAULT_FIRESTORE_QUERY = "firestorePublishedDocument";
const DEFAULT_LOCAL_QUERY = "installedPublishedDocument";
const DEFAULT_INSTALL_ACTION = "pageApplicationTester.installPublishedDocument";
const DEFAULT_SYNC_ACTION = "pageApplicationTester.syncPublishedDocument";
const DEFAULT_COMMENT_SUBMIT_ACTION = "pageApplicationTester.submitComment";
const DEFAULT_QUERY_PARAMS = ["appTester", "runtimeProbe"];
const DEFAULT_API_ORIGIN_QUERY_PARAMS = ["appApiOrigin", "apiOrigin"];
const DEFAULT_PUBLIC_PUBLISHED_DOCUMENT_API_PATH =
  "/api/reference/modules/test-modules-pages/public/published-document";
const DEFAULT_PUBLIC_COMMENTS_API_PATH =
  "/api/reference/modules/test-modules-pages/public/comments";

function countPathSegments(pagePath) {
  return String(pagePath || "")
    .split("/")
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

function buildRelativeAssetUrl(pagePath, assetPath) {
  const segmentCount = countPathSegments(pagePath);
  return `${"../".repeat(segmentCount)}${assetPath}`;
}

function resolveApplicationTesterSourcePath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../browser/page-application-tester.global.js");
}

function resolveApplicationTesterSupportSourcePath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../browser/page-application-tester-support.global.js");
}

function normalizeAbsoluteUrl(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildDocumentUrl(payload = {}) {
  const publicUrl = normalizeAbsoluteUrl(payload?.delivery?.publicUrl);
  if (publicUrl) {
    return new URL(`./${RUNTIME_PROBE_DOCUMENT_FILE_NAME}`, publicUrl).toString();
  }
  return `./${RUNTIME_PROBE_DOCUMENT_FILE_NAME}`;
}

function readPrimaryRecord(payload = {}) {
  const record = payload?.data?.primary?.record;
  return record && typeof record === "object" ? record : null;
}

function buildFeaturedMediaDescriptor(payload = {}) {
  const primaryRecord = readPrimaryRecord(payload);
  const featuredMedia = primaryRecord?.featuredMedia;
  if (featuredMedia?.preferredUrl) {
    return {
      preferredUrl: featuredMedia.preferredUrl,
      altText: featuredMedia.altText ?? featuredMedia.displayName ?? "Referenced image",
      displayName: featuredMedia.displayName ?? featuredMedia.altText ?? "Referenced image"
    };
  }
  const openGraphImage = payload?.head?.openGraph?.image;
  if (openGraphImage?.preferredUrl) {
    return {
      preferredUrl: openGraphImage.preferredUrl,
      altText: openGraphImage.altText ?? openGraphImage.displayName ?? "Referenced image",
      displayName: openGraphImage.displayName ?? openGraphImage.altText ?? "Referenced image"
    };
  }
  return null;
}

function buildSnapshotRemoteDefinition(documentUrl) {
  return {
    method: "GET",
    path: documentUrl,
    responsePath: "document"
  };
}

function buildFirestoreRemoteDefinition(firestore = null) {
  if (!firestore?.documentUrl) {
    return null;
  }
  return {
    method: "GET",
    path: firestore.documentUrl
  };
}

function buildRuntimeAugment(payload = {}, firestore = null) {
  const documentUrl = buildDocumentUrl(payload);
  return {
    queries: [
      {
        resource: DEFAULT_APPLICATION_TESTER_RESOURCE,
        query: DEFAULT_REMOTE_QUERY,
        policy: "remote-only",
        remote: buildSnapshotRemoteDefinition(documentUrl)
      },
      {
        resource: DEFAULT_APPLICATION_TESTER_RESOURCE,
        query: DEFAULT_LOCAL_QUERY,
        policy: "local-first",
        dataset: DEFAULT_APPLICATION_TESTER_DATASET
      }
    ],
    actions: [
      {
        action: DEFAULT_INSTALL_ACTION,
        policy: "local-only",
        local: {
          kind: "install-dataset",
          dataset: DEFAULT_APPLICATION_TESTER_DATASET
        }
      },
      {
        action: DEFAULT_SYNC_ACTION,
        policy: "local-only",
        local: {
          kind: "sync-dataset",
          dataset: DEFAULT_APPLICATION_TESTER_DATASET
        }
      }
    ],
    datasets: [
      {
        dataset: DEFAULT_APPLICATION_TESTER_DATASET,
        recordMode: "single-item",
        remoteInstall: buildSnapshotRemoteDefinition(documentUrl),
        remoteSync: buildSnapshotRemoteDefinition(documentUrl),
        remoteValuePath: "document",
        remoteVersionPath: "publishedAt",
        remoteSyncTokenPath: "documentId"
      }
    ]
  };
}

function supportsCommentSubmission(payload = {}) {
  const primaryRecord = readPrimaryRecord(payload);
  if (payload?.page?.primarySourceType !== "blog-post" || !primaryRecord) {
    return false;
  }
  if (primaryRecord.allowComments === false) {
    return false;
  }
  return primaryRecord.commentPolicy !== "closed";
}

export async function buildApplicationTesterContract(payload = {}, options = {}) {
  const publicOrigin = normalizeAbsoluteUrl(payload?.delivery?.publicOrigin);
  const pagePath = payload?.page?.path ?? "/";
  const primaryRecord = readPrimaryRecord(payload);
  const firestore = await resolvePublishedFirestoreDescriptor({
    collectionHandlerRegistry: options.collectionHandlerRegistry,
    resolveSettingsRepository: options.resolveSettingsRepository,
    payload
  });
  return {
    contractVersion: 1,
    assetUrl: publicOrigin
      ? `${publicOrigin.replace(/\/+$/, "")}/${DEFAULT_APPLICATION_TESTER_ASSET_PATH}`
      : buildRelativeAssetUrl(pagePath, DEFAULT_APPLICATION_TESTER_ASSET_PATH),
    enabledQueryParams: DEFAULT_QUERY_PARAMS,
    apiOriginQueryParams: DEFAULT_API_ORIGIN_QUERY_PARAMS,
    dataset: DEFAULT_APPLICATION_TESTER_DATASET,
    remoteQuery: {
      resource: DEFAULT_APPLICATION_TESTER_RESOURCE,
      query: DEFAULT_REMOTE_QUERY
    },
    firestoreQuery: firestore
      ? {
          resource: DEFAULT_APPLICATION_TESTER_RESOURCE,
          query: DEFAULT_FIRESTORE_QUERY
        }
      : null,
    localQuery: {
      resource: DEFAULT_APPLICATION_TESTER_RESOURCE,
      query: DEFAULT_LOCAL_QUERY
    },
    actions: {
      install: DEFAULT_INSTALL_ACTION,
      sync: DEFAULT_SYNC_ACTION,
      submitComment: supportsCommentSubmission(payload) ? DEFAULT_COMMENT_SUBMIT_ACTION : null
    },
    documentUrl: buildDocumentUrl(payload),
    pagePath,
    firestore,
    publicPublishedDocumentApiPath: DEFAULT_PUBLIC_PUBLISHED_DOCUMENT_API_PATH,
    publicCommentsApiPath: supportsCommentSubmission(payload) ? DEFAULT_PUBLIC_COMMENTS_API_PATH : null,
    primaryRecord: primaryRecord
      ? {
          id: primaryRecord.id ?? null,
          title: primaryRecord.title ?? null,
          slug: primaryRecord.slug ?? null
        }
      : null,
    featuredMedia: buildFeaturedMediaDescriptor(payload),
    flows: [
      "render-featured-image",
      "published-document-snapshot-read",
      ...(firestore ? ["public-app-firestore-read"] : []),
      "indexeddb-install-and-local-query",
      ...(supportsCommentSubmission(payload) ? ["public-app-comment-submit"] : [])
    ],
    runtimeAugment: buildRuntimeAugment(payload, firestore)
  };
}

export async function attachApplicationTesterContract(payload = {}, options = {}) {
  return {
    ...payload,
    runtime: {
      ...(payload?.runtime && typeof payload.runtime === "object" ? payload.runtime : {}),
      applicationTester: await buildApplicationTesterContract(payload, options)
    }
  };
}

export function resolvePageApplicationTesterScriptUrls(payload, runtimeScriptUrls = []) {
  const normalizedUrls = Array.isArray(runtimeScriptUrls)
    ? runtimeScriptUrls
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    : [];
  const applicationTesterSupportAssetUrl = payload?.delivery?.publicOrigin
    ? `${payload.delivery.publicOrigin.replace(/\/+$/, "")}/${DEFAULT_APPLICATION_TESTER_SUPPORT_ASSET_PATH}`
    : buildRelativeAssetUrl(payload?.page?.path ?? "/", DEFAULT_APPLICATION_TESTER_SUPPORT_ASSET_PATH);
  const applicationTesterAssetUrl =
    payload?.runtime?.applicationTester?.assetUrl
    ?? buildRelativeAssetUrl(payload?.page?.path ?? "/", DEFAULT_APPLICATION_TESTER_ASSET_PATH);
  const withSupportUrl = normalizedUrls.includes(applicationTesterSupportAssetUrl)
    ? normalizedUrls
    : [...normalizedUrls, applicationTesterSupportAssetUrl];
  return withSupportUrl.includes(applicationTesterAssetUrl)
    ? withSupportUrl
    : [...withSupportUrl, applicationTesterAssetUrl];
}

export async function syncPageApplicationTesterAsset(deploymentRootDir) {
  const sourcePath = resolveApplicationTesterSourcePath();
  const supportSourcePath = resolveApplicationTesterSupportSourcePath();
  const targetPath = path.resolve(deploymentRootDir, DEFAULT_APPLICATION_TESTER_ASSET_PATH);
  const supportTargetPath = path.resolve(
    deploymentRootDir,
    DEFAULT_APPLICATION_TESTER_SUPPORT_ASSET_PATH
  );
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(supportSourcePath, supportTargetPath);
  await fs.copyFile(sourcePath, targetPath);
  return {
    supportTargetPath,
    targetPath
  };
}
