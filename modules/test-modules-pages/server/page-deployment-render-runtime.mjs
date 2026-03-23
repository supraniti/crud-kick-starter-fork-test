import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_APP_MOUNT_TAG_NAME, DEPLOYMENT_ARTIFACTS_COLLECTION_ID, LAYOUTS_COLLECTION_ID, hasUnsafePathSegments, isPagePublished, isPerRecordDeploymentMode, normalizePagePath, normalizeScriptUrlList, normalizeTrimmedText, toTimestamp } from "./distribution-shared-runtime.mjs";
import { buildResolvedPagePath, listEligiblePrimarySourceRecords, resolvePageDeliveryPayload } from "./page-delivery-runtime.mjs";
import { resolvePageDeploymentRootDir } from "./page-deployment-root.mjs";
import { resolveBrowserDeliveryPayloadState } from "./browser-delivery-reference-runtime.mjs";
import { attachClientRuntimeContract, resolvePageRuntimeScriptUrls, syncClientRuntimeAsset } from "./page-client-runtime-runtime.mjs";
import { RUNTIME_PROBE_DOCUMENT_FILE_NAME } from "./page-runtime-probe-runtime.mjs";
import { attachApplicationTesterContract, resolvePageApplicationTesterScriptUrls, syncPageApplicationTesterAsset } from "./page-application-tester-runtime.mjs";
import { attachPageApplicationPayload, buildStaticReaderPayload } from "./page-application-view-runtime.mjs";
import { readPagesModuleSettings } from "./page-settings-runtime.mjs";

