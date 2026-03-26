import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  CATEGORIES_COLLECTION_ID,
  PAGES_COLLECTION_ID,
  POSTS_COLLECTION_ID,
  TAGS_COLLECTION_ID,
  normalizeTargetConfig,
  stringifyCanonicalJson
} from "./remote-ops-shared-runtime.mjs";
import {
  resolveDeploymentRoot,
  resolveMediaRoot,
  resolveSimulatedFirestoreRoot,
  resolveSimulatedStorageRoot
} from "./remote-ops-root.mjs";
import { buildPublicTranslationsProjectionMap } from "../../test-modules-translations/server/public-translations-runtime.mjs";

const AUTHORS_COLLECTION_ID = "blog-authors";
const MEDIA_ITEMS_COLLECTION_ID = "media-items";

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, {
    recursive: true
  });
}

function hashBuffer(buffer, algorithm = "sha1", encoding = "hex") {
  return createHash(algorithm).update(buffer).digest(encoding);
}

export async function collectFileHashes(rootPath, prefix = "", hashOptions = {}) {
  const algorithm = hashOptions.algorithm ?? "sha1";
  const encoding = hashOptions.encoding ?? "hex";
  const entries = new Map();
  if (!(await pathExists(rootPath))) {
    return entries;
  }

  const directoryEntries = await fs.readdir(rootPath, {
    withFileTypes: true
  });
  for (const entry of directoryEntries) {
    const nextRelativePath = prefix.length > 0 ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      const childEntries = await collectFileHashes(absolutePath, nextRelativePath, hashOptions);
      for (const [relativePath, metadata] of childEntries.entries()) {
        entries.set(relativePath, metadata);
      }
      continue;
    }
    const content = await fs.readFile(absolutePath);
    entries.set(nextRelativePath, {
      relativePath: nextRelativePath,
      absolutePath,
      sizeBytes: content.length,
      hash: hashBuffer(content, algorithm, encoding)
    });
  }
  return entries;
}

export function buildDiff(localEntries, remoteEntries) {
  const createKeys = [];
  const updateKeys = [];
  const deleteKeys = [];
  const sampleKeys = [];

  for (const [relativePath, localMetadata] of localEntries.entries()) {
    const remoteMetadata = remoteEntries.get(relativePath) ?? null;
    if (!remoteMetadata) {
      createKeys.push(relativePath);
      continue;
    }
    if (remoteMetadata.hash !== localMetadata.hash) {
      updateKeys.push(relativePath);
    }
  }

  for (const relativePath of remoteEntries.keys()) {
    if (!localEntries.has(relativePath)) {
      deleteKeys.push(relativePath);
    }
  }

  for (const key of [...createKeys, ...updateKeys, ...deleteKeys].slice(0, 8)) {
    sampleKeys.push(key);
  }

  return {
    createKeys,
    updateKeys,
    deleteKeys,
    sampleKeys,
    localOnlyCount: createKeys.length,
    remoteOnlyCount: deleteKeys.length,
    isClean: createKeys.length === 0 && updateKeys.length === 0 && deleteKeys.length === 0
  };
}

export function buildCompareSummaryFromDiff(diff, message) {
  return {
    state: diff.isClean ? "clean" : "drift",
    message,
    createCount: diff.createKeys.length,
    updateCount: diff.updateKeys.length,
    deleteCount: diff.deleteKeys.length,
    localOnlyCount: diff.localOnlyCount,
    remoteOnlyCount: diff.remoteOnlyCount,
    sampleKeys: diff.sampleKeys
  };
}

export function buildRunSummaryFromDiff(diff, warnings = [], restoredCount = 0) {
  return {
    createCount: diff.createKeys.length,
    updateCount: diff.updateKeys.length,
    deleteCount: diff.deleteKeys.length,
    restoredCount,
    sampleKeys: diff.sampleKeys,
    warnings
  };
}

export function createProcedureMessage(noun, diff) {
  if (diff.isClean) {
    return `${noun} is clean`;
  }
  return `${diff.createKeys.length} create, ${diff.updateKeys.length} update, ${diff.deleteKeys.length} delete`;
}

async function writeRelativeFile(rootPath, relativePath, sourceAbsolutePath) {
  const destinationPath = path.join(rootPath, relativePath);
  await ensureDir(path.dirname(destinationPath));
  await fs.copyFile(sourceAbsolutePath, destinationPath);
}

