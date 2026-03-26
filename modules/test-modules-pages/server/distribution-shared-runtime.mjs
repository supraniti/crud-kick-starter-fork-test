export const MODULE_ID = "test-modules-pages";
export const DEFAULT_APP_MOUNT_TAG_NAME = "app-root";
export const POSTS_COLLECTION_ID = "blog-posts";
export const AUTHORS_COLLECTION_ID = "blog-authors";
export const CATEGORIES_COLLECTION_ID = "blog-categories";
export const TAGS_COLLECTION_ID = "blog-tags";
export const PAGES_COLLECTION_ID = "blog-pages";
export const REDIRECTS_COLLECTION_ID = "blog-redirect-rules";
export const LAYOUTS_COLLECTION_ID = "page-layouts";
export const DEPLOYMENT_ARTIFACTS_COLLECTION_ID = "page-deployment-artifacts";
export const DEPLOYMENT_BUNDLES_COLLECTION_ID = "page-deployment-bundles";
export const DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID = "page-deployment-bundle-runs";
export const REMOTE_CONNECTIONS_COLLECTION_ID = "remote-connection-profiles";
export const REMOTE_TARGETS_COLLECTION_ID = "remote-target-profiles";
export const REMOTE_OPERATION_RUNS_COLLECTION_ID = "remote-operation-runs";

export const PAGE_KIND_SET = new Set(["standalone", "content-detail", "listing", "profile"]);
export const PAGE_STATUS_SET = new Set(["draft", "in-review", "scheduled", "published", "archived"]);
export const SOURCE_TYPE_SET = new Set(["none", "blog-post", "blog-author", "blog-category", "blog-tag"]);
export const PRIMARY_SOURCE_TYPE_SET = new Set(["blog-post", "blog-author", "blog-category", "blog-tag"]);
export const DEPLOYMENT_MODE_SET = new Set(["single-page", "per-record"]);
export const SOURCE_SELECTION_MODE_SET = new Set(["none", "specific-record", "all-records"]);
export const DATA_SOURCE_KIND_SET = new Set([
  "record-by-id",
  "posts-by-author",
  "posts-by-category",
  "posts-by-tag"
]);
export const DEPLOYMENT_STATUS_SET = new Set(["clean", "stale", "missing", "error"]);
export const DEPLOYMENT_ARTIFACT_STATUS_SET = new Set([
  "synced",
  "stale",
  "missing",
  "orphaned",
  "error"
]);
export const DATA_SOURCE_SORT_KEY_SET = new Set(["updatedOn", "publishedOn", "title"]);
export const DATA_SOURCE_SORT_DIRECTION_SET = new Set(["asc", "desc"]);
export const LAYOUT_TEMPLATE_SET = new Set([
  "page-shell",
  "content-detail",
  "listing",
  "profile",
  "landing"
]);
export const HERO_VARIANT_SET = new Set(["standard", "immersive", "minimal"]);
export const HTTP_CODE_SET = new Set(["301", "302", "307", "308"]);
export const REDIRECT_STATUS_SET = new Set(["active", "disabled"]);

const SOURCE_COLLECTION_BY_TYPE = Object.freeze({
  "blog-post": POSTS_COLLECTION_ID,
  "blog-author": AUTHORS_COLLECTION_ID,
  "blog-category": CATEGORIES_COLLECTION_ID,
  "blog-tag": TAGS_COLLECTION_ID
});

const DEFAULT_LAYOUT_MODEL = Object.freeze({
  templateKey: "page-shell",
  heroVariant: "standard",
  themeKey: null,
  heroBinding: "primary",
  bodyBinding: "primary",
  supportingBinding: "supporting",
  sectionOrder: ["hero", "body", "supporting"]
});

const DEFAULT_RENDER_POLICY = Object.freeze({
  publishModel: "live-reference",
  serverRenderMode: "resolved-page-payload",
  clientBootstrapMode: "page-payload",
  followUpMode: "page-by-path"
});

