import { createServer } from "node:http";
import { createSign } from "node:crypto";

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
const COMMENTS_COLLECTION_PATH =
  normalizeText(process.env.PUBLIC_PAGE_API_COMMENTS_COLLECTION) ?? "publicComments";
const ALLOWED_COLLECTIONS = new Set(
  String(
    process.env.PUBLIC_PAGE_API_ALLOWED_COLLECTIONS
      ?? "publishedPosts,publishedPages,publicBlogCategories,publicBlogTags"
  )
    .split(",")
    .map((entry) => normalizeText(entry))
    .filter(Boolean)
);
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
