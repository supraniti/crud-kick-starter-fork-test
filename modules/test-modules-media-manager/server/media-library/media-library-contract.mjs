import { resolveMediaLibraryRootDir } from "./media-library-root.mjs";

const MODULE_ID = "test-modules-media-manager";
const MEDIA_ITEMS_COLLECTION_ID = "media-items";
const MEDIA_COMPRESSION_MISSION_ID = "media-library-image-compression";
const MEDIA_LIBRARY_ROOT = resolveMediaLibraryRootDir({
  moduleUrl: import.meta.url
});
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp"
]);
const ALLOWED_MIME_TYPE_SET = new Set(ALLOWED_MIME_TYPES);
const MIME_EXTENSION_MAP = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
});
const EDITABLE_METADATA_FIELDS = Object.freeze([
  "displayName",
  "altText",
  "description",
  "category",
  "usageLabels"
]);
const OPERATION_PRESET_CATALOG = Object.freeze({
  "web-optimized": Object.freeze({
    id: "web-optimized",
    label: "Web Optimized",
    mimeType: "image/webp",
    extension: "webp",
    quality: 72,
    width: null
  }),
  thumbnail: Object.freeze({
    id: "thumbnail",
    label: "Thumbnail",
    mimeType: "image/jpeg",
    extension: "jpg",
    quality: 82,
    width: 480
  })
});

export {
  ALLOWED_MIME_TYPES,
  ALLOWED_MIME_TYPE_SET,
  EDITABLE_METADATA_FIELDS,
  MAX_UPLOAD_BYTES,
  MEDIA_COMPRESSION_MISSION_ID,
  MEDIA_ITEMS_COLLECTION_ID,
  MEDIA_LIBRARY_ROOT,
  MIME_EXTENSION_MAP,
  MODULE_ID,
  OPERATION_PRESET_CATALOG
};
