import crypto from "node:crypto";
import { normalizeOptionalText } from "./distribution-shared-runtime.mjs";

export const READER_ROUTE_MANIFEST_ASSET_PATH = "assets/page-route-manifest.json";

function countPathSegments(pagePath) {
  return String(pagePath || "")
    .split("/")
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

function appendVersionQuery(url, versionToken = null) {
  const normalizedVersion = normalizeOptionalText(versionToken);
  if (!normalizedVersion) {
    return url;
  }
  const separator = String(url).includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(normalizedVersion)}`;
}

export function buildRelativeReaderRouteManifestAssetUrl(pagePath, versionToken = null) {
  const segmentCount = countPathSegments(pagePath);
  const relativePath = `${"../".repeat(segmentCount)}${READER_ROUTE_MANIFEST_ASSET_PATH}`;
  return appendVersionQuery(relativePath, versionToken);
}

export function buildPublicReaderRouteManifestAssetUrl(publicOrigin, versionToken = null) {
  const normalizedOrigin = normalizeOptionalText(publicOrigin)?.replace(/\/+$/g, "") ?? "";
  if (!normalizedOrigin) {
    return null;
  }
  return appendVersionQuery(`${normalizedOrigin}/${READER_ROUTE_MANIFEST_ASSET_PATH}`, versionToken);
}

export function resolveReaderRouteManifestAssetUrl(payload = {}, versionToken = null) {
  const publicOrigin = normalizeOptionalText(payload?.delivery?.publicOrigin);
  return (
    buildPublicReaderRouteManifestAssetUrl(publicOrigin, versionToken) ??
    buildRelativeReaderRouteManifestAssetUrl(payload?.page?.path ?? "/", versionToken)
  );
}

export function buildReaderRouteManifestVersionToken(routeManifest = null) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(routeManifest ?? null))
    .digest("hex")
    .slice(0, 16);
}
