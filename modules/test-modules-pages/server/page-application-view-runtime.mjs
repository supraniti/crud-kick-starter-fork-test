import {
  AUTHORS_COLLECTION_ID,
  CATEGORIES_COLLECTION_ID,
  LAYOUTS_COLLECTION_ID,
  PAGES_COLLECTION_ID,
  POSTS_COLLECTION_ID,
  TAGS_COLLECTION_ID,
  buildDefaultLayoutModel,
  isPagePublished,
  isPerRecordDeploymentMode,
  normalizeOptionalText,
  normalizePagePath
} from "./distribution-shared-runtime.mjs";
import { parseStoredLayoutDocument } from "../../test-modules-layouts/shared/layout-document.mjs";
import {
  attachPageWidgetRenderContract,
  buildPageWidgetRenderState
} from "./page-widget-render-contract-runtime.mjs";
import { resolvePageContextManifest } from "./page-context-manifest-runtime.mjs";
import { resolvePublishedFirestoreCollectionDescriptor } from "./page-firestore-publication-runtime.mjs";
import { resolvePageThemeSelection } from "./page-theme-runtime.mjs";
import {
  buildReaderRouteManifestVersionToken,
  resolveReaderRouteManifestAssetUrl
} from "./page-route-manifest-runtime.mjs";

const MEDIA_ITEMS_COLLECTION_ID = "media-items";
const ROUTE_MANIFEST_SUPPORTED_SOURCE_TYPES = new Set(["blog-post", "blog-category"]);

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function readPrimaryRecord(payload = {}) {
  const record = payload?.data?.primary?.record;
  return record && typeof record === "object" ? record : null;
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
  if (!handler || typeof handler.findById !== "function" || !itemId) {
    return null;
  }
  return handler.findById(itemId);
}

async function readHandlerItemsByIds(handler, itemIds = []) {
  const uniqueIds = [...new Set(toArray(itemIds).filter(Boolean))];
  const items = await Promise.all(uniqueIds.map((itemId) => readHandlerItem(handler, itemId)));
  return items.filter(Boolean);
}

async function collectCategoryLineage(handler, category = null) {
  const lineage = [];
  let cursor = category;
  const visited = new Set();
  while (cursor && cursor.id && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    lineage.unshift(cursor);
    const parentId = normalizeOptionalText(cursor.parentCategoryId);
    cursor = parentId ? await readHandlerItem(handler, parentId) : null;
  }
  return lineage;
}

function sortByPublishedAscending(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left?.publishedOn ?? left?.updatedOn ?? 0).getTime();
    const rightTime = new Date(right?.publishedOn ?? right?.updatedOn ?? 0).getTime();
    return leftTime - rightTime;
  });
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function resolveEffectiveLayoutModel(page = {}) {
  return buildDefaultLayoutModel(page?.layoutModel ?? {});
}

