import crypto from "node:crypto";
import fs from "node:fs";

const RUNTIME_ASSET_VERSION_MODEL = "page-runtime-asset-v2";

function readVersionSeed(payload = {}) {
  return [
    RUNTIME_ASSET_VERSION_MODEL,
    payload?.resolvedAt ?? "",
    payload?.page?.updatedOn ?? "",
    payload?.page?.publishedOn ?? "",
    payload?.page?.createdOn ?? "",
    payload?.page?.id ?? "",
    payload?.delivery?.accessMode ?? "",
    payload?.delivery?.publicOrigin ?? "",
    payload?.delivery?.publicMediaBaseUrl ?? ""
  ].join("|");
}

const FILE_DIGEST_CACHE = new Map();

function readExtraVersionSeed(extraSeed = "") {
  if (typeof extraSeed !== "string" || extraSeed.trim().length === 0) {
    return "";
  }
  if (!fs.existsSync(extraSeed)) {
    return extraSeed;
  }
  const stats = fs.statSync(extraSeed);
  const cacheKey = `${extraSeed}:${stats.size}:${stats.mtimeMs}`;
  if (FILE_DIGEST_CACHE.has(cacheKey)) {
    return FILE_DIGEST_CACHE.get(cacheKey);
  }
  const digest = crypto
    .createHash("sha1")
    .update(fs.readFileSync(extraSeed))
    .digest("hex")
    .slice(0, 12);
  FILE_DIGEST_CACHE.clear();
  FILE_DIGEST_CACHE.set(cacheKey, digest);
  return digest;
}

export function buildPageRuntimeAssetVersionSuffix(payload = {}, extraSeed = "") {
  const digest = crypto
    .createHash("sha1")
    .update(String(readVersionSeed(payload)))
    .update("|")
    .update(String(readExtraVersionSeed(extraSeed)))
    .digest("hex")
    .slice(0, 12);
  return `v=${digest}`;
}

export function appendRuntimeAssetVersion(url, payload = {}, extraSeed = "") {
  if (typeof url !== "string" || url.trim().length === 0) {
    return url;
  }
  const versionToken = buildPageRuntimeAssetVersionSuffix(payload, extraSeed);
  return url.includes("?") ? `${url}&${versionToken}` : `${url}?${versionToken}`;
}