export function toTimestamp(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
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

function normalizeRelativePath(value) {
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

export function normalizeSourcePath(value) {
  return normalizeRelativePath(value);
}

export function normalizePagePath(value) {
  return normalizeRelativePath(value);
}

export function hasUnsafePathSegments(value) {
  const normalized = normalizePagePath(value);
  const segments = normalized
    .split("/")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return segments.some((segment) => segment === "." || segment === "..");
}

function normalizeEnumValue(value, allowedValues, fallback) {
  const normalized = normalizeTrimmedText(value).toLowerCase();
  if (normalized.length === 0) {
    return fallback;
  }
  const matchedValue = [...allowedValues].find(
    (candidate) => candidate.toLowerCase() === normalized
  );
  return matchedValue ?? fallback;
}

export function normalizePageKind(value, fallback = "standalone") {
  return normalizeEnumValue(value, PAGE_KIND_SET, fallback);
}

export function normalizePageStatus(value, fallback = "draft") {
  return normalizeEnumValue(value, PAGE_STATUS_SET, fallback);
}

export function normalizeDeploymentMode(value, fallback = "single-page") {
  return normalizeEnumValue(value, DEPLOYMENT_MODE_SET, fallback);
}

export function normalizeSourceSelectionMode(value, fallback = "none") {
  return normalizeEnumValue(value, SOURCE_SELECTION_MODE_SET, fallback);
}

export function normalizeDeploymentStatus(value, fallback = "missing") {
  return normalizeEnumValue(value, DEPLOYMENT_STATUS_SET, fallback);
}

export function normalizeDeploymentArtifactStatus(value, fallback = "missing") {
  return normalizeEnumValue(value, DEPLOYMENT_ARTIFACT_STATUS_SET, fallback);
}

export function normalizePrimarySourceType(value, fallback = "none") {
  return normalizeEnumValue(value, SOURCE_TYPE_SET, fallback);
}

export function normalizeLayoutTemplate(value, fallback = DEFAULT_LAYOUT_MODEL.templateKey) {
  return normalizeEnumValue(value, LAYOUT_TEMPLATE_SET, fallback);
}

export function normalizeHeroVariant(value, fallback = DEFAULT_LAYOUT_MODEL.heroVariant) {
  return normalizeEnumValue(value, HERO_VARIANT_SET, fallback);
}

export function normalizeHttpCode(value, fallback = "301") {
  return normalizeEnumValue(value, HTTP_CODE_SET, fallback);
}

export function normalizeRedirectStatus(value, fallback = "active") {
  return normalizeEnumValue(value, REDIRECT_STATUS_SET, fallback);
}

export function normalizeSortKey(value, fallback = "updatedOn") {
  return normalizeEnumValue(value, DATA_SOURCE_SORT_KEY_SET, fallback);
}

export function normalizeSortDirection(value, fallback = "desc") {
  return normalizeEnumValue(value, DATA_SOURCE_SORT_DIRECTION_SET, fallback);
}

export function normalizePositiveInteger(value, fallback, { min = 1, max = 50 } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const normalized = Math.trunc(numeric);
  if (normalized < min) {
    return min;
  }
  if (normalized > max) {
    return max;
  }
  return normalized;
}

export function normalizeScriptUrlList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((entry) =>
        typeof entry === "string"
          ? entry
          : entry && typeof entry === "object"
            ? entry.url
            : ""
      )
      .map(normalizeTrimmedText)
      .filter(Boolean)
  )];
}

export function buildDefaultLayoutModel(overrides = {}) {
  const sectionOrder = Array.isArray(overrides.sectionOrder)
    ? overrides.sectionOrder.filter((value) => typeof value === "string" && value.trim().length > 0)
    : DEFAULT_LAYOUT_MODEL.sectionOrder;

  return {
    templateKey: normalizeLayoutTemplate(overrides.templateKey),
    heroVariant: normalizeHeroVariant(overrides.heroVariant),
    themeKey: normalizeOptionalText(overrides.themeKey) ?? DEFAULT_LAYOUT_MODEL.themeKey,
    heroBinding: normalizeOptionalText(overrides.heroBinding) ?? DEFAULT_LAYOUT_MODEL.heroBinding,
    bodyBinding: normalizeOptionalText(overrides.bodyBinding) ?? DEFAULT_LAYOUT_MODEL.bodyBinding,
    supportingBinding:
      normalizeOptionalText(overrides.supportingBinding) ?? DEFAULT_LAYOUT_MODEL.supportingBinding,
    sectionOrder: sectionOrder.length > 0 ? sectionOrder : [...DEFAULT_LAYOUT_MODEL.sectionOrder]
  };
}

export function buildDefaultRenderPolicy(overrides = {}) {
  return {
    publishModel: "live-reference",
    serverRenderMode: "resolved-page-payload",
    clientBootstrapMode: "page-payload",
    followUpMode:
      normalizeTrimmedText(overrides.followUpMode) === "page-by-id"
        ? "page-by-id"
        : DEFAULT_RENDER_POLICY.followUpMode
  };
}

export function normalizeAppMountTagName(
  value,
  fallback = DEFAULT_APP_MOUNT_TAG_NAME
) {
  const normalized = normalizeTrimmedText(value).toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(normalized)) {
    return fallback;
  }
  return normalized;
}

export function resolveSourceCollectionId(sourceType) {
  return SOURCE_COLLECTION_BY_TYPE[normalizePrimarySourceType(sourceType, "none")] ?? null;
}

export function buildDefaultPrimarySource(sourceType = "none", itemId = null) {
  const normalizedType = normalizePrimarySourceType(sourceType);
  if (normalizedType === "none") {
    return null;
  }
  return {
    sourceType: normalizedType,
    itemId: normalizeOptionalText(itemId),
    bindAs: "primary"
  };
}

export function isPagePublished(status) {
  return normalizePageStatus(status) === "published";
}

export function isPerRecordDeploymentMode(value) {
  return normalizeDeploymentMode(value) === "per-record";
}