function escapePathTokenSegment(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolvePathPattern(page = {}) {
  return normalizeOptionalText(page?.pathPattern);
}

function buildResolvedPagePath(page = {}, sourceRecord = null) {
  if (!isPerRecordDeploymentMode(page?.deploymentMode)) {
    return normalizePagePath(page?.path);
  }

  const pattern = resolvePathPattern(page);
  if (!pattern) {
    return normalizePagePath(page?.path);
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

function buildMediaPreferredUrl(media = {}, delivery = {}) {
  if (media?.preferredUrl || media?.publicUrl || media?.temporaryUrl || media?.localContentUrl) {
    return media.preferredUrl ?? media.publicUrl ?? media.temporaryUrl ?? media.localContentUrl ?? null;
  }
  const relativePath = normalizeOptionalText(media?.relativePath);
  const publicMediaBaseUrl = normalizeOptionalText(delivery?.publicMediaBaseUrl);
  if (relativePath && publicMediaBaseUrl) {
    return `${publicMediaBaseUrl.replace(/\/+$/g, "")}/${relativePath.replace(/^\/+/, "")}`;
  }
  return null;
}

function buildMediaSummary(media = null, delivery = {}) {
  if (!media || typeof media !== "object") {
    return null;
  }
  return {
    id: media.id ?? null,
    displayName: media.displayName ?? media.altText ?? media.id ?? "Media",
    altText: media.altText ?? media.displayName ?? "",
    description: media.description ?? "",
    preferredUrl: buildMediaPreferredUrl(media, delivery),
    width: media.width ?? null,
    height: media.height ?? null
  };
}

function buildPublicUrl(publicOrigin, pagePath, delivery = {}) {
  const normalizedOrigin = normalizeOptionalText(publicOrigin);
  const normalizedPath = normalizePagePath(pagePath);
  if (!normalizedOrigin || !normalizedPath) {
    return null;
  }
  const isCustomDomain = normalizeText(delivery?.accessMode) === "custom-domain";
  let usesProviderObjectOrigin = false;
  try {
    const originUrl = new URL(normalizedOrigin);
    usesProviderObjectOrigin =
      originUrl.hostname === "storage.googleapis.com" ||
      originUrl.hostname.endsWith(".storage.googleapis.com");
  } catch {
    usesProviderObjectOrigin = false;
  }
  const useIndexArtifact = !isCustomDomain || usesProviderObjectOrigin;
  const relativePath =
    normalizedPath === "/"
      ? useIndexArtifact
        ? "index.html"
        : ""
      : useIndexArtifact
        ? `${normalizedPath.replace(/^\/+/, "")}/index.html`
        : normalizedPath.replace(/^\/+/, "");
  const baseUrl = normalizedOrigin.endsWith("/") ? normalizedOrigin : `${normalizedOrigin}/`;
  return new URL(relativePath, baseUrl).toString();
}

function selectPublishedPagesBySourceType(pages = [], sourceType) {
  return pages.filter(
    (page) =>
      isPagePublished(page?.status) &&
      normalizeText(page?.primarySourceType) === normalizeText(sourceType)
  );
}

function resolveCurrentPagePreference(currentPage = null, sourceType = null) {
  if (!currentPage || typeof currentPage !== "object") {
    return null;
  }
  return normalizeText(currentPage?.primarySourceType) === normalizeText(sourceType)
    ? normalizeOptionalText(currentPage?.id)
    : null;
}

function resolveRecordPageLink({
  pages = [],
  sourceType,
  record,
  currentPage = null,
  publicOrigin,
  delivery = {}
}) {
  if (!record) {
    return null;
  }
  const candidates = selectPublishedPagesBySourceType(pages, sourceType);
  const preferredPageId = resolveCurrentPagePreference(currentPage, sourceType);
  const orderedCandidates = preferredPageId
    ? [
        ...candidates.filter((page) => page?.id === preferredPageId),
        ...candidates.filter((page) => page?.id !== preferredPageId)
      ]
    : candidates;
  for (const page of orderedCandidates) {
    if (isPerRecordDeploymentMode(page?.deploymentMode)) {
      const path = buildResolvedPagePath(page, record);
      if (!path) {
        continue;
      }
      return {
        pageId: page.id ?? null,
        path,
        publicUrl: buildPublicUrl(publicOrigin, path, delivery)
      };
    }

    const specificRecordId = normalizeOptionalText(page?.primarySource?.itemId);
    if (specificRecordId && specificRecordId === record.id) {
      const path = normalizePagePath(page.path);
      return {
        pageId: page.id ?? null,
        path,
        publicUrl: buildPublicUrl(publicOrigin, path, delivery)
      };
    }
  }
  return null;
}

function buildTagSummary(tag = {}, pages = [], currentPage = null, publicOrigin = null, delivery = {}) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-tag",
    record: tag,
    currentPage,
    publicOrigin,
    delivery
  });
  return {
    id: tag.id ?? null,
    name: tag.name ?? tag.slug ?? "Tag",
    slug: tag.slug ?? null,
    description: tag.description ?? "",
    path: pageLink?.path ?? null,
    publicUrl: pageLink?.publicUrl ?? null
  };
}

function buildCategorySummary(
  category = {},
  pages = [],
  currentPage = null,
  publicOrigin = null,
  delivery = {}
) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-category",
    record: category,
    currentPage,
    publicOrigin,
    delivery
  });
  return {
    id: category.id ?? null,
    name: category.name ?? category.slug ?? "Category",
    slug: category.slug ?? null,
    description: category.description ?? "",
    path: pageLink?.path ?? null,
    publicUrl: pageLink?.publicUrl ?? null,
    treePath: category.path ?? null,
    depth: category.depth ?? 0,
    featuredMedia: buildMediaSummary(category.featuredMedia, delivery)
  };
}

function buildAuthorSummary(
  author = {},
  pages = [],
  currentPage = null,
  publicOrigin = null,
  delivery = {}
) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-author",
    record: author,
    currentPage,
    publicOrigin,
    delivery
  });
  return {
    id: author.id ?? null,
    displayName: author.displayName ?? author.slug ?? "Author",
    slug: author.slug ?? null,
    bio: author.bio ?? "",
    role: author.role ?? null,
    locale: author.locale ?? null,
    avatarMedia: buildMediaSummary(author.avatarMedia, delivery),
    path: pageLink?.path ?? null,
    publicUrl: pageLink?.publicUrl ?? null
  };
}

function buildPostCard(post = {}, pages = [], currentPage = null, publicOrigin = null, delivery = {}) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-post",
    record: post,
    currentPage,
    publicOrigin,
    delivery
  });
  return {
    id: post.id ?? null,
    title: post.title ?? post.slug ?? "Untitled post",
    slug: post.slug ?? null,
    subtitle: post.subtitle ?? "",
    excerpt: post.excerpt ?? "",
    publishedOn: post.publishedOn ?? null,
    updatedOn: post.updatedOn ?? null,
    readTimeMinutes: post.readTimeMinutes ?? null,
    wordCount: post.wordCount ?? null,
    path: pageLink?.path ?? null,
    publicUrl: pageLink?.publicUrl ?? null,
    featuredMedia: buildMediaSummary(post.featuredMedia, delivery)
  };
}

