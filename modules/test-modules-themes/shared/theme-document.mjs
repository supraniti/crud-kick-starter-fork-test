function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeEnum(value, allowedValues, fallback) {
  return allowedValues.has(value) ? value : fallback;
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

function normalizeHexColor(value, fallback) {
  const normalized = normalizeText(value, fallback).toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [r, g, b] = normalized.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function parseHexColor(hexColor, fallback = "#000000") {
  const normalized = normalizeHexColor(hexColor, fallback).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function toHexColor({ r, g, b }) {
  return `#${[r, g, b]
    .map((value) => Math.min(255, Math.max(0, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHexColors(left, right, ratio = 0.5) {
  const resolvedRatio = clampNumber(ratio, 0.5, 0, 1);
  const leftRgb = parseHexColor(left);
  const rightRgb = parseHexColor(right);
  return toHexColor({
    r: leftRgb.r + (rightRgb.r - leftRgb.r) * resolvedRatio,
    g: leftRgb.g + (rightRgb.g - leftRgb.g) * resolvedRatio,
    b: leftRgb.b + (rightRgb.b - leftRgb.b) * resolvedRatio
  });
}

function toRgbString(hexColor, alpha = 1) {
  const color = parseHexColor(hexColor);
  const resolvedAlpha = clampNumber(alpha, 1, 0, 1);
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${resolvedAlpha})`;
}

function relativeChannelLuminance(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hexColor) {
  const color = parseHexColor(hexColor);
  return (
    0.2126 * relativeChannelLuminance(color.r) +
    0.7152 * relativeChannelLuminance(color.g) +
    0.0722 * relativeChannelLuminance(color.b)
  );
}

function pickReadableInk(backgroundColor) {
  return getRelativeLuminance(backgroundColor) > 0.55 ? "#1f1720" : "#f8f6f2";
}

function buildSoftAccent(accentColor, backgroundColor) {
  return mixHexColors(accentColor, backgroundColor, 0.78);
}

function buildMutedInk(inkColor, backgroundColor) {
  return mixHexColors(inkColor, backgroundColor, 0.42);
}

function buildLineColor(inkColor, backgroundColor) {
  return toRgbString(mixHexColors(inkColor, backgroundColor, 0.76), 0.55);
}

function buildShadowColor(inkColor) {
  return `0 24px 60px ${toRgbString(inkColor, 0.14)}`;
}

export function normalizeThemeKey(value, fallback = "theme") {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

const FONT_SOURCE_SET = new Set(["google", "custom"]);
const SCREEN_PROFILE_IDS = ["desktop", "tablet", "mobile"];
const FONT_ROLE_IDS = ["heading", "body"];

export const GOOGLE_FONT_OPTIONS = Object.freeze([
  {
    family: "Fraunces",
    cssFamily: "'Fraunces', serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700;800&display=swap"
  },
  {
    family: "Source Serif 4",
    cssFamily: "'Source Serif 4', serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&display=swap"
  },
  {
    family: "Playfair Display",
    cssFamily: "'Playfair Display', serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&display=swap"
  },
  {
    family: "Libre Baskerville",
    cssFamily: "'Libre Baskerville', serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap"
  },
  {
    family: "Inter",
    cssFamily: "'Inter', sans-serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
  },
  {
    family: "DM Sans",
    cssFamily: "'DM Sans', sans-serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap"
  },
  {
    family: "Work Sans",
    cssFamily: "'Work Sans', sans-serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700;800&display=swap"
  },
  {
    family: "IBM Plex Sans",
    cssFamily: "'IBM Plex Sans', sans-serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
  },
  {
    family: "Space Grotesk",
    cssFamily: "'Space Grotesk', sans-serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
  }
]);

const GOOGLE_FONT_BY_FAMILY = new Map(
  GOOGLE_FONT_OPTIONS.map((option) => [option.family.toLowerCase(), option])
);

const DEFAULT_TYPOGRAPHY_SCREEN = Object.freeze({
  h1: { fontSize: "clamp(2.9rem, 7vw, 5.4rem)", lineHeight: 0.94, fontWeight: 700, letterSpacing: "-0.04em" },
  h2: { fontSize: "2rem", lineHeight: 1.04, fontWeight: 700, letterSpacing: "-0.02em" },
  h3: { fontSize: "1.35rem", lineHeight: 1.18, fontWeight: 700, letterSpacing: "-0.01em" },
  body: { fontSize: "1.05rem", lineHeight: 1.8, fontWeight: 400, letterSpacing: "0em" },
  caption: { fontSize: "0.92rem", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.02em" }
});

const DEFAULT_TABLET_TYPOGRAPHY_SCREEN = Object.freeze({
  h1: { fontSize: "clamp(2.4rem, 8vw, 4.2rem)" },
  h2: { fontSize: "1.8rem" },
  h3: { fontSize: "1.25rem" },
  body: { fontSize: "1rem" },
  caption: { fontSize: "0.88rem" }
});

const DEFAULT_MOBILE_TYPOGRAPHY_SCREEN = Object.freeze({
  h1: { fontSize: "clamp(2rem, 10vw, 3.1rem)", lineHeight: 0.98 },
  h2: { fontSize: "1.55rem" },
  h3: { fontSize: "1.12rem" },
  body: { fontSize: "0.98rem", lineHeight: 1.72 },
  caption: { fontSize: "0.84rem" }
});

const DEFAULT_SPACING_SCREEN = Object.freeze({
  pageGutter: 24,
  sectionGap: 32,
  blockGap: 16,
  radius: 28
});

const DEFAULT_TABLET_SPACING_SCREEN = Object.freeze({
  pageGutter: 20,
  sectionGap: 28,
  blockGap: 14,
  radius: 24
});

const DEFAULT_MOBILE_SPACING_SCREEN = Object.freeze({
  pageGutter: 18,
  sectionGap: 24,
  blockGap: 12,
  radius: 20
});

function mergePlainObjects(baseValue, overrideValue) {
  const base = baseValue && typeof baseValue === "object" && !Array.isArray(baseValue) ? baseValue : {};
  const override =
    overrideValue && typeof overrideValue === "object" && !Array.isArray(overrideValue) ? overrideValue : {};
  return {
    ...cloneJsonValue(base),
    ...cloneJsonValue(override)
  };
}

function normalizeTypeToken(source = {}, defaults = {}) {
  const merged = mergePlainObjects(defaults, source);
  return {
    fontSize: normalizeText(merged.fontSize, defaults.fontSize),
    lineHeight: clampNumber(merged.lineHeight, defaults.lineHeight, 0.8, 3),
    fontWeight: clampNumber(merged.fontWeight, defaults.fontWeight, 100, 900),
    letterSpacing: normalizeText(merged.letterSpacing, defaults.letterSpacing)
  };
}

function normalizeTypographyScreen(source = {}, defaults = DEFAULT_TYPOGRAPHY_SCREEN) {
  return {
    h1: normalizeTypeToken(source.h1, defaults.h1),
    h2: normalizeTypeToken(source.h2, defaults.h2),
    h3: normalizeTypeToken(source.h3, defaults.h3),
    body: normalizeTypeToken(source.body, defaults.body),
    caption: normalizeTypeToken(source.caption, defaults.caption)
  };
}

function normalizeSpacingScreen(source = {}, defaults = DEFAULT_SPACING_SCREEN) {
  const merged = mergePlainObjects(defaults, source);
  return {
    pageGutter: clampNumber(merged.pageGutter, defaults.pageGutter, 8, 80),
    sectionGap: clampNumber(merged.sectionGap, defaults.sectionGap, 8, 96),
    blockGap: clampNumber(merged.blockGap, defaults.blockGap, 4, 64),
    radius: clampNumber(merged.radius, defaults.radius, 0, 64)
  };
}

function normalizeFontRole(roleValue, fallbackFamily) {
  const source = roleValue && typeof roleValue === "object" ? roleValue : {};
  const normalizedSource = normalizeEnum(source.source, FONT_SOURCE_SET, "google");
  const fallbackGoogle = GOOGLE_FONT_BY_FAMILY.get(String(fallbackFamily).toLowerCase()) ?? GOOGLE_FONT_OPTIONS[0];
  const normalizedFamily =
    normalizedSource === "google"
      ? normalizeText(source.family, fallbackGoogle.family)
      : normalizeText(source.family, fallbackFamily);
  return {
    source: normalizedSource,
    family: normalizedFamily,
    stylesheetUrl:
      normalizedSource === "custom" ? normalizeOptionalText(source.stylesheetUrl ?? source.url) : null
  };
}

function buildResolvedFontRole(fontRole, fallbackFamily) {
  const normalized = normalizeFontRole(fontRole, fallbackFamily);
  const googleOption = GOOGLE_FONT_BY_FAMILY.get(normalized.family.toLowerCase()) ?? null;
  return {
    ...normalized,
    cssFamily:
      normalized.source === "google"
        ? googleOption?.cssFamily ?? `'${normalized.family}', sans-serif`
        : `'${normalized.family}', sans-serif`,
    stylesheetUrl:
      normalized.source === "google"
        ? googleOption?.stylesheetUrl ?? null
        : normalized.stylesheetUrl
  };
}

function buildResolvedTypographyModel(source = {}) {
  const desktop = normalizeTypographyScreen(source.desktop, DEFAULT_TYPOGRAPHY_SCREEN);
  const tablet = normalizeTypographyScreen(
    mergePlainObjects(desktop, source.tablet),
    mergePlainObjects(desktop, DEFAULT_TABLET_TYPOGRAPHY_SCREEN)
  );
  const mobile = normalizeTypographyScreen(
    mergePlainObjects(tablet, source.mobile),
    mergePlainObjects(tablet, DEFAULT_MOBILE_TYPOGRAPHY_SCREEN)
  );
  return { desktop, tablet, mobile };
}

function buildResolvedSpacingModel(source = {}) {
  const desktop = normalizeSpacingScreen(source.desktop, DEFAULT_SPACING_SCREEN);
  const tablet = normalizeSpacingScreen(
    mergePlainObjects(desktop, source.tablet),
    mergePlainObjects(desktop, DEFAULT_TABLET_SPACING_SCREEN)
  );
  const mobile = normalizeSpacingScreen(
    mergePlainObjects(tablet, source.mobile),
    mergePlainObjects(tablet, DEFAULT_MOBILE_SPACING_SCREEN)
  );
  return { desktop, tablet, mobile };
}

function buildResolvedColorModel(source = {}) {
  const normalized = {
    primary: normalizeHexColor(source.primary, "#8a4b22"),
    secondary: normalizeHexColor(source.secondary, "#325c74"),
    accent: normalizeHexColor(source.accent, "#c98d42"),
    surface: normalizeHexColor(source.surface, "#fffaf2"),
    background: normalizeHexColor(source.background, "#f6efe3")
  };
  const ink = pickReadableInk(normalized.background);
  return {
    ...normalized,
    ink,
    muted: buildMutedInk(ink, normalized.background),
    line: buildLineColor(ink, normalized.background),
    accentSoft: buildSoftAccent(normalized.accent, normalized.surface),
    shadow: buildShadowColor(ink)
  };
}

function buildThemeVariables({
  colors,
  fonts,
  typography,
  spacing
}) {
  return {
    "--page-bg": colors.background,
    "--page-card": colors.surface,
    "--page-line": colors.line,
    "--page-ink": colors.ink,
    "--page-muted": colors.muted,
    "--page-accent": colors.accent,
    "--page-accent-soft": colors.accentSoft,
    "--page-shadow": colors.shadow,
    "--page-primary": colors.primary,
    "--page-secondary": colors.secondary,
    "--page-heading-font": fonts.heading.cssFamily,
    "--page-body-font": fonts.body.cssFamily,
    "--page-h1-size": typography.h1.fontSize,
    "--page-h1-line-height": String(typography.h1.lineHeight),
    "--page-h1-weight": String(typography.h1.fontWeight),
    "--page-h1-letter-spacing": typography.h1.letterSpacing,
    "--page-h2-size": typography.h2.fontSize,
    "--page-h2-line-height": String(typography.h2.lineHeight),
    "--page-h2-weight": String(typography.h2.fontWeight),
    "--page-h2-letter-spacing": typography.h2.letterSpacing,
    "--page-h3-size": typography.h3.fontSize,
    "--page-h3-line-height": String(typography.h3.lineHeight),
    "--page-h3-weight": String(typography.h3.fontWeight),
    "--page-h3-letter-spacing": typography.h3.letterSpacing,
    "--page-body-size": typography.body.fontSize,
    "--page-body-line-height": String(typography.body.lineHeight),
    "--page-body-weight": String(typography.body.fontWeight),
    "--page-caption-size": typography.caption.fontSize,
    "--page-caption-line-height": String(typography.caption.lineHeight),
    "--page-caption-weight": String(typography.caption.fontWeight),
    "--page-gutter": `${spacing.pageGutter}px`,
    "--page-section-gap": `${spacing.sectionGap}px`,
    "--page-block-gap": `${spacing.blockGap}px`,
    "--page-radius": `${spacing.radius}px`
  };
}

export function normalizeThemeDocument(rawValue = {}, options = {}) {
  const fallbackThemeKey = normalizeThemeKey(options.fallbackThemeKey ?? "editorial-default");
  const source = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) ? rawValue : {};
  const typographyModel = buildResolvedTypographyModel(source.typographyModel ?? {});
  const spacingModel = buildResolvedSpacingModel(source.spacingModel ?? {});
  const fonts = {
    heading: buildResolvedFontRole(source.fontModel?.heading, "Fraunces"),
    body: buildResolvedFontRole(source.fontModel?.body, "Source Serif 4")
  };
  const colors = buildResolvedColorModel(source.colorModel ?? {});
  const stylesheetUrls = [...new Set(
    FONT_ROLE_IDS.map((roleId) => fonts[roleId].stylesheetUrl).filter(Boolean)
  )];
  return {
    version: 1,
    themeKey: normalizeThemeKey(source.themeKey, fallbackThemeKey),
    title: normalizeText(source.title, options.fallbackTitle ?? "Untitled Theme"),
    fontModel: {
      heading: cloneJsonValue(fonts.heading),
      body: cloneJsonValue(fonts.body),
      customFonts: Array.isArray(source.fontModel?.customFonts)
        ? source.fontModel.customFonts
            .map((entry) => ({
              family: normalizeOptionalText(entry?.family),
              stylesheetUrl: normalizeOptionalText(entry?.stylesheetUrl ?? entry?.url)
            }))
            .filter((entry) => entry.family && entry.stylesheetUrl)
        : []
    },
    colorModel: cloneJsonValue(colors),
    typographyModel: cloneJsonValue(typographyModel),
    spacingModel: cloneJsonValue(spacingModel),
    resolved: {
      stylesheetUrls,
      fonts: {
        headingFamily: fonts.heading.cssFamily,
        bodyFamily: fonts.body.cssFamily
      },
      variables: {
        base: buildThemeVariables({
          colors,
          fonts,
          typography: typographyModel.desktop,
          spacing: spacingModel.desktop
        }),
        tablet: buildThemeVariables({
          colors,
          fonts,
          typography: typographyModel.tablet,
          spacing: spacingModel.tablet
        }),
        mobile: buildThemeVariables({
          colors,
          fonts,
          typography: typographyModel.mobile,
          spacing: spacingModel.mobile
        })
      }
    }
  };
}

export function serializeThemeDocument(themeDocument = {}) {
  return JSON.stringify(normalizeThemeDocument(themeDocument), null, 2);
}

function buildThemeDocument(overrides = {}) {
  return normalizeThemeDocument({
    title: overrides.title,
    themeKey: overrides.themeKey,
    fontModel: overrides.fontModel,
    colorModel: overrides.colorModel,
    typographyModel: overrides.typographyModel,
    spacingModel: overrides.spacingModel
  });
}

export const PREDEFINED_THEME_DOCUMENTS = Object.freeze([
  buildThemeDocument({
    title: "Editorial Default",
    themeKey: "editorial-default",
    fontModel: {
      heading: { source: "google", family: "Fraunces" },
      body: { source: "google", family: "Source Serif 4" }
    },
    colorModel: {
      primary: "#8a4b22",
      secondary: "#325c74",
      accent: "#c98d42",
      surface: "#fffaf2",
      background: "#f6efe3"
    }
  }),
  buildThemeDocument({
    title: "Newsprint Morning",
    themeKey: "newsprint-morning",
    fontModel: {
      heading: { source: "google", family: "Playfair Display" },
      body: { source: "google", family: "Libre Baskerville" }
    },
    colorModel: {
      primary: "#2f2d2a",
      secondary: "#807667",
      accent: "#b76d2f",
      surface: "#fbf6ef",
      background: "#f2ece3"
    },
    spacingModel: {
      desktop: { pageGutter: 28, sectionGap: 36, blockGap: 16, radius: 16 }
    }
  }),
  buildThemeDocument({
    title: "Coastal Notes",
    themeKey: "coastal-notes",
    fontModel: {
      heading: { source: "google", family: "Fraunces" },
      body: { source: "google", family: "DM Sans" }
    },
    colorModel: {
      primary: "#155e75",
      secondary: "#0f766e",
      accent: "#e88b4d",
      surface: "#f6fbfb",
      background: "#edf7f8"
    }
  }),
  buildThemeDocument({
    title: "Midnight Journal",
    themeKey: "midnight-journal",
    fontModel: {
      heading: { source: "google", family: "Libre Baskerville" },
      body: { source: "google", family: "DM Sans" }
    },
    colorModel: {
      primary: "#f3b35b",
      secondary: "#94a3b8",
      accent: "#f97316",
      surface: "#111827",
      background: "#0b1120"
    }
  }),
  buildThemeDocument({
    title: "Signal Grid",
    themeKey: "signal-grid",
    fontModel: {
      heading: { source: "google", family: "Space Grotesk" },
      body: { source: "google", family: "IBM Plex Sans" }
    },
    colorModel: {
      primary: "#1d4ed8",
      secondary: "#0f172a",
      accent: "#ef4444",
      surface: "#f8fafc",
      background: "#eef2ff"
    },
    typographyModel: {
      desktop: {
        h1: { fontSize: "clamp(2.8rem, 7vw, 5rem)", lineHeight: 0.9, letterSpacing: "-0.06em" },
        body: { fontSize: "1rem", lineHeight: 1.72 }
      }
    },
    spacingModel: {
      desktop: { pageGutter: 24, sectionGap: 28, blockGap: 14, radius: 18 }
    }
  })
]);

export function buildPredefinedThemeRecords() {
  return PREDEFINED_THEME_DOCUMENTS.map((themeDocument, index) => ({
    title: themeDocument.title,
    themeKey: themeDocument.themeKey,
    summary:
      index === 0
        ? "Warm editorial serif system seeded as the global default."
        : `${themeDocument.title} seeded starter theme.`,
    status: "ready",
    isGlobalDefault: index === 0,
    themeDocumentJson: serializeThemeDocument(themeDocument)
  }));
}

export function findGoogleFontOption(family) {
  if (!family) {
    return null;
  }
  return GOOGLE_FONT_BY_FAMILY.get(String(family).toLowerCase()) ?? null;
}

export function resolveThemeDocumentForPreview(themeDocument = {}) {
  return normalizeThemeDocument(themeDocument);
}

export { SCREEN_PROFILE_IDS };
