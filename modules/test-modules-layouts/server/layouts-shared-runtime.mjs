import {
  parseStoredLayoutDocument,
  serializeLayoutDocument,
  validateLayoutDocument
} from "../shared/layout-document.mjs";

export const MODULE_ID = "test-modules-layouts";
export const LAYOUTS_COLLECTION_ID = "page-layouts";
export const LAYOUT_STATUS_SET = new Set(["draft", "ready"]);

export function toTimestamp(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeLayoutStatus(value, fallback = "draft") {
  const normalized = normalizeText(value).toLowerCase();
  return LAYOUT_STATUS_SET.has(normalized) ? normalized : fallback;
}

export function normalizeLayoutKey(value, fallback = "layout-shell") {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : fallback;
}

export function readLayoutDocumentInput(input, currentItem = null) {
  if (input?.layoutDocument && typeof input.layoutDocument === "object" && !Array.isArray(input.layoutDocument)) {
    return input.layoutDocument;
  }
  if (typeof input?.layoutDocumentJson === "string") {
    return parseStoredLayoutDocument(input.layoutDocumentJson);
  }
  if (typeof currentItem?.layoutDocumentJson === "string") {
    return parseStoredLayoutDocument(currentItem.layoutDocumentJson);
  }
  return parseStoredLayoutDocument(null);
}

export function prepareLayoutDocument(rawDocument) {
  const validation = validateLayoutDocument(rawDocument);
  return {
    document: validation.document,
    issues: validation.issues,
    serialized: serializeLayoutDocument(validation.document)
  };
}

export function buildExposedLayoutItem(item) {
  if (!item || typeof item !== "object") {
    return item;
  }

  return {
    ...item,
    summary: normalizeOptionalText(item.summary),
    layoutDocument: parseStoredLayoutDocument(item.layoutDocumentJson)
  };
}