function buildBreadcrumbChain(
  categoriesById,
  category = null,
  pages = [],
  currentPage = null,
  publicOrigin = null,
  delivery = {}
) {
  const chain = [];
  let cursor = category;
  const visited = new Set();
  while (cursor && cursor.id && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    chain.unshift(buildCategorySummary(cursor, pages, currentPage, publicOrigin, delivery));
    const parentId = normalizeOptionalText(cursor.parentCategoryId);
    cursor = parentId ? categoriesById.get(parentId) ?? null : null;
  }
  return chain;
}

function buildPostNavigation(
  posts = [],
  currentPost = {},
  pages = [],
  currentPage = null,
  publicOrigin = null,
  delivery = {}
) {
  const ordered = sortByPublishedAscending(posts.filter((entry) => entry?.status === "published"));
  const index = ordered.findIndex((entry) => entry.id === currentPost.id);
  return {
    previousPost:
      index > 0 ? buildPostCard(ordered[index - 1], pages, currentPage, publicOrigin, delivery) : null,
    nextPost:
      index >= 0 && index < ordered.length - 1
        ? buildPostCard(ordered[index + 1], pages, currentPage, publicOrigin, delivery)
        : null
  };
}

function pickRelatedPosts(items = [], currentPostId, limit = 3) {
  return items
    .filter((item) => item?.id && item.id !== currentPostId && item.status === "published")
    .slice(0, limit);
}

function dedupePosts(items = []) {
  const seen = new Set();
  return items.filter((entry) => {
    const itemId = entry?.id;
    if (!itemId || seen.has(itemId)) {
      return false;
    }
    seen.add(itemId);
    return true;
  });
}

async function buildPostInitialApplicationModel(payload, collectionHandlerRegistry) {
  const primaryRecord = readPrimaryRecord(payload);
  if (!primaryRecord) {
    return null;
  }

  const authorsHandler = collectionHandlerRegistry.get(AUTHORS_COLLECTION_ID);
  const categoriesHandler = collectionHandlerRegistry.get(CATEGORIES_COLLECTION_ID);
  const tagsHandler = collectionHandlerRegistry.get(TAGS_COLLECTION_ID);
  const pagesHandler = collectionHandlerRegistry.get(PAGES_COLLECTION_ID);

  const publicOrigin = normalizeOptionalText(payload?.delivery?.publicOrigin);
  const delivery = payload?.delivery ?? {};
  const currentPage = payload?.page ?? null;
  const [publishedPages, primaryAuthor, coAuthors, categories, tags] = await Promise.all([
    listHandlerItems(pagesHandler),
    readHandlerItem(authorsHandler, primaryRecord.primaryAuthorId),
    readHandlerItemsByIds(authorsHandler, primaryRecord.coAuthorIds),
    readHandlerItemsByIds(categoriesHandler, primaryRecord.categoryIds),
    readHandlerItemsByIds(tagsHandler, primaryRecord.tagIds)
  ]);

  const primaryCategory = categories[0] ?? null;
  const breadcrumbCategories = primaryCategory
    ? await collectCategoryLineage(categoriesHandler, primaryCategory)
    : [];

  return {
    kind: "post-detail",
    post: {
      id: primaryRecord.id ?? null,
      title: primaryRecord.title ?? "Untitled post",
      slug: primaryRecord.slug ?? null,
      subtitle: primaryRecord.subtitle ?? "",
      excerpt: primaryRecord.excerpt ?? "",
      body: primaryRecord.body ?? "",
      format: primaryRecord.format ?? "article",
      locale: primaryRecord.locale ?? null,
      readTimeMinutes: primaryRecord.readTimeMinutes ?? null,
      wordCount: primaryRecord.wordCount ?? null,
      publishedOn: primaryRecord.publishedOn ?? null,
      updatedOn: primaryRecord.updatedOn ?? null,
      featuredMedia: buildMediaSummary(primaryRecord.featuredMedia, delivery),
      galleryMedia: toArray(primaryRecord.galleryMedia).map((item) => buildMediaSummary(item, delivery)).filter(Boolean),
      author: primaryAuthor
        ? buildAuthorSummary(primaryAuthor, publishedPages, currentPage, publicOrigin, delivery)
        : null,
      coAuthors: coAuthors.map((item) =>
        buildAuthorSummary(item, publishedPages, currentPage, publicOrigin, delivery)
      ),
      categories: categories.map((item) =>
        buildCategorySummary(item, publishedPages, currentPage, publicOrigin, delivery)
      ),
      tags: tags.map((item) =>
        buildTagSummary(item, publishedPages, currentPage, publicOrigin, delivery)
      )
    },
    navigation: {
      previousPost: null,
      nextPost: null,
      authorPage: null,
      primaryCategory: primaryCategory
        ? buildCategorySummary(primaryCategory, publishedPages, currentPage, publicOrigin, delivery)
        : null,
      breadcrumbs: breadcrumbCategories.map((item) =>
        buildCategorySummary(item, publishedPages, currentPage, publicOrigin, delivery)
      )
    },
    related: {
      moreFromAuthor: [],
      byCategory: [],
      byTag: []
    },
    comments: {
      enabled: primaryRecord.allowComments !== false && primaryRecord.commentPolicy !== "closed",
      policy: primaryRecord.commentPolicy ?? "open",
      postId: primaryRecord.id ?? null
    }
  };
}

