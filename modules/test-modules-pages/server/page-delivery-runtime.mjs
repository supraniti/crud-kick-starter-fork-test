import {
  AUTHORS_COLLECTION_ID,
  CATEGORIES_COLLECTION_ID,
  DATA_SOURCE_KIND_SET,
  LAYOUTS_COLLECTION_ID,
  MODULE_ID,
  POSTS_COLLECTION_ID,
  TAGS_COLLECTION_ID,
  buildDefaultPrimarySource,
  cloneJsonValue,
  isPerRecordDeploymentMode,
  isPagePublished,
  normalizeScriptUrlList,
  normalizeOptionalText,
  normalizePagePath,
  normalizePrimarySourceType,
  normalizeSortDirection,
  normalizeSortKey,
  resolveSourceCollectionId,
  toTimestamp
} from "./distribution-shared-runtime.mjs";
import { parseStoredLayoutDocument } from "../../test-modules-layouts/shared/layout-document.mjs";
import { resolveBrowserDeliveryPayloadState } from "./browser-delivery-reference-runtime.mjs";
import { attachClientRuntimeContract } from "./page-client-runtime-runtime.mjs";
import { attachResolvedMediaReferences } from "./page-media-reference-runtime.mjs";
import { readPagesModuleSettings } from "./page-settings-runtime.mjs";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createDependencyKey(collectionId, itemId = null) {
  return itemId ? `${collectionId}:${itemId}` : `${collectionId}:*`;
}

function escapePathTokenSegment(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function readDisplayLabel(item = {}) {
  const source = item && typeof item === "object" ? item : {};
  return (
    source.title ??
    source.displayName ??
    source.name ??
    source.label ??
    source.slug ??
    source.path ??
    source.id ??
    "Unknown item"
  );
}

function readDefaultDescription(item = {}) {
  const source = item && typeof item === "object" ? item : {};
  return source.excerpt ?? source.bio ?? source.description ?? null;
}

function readDefaultOgImage(item = {}) {
  const source = item && typeof item === "object" ? item : {};
  return source.ogImageMediaId ?? source.featuredMediaId ?? source.avatarMediaId ?? null;
}

function readDefaultSeoTitle(item = {}) {
  const source = item && typeof item === "object" ? item : {};
  return source.seoTitle ?? source.title ?? source.displayName ?? source.name ?? null;
}

function readDefaultOgTitle(item = {}) {
  return item.ogTitle ?? readDefaultSeoTitle(item);
}

function readDefaultSeoDescription(item = {}) {
  return item.seoDescription ?? readDefaultDescription(item);
}

function readDefaultOgDescription(item = {}) {
  return item.ogDescription ?? readDefaultSeoDescription(item);
}

async function listHandlerItems(handler, query = {}) {
  if (!handler || typeof handler.list !== "function") {
    return [];
  }
  const payload = await handler.list({
    limit: 5000,
    offset: 0,
    ...query
  });
  return toArray(payload?.items);
}

async function findHandlerItem(handler, itemId) {
  if (!handler || typeof handler.findById !== "function") {
    return null;
  }
  return handler.findById(itemId);
}

function isPublishedPostRecord(record = {}) {
  return record?.status === "published";
}

function isPublicTaxonomyRecord(record = {}) {
  return record?.visibility !== "internal";
}

function resolveSourceDescriptorItemId(page = {}, sourceRecord = null) {
  if (sourceRecord?.id) {
    return sourceRecord.id;
  }
  return page.primarySource?.itemId ?? null;
}

function buildPrimarySourceDescriptor(page = {}, sourceRecord = null) {
  const fallback = buildDefaultPrimarySource(page.primarySourceType, null);
  const source = page.primarySource && typeof page.primarySource === "object" ? page.primarySource : fallback;
  if (!source) {
    return null;
  }

  const sourceType = normalizePrimarySourceType(source.sourceType ?? page.primarySourceType);
  if (sourceType === "none") {
    return null;
  }

  return {
    kind: "record-by-id",
    sourceType,
    itemId: normalizeOptionalText(resolveSourceDescriptorItemId(page, sourceRecord)),
    bindAs: normalizeOptionalText(source.bindAs) ?? "primary"
  };
}

function resolvePathPattern(page = {}) {
  return normalizeOptionalText(page.pathPattern);
}

function resolveArtifactRelativePathFromResolvedPath(pagePath) {
  const normalizedPath = normalizePagePath(pagePath);
  if (!normalizedPath || normalizedPath === "/") {
    return "index.html";
  }
  return [
    ...normalizedPath
      .split("/")
      .map((entry) => entry.trim())
      .filter(Boolean),
    "index.html"
  ].join("/");
}

export function buildResolvedPagePath(page = {}, sourceRecord = null) {
  if (!isPerRecordDeploymentMode(page.deploymentMode)) {
    return normalizePagePath(page.path);
  }

  const pattern = resolvePathPattern(page);
  if (!pattern) {
    return normalizePagePath(page.path);
  }

  const path = pattern.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_, tokenName) => {
    if (tokenName === "slug") {
      return escapePathTokenSegment(sourceRecord?.slug ?? "");
    }
    if (tokenName === "id") {
      return escapePathTokenSegment(sourceRecord?.id ?? "");
    }
    return "";
  });
  return normalizePagePath(path);
}

