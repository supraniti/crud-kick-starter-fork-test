import {
  AUTHORS_COLLECTION_ID,
  CATEGORIES_COLLECTION_ID,
  DATA_SOURCE_KIND_SET,
  MODULE_ID,
  POSTS_COLLECTION_ID,
  TAGS_COLLECTION_ID,
  buildDefaultPrimarySource,
  cloneJsonValue,
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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createDependencyKey(collectionId, itemId = null) {
  return itemId ? `${collectionId}:${itemId}` : `${collectionId}:*`;
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

function buildPrimarySourceDescriptor(page = {}) {
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
    itemId: normalizeOptionalText(source.itemId),
    bindAs: normalizeOptionalText(source.bindAs) ?? "primary"
  };
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

function buildRenderModel(page = {}) {
  return {
    layoutKey: page.layoutKey,
    pageKind: page.pageKind,
    layoutModel: cloneJsonValue(page.layoutModel ?? {}),
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

function buildPageSummary(page = {}) {
  return {
    id: page.id,
    title: page.title,
    path: normalizePagePath(page.path),
    status: page.status,
    pageKind: page.pageKind,
    primarySourceType: page.primarySourceType,
    layoutKey: page.layoutKey,
    layoutModel: cloneJsonValue(page.layoutModel ?? {}),
    runtimeScriptUrls: normalizeScriptUrlList(page.runtimeScriptUrls),
    renderPolicy: cloneJsonValue(page.renderPolicy ?? {}),
    deploymentArtifactPath: page.deploymentArtifactPath ?? null,
    deploymentSyncedOn: page.deploymentSyncedOn ?? null,
    updatedOn: page.updatedOn,
    createdOn: page.createdOn,
    scheduledOn: page.scheduledOn ?? null,
    publishedOn: page.publishedOn ?? null,
    archivedOn: page.archivedOn ?? null
  };
}

export async function resolvePageDeliveryPayload({
  collectionHandlerRegistry,
  page,
  preview = false
}) {
  const primarySource = buildPrimarySourceDescriptor(page);
  const dataSourceDescriptors = buildDataSourceDescriptors(page);
  const resolvedPrimary = primarySource
    ? await resolveDescriptor(collectionHandlerRegistry, primarySource)
    : null;
  const resolvedSources = await Promise.all(
    dataSourceDescriptors.map((descriptor) => resolveDescriptor(collectionHandlerRegistry, descriptor))
  );
  const primaryRecord = resolvedPrimary?.value?.record ?? null;
  const dependencyKeys = mergeDependencyKeys([
    resolvedPrimary ?? { dependencyKeys: [] },
    ...resolvedSources,
    {
      dependencyKeys: [createDependencyKey("blog-pages", page.id)]
    }
  ]);

  return {
    contractVersion: 1,
    page: buildPageSummary(page),
    head: buildHeadModel(page, primaryRecord),
    renderModel: buildRenderModel(page),
    resolvedSources: buildResolvedSourceSummaries(primarySource, resolvedPrimary, resolvedSources),
    data: buildResolvedDataMap(primarySource, resolvedPrimary, resolvedSources),
    followUp: {
      mode: page.renderPolicy?.followUpMode ?? "page-by-path",
      pageByIdRoute: `/api/reference/modules/${MODULE_ID}/pages/${page.id}/delivery`,
      pageByPathRoute: `/api/reference/modules/${MODULE_ID}/delivery/resolve?path=${encodeURIComponent(page.path)}`
    },
    versioning: {
      publishModel: page.renderPolicy?.publishModel ?? "live-reference",
      previewMode: preview ? "preview" : "delivery",
      dependencyKeys
    },
    resolvedAt: toTimestamp()
  };
}

export async function resolvePageByPath({ collectionHandlerRegistry, path, preview = false }) {
  const pagesHandler = collectionHandlerRegistry.get("blog-pages");
  const pages = await listHandlerItems(pagesHandler, {
    path: normalizePagePath(path)
  });
  const normalizedPath = normalizePagePath(path);
  const page = pages.find((entry) => normalizePagePath(entry.path) === normalizedPath) ?? null;
  if (!page) {
    return null;
  }
  if (!preview && !isPagePublished(page.status)) {
    return null;
  }
  return resolvePageDeliveryPayload({
    collectionHandlerRegistry,
    page,
    preview
  });
}