async function buildPostFullApplicationModel(payload, collectionHandlerRegistry) {
  const primaryRecord = readPrimaryRecord(payload);
  if (!primaryRecord) {
    return null;
  }

  const postsHandler = collectionHandlerRegistry.get(POSTS_COLLECTION_ID);
  const authorsHandler = collectionHandlerRegistry.get(AUTHORS_COLLECTION_ID);
  const categoriesHandler = collectionHandlerRegistry.get(CATEGORIES_COLLECTION_ID);
  const tagsHandler = collectionHandlerRegistry.get(TAGS_COLLECTION_ID);
  const pagesHandler = collectionHandlerRegistry.get(PAGES_COLLECTION_ID);

  const publicOrigin = normalizeOptionalText(payload?.delivery?.publicOrigin);
  const delivery = payload?.delivery ?? {};
  const currentPage = payload?.page ?? null;
  const [allPosts, allCategories, publishedPages, primaryAuthor, coAuthors, categories, tags] = await Promise.all([
    listHandlerItems(postsHandler),
    listHandlerItems(categoriesHandler),
    listHandlerItems(pagesHandler),
    readHandlerItem(authorsHandler, primaryRecord.primaryAuthorId),
    readHandlerItemsByIds(authorsHandler, primaryRecord.coAuthorIds),
    readHandlerItemsByIds(categoriesHandler, primaryRecord.categoryIds),
    readHandlerItemsByIds(tagsHandler, primaryRecord.tagIds)
  ]);

  const categoriesById = new Map(allCategories.map((item) => [item.id, item]));
  const primaryCategory = categories[0] ?? null;
  const relatedByAuthor = dedupePosts(
    allPosts.filter((item) => item.primaryAuthorId === primaryRecord.primaryAuthorId)
  );
  const relatedByCategory = dedupePosts(
    allPosts.filter((item) =>
      toArray(item.categoryIds).some((categoryId) => toArray(primaryRecord.categoryIds).includes(categoryId))
    )
  );
  const relatedByTag = dedupePosts(
    allPosts.filter((item) =>
      toArray(item.tagIds).some((tagId) => toArray(primaryRecord.tagIds).includes(tagId))
    )
  );

  return {
    kind: "post-detail",
    post: {
      id: primaryRecord.id ?? null,
      title: primaryRecord.title ?? "Untitled post",
      slug: primaryRecord.slug ?? null,
      subtitle: primaryRecord.subtitle ?? "",
      excerpt: primaryRecord.excerpt ?? "",
      body: primaryRecord.body ?? "",
      format: primaryRecord.format ?? "article",
      locale: primaryRecord.locale ?? null,
      readTimeMinutes: primaryRecord.readTimeMinutes ?? null,
      wordCount: primaryRecord.wordCount ?? null,
      publishedOn: primaryRecord.publishedOn ?? null,
      updatedOn: primaryRecord.updatedOn ?? null,
      featuredMedia: buildMediaSummary(primaryRecord.featuredMedia, delivery),
      galleryMedia: toArray(primaryRecord.galleryMedia).map((item) => buildMediaSummary(item, delivery)).filter(Boolean),
      author: primaryAuthor
        ? buildAuthorSummary(primaryAuthor, publishedPages, currentPage, publicOrigin, delivery)
        : null,
      coAuthors: coAuthors.map((item) =>
        buildAuthorSummary(item, publishedPages, currentPage, publicOrigin, delivery)
      ),
      categories: categories.map((item) =>
        buildCategorySummary(item, publishedPages, currentPage, publicOrigin, delivery)
      ),
      tags: tags.map((item) =>
        buildTagSummary(item, publishedPages, currentPage, publicOrigin, delivery)
      )
    },
    navigation: {
      ...buildPostNavigation(
        allPosts,
        primaryRecord,
        publishedPages,
        currentPage,
        publicOrigin,
        delivery
      ),
      authorPage: primaryAuthor
        ? resolveRecordPageLink({
            pages: publishedPages,
            sourceType: "blog-author",
            record: primaryAuthor,
            currentPage,
            publicOrigin,
            delivery
          })
        : null,
      primaryCategory: primaryCategory
        ? buildCategorySummary(primaryCategory, publishedPages, currentPage, publicOrigin, delivery)
        : null,
      breadcrumbs: primaryCategory
        ? buildBreadcrumbChain(
            categoriesById,
            primaryCategory,
            publishedPages,
            currentPage,
            publicOrigin,
            delivery
          )
        : []
    },
    related: {
      moreFromAuthor: pickRelatedPosts(relatedByAuthor, primaryRecord.id).map((item) =>
        buildPostCard(item, publishedPages, currentPage, publicOrigin, delivery)
      ),
      byCategory: pickRelatedPosts(relatedByCategory, primaryRecord.id).map((item) =>
        buildPostCard(item, publishedPages, currentPage, publicOrigin, delivery)
      ),
      byTag: pickRelatedPosts(relatedByTag, primaryRecord.id).map((item) =>
        buildPostCard(item, publishedPages, currentPage, publicOrigin, delivery)
      )
    },
    comments: {
      enabled: primaryRecord.allowComments !== false && primaryRecord.commentPolicy !== "closed",
      policy: primaryRecord.commentPolicy ?? "open",
      postId: primaryRecord.id ?? null
    }
  };
}

