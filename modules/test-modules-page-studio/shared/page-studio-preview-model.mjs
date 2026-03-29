import {
  buildPredefinedThemeRecords,
  resolveThemeDocumentForPreview
} from "../../test-modules-themes/shared/theme-document.mjs";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildLocalMediaUrl(mediaItemId) {
  return mediaItemId
    ? `/api/reference/modules/test-modules-media-manager/media-items/${encodeURIComponent(mediaItemId)}/content`
    : null;
}

function buildMediaSummary(mediaItem = null) {
  if (!mediaItem || typeof mediaItem !== "object") {
    return null;
  }
  return {
    id: mediaItem.id ?? null,
    displayName: mediaItem.displayName ?? mediaItem.id ?? "Media",
    altText: mediaItem.altText ?? mediaItem.displayName ?? "",
    description: mediaItem.description ?? "",
    preferredUrl: mediaItem.preferredUrl ?? mediaItem.localContentUrl ?? buildLocalMediaUrl(mediaItem.id),
    width: mediaItem.width ?? null,
    height: mediaItem.height ?? null,
    relativePath: mediaItem.relativePath ?? null
  };
}

function buildLookup(items = []) {
  return new Map(toArray(items).map((item) => [item.id, item]));
}

function buildSlugLookup(items = []) {
  return new Map(
    toArray(items)
      .filter((item) => normalizeOptionalText(item?.slug))
      .map((item) => [item.slug, item])
  );
}

function sortPublishedPosts(items = []) {
  return [...toArray(items)].sort((left, right) => {
    const leftTime = new Date(left?.publishedOn ?? left?.updatedOn ?? 0).getTime();
    const rightTime = new Date(right?.publishedOn ?? right?.updatedOn ?? 0).getTime();
    return leftTime - rightTime;
  });
}

function replaceRouteToken(routePath, tokenName, value) {
  return routePath
    .replace(new RegExp(`:${tokenName}(?=/|$)`, "g"), value)
    .replace(new RegExp(`\\{${tokenName}\\}`, "g"), value);
}

function buildResolvedPath(routePath, params = {}) {
  const safeRoutePath = normalizeText(routePath, "/preview");
  const slugValue = normalizeText(params.slug, "preview");
  const idValue = normalizeText(params.id, slugValue);
  return replaceRouteToken(replaceRouteToken(safeRoutePath, "slug", slugValue), "id", idValue);
}

function buildPostPath(studioDocument, post) {
  const routePath = normalizeText(studioDocument?.infra?.routePath, "/journal/:slug");
  return buildResolvedPath(routePath, {
    slug: normalizeText(post?.slug, "story"),
    id: normalizeText(post?.id, "story")
  });
}

function buildCategoryPath(category) {
  const slug = normalizeText(category?.slug, "category");
  return `/category/${slug}`;
}

function buildAuthorPath(author) {
  const slug = normalizeText(author?.slug, "author");
  return `/author/${slug}`;
}

function buildCategorySummary(category, categoriesById, mediaById) {
  if (!category) {
    return null;
  }
  const featuredMedia = category.featuredMediaId ? mediaById.get(category.featuredMediaId) ?? null : null;
  return {
    id: category.id ?? null,
    name: category.name ?? category.slug ?? "Category",
    slug: category.slug ?? null,
    description: category.description ?? "",
    path: buildCategoryPath(category),
    publicUrl: buildCategoryPath(category),
    treePath: category.path ?? "",
    depth: category.depth ?? 0,
    featuredMedia: buildMediaSummary(featuredMedia)
  };
}

function buildAuthorSummary(author, mediaById) {
  if (!author) {
    return null;
  }
  const avatarMedia = author.avatarMediaId ? mediaById.get(author.avatarMediaId) ?? null : null;
  return {
    id: author.id ?? null,
    displayName: author.displayName ?? author.slug ?? "Author",
    slug: author.slug ?? null,
    bio: author.bio ?? "",
    role: author.role ?? null,
    locale: author.locale ?? null,
    avatarMedia: buildMediaSummary(avatarMedia),
    path: buildAuthorPath(author),
    publicUrl: buildAuthorPath(author)
  };
}

function buildTagSummary(tag) {
  if (!tag) {
    return null;
  }
  return {
    id: tag.id ?? null,
    name: tag.name ?? tag.slug ?? "Tag",
    slug: tag.slug ?? null,
    description: tag.description ?? "",
    path: `/tag/${normalizeText(tag.slug, "tag")}`,
    publicUrl: `/tag/${normalizeText(tag.slug, "tag")}`
  };
}

