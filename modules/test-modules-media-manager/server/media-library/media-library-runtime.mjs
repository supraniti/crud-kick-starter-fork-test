import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import {
  ALLOWED_MIME_TYPE_SET,
  MAX_UPLOAD_BYTES,
  OPERATION_PRESET_CATALOG
} from "./media-library-contract.mjs";
import {
  buildDerivedRelativePath,
  buildOriginalRelativePath,
  ensureMediaDirectoryForRelativePath,
  resolveMediaAbsolutePath
} from "./media-library-paths.mjs";
import {
  insertMediaItem,
  readMediaItem,
  removeMediaItem,
  reserveNextMediaItemId,
  updateMediaItem
} from "./media-library-repository.mjs";

const requireFromServerPackage = createRequire(
  new URL("../../../../server/package.json", import.meta.url)
);
const sharpModule = requireFromServerPackage("sharp");
const sharp = typeof sharpModule === "function" ? sharpModule : sharpModule.default;

function createMediaError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function decodeBase64Content(contentBase64) {
  const normalized = typeof contentBase64 === "string" ? contentBase64.trim() : "";
  if (normalized.length === 0) {
    throw createMediaError(
      "MEDIA_UPLOAD_CONTENT_MISSING",
      "Upload contentBase64 is required"
    );
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    throw createMediaError(
      "MEDIA_UPLOAD_CONTENT_INVALID",
      "Upload contentBase64 must be valid base64"
    );
  }

  try {
    return Buffer.from(normalized, "base64");
  } catch {
    throw createMediaError(
      "MEDIA_UPLOAD_CONTENT_INVALID",
      "Upload contentBase64 must be valid base64"
    );
  }
}

function normalizeMimeType(mimeType) {
  const normalized = typeof mimeType === "string" ? mimeType.trim().toLowerCase() : "";
  if (!ALLOWED_MIME_TYPE_SET.has(normalized)) {
    throw createMediaError(
      "MEDIA_UPLOAD_MIME_UNSUPPORTED",
      "Only JPEG, PNG, and WebP images are allowed"
    );
  }

  return normalized;
}

function normalizeDisplayName(displayName, fileName) {
  const direct = typeof displayName === "string" ? displayName.trim() : "";
  if (direct.length > 0) {
    return direct.slice(0, 160);
  }

  const parsed = path.parse(typeof fileName === "string" ? fileName : "");
  const derived = parsed.name.trim();
  return (derived.length > 0 ? derived : "Untitled media").slice(0, 160);
}

async function readImageMetadata(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height)) {
      throw new Error("missing image dimensions");
    }

    return {
      width: metadata.width,
      height: metadata.height
    };
  } catch {
    throw createMediaError(
      "MEDIA_UPLOAD_IMAGE_INVALID",
      "Uploaded file could not be decoded as a supported image"
    );
  }
}

async function writeMediaBuffer(relativePath, buffer) {
  const absolutePath = await ensureMediaDirectoryForRelativePath(relativePath);
  await fs.writeFile(absolutePath, buffer);
  return absolutePath;
}

async function removeMediaFile(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    return;
  }

  await fs.rm(resolveMediaAbsolutePath(relativePath), {
    force: true
  });
}

function createMediaItemRecord({
  itemId,
  displayName,
  mimeType,
  fileSizeBytes,
  width,
  height,
  relativePath,
  operationPreset = "original",
  sourceMediaId = null,
  status = "ready",
  category = "library",
  usageLabels = [],
  altText = "",
  description = ""
}) {
  const now = new Date().toISOString();
  return {
    id: itemId,
    displayName,
    mediaKind: "image",
    mimeType,
    fileSizeBytes,
    width,
    height,
    status,
    altText,
    description,
    category,
    usageLabels,
    isDerived: sourceMediaId !== null,
    sourceMediaId,
    operationPreset,
    storageKey: relativePath,
    relativePath,
    createdOn: now,
    updatedOn: now
  };
}

export async function createUploadedMediaItem(repository, input = {}) {
  const mimeType = normalizeMimeType(input.mimeType);
  const buffer = decodeBase64Content(input.contentBase64);
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    throw createMediaError(
      "MEDIA_UPLOAD_SIZE_INVALID",
      `Upload must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes`
    );
  }

  const displayName = normalizeDisplayName(input.displayName, input.fileName);
  const metadata = await readImageMetadata(buffer);
  const itemId = await reserveNextMediaItemId(repository);
  const relativePath = buildOriginalRelativePath(itemId, mimeType, input.fileName);
  const item = createMediaItemRecord({
    itemId,
    displayName,
    mimeType,
    fileSizeBytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
    relativePath
  });

  try {
    await writeMediaBuffer(relativePath, buffer);
    await insertMediaItem(repository, item);
    return item;
  } catch (error) {
    await removeMediaFile(relativePath).catch(() => undefined);
    throw error;
  }
}

