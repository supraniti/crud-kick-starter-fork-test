import { PAGE_STUDIO_BREAKPOINT_INHERITANCE } from "./page-studio-breakpoints.mjs";
import { materializePageStudioBreakpoints, normalizePageStudioEditorGrid } from "./page-studio-layout-transform.mjs";

function normalizeInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const normalized = Math.trunc(numeric);
  return Math.max(min, Math.min(max, normalized));
}

export function normalizePageStudioGridItem(rawValue = {}) {
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

export function sortPageStudioGridItems(items = []) {
  return [...items]
    .map((item) => normalizePageStudioGridItem(item))
    .filter((item) => item.blockId.length > 0)
    .sort(
      (left, right) =>
        left.y - right.y ||
        left.x - right.x ||
        left.blockId.localeCompare(right.blockId)
    );
}

function gridItemsMatch(left, right) {
  if (!left || !right) {
    return false;
  }
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.w === right.w &&
    left.h === right.h &&
    left.minW === right.minW &&
    left.minH === right.minH
  );
}

export function buildPageStudioExplicitGridItems({ breakpoint = "desktop", visibleItems = [], editorGrid = {} } = {}) {
  const sortedVisibleItems = sortPageStudioGridItems(visibleItems);
  if (breakpoint === "desktop") {
    return sortedVisibleItems;
  }

  const normalizedEditorGrid = normalizePageStudioEditorGrid(editorGrid);
  const materialized = materializePageStudioBreakpoints(normalizedEditorGrid);
  const parentBreakpoint = PAGE_STUDIO_BREAKPOINT_INHERITANCE[breakpoint];
  const parentItems = materialized[parentBreakpoint]?.items ?? [];
  const parentItemsByBlockId = new Map(parentItems.map((item) => [item.blockId, item]));

  return sortedVisibleItems.filter((item) => !gridItemsMatch(item, parentItemsByBlockId.get(item.blockId)));
}

export function createPageStudioDefaultGridItem({ blockId, existingItems = [] } = {}) {
  const nextY = sortPageStudioGridItems(existingItems).reduce(
    (maxValue, item) => Math.max(maxValue, item.y + item.h),
    0
  );

  return {
    blockId,
    x: 0,
    y: nextY,
    w: 12,
    h: 3,
    minW: 1,
    minH: 1
  };
}

export function removePageStudioBlockFromEditorGrid(editorGrid = {}, blockId = "") {
  const normalizedEditorGrid = normalizePageStudioEditorGrid(editorGrid);
  return Object.fromEntries(
    Object.entries(normalizedEditorGrid).map(([breakpoint, definition]) => [
      breakpoint,
      {
        ...definition,
        items: definition.items.filter((item) => item.blockId !== blockId)
      }
    ])
  );
}