function normalizeDataSource(entry = {}, index = 0) {
  const kind = typeof entry.kind === "string" && DATA_SOURCE_KIND_SET.has(entry.kind)
    ? entry.kind
    : "record-by-id";
  const sourceType = normalizePrimarySourceType(entry.sourceType);
  return {
    key: normalizeOptionalText(entry.key) ?? `source-${index + 1}`,
    kind,
    sourceType,
    itemId: normalizeOptionalText(entry.itemId),
    bindAs: normalizeOptionalText(entry.bindAs) ?? `source${index + 1}`,
    limit: Number.isFinite(Number(entry.limit)) ? Math.max(1, Math.min(50, Number(entry.limit))) : 12,
    sortKey: normalizeSortKey(entry.sortKey),
    sortDirection: normalizeSortDirection(entry.sortDirection)
  };
}

function buildDataSourceDescriptors(page = {}) {
  return toArray(page.dataSources).map(normalizeDataSource);
}

async function resolveSingleRecord(collectionHandlerRegistry, descriptor) {
  const collectionId = resolveSourceCollectionId(descriptor.sourceType);
  if (!collectionId) {
    return {
      descriptor,
      dependencyKeys: [],
      value: null
    };
  }

  const handler = collectionHandlerRegistry.get(collectionId);
  const item = descriptor.itemId ? await findHandlerItem(handler, descriptor.itemId) : null;
  return {
    descriptor,
    dependencyKeys: descriptor.itemId ? [createDependencyKey(collectionId, descriptor.itemId)] : [],
    value: item
      ? {
          collectionId,
          itemId: item.id,
          label: readDisplayLabel(item),
          record: cloneJsonValue(item)
        }
      : null
  };
}

export async function listEligiblePrimarySourceRecords(collectionHandlerRegistry, page = {}) {
  if (!isPerRecordDeploymentMode(page.deploymentMode)) {
    return [];
  }

  const sourceType = normalizePrimarySourceType(page.primarySourceType);
  if (sourceType === "blog-post") {
    const postsHandler = collectionHandlerRegistry.get(POSTS_COLLECTION_ID);
    const posts = await listHandlerItems(postsHandler);
    return posts.filter(isPublishedPostRecord);
  }
  if (sourceType === "blog-category") {
    const categoriesHandler = collectionHandlerRegistry.get(CATEGORIES_COLLECTION_ID);
    const categories = await listHandlerItems(categoriesHandler);
    return categories.filter(isPublicTaxonomyRecord);
  }
  return [];
}

async function findPublishedSinglePageByPath(pagesHandler, normalizedPath) {
  const pages = await listHandlerItems(pagesHandler, {
    path: normalizedPath
  });
  return pages.find((entry) => normalizePagePath(entry.path) === normalizedPath) ?? null;
}

async function findPublishedPerRecordPageByPath(collectionHandlerRegistry, pagesHandler, normalizedPath) {
  const pages = await listHandlerItems(pagesHandler);
  const publishedPerRecordPages = pages.filter(
    (entry) => isPagePublished(entry.status) && isPerRecordDeploymentMode(entry.deploymentMode)
  );

  for (const page of publishedPerRecordPages) {
    const records = await listEligiblePrimarySourceRecords(collectionHandlerRegistry, page);
    const matchingRecord = records.find(
      (record) => buildResolvedPagePath(page, record) === normalizedPath
    );
    if (matchingRecord) {
      return {
        page,
        sourceRecord: matchingRecord
      };
    }
  }
  return null;
}

