import { createServer } from "node:http";
import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePageContextManifest } from "../../server/page-context-manifest-runtime.mjs";
import { buildPageWidgetRenderState } from "../../server/page-widget-render-contract-runtime.mjs";
import { buildTranslationProjectionDocumentId } from "../../../test-modules-translations/shared/translation-entry.mjs";

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
const POSTS_COLLECTION_PATH = "publishedPosts";
const PAGES_COLLECTION_PATH = "publishedPages";
const CATEGORIES_COLLECTION_PATH = "publicCategories";
const TAGS_COLLECTION_PATH = "publicTags";
const TRANSLATIONS_COLLECTION_PATH =
  normalizeCollectionPath(process.env.PUBLIC_PAGE_API_TRANSLATIONS_COLLECTION) ?? "publicTranslations";
const COMMENTS_COLLECTION_PATH =
  normalizeText(process.env.PUBLIC_PAGE_API_COMMENTS_COLLECTION) ?? "publicComments";
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_PAGES_STATE_PATH = path.resolve(
  CURRENT_DIR,
  "../../../../server/runtime/module-data/test-modules-pages-state.json"
);
const LOCAL_LAYOUTS_STATE_PATH = path.resolve(
  CURRENT_DIR,
  "../../../../server/runtime/module-data/test-modules-layouts-state.json"
);
const ALLOWED_COLLECTIONS = new Set(
  String(
    process.env.PUBLIC_PAGE_API_ALLOWED_COLLECTIONS
      ?? `${POSTS_COLLECTION_PATH},${PAGES_COLLECTION_PATH},${CATEGORIES_COLLECTION_PATH},${TAGS_COLLECTION_PATH},${TRANSLATIONS_COLLECTION_PATH}`
  )
    .split(",")
    .map((entry) => normalizeText(entry))
    .filter(Boolean)
);
ALLOWED_COLLECTIONS.add(COMMENTS_COLLECTION_PATH);
ALLOWED_COLLECTIONS.add(TRANSLATIONS_COLLECTION_PATH);
const ALLOWED_PROJECT_ID = normalizeText(process.env.PUBLIC_PAGE_API_PROJECT_ID);
const ALLOW_COMMENTS = String(process.env.PUBLIC_PAGE_API_ALLOW_COMMENTS ?? "true").toLowerCase() !== "false";

function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCollectionPath(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.replace(/^\/+|\/+$/g, "") : null;
}

function normalizeDocumentId(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.replace(/^\/+|\/+$/g, "") : null;
}

function normalizeEmail(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function parseStatusFilter(value) {
  const statuses = String(value ?? "approved")
    .split(",")
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
  return statuses.length > 0 ? statuses : ["approved"];
}

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value);
}

function setCorsHeaders(response) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function sendJson(response, statusCode, payload) {
  setCorsHeaders(response);
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function buildError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function buildPayload(payload = {}) {
  return {
    ...payload,
    timestamp: new Date().toISOString()
  };
}

async function readLocalJsonFile(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseLayoutDocumentJson(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

async function listFallbackPublishedPages() {
  const [pagesState, layoutsState] = await Promise.all([
    readLocalJsonFile(LOCAL_PAGES_STATE_PATH),
    readLocalJsonFile(LOCAL_LAYOUTS_STATE_PATH)
  ]);
  const pages = Array.isArray(pagesState?.["blog-pages"]) ? pagesState["blog-pages"] : [];
  const layouts = Array.isArray(layoutsState?.["page-layouts"]) ? layoutsState["page-layouts"] : [];
  const layoutsById = new Map(
    layouts.map((layout) => [
      normalizeText(layout?.id),
      {
        ...layout,
        layoutDocument: parseLayoutDocumentJson(layout?.layoutDocumentJson)
      }
    ])
  );
  return pages
    .filter((page) => normalizeText(page?.status) === "published")
    .map((page) => {
      const layout = layoutsById.get(normalizeText(page?.layoutId)) ?? null;
      return {
        ...page,
        layoutDocument: page?.layoutDocument ?? layout?.layoutDocument ?? null,
        layoutKey: page?.layoutKey ?? layout?.layoutKey ?? null,
        layoutModel: page?.layoutModel ?? null,
        bindings:
          page?.bindings && typeof page.bindings === "object"
            ? page.bindings
            : {}
      };
    });
}

async function listPublishedPageDefinitions(projectId) {
  let firestorePages = [];
  try {
    firestorePages = await listCollectionDocuments(projectId, PAGES_COLLECTION_PATH);
  } catch (_error) {
    firestorePages = [];
  }
  const fallbackPages = await listFallbackPublishedPages();
  const merged = new Map();
  firestorePages.forEach((page) => {
    const key = normalizeText(page?.id) ?? `${normalizeText(page?.primarySourceType)}:${normalizeText(page?.pathPattern)}`;
    if (key) {
      merged.set(key, page);
    }
  });
  fallbackPages.forEach((page) => {
    const key = normalizeText(page?.id) ?? `${normalizeText(page?.primarySourceType)}:${normalizeText(page?.pathPattern)}`;
    if (key) {
      merged.set(key, page);
    }
  });
  return Array.from(merged.values());
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.trim().length === 0) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw buildError("INVALID_JSON_BODY", "Request body must be valid JSON.", 400);
  }
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function readServiceAccountFromEnv() {
  const rawJson = normalizeText(process.env.PUBLIC_PAGE_API_SERVICE_ACCOUNT_JSON);
  if (rawJson) {
    return JSON.parse(rawJson);
  }
  const rawBase64 = normalizeText(process.env.PUBLIC_PAGE_API_SERVICE_ACCOUNT_JSON_BASE64);
  if (rawBase64) {
    return JSON.parse(Buffer.from(rawBase64, "base64").toString("utf8"));
  }
  return null;
}

function createJwtAssertion(serviceAccount, scope) {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: nowInSeconds + 3600,
    iat: nowInSeconds
  };
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer
    .sign(serviceAccount.private_key, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${unsignedToken}.${signature}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text.length > 0 ? JSON.parse(text) : {};
  if (!response.ok) {
    throw buildError(
      "REMOTE_REQUEST_FAILED",
      body?.error?.message ?? `Remote request failed with status ${response.status}`,
      response.status
    );
  }
  return body;
}

async function getMetadataAccessToken() {
  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    {
      headers: {
        "Metadata-Flavor": "Google"
      }
    }
  );
  if (!response.ok) {
    throw buildError(
      "METADATA_TOKEN_FAILED",
      `Metadata token request failed with status ${response.status}`,
      response.status
    );
  }
  const payload = await response.json();
  return payload.access_token;
}

async function getServiceAccountAccessToken() {
  const explicitServiceAccount = readServiceAccountFromEnv();
  if (!explicitServiceAccount) {
    return getMetadataAccessToken();
  }
  const assertion = createJwtAssertion(
    explicitServiceAccount,
    "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform"
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    }).toString()
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw buildError(
      "SERVICE_ACCOUNT_TOKEN_FAILED",
      payload?.error_description ?? payload?.error ?? "Failed to create service-account access token.",
      response.status || 500
    );
  }
  return payload.access_token;
}

function ensureProjectAllowed(projectId) {
  if (!projectId) {
    throw buildError("PROJECT_ID_REQUIRED", "projectId is required.", 400);
  }
  if (ALLOWED_PROJECT_ID && projectId !== ALLOWED_PROJECT_ID) {
    throw buildError(
      "PROJECT_ID_NOT_ALLOWED",
      `Project '${projectId}' is not allowed for this public API service.`,
      403
    );
  }
}

