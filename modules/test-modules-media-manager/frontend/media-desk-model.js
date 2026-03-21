const DEFAULT_SORT = "recent";
const DEFAULT_TAB = "preview";
const DEFAULT_VIEW = "gallery";

export const MEDIA_SORT_OPTIONS = Object.freeze([
  { value: "recent", label: "Recently Updated" },
  { value: "oldest", label: "Oldest Updated" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "category", label: "Category" },
  { value: "usage-desc", label: "Most Used" }
]);

export const MEDIA_DETAIL_TABS = Object.freeze([
  { value: "preview", label: "Preview" },
  { value: "details", label: "Details" },
  { value: "usage", label: "Usage" },
  { value: "publish", label: "Publish" }
]);

export const MEDIA_VIEW_OPTIONS = Object.freeze([
  { value: "gallery", label: "Gallery" },
  { value: "list", label: "List" }
]);

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSortValue(value) {
  const candidate = toTrimmedString(value);
  return MEDIA_SORT_OPTIONS.some((option) => option.value === candidate) ? candidate : DEFAULT_SORT;
}

function normalizeTabValue(value) {
  const candidate = toTrimmedString(value);
  return MEDIA_DETAIL_TABS.some((tab) => tab.value === candidate) ? candidate : DEFAULT_TAB;
}

function normalizeViewValue(value) {
  const candidate = toTrimmedString(value);
  return MEDIA_VIEW_OPTIONS.some((option) => option.value === candidate) ? candidate : DEFAULT_VIEW;
}

function toTimestampValue(value) {
  const parsed = Date.parse(typeof value === "string" ? value : "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeComparableText(value) {
  return toTrimmedString(value).toLowerCase();
}

function toBooleanLabel(value) {
  if (value === true || value === "true") {
    return "true";
  }
  if (value === false || value === "false") {
    return "false";
  }
  return "";
}

export function resolveMediaDeskRouteState(route = {}) {
  return {
    search: toTrimmedString(route.search),
    status: toTrimmedString(route.status),
    category: toTrimmedString(route.category),
    isDerived: toBooleanLabel(route.isDerived),
    sort: normalizeSortValue(route.mediaSort),
    view: normalizeViewValue(route.mediaView),
    mediaId: toTrimmedString(route.mediaId),
    tab: normalizeTabValue(route.mediaTab)
  };
}

export function buildMediaSummary(items = [], usageByMediaId = new Map(), remoteSummary = {}) {
  return {
    total: items.length,
    inUse: items.filter((item) => (usageByMediaId.get(item.id)?.totalReferences ?? 0) > 0).length,
    missingAlt: items.filter((item) => toTrimmedString(item.altText).length === 0).length,
    notSynced: Number(remoteSummary.notSynced ?? 0),
    synced: Number(remoteSummary.synced ?? 0),
    changedLocally: Number(remoteSummary.changedLocally ?? 0)
  };
}

export function sortMediaItemsForDesk(items = [], sortValue, usageByMediaId = new Map()) {
  const nextItems = [...items];
  nextItems.sort((left, right) => {
    if (sortValue === "oldest") {
      return (
        toTimestampValue(left?.updatedOn ?? left?.createdOn) -
          toTimestampValue(right?.updatedOn ?? right?.createdOn) ||
        `${left?.displayName ?? ""}`.localeCompare(`${right?.displayName ?? ""}`)
      );
    }
    if (sortValue === "name-asc") {
      return `${left?.displayName ?? ""}`.localeCompare(`${right?.displayName ?? ""}`);
    }
    if (sortValue === "name-desc") {
      return `${right?.displayName ?? ""}`.localeCompare(`${left?.displayName ?? ""}`);
    }
    if (sortValue === "category") {
      return (
        `${left?.category ?? ""}`.localeCompare(`${right?.category ?? ""}`) ||
        `${left?.displayName ?? ""}`.localeCompare(`${right?.displayName ?? ""}`)
      );
    }
    if (sortValue === "usage-desc") {
      return (
        (usageByMediaId.get(right?.id)?.totalReferences ?? 0) -
          (usageByMediaId.get(left?.id)?.totalReferences ?? 0) ||
        `${left?.displayName ?? ""}`.localeCompare(`${right?.displayName ?? ""}`)
      );
    }
    return (
      toTimestampValue(right?.updatedOn ?? right?.createdOn) -
        toTimestampValue(left?.updatedOn ?? left?.createdOn) ||
      `${left?.displayName ?? ""}`.localeCompare(`${right?.displayName ?? ""}`)
    );
  });
  return nextItems;
}

export function countProfileFlags(item = {}) {
  let flags = 0;
  if (toTrimmedString(item.altText).length === 0) {
    flags += 1;
  }
  if (toTrimmedString(item.description).length === 0) {
    flags += 1;
  }
  return flags;
}

export function matchesSearchLabel(item = {}, searchValue = "") {
  const search = normalizeComparableText(searchValue);
  if (!search) {
    return true;
  }
  return [item.displayName, item.altText, item.description, item.category]
    .map(normalizeComparableText)
    .some((value) => value.includes(search));
}
