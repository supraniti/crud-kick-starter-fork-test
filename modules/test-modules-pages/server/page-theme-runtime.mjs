import {
  THEMES_COLLECTION_ID,
  buildExposedThemeItem,
  buildPreparedThemeValue,
  buildThemeFallbackRecord
} from "../../test-modules-themes/server/themes-shared-runtime.mjs";
import { buildPredefinedThemeRecords } from "../../test-modules-themes/shared/theme-document.mjs";

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

async function listThemeItems(collectionHandlerRegistry) {
  const handler = collectionHandlerRegistry?.get?.(THEMES_COLLECTION_ID);
  const builtInThemes = buildPredefinedThemeRecords().map((record, index) =>
    buildExposedThemeItem({
      id: `theme-predefined-${index + 1}`,
      ...buildPreparedThemeValue(record),
      ...record
    })
  );
  if (!handler || typeof handler.list !== "function") {
    return builtInThemes;
  }
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  const persistedThemes = Array.isArray(payload?.items) ? payload.items.map(buildExposedThemeItem) : [];
  return persistedThemes.length > 0 ? persistedThemes : builtInThemes;
}

export async function resolvePageThemeSelection(collectionHandlerRegistry, page = {}) {
  const themes = await listThemeItems(collectionHandlerRegistry);
  const explicitThemeKey = normalizeText(page?.layoutModel?.themeKey, "");
  const explicitTheme = explicitThemeKey
    ? themes.find((item) => normalizeText(item?.themeKey, "") === explicitThemeKey) ?? null
    : null;
  const globalTheme = themes.find((item) => item?.isGlobalDefault === true) ?? null;
  const fallbackTheme = buildThemeFallbackRecord();
  const selectedTheme = explicitTheme ?? globalTheme ?? fallbackTheme;

  return {
    source: explicitTheme ? "page" : globalTheme ? "global" : "fallback",
    themeId: selectedTheme?.id ?? fallbackTheme.id,
    themeKey: selectedTheme?.themeKey ?? fallbackTheme.themeKey,
    title: selectedTheme?.title ?? fallbackTheme.title,
    isGlobalDefault: selectedTheme?.isGlobalDefault === true,
    document: selectedTheme?.themeDocument ?? fallbackTheme.themeDocument
  };
}
