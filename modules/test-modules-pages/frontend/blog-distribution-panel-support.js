export const PAGE_STATUS_OPTIONS = ["draft", "in-review", "scheduled", "published", "archived"];

export const PAGE_KIND_OPTIONS = ["standalone", "content-detail", "listing", "profile"];

export const PRIMARY_SOURCE_TYPE_OPTIONS = [
  "none",
  "blog-post",
  "blog-author",
  "blog-category",
  "blog-tag"
];

export const DATA_SOURCE_KIND_OPTIONS = [
  "record-by-id",
  "posts-by-author",
  "posts-by-category",
  "posts-by-tag"
];

export const DATA_SOURCE_SOURCE_TYPE_OPTIONS = [
  "blog-post",
  "blog-author",
  "blog-category",
  "blog-tag"
];

export const DATA_SOURCE_SORT_KEY_OPTIONS = ["updatedOn", "publishedOn", "title"];

export const SORT_DIRECTION_OPTIONS = ["asc", "desc"];

export const TEMPLATE_KEY_OPTIONS = [
  "page-shell",
  "content-detail",
  "listing",
  "profile",
  "landing"
];

export const HERO_VARIANT_OPTIONS = ["standard", "immersive", "minimal"];

export const REDIRECT_STATUS_OPTIONS = ["active", "disabled"];

export const REDIRECT_HTTP_CODE_OPTIONS = ["301", "302", "307", "308"];

export function formatTimestamp(value, fallback = "Not set") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function resolveOptionLabel(options = [], id, fallback = "Not configured") {
  return options.find((option) => option.id === id)?.label ?? fallback;
}

export function resolveSourceLabel(sourceOptionsByType, sourceType, itemId) {
  if (!sourceType || sourceType === "none") {
    return "Standalone";
  }

  return resolveOptionLabel(
    sourceOptionsByType[sourceType] ?? [],
    itemId,
    `${sourceType}: ${itemId || "unset"}`
  );
}

export function jsonPreview(value) {
  return value ? JSON.stringify(value, null, 2) : "No delivery payload loaded yet.";
}
