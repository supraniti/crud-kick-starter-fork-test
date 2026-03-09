import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../../frontend/src/api/reference.js";

export const PAGES_COLLECTION_ID = "blog-pages";

const DRAFT_LIST_FIELDS = Object.freeze(["coAuthorIds", "categoryIds", "tagIds", "galleryMediaIds"]);
const DRAFT_TEXT_FIELDS = Object.freeze([
  "title",
  "subtitle",
  "excerpt",
  "body",
  "primaryAuthorId",
  "featuredMediaId",
  "locale",
  "translationGroupId"
]);

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function readItemValue(item, fieldId, fallback = "") {
  return item?.[fieldId] ?? fallback;
}

function pickFields(item, fieldIds, normalizeValue) {
  return Object.fromEntries(fieldIds.map((fieldId) => [fieldId, normalizeValue(item?.[fieldId])]));
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildDefaultPath(post = {}) {
  const slug = typeof post?.slug === "string" ? post.slug.trim() : "";
  return slug.length > 0 ? `/blog/${slug}` : "";
}

function createPublicationState() {
  return {
    loading: false,
    errorMessage: null,
    items: []
  };
}

function pickPublicationValue(page, post, fieldId, fallback = "") {
  return page?.[fieldId] ?? post?.[fieldId] ?? fallback;
}

export function normalizeDraftFromSources(post = {}, page = null) {
  const primaryAuthorId = readItemValue(post, "primaryAuthorId");
  return {
    ...pickFields(post, DRAFT_TEXT_FIELDS, (value) => value ?? ""),
    ...pickFields(post, DRAFT_LIST_FIELDS, toArray),
    path: readItemValue(page, "path", buildDefaultPath(post)),
    status: pickPublicationValue(page, post, "status", "draft"),
    canonicalUrl: pickPublicationValue(page, post, "canonicalUrl", ""),
    seoTitle: pickPublicationValue(page, post, "seoTitle", ""),
    seoDescription: pickPublicationValue(page, post, "seoDescription", ""),
    ogTitle: pickPublicationValue(page, post, "ogTitle", ""),
    ogDescription: pickPublicationValue(page, post, "ogDescription", ""),
    ogImageMediaId: pickPublicationValue(page, post, "ogImageMediaId", ""),
    scheduledOn: pickPublicationValue(page, post, "scheduledOn", ""),
    allowComments: post?.allowComments !== false,
    commentPolicy: readItemValue(post, "commentPolicy", "open"),
    format: readItemValue(post, "format", "article"),
    createdByAuthorId: readItemValue(post, "createdByAuthorId", primaryAuthorId),
    updatedByAuthorId: readItemValue(post, "updatedByAuthorId", primaryAuthorId)
  };
}

export function createEmptyDraft() {
  return normalizeDraftFromSources({
    status: "draft",
    format: "article",
    allowComments: true,
    commentPolicy: "open"
  });
}

export function buildPostMutationPayload(draft, currentPost = null) {
  return {
    title: draft.title,
    subtitle: draft.subtitle,
    excerpt: draft.excerpt,
    body: draft.body,
    status: draft.status,
    format: draft.format,
    primaryAuthorId: draft.primaryAuthorId,
    coAuthorIds: toArray(draft.coAuthorIds),
    categoryIds: toArray(draft.categoryIds),
    tagIds: toArray(draft.tagIds),
    featuredMediaId: draft.featuredMediaId || null,
    galleryMediaIds: toArray(draft.galleryMediaIds),
    allowComments: draft.allowComments === true,
    commentPolicy: draft.commentPolicy,
    canonicalUrl: draft.canonicalUrl || null,
    seoTitle: draft.seoTitle || null,
    seoDescription: draft.seoDescription || null,
    ogTitle: draft.ogTitle || null,
    ogDescription: draft.ogDescription || null,
    ogImageMediaId: draft.ogImageMediaId || null,
    scheduledOn: draft.scheduledOn || null,
    locale: draft.locale || null,
    translationGroupId: draft.translationGroupId || null,
    createdByAuthorId:
      draft.createdByAuthorId || currentPost?.createdByAuthorId || draft.primaryAuthorId,
    updatedByAuthorId: draft.updatedByAuthorId || draft.primaryAuthorId
  };
}

function buildPageMutationPayload(draft, post, currentPage = null) {
  return {
    sourceType: currentPage?.sourceType ?? "blog-post",
    sourcePostId: post.id,
    path: normalizeOptionalText(draft.path) ?? buildDefaultPath(post),
    layoutKey: currentPage?.layoutKey ?? "blog-post",
    status: draft.status,
    canonicalUrl: normalizeOptionalText(draft.canonicalUrl),
    seoTitle: normalizeOptionalText(draft.seoTitle),
    seoDescription: normalizeOptionalText(draft.seoDescription),
    ogTitle: normalizeOptionalText(draft.ogTitle),
    ogDescription: normalizeOptionalText(draft.ogDescription),
    ogImageMediaId: normalizeOptionalText(draft.ogImageMediaId),
    scheduledOn: normalizeOptionalText(draft.scheduledOn),
    publishedOn: currentPage?.publishedOn ?? post?.publishedOn ?? null,
    archivedOn: currentPage?.archivedOn ?? post?.archivedOn ?? null
  };
}

async function loadPublicationPages() {
  const payload = await fetchReferenceCollectionItems({
    collectionId: PAGES_COLLECTION_ID,
    limit: 200
  });
  return toArray(payload?.items);
}

async function findPageByPostId(postId) {
  const payload = await fetchReferenceCollectionItems({
    collectionId: PAGES_COLLECTION_ID,
    sourcePostId: postId,
    limit: 2
  });
  return toArray(payload?.items)[0] ?? null;
}

export function usePublicationPages() {
  const [publicationState, setPublicationState] = useState(createPublicationState);

  const reloadPublicationPages = useCallback(async () => {
    setPublicationState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));

    try {
      const items = await loadPublicationPages();
      setPublicationState({
        loading: false,
        errorMessage: null,
        items
      });
    } catch (error) {
      setPublicationState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load publication pages",
        items: []
      });
    }
  }, []);

  useEffect(() => {
    void reloadPublicationPages();
  }, [reloadPublicationPages]);

  const pageByPostId = useMemo(
    () =>
      new Map(
        publicationState.items
          .filter((page) => typeof page?.sourcePostId === "string" && page.sourcePostId.length > 0)
          .map((page) => [page.sourcePostId, page])
      ),
    [publicationState.items]
  );

  return {
    publicationState,
    pageByPostId,
    reloadPublicationPages
  };
}

export async function persistPublicationPage({ draft, post, currentPage = null }) {
  if (!post?.id) {
    return {
      ok: false,
      error: {
        message: "Cannot persist publication page without a saved post"
      }
    };
  }

  const payload = buildPageMutationPayload(draft, post, currentPage);
  const resolvedPage = currentPage ?? (await findPageByPostId(post.id));

  return resolvedPage?.id
    ? updateReferenceCollectionItem({
        collectionId: PAGES_COLLECTION_ID,
        itemId: resolvedPage.id,
        item: payload
      })
    : createReferenceCollectionItem({
        collectionId: PAGES_COLLECTION_ID,
        item: payload
      });
}

export function computeHealth(post, page = null) {
  const issues = [];
  const publication = page ?? null;
  if (!(publication?.seoTitle ?? post?.seoTitle) || !(publication?.seoDescription ?? post?.seoDescription)) {
    issues.push("seo");
  }
  if (!Array.isArray(post?.categoryIds) || post.categoryIds.length === 0) {
    issues.push("taxonomy");
  }
  if (!post?.featuredMediaId) {
    issues.push("media");
  }
  if (!post?.body || String(post.body).trim().length < 120) {
    issues.push("body");
  }
  return issues;
}
