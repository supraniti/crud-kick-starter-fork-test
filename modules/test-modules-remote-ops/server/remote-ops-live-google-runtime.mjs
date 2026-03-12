import { normalizeOptionalText } from "./remote-ops-shared-runtime.mjs";

export class LiveApiError extends Error {
  constructor(message, statusCode, payload) {
    super(message);
    this.name = "LiveApiError";
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export function buildAuthorizedHeaders(accessToken, extraHeaders = {}) {
  return {
    accept: "application/json",
    authorization: `Bearer ${accessToken}`,
    ...extraHeaders
  };
}

async function parseJsonResponse(response) {
  const rawText = await response.text();
  return rawText ? JSON.parse(rawText) : {};
}

function buildLiveApiError(payload, response) {
  return new LiveApiError(
    payload?.error?.message ?? payload?.error_description ?? payload?.error ?? "Google API request failed",
    response.status,
    payload
  );
}

export async function requestGoogleJson(url, accessToken, options = {}) {
  const headers = buildAuthorizedHeaders(accessToken, options.headers);
  const response = await fetch(url, {
    ...options,
    headers
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw buildLiveApiError(payload, response);
  }
  return payload;
}

export async function requestGoogleBuffer(url, accessToken, options = {}) {
  const headers = buildAuthorizedHeaders(accessToken, options.headers);
  const response = await fetch(url, {
    ...options,
    headers
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    const rawText = bytes.toString("utf8");
    const payload = rawText ? JSON.parse(rawText) : {};
    throw buildLiveApiError(payload, response);
  }
  return bytes;
}

export async function requestGoogleEmpty(url, accessToken, options = {}) {
  const headers = buildAuthorizedHeaders(accessToken, options.headers);
  const response = await fetch(url, {
    ...options,
    headers
  });
  if (!response.ok) {
    throw buildLiveApiError(await parseJsonResponse(response), response);
  }
  return true;
}

export async function requestGoogleUpload(url, accessToken, content, contentType = "application/octet-stream") {
  const response = await fetch(url, {
    method: "POST",
    headers: buildAuthorizedHeaders(accessToken, {
      "content-type": contentType
    }),
    body: content
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw buildLiveApiError(payload, response);
  }
  return payload;
}

export async function collectGoogleJsonPages({
  accessToken,
  buildUrl,
  extractItems,
  pageTokenField = "pageToken"
}) {
  const items = [];
  let pageToken = null;
  do {
    const payload = await requestGoogleJson(buildUrl(pageToken), accessToken);
    const pageItems = extractItems(payload);
    items.push(...pageItems);
    pageToken = normalizeOptionalText(payload?.[pageTokenField]);
  } while (pageToken);
  return items;
}