async function removeRelativeFile(rootPath, relativePath) {
  const targetPath = path.join(rootPath, relativePath);
  if (await pathExists(targetPath)) {
    await fs.rm(targetPath, {
      force: true
    });
  }
}

async function listHandlerItems(handler) {
  if (!handler || typeof handler.list !== "function") {
    return [];
  }
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

async function readHandlerItem(handler, itemId) {
  if (!handler || typeof handler.findById !== "function" || typeof itemId !== "string" || itemId.trim().length === 0) {
    return null;
  }
  return handler.findById(itemId);
}

async function readHandlerItemsByIds(handler, itemIds = []) {
  const uniqueIds = [...new Set((Array.isArray(itemIds) ? itemIds : []).filter(Boolean))];
  const items = await Promise.all(uniqueIds.map((itemId) => readHandlerItem(handler, itemId)));
  return items.filter(Boolean);
}

function buildMediaProjectionSummary(item = null) {
  if (!item || typeof item !== "object") {
    return null;
  }
  return {
    id: item.id ?? null,
    displayName: item.displayName ?? item.altText ?? item.id ?? "Media",
    altText: item.altText ?? item.displayName ?? "",
    description: item.description ?? "",
    preferredUrl: item.preferredUrl ?? item.publicUrl ?? item.temporaryUrl ?? item.localContentUrl ?? null,
    width: Number.isFinite(item.width) ? item.width : null,
    height: Number.isFinite(item.height) ? item.height : null,
    relativePath: item.relativePath ?? null
  };
}

function buildAuthorProjectionSummary(item = null, avatarMedia = null) {
  if (!item || typeof item !== "object") {
    return null;
  }
  return {
    id: item.id ?? null,
    slug: item.slug ?? null,
    displayName: item.displayName ?? item.slug ?? item.id ?? "Author",
    bio: item.bio ?? "",
    role: item.role ?? null,
    locale: item.locale ?? null,
    avatarMedia: buildMediaProjectionSummary(avatarMedia ?? item.avatarMedia ?? null)
  };
}

function buildCategoryProjectionSummary(item = null, featuredMedia = null) {
  if (!item || typeof item !== "object") {
    return null;
  }
  return {
    id: item.id ?? null,
    slug: item.slug ?? null,
    name: item.name ?? item.slug ?? item.id ?? "Category",
    description: item.description ?? "",
    parentCategoryId: item.parentCategoryId ?? null,
    path: item.path ?? null,
    depth: Number.isFinite(item.depth) ? item.depth : 0,
    featuredMedia: buildMediaProjectionSummary(featuredMedia ?? item.featuredMedia ?? null)
  };
}

function buildTagProjectionSummary(item = null) {
  if (!item || typeof item !== "object") {
    return null;
  }
  return {
    id: item.id ?? null,
    slug: item.slug ?? null,
    name: item.name ?? item.slug ?? item.id ?? "Tag",
    description: item.description ?? "",
    color: item.color ?? null,
    seoTitle: item.seoTitle ?? null,
    seoDescription: item.seoDescription ?? null
  };
}

async function buildPublishedPostProjectionMap(collectionHandlerRegistry, targetProfile) {
  const postsHandler = collectionHandlerRegistry.get(POSTS_COLLECTION_ID);
  const authorsHandler = collectionHandlerRegistry.get(AUTHORS_COLLECTION_ID);
  const categoriesHandler = collectionHandlerRegistry.get(CATEGORIES_COLLECTION_ID);
  const tagsHandler = collectionHandlerRegistry.get(TAGS_COLLECTION_ID);
  const mediaHandler = collectionHandlerRegistry.get(MEDIA_ITEMS_COLLECTION_ID);
  const projectionMap = new Map();
  if (!postsHandler) {
    return projectionMap;
  }

  const payload = await postsHandler.list({
    limit: 5000,
    offset: 0
  });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const collectionPath =
    normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).firestoreCollectionPath
    ?? "content/posts";

  for (const item of items) {
    if (item?.status !== "published") {
      continue;
    }
    const [primaryAuthor, categories, tags, featuredMedia, galleryMedia] = await Promise.all([
      readHandlerItem(authorsHandler, item.primaryAuthorId),
      readHandlerItemsByIds(categoriesHandler, item.categoryIds),
      readHandlerItemsByIds(tagsHandler, item.tagIds),
      readHandlerItem(mediaHandler, item.featuredMediaId),
      readHandlerItemsByIds(mediaHandler, item.galleryMediaIds)
    ]);
    const documentId = typeof item.slug === "string" && item.slug.trim().length > 0 ? item.slug.trim() : item.id;
    const document = {
      id: item.id,
      slug: item.slug ?? null,
      title: item.title ?? null,
      subtitle: item.subtitle ?? null,
      excerpt: item.excerpt ?? null,
      body: item.body ?? null,
      status: item.status,
      format: item.format ?? "article",
      locale: item.locale ?? null,
      publishedOn: item.publishedOn ?? null,
      updatedOn: item.updatedOn ?? null,
      pagePath: item.pagePath ?? null,
      readTimeMinutes: Number.isFinite(item.readTimeMinutes) ? item.readTimeMinutes : null,
      wordCount: Number.isFinite(item.wordCount) ? item.wordCount : null,
      seoTitle: item.seoTitle ?? null,
      seoDescription: item.seoDescription ?? null,
      allowComments: item.allowComments !== false,
      commentPolicy: item.commentPolicy ?? "open",
      primaryAuthorId: item.primaryAuthorId ?? null,
      primaryAuthorTitle: item.primaryAuthorTitle ?? primaryAuthor?.displayName ?? null,
      primaryAuthorSlug: primaryAuthor?.slug ?? null,
      primaryAuthor: buildAuthorProjectionSummary(primaryAuthor),
      categoryIds: Array.isArray(item.categoryIds) ? item.categoryIds : [],
      categoryIdsTitles: categories.map((entry) => entry.name ?? entry.slug ?? entry.id ?? "Category"),
      categories: categories.map((entry) => buildCategoryProjectionSummary(entry)).filter(Boolean),
      tagIds: Array.isArray(item.tagIds) ? item.tagIds : [],
      tagIdsTitles: tags.map((entry) => entry.name ?? entry.slug ?? entry.id ?? "Tag"),
      tags: tags.map((entry) => buildTagProjectionSummary(entry)).filter(Boolean),
      featuredMediaId: item.featuredMediaId ?? null,
      featuredMedia: buildMediaProjectionSummary(featuredMedia ?? item.featuredMedia ?? null),
      galleryMediaIds: Array.isArray(item.galleryMediaIds) ? item.galleryMediaIds : [],
      galleryMedia: galleryMedia.map((entry) => buildMediaProjectionSummary(entry)).filter(Boolean)
    };
    const content = Buffer.from(stringifyCanonicalJson(document), "utf8");
    const relativePath = `${collectionPath}/${documentId}.json`;
    projectionMap.set(relativePath, {
      relativePath,
      absolutePath: null,
      sizeBytes: content.length,
      hash: hashBuffer(content),
      content,
      documentData: document
    });
  }
  return projectionMap;
}

