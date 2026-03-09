export const MODULE_ID = "test-modules-pages";
export const POSTS_COLLECTION_ID = "blog-posts";
export const PAGES_COLLECTION_ID = "blog-pages";
export const REDIRECTS_COLLECTION_ID = "blog-redirect-rules";
export const PUBLISHABLE_STATUS = "scheduled";
export const PAGE_STATUS_SET = new Set(["draft", "in-review", "scheduled", "published", "archived"]);

const HTTP_CODE_SET = new Set(["301", "302", "307", "308"]);
const REDIRECT_STATUS_SET = new Set(["active", "disabled"]);

export function toTimestamp(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function normalizeTrimmedText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalText(value) {
  const normalized = normalizeTrimmedText(value);
  return normalized.length > 0 ? normalized : null;
}

export function hasUrlProtocol(value) {
  return /^[a-z]+:\/\//i.test(normalizeTrimmedText(value));
}

export function normalizeSourcePath(value) {
  const normalized = normalizeTrimmedText(value);
  if (normalized.length === 0 || hasUrlProtocol(normalized)) {
    return normalized;
  }

  const withoutQuery = normalized.split(/[?#]/, 1)[0].replace(/\/{2,}/g, "/");
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1);
  }
  return withLeadingSlash;
}

export function normalizePagePath(value) {
  const normalized = normalizeTrimmedText(value);
  if (normalized.length === 0 || hasUrlProtocol(normalized)) {
    return normalized;
  }

  const withoutQuery = normalized.split(/[?#]/, 1)[0].replace(/\/{2,}/g, "/");
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1);
  }
  return withLeadingSlash;
}

function normalizeEnumValue(value, allowedValues, fallback) {
  const normalized = normalizeTrimmedText(value).toLowerCase();
  return allowedValues.has(normalized) ? normalized : fallback;
}

export function normalizeHttpCode(value, fallback = "301") {
  return normalizeEnumValue(value, HTTP_CODE_SET, fallback);
}

export function normalizeRedirectStatus(value, fallback = "active") {
  return normalizeEnumValue(value, REDIRECT_STATUS_SET, fallback);
}

export function normalizePageStatus(value, fallback = "draft") {
  return normalizeEnumValue(value, PAGE_STATUS_SET, fallback);
}