async function buildCategoryInitialApplicationModel(payload, collectionHandlerRegistry) {
  const primaryRecord = readPrimaryRecord(payload);
  if (!primaryRecord) {
    return null;
  }

  const categoriesHandler = collectionHandlerRegistry.get(CATEGORIES_COLLECTION_ID);
  const pagesHandler = collectionHandlerRegistry.get(PAGES_COLLECTION_ID);
  const publicOrigin = normalizeOptionalText(payload?.delivery?.publicOrigin);
  const delivery = payload?.delivery ?? {};
  const currentPage = payload?.page ?? null;
  const [publishedPages, categoryPosts, breadcrumbCategories] = await Promise.all([
    listHandlerItems(pagesHandler),
    Promise.resolve(toArray(payload?.data?.categoryPosts).map((entry) => entry?.record).filter(Boolean)),
    collectCategoryLineage(categoriesHandler, primaryRecord)
  ]);
  const parentCategory = breadcrumbCategories.length > 1 ? breadcrumbCategories[breadcrumbCategories.length - 2] : null;

  return {
    kind: "category-detail",
    category: {
      id: primaryRecord.id ?? null,
      name: primaryRecord.name ?? primaryRecord.slug ?? "Category",
      slug: primaryRecord.slug ?? null,
      description: primaryRecord.description ?? "",
      treePath: primaryRecord.path ?? "",
      depth: primaryRecord.depth ?? 0,
      featuredMedia: buildMediaSummary(primaryRecord.featuredMedia, delivery)
    },
    navigation: {
      parentCategory: parentCategory
        ? buildCategorySummary(parentCategory, publishedPages, currentPage, publicOrigin, delivery)
        : null,
      breadcrumbs: breadcrumbCategories.map((item) =>
        buildCategorySummary(item, publishedPages, currentPage, publicOrigin, delivery)
      )
    },
    children: [],
    posts: categoryPosts.map((item) =>
      buildPostCard(item, publishedPages, currentPage, publicOrigin, delivery)
    )
  };
}

async function buildCategoryFullApplicationModel(payload, collectionHandlerRegistry) {
  const primaryRecord = readPrimaryRecord(payload);
  if (!primaryRecord) {
    return null;
  }

  const categoriesHandler = collectionHandlerRegistry.get(CATEGORIES_COLLECTION_ID);
  const pagesHandler = collectionHandlerRegistry.get(PAGES_COLLECTION_ID);
  const publicOrigin = normalizeOptionalText(payload?.delivery?.publicOrigin);
  const delivery = payload?.delivery ?? {};
  const currentPage = payload?.page ?? null;
  const [allCategories, publishedPages] = await Promise.all([
    listHandlerItems(categoriesHandler),
    listHandlerItems(pagesHandler)
  ]);

  const categoriesById = new Map(allCategories.map((item) => [item.id, item]));
  const parentCategory = normalizeOptionalText(primaryRecord.parentCategoryId)
    ? categoriesById.get(primaryRecord.parentCategoryId) ?? null
    : null;
  const childCategories = allCategories.filter(
    (item) => normalizeOptionalText(item.parentCategoryId) === primaryRecord.id
  );
  const categoryPosts = toArray(payload?.data?.categoryPosts).map((entry) => entry?.record).filter(Boolean);

  return {
    kind: "category-detail",
    category: {
      id: primaryRecord.id ?? null,
      name: primaryRecord.name ?? primaryRecord.slug ?? "Category",
      slug: primaryRecord.slug ?? null,
      description: primaryRecord.description ?? "",
      treePath: primaryRecord.path ?? "",
      depth: primaryRecord.depth ?? 0,
      featuredMedia: buildMediaSummary(primaryRecord.featuredMedia, delivery)
    },
    navigation: {
      parentCategory: parentCategory
        ? buildCategorySummary(parentCategory, publishedPages, currentPage, publicOrigin, delivery)
        : null,
      breadcrumbs: buildBreadcrumbChain(
        categoriesById,
        primaryRecord,
        publishedPages,
        currentPage,
        publicOrigin,
        delivery
      )
    },
    children: childCategories.map((item) =>
      buildCategorySummary(item, publishedPages, currentPage, publicOrigin, delivery)
    ),
    posts: categoryPosts.map((item) =>
      buildPostCard(item, publishedPages, currentPage, publicOrigin, delivery)
    )
  };
}

function buildGenericApplicationModel(payload) {
  return {
    kind: "generic-page",
    title: payload?.head?.title ?? payload?.page?.title ?? "Page",
    description: payload?.head?.description ?? "",
    body: readPrimaryRecord(payload)?.body ?? ""
  };
}

function buildRouteManifestModel(primarySourceType) {
  if (primarySourceType === "blog-post") {
    return { kind: "post-detail" };
  }
  if (primarySourceType === "blog-category") {
    return { kind: "category-detail" };
  }
  return { kind: "generic-page" };
}