async function resolveRequestedSourceRecord({
  collectionHandlerRegistry,
  page,
  requestedSourceItemId = null
}) {
  if (!isPerRecordDeploymentMode(page.deploymentMode)) {
    return null;
  }

  const eligibleRecords = await listEligiblePrimarySourceRecords(collectionHandlerRegistry, page);
  if (eligibleRecords.length === 0) {
    return null;
  }

  if (requestedSourceItemId) {
    return eligibleRecords.find((entry) => entry.id === requestedSourceItemId) ?? null;
  }

  return eligibleRecords[0] ?? null;
}

function matchPostDescriptor(post, descriptor) {
  if (descriptor.kind === "posts-by-author") {
    return post.primaryAuthorId === descriptor.itemId || toArray(post.coAuthorIds).includes(descriptor.itemId);
  }
  if (descriptor.kind === "posts-by-category") {
    return toArray(post.categoryIds).includes(descriptor.itemId);
  }
  if (descriptor.kind === "posts-by-tag") {
    return toArray(post.tagIds).includes(descriptor.itemId);
  }
  return false;
}

function compareListingValues(left, right, sortKey, direction) {
  const leftValue = left?.[sortKey] ?? "";
  const rightValue = right?.[sortKey] ?? "";
  const multiplier = direction === "asc" ? 1 : -1;
  return String(leftValue).localeCompare(String(rightValue)) * multiplier;
}

async function resolveListing(collectionHandlerRegistry, descriptor) {
  const postsHandler = collectionHandlerRegistry.get(POSTS_COLLECTION_ID);
  const posts = await listHandlerItems(postsHandler);
  const items = posts
    .filter((post) => matchPostDescriptor(post, descriptor))
    .sort((left, right) => compareListingValues(left, right, descriptor.sortKey, descriptor.sortDirection))
    .slice(0, descriptor.limit)
    .map((post) => ({
      collectionId: POSTS_COLLECTION_ID,
      itemId: post.id,
      label: readDisplayLabel(post),
      record: cloneJsonValue(post)
    }));

  const dependencyKeys = [createDependencyKey(POSTS_COLLECTION_ID)];
  if (descriptor.itemId) {
    const ownerCollectionId = resolveSourceCollectionId(descriptor.sourceType);
    if (ownerCollectionId) {
      dependencyKeys.push(createDependencyKey(ownerCollectionId, descriptor.itemId));
    }
  }

  return {
    descriptor,
    dependencyKeys,
    value: items
  };
}

async function resolveDescriptor(collectionHandlerRegistry, descriptor) {
  if (descriptor.kind === "record-by-id") {
    return resolveSingleRecord(collectionHandlerRegistry, descriptor);
  }
  return resolveListing(collectionHandlerRegistry, descriptor);
}

function mergeDependencyKeys(entries = []) {
  return [...new Set(entries.flatMap((entry) => toArray(entry.dependencyKeys)))].sort();
}

function buildResolvedDataMap(primarySource, resolvedPrimary, resolvedSources) {
  const data = {};
  if (primarySource?.bindAs) {
    data[primarySource.bindAs] = resolvedPrimary?.value ?? null;
  }
  for (const source of resolvedSources) {
    data[source.descriptor.bindAs] = source.value;
  }
  return data;
}

function buildHeadModel(page, primaryRecord = null) {
  return {
    title: page.seoTitle ?? readDefaultSeoTitle(primaryRecord) ?? page.title,
    description: page.seoDescription ?? readDefaultSeoDescription(primaryRecord),
    canonicalUrl: page.canonicalUrl ?? null,
    openGraph: {
      title: page.ogTitle ?? readDefaultOgTitle(primaryRecord) ?? page.title,
      description: page.ogDescription ?? readDefaultOgDescription(primaryRecord),
      imageMediaId: page.ogImageMediaId ?? readDefaultOgImage(primaryRecord)
    }
  };
}

async function buildRenderModel(page = {}, collectionHandlerRegistry) {
  const layoutsHandler = collectionHandlerRegistry.get(LAYOUTS_COLLECTION_ID);
  const layout = page.layoutId && layoutsHandler && typeof layoutsHandler.findById === "function"
    ? await layoutsHandler.findById(page.layoutId)
    : null;
  const layoutDocument = layout
    ? (layout.layoutDocument ?? parseStoredLayoutDocument(layout.layoutDocumentJson))
    : null;

  return {
    layoutId: page.layoutId ?? null,
    layoutKey: layout?.layoutKey ?? page.layoutKey,
    pageKind: page.pageKind,
    layoutModel: cloneJsonValue(page.layoutModel ?? {}),
    layoutDocument: cloneJsonValue(layoutDocument),
    bindings: {
      hero: page.layoutModel?.heroBinding ?? "primary",
      body: page.layoutModel?.bodyBinding ?? "primary",
      supporting: page.layoutModel?.supportingBinding ?? "supporting"
    }
  };
}