function ensureCollectionAllowed(collectionPath) {
  if (!collectionPath) {
    throw buildError("COLLECTION_PATH_REQUIRED", "collectionPath is required.", 400);
  }
  if (!ALLOWED_COLLECTIONS.has(collectionPath)) {
    throw buildError(
      "COLLECTION_PATH_NOT_ALLOWED",
      `Collection path '${collectionPath}' is not allowed for this public API service.`,
      403
    );
  }
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if ("nullValue" in value) {
    return null;
  }
  if ("booleanValue" in value) {
    return Boolean(value.booleanValue);
  }
  if ("integerValue" in value) {
    return Number.parseInt(value.integerValue, 10);
  }
  if ("doubleValue" in value) {
    return Number(value.doubleValue);
  }
  if ("stringValue" in value) {
    return String(value.stringValue);
  }
  if ("timestampValue" in value) {
    return String(value.timestampValue);
  }
  if ("arrayValue" in value) {
    const values = Array.isArray(value.arrayValue?.values) ? value.arrayValue.values : [];
    return values.map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    const fields = value.mapValue?.fields ?? {};
    return Object.entries(fields).reduce((result, [key, fieldValue]) => {
      result[key] = decodeFirestoreValue(fieldValue);
      return result;
    }, {});
  }
  return null;
}

function decodeFirestoreDocument(document = {}) {
  return decodeFirestoreValue({
    mapValue: {
      fields: document.fields ?? {}
    }
  }) ?? {};
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePagePath(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "/";
  }
  const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1);
  }
  return withLeadingSlash;
}

function extractTrailingPathToken(pagePath) {
  const normalized = normalizePagePath(pagePath);
  const segments = normalized.split("/").filter(Boolean);
  return segments.length > 0 ? normalizeText(segments.at(-1)) : null;
}

function sortByPublishedAscending(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left?.publishedOn ?? left?.updatedOn ?? 0).getTime();
    const rightTime = new Date(right?.publishedOn ?? right?.updatedOn ?? 0).getTime();
    return leftTime - rightTime;
  });
}

function isPerRecordDeploymentMode(value) {
  return normalizeText(value) === "per-record";
}

function escapePathTokenSegment(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolvePathPattern(page = {}) {
  return normalizeText(page?.pathPattern);
}

function buildResolvedPagePath(page = {}, sourceRecord = null) {
  if (!isPerRecordDeploymentMode(page?.deploymentMode)) {
    return normalizePagePath(page?.path);
  }
  const pattern = resolvePathPattern(page);
  if (!pattern) {
    return normalizePagePath(page?.path);
  }
  return normalizePagePath(
    pattern.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_match, tokenName) => {
      if (tokenName === "slug") {
        return escapePathTokenSegment(sourceRecord?.slug ?? "");
      }
      if (tokenName === "id") {
        return escapePathTokenSegment(sourceRecord?.id ?? "");
      }
      return "";
    })
  );
}

function buildRegexFromPathPattern(pattern) {
  const normalized = normalizeText(pattern);
  if (!normalized) {
    return null;
  }
  const escaped = normalized.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
  const source = escaped.replace(/\\\{([a-zA-Z0-9_-]+)\\\}/g, (_match, tokenName) => `(?<${tokenName}>[^/]+)`);
  return new RegExp(`^${source}$`);
}

function findPublishedPageByPath(pages = [], pagePath) {
  const normalizedPath = normalizePagePath(pagePath);
  for (const page of pages) {
    if (normalizeText(page?.status) !== "published") {
      continue;
    }
    if (!isPerRecordDeploymentMode(page?.deploymentMode) && normalizePagePath(page?.path) === normalizedPath) {
      return {
        page,
        sourceToken: normalizeText(page?.primarySource?.itemId),
        pathMatch: null
      };
    }
  }
  for (const page of pages) {
    if (normalizeText(page?.status) !== "published" || !isPerRecordDeploymentMode(page?.deploymentMode)) {
      continue;
    }
    const matcher = buildRegexFromPathPattern(page.pathPattern);
    if (!matcher) {
      continue;
    }
    const match = matcher.exec(normalizedPath);
    if (!match) {
      continue;
    }
    const groups = match.groups ?? {};
    return {
      page,
      sourceToken: normalizeText(groups.slug) ?? normalizeText(groups.id),
      pathMatch: groups
    };
  }
  return null;
}

function selectPublishedPagesBySourceType(pages = [], sourceType) {
  return pages.filter(
    (page) =>
      normalizeText(page?.status) === "published" &&
      normalizeText(page?.primarySourceType) === normalizeText(sourceType)
  );
}

function resolveCurrentPagePreference(currentPage = null, sourceType = null) {
  if (!currentPage || typeof currentPage !== "object") {
    return null;
  }
  return normalizeText(currentPage?.primarySourceType) === normalizeText(sourceType)
    ? normalizeText(currentPage?.id)
    : null;
}

function resolveRecordPageLink({ pages = [], sourceType, record, currentPage = null }) {
  if (!record) {
    return null;
  }
  const candidates = selectPublishedPagesBySourceType(pages, sourceType);
  const preferredPageId = resolveCurrentPagePreference(currentPage, sourceType);
  const orderedCandidates = preferredPageId
    ? [
        ...candidates.filter((page) => page?.id === preferredPageId),
        ...candidates.filter((page) => page?.id !== preferredPageId)
      ]
    : candidates;
  for (const page of orderedCandidates) {
    if (isPerRecordDeploymentMode(page?.deploymentMode)) {
      const path = buildResolvedPagePath(page, record);
      if (!path) {
        continue;
      }
      return {
        pageId: page.id ?? null,
        path
      };
    }
    const specificRecordId = normalizeText(page?.primarySource?.itemId);
    if (specificRecordId && specificRecordId === record.id) {
      return {
        pageId: page.id ?? null,
        path: normalizePagePath(page.path)
      };
    }
  }
  var slug = normalizeText(record.slug);
  if (!slug) {
    return null;
  }
  if (normalizeText(sourceType) === "blog-post") {
    return { pageId: null, path: normalizePagePath(`/post/${slug}`) };
  }
  if (normalizeText(sourceType) === "blog-category") {
    return { pageId: null, path: normalizePagePath(`/category/${slug}`) };
  }
  if (normalizeText(sourceType) === "blog-tag") {
    return { pageId: null, path: normalizePagePath(`/tag/${slug}`) };
  }
  if (normalizeText(sourceType) === "blog-author") {
    return { pageId: null, path: normalizePagePath(`/author/${slug}`) };
  }
  return null;
}

function buildMediaSummary(media = null) {
  if (!media || typeof media !== "object") {
    return null;
  }
  return {
    id: media.id ?? null,
    displayName: media.displayName ?? media.altText ?? media.id ?? "Media",
    altText: media.altText ?? media.displayName ?? "",
    description: media.description ?? "",
    preferredUrl: normalizeText(media.preferredUrl) ?? normalizeText(media.publicUrl) ?? null,
    width: Number.isFinite(Number(media.width)) ? Number(media.width) : null,
    height: Number.isFinite(Number(media.height)) ? Number(media.height) : null
  };
}

function buildAuthorSummary(author = {}, pages = [], currentPage = null) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-author",
    record: author,
    currentPage
  });
  return {
    id: author.id ?? null,
    displayName: author.displayName ?? author.slug ?? author.id ?? "Author",
    slug: author.slug ?? null,
    bio: author.bio ?? "",
    role: author.role ?? null,
    locale: author.locale ?? null,
    avatarMedia: buildMediaSummary(author.avatarMedia),
    path: pageLink?.path ?? null,
    publicUrl: null
  };
}

