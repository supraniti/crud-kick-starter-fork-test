export const PAGE_STUDIO_MODES = Object.freeze([
  "infra",
  "layout",
  "widgets",
  "preview"
]);

export const PAGE_STUDIO_MODE_LABELS = Object.freeze({
  infra: "Infra",
  layout: "Layout",
  widgets: "Widgets",
  preview: "Preview"
});

export function normalizePageStudioMode(value, fallback = "infra") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return PAGE_STUDIO_MODES.includes(normalized) ? normalized : fallback;
}