function buildResolvedSourceSummaries(primarySource, resolvedPrimary, resolvedSources) {
  const summaries = [];
  if (primarySource) {
    summaries.push({
      bindAs: primarySource.bindAs,
      kind: primarySource.kind,
      sourceType: primarySource.sourceType,
      itemId: primarySource.itemId,
      resolved: resolvedPrimary?.value !== null
    });
  }
  for (const source of resolvedSources) {
    summaries.push({
      bindAs: source.descriptor.bindAs,
      kind: source.descriptor.kind,
      sourceType: source.descriptor.sourceType,
      itemId: source.descriptor.itemId,
      resolved: source.value !== null && !(Array.isArray(source.value) && source.value.length === 0)
    });
  }
  return summaries;
}

function buildPageSummary(page = {}, resolvedPath = null) {
  return {
    id: page.id,
    title: page.title,
    path: normalizePagePath(resolvedPath ?? page.path),
    pathPattern: resolvePathPattern(page),
    status: page.status,
    pageKind: page.pageKind,
    deploymentMode: page.deploymentMode ?? "single-page",
    sourceSelectionMode: page.sourceSelectionMode ?? "none",
    primarySourceType: page.primarySourceType,
    layoutId: page.layoutId ?? null,
    layoutKey: page.layoutKey,
    layoutModel: cloneJsonValue(page.layoutModel ?? {}),
    runtimeScriptUrls: normalizeScriptUrlList(page.runtimeScriptUrls),
    renderPolicy: cloneJsonValue(page.renderPolicy ?? {}),
    deploymentArtifactPath: page.deploymentArtifactPath ?? null,
    deploymentStatus: page.deploymentStatus ?? "missing",
    deploymentTargetCount: page.deploymentTargetCount ?? 0,
    deploymentSyncedCount: page.deploymentSyncedCount ?? 0,
    deploymentStaleCount: page.deploymentStaleCount ?? 0,
    deploymentMissingCount: page.deploymentMissingCount ?? 0,
    deploymentSyncedOn: page.deploymentSyncedOn ?? null,
    deploymentLastRunOn: page.deploymentLastRunOn ?? null,
    updatedOn: page.updatedOn,
    createdOn: page.createdOn,
    scheduledOn: page.scheduledOn ?? null,
    publishedOn: page.publishedOn ?? null,
    archivedOn: page.archivedOn ?? null
  };
}

