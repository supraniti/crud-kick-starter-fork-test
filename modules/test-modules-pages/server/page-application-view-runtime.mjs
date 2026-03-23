import {
  AUTHORS_COLLECTION_ID,
  CATEGORIES_COLLECTION_ID,
  PAGES_COLLECTION_ID,
  POSTS_COLLECTION_ID,
  TAGS_COLLECTION_ID,
  isPagePublished,
  isPerRecordDeploymentMode,
  normalizeOptionalText,
  normalizePagePath
} from "./distribution-shared-runtime.mjs";

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

function resolveRecordPageLink({
  pages = [],
  sourceType,
  record,
  publicOrigin,
  delivery = {}
}) {
  if (!record) {
    return null;
  }
  const candidates = selectPublishedPagesBySourceType(pages, sourceType);
  for (const page of candidates) {
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

function buildTagSummary(tag = {}, pages = [], publicOrigin = null, delivery = {}) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-tag",
    record: tag,
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

function buildCategorySummary(category = {}, pages = [], publicOrigin = null, delivery = {}) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-category",
    record: category,
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

function buildAuthorSummary(author = {}, pages = [], publicOrigin = null, delivery = {}) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-author",
    record: author,
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

function buildPostCard(post = {}, pages = [], publicOrigin = null, delivery = {}) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-post",
    record: post,
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

function buildBreadcrumbChain(categoriesById, category = null, pages = [], publicOrigin = null, delivery = {}) {
  const chain = [];
  let cursor = category;
  const visited = new Set();
  while (cursor && cursor.id && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    chain.unshift(buildCategorySummary(cursor, pages, publicOrigin, delivery));
    const parentId = normalizeOptionalText(cursor.parentCategoryId);
    cursor = parentId ? categoriesById.get(parentId) ?? null : null;
  }
  return chain;
}

function buildPostNavigation(posts = [], currentPost = {}, pages = [], publicOrigin = null, delivery = {}) {
  const ordered = sortByPublishedAscending(posts.filter((entry) => entry?.status === "published"));
  const index = ordered.findIndex((entry) => entry.id === currentPost.id);
  return {
    previousPost: index > 0 ? buildPostCard(ordered[index - 1], pages, publicOrigin, delivery) : null,
    nextPost:
      index >= 0 && index < ordered.length - 1
        ? buildPostCard(ordered[index + 1], pages, publicOrigin, delivery)
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

async function buildPostApplicationModel(payload, collectionHandlerRegistry) {
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
      author: primaryAuthor ? buildAuthorSummary(primaryAuthor, publishedPages, publicOrigin, delivery) : null,
      coAuthors: coAuthors.map((item) => buildAuthorSummary(item, publishedPages, publicOrigin, delivery)),
      categories: categories.map((item) => buildCategorySummary(item, publishedPages, publicOrigin, delivery)),
      tags: tags.map((item) => buildTagSummary(item, publishedPages, publicOrigin, delivery))
    },
    navigation: {
      ...buildPostNavigation(allPosts, primaryRecord, publishedPages, publicOrigin, delivery),
      authorPage: primaryAuthor
        ? resolveRecordPageLink({
            pages: publishedPages,
            sourceType: "blog-author",
            record: primaryAuthor,
            publicOrigin,
            delivery
          })
        : null,
      primaryCategory: primaryCategory ? buildCategorySummary(primaryCategory, publishedPages, publicOrigin, delivery) : null,
      breadcrumbs: primaryCategory
        ? buildBreadcrumbChain(categoriesById, primaryCategory, publishedPages, publicOrigin, delivery)
        : []
    },
    related: {
      moreFromAuthor: pickRelatedPosts(relatedByAuthor, primaryRecord.id).map((item) =>
        buildPostCard(item, publishedPages, publicOrigin, delivery)
      ),
      byCategory: pickRelatedPosts(relatedByCategory, primaryRecord.id).map((item) =>
        buildPostCard(item, publishedPages, publicOrigin, delivery)
      ),
      byTag: pickRelatedPosts(relatedByTag, primaryRecord.id).map((item) =>
        buildPostCard(item, publishedPages, publicOrigin, delivery)
      )
    },
    comments: {
      enabled: primaryRecord.allowComments !== false && primaryRecord.commentPolicy !== "closed",
      policy: primaryRecord.commentPolicy ?? "open",
      postId: primaryRecord.id ?? null
    }
  };
}

async function buildCategoryApplicationModel(payload, collectionHandlerRegistry) {
  const primaryRecord = readPrimaryRecord(payload);
  if (!primaryRecord) {
    return null;
  }

  const categoriesHandler = collectionHandlerRegistry.get(CATEGORIES_COLLECTION_ID);
  const pagesHandler = collectionHandlerRegistry.get(PAGES_COLLECTION_ID);
  const publicOrigin = normalizeOptionalText(payload?.delivery?.publicOrigin);
  const delivery = payload?.delivery ?? {};
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
      parentCategory: parentCategory ? buildCategorySummary(parentCategory, publishedPages, publicOrigin, delivery) : null,
      breadcrumbs: buildBreadcrumbChain(categoriesById, primaryRecord, publishedPages, publicOrigin, delivery)
    },
    children: childCategories.map((item) => buildCategorySummary(item, publishedPages, publicOrigin, delivery)),
    posts: categoryPosts.map((item) => buildPostCard(item, publishedPages, publicOrigin, delivery))
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

export async function attachPageApplicationPayload(payload = {}, options = {}) {
  const collectionHandlerRegistry = options.collectionHandlerRegistry;
  const primarySourceType = normalizeText(payload?.page?.primarySourceType);
  let model = null;
  try {
    if (primarySourceType === "blog-post") {
      model = await buildPostApplicationModel(payload, collectionHandlerRegistry);
    } else if (primarySourceType === "blog-category") {
      model = await buildCategoryApplicationModel(payload, collectionHandlerRegistry);
    } else {
      model = buildGenericApplicationModel(payload);
    }
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    throw new Error(`[page-application] failed to build model for '${primarySourceType || "generic"}': ${message}`, {
      cause: error
    });
  }

  return {
    ...payload,
    application: {
      contractVersion: 1,
      model,
      review: buildApplicationReviewModel(payload)
    }
  };
}