function buildCategorySummary(category = {}, pages = [], currentPage = null) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-category",
    record: category,
    currentPage
  });
  return {
    id: category.id ?? null,
    name: category.name ?? category.slug ?? category.id ?? "Category",
    slug: category.slug ?? null,
    description: category.description ?? "",
    parentCategoryId: category.parentCategoryId ?? null,
    treePath: category.path ?? null,
    depth: Number.isFinite(Number(category.depth)) ? Number(category.depth) : 0,
    featuredMedia: buildMediaSummary(category.featuredMedia),
    path: pageLink?.path ?? null,
    publicUrl: null
  };
}

function buildTagSummary(tag = {}, pages = [], currentPage = null) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-tag",
    record: tag,
    currentPage
  });
  return {
    id: tag.id ?? null,
    name: tag.name ?? tag.slug ?? tag.id ?? "Tag",
    slug: tag.slug ?? null,
    description: tag.description ?? "",
    color: tag.color ?? null,
    path: pageLink?.path ?? null,
    publicUrl: null
  };
}

function buildPostCard(post = {}, pages = [], currentPage = null) {
  const pageLink = resolveRecordPageLink({
    pages,
    sourceType: "blog-post",
    record: post,
    currentPage
  });
  return {
    id: post.id ?? null,
    title: post.title ?? post.slug ?? "Untitled post",
    slug: post.slug ?? null,
    subtitle: post.subtitle ?? "",
    excerpt: post.excerpt ?? "",
    publishedOn: post.publishedOn ?? null,
    updatedOn: post.updatedOn ?? null,
    readTimeMinutes: Number.isFinite(Number(post.readTimeMinutes)) ? Number(post.readTimeMinutes) : null,
    wordCount: Number.isFinite(Number(post.wordCount)) ? Number(post.wordCount) : null,
    featuredMedia: buildMediaSummary(post.featuredMedia),
    path: pageLink?.path ?? null,
    publicUrl: null
  };
}

function buildBreadcrumbChain(categoriesById, category = null, pages = [], currentPage = null) {
  const chain = [];
  let cursor = category;
  const visited = new Set();
  while (cursor && cursor.id && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    chain.unshift(buildCategorySummary(cursor, pages, currentPage));
    const parentId = normalizeText(cursor.parentCategoryId);
    cursor = parentId ? categoriesById.get(parentId) ?? null : null;
  }
  return chain;
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

function pickRelatedPosts(items = [], currentPostId, limit = 3) {
  return items
    .filter((item) => item?.id && item.id !== currentPostId && normalizeText(item?.status) === "published")
    .slice(0, limit);
}

function buildPostNavigation(posts = [], currentPost = {}, pages = [], currentPage = null) {
  const ordered = sortByPublishedAscending(
    posts.filter((entry) => normalizeText(entry?.status) === "published")
  );
  const index = ordered.findIndex((entry) => entry.id === currentPost.id);
  return {
    previousPost: index > 0 ? buildPostCard(ordered[index - 1], pages, currentPage) : null,
    nextPost:
      index >= 0 && index < ordered.length - 1
        ? buildPostCard(ordered[index + 1], pages, currentPage)
        : null
  };
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(encodeFirestoreValue)
      }
    };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.entries(value).reduce((result, [key, entryValue]) => {
          result[key] = encodeFirestoreValue(entryValue);
          return result;
        }, {})
      }
    };
  }
  return { stringValue: String(value) };
}

function splitCollectionPath(collectionPath) {
  const normalized = normalizeCollectionPath(collectionPath);
  if (!normalized) {
    throw buildError("COLLECTION_PATH_REQUIRED", "collectionPath is required.", 400);
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0 || segments.length % 2 === 0) {
    throw buildError(
      "COLLECTION_PATH_INVALID",
      "collectionPath must point to a collection.",
      400
    );
  }
  return {
    normalizedPath: segments.join("/"),
    collectionId: segments.at(-1),
    parentSegments: segments.slice(0, -1)
  };
}