function buildPostCard(post, studioDocument, mediaById) {
  if (!post) {
    return null;
  }
  const featuredMedia = post.featuredMediaId ? mediaById.get(post.featuredMediaId) ?? null : null;
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
    path: buildPostPath(studioDocument, post),
    publicUrl: buildPostPath(studioDocument, post),
    featuredMedia: buildMediaSummary(featuredMedia)
  };
}

function buildCategoryLineage(category, categoriesById) {
  const lineage = [];
  const visited = new Set();
  let cursor = category;
  while (cursor?.id && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    lineage.unshift(cursor);
    const parentId = normalizeOptionalText(cursor.parentCategoryId);
    cursor = parentId ? categoriesById.get(parentId) ?? null : null;
  }
  return lineage;
}

function uniqueById(items = []) {
  const seen = new Set();
  return toArray(items).filter((item) => {
    const itemId = item?.id ?? null;
    if (!itemId || seen.has(itemId)) {
      return false;
    }
    seen.add(itemId);
    return true;
  });
}

function buildRelatedPosts(posts, currentPost, studioDocument, mediaById) {
  const relatedByAuthor = posts.filter(
    (entry) => entry.id !== currentPost.id && entry.primaryAuthorId === currentPost.primaryAuthorId && entry.status === "published"
  );
  const relatedByCategory = posts.filter(
    (entry) =>
      entry.id !== currentPost.id &&
      entry.status === "published" &&
      toArray(entry.categoryIds).some((categoryId) => toArray(currentPost.categoryIds).includes(categoryId))
  );
  const relatedByTag = posts.filter(
    (entry) =>
      entry.id !== currentPost.id &&
      entry.status === "published" &&
      toArray(entry.tagIds).some((tagId) => toArray(currentPost.tagIds).includes(tagId))
  );

  return {
    moreFromAuthor: relatedByAuthor.slice(0, 3).map((item) => buildPostCard(item, studioDocument, mediaById)).filter(Boolean),
    byCategory: relatedByCategory.slice(0, 3).map((item) => buildPostCard(item, studioDocument, mediaById)).filter(Boolean),
    byTag: relatedByTag.slice(0, 3).map((item) => buildPostCard(item, studioDocument, mediaById)).filter(Boolean)
  };
}

function inferStudioPageKind(studioDocument) {
  const routePath = normalizeText(studioDocument?.infra?.routePath, "").toLowerCase();
  const querySourceTypes = toArray(studioDocument?.infra?.queries).map((entry) =>
    normalizeText(entry?.sourceType, "").toLowerCase()
  );
  if (routePath.includes("/post") || routePath.includes("/journal") || querySourceTypes.includes("blog-post")) {
    return {
      pageKind: "post-detail",
      primarySourceType: "blog-post"
    };
  }
  if (routePath.includes("/category") || querySourceTypes.includes("blog-category")) {
    return {
      pageKind: "category-detail",
      primarySourceType: "blog-category"
    };
  }
  return {
    pageKind: "generic-page",
    primarySourceType: "none"
  };
}

function resolveThemeSelection(studioDocument, themeItems = []) {
  const themeKey = normalizeText(studioDocument?.infra?.themeKey, "global-default");
  const persistedItems = toArray(themeItems);
  const predefinedItems = buildPredefinedThemeRecords();
  const effectiveItems = persistedItems.length > 0 ? persistedItems : predefinedItems;
  const explicitTheme =
    effectiveItems.find((item) => normalizeText(item?.themeKey, "") === themeKey) ?? null;
  const globalTheme = effectiveItems.find((item) => item?.isGlobalDefault === true) ?? effectiveItems[0] ?? null;
  const selected = explicitTheme ?? globalTheme;
  const themeDocument =
    selected?.themeDocument ??
    (selected?.themeDocumentJson ? JSON.parse(selected.themeDocumentJson) : null) ??
    (predefinedItems[0]?.themeDocumentJson ? JSON.parse(predefinedItems[0].themeDocumentJson) : {});
  return resolveThemeDocumentForPreview(themeDocument);
}

export function buildPageStudioPreviewDescriptor(studioDocument, previewParams = {}) {
  const inferred = inferStudioPageKind(studioDocument);
  const path = buildResolvedPath(studioDocument?.infra?.routePath, previewParams);
  return {
    id: "page-studio-preview",
    title: normalizeText(studioDocument?.title, "Page Studio Preview"),
    path,
    pathPattern: normalizeText(studioDocument?.infra?.routePath, "/preview"),
    pageKind: inferred.pageKind,
    primarySourceType: inferred.primarySourceType,
    status: "draft",
    themeKey: normalizeText(studioDocument?.infra?.themeKey, "global-default")
  };
}