function resolveRouteDocumentIdToken(page = {}) {
  const pattern = resolvePathPattern(page);
  if (!pattern) {
    return null;
  }
  if (pattern.includes("{slug}")) {
    return "slug";
  }
  if (pattern.includes("{id}")) {
    return "id";
  }
  return null;
}

async function buildReaderRouteManifest(payload = {}, collectionHandlerRegistry, resolveSettingsRepository) {
  const pagesHandler = collectionHandlerRegistry?.get?.(PAGES_COLLECTION_ID);
  const layoutsHandler = collectionHandlerRegistry?.get?.(LAYOUTS_COLLECTION_ID);
  if (!pagesHandler || !layoutsHandler) {
    return {
      contractVersion: 1,
      currentPageId: payload?.page?.id ?? null,
      entries: []
    };
  }

  const mediaHandler = collectionHandlerRegistry?.get?.(MEDIA_ITEMS_COLLECTION_ID) ?? null;
  const [pages, layouts] = await Promise.all([
    listHandlerItems(pagesHandler),
    listHandlerItems(layoutsHandler)
  ]);
  const layoutsById = new Map(
    layouts.map((layout) => [
      layout.id,
      {
        ...layout,
        layoutDocument:
          layout?.layoutDocument ??
          parseStoredLayoutDocument(layout?.layoutDocumentJson)
      }
    ])
  );

  const candidatePages = pages.filter(
    (page) =>
      isPagePublished(page?.status) &&
      ROUTE_MANIFEST_SUPPORTED_SOURCE_TYPES.has(normalizeText(page?.primarySourceType))
  );

  const entries = await Promise.all(
    candidatePages.map(async (page) => {
      const layout = layoutsById.get(page?.layoutId) ?? null;
      const layoutDocument = layout?.layoutDocument ?? null;
      const manifestPayload = {
        page: {
          id: page?.id ?? null,
          title: page?.title ?? null,
          pageKind: page?.pageKind ?? null,
          primarySourceType: page?.primarySourceType ?? "none",
          path: page?.path ?? null
        },
        application: {
          model: buildRouteManifestModel(page?.primarySourceType)
        }
      };
      const { manifest } = resolvePageContextManifest(manifestPayload);
      const renderState = await buildPageWidgetRenderState({
        page,
        model: buildRouteManifestModel(page?.primarySourceType),
        layoutDocument,
        pageContextManifest: manifest,
        primarySourceType: page?.primarySourceType ?? null,
        pageKind: page?.pageKind ?? null,
        delivery: payload?.delivery ?? {},
        collectionHandlerRegistry,
        mediaResolver:
          mediaHandler && typeof mediaHandler.findById === "function"
            ? async (itemId) => mediaHandler.findById(itemId)
            : null,
        enforceCompatibility: false
      });
      const firestore = await resolvePublishedFirestoreCollectionDescriptor({
        collectionHandlerRegistry,
        resolveSettingsRepository,
        primarySourceType: page?.primarySourceType ?? "none"
      });
      const resolvedTheme = await resolvePageThemeSelection(collectionHandlerRegistry, page);

      return {
        pageId: page?.id ?? null,
        title: page?.title ?? null,
        pageKind: page?.pageKind ?? null,
        primarySourceType: page?.primarySourceType ?? "none",
        deploymentMode: page?.deploymentMode ?? null,
        path: normalizeOptionalText(page?.path) ?? null,
        pathPattern: resolvePathPattern(page),
        canonicalUrlPattern: normalizeOptionalText(page?.canonicalUrl) ?? null,
        contentSource: {
          projectId: firestore?.projectId ?? null,
          collectionPath: firestore?.collectionPath ?? null,
          documentIdToken: resolveRouteDocumentIdToken(page) ?? "slug"
        },
        layout: {
          pageId: page?.id ?? null,
          layoutId: page?.layoutId ?? null,
          layoutKey: page?.layoutKey ?? layout?.layoutKey ?? null,
          layoutModel: cloneJsonValue(resolveEffectiveLayoutModel(page)),
          bindings: cloneJsonValue(page?.bindings ?? {}),
          widgetRenderContract: cloneJsonValue(renderState?.widgetRenderContract ?? null)
        },
        theme: cloneJsonValue(resolvedTheme),
        pageContextManifest: cloneJsonValue(manifest ?? null)
      };
    })
  );

  return {
    contractVersion: 1,
    currentPageId: payload?.page?.id ?? null,
    entries
  };
}