async function buildPublishedPagesProjectionMap(collectionHandlerRegistry, targetProfile) {
  const pagesHandler = collectionHandlerRegistry.get(PAGES_COLLECTION_ID);
  const projectionMap = new Map();
  if (!pagesHandler) {
    return projectionMap;
  }

  const payload = await pagesHandler.list({
    limit: 5000,
    offset: 0
  });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const collectionPath =
    normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).firestoreCollectionPath
    ?? "content/pages";

  for (const item of items) {
    if (item?.status !== "published") {
      continue;
    }
    const documentId = typeof item.path === "string" && item.path.length > 1
      ? item.path.replace(/^\/+/, "").replace(/\//g, "-")
      : item.id;
    const document = {
      id: item.id,
      title: item.title ?? null,
      path: item.path ?? null,
      pathPattern: item.pathPattern ?? null,
      status: item.status,
      pageKind: item.pageKind ?? null,
      layoutKey: item.layoutKey ?? null,
      deploymentMode: item.deploymentMode ?? "single-page",
      primarySourceType: item.primarySourceType ?? "none",
      primarySource: item.primarySource ?? null,
      publishedOn: item.publishedOn ?? null,
      updatedOn: item.updatedOn ?? null
    };
    const content = Buffer.from(stringifyCanonicalJson(document), "utf8");
    const relativePath = `${collectionPath}/${documentId}.json`;
    projectionMap.set(relativePath, {
      relativePath,
      absolutePath: null,
      sizeBytes: content.length,
      hash: hashBuffer(content),
      content,
      documentData: document
    });
  }
  return projectionMap;
}

