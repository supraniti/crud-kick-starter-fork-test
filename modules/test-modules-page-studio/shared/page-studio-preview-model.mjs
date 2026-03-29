import {
  buildPredefinedThemeRecords,
  resolveThemeDocumentForPreview
} from "../../test-modules-themes/shared/theme-document.mjs";
import {
  inferPageStudioPrimaryQuery,
  resolvePageStudioContextContract
} from "./page-studio-queries.mjs";

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

function buildPostPath(studioDocument, post, { useStudioRoute = false } = {}) {
  const slug = normalizeText(post?.slug, "story");
  if (!useStudioRoute) {
    return `/post/${slug}`;
  }
  const routePath = normalizeText(studioDocument?.infra?.routePath, "/journal/:slug");
  return buildResolvedPath(routePath, {
    slug,
    id: normalizeText(post?.id, "story")
  });
}

function buildCategoryPath(category, studioDocument = null, { useStudioRoute = false } = {}) {
  const slug = normalizeText(category?.slug, "category");
  if (useStudioRoute && studioDocument) {
    return buildResolvedPath(normalizeText(studioDocument?.infra?.routePath, "/category/:slug"), {
      slug,
      id: normalizeText(category?.id, slug)
    });
  }
  return `/category/${slug}`;
}

function buildAuthorPath(author) {
  const slug = normalizeText(author?.slug, "author");
  return `/author/${slug}`;
}