export function buildPageStudioPreviewModel({ studioDocument, collections, previewParams = {} }) {
  const descriptor = buildPageStudioPreviewDescriptor(studioDocument, previewParams);
  if (descriptor.primarySourceType !== "blog-post") {
    return {
      ok: false,
      issue: `Preview is only wired for post-detail routes in this slice. Current source: ${descriptor.primarySourceType}.`,
      page: descriptor,
      model: null
    };
  }

  const allPosts = sortPublishedPosts(collections.posts).filter(Boolean);
  const publishedPosts = allPosts.filter((entry) => entry?.status === "published");
  const authorsById = buildLookup(collections.authors);
  const categoriesById = buildLookup(collections.categories);
  const tagsById = buildLookup(collections.tags);
  const mediaById = buildLookup(collections.mediaItems);
  const posts = publishedPosts.length > 0 ? publishedPosts : allPosts;
  const postsBySlug = buildSlugLookup(posts);
  const activeSlug = normalizeText(previewParams.slug, normalizeText(studioDocument?.preview?.urlParams?.slug, ""));
  const post = postsBySlug.get(activeSlug) ?? posts[0] ?? null;

  if (!post) {
    return {
      ok: false,
      issue: "No posts are available for preview.",
      page: descriptor,
      model: null
    };
  }

  const primaryAuthor = authorsById.get(post.primaryAuthorId) ?? null;
  const categories = toArray(post.categoryIds).map((id) => categoriesById.get(id)).filter(Boolean);
  const tags = toArray(post.tagIds).map((id) => tagsById.get(id)).filter(Boolean);
  const primaryCategory = categories[0] ?? null;
  const breadcrumbs = buildCategoryLineage(primaryCategory, categoriesById).map((item) =>
    buildCategorySummary(item, categoriesById, mediaById)
  );
  const orderedPosts = sortPublishedPosts(posts);
  const currentIndex = orderedPosts.findIndex((entry) => entry.id === post.id);
  const previousPost = currentIndex > 0 ? orderedPosts[currentIndex - 1] : null;
  const nextPost = currentIndex >= 0 && currentIndex < orderedPosts.length - 1 ? orderedPosts[currentIndex + 1] : null;
  const galleryMedia = toArray(post.galleryMediaIds).map((id) => mediaById.get(id)).filter(Boolean);

  return {
    ok: true,
    issue: null,
    page: {
      ...descriptor,
      path: buildPostPath(studioDocument, post)
    },
    sourceRecordId: post.id,
    model: {
      kind: "post-detail",
      post: {
        id: post.id ?? null,
        title: post.title ?? "Untitled post",
        slug: post.slug ?? null,
        subtitle: post.subtitle ?? "",
        excerpt: post.excerpt ?? "",
        body: post.body ?? "",
        format: post.format ?? "article",
        locale: post.locale ?? null,
        readTimeMinutes: post.readTimeMinutes ?? null,
        wordCount: post.wordCount ?? null,
        publishedOn: post.publishedOn ?? null,
        updatedOn: post.updatedOn ?? null,
        featuredMedia: buildMediaSummary(post.featuredMediaId ? mediaById.get(post.featuredMediaId) ?? null : null),
        galleryMedia: galleryMedia.map((item) => buildMediaSummary(item)).filter(Boolean),
        author: buildAuthorSummary(primaryAuthor, mediaById),
        coAuthors: [],
        categories: categories.map((item) => buildCategorySummary(item, categoriesById, mediaById)).filter(Boolean),
        tags: tags.map((item) => buildTagSummary(item)).filter(Boolean)
      },
      navigation: {
        previousPost: previousPost ? buildPostCard(previousPost, studioDocument, mediaById) : null,
        nextPost: nextPost ? buildPostCard(nextPost, studioDocument, mediaById) : null,
        authorPage: primaryAuthor
          ? {
              id: primaryAuthor.id ?? null,
              title: primaryAuthor.displayName ?? "Author",
              path: buildAuthorPath(primaryAuthor),
              publicUrl: buildAuthorPath(primaryAuthor)
            }
          : null,
        primaryCategory: primaryCategory ? buildCategorySummary(primaryCategory, categoriesById, mediaById) : null,
        breadcrumbs
      },
      related: buildRelatedPosts(posts, post, studioDocument, mediaById),
      comments: {
        enabled: post.allowComments !== false && post.commentPolicy !== "closed",
        policy: post.commentPolicy ?? "open",
        postId: post.id ?? null
      }
    }
  };
}

export function resolvePageStudioPreviewTheme(studioDocument, themeItems = []) {
  return resolveThemeSelection(studioDocument, themeItems);
}
