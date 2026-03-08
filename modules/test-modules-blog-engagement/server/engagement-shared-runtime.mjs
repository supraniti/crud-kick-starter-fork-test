export const MODULE_ID = "test-modules-blog-engagement";
export const COMMENTS_COLLECTION_ID = "blog-comments";
export const POSTS_COLLECTION_ID = "blog-posts";
export const AUTHORS_COLLECTION_ID = "blog-authors";
export const MIN_COMMENT_BODY_LENGTH = 12;
export const MODERATION_ROLE_SET = new Set(["editor", "managing-editor"]);

const STATUS_SET = new Set(["pending", "approved", "rejected", "spam"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function toTimestamp() {
  return new Date().toISOString();
}

export function normalizeTrimmedText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalText(value) {
  const normalized = normalizeTrimmedText(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeEmail(value) {
  const normalized = normalizeTrimmedText(value).toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isValidEmail(value) {
  return typeof value === "string" && EMAIL_PATTERN.test(value);
}

export function normalizeCommentStatus(value, fallback = "pending") {
  const normalized = normalizeTrimmedText(value).toLowerCase();
  return STATUS_SET.has(normalized) ? normalized : fallback;
}

export function isModeratedStatus(status) {
  return status === "approved" || status === "rejected" || status === "spam";
}
