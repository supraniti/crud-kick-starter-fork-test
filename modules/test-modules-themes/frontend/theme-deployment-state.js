function parseTimestamp(value) {
  return Date.parse(value ?? "") || 0;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createState(label, tone, detail) {
  return {
    label,
    tone,
    detail
  };
}

function readPageThemeKey(page) {
  return normalizeText(page?.layoutModel?.themeKey ?? page?.themeKey ?? "");
}

function usesTheme(page, theme, globalDefaultThemeKey) {
  if (!page || page?.status !== "published") {
    return false;
  }

  const explicitThemeKey = readPageThemeKey(page);
  const themeKey = normalizeText(theme?.themeKey);
  if (explicitThemeKey) {
    return explicitThemeKey === themeKey;
  }

  return theme?.isGlobalDefault === true && themeKey === normalizeText(globalDefaultThemeKey);
}

export function resolveThemeDeploymentState(theme, pages = [], globalDefaultThemeKey = "") {
  if (!theme?.themeKey) {
    return createState("Unknown", "default", "No theme is selected.");
  }

  const linkedPages = (Array.isArray(pages) ? pages : []).filter((page) =>
    usesTheme(page, theme, globalDefaultThemeKey)
  );
  if (linkedPages.length === 0) {
    return createState(
      "Unused",
      "default",
      "No published page is currently rendering with this theme."
    );
  }

  const missingCount = linkedPages.filter((page) => page?.deploymentStatus === "missing").length;
  if (missingCount > 0) {
    return createState(
      "Missing Outputs",
      "warning",
      "A published page using this theme is still missing deployed HTML."
    );
  }

  const staleCount = linkedPages.filter((page) => page?.deploymentStatus === "stale").length;
  if (staleCount > 0) {
    return createState(
      "Needs Sync",
      "warning",
      "A published page using this theme needs a fresh release."
    );
  }

  const themeChangedOn = parseTimestamp(theme?.updatedOn ?? theme?.createdOn);
  const needsResyncFromTheme = linkedPages.some((page) => {
    const syncedOn = parseTimestamp(page?.deploymentSyncedOn ?? page?.deploymentLastRunOn);
    return syncedOn === 0 || themeChangedOn > syncedOn;
  });
  if (needsResyncFromTheme) {
    return createState(
      "Needs Sync",
      "warning",
      "This theme changed after the last successful page release."
    );
  }

  return createState(
    "Synced",
    "success",
    "Published pages using this theme are currently in sync."
  );
}
