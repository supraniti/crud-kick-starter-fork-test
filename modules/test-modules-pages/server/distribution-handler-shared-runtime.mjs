import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  DATA_SOURCE_KIND_SET,
  buildDefaultLayoutModel,
  buildDefaultRenderPolicy,
  cloneJsonValue,
  normalizeHttpCode,
  normalizeOptionalText,
  normalizePageKind,
  normalizePagePath,
  normalizePageStatus,
  normalizePositiveInteger,
  normalizePrimarySourceType,
  normalizeRedirectStatus,
  normalizeScriptUrlList,
  normalizeSortDirection,
  normalizeSortKey,
  normalizeSourcePath,
  toTimestamp
} from "./distribution-shared-runtime.mjs";

export function buildConflict(code, message, fieldId) {
  return {
    code,
    message,
    fieldId
  };
}

export function mergeValidationResult(validation, conflicts) {
  if (!Array.isArray(conflicts) || conflicts.length === 0) {
    return validation;
  }

  return {
    ok: false,
    value: validation.value,
    errors: [...(validation.errors ?? []), ...conflicts]
  };
}

function pickInputValue(input, currentItem, fieldId, fallback = null) {
  return input?.[fieldId] ?? currentItem?.[fieldId] ?? fallback;
}

function normalizePrimarySource(inputSource, primarySourceType) {
  const source = inputSource && typeof inputSource === "object" ? inputSource : null;
  const normalizedType = normalizePrimarySourceType(source?.sourceType ?? primarySourceType);
  if (normalizedType === "none") {
    return null;
  }

  return {
    sourceType: normalizedType,
    itemId: normalizeOptionalText(source?.itemId),
    bindAs: normalizeOptionalText(source?.bindAs) ?? "primary"
  };
}

function normalizeDataSource(entry = {}, index = 0) {
  const kind = typeof entry.kind === "string" && DATA_SOURCE_KIND_SET.has(entry.kind)
    ? entry.kind
    : "record-by-id";

  return {
    key: normalizeOptionalText(entry.key) ?? `source-${index + 1}`,
    kind,
    sourceType: normalizePrimarySourceType(entry.sourceType, "blog-post"),
    itemId: normalizeOptionalText(entry.itemId),
    bindAs: normalizeOptionalText(entry.bindAs) ?? `source${index + 1}`,
    limit: normalizePositiveInteger(entry.limit, 12, {
      min: 1,
      max: 50
    }),
    sortKey: normalizeSortKey(entry.sortKey),
    sortDirection: normalizeSortDirection(entry.sortDirection)
  };
}

function normalizeDataSources(value) {
  return Array.isArray(value) ? value.map(normalizeDataSource) : [];
}

function normalizeRuntimeScriptEntries(value) {
  return normalizeScriptUrlList(value).map((url) => ({
    url
  }));
}

function normalizeLayoutModel(input = {}, pageKind = "standalone") {
  const defaults = buildDefaultLayoutModel({
    templateKey:
      pageKind === "content-detail"
        ? "content-detail"
        : pageKind === "listing"
          ? "listing"
          : pageKind === "profile"
            ? "profile"
            : "page-shell"
  });
  const nextValue = input && typeof input === "object" ? input : {};
  return {
    ...defaults,
    ...nextValue,
    ...buildDefaultLayoutModel(nextValue)
  };
}

function normalizeRenderPolicy(input = {}) {
  return buildDefaultRenderPolicy(input && typeof input === "object" ? input : {});
}

function resolvePublishedOn(status, currentItem, inputValue, timestamp) {
  const normalized = normalizeOptionalText(inputValue);
  const currentPublishedOn = normalizeOptionalText(currentItem?.publishedOn);
  if (status === "published") {
    return normalized ?? currentPublishedOn ?? timestamp;
  }
  if (status === "archived") {
    return normalized ?? currentPublishedOn ?? null;
  }
  return null;
}

