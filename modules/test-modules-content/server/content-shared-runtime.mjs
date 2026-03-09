import { createHash } from "node:crypto";
import { createComputedResolverRegistry } from "../../../server/src/core/shared/capability-contracts/local-kernel/computed-resolver-catalog.mjs";

const MODULE_ID = "test-modules-content";
const POSTS_COLLECTION_ID = "blog-posts";
const REVISIONS_COLLECTION_ID = "blog-post-revisions";

const POST_STATUS_ORDER = Object.freeze([
  "draft",
  "in-review",
  "scheduled",
  "published",
  "archived"
]);
const POST_STATUS_SET = new Set(POST_STATUS_ORDER);
const PUBLISH_ROLE_SET = new Set(["editor", "managing-editor"]);
const REVISION_SOURCE_SET = new Set(["manual", "autosave", "rollback", "import"]);

const { slugify } = createComputedResolverRegistry({
  slugifyMaxLength: 120
});

function toTimestamp(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value) {
  return isNonEmptyString(value) ? value.trim() : null;
}

function normalizeIdList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = [];
  const seen = new Set();
  for (const item of value) {
    if (!isNonEmptyString(item)) {
      continue;
    }
    const token = item.trim();
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);
    normalized.push(token);
  }
  return normalized;
}

function sanitizeHtmlContent(value) {
  if (!isNonEmptyString(value)) {
    return "";
  }

  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<\/?(?:iframe|object|embed|link|meta)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\sjavascript:/gi, " ")
    .trim();
}

function stripHtml(value) {
  return sanitizeHtmlContent(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeWordCount(value) {
  const text = stripHtml(value);
  return text.length > 0 ? text.split(" ").length : 0;
}

function computeReadTimeMinutes(wordCount) {
  if (!Number.isFinite(wordCount) || wordCount <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(wordCount / 225));
}

function normalizeLifecycleStatus(value, fallback = "draft") {
  const normalized = normalizeText(value).toLowerCase();
  return POST_STATUS_SET.has(normalized) ? normalized : fallback;
}

function normalizeRevisionSource(value, fallback = "manual") {
  const normalized = normalizeText(value).toLowerCase();
  return REVISION_SOURCE_SET.has(normalized) ? normalized : fallback;
}

function normalizeIsoTimestamp(value) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildPostSnapshot(post = {}) {
  return {
    titleSnapshot: normalizeText(post.title),
    subtitleSnapshot: normalizeOptionalText(post.subtitle),
    excerptSnapshot: normalizeOptionalText(post.excerpt),
    bodySnapshot: sanitizeHtmlContent(post.body),
    taxonomySnapshot: {
      categoryIds: normalizeIdList(post.categoryIds),
      tagIds: normalizeIdList(post.tagIds)
    },
    mediaSnapshot: {
      featuredMediaId: normalizeOptionalText(post.featuredMediaId),
      galleryMediaIds: normalizeIdList(post.galleryMediaIds),
      ogImageMediaId: normalizeOptionalText(post.ogImageMediaId)
    },
    seoSnapshot: {
      canonicalUrl: normalizeOptionalText(post.canonicalUrl),
      seoTitle: normalizeOptionalText(post.seoTitle),
      seoDescription: normalizeOptionalText(post.seoDescription),
      ogTitle: normalizeOptionalText(post.ogTitle),
      ogDescription: normalizeOptionalText(post.ogDescription)
    },
    statusSnapshot: normalizeLifecycleStatus(post.status)
  };
}

function computeContentHash(post = {}) {
  return createHash("sha1")
    .update(
      JSON.stringify({
        title: normalizeText(post.title),
        subtitle: normalizeOptionalText(post.subtitle),
        excerpt: normalizeOptionalText(post.excerpt),
        body: sanitizeHtmlContent(post.body),
        status: normalizeLifecycleStatus(post.status),
        format: normalizeOptionalText(post.format),
        primaryAuthorId: normalizeOptionalText(post.primaryAuthorId),
        coAuthorIds: normalizeIdList(post.coAuthorIds),
        categoryIds: normalizeIdList(post.categoryIds),
        tagIds: normalizeIdList(post.tagIds),
        featuredMediaId: normalizeOptionalText(post.featuredMediaId),
        galleryMediaIds: normalizeIdList(post.galleryMediaIds),
        seoTitle: normalizeOptionalText(post.seoTitle),
        seoDescription: normalizeOptionalText(post.seoDescription),
        ogTitle: normalizeOptionalText(post.ogTitle),
        ogDescription: normalizeOptionalText(post.ogDescription),
        ogImageMediaId: normalizeOptionalText(post.ogImageMediaId)
      })
    )
    .digest("hex");
}

function buildRevisionRecord(post, meta = {}, revisionNumber = 1) {
  const snapshot = buildPostSnapshot(post);
  return {
    postId: post.id,
    revisionNumber,
    ...snapshot,
    scheduledOnSnapshot: normalizeIsoTimestamp(post.scheduledOn),
    publishedOnSnapshot: normalizeIsoTimestamp(post.publishedOn),
    archivedOnSnapshot: normalizeIsoTimestamp(post.archivedOn),
    changeSummary: normalizeOptionalText(meta.changeSummary),
    source: normalizeRevisionSource(meta.source),
    isAutosave: meta.isAutosave === true,
    changedByAuthorId:
      normalizeOptionalText(meta.changedByAuthorId) ??
      normalizeOptionalText(post.updatedByAuthorId) ??
      normalizeOptionalText(post.createdByAuthorId),
    changedOn: normalizeIsoTimestamp(meta.changedOn) ?? toTimestamp(),
    contentHash: computeContentHash(post)
  };
}

export {
  MODULE_ID,
  POSTS_COLLECTION_ID,
  POST_STATUS_ORDER,
  POST_STATUS_SET,
  PUBLISH_ROLE_SET,
  REVISIONS_COLLECTION_ID,
  buildPostSnapshot,
  buildRevisionRecord,
  computeContentHash,
  computeReadTimeMinutes,
  computeWordCount,
  isNonEmptyString,
  normalizeIdList,
  normalizeIsoTimestamp,
  normalizeLifecycleStatus,
  normalizeOptionalText,
  normalizeRevisionSource,
  normalizeText,
  sanitizeHtmlContent,
  slugify,
  stripHtml,
  toTimestamp
};

