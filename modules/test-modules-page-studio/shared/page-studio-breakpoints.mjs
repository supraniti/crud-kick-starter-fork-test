export const PAGE_STUDIO_BREAKPOINTS = Object.freeze(["desktop", "tablet", "mobile"]);

export const PAGE_STUDIO_BREAKPOINT_LABELS = Object.freeze({
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile"
});

export const PAGE_STUDIO_BREAKPOINT_INHERITANCE = Object.freeze({
  desktop: null,
  tablet: "desktop",
  mobile: "tablet"
});

export const PAGE_STUDIO_DEFAULT_EDITOR_GRID = Object.freeze({
  desktop: Object.freeze({ columns: 12, rowHeight: 32 }),
  tablet: Object.freeze({ columns: 12, rowHeight: 28 }),
  mobile: Object.freeze({ columns: 12, rowHeight: 24 })
});

export const PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT = Object.freeze({
  canvasMaxWidth: Object.freeze({
    desktop: 1280,
    tablet: 960,
    mobile: 420
  }),
  gap: Object.freeze({
    desktop: 3,
    tablet: 2,
    mobile: 1.5
  }),
  padding: Object.freeze({
    desktop: 3,
    tablet: 2,
    mobile: 1
  })
});

export function normalizePageStudioBreakpoint(value, fallback = "desktop") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return PAGE_STUDIO_BREAKPOINTS.includes(normalized) ? normalized : fallback;
}