function buildListCollectionUrl(projectId, collectionPath, pageToken = null) {
  const path = splitCollectionPath(collectionPath);
  const parentSegments = path.parentSegments.length > 0 ? `/${path.parentSegments.join("/")}` : "";
  const baseUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents${parentSegments}/${encodeURIComponent(path.collectionId)}?pageSize=200`;
  return pageToken ? `${baseUrl}&pageToken=${encodeURIComponent(pageToken)}` : baseUrl;
}

async function listCollectionDocuments(projectId, collectionPath) {
  ensureProjectAllowed(projectId);
  ensureCollectionAllowed(collectionPath);
  const accessToken = await getServiceAccountAccessToken();
  const documents = [];
  let nextPageToken = null;
  do {
    const payload = await requestJson(buildListCollectionUrl(projectId, collectionPath, nextPageToken), {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });
    documents.push(...(Array.isArray(payload?.documents) ? payload.documents : []));
    nextPageToken = normalizeText(payload?.nextPageToken);
  } while (nextPageToken);

  return documents.map((document) => {
    const nameSegments = String(document?.name ?? "").split("/");
    return {
      id: nameSegments[nameSegments.length - 1] ?? null,
      ...decodeFirestoreDocument(document)
    };
  });
}

async function readPublishedDocument(query) {
  const projectId = normalizeText(query.get("projectId"));
  const collectionPath = normalizeCollectionPath(query.get("collectionPath"));
  const documentId = normalizeDocumentId(query.get("documentId"));
  ensureProjectAllowed(projectId);
  ensureCollectionAllowed(collectionPath);
  if (!documentId) {
    throw buildError("DOCUMENT_ID_REQUIRED", "documentId is required.", 400);
  }

  const accessToken = await getServiceAccountAccessToken();
  const documentUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/${collectionPath}/${encodeURIComponent(documentId)}`;
  const document = await requestJson(documentUrl, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  return {
    ok: true,
    firestore: {
      projectId,
      collectionPath,
      documentId,
      documentUrl
    },
    document: decodeFirestoreDocument(document)
  };
}

async function readCollectionDocument(projectId, collectionPath, documentId) {
  ensureProjectAllowed(projectId);
  ensureCollectionAllowed(collectionPath);
  const normalizedDocumentId = normalizeDocumentId(documentId);
  if (!normalizedDocumentId) {
    return null;
  }

  const accessToken = await getServiceAccountAccessToken();
  const documentUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/${collectionPath}/${encodeURIComponent(normalizedDocumentId)}`;

  const response = await fetch(documentUrl, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  if (response.status === 404) {
    return null;
  }
  const text = await response.text();
  let payload = {};
  try {
    payload = text.length > 0 ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw buildError(
      "REMOTE_REQUEST_FAILED",
      payload?.error?.message ?? `Google API request failed with status ${response.status} for ${documentUrl}`,
      response.status
    );
  }
  return {
    id: normalizedDocumentId,
    ...decodeFirestoreDocument(payload)
  };
}

function buildHeadFromDocument(document = {}, fallbackTitle = "Page") {
  const title = normalizeText(document.seoTitle) ?? normalizeText(document.title) ?? fallbackTitle;
  const description =
    normalizeText(document.seoDescription) ??
    normalizeText(document.excerpt) ??
    normalizeText(document.description) ??
    "";
  return {
    title,
    description,
    canonicalUrl: null,
    openGraph: {
      title,
      description
    }
  };
}

function buildReaderLayoutDocument(page = {}, widgetRenderContract = null) {
  return {
    pageId: page.id ?? null,
    layoutId: page.layoutId ?? null,
    layoutKey: page.layoutKey ?? null,
    layoutModel: page.layoutModel ?? null,
    layoutDocument: page.layoutDocument ?? null,
    bindings: page.bindings && typeof page.bindings === "object" ? page.bindings : {},
    widgetRenderContract
  };
}

function buildReaderBootstrapDocument({ pagePath, page, head, model, widgetRenderContract = null }) {
  return {
    contractVersion: 1,
    tier: "initial",
    path: pagePath,
    pageId: page?.id ?? null,
    pageKind: model?.kind ?? "generic-page",
    primarySourceType: page?.primarySourceType ?? "none",
    head: head ?? {},
    delivery: {
      publicOrigin: null,
      publicUrl: null
    },
    layout: buildReaderLayoutDocument(page, widgetRenderContract),
    model,
    review: {
      pageId: page?.id ?? null,
      pagePath,
      layoutId: page?.layoutId ?? null,
      layoutKey: page?.layoutKey ?? null,
      publicUrl: null,
      resolvedAt: new Date().toISOString(),
      seo: {
        title: head?.title ?? null,
        description: head?.description ?? null,
        canonicalUrl: head?.canonicalUrl ?? null,
        ogTitle: head?.openGraph?.title ?? null,
        ogDescription: head?.openGraph?.description ?? null
      }
    },
    resolvedAt: new Date().toISOString()
  };
}

function createWidgetManifestPayload(page = {}, model = null) {
  return {
    page: {
      pageKind: page?.pageKind ?? null,
      primarySourceType: page?.primarySourceType ?? null
    },
    application: {
      model
    }
  };
}

async function resolvePublicWidgetRenderContract(page = {}, model = null) {
  const { manifest } = resolvePageContextManifest(createWidgetManifestPayload(page, model));
  const renderState = await buildPageWidgetRenderState({
    page,
    model,
    layoutDocument: page?.layoutDocument ?? null,
    pageContextManifest: manifest,
    pageKind: manifest?.pageKind ?? page?.pageKind ?? null,
    primarySourceType: manifest?.primarySourceType ?? page?.primarySourceType ?? null,
    delivery: {},
    mediaResolver: null,
    enforceCompatibility: false
  });
  return renderState.widgetRenderContract;
}

function buildReaderDeferredDocument({ pagePath, page, model }) {
  if (model?.kind === "post-detail") {
    return {
      contractVersion: 1,
      path: pagePath,
      pageId: page?.id ?? null,
      pageKind: model.kind,
      deferred: {
        navigation: {
          previousPost: model?.navigation?.previousPost ?? null,
          nextPost: model?.navigation?.nextPost ?? null,
          authorPage: model?.navigation?.authorPage ?? null
        },
        related: model?.related ?? {
          moreFromAuthor: [],
          byCategory: [],
          byTag: []
        }
      },
      resolvedAt: new Date().toISOString()
    };
  }
  if (model?.kind === "category-detail") {
    return {
      contractVersion: 1,
      path: pagePath,
      pageId: page?.id ?? null,
      pageKind: model.kind,
      deferred: {
        children: Array.isArray(model?.children) ? model.children : []
      },
      resolvedAt: new Date().toISOString()
    };
  }
  return {
    contractVersion: 1,
    path: pagePath,
    pageId: page?.id ?? null,
    pageKind: model?.kind ?? "generic-page",
    deferred: {},
    resolvedAt: new Date().toISOString()
  };
}

function buildRawReaderDeferredDocument({
  pagePath,
  pageId = null,
  primarySourceType = "none",
  deferred = {}
}) {
  return {
    contractVersion: 2,
    path: pagePath,
    pageId,
    pageKind: primarySourceType === "blog-post" ? "post-detail" : primarySourceType === "blog-category" ? "category-detail" : "generic-page",
    primarySourceType,
    deferred,
    resolvedAt: new Date().toISOString()
  };
}

function buildPostInitialApplicationModel(projectedPost, allCategories, allPages, currentPage = null) {
  const currentPost = projectedPost ?? {};
  const categoriesById = new Map(allCategories.map((item) => [item.id, item]));
  const postCategories = toArray(currentPost.categories).length
    ? toArray(currentPost.categories)
    : toArray(currentPost.categoryIds).map((categoryId, index) => ({
        id: categoryId,
        name: toArray(currentPost.categoryIdsTitles)[index] ?? "Category"
      }));
  const postTags = toArray(currentPost.tags).length
    ? toArray(currentPost.tags)
    : toArray(currentPost.tagIds).map((tagId, index) => ({
        id: tagId,
        name: toArray(currentPost.tagIdsTitles)[index] ?? "Tag"
      }));
  const primaryCategoryId = postCategories[0]?.id ?? normalizeText(currentPost.categoryIds?.[0]);
  const primaryCategory = primaryCategoryId ? categoriesById.get(primaryCategoryId) ?? postCategories[0] ?? null : null;
  const author = currentPost.primaryAuthor && typeof currentPost.primaryAuthor === "object"
    ? buildAuthorSummary(currentPost.primaryAuthor, allPages, currentPage)
    : currentPost.primaryAuthorId || currentPost.primaryAuthorTitle
      ? buildAuthorSummary({
          id: currentPost.primaryAuthorId ?? null,
          slug: currentPost.primaryAuthorSlug ?? null,
          displayName: currentPost.primaryAuthorTitle ?? currentPost.primaryAuthorId ?? "Author",
          bio: "",
          role: null,
          locale: null,
          avatarMedia: null
        }, allPages, currentPage)
      : null;

  return {
    kind: "post-detail",
    post: {
      id: currentPost.id ?? null,
      title: currentPost.title ?? currentPost.slug ?? "Untitled post",
      slug: currentPost.slug ?? null,
      subtitle: currentPost.subtitle ?? "",
      excerpt: currentPost.excerpt ?? "",
      body: currentPost.body ?? "",
      format: currentPost.format ?? "article",
      locale: currentPost.locale ?? null,
      readTimeMinutes: Number.isFinite(Number(currentPost.readTimeMinutes)) ? Number(currentPost.readTimeMinutes) : null,
      wordCount: Number.isFinite(Number(currentPost.wordCount)) ? Number(currentPost.wordCount) : null,
      publishedOn: currentPost.publishedOn ?? null,
      updatedOn: currentPost.updatedOn ?? null,
      featuredMedia: buildMediaSummary(currentPost.featuredMedia),
      galleryMedia: toArray(currentPost.galleryMedia).map((item) => buildMediaSummary(item)).filter(Boolean),
      author,
      coAuthors: [],
      categories: postCategories.map((item) => buildCategorySummary(item, allPages, currentPage)),
      tags: postTags.map((item) => buildTagSummary(item, allPages, currentPage))
    },
    navigation: {
      previousPost: null,
      nextPost: null,
      authorPage: null,
      primaryCategory: primaryCategory
        ? buildCategorySummary(primaryCategory, allPages, currentPage)
        : null,
      breadcrumbs: primaryCategory
        ? buildBreadcrumbChain(
            categoriesById,
            categoriesById.get(primaryCategory.id) ?? primaryCategory,
            allPages,
            currentPage
          )
        : []
    },
    related: {
      moreFromAuthor: [],
      byCategory: [],
      byTag: []
    },
    comments: {
      enabled: currentPost.allowComments !== false && normalizeText(currentPost.commentPolicy) !== "closed",
      policy: currentPost.commentPolicy ?? "open",
      postId: currentPost.id ?? null
    }
  };
}

function buildCategoryInitialApplicationModel(
  projectedCategory,
  allCategories,
  allPosts,
  allPages,
  currentPage = null
) {
  const currentCategory = projectedCategory ?? {};
  const categoriesById = new Map(allCategories.map((item) => [item.id, item]));
  const categoryPosts = allPosts.filter((item) =>
    toArray(item?.categoryIds).includes(currentCategory.id)
  );
  const parentCategory = normalizeText(currentCategory.parentCategoryId)
    ? categoriesById.get(currentCategory.parentCategoryId) ?? null
    : null;

  return {
    kind: "category-detail",
    category: {
      id: currentCategory.id ?? null,
      name: currentCategory.name ?? currentCategory.slug ?? "Category",
      slug: currentCategory.slug ?? null,
      description: currentCategory.description ?? "",
      treePath: currentCategory.path ?? "",
      depth: Number.isFinite(Number(currentCategory.depth)) ? Number(currentCategory.depth) : 0,
      featuredMedia: buildMediaSummary(currentCategory.featuredMedia)
    },
    navigation: {
      parentCategory: parentCategory
        ? buildCategorySummary(parentCategory, allPages, currentPage)
        : null,
      breadcrumbs: buildBreadcrumbChain(categoriesById, currentCategory, allPages, currentPage)
    },
    children: [],
    posts: categoryPosts.map((item) => buildPostCard(item, allPages, currentPage))
  };
}

function resolveProjectedDocument(items = [], pathMatch, pagePath, primarySource) {
  const sourceToken = normalizeText(pathMatch?.sourceToken);
  if (sourceToken) {
    const bySlug = items.find((item) => normalizeText(item?.slug) === sourceToken);
    if (bySlug) {
      return bySlug;
    }
    const byId = items.find((item) => normalizeText(item?.id) === sourceToken);
    if (byId) {
      return byId;
    }
  }
  const exactPath = items.find((item) => normalizePagePath(item?.pagePath) === pagePath);
  if (exactPath) {
    return exactPath;
  }
  const specificRecordId = normalizeText(primarySource?.itemId);
  if (specificRecordId) {
    return items.find((item) => normalizeText(item?.id) === specificRecordId) ?? null;
  }
  return null;
}

async function resolveProjectedDocumentWithFallback({
  projectId,
  collectionPath,
  items = [],
  pathMatch,
  pagePath,
  primarySource
}) {
  const resolved = resolveProjectedDocument(items, pathMatch, pagePath, primarySource);
  if (resolved) {
    return resolved;
  }

  const sourceToken = normalizeText(pathMatch?.sourceToken);
  if (sourceToken) {
    const bySourceToken = await readCollectionDocument(projectId, collectionPath, sourceToken);
    if (bySourceToken) {
      return bySourceToken;
    }
  }

  const specificRecordId = normalizeText(primarySource?.itemId);
  if (specificRecordId) {
    const bySpecificRecordId = await readCollectionDocument(projectId, collectionPath, specificRecordId);
    if (bySpecificRecordId) {
      return bySpecificRecordId;
    }
  }

  return null;
}

function buildPostApplicationModel(projectedPost, allPosts, allCategories, allPages, currentPage = null) {
  const currentPost = projectedPost ?? {};
  const categoriesById = new Map(allCategories.map((item) => [item.id, item]));
  const postCategories = toArray(currentPost.categories).length
    ? toArray(currentPost.categories)
    : toArray(currentPost.categoryIds).map((categoryId, index) => ({
        id: categoryId,
        name: toArray(currentPost.categoryIdsTitles)[index] ?? "Category"
      }));
  const postTags = toArray(currentPost.tags).length
    ? toArray(currentPost.tags)
    : toArray(currentPost.tagIds).map((tagId, index) => ({
        id: tagId,
        name: toArray(currentPost.tagIdsTitles)[index] ?? "Tag"
      }));
  const primaryCategoryId = postCategories[0]?.id ?? normalizeText(currentPost.categoryIds?.[0]);
  const primaryCategory = primaryCategoryId ? categoriesById.get(primaryCategoryId) ?? postCategories[0] ?? null : null;
  const relatedByAuthor = dedupePosts(
    allPosts.filter((item) => normalizeText(item?.primaryAuthorId) === normalizeText(currentPost.primaryAuthorId))
  );
  const relatedByCategory = dedupePosts(
    allPosts.filter((item) =>
      toArray(item?.categoryIds).some((categoryId) => toArray(currentPost.categoryIds).includes(categoryId))
    )
  );
  const relatedByTag = dedupePosts(
    allPosts.filter((item) =>
      toArray(item?.tagIds).some((tagId) => toArray(currentPost.tagIds).includes(tagId))
    )
  );
  const author = currentPost.primaryAuthor && typeof currentPost.primaryAuthor === "object"
    ? buildAuthorSummary(currentPost.primaryAuthor, allPages, currentPage)
    : currentPost.primaryAuthorId || currentPost.primaryAuthorTitle
      ? buildAuthorSummary({
          id: currentPost.primaryAuthorId ?? null,
          slug: currentPost.primaryAuthorSlug ?? null,
          displayName: currentPost.primaryAuthorTitle ?? currentPost.primaryAuthorId ?? "Author",
          bio: "",
          role: null,
          locale: null,
          avatarMedia: null
        }, allPages, currentPage)
      : null;
  return {
    kind: "post-detail",
    post: {
      id: currentPost.id ?? null,
      title: currentPost.title ?? currentPost.slug ?? "Untitled post",
      slug: currentPost.slug ?? null,
      subtitle: currentPost.subtitle ?? "",
      excerpt: currentPost.excerpt ?? "",
      body: currentPost.body ?? "",
      format: currentPost.format ?? "article",
      locale: currentPost.locale ?? null,
      readTimeMinutes: Number.isFinite(Number(currentPost.readTimeMinutes)) ? Number(currentPost.readTimeMinutes) : null,
      wordCount: Number.isFinite(Number(currentPost.wordCount)) ? Number(currentPost.wordCount) : null,
      publishedOn: currentPost.publishedOn ?? null,
      updatedOn: currentPost.updatedOn ?? null,
      featuredMedia: buildMediaSummary(currentPost.featuredMedia),
      galleryMedia: toArray(currentPost.galleryMedia).map((item) => buildMediaSummary(item)).filter(Boolean),
      author,
      coAuthors: [],
      categories: postCategories.map((item) => buildCategorySummary(item, allPages, currentPage)),
      tags: postTags.map((item) => buildTagSummary(item, allPages, currentPage))
    },
    navigation: {
      ...buildPostNavigation(allPosts, currentPost, allPages, currentPage),
      authorPage: author?.path ? { path: author.path, publicUrl: null } : null,
      primaryCategory: primaryCategory
        ? buildCategorySummary(primaryCategory, allPages, currentPage)
        : null,
      breadcrumbs: primaryCategory
        ? buildBreadcrumbChain(
            categoriesById,
            categoriesById.get(primaryCategory.id) ?? primaryCategory,
            allPages,
            currentPage
          )
        : []
    },
    related: {
      moreFromAuthor: pickRelatedPosts(relatedByAuthor, currentPost.id).map((item) =>
        buildPostCard(item, allPages, currentPage)
      ),
      byCategory: pickRelatedPosts(relatedByCategory, currentPost.id).map((item) =>
        buildPostCard(item, allPages, currentPage)
      ),
      byTag: pickRelatedPosts(relatedByTag, currentPost.id).map((item) =>
        buildPostCard(item, allPages, currentPage)
      )
    },
    comments: {
      enabled: currentPost.allowComments !== false && normalizeText(currentPost.commentPolicy) !== "closed",
      policy: currentPost.commentPolicy ?? "open",
      postId: currentPost.id ?? null
    }
  };
}

function buildCategoryApplicationModel(
  projectedCategory,
  allCategories,
  allPosts,
  allPages,
  currentPage = null
) {
  const currentCategory = projectedCategory ?? {};
  const categoriesById = new Map(allCategories.map((item) => [item.id, item]));
  const childCategories = allCategories.filter(
    (item) => normalizeText(item?.parentCategoryId) === normalizeText(currentCategory.id)
  );
  const categoryPosts = allPosts.filter((item) =>
    toArray(item?.categoryIds).includes(currentCategory.id)
  );
  const parentCategory = normalizeText(currentCategory.parentCategoryId)
    ? categoriesById.get(currentCategory.parentCategoryId) ?? null
    : null;

  return {
    kind: "category-detail",
    category: {
      id: currentCategory.id ?? null,
      name: currentCategory.name ?? currentCategory.slug ?? "Category",
      slug: currentCategory.slug ?? null,
      description: currentCategory.description ?? "",
      treePath: currentCategory.path ?? "",
      depth: Number.isFinite(Number(currentCategory.depth)) ? Number(currentCategory.depth) : 0,
      featuredMedia: buildMediaSummary(currentCategory.featuredMedia)
    },
    navigation: {
      parentCategory: parentCategory
        ? buildCategorySummary(parentCategory, allPages, currentPage)
        : null,
      breadcrumbs: buildBreadcrumbChain(categoriesById, currentCategory, allPages, currentPage)
    },
    children: childCategories.map((item) => buildCategorySummary(item, allPages, currentPage)),
    posts: categoryPosts.map((item) => buildPostCard(item, allPages, currentPage))
  };
}

async function resolveApplicationView(query) {
  const projectId = normalizeText(query.get("projectId")) ?? ALLOWED_PROJECT_ID;
  const pagePath = normalizePagePath(query.get("path"));
  ensureProjectAllowed(projectId);
  if (!normalizeText(query.get("path"))) {
    throw buildError("PAGE_PATH_REQUIRED", "path is required.", 400);
  }

  const allPages = await listPublishedPageDefinitions(projectId);
  const matchedPage = findPublishedPageByPath(allPages, pagePath);
  const fallbackPrimarySourceType = pagePath.startsWith("/post/")
    ? "blog-post"
    : pagePath.startsWith("/category/")
      ? "blog-category"
      : null;
  const fallbackSourceToken = extractTrailingPathToken(pagePath);
  const page = matchedPage?.page ?? {
    id: null,
    path: pagePath,
    primarySourceType: fallbackPrimarySourceType,
    deploymentMode: "per-record",
    pathPattern: fallbackPrimarySourceType === "blog-post" ? "/post/{slug}" : "/category/{slug}",
    primarySource: null,
    status: "published"
  };
  const primarySourceType = normalizeText(page?.primarySourceType);
  if (!matchedPage && !primarySourceType) {
    throw buildError("PAGE_NOT_FOUND", `No published page matched '${pagePath}'.`, 404);
  }
  if (primarySourceType === "blog-post") {
    const [allPosts, allCategories] = await Promise.all([
      listCollectionDocuments(projectId, POSTS_COLLECTION_PATH),
      listCollectionDocuments(projectId, CATEGORIES_COLLECTION_PATH)
    ]);
    const currentPathMatch = matchedPage ?? { sourceToken: fallbackSourceToken };
    const currentPost = await resolveProjectedDocumentWithFallback({
      projectId,
      collectionPath: POSTS_COLLECTION_PATH,
      items: allPosts,
      pathMatch: currentPathMatch,
      pagePath,
      primarySource: page?.primarySource ?? null
    });
    if (!currentPost) {
      throw buildError("POST_NOT_FOUND", `No published post matched '${pagePath}'.`, 404);
    }
    return {
      ok: true,
      pagePath,
      page: {
        id: page.id ?? null,
        path: pagePath,
        primarySourceType
      },
      head: buildHeadFromDocument(currentPost, page.title ?? "Page"),
      model: buildPostApplicationModel(currentPost, allPosts, allCategories, allPages, page)
    };
  }

  if (primarySourceType === "blog-category") {
    const [allCategories, allPosts] = await Promise.all([
      listCollectionDocuments(projectId, CATEGORIES_COLLECTION_PATH),
      listCollectionDocuments(projectId, POSTS_COLLECTION_PATH)
    ]);
    const currentPathMatch = matchedPage ?? { sourceToken: fallbackSourceToken };
    const currentCategory = await resolveProjectedDocumentWithFallback({
      projectId,
      collectionPath: CATEGORIES_COLLECTION_PATH,
      items: allCategories,
      pathMatch: currentPathMatch,
      pagePath,
      primarySource: page?.primarySource ?? null
    });
    if (!currentCategory) {
      throw buildError("CATEGORY_NOT_FOUND", `No published category matched '${pagePath}'.`, 404);
    }
    return {
      ok: true,
      pagePath,
      page: {
        id: page.id ?? null,
        path: pagePath,
        primarySourceType
      },
      head: buildHeadFromDocument(currentCategory, page.title ?? "Category"),
      model: buildCategoryApplicationModel(currentCategory, allCategories, allPosts, allPages, page)
    };
  }

  throw buildError(
    "UNSUPPORTED_PAGE_KIND",
    `Public application view does not support primary source type '${primarySourceType ?? "none"}'.`,
    409
  );
}

async function resolveReaderBootstrap(query) {
  const projectId = normalizeText(query.get("projectId")) ?? ALLOWED_PROJECT_ID;
  const pagePath = normalizePagePath(query.get("path"));
  ensureProjectAllowed(projectId);
  if (!normalizeText(query.get("path"))) {
    throw buildError("PAGE_PATH_REQUIRED", "path is required.", 400);
  }

  const allPages = await listPublishedPageDefinitions(projectId);
  const matchedPage = findPublishedPageByPath(allPages, pagePath);
  const fallbackPrimarySourceType = pagePath.startsWith("/post/")
    ? "blog-post"
    : pagePath.startsWith("/category/")
      ? "blog-category"
      : null;
  const fallbackSourceToken = extractTrailingPathToken(pagePath);
  const page = matchedPage?.page ?? {
    id: null,
    path: pagePath,
    primarySourceType: fallbackPrimarySourceType,
    deploymentMode: "per-record",
    pathPattern: fallbackPrimarySourceType === "blog-post" ? "/post/{slug}" : "/category/{slug}",
    primarySource: null,
    status: "published"
  };
  const primarySourceType = normalizeText(page?.primarySourceType);
  if (!matchedPage && !primarySourceType) {
    throw buildError("PAGE_NOT_FOUND", `No published page matched '${pagePath}'.`, 404);
  }

  if (primarySourceType === "blog-post") {
    const [allPosts, allCategories] = await Promise.all([
      listCollectionDocuments(projectId, POSTS_COLLECTION_PATH),
      listCollectionDocuments(projectId, CATEGORIES_COLLECTION_PATH)
    ]);
    const currentPathMatch = matchedPage ?? { sourceToken: fallbackSourceToken };
    const currentPost = await resolveProjectedDocumentWithFallback({
      projectId,
      collectionPath: POSTS_COLLECTION_PATH,
      items: allPosts,
      pathMatch: currentPathMatch,
      pagePath,
      primarySource: page?.primarySource ?? null
    });
    if (!currentPost) {
      throw buildError("POST_NOT_FOUND", `No published post matched '${pagePath}'.`, 404);
    }
    const head = buildHeadFromDocument(currentPost, page.title ?? "Page");
    const model = buildPostInitialApplicationModel(currentPost, allCategories, allPages, page);
    const widgetRenderContract = await resolvePublicWidgetRenderContract(page, model);
    return {
      ok: true,
      pagePath,
      items: [
        buildReaderBootstrapDocument({
          pagePath,
          page,
          head,
          model,
          widgetRenderContract
        })
      ],
      total: 1
    };
  }

  if (primarySourceType === "blog-category") {
    const [allCategories, allPosts] = await Promise.all([
      listCollectionDocuments(projectId, CATEGORIES_COLLECTION_PATH),
      listCollectionDocuments(projectId, POSTS_COLLECTION_PATH)
    ]);
    const currentPathMatch = matchedPage ?? { sourceToken: fallbackSourceToken };
    const currentCategory = await resolveProjectedDocumentWithFallback({
      projectId,
      collectionPath: CATEGORIES_COLLECTION_PATH,
      items: allCategories,
      pathMatch: currentPathMatch,
      pagePath,
      primarySource: page?.primarySource ?? null
    });
    if (!currentCategory) {
      throw buildError("CATEGORY_NOT_FOUND", `No published category matched '${pagePath}'.`, 404);
    }
    const head = buildHeadFromDocument(currentCategory, page.title ?? "Category");
    const model = buildCategoryInitialApplicationModel(
      currentCategory,
      allCategories,
      allPosts,
      allPages,
      page
    );
    const widgetRenderContract = await resolvePublicWidgetRenderContract(page, model);
    return {
      ok: true,
      pagePath,
      items: [
        buildReaderBootstrapDocument({
          pagePath,
          page,
          head,
          model,
          widgetRenderContract
        })
      ],
      total: 1
    };
  }

  throw buildError(
    "UNSUPPORTED_PAGE_KIND",
    `Public reader bootstrap does not support primary source type '${primarySourceType ?? "none"}'.`,
    409
  );
}

async function resolveReaderDeferred(query) {
  const projectId = normalizeText(query.get("projectId")) ?? ALLOWED_PROJECT_ID;
  const pagePath = normalizePagePath(query.get("path"));
  ensureProjectAllowed(projectId);
  if (!normalizeText(query.get("path"))) {
    throw buildError("PAGE_PATH_REQUIRED", "path is required.", 400);
  }

  const explicitPrimarySourceType = normalizeText(query.get("primarySourceType"));
  const explicitDocumentId = normalizeDocumentId(query.get("documentId"));
  const explicitPageId = normalizeDocumentId(query.get("pageId"));

  if (explicitPrimarySourceType === "blog-post" && explicitDocumentId) {
    const [allPosts, currentPost] = await Promise.all([
      listCollectionDocuments(projectId, POSTS_COLLECTION_PATH),
      readCollectionDocument(projectId, POSTS_COLLECTION_PATH, explicitDocumentId)
    ]);
    if (!currentPost) {
      throw buildError("POST_NOT_FOUND", `No published post matched '${explicitDocumentId}'.`, 404);
    }
    const relatedByAuthor = dedupePosts(
      allPosts.filter((item) => normalizeText(item?.primaryAuthorId) === normalizeText(currentPost.primaryAuthorId))
    );
    const relatedByCategory = dedupePosts(
      allPosts.filter((item) =>
        toArray(item?.categoryIds).some((categoryId) => toArray(currentPost.categoryIds).includes(categoryId))
      )
    );
    const relatedByTag = dedupePosts(
      allPosts.filter((item) =>
        toArray(item?.tagIds).some((tagId) => toArray(currentPost.tagIds).includes(tagId))
      )
    );
    const orderedPosts = sortByPublishedAscending(
      allPosts.filter((entry) => normalizeText(entry?.status) === "published")
    );
    const currentIndex = orderedPosts.findIndex((entry) => normalizeText(entry?.id) === normalizeText(currentPost.id));
    return {
      ok: true,
      pagePath,
      items: [
        buildRawReaderDeferredDocument({
          pagePath,
          pageId: explicitPageId,
          primarySourceType: explicitPrimarySourceType,
          deferred: {
            navigation: {
              previousPost: currentIndex > 0 ? orderedPosts[currentIndex - 1] : null,
              nextPost:
                currentIndex >= 0 && currentIndex < orderedPosts.length - 1
                  ? orderedPosts[currentIndex + 1]
                  : null,
              authorPage: null
            },
            related: {
              moreFromAuthor: pickRelatedPosts(relatedByAuthor, currentPost.id),
              byCategory: pickRelatedPosts(relatedByCategory, currentPost.id),
              byTag: pickRelatedPosts(relatedByTag, currentPost.id)
            }
          }
        })
      ],
      total: 1
    };
  }

  if (explicitPrimarySourceType === "blog-category" && explicitDocumentId) {
    const [allCategories, allPosts, currentCategory] = await Promise.all([
      listCollectionDocuments(projectId, CATEGORIES_COLLECTION_PATH),
      listCollectionDocuments(projectId, POSTS_COLLECTION_PATH),
      readCollectionDocument(projectId, CATEGORIES_COLLECTION_PATH, explicitDocumentId)
    ]);
    if (!currentCategory) {
      throw buildError("CATEGORY_NOT_FOUND", `No published category matched '${explicitDocumentId}'.`, 404);
    }
    const childCategories = allCategories.filter(
      (item) => normalizeText(item?.parentCategoryId) === normalizeText(currentCategory.id)
    );
    const categoryPosts = allPosts.filter((item) =>
      toArray(item?.categoryIds).includes(currentCategory.id)
    );
    return {
      ok: true,
      pagePath,
      items: [
        buildRawReaderDeferredDocument({
          pagePath,
          pageId: explicitPageId,
          primarySourceType: explicitPrimarySourceType,
          deferred: {
            children: childCategories,
            posts: categoryPosts
          }
        })
      ],
      total: 1
    };
  }

  const allPages = await listPublishedPageDefinitions(projectId);
  const matchedPage = findPublishedPageByPath(allPages, pagePath);
  const fallbackPrimarySourceType = pagePath.startsWith("/post/")
    ? "blog-post"
    : pagePath.startsWith("/category/")
      ? "blog-category"
      : null;
  const fallbackSourceToken = extractTrailingPathToken(pagePath);
  const page = matchedPage?.page ?? {
    id: null,
    path: pagePath,
    primarySourceType: fallbackPrimarySourceType,
    deploymentMode: "per-record",
    pathPattern: fallbackPrimarySourceType === "blog-post" ? "/post/{slug}" : "/category/{slug}",
    primarySource: null,
    status: "published"
  };
  const primarySourceType = normalizeText(page?.primarySourceType);
  if (!matchedPage && !primarySourceType) {
    throw buildError("PAGE_NOT_FOUND", `No published page matched '${pagePath}'.`, 404);
  }

  if (primarySourceType === "blog-post") {
    const [allPosts, allCategories] = await Promise.all([
      listCollectionDocuments(projectId, POSTS_COLLECTION_PATH),
      listCollectionDocuments(projectId, CATEGORIES_COLLECTION_PATH)
    ]);
    const currentPathMatch = matchedPage ?? { sourceToken: fallbackSourceToken };
    const currentPost = await resolveProjectedDocumentWithFallback({
      projectId,
      collectionPath: POSTS_COLLECTION_PATH,
      items: allPosts,
      pathMatch: currentPathMatch,
      pagePath,
      primarySource: page?.primarySource ?? null
    });
    if (!currentPost) {
      throw buildError("POST_NOT_FOUND", `No published post matched '${pagePath}'.`, 404);
    }
    return {
      ok: true,
      pagePath,
      items: [
        buildReaderDeferredDocument({
          pagePath,
          page,
          model: buildPostApplicationModel(currentPost, allPosts, allCategories, allPages, page)
        })
      ],
      total: 1
    };
  }

  if (primarySourceType === "blog-category") {
    const [allCategories, allPosts] = await Promise.all([
      listCollectionDocuments(projectId, CATEGORIES_COLLECTION_PATH),
      listCollectionDocuments(projectId, POSTS_COLLECTION_PATH)
    ]);
    const currentPathMatch = matchedPage ?? { sourceToken: fallbackSourceToken };
    const currentCategory = await resolveProjectedDocumentWithFallback({
      projectId,
      collectionPath: CATEGORIES_COLLECTION_PATH,
      items: allCategories,
      pathMatch: currentPathMatch,
      pagePath,
      primarySource: page?.primarySource ?? null
    });
    if (!currentCategory) {
      throw buildError("CATEGORY_NOT_FOUND", `No published category matched '${pagePath}'.`, 404);
    }
    return {
      ok: true,
      pagePath,
      items: [
        buildReaderDeferredDocument({
          pagePath,
          page,
          model: buildCategoryApplicationModel(currentCategory, allCategories, allPosts, allPages, page)
        })
      ],
      total: 1
    };
  }

  throw buildError(
    "UNSUPPORTED_PAGE_KIND",
    `Public reader deferred does not support primary source type '${primarySourceType ?? "none"}'.`,
    409
  );
}

async function resolveTranslations(query) {
  const projectId = normalizeText(query.get("projectId")) ?? ALLOWED_PROJECT_ID;
  const pagePath = normalizePagePath(query.get("path"));
  const locale = normalizeText(query.get("locale"));
  ensureProjectAllowed(projectId);
  if (!normalizeText(query.get("path"))) {
    throw buildError("PAGE_PATH_REQUIRED", "path is required.", 400);
  }
  if (!locale) {
    throw buildError("LOCALE_REQUIRED", "locale is required.", 400);
  }

  const document = await readCollectionDocument(
    projectId,
    TRANSLATIONS_COLLECTION_PATH,
    buildTranslationProjectionDocumentId(pagePath, locale)
  );
  return {
    ok: true,
    path: pagePath,
    locale,
    items: document ? [document] : [],
    total: document ? 1 : 0
  };
}

async function listFirestoreComments(projectId) {
  return listCollectionDocuments(projectId, COMMENTS_COLLECTION_PATH);
}

async function listPublicComments(query) {
  const projectId = normalizeText(query.get("projectId")) ?? ALLOWED_PROJECT_ID;
  const postId = normalizeText(query.get("postId"));
  const statuses = parseStatusFilter(query.get("status"));

  ensureProjectAllowed(projectId);
  if (!postId) {
    throw buildError("COMMENT_POST_ID_REQUIRED", "postId is required.", 400);
  }

  const items = (await listFirestoreComments(projectId))
    .filter((item) => item?.postId === postId)
    .filter((item) => statuses.includes(normalizeText(item?.status)))
    .sort((left, right) =>
      String(left?.createdOn ?? left?.createdAt ?? "").localeCompare(
        String(right?.createdOn ?? right?.createdAt ?? "")
      )
    );

  return {
    ok: true,
    postId,
    statuses,
    items
  };
}

async function createPublicComment(body = {}) {
  if (!ALLOW_COMMENTS) {
    throw buildError("COMMENTS_NOT_ENABLED", "Comments are not enabled for this public API service.", 404);
  }

  const projectId = normalizeText(body.projectId) ?? ALLOWED_PROJECT_ID;
  const postId = normalizeText(body.postId);
  const authorDisplayName = normalizeText(body.authorDisplayName) ?? "";
  const authorEmail = normalizeEmail(body.authorEmail);
  const commentBody = normalizeText(body.body) ?? "";
  const parentCommentId = normalizeText(body.parentCommentId);
  const pagePath = normalizeText(body.pagePath);

  ensureProjectAllowed(projectId);
  if (!postId) {
    throw buildError("COMMENT_POST_ID_REQUIRED", "postId is required.", 400);
  }
  if (!authorDisplayName) {
    throw buildError("COMMENT_AUTHOR_REQUIRED", "authorDisplayName is required.", 400);
  }
  if (commentBody.length < 12) {
    throw buildError("COMMENT_BODY_TOO_SHORT", "Comment body must be at least 12 characters.", 400);
  }
  if (authorEmail && !isValidEmail(authorEmail)) {
    throw buildError("COMMENT_EMAIL_INVALID", "authorEmail must be a valid email address.", 400);
  }

  const accessToken = await getServiceAccountAccessToken();
  const documentUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/${COMMENTS_COLLECTION_PATH}`;
  const fields = {
    postId,
    parentCommentId,
    pagePath,
    authorDisplayName,
    authorEmail,
    body: commentBody,
    status: "pending",
    source: "public-page-api",
    createdOn: new Date().toISOString()
  };
  const createdDocument = await requestJson(documentUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      fields: Object.entries(fields).reduce((result, [key, value]) => {
        result[key] = encodeFirestoreValue(value);
        return result;
      }, {})
    })
  });

  const nameSegments = String(createdDocument.name ?? "").split("/");
  const createdId = nameSegments[nameSegments.length - 1] ?? null;

  return {
    ok: true,
    item: {
      id: createdId,
      ...decodeFirestoreDocument(createdDocument)
    }
  };
}

