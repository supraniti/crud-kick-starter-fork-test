import {
  PAGE_STUDIO_BREAKPOINTS,
  PAGE_STUDIO_BREAKPOINT_INHERITANCE,
  PAGE_STUDIO_DEFAULT_EDITOR_GRID,
  PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT,
  normalizePageStudioBreakpoint
} from "./page-studio-breakpoints.mjs";

function normalizeInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const normalized = Math.trunc(numeric);
  return Math.max(min, Math.min(max, normalized));
}

function normalizeGridItem(rawValue = {}) {
  return {
    blockId: typeof rawValue?.blockId === "string" ? rawValue.blockId.trim() : "",
    x: normalizeInteger(rawValue?.x, 0, { min: 0, max: 11 }),
    y: normalizeInteger(rawValue?.y, 0, { min: 0, max: 999 }),
    w: normalizeInteger(rawValue?.w, 12, { min: 1, max: 12 }),
    h: normalizeInteger(rawValue?.h, 3, { min: 1, max: 200 }),
    minW: normalizeInteger(rawValue?.minW, 1, { min: 1, max: 12 }),
    minH: normalizeInteger(rawValue?.minH, 1, { min: 1, max: 200 })
  };
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeBreakpointGrid(rawValue = {}, breakpoint) {
  const defaults = PAGE_STUDIO_DEFAULT_EDITOR_GRID[breakpoint];
  const source = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) ? rawValue : {};
  return {
    inherits: normalizePageStudioBreakpoint(source.inherits, PAGE_STUDIO_BREAKPOINT_INHERITANCE[breakpoint] ?? breakpoint),
    columns: normalizeInteger(source.columns, defaults.columns, { min: 1, max: 24 }),
    rowHeight: normalizeInteger(source.rowHeight, defaults.rowHeight, { min: 8, max: 200 }),
    items: Array.isArray(source.items)
      ? source.items.map((entry) => normalizeGridItem(entry)).filter((entry) => entry.blockId.length > 0)
      : []
  };
}

function findNearestMaterializedParent(materializedByBreakpoint, breakpoint) {
  let current = PAGE_STUDIO_BREAKPOINT_INHERITANCE[breakpoint] ?? null;
  while (current) {
    const resolved = materializedByBreakpoint[current];
    if (resolved) {
      return resolved;
    }
    current = PAGE_STUDIO_BREAKPOINT_INHERITANCE[current] ?? null;
  }
  return null;
}

export function normalizePageStudioEditorGrid(rawValue = {}) {
  const source = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) ? rawValue : {};
  return Object.fromEntries(
    PAGE_STUDIO_BREAKPOINTS.map((breakpoint) => [
      breakpoint,
      normalizeBreakpointGrid(source[breakpoint], breakpoint)
    ])
  );
}

export function materializePageStudioBreakpoints(rawValue = {}) {
  const normalized = normalizePageStudioEditorGrid(rawValue);
  const materializedByBreakpoint = {};

  for (const breakpoint of PAGE_STUDIO_BREAKPOINTS) {
    const current = normalized[breakpoint];
    const inherited = breakpoint === "desktop" ? null : findNearestMaterializedParent(materializedByBreakpoint, breakpoint);
    const inheritedItems = new Map(
      (inherited?.items ?? []).map((entry) => [entry.blockId, cloneJsonValue(entry)])
    );

    current.items.forEach((item) => {
      inheritedItems.set(item.blockId, cloneJsonValue(item));
    });

    materializedByBreakpoint[breakpoint] = {
      columns: current.columns,
      rowHeight: current.rowHeight,
      items: [...inheritedItems.values()].sort(
        (left, right) =>
          left.y - right.y ||
          left.x - right.x ||
          left.blockId.localeCompare(right.blockId)
      )
    };
  }

  return materializedByBreakpoint;
}

export function buildPageStudioRuntimeLayoutContract({
  editorGrid = {},
  runtimeLayoutMetadata = {}
} = {}) {
  const materialized = materializePageStudioBreakpoints(editorGrid);
  const metadata = runtimeLayoutMetadata && typeof runtimeLayoutMetadata === "object"
    ? runtimeLayoutMetadata
    : {};
  const canvasMaxWidth = metadata.canvasMaxWidth ?? PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.canvasMaxWidth;
  const gap = metadata.gap ?? PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.gap;
  const padding = metadata.padding ?? PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.padding;

  return {
    contractVersion: 1,
    breakpoints: Object.fromEntries(
      PAGE_STUDIO_BREAKPOINTS.map((breakpoint) => [
        breakpoint,
        {
          columns: materialized[breakpoint].columns,
          rowHeight: materialized[breakpoint].rowHeight,
          canvasMaxWidth: canvasMaxWidth[breakpoint] ?? PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.canvasMaxWidth[breakpoint],
          gap: gap[breakpoint] ?? PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.gap[breakpoint],
          padding: padding[breakpoint] ?? PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.padding[breakpoint],
          items: materialized[breakpoint].items.map((item) => ({
            blockId: item.blockId,
            colStart: item.x + 1,
            colSpan: item.w,
            rowStart: item.y + 1,
            rowSpan: item.h
          }))
        }
      ])
    )
  };
}