function buildCategorySummary(category, categoriesById, mediaById, studioDocument = null, { useStudioRoute = false } = {}) {
  if (!category) {
    return null;
  }
  const featuredMedia = category.featuredMediaId ? mediaById.get(category.featuredMediaId) ?? null : null;
  const path = buildCategoryPath(category, studioDocument, { useStudioRoute });
  return {
    id: category.id ?? null,
    name: category.name ?? category.slug ?? "Category",
    slug: category.slug ?? null,
    description: category.description ?? "",
    path,
    publicUrl: path,
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

function buildPostCard(post, studioDocument, mediaById, { useStudioRoute = false } = {}) {
  if (!post) {
    return null;
  }
  const featuredMedia = post.featuredMediaId ? mediaById.get(post.featuredMediaId) ?? null : null;
  const path = buildPostPath(studioDocument, post, { useStudioRoute });
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
    path,
    publicUrl: path,
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
    moreFromAuthor: relatedByAuthor.slice(0, 3).map((item) => buildPostCard(item, studioDocument, mediaById, { useStudioRoute: true })).filter(Boolean),
    byCategory: relatedByCategory.slice(0, 3).map((item) => buildPostCard(item, studioDocument, mediaById, { useStudioRoute: true })).filter(Boolean),
    byTag: relatedByTag.slice(0, 3).map((item) => buildPostCard(item, studioDocument, mediaById, { useStudioRoute: true })).filter(Boolean)
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
  const inferred = resolvePageStudioContextContract(studioDocument);
  const path = buildResolvedPath(studioDocument?.infra?.routePath, previewParams);
  return {
    id: "page-studio-preview",
    title: normalizeText(studioDocument?.title, "Page Studio Preview"),
    path,
    pathPattern: normalizeText(studioDocument?.infra?.routePath, "/preview"),
    pageKind: inferred.pageKind ?? "generic-page",
    primarySourceType: inferred.primarySourceType ?? "none",
    status: "draft",
    themeKey: normalizeText(studioDocument?.infra?.themeKey, "global-default")
  };
}

function sortItemsByKey(items = [], sortKey = "publishedOn", sortDirection = "desc") {
  const direction = normalizeText(sortDirection, "desc") === "asc" ? 1 : -1;
  const key = normalizeText(sortKey, "publishedOn");
  return [...toArray(items)].sort((left, right) => {
    const leftValue = left?.[key] ?? "";
    const rightValue = right?.[key] ?? "";
    if (typeof leftValue === "number" || typeof rightValue === "number") {
      return ((Number(leftValue) || 0) - (Number(rightValue) || 0)) * direction;
    }
    const leftTime = Date.parse(leftValue);
    const rightTime = Date.parse(rightValue);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return (leftTime - rightTime) * direction;
    }
    return String(leftValue).localeCompare(String(rightValue)) * direction;
  });
}

function pickQueryParamValue(query, previewParams = {}) {
  const paramId = normalizeText(query?.paramId, "slug");
  const value = previewParams?.[paramId];
  return normalizeText(value, "");
}

function findRecordByLookup(items = [], lookupField = "slug", lookupValue = "") {
  const normalizedLookupValue = normalizeText(lookupValue, "");
  if (!normalizedLookupValue) {
    return toArray(items)[0] ?? null;
  }
  return (
    toArray(items).find((entry) => normalizeText(entry?.[lookupField], "") === normalizedLookupValue) ??
    toArray(items)[0] ??
    null
  );
}

function resolveQueryRuntime({
  studioDocument,
  collections,
  previewParams = {}
}) {
  const posts = sortPublishedPosts(collections.posts).filter(Boolean);
  const publishedPosts = posts.filter((entry) => entry?.status === "published");
  const effectivePosts = publishedPosts.length > 0 ? publishedPosts : posts;
  const authorsById = buildLookup(collections.authors);
  const categoriesById = buildLookup(collections.categories);
  const tagsById = buildLookup(collections.tags);
  const mediaById = buildLookup(collections.mediaItems);
  const queries = toArray(studioDocument?.infra?.queries);
  const queryResults = {};
  let primaryPost = null;
  let primaryCategory = null;

  for (const query of queries) {
    if (query.kind === "primary-post-by-param") {
      primaryPost = findRecordByLookup(effectivePosts, normalizeText(query.lookupField, "slug"), pickQueryParamValue(query, previewParams));
      queryResults[query.bindAs] = primaryPost;
      continue;
    }
    if (query.kind === "primary-category-by-param") {
      primaryCategory = findRecordByLookup(collections.categories, normalizeText(query.lookupField, "slug"), pickQueryParamValue(query, previewParams));
      queryResults[query.bindAs] = primaryCategory;
      continue;
    }

    let matchingPosts = [];
    if (query.kind === "posts-by-author" || query.kind === "related-posts-by-author") {
      const authorId = normalizeOptionalText(query.itemId) ?? primaryPost?.primaryAuthorId ?? null;
      matchingPosts = effectivePosts.filter(
        (entry) => entry.primaryAuthorId === authorId || toArray(entry.coAuthorIds).includes(authorId)
      );
    } else if (query.kind === "posts-by-category" || query.kind === "related-posts-by-category") {
      const categoryId =
        normalizeOptionalText(query.itemId) ??
        primaryCategory?.id ??
        toArray(primaryPost?.categoryIds)[0] ??
        null;
      matchingPosts = effectivePosts.filter((entry) => toArray(entry.categoryIds).includes(categoryId));
    } else if (query.kind === "posts-by-tag" || query.kind === "related-posts-by-tag") {
      const tagId = normalizeOptionalText(query.itemId) ?? toArray(primaryPost?.tagIds)[0] ?? null;
      matchingPosts = effectivePosts.filter((entry) => toArray(entry.tagIds).includes(tagId));
    }

    if (query.kind.startsWith("related-") && primaryPost?.id) {
      matchingPosts = matchingPosts.filter((entry) => entry.id !== primaryPost.id);
    }
    const limit = Number(query.limit);
    queryResults[query.bindAs] = sortItemsByKey(
      matchingPosts,
      query.sortKey,
      query.sortDirection
    ).slice(0, Number.isFinite(limit) && limit > 0 ? limit : matchingPosts.length);
  }

  return {
    posts: effectivePosts,
    authorsById,
    categoriesById,
    tagsById,
    mediaById,
    queryResults,
    primaryPost,
    primaryCategory
  };
}

function readQueryItemsByKind(studioDocument, queryRuntime, kind) {
  const matchingQuery = toArray(studioDocument?.infra?.queries).find((entry) => entry?.kind === kind);
  if (!matchingQuery?.bindAs) {
    return [];
  }
  return toArray(queryRuntime.queryResults?.[matchingQuery.bindAs]);
}

export function buildPageStudioPreviewModel({ studioDocument, collections, previewParams = {} }) {
  const descriptor = buildPageStudioPreviewDescriptor(studioDocument, previewParams);
  const queryRuntime = resolveQueryRuntime({
    studioDocument,
    collections,
    previewParams
  });

  if (descriptor.primarySourceType === "blog-post") {
    const post = queryRuntime.primaryPost;
    if (!post) {
      return {
        ok: false,
        issue: "No post matched the authored primary post query.",
        page: descriptor,
        model: null
      };
    }

    const primaryAuthor = queryRuntime.authorsById.get(post.primaryAuthorId) ?? null;
    const categories = toArray(post.categoryIds).map((id) => queryRuntime.categoriesById.get(id)).filter(Boolean);
    const tags = toArray(post.tagIds).map((id) => queryRuntime.tagsById.get(id)).filter(Boolean);
    const primaryCategory = categories[0] ?? null;
    const breadcrumbs = buildCategoryLineage(primaryCategory, queryRuntime.categoriesById).map((item) =>
      buildCategorySummary(item, queryRuntime.categoriesById, queryRuntime.mediaById)
    );
    const orderedPosts = sortPublishedPosts(queryRuntime.posts);
    const currentIndex = orderedPosts.findIndex((entry) => entry.id === post.id);
    const previousPost = currentIndex > 0 ? orderedPosts[currentIndex - 1] : null;
    const nextPost = currentIndex >= 0 && currentIndex < orderedPosts.length - 1 ? orderedPosts[currentIndex + 1] : null;
    const galleryMedia = toArray(post.galleryMediaIds).map((id) => queryRuntime.mediaById.get(id)).filter(Boolean);
    const relatedFallback = buildRelatedPosts(queryRuntime.posts, post, studioDocument, queryRuntime.mediaById);
    const relatedByAuthor = readQueryItemsByKind(studioDocument, queryRuntime, "related-posts-by-author")
      .map((item) => buildPostCard(item, studioDocument, queryRuntime.mediaById, { useStudioRoute: true }))
      .filter(Boolean);
    const relatedByCategory = readQueryItemsByKind(studioDocument, queryRuntime, "related-posts-by-category")
      .map((item) => buildPostCard(item, studioDocument, queryRuntime.mediaById, { useStudioRoute: true }))
      .filter(Boolean);
    const relatedByTag = readQueryItemsByKind(studioDocument, queryRuntime, "related-posts-by-tag")
      .map((item) => buildPostCard(item, studioDocument, queryRuntime.mediaById, { useStudioRoute: true }))
      .filter(Boolean);

    return {
      ok: true,
      issue: null,
      page: {
        ...descriptor,
        path: buildPostPath(studioDocument, post, { useStudioRoute: true })
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
          path: buildPostPath(studioDocument, post, { useStudioRoute: true }),
          publicUrl: buildPostPath(studioDocument, post, { useStudioRoute: true }),
          featuredMedia: buildMediaSummary(post.featuredMediaId ? queryRuntime.mediaById.get(post.featuredMediaId) ?? null : null),
          galleryMedia: galleryMedia.map((item) => buildMediaSummary(item)).filter(Boolean),
          author: buildAuthorSummary(primaryAuthor, queryRuntime.mediaById),
          coAuthors: [],
          categories: categories.map((item) => buildCategorySummary(item, queryRuntime.categoriesById, queryRuntime.mediaById)).filter(Boolean),
          tags: tags.map((item) => buildTagSummary(item)).filter(Boolean)
        },
        navigation: {
          previousPost: previousPost ? buildPostCard(previousPost, studioDocument, queryRuntime.mediaById, { useStudioRoute: true }) : null,
          nextPost: nextPost ? buildPostCard(nextPost, studioDocument, queryRuntime.mediaById, { useStudioRoute: true }) : null,
          authorPage: primaryAuthor
            ? {
                id: primaryAuthor.id ?? null,
                title: primaryAuthor.displayName ?? "Author",
                path: buildAuthorPath(primaryAuthor),
                publicUrl: buildAuthorPath(primaryAuthor)
              }
            : null,
          primaryCategory: primaryCategory ? buildCategorySummary(primaryCategory, queryRuntime.categoriesById, queryRuntime.mediaById) : null,
          breadcrumbs
        },
        related: {
          moreFromAuthor: relatedByAuthor.length > 0 ? relatedByAuthor : relatedFallback.moreFromAuthor,
          byCategory: relatedByCategory.length > 0 ? relatedByCategory : relatedFallback.byCategory,
          byTag: relatedByTag.length > 0 ? relatedByTag : relatedFallback.byTag
        },
        comments: {
          enabled: post.allowComments !== false && post.commentPolicy !== "closed",
          policy: post.commentPolicy ?? "open",
          postId: post.id ?? null
        }
      }
    };
  }

  if (descriptor.primarySourceType === "blog-category") {
    const category = queryRuntime.primaryCategory;
    if (!category) {
      return {
        ok: false,
        issue: "No category matched the authored primary category query.",
        page: descriptor,
        model: null
      };
    }

    const categoryPosts = readQueryItemsByKind(studioDocument, queryRuntime, "posts-by-category");
    const posts = (categoryPosts.length > 0
      ? categoryPosts
      : queryRuntime.posts.filter((entry) => toArray(entry.categoryIds).includes(category.id))
    ).map((item) => buildPostCard(item, studioDocument, queryRuntime.mediaById)).filter(Boolean);
    const children = toArray(collections.categories)
      .filter((entry) => normalizeOptionalText(entry.parentCategoryId) === category.id)
      .map((entry) => buildCategorySummary(entry, queryRuntime.categoriesById, queryRuntime.mediaById))
      .filter(Boolean);
    const breadcrumbs = buildCategoryLineage(category, queryRuntime.categoriesById).map((item, index, items) =>
      buildCategorySummary(
        item,
        queryRuntime.categoriesById,
        queryRuntime.mediaById,
        studioDocument,
        { useStudioRoute: index === items.length - 1 }
      )
    );

    return {
      ok: true,
      issue: null,
      page: {
        ...descriptor,
        path: buildCategoryPath(category, studioDocument, { useStudioRoute: true })
      },
      sourceRecordId: category.id,
      model: {
        kind: "category-detail",
        category: buildCategorySummary(category, queryRuntime.categoriesById, queryRuntime.mediaById, studioDocument, {
          useStudioRoute: true
        }),
        navigation: {
          primaryCategory: buildCategorySummary(category, queryRuntime.categoriesById, queryRuntime.mediaById, studioDocument, {
            useStudioRoute: true
          }),
          breadcrumbs
        },
        children,
        posts
      }
    };
  }

    return {
      ok: false,
      issue: `Preview has no authored query contract for source '${descriptor.primarySourceType}'.`,
      page: descriptor,
      model: null
    };
  }

export function resolvePageStudioPreviewTheme(studioDocument, themeItems = []) {
  return resolveThemeSelection(studioDocument, themeItems);
}
