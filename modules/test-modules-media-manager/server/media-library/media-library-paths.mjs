import fs from "node:fs/promises";
import path from "node:path";
import { MIME_EXTENSION_MAP } from "./media-library-contract.mjs";
import { resolveMediaLibraryRootDir } from "./media-library-root.mjs";

function sanitizeFileStem(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  const safe = normalized
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return safe.length > 0 ? safe : "asset";
}

function resolveMediaExtension(mimeType, fileName = "") {
  const byMime = MIME_EXTENSION_MAP[mimeType] ?? "";
  if (byMime.length > 0) {
    return byMime;
  }

  const parsed = path.parse(typeof fileName === "string" ? fileName : "");
  const normalizedExtension = parsed.ext.replace(/^\./, "").trim().toLowerCase();
  return normalizedExtension.length > 0 ? normalizedExtension : "bin";
}

function toPosixRelativePath(...segments) {
  return path.posix.join(...segments.map((segment) => `${segment}`.replace(/\\/g, "/")));
}

function buildOriginalRelativePath(itemId, mimeType, fileName) {
  const extension = resolveMediaExtension(mimeType, fileName);
  const stem = sanitizeFileStem(fileName);
  return toPosixRelativePath("originals", `${itemId}-${stem}.${extension}`);
}

function buildDerivedRelativePath(sourceMediaId, itemId, presetId, extension) {
  return toPosixRelativePath(
    "derived",
    sourceMediaId,
    `${itemId}-${presetId}.${extension}`
  );
}

function resolveMediaLibraryRoot() {
  return resolveMediaLibraryRootDir({
    moduleUrl: import.meta.url
  });
}

function resolveMediaAbsolutePath(relativePath) {
  const mediaLibraryRoot = resolveMediaLibraryRoot();
  const absolutePath = path.resolve(mediaLibraryRoot, relativePath);
  const relativeFromRoot = path.relative(mediaLibraryRoot, absolutePath);
  if (relativeFromRoot.startsWith("..") || path.isAbsolute(relativeFromRoot)) {
    const error = new Error("Media asset path escapes the media-library root");
    error.code = "MEDIA_PATH_INVALID";
    error.statusCode = 400;
    throw error;
  }

  return absolutePath;
}

async function ensureMediaDirectoryForRelativePath(relativePath) {
  const absolutePath = resolveMediaAbsolutePath(relativePath);
  await fs.mkdir(path.dirname(absolutePath), {
    recursive: true
  });
  return absolutePath;
}

export {
  buildDerivedRelativePath,
  buildOriginalRelativePath,
  ensureMediaDirectoryForRelativePath,
  resolveMediaAbsolutePath,
  resolveMediaExtension,
  sanitizeFileStem
};