function escapeHtmlText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(value) {
  return escapeHtmlText(value).replace(/"/g, "&quot;");
}

function serializeJsonForScript(value) {
  return JSON.stringify(value ?? null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildMetaTag(attributeName, attributeValue, content) {
  return content
    ? `<meta ${attributeName}="${escapeHtmlAttribute(attributeValue)}" content="${escapeHtmlAttribute(content)}">`
    : null;
}

function resolvePageTitle(payload) {
  return payload?.head?.title ?? payload?.page?.title ?? "Untitled Page";
}

function resolvePageDescription(payload) {
  return payload?.head?.description ?? "";
}

function resolveOpenGraphField(payload, fieldId, fallback = "") {
  return payload?.head?.openGraph?.[fieldId] ?? fallback;
}

function resolveOpenGraphType(payload) {
  return payload?.page?.pageKind === "content-detail" ? "article" : "website";
}

function resolveHeadContent(payload) {
  const title = resolvePageTitle(payload);
  const description = resolvePageDescription(payload);
  return {
    title,
    description,
    canonicalUrl: payload?.head?.canonicalUrl ?? "",
    ogTitle: resolveOpenGraphField(payload, "title", title),
    ogDescription: resolveOpenGraphField(payload, "description", description),
    ogImageUrl: resolveOpenGraphField(payload, "imageUrl") ?? resolveOpenGraphField(payload, "imageMediaId"),
    ogType: resolveOpenGraphType(payload)
  };
}

function buildCanonicalHeadTags(canonicalUrl) {
  return canonicalUrl
    ? [
        `<link rel="canonical" href="${escapeHtmlAttribute(canonicalUrl)}">`,
        buildMetaTag("property", "og:url", canonicalUrl)
      ]
    : [];
}

function buildOpenGraphHeadTags({
  ogTitle,
  ogDescription,
  ogType,
  ogImageUrl
}) {
  return [
    buildMetaTag("property", "og:title", ogTitle),
    buildMetaTag("property", "og:description", ogDescription),
    buildMetaTag("property", "og:type", ogType),
    buildMetaTag("property", "og:image", ogImageUrl)
  ].filter(Boolean);
}

function buildHeadMarkup(payload) {
  const head = resolveHeadContent(payload);
  return [
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtmlText(head.title)}</title>`,
    buildMetaTag("name", "description", head.description),
    ...buildCanonicalHeadTags(head.canonicalUrl),
    ...buildOpenGraphHeadTags(head)
  ]
    .filter(Boolean)
    .join("\n    ");
}

function buildRuntimeScriptsMarkup(scriptUrls = []) {
  return normalizeScriptUrlList(scriptUrls)
    .map(
      (entry) =>
        `<script src="${escapeHtmlAttribute(entry)}" defer data-page-runtime-script="true"></script>`
    )
    .join("\n    ");
}

function buildWindowConfigMarkup(globalKey, configValue) {
  if (!globalKey || !configValue || typeof configValue !== "object") {
    return "";
  }
  return `window.${globalKey} = ${serializeJsonForScript(configValue)};`;
}

function renderStaticPageDocument({ payload, runtimePayload = payload, mountTagName, runtimeScriptUrls }) {
  const payloadScriptId = "page-data";
  const headMarkup = buildHeadMarkup(payload);
  const scriptMarkup = buildRuntimeScriptsMarkup(runtimeScriptUrls);
  const clientRuntimeConfigMarkup = buildWindowConfigMarkup(
    "__CRUD_CLIENT_RUNTIME_CONFIG__",
    runtimePayload?.runtime?.clientRuntime
  );
  const applicationTesterConfigMarkup = buildWindowConfigMarkup(
    "__CRUD_PAGE_APPLICATION_TESTER__",
    runtimePayload?.runtime?.applicationTester
  );
  const mountMarkup = [
    `<${mountTagName}`,
    ` id="page-app"`,
    ` data-page-id="${escapeHtmlAttribute(payload?.page?.id ?? "")}"`,
    ` data-page-path="${escapeHtmlAttribute(payload?.page?.path ?? "")}"`,
    ` data-page-payload-id="${payloadScriptId}"`,
    ` data-layout-key="${escapeHtmlAttribute(payload?.renderModel?.layoutKey ?? "")}"`,
    "></",
    mountTagName,
    ">"
  ].join("");

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "  <head>",
    `    ${headMarkup}`,
    "  </head>",
    "  <body>",
    "    <main id=\"page-shell\">",
    `      ${mountMarkup}`,
    "      <noscript>This page requires JavaScript to render its application shell.</noscript>",
    "    </main>",
    `    <script type="application/json" id="${payloadScriptId}">${serializeJsonForScript(payload)}</script>`,
    ...(clientRuntimeConfigMarkup ? [`    <script>${clientRuntimeConfigMarkup}</script>`] : []),
    ...(applicationTesterConfigMarkup ? [`    <script>${applicationTesterConfigMarkup}</script>`] : []),
    ...(scriptMarkup ? [`    ${scriptMarkup}`] : []),
    "  </body>",
    "</html>",
    ""
  ].join("\n");
}

function resolveArtifactRelativePath(pagePath) {
  const normalizedPath = normalizePagePath(pagePath);
  if (!normalizedPath || hasUnsafePathSegments(normalizedPath)) {
    throw new Error(`Cannot resolve deployment artifact for unsafe path '${pagePath}'`);
  }
  if (normalizedPath === "/") {
    return "index.html";
  }

  const segments = normalizedPath
    .split("/")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return [...segments, "index.html"].join("/");
}

function resolveArtifactAbsolutePath(rootDir, artifactRelativePath) {
  return path.resolve(rootDir, ...artifactRelativePath.split("/"));
}

function resolveRuntimeProbeDocumentRelativePath(artifactRelativePath) {
  const normalizedPath = normalizeTrimmedText(artifactRelativePath);
  if (!normalizedPath) {
    throw new Error("Cannot resolve runtime probe document path without an artifact path");
  }
  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    return RUNTIME_PROBE_DOCUMENT_FILE_NAME;
  }
  segments.pop();
  return [...segments, RUNTIME_PROBE_DOCUMENT_FILE_NAME].join("/");
}

function readRuntimeProbePrimaryRecord(payload = {}) {
  const record = payload?.data?.primary?.record;
  return record && typeof record === "object" ? record : null;
}

function readRuntimeProbeDocumentId(record = null) {
  if (!record || typeof record !== "object") {
    return null;
  }
  return normalizeTrimmedText(record.slug) ?? normalizeTrimmedText(record.id) ?? null;
}

function buildRuntimeProbeDocumentPayload(payload = {}) {
  const primaryRecord = readRuntimeProbePrimaryRecord(payload);
  return {
    ok: true,
    pagePath: normalizeTrimmedText(payload?.page?.path) ?? "/",
    primarySourceType: normalizeTrimmedText(payload?.page?.primarySourceType) ?? null,
    documentId: readRuntimeProbeDocumentId(primaryRecord),
    document: primaryRecord,
    publishedAt: toTimestamp()
  };
}

async function removeEmptyParentDirectories(rootDir, artifactAbsolutePath) {
  let currentDir = path.dirname(artifactAbsolutePath);
  const normalizedRootDir = path.resolve(rootDir);

  while (currentDir.startsWith(normalizedRootDir) && currentDir !== normalizedRootDir) {
    try {
      const entries = await fs.readdir(currentDir);
      if (entries.length > 0) {
        return;
      }
      await fs.rmdir(currentDir);
      currentDir = path.dirname(currentDir);
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ENOTEMPTY") {
        return;
      }
      throw error;
    }
  }
}

async function removeArtifactIfPresent(rootDir, artifactRelativePath) {
  const normalizedRelativePath = normalizeTrimmedText(artifactRelativePath);
  if (!normalizedRelativePath) {
    return;
  }

  const removablePaths = [
    normalizedRelativePath,
    resolveRuntimeProbeDocumentRelativePath(normalizedRelativePath)
  ];

  for (const relativePath of removablePaths) {
    const artifactAbsolutePath = resolveArtifactAbsolutePath(rootDir, relativePath);
    try {
      await fs.unlink(artifactAbsolutePath);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
    await removeEmptyParentDirectories(rootDir, artifactAbsolutePath);
  }
}

async function artifactExists(rootDir, artifactRelativePath) {
  const normalizedPath = normalizeTrimmedText(artifactRelativePath);
  if (!normalizedPath) {
    return false;
  }

  try {
    await fs.access(resolveArtifactAbsolutePath(rootDir, normalizedPath));
    return true;
  } catch {
    return false;
  }
}

function resolveKnownArtifactPath(page = {}) {
  const source = page && typeof page === "object" ? page : {};
  const storedPath = normalizeTrimmedText(source.deploymentArtifactPath);
  if (storedPath) {
    return storedPath;
  }

  const normalizedPath = normalizeTrimmedText(source.path);
  if (!normalizedPath || hasUnsafePathSegments(normalizedPath)) {
    return null;
  }

  try {
    return resolveArtifactRelativePath(normalizedPath);
  } catch {
    return null;
  }
}

function hashValue(value) {
  return crypto
    .createHash("sha1")
    .update(typeof value === "string" ? value : JSON.stringify(value ?? null))
    .digest("hex");
}

function buildPageVersionToken(page = {}) {
  const {
    deploymentArtifactPath,
    deploymentStatus,
    deploymentTargetCount,
    deploymentSyncedCount,
    deploymentStaleCount,
    deploymentMissingCount,
    deploymentSyncedOn,
    deploymentLastRunOn,
    ...versionablePage
  } = page ?? {};
  return hashValue(versionablePage);
}

function buildRecordVersionToken(record = null) {
  if (!record || typeof record !== "object") {
    return "";
  }
  return hashValue(record);
}

function buildSettingsVersionToken(settings = {}) {
  return hashValue({
    appMountTagName: settings.appMountTagName ?? DEFAULT_APP_MOUNT_TAG_NAME,
    browserDeliveryState: settings.browserDeliveryState ?? null
  });
}

function buildLayoutVersionToken(page, layout = null) {
  if (layout && typeof layout === "object") {
    return hashValue(layout);
  }

  const layoutKey = normalizeTrimmedText(page?.layoutKey);
  const layoutId = normalizeTrimmedText(page?.layoutId);
  const layoutModel = page?.layoutModel ?? null;

  if (!layoutKey && !layoutId && layoutModel === null) {
    return "";
  }

  return hashValue({
    layoutId: layoutId || null,
    layoutKey: layoutKey || null,
    layoutModel
  });
}

function readSourceLabel(record = {}) {
  const source = record && typeof record === "object" ? record : {};
  return (
    source.title ??
    source.displayName ??
    source.name ??
    source.slug ??
    source.path ??
    source.id ??
    "Unknown source"
  );
}

function normalizeTimestampCandidates(values = []) {
  return values
    .map((entry) => normalizeTrimmedText(entry))
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
}

function pickLatestTimestamp(values = []) {
  return normalizeTimestampCandidates(values)[0] ?? null;
}

function buildArtifactBody({
  existingArtifact = null,
  page,
  sourceRecord,
  resolvedPath,
  artifactRelativePath,
  status,
  staleReasonSummary = null,
  pageVersionToken,
  sourceVersionToken,
  layoutVersionToken,
  settingsVersionToken,
  payloadHash = null,
  htmlHash = null,
  lastSyncedOn = null,
  lastEvaluatedOn,
  lastErrorMessage = null
}) {
  const timestamp = lastEvaluatedOn ?? toTimestamp();
  return {
    pageId: page.id,
    sourceType: page.primarySourceType,
    sourceItemId: sourceRecord.id,
    sourceLabel: readSourceLabel(sourceRecord),
    resolvedPath: normalizePagePath(resolvedPath),
    artifactRelativePath: normalizeTrimmedText(artifactRelativePath),
    status,
    staleReasonSummary: normalizeTrimmedText(staleReasonSummary),
    pageVersionToken: normalizeTrimmedText(pageVersionToken),
    sourceVersionToken: normalizeTrimmedText(sourceVersionToken),
    layoutVersionToken: normalizeTrimmedText(layoutVersionToken),
    settingsVersionToken: normalizeTrimmedText(settingsVersionToken),
    payloadHash: normalizeTrimmedText(payloadHash),
    htmlHash: normalizeTrimmedText(htmlHash),
    lastSyncedOn: normalizeTrimmedText(lastSyncedOn),
    lastEvaluatedOn: normalizeTrimmedText(lastEvaluatedOn) ?? timestamp,
    lastErrorMessage: normalizeTrimmedText(lastErrorMessage),
    createdOn: existingArtifact?.createdOn ?? timestamp,
    updatedOn: timestamp
  };
}

async function listArtifactRecords(artifactHandler, pageId) {
  if (!artifactHandler || typeof artifactHandler.list !== "function") {
    return [];
  }
  const payload = await artifactHandler.list({
    limit: 5000,
    offset: 0
  });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.filter((item) => item?.pageId === pageId);
}

async function findArtifactIndex(artifactHandler, artifactId) {
  if (!artifactHandler || !artifactId) {
    return -1;
  }
  if (typeof artifactHandler.findIndex === "function") {
    return artifactHandler.findIndex(artifactId);
  }

  const payload = await artifactHandler.list({
    limit: 5000,
    offset: 0
  });
  return (Array.isArray(payload?.items) ? payload.items : []).findIndex(
    (item) => item?.id === artifactId
  );
}

async function deleteArtifactRecord(artifactHandler, artifact) {
  if (!artifactHandler || !artifact?.id) {
    return;
  }
  const index = await findArtifactIndex(artifactHandler, artifact.id);
  if (index < 0) {
    return;
  }
  await artifactHandler.removeByIndex(index, artifact.id);
}

async function upsertArtifactRecord(artifactHandler, body, existingArtifact = null) {
  if (!artifactHandler) {
    return null;
  }

  if (existingArtifact) {
    const result = await artifactHandler.update({
      body,
      value: body,
      item: existingArtifact
    });
    return result?.item ?? null;
  }

  const result = await artifactHandler.create({
    value: body
  });
  return result?.item ?? null;
}

async function persistDeploymentMetadata(handler, page, artifactPath) {
  const nextArtifactPath = normalizeTrimmedText(artifactPath) ?? null;
  const nextSyncedOn = nextArtifactPath ? toTimestamp() : null;
  if (
    page?.deploymentArtifactPath === nextArtifactPath &&
    page?.deploymentSyncedOn === nextSyncedOn
  ) {
    return;
  }

  await handler.update({
    body: {
      deploymentArtifactPath: nextArtifactPath,
      deploymentSyncedOn: nextSyncedOn
    },
    value: {
      deploymentArtifactPath: nextArtifactPath,
      deploymentSyncedOn: nextSyncedOn
    },
    item: page
  });
}

function hasPayloadDeliveryMetadata(payload) {
  return (
    payload?.delivery &&
    typeof payload.delivery === "object" &&
    Object.keys(payload.delivery).length > 0
  );
}

function buildBrowserDeliveryPayload(browserDelivery) {
  return {
    accessMode: browserDelivery.accessMode,
    dnsMode: browserDelivery.dnsMode,
    applicationApiOrigin: browserDelivery.applicationApiOrigin ?? null,
    firebaseWebApp: browserDelivery.firebaseWebApp ?? null,
    publicOrigin: browserDelivery.publicOrigin,
    publicUrl: browserDelivery.publicUrl,
    publicMediaBaseUrl: browserDelivery.publicMediaBaseUrl,
    temporaryDeploymentBaseUrl: browserDelivery.temporaryDeploymentBaseUrl,
    temporaryMediaBaseUrl: browserDelivery.temporaryMediaBaseUrl,
    temporaryAccess: browserDelivery.temporaryAccess ?? null
  };
}

function buildClientRuntimeBrowserContext(payload, browserDelivery) {
  return {
    ...(payload?.runtime?.clientRuntime?.context ?? {}),
    publicOrigin: browserDelivery.publicOrigin,
    publicUrl: browserDelivery.publicUrl,
    publicMediaBaseUrl: browserDelivery.publicMediaBaseUrl
  };
}

async function applyFallbackBrowserDeliveryPayload(payload, settings, page, artifactRelativePath) {
  if (hasPayloadDeliveryMetadata(payload)) {
    return payload;
  }

  const browserDelivery = await resolveBrowserDeliveryPayloadState({
    browserDeliveryState: settings.browserDeliveryState,
    pagePath: payload?.page?.path ?? page.path,
    artifactRelativePath
  });
  if (!browserDelivery) {
    return payload;
  }

  const nextPayload = {
    ...payload,
    delivery: {
      ...(payload?.delivery && typeof payload.delivery === "object" ? payload.delivery : {}),
      ...buildBrowserDeliveryPayload(browserDelivery)
    },
    runtime: {
      ...(payload?.runtime && typeof payload.runtime === "object" ? payload.runtime : {}),
      clientRuntime: {
        ...payload?.runtime?.clientRuntime,
        context: buildClientRuntimeBrowserContext(payload, browserDelivery)
      }
    }
  };

  if (browserDelivery.publicUrl) {
    nextPayload.head = {
      ...(nextPayload.head && typeof nextPayload.head === "object" ? nextPayload.head : {}),
      canonicalUrl: browserDelivery.publicUrl
    };
  }
  return nextPayload;
}

async function writeArtifactDocument({
  page,
  sourceRecord = null,
  artifactRelativePath,
  collectionHandlerRegistry,
  settings,
  resolveSettingsRepository = null,
  settingsDefinition = null
}) {
  const deliveryPayload = await resolvePageDeliveryPayload({
    collectionHandlerRegistry,
    page,
    preview: false,
    sourceRecord,
    resolveSettingsRepository,
    settingsDefinition
  });
  const browserAwarePayload = await applyFallbackBrowserDeliveryPayload(
    deliveryPayload,
    settings,
    page,
    artifactRelativePath
  );
  const applicationAwarePayload = await attachPageApplicationPayload(browserAwarePayload, {
    collectionHandlerRegistry
  });
  const payload = await attachApplicationTesterContract(
    attachClientRuntimeContract(applicationAwarePayload),
    {
      collectionHandlerRegistry,
      resolveSettingsRepository
    }
  );
  await syncClientRuntimeAsset(resolvePageDeploymentRootDir());
  await syncPageApplicationTesterAsset(resolvePageDeploymentRootDir());
  const staticPayload = buildStaticReaderPayload(payload);
  const htmlDocument = renderStaticPageDocument({
    payload: staticPayload,
    runtimePayload: payload,
    mountTagName: settings.appMountTagName,
    runtimeScriptUrls: resolvePageApplicationTesterScriptUrls(
      payload,
      resolvePageRuntimeScriptUrls(payload, page.runtimeScriptUrls)
    )
  });
  const artifactAbsolutePath = resolveArtifactAbsolutePath(
    resolvePageDeploymentRootDir(),
    artifactRelativePath
  );
  const probeDocumentRelativePath = resolveRuntimeProbeDocumentRelativePath(artifactRelativePath);
  const probeDocumentAbsolutePath = resolveArtifactAbsolutePath(
    resolvePageDeploymentRootDir(),
    probeDocumentRelativePath
  );
  await fs.mkdir(path.dirname(artifactAbsolutePath), { recursive: true });
  await fs.writeFile(artifactAbsolutePath, htmlDocument, "utf8");
  await fs.writeFile(
    probeDocumentAbsolutePath,
    JSON.stringify(buildRuntimeProbeDocumentPayload(payload), null, 2),
    "utf8"
  );
  return {
    payload,
    htmlDocument
  };
}

export {
  artifactExists,
  buildArtifactBody,
  buildLayoutVersionToken,
  buildPageVersionToken,
  buildRecordVersionToken,
  buildSettingsVersionToken,
  deleteArtifactRecord,
  hashValue,
  listArtifactRecords,
  persistDeploymentMetadata,
  pickLatestTimestamp,
  readPagesModuleSettings,
  readSourceLabel,
  removeArtifactIfPresent,
  resolveArtifactRelativePath,
  resolveKnownArtifactPath,
  upsertArtifactRecord,
  writeArtifactDocument
};