export async function updateStoredMediaMetadata(repository, mediaItemId, patch = {}) {
  return updateMediaItem(repository, mediaItemId, async (item) => {
    Object.assign(item, patch, {
      updatedOn: new Date().toISOString()
    });
  });
}

export async function readStoredMediaContent(repository, mediaItemId) {
  const item = await readMediaItem(repository, mediaItemId);
  if (!item) {
    return null;
  }

  const absolutePath = resolveMediaAbsolutePath(item.relativePath);
  try {
    return {
      item,
      absolutePath,
      buffer: await fs.readFile(absolutePath)
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw createMediaError(
        "MEDIA_FILE_NOT_FOUND",
        `Stored file for '${mediaItemId}' is missing`,
        404
      );
    }
    throw error;
  }
}

export async function deleteStoredMediaItem(repository, mediaItemId) {
  const removed = await removeMediaItem(repository, mediaItemId);
  if (!removed) {
    return null;
  }

  await removeMediaFile(removed.relativePath).catch(() => undefined);
  return removed;
}

export async function createDerivedMediaItem(repository, mediaItemId, presetId) {
  const preset = OPERATION_PRESET_CATALOG[presetId] ?? null;
  if (!preset) {
    throw createMediaError("MEDIA_OPERATION_PRESET_INVALID", "Unknown media preset");
  }

  const sourceItem = await readMediaItem(repository, mediaItemId);
  if (!sourceItem) {
    throw createMediaError("MEDIA_ITEM_NOT_FOUND", `Media item '${mediaItemId}' was not found`, 404);
  }
  if (sourceItem.isDerived === true) {
    throw createMediaError(
      "MEDIA_OPERATION_SOURCE_INVALID",
      "Derived assets cannot be used as operation sources"
    );
  }

  await updateMediaItem(repository, mediaItemId, async (item) => {
    item.status = "processing";
    item.updatedOn = new Date().toISOString();
  });

  const sourceBuffer = await fs.readFile(resolveMediaAbsolutePath(sourceItem.relativePath));
  const derivedItemId = await reserveNextMediaItemId(repository);
  const relativePath = buildDerivedRelativePath(
    sourceItem.id,
    derivedItemId,
    preset.id,
    preset.extension
  );

  try {
    let image = sharp(sourceBuffer, {
      failOnError: true
    });
    if (preset.width) {
      image = image.resize({
        width: preset.width,
        fit: "inside",
        withoutEnlargement: true
      });
    }

    let outputBuffer;
    if (preset.mimeType === "image/webp") {
      outputBuffer = await image.webp({
        quality: preset.quality
      }).toBuffer();
    } else {
      outputBuffer = await image.flatten({
        background: "#ffffff"
      }).jpeg({
        quality: preset.quality
      }).toBuffer();
    }

    const metadata = await readImageMetadata(outputBuffer);
    await writeMediaBuffer(relativePath, outputBuffer);
    const derivedItem = createMediaItemRecord({
      itemId: derivedItemId,
      displayName: `${sourceItem.displayName} (${preset.label})`,
      mimeType: preset.mimeType,
      fileSizeBytes: outputBuffer.length,
      width: metadata.width,
      height: metadata.height,
      relativePath,
      operationPreset: preset.id,
      sourceMediaId: sourceItem.id,
      category: sourceItem.category,
      usageLabels: Array.isArray(sourceItem.usageLabels) ? [...sourceItem.usageLabels] : [],
      altText: sourceItem.altText ?? "",
      description: sourceItem.description ?? ""
    });
    await insertMediaItem(repository, derivedItem);
    await updateMediaItem(repository, mediaItemId, async (item) => {
      item.status = "ready";
      item.updatedOn = new Date().toISOString();
    });

    return {
      sourceMediaId: sourceItem.id,
      derivedMediaId: derivedItem.id,
      preset: preset.id
    };
  } catch (error) {
    await removeMediaFile(relativePath).catch(() => undefined);
    await updateMediaItem(repository, mediaItemId, async (item) => {
      item.status = "failed";
      item.updatedOn = new Date().toISOString();
    }).catch(() => undefined);
    throw error;
  }
}