function buildProjectionEntry(collectionPath, documentId, document) {
  const content = Buffer.from(stringifyCanonicalJson(document), "utf8");
  const relativePath = `${collectionPath}/${documentId}.json`;
  return {
    relativePath,
    absolutePath: null,
    sizeBytes: content.length,
    hash: hashBuffer(content),
    content,
    documentData: document
  };
}

function resolveProjectionDocumentId(item) {
  return typeof item?.slug === "string" && item.slug.trim().length > 0 ? item.slug.trim() : item?.id;
}

function toFiniteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function buildPublicCategoryDocument(item) {
  return {
    id: item.id,
    slug: item.slug ?? null,
    name: item.name ?? null,
    description: item.description ?? null,
    parentCategoryId: item.parentCategoryId ?? null,
    path: item.path ?? null,
    depth: toFiniteNumber(item.depth),
    sortOrder: toFiniteNumber(item.sortOrder),
    visibility: item.visibility ?? "public",
    featuredMediaId: item.featuredMediaId ?? null,
    featuredMedia: buildMediaProjectionSummary(item.featuredMedia ?? null),
    usageCount: toFiniteNumber(item.usageCount),
    updatedOn: item.updatedOn ?? null
  };
}

function buildPublicTagDocument(item) {
  return {
    id: item.id,
    slug: item.slug ?? null,
    name: item.name ?? null,
    description: item.description ?? null,
    color: item.color ?? null,
    visibility: item.visibility ?? "public",
    usageCount: toFiniteNumber(item.usageCount),
    seoTitle: item.seoTitle ?? null,
    seoDescription: item.seoDescription ?? null,
    updatedOn: item.updatedOn ?? null
  };
}

async function buildPublicCategoriesProjectionMap(collectionHandlerRegistry, targetProfile) {
  const categoriesHandler = collectionHandlerRegistry.get(CATEGORIES_COLLECTION_ID);
  const projectionMap = new Map();
  if (!categoriesHandler) {
    return projectionMap;
  }

  const payload = await categoriesHandler.list({
    limit: 5000,
    offset: 0
  });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const collectionPath =
    normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).firestoreCollectionPath
    ?? "publicCategories";

  for (const item of items) {
    if (item?.visibility !== "public") {
      continue;
    }
    const documentId = resolveProjectionDocumentId(item);
    const document = buildPublicCategoryDocument(item);
    projectionMap.set(
      `${collectionPath}/${documentId}.json`,
      buildProjectionEntry(collectionPath, documentId, document)
    );
  }
  return projectionMap;
}

async function buildPublicTagsProjectionMap(collectionHandlerRegistry, targetProfile) {
  const tagsHandler = collectionHandlerRegistry.get(TAGS_COLLECTION_ID);
  const projectionMap = new Map();
  if (!tagsHandler) {
    return projectionMap;
  }

  const payload = await tagsHandler.list({
    limit: 5000,
    offset: 0
  });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const collectionPath =
    normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).firestoreCollectionPath
    ?? "publicTags";

  for (const item of items) {
    if (item?.visibility !== "public") {
      continue;
    }
    const documentId = resolveProjectionDocumentId(item);
    const document = buildPublicTagDocument(item);
    projectionMap.set(
      `${collectionPath}/${documentId}.json`,
      buildProjectionEntry(collectionPath, documentId, document)
    );
  }
  return projectionMap;
}

export async function buildFirestoreProjectionMap(collectionHandlerRegistry, targetProfile) {
  const projectionScope = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).projectionScope;
  if (projectionScope === "published-pages") {
    return buildPublishedPagesProjectionMap(collectionHandlerRegistry, targetProfile);
  }
  if (projectionScope === "public-blog-categories") {
    return buildPublicCategoriesProjectionMap(collectionHandlerRegistry, targetProfile);
  }
  if (projectionScope === "public-blog-tags") {
    return buildPublicTagsProjectionMap(collectionHandlerRegistry, targetProfile);
  }
  if (projectionScope === "public-translations") {
    return buildPublicTranslationsProjectionMap(collectionHandlerRegistry, targetProfile);
  }
  return buildPublishedPostProjectionMap(collectionHandlerRegistry, targetProfile);
}

