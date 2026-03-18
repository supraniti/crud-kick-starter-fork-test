import crypto from "node:crypto";

function readVersionSeed(payload = {}) {
  return (
    payload?.resolvedAt
    ?? payload?.page?.updatedOn
    ?? payload?.page?.publishedOn
    ?? payload?.page?.createdOn
    ?? payload?.page?.id
    ?? "page-runtime-asset"
  );
}

export function buildPageRuntimeAssetVersionSuffix(payload = {}) {
  const digest = crypto
    .createHash("sha1")
    .update(String(readVersionSeed(payload)))
    .digest("hex")
    .slice(0, 12);
  return `v=${digest}`;
}

export function appendRuntimeAssetVersion(url, payload = {}) {
  if (typeof url !== "string" || url.trim().length === 0) {
    return url;
  }
  const versionToken = buildPageRuntimeAssetVersionSuffix(payload);
  return url.includes("?") ? `${url}&${versionToken}` : `${url}?${versionToken}`;
}