const server = createServer(async (request, response) => {
  try {
    if (!request.url) {
      throw buildError("REQUEST_URL_MISSING", "Request URL is missing.", 400);
    }

    const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "OPTIONS") {
      setCorsHeaders(response);
      response.statusCode = 204;
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, buildPayload({ ok: true }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/published-document") {
      sendJson(response, 200, buildPayload(await readPublishedDocument(url.searchParams)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/application-view") {
      sendJson(response, 200, buildPayload(await resolveApplicationView(url.searchParams)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/reader/bootstrap") {
      sendJson(response, 200, buildPayload(await resolveReaderBootstrap(url.searchParams)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/reader/deferred") {
      sendJson(response, 200, buildPayload(await resolveReaderDeferred(url.searchParams)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/translations") {
      sendJson(response, 200, buildPayload(await resolveTranslations(url.searchParams)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/comments") {
      sendJson(response, 200, buildPayload(await listPublicComments(url.searchParams)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/comments") {
      sendJson(response, 201, buildPayload(await createPublicComment(await readJsonBody(request))));
      return;
    }

    throw buildError("ROUTE_NOT_FOUND", `No route matched ${request.method} ${url.pathname}`, 404);
  } catch (error) {
    sendJson(response, error?.statusCode ?? 500, buildPayload({
      ok: false,
      error: {
        code: error?.code ?? "PUBLIC_PAGE_API_FAILED",
        message: error?.message ?? "Public page API request failed."
      }
    }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(JSON.stringify({ ok: true, port: PORT }));
});
