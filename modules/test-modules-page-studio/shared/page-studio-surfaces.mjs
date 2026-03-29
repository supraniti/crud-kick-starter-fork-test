export const PAGE_STUDIO_SURFACES = Object.freeze(["pages", "custom-widgets"]);

export const PAGE_STUDIO_SURFACE_LABELS = Object.freeze({
  pages: "Pages",
  "custom-widgets": "Custom Widgets"
});

export function normalizePageStudioSurface(value, fallback = "pages") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return PAGE_STUDIO_SURFACES.includes(normalized) ? normalized : fallback;
}
