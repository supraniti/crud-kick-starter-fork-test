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

export function normalizeDraftFromSources(post = {}) {
  const primaryAuthorId = readItemValue(post, "primaryAuthorId");
  return {
    id: readItemValue(post, "id", null),
    ...pickFields(post, DRAFT_TEXT_FIELDS, (value) => value ?? ""),
    ...pickFields(post, DRAFT_LIST_FIELDS, toArray),
    status: readItemValue(post, "status", "draft"),
    canonicalUrl: readItemValue(post, "canonicalUrl"),
    seoTitle: readItemValue(post, "seoTitle"),
    seoDescription: readItemValue(post, "seoDescription"),
    ogTitle: readItemValue(post, "ogTitle"),
    ogDescription: readItemValue(post, "ogDescription"),
    ogImageMediaId: readItemValue(post, "ogImageMediaId"),
    scheduledOn: readItemValue(post, "scheduledOn"),
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

export function computeHealth(post) {
  const issues = [];
  if (!post?.seoTitle || !post?.seoDescription) {
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