export async function collectRemoteFirestoreEntries(targetProfile) {
  return collectFileHashes(resolveSimulatedFirestoreRoot(targetProfile.id));
}

export async function collectRemoteStorageEntries(targetProfile) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const rootPath = config.prefix
    ? path.join(resolveSimulatedStorageRoot(targetProfile.id), config.prefix)
    : resolveSimulatedStorageRoot(targetProfile.id);
  return collectFileHashes(rootPath);
}

export function resolveLocalStorageRoot(targetProfile) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  if (config.localRootHint === "media") {
    return resolveMediaRoot();
  }
  return resolveDeploymentRoot();
}

export async function copyFirestoreProjectionEntries(targetProfile, localEntries, diff, allowDeletes) {
  const remoteRoot = resolveSimulatedFirestoreRoot(targetProfile.id);
  await ensureDir(remoteRoot);
  for (const relativePath of [...diff.createKeys, ...diff.updateKeys]) {
    const entry = localEntries.get(relativePath);
    if (!entry) {
      continue;
    }
    const destinationPath = path.join(remoteRoot, relativePath);
    await ensureDir(path.dirname(destinationPath));
    await fs.writeFile(destinationPath, entry.content);
  }
  if (allowDeletes) {
    for (const relativePath of diff.deleteKeys) {
      await removeRelativeFile(remoteRoot, relativePath);
    }
  }
}

export async function copyStorageEntries(targetProfile, localEntries, diff, allowDeletes) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const remoteRoot = config.prefix
    ? path.join(resolveSimulatedStorageRoot(targetProfile.id), config.prefix)
    : resolveSimulatedStorageRoot(targetProfile.id);
  await ensureDir(remoteRoot);
  for (const relativePath of [...diff.createKeys, ...diff.updateKeys]) {
    const entry = localEntries.get(relativePath);
    if (!entry?.absolutePath) {
      continue;
    }
    await writeRelativeFile(remoteRoot, relativePath, entry.absolutePath);
  }
  if (allowDeletes) {
    for (const relativePath of diff.deleteKeys) {
      await removeRelativeFile(remoteRoot, relativePath);
    }
  }
}

export async function restoreStorageTarget(targetProfile) {
  const localEntries = await collectFileHashes(resolveLocalStorageRoot(targetProfile));
  const remoteEntries = await collectRemoteStorageEntries(targetProfile);
  const diff = buildDiff(localEntries, remoteEntries);
  const restoreKey = diff.deleteKeys[0] ?? null;
  if (!restoreKey) {
    return {
      status: "warning",
      message: "No remote-only item is available to restore",
      runSummary: buildRunSummaryFromDiff(diff, ["No remote-only item is available to restore"], 0)
    };
  }

  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const remoteRoot = config.prefix
    ? path.join(resolveSimulatedStorageRoot(targetProfile.id), config.prefix)
    : resolveSimulatedStorageRoot(targetProfile.id);
  const localRoot = resolveLocalStorageRoot(targetProfile);
  const sourceAbsolutePath = path.join(remoteRoot, restoreKey);
  await writeRelativeFile(localRoot, restoreKey, sourceAbsolutePath);

  return {
    status: "succeeded",
    message: `Restored '${restoreKey}' to local ${targetProfile.targetKind === "media-storage" ? "media" : "deployment"}`,
    runSummary: buildRunSummaryFromDiff(diff, [], 1),
    restoredKey: restoreKey
  };
}

export async function seedSimulatedRemoteExtraFile(targetProfile, timestampLabel) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const remoteRoot = config.prefix
    ? path.join(resolveSimulatedStorageRoot(targetProfile.id), config.prefix)
    : resolveSimulatedStorageRoot(targetProfile.id);
  const relativePath = targetProfile.targetKind === "media-storage"
    ? "simulated/orphan-media.txt"
    : "simulated/orphan-page/index.html";
  const destinationPath = path.join(remoteRoot, relativePath);
  await ensureDir(path.dirname(destinationPath));
  await fs.writeFile(destinationPath, `seeded ${timestampLabel}\n`, "utf8");
  return relativePath;
}