function buildRouteIndexEntry(entry = {}, options = {}) {
  const includeLayout = options.includeLayout === true;
  const includeTheme = options.includeTheme === true;
  const baseEntry = {
    pageId: entry?.pageId ?? null,
    title: entry?.title ?? null,
    pageKind: entry?.pageKind ?? null,
    primarySourceType: entry?.primarySourceType ?? "none",
    deploymentMode: entry?.deploymentMode ?? null,
    path: normalizeOptionalText(entry?.path) ?? null,
    pathPattern: normalizeOptionalText(entry?.pathPattern) ?? null,
    canonicalUrlPattern: normalizeOptionalText(entry?.canonicalUrlPattern) ?? null,
    contentSource: entry?.contentSource
      ? {
          projectId: entry.contentSource.projectId ?? null,
          collectionPath: entry.contentSource.collectionPath ?? null,
          documentIdToken: entry.contentSource.documentIdToken ?? "slug"
        }
      : null
  };
  if (!includeLayout && !includeTheme) {
    return baseEntry;
  }
  return {
    ...baseEntry,
    ...(includeLayout ? { layout: cloneJsonValue(entry?.layout ?? null) } : {}),
    ...(includeTheme ? { theme: cloneJsonValue(entry?.theme ?? null) } : {}),
    pageContextManifest: cloneJsonValue(entry?.pageContextManifest ?? null)
  };
}

function buildInlineRouteManifest(routeManifest = null, payload = {}, versionToken = null) {
  const entries = toArray(routeManifest?.entries).map((entry) =>
    buildRouteIndexEntry(entry, {
      includeLayout: entry?.pageId === (payload?.page?.id ?? null),
      includeTheme: entry?.pageId === (payload?.page?.id ?? null)
    })
  );
  return {
    contractVersion: routeManifest?.contractVersion ?? 1,
    currentPageId: payload?.page?.id ?? null,
    assetUrl: resolveReaderRouteManifestAssetUrl(payload, versionToken),
    entries
  };
}

function buildApplicationReviewModel(payload) {
  return {
    pageId: payload?.page?.id ?? null,
    pagePath: payload?.page?.path ?? null,
    layoutId: payload?.renderModel?.layoutId ?? null,
    layoutKey: payload?.renderModel?.layoutKey ?? null,
    publicUrl: payload?.delivery?.publicUrl ?? null,
    resolvedAt: payload?.resolvedAt ?? null,
    seo: {
      title: payload?.head?.title ?? null,
      description: payload?.head?.description ?? null,
      canonicalUrl: payload?.head?.canonicalUrl ?? null,
      ogTitle: payload?.head?.openGraph?.title ?? null,
      ogDescription: payload?.head?.openGraph?.description ?? null
    }
  };
}

function buildReaderLayoutDocument(payload = {}) {
  const effectiveLayoutModel = resolveEffectiveLayoutModel(payload?.page ?? {});
  return {
    pageId: payload?.page?.id ?? null,
    layoutId: payload?.renderModel?.layoutId ?? null,
    layoutKey: payload?.renderModel?.layoutKey ?? null,
    layoutModel: payload?.renderModel?.layoutModel ?? effectiveLayoutModel,
    layoutDocument: payload?.renderModel?.layoutDocument ?? null,
    bindings: payload?.renderModel?.bindings ?? {},
    widgetRenderContract: payload?.application?.layout?.widgetRenderContract ?? null
  };
}

function buildReaderPageBootstrapDocument(payload = {}, model = null, routeManifest = null, options = {}) {
  const versionToken =
    normalizeOptionalText(options.routeManifestVersionToken) ??
    buildReaderRouteManifestVersionToken(routeManifest);
  const inlineRouteManifest = buildInlineRouteManifest(routeManifest, payload, versionToken);
  const sourceLocale =
    normalizeOptionalText(
      model?.kind === "post-detail"
        ? model?.post?.locale
        : model?.kind === "category-detail"
          ? model?.category?.locale
          : payload?.page?.locale
    ) ?? "en-US";
  return {
    contractVersion: 1,
    tier: "initial",
    path: payload?.page?.path ?? null,
    pageId: payload?.page?.id ?? null,
    sourceLocale,
    pageKind: model?.kind ?? "generic-page",
    primarySourceType: payload?.page?.primarySourceType ?? "none",
    head: payload?.head ?? {},
    delivery: payload?.delivery ?? {},
    layout: buildReaderLayoutDocument(payload),
    theme: cloneJsonValue(options.resolvedTheme ?? payload?.application?.theme ?? payload?.pageTheme ?? null),
    routeManifest: inlineRouteManifest,
    model,
    review: buildApplicationReviewModel(payload),
    resolvedAt: payload?.resolvedAt ?? null
  };
}

function buildReaderDeferredDocument(payload = {}, model = null) {
  const pageKind = model?.kind ?? "generic-page";
  if (pageKind === "post-detail") {
    return {
      contractVersion: 1,
      path: payload?.page?.path ?? null,
      pageId: payload?.page?.id ?? null,
      pageKind,
      deferred: {
        navigation: {
          previousPost: model?.navigation?.previousPost ?? null,
          nextPost: model?.navigation?.nextPost ?? null,
          authorPage: model?.navigation?.authorPage ?? null
        },
        related: model?.related ?? {
          moreFromAuthor: [],
          byCategory: [],
          byTag: []
        }
      },
      resolvedAt: payload?.resolvedAt ?? null
    };
  }
  if (pageKind === "category-detail") {
    return {
      contractVersion: 1,
      path: payload?.page?.path ?? null,
      pageId: payload?.page?.id ?? null,
      pageKind,
      deferred: {
        children: Array.isArray(model?.children) ? model.children : []
      },
      resolvedAt: payload?.resolvedAt ?? null
    };
  }
  return {
    contractVersion: 1,
    path: payload?.page?.path ?? null,
    pageId: payload?.page?.id ?? null,
    pageKind,
    deferred: {},
    resolvedAt: payload?.resolvedAt ?? null
  };
}