export function buildPreparedPageValue(input = {}, currentItem = null) {
  const timestamp = toTimestamp();
  const pageKind = normalizePageKind(pickInputValue(input, currentItem, "pageKind", "standalone"));
  const primarySourceType = normalizePrimarySourceType(
    pickInputValue(input, currentItem, "primarySourceType", "none")
  );
  const status = normalizePageStatus(pickInputValue(input, currentItem, "status", "draft"));
  return {
    ...(currentItem ?? {}),
    ...input,
    title: normalizeOptionalText(pickInputValue(input, currentItem, "title")),
    pageKind,
    primarySourceType,
    path: normalizePagePath(pickInputValue(input, currentItem, "path", "")),
    layoutId: normalizeOptionalText(pickInputValue(input, currentItem, "layoutId")),
    layoutKey: normalizeOptionalText(pickInputValue(input, currentItem, "layoutKey")) ?? "page-shell",
    layoutModel: normalizeLayoutModel(pickInputValue(input, currentItem, "layoutModel"), pageKind),
    primarySource: normalizePrimarySource(
      pickInputValue(input, currentItem, "primarySource"),
      primarySourceType
    ),
    dataSources: normalizeDataSources(pickInputValue(input, currentItem, "dataSources", [])),
    runtimeScriptUrls: normalizeRuntimeScriptEntries(
      pickInputValue(input, currentItem, "runtimeScriptUrls", [])
    ),
    renderPolicy: normalizeRenderPolicy(pickInputValue(input, currentItem, "renderPolicy")),
    status,
    canonicalUrl: normalizeOptionalText(pickInputValue(input, currentItem, "canonicalUrl")),
    seoTitle: normalizeOptionalText(pickInputValue(input, currentItem, "seoTitle")),
    seoDescription: normalizeOptionalText(pickInputValue(input, currentItem, "seoDescription")),
    ogTitle: normalizeOptionalText(pickInputValue(input, currentItem, "ogTitle")),
    ogDescription: normalizeOptionalText(pickInputValue(input, currentItem, "ogDescription")),
    ogImageMediaId: normalizeOptionalText(pickInputValue(input, currentItem, "ogImageMediaId")),
    scheduledOn:
      status === "scheduled"
        ? normalizeOptionalText(pickInputValue(input, currentItem, "scheduledOn"))
        : null,
    publishedOn: resolvePublishedOn(
      status,
      currentItem,
      pickInputValue(input, currentItem, "publishedOn"),
      timestamp
    ),
    archivedOn:
      status === "archived"
        ? normalizeOptionalText(pickInputValue(input, currentItem, "archivedOn")) ?? timestamp
        : null,
    deploymentArtifactPath: normalizeOptionalText(
      pickInputValue(input, currentItem, "deploymentArtifactPath")
    ),
    deploymentSyncedOn: normalizeOptionalText(
      pickInputValue(input, currentItem, "deploymentSyncedOn")
    ),
    createdOn:
      currentItem?.createdOn ?? normalizeOptionalText(pickInputValue(input, currentItem, "createdOn")) ?? timestamp,
    updatedOn: timestamp
  };
}

export function buildPreparedRedirectValue(input = {}, currentItem = null) {
  const timestamp = toTimestamp();
  return {
    ...(currentItem ?? {}),
    ...input,
    sourcePath: normalizeSourcePath(pickInputValue(input, currentItem, "sourcePath", "")),
    targetPageId: normalizeOptionalText(pickInputValue(input, currentItem, "targetPageId")),
    targetUrl: normalizeOptionalText(pickInputValue(input, currentItem, "targetUrl")),
    httpCode: normalizeHttpCode(pickInputValue(input, currentItem, "httpCode", "301")),
    status: normalizeRedirectStatus(pickInputValue(input, currentItem, "status", "active")),
    reason: normalizeOptionalText(pickInputValue(input, currentItem, "reason")),
    createdOn:
      currentItem?.createdOn ?? normalizeOptionalText(pickInputValue(input, currentItem, "createdOn")) ?? timestamp,
    updatedOn: timestamp
  };
}

export async function listExistingItems(handler) {
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

export function buildPreparedPageUpdateBody(body, preparedValue) {
  return {
    ...body,
    title: preparedValue.title,
    pageKind: preparedValue.pageKind,
    primarySourceType: preparedValue.primarySourceType,
    path: preparedValue.path,
    layoutId: preparedValue.layoutId,
    layoutKey: preparedValue.layoutKey,
    layoutModel: cloneJsonValue(preparedValue.layoutModel),
    primarySource: cloneJsonValue(preparedValue.primarySource),
    dataSources: cloneJsonValue(preparedValue.dataSources),
    runtimeScriptUrls: [...preparedValue.runtimeScriptUrls],
    renderPolicy: cloneJsonValue(preparedValue.renderPolicy),
    status: preparedValue.status,
    canonicalUrl: preparedValue.canonicalUrl,
    seoTitle: preparedValue.seoTitle,
    seoDescription: preparedValue.seoDescription,
    ogTitle: preparedValue.ogTitle,
    ogDescription: preparedValue.ogDescription,
    ogImageMediaId: preparedValue.ogImageMediaId,
    scheduledOn: preparedValue.scheduledOn,
    publishedOn: preparedValue.publishedOn,
    archivedOn: preparedValue.archivedOn,
    deploymentArtifactPath: preparedValue.deploymentArtifactPath,
    deploymentSyncedOn: preparedValue.deploymentSyncedOn,
    createdOn: preparedValue.createdOn,
    updatedOn: preparedValue.updatedOn
  };
}

export function buildPreparedRedirectUpdateBody(body, preparedValue) {
  return {
    ...body,
    sourcePath: preparedValue.sourcePath,
    targetPageId: preparedValue.targetPageId,
    targetUrl: preparedValue.targetUrl,
    httpCode: preparedValue.httpCode,
    status: preparedValue.status,
    reason: preparedValue.reason,
    createdOn: preparedValue.createdOn,
    updatedOn: preparedValue.updatedOn
  };
}

export async function validatePrepared({ handler, preparedBody, reply }) {
  const validation = await handler.validateInput(preparedBody, {
    partial: true
  });
  if (validation.ok) {
    return null;
  }

  return {
    ok: false,
    statusCode: 400,
    payload: badRequestWithConflicts(reply, validation.errors)
  };
}
