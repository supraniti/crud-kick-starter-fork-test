const SUPPORTED_TRANSLATION_LOCALES = Object.freeze([
  Object.freeze({ code: "en-US", label: "English (US)", nativeLabel: "English (US)" }),
  Object.freeze({ code: "fr-FR", label: "French", nativeLabel: "Francais" }),
  Object.freeze({ code: "he-IL", label: "Hebrew", nativeLabel: "עברית" }),
  Object.freeze({ code: "es-ES", label: "Spanish", nativeLabel: "Espanol" }),
  Object.freeze({ code: "de-DE", label: "German", nativeLabel: "Deutsch" })
]);

export const DEFAULT_SOURCE_LOCALE = "en-US";

export function normalizeLocaleCode(value, fallback = DEFAULT_SOURCE_LOCALE) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    return fallback;
  }
  const matched =
    SUPPORTED_TRANSLATION_LOCALES.find((entry) => entry.code.toLowerCase() === normalized.toLowerCase()) ??
    null;
  return matched?.code ?? normalized;
}

export function listSupportedTranslationLocales() {
  return [...SUPPORTED_TRANSLATION_LOCALES];
}

export function resolveTargetTranslationLocales(sourceLocale = DEFAULT_SOURCE_LOCALE) {
  const normalizedSourceLocale = normalizeLocaleCode(sourceLocale, DEFAULT_SOURCE_LOCALE);
  return SUPPORTED_TRANSLATION_LOCALES.filter((entry) => entry.code !== normalizedSourceLocale);
}

export function readLocaleLabel(localeCode) {
  const normalized = normalizeLocaleCode(localeCode, "");
  const matched = SUPPORTED_TRANSLATION_LOCALES.find((entry) => entry.code === normalized) ?? null;
  return matched?.label ?? normalized;
}
