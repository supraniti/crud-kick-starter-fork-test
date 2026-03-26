export function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

export function normalizeTrimmedText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalText(value) {
  const normalized = normalizeTrimmedText(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeTranslationTextMap(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    Object.entries(source)
      .map(([locale, translatedValue]) => [normalizeTrimmedText(locale), typeof translatedValue === "string" ? translatedValue : ""])
      .filter(([locale, translatedValue]) => locale.length > 0 && translatedValue.trim().length > 0)
  );
}

export function parseTranslationsJson(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizeTranslationTextMap(value);
  }
  const rawValue = typeof value === "string" ? value.trim() : "";
  if (!rawValue) {
    return {};
  }
  try {
    return normalizeTranslationTextMap(JSON.parse(rawValue));
  } catch {
    return {};
  }
}

export function serializeTranslationsJson(value) {
  return JSON.stringify(normalizeTranslationTextMap(value));
}

export function buildTranslationUnitKey(entityType, entityId, fieldPath) {
  return [normalizeOptionalText(entityType) ?? "", normalizeOptionalText(entityId) ?? "", normalizeOptionalText(fieldPath) ?? ""].join("::");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parsePathSegments(pathValue) {
  return String(pathValue ?? "")
    .split(".")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const segments = [];
      entry.replace(/([^[.\]]+)|\[(\d+)\]/g, (_match, objectKey, arrayIndex) => {
        segments.push(objectKey ?? Number.parseInt(arrayIndex, 10));
        return "";
      });
      return segments;
    });
}

export function readValueAtPath(rootValue, pathValue) {
  const segments = parsePathSegments(pathValue);
  let cursor = rootValue;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
}

export function writeValueAtPath(rootValue, pathValue, nextValue) {
  const segments = parsePathSegments(pathValue);
  if (segments.length === 0) {
    return rootValue;
  }
  const clonedRoot = Array.isArray(rootValue) ? [...rootValue] : isPlainObject(rootValue) ? { ...rootValue } : {};
  let cursor = clonedRoot;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];
    const existing = cursor[segment];
    const replacement = Array.isArray(existing) ? [...existing] : isPlainObject(existing) ? { ...existing } : typeof nextSegment === "number" ? [] : {};
    cursor[segment] = replacement;
    cursor = replacement;
  }
  cursor[segments[segments.length - 1]] = nextValue;
  return clonedRoot;
}

export function buildTranslationProjectionDocumentId(pagePath, locale) {
  const normalizedPath = normalizeTrimmedText(pagePath).replace(/^\/+/, "").replace(/\/+$/g, "");
  const pathToken = normalizedPath ? normalizedPath.replace(/[^a-zA-Z0-9-_]+/g, "--") : "home";
  const localeToken = normalizeTrimmedText(locale).replace(/[^a-zA-Z0-9-_]+/g, "-") || "en-US";
  return `${pathToken}__${localeToken}`;
}