async function buildApplicationModel(payload = {}, collectionHandlerRegistry, options = {}) {
  const primarySourceType = normalizeText(payload?.page?.primarySourceType);
  const includeDeferred = options.includeDeferred === true;
  if (primarySourceType === "blog-post") {
    return includeDeferred
      ? buildPostFullApplicationModel(payload, collectionHandlerRegistry)
      : buildPostInitialApplicationModel(payload, collectionHandlerRegistry);
  }
  if (primarySourceType === "blog-category") {
    return includeDeferred
      ? buildCategoryFullApplicationModel(payload, collectionHandlerRegistry)
      : buildCategoryInitialApplicationModel(payload, collectionHandlerRegistry);
  }
  return buildGenericApplicationModel(payload);
}

export async function buildPublicApplicationViewPayload(payload = {}, options = {}) {
  const collectionHandlerRegistry = options.collectionHandlerRegistry;
  const model = await buildApplicationModel(payload, collectionHandlerRegistry, {
    includeDeferred: true
  });
  const resolvedTheme = await resolvePageThemeSelection(collectionHandlerRegistry, payload?.page ?? {});
  const applicationPayload = await attachPageWidgetRenderContract(
    {
      ...payload,
      application: {
        model,
        theme: resolvedTheme
      }
    },
    {
      collectionHandlerRegistry,
      enforceCompatibility: false
    }
  );
  return {
    ok: true,
    contractVersion: 1,
    pagePath: payload?.page?.path ?? null,
    page: {
      id: payload?.page?.id ?? null,
      path: payload?.page?.path ?? null,
      primarySourceType: payload?.page?.primarySourceType ?? "none"
    },
    head: payload?.head ?? {},
    delivery: payload?.delivery ?? {},
    model,
    theme: resolvedTheme,
    layout: applicationPayload?.application?.layout ?? null,
    review: buildApplicationReviewModel(payload),
    resolvedAt: payload?.resolvedAt ?? null
  };
}

export async function buildReaderPageBootstrapPayload(payload = {}, options = {}) {
  const collectionHandlerRegistry = options.collectionHandlerRegistry;
  const model = await buildApplicationModel(payload, collectionHandlerRegistry, {
    includeDeferred: false
  });
  const resolvedTheme = await resolvePageThemeSelection(collectionHandlerRegistry, payload?.page ?? {});
  const routeManifest = await buildReaderRouteManifest(
    payload,
    collectionHandlerRegistry,
    options.resolveSettingsRepository
  );
  const applicationPayload = await attachPageWidgetRenderContract(
    {
      ...payload,
      application: {
        model,
        theme: resolvedTheme
      }
    },
    {
      collectionHandlerRegistry,
      enforceCompatibility: false
    }
  );
  return buildReaderPageBootstrapDocument(applicationPayload, model, routeManifest, {
    resolvedTheme
  });
}

export async function buildReaderDeferredPayload(payload = {}, options = {}) {
  const collectionHandlerRegistry = options.collectionHandlerRegistry;
  const model = await buildApplicationModel(payload, collectionHandlerRegistry, {
    includeDeferred: true
  });
  return buildReaderDeferredDocument(payload, model);
}

export async function attachPageApplicationPayload(payload = {}, options = {}) {
  const collectionHandlerRegistry = options.collectionHandlerRegistry;
  let model = null;
  try {
    model = await buildApplicationModel(payload, collectionHandlerRegistry, {
      includeDeferred: false
    });
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    const primarySourceType = normalizeText(payload?.page?.primarySourceType);
    throw new Error(`[page-application] failed to build model for '${primarySourceType || "generic"}': ${message}`, {
      cause: error
    });
  }
  const resolvedTheme = await resolvePageThemeSelection(collectionHandlerRegistry, payload?.page ?? {});
  const routeManifest =
    options.routeManifestDocument ??
    (await buildReaderRouteManifest(
      payload,
      collectionHandlerRegistry,
      options.resolveSettingsRepository
    ));
  const routeManifestVersionToken =
    normalizeOptionalText(options.routeManifestVersionToken) ??
    buildReaderRouteManifestVersionToken(routeManifest);
  const applicationAwarePayload = {
    ...payload,
    pageTheme: resolvedTheme,
    application: buildReaderPageBootstrapDocument(payload, model, routeManifest, {
      routeManifestVersionToken,
      resolvedTheme
    })
  };
  return attachPageWidgetRenderContract(applicationAwarePayload, {
    collectionHandlerRegistry,
    enforceCompatibility: options.enforceWidgetCompatibility === true
  });
}

export function buildStaticReaderPayload(payload = {}) {
  return {
    contractVersion: payload?.contractVersion ?? 1,
    page: payload?.page ?? {},
    head: payload?.head ?? {},
    delivery: payload?.delivery ?? {},
    application: payload?.application ?? null,
    resolvedAt: payload?.resolvedAt ?? null
  };
}

export { buildReaderRouteManifest };