function applyBrowserDeliveryToPayload({
  payload,
  settings,
  resolvedPath
}) {
  if (!settings?.browserDeliveryState?.browserTarget) {
    return payload;
  }

  const browserDelivery = resolveBrowserDeliveryPayloadState({
    browserDeliveryState: settings.browserDeliveryState,
    pagePath: payload?.page?.path ?? resolvedPath ?? payload?.page?.path,
    artifactRelativePath: resolveArtifactRelativePathFromResolvedPath(
      payload?.page?.path ?? resolvedPath
    )
  });
  if (!browserDelivery) {
    return payload;
  }

  const nextPayload = {
    ...payload,
    delivery: {
      ...(payload?.delivery && typeof payload.delivery === "object" ? payload.delivery : {}),
      accessMode: browserDelivery.accessMode,
      dnsMode: browserDelivery.dnsMode,
      publicOrigin: browserDelivery.publicOrigin,
      publicUrl: browserDelivery.publicUrl,
      publicMediaBaseUrl: browserDelivery.publicMediaBaseUrl,
      temporaryDeploymentBaseUrl: browserDelivery.temporaryDeploymentBaseUrl,
      temporaryMediaBaseUrl: browserDelivery.temporaryMediaBaseUrl
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

async function finalizeDeliveryPayload(payload, collectionHandlerRegistry) {
  const mediaAwarePayload = await attachResolvedMediaReferences(payload, collectionHandlerRegistry);
  return attachClientRuntimeContract(mediaAwarePayload);
}

export async function resolvePageDeliveryPayload({
  collectionHandlerRegistry,
  page,
  preview = false,
  sourceRecord = null,
  resolveSettingsRepository = null,
  settingsDefinition = null
}) {
  const resolvedPath = buildResolvedPagePath(page, sourceRecord);
  const primarySource = buildPrimarySourceDescriptor(page, sourceRecord);
  const dataSourceDescriptors = buildDataSourceDescriptors(page);
  const resolvedPrimary = primarySource
    ? await resolveDescriptor(collectionHandlerRegistry, primarySource)
    : null;
  const resolvedSources = await Promise.all(
    dataSourceDescriptors.map((descriptor) => resolveDescriptor(collectionHandlerRegistry, descriptor))
  );
  const primaryRecord = resolvedPrimary?.value?.record ?? null;
  const renderModel = await buildRenderModel(page, collectionHandlerRegistry);
  const dependencyKeys = mergeDependencyKeys([
    resolvedPrimary ?? { dependencyKeys: [] },
    ...resolvedSources,
    {
      dependencyKeys: [createDependencyKey("blog-pages", page.id)]
    }
  ]);
  const resolvedDependencyKeys = page.layoutId
    ? [...new Set([...dependencyKeys, createDependencyKey(LAYOUTS_COLLECTION_ID, page.layoutId)])]
    : dependencyKeys;

  const payload = {
    contractVersion: 1,
    page: buildPageSummary(page, resolvedPath),
    head: buildHeadModel(page, primaryRecord),
    renderModel,
    resolvedSources: buildResolvedSourceSummaries(primarySource, resolvedPrimary, resolvedSources),
    data: buildResolvedDataMap(primarySource, resolvedPrimary, resolvedSources),
    followUp: {
      mode: page.renderPolicy?.followUpMode ?? "page-by-path",
      pageByIdRoute: `/api/reference/modules/${MODULE_ID}/pages/${page.id}/delivery`,
      pageByPathRoute: `/api/reference/modules/${MODULE_ID}/delivery/resolve?path=${encodeURIComponent(resolvedPath)}`
    },
    versioning: {
      publishModel: page.renderPolicy?.publishModel ?? "live-reference",
      previewMode: preview ? "preview" : "delivery",
      dependencyKeys: resolvedDependencyKeys
    },
    resolvedAt: toTimestamp()
  };

  if (typeof resolveSettingsRepository !== "function") {
    return finalizeDeliveryPayload(payload, collectionHandlerRegistry);
  }

  const settings = await readPagesModuleSettings({
    resolveSettingsRepository,
    settingsDefinition,
    collectionHandlerRegistry,
    page
  });
  return finalizeDeliveryPayload(
    applyBrowserDeliveryToPayload({
      payload,
      settings,
      resolvedPath
    }),
    collectionHandlerRegistry
  );
}

export async function resolvePageByPath({
  collectionHandlerRegistry,
  path,
  preview = false,
  resolveSettingsRepository = null,
  settingsDefinition = null
}) {
  const pagesHandler = collectionHandlerRegistry.get("blog-pages");
  const normalizedPath = normalizePagePath(path);
  const singlePage = await findPublishedSinglePageByPath(pagesHandler, normalizedPath);
  if (singlePage) {
    if (!preview && !isPagePublished(singlePage.status)) {
      return null;
    }
    return resolvePageDeliveryPayload({
      collectionHandlerRegistry,
      page: singlePage,
      preview,
      resolveSettingsRepository,
      settingsDefinition
    });
  }

  const perRecordMatch = await findPublishedPerRecordPageByPath(
    collectionHandlerRegistry,
    pagesHandler,
    normalizedPath
  );
  if (!perRecordMatch) {
    return null;
  }

  return resolvePageDeliveryPayload({
    collectionHandlerRegistry,
    page: perRecordMatch.page,
    preview,
    sourceRecord: perRecordMatch.sourceRecord,
    resolveSettingsRepository,
    settingsDefinition
  });
}

export async function resolvePagePreviewPayload({
  collectionHandlerRegistry,
  page,
  requestedSourceItemId = null,
  resolveSettingsRepository = null,
  settingsDefinition = null
}) {
  const sourceRecord = await resolveRequestedSourceRecord({
    collectionHandlerRegistry,
    page,
    requestedSourceItemId
  });
  return resolvePageDeliveryPayload({
    collectionHandlerRegistry,
    page,
    preview: true,
    sourceRecord,
    resolveSettingsRepository,
    settingsDefinition
  });
}

export async function listPagePreviewSourceOptions({
  collectionHandlerRegistry,
  page
}) {
  const records = await listEligiblePrimarySourceRecords(collectionHandlerRegistry, page);
  return records.map((record) => ({
    id: record.id,
    label: readDisplayLabel(record),
    path: buildResolvedPagePath(page, record)
  }));
}
