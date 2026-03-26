import {
  buildPredefinedThemeRecords,
  normalizeThemeDocument,
  normalizeThemeKey,
  serializeThemeDocument
} from "../shared/theme-document.mjs";

export const MODULE_ID = "test-modules-themes";
export const THEMES_COLLECTION_ID = "page-themes";
export const THEME_STATUS_SET = new Set(["draft", "ready", "archived"]);

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
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeThemeStatus(value, fallback = "draft") {
  const normalized = normalizeText(value).toLowerCase();
  return THEME_STATUS_SET.has(normalized) ? normalized : fallback;
}

export function parseStoredThemeDocument(value, options = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizeThemeDocument(value, options);
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return normalizeThemeDocument({}, options);
  }
  try {
    return normalizeThemeDocument(JSON.parse(value), options);
  } catch {
    return normalizeThemeDocument({}, options);
  }
}

export function buildSerializedThemeDocument(input = {}, options = {}) {
  return serializeThemeDocument(parseStoredThemeDocument(input, options));
}

export function buildExposedThemeItem(item) {
  if (!item || typeof item !== "object") {
    return item;
  }

  return {
    ...item,
    summary: normalizeOptionalText(item.summary),
    themeDocument: parseStoredThemeDocument(item.themeDocumentJson, {
      fallbackThemeKey: item.themeKey,
      fallbackTitle: item.title
    })
  };
}

export function buildThemeFallbackRecord() {
  const [defaultTheme] = buildPredefinedThemeRecords();
  return {
    id: "theme-fallback-editorial-default",
    ...defaultTheme,
    createdOn: toTimestamp(),
    updatedOn: toTimestamp(),
    themeDocument: parseStoredThemeDocument(defaultTheme.themeDocumentJson, {
      fallbackThemeKey: defaultTheme.themeKey,
      fallbackTitle: defaultTheme.title
    })
  };
}

export function buildPreparedThemeValue(input = {}, currentItem = null) {
  const timestamp = toTimestamp();
  const title = normalizeText(input?.title ?? currentItem?.title, "");
  const themeKey = normalizeThemeKey(input?.themeKey ?? currentItem?.themeKey ?? title, "theme");
  const themeDocument = parseStoredThemeDocument(
    input?.themeDocument ?? input?.themeDocumentJson ?? currentItem?.themeDocumentJson ?? {},
    {
      fallbackThemeKey: themeKey,
      fallbackTitle: title || "Untitled Theme"
    }
  );
  return {
    ...(currentItem ?? {}),
    title,
    themeKey,
    summary: normalizeOptionalText(input?.summary ?? currentItem?.summary),
    status: normalizeThemeStatus(input?.status ?? currentItem?.status, currentItem ? "draft" : "ready"),
    isGlobalDefault:
      typeof input?.isGlobalDefault === "boolean"
        ? input.isGlobalDefault
        : currentItem?.isGlobalDefault === true,
    themeDocumentJson: serializeThemeDocument(themeDocument),
    themeDocument,
    createdOn: currentItem?.createdOn ?? timestamp,
    updatedOn: timestamp,
    currentItemId: currentItem?.id ?? null
  };
}

export function buildPersistedThemeBody(preparedValue) {
  return {
    title: preparedValue.title,
    themeKey: preparedValue.themeKey,
    summary: preparedValue.summary,
    status: preparedValue.status,
    isGlobalDefault: preparedValue.isGlobalDefault === true,
    themeDocumentJson: preparedValue.themeDocumentJson,
    createdOn: preparedValue.createdOn,
    updatedOn: preparedValue.updatedOn
  };
}
