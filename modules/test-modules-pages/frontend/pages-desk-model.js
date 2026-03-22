import { resolveSourceLabel } from "./blog-distribution-panel-support.js";

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSection(value, allowed, fallback) {
  const candidate = toTrimmedString(value);
  return allowed.includes(candidate) ? candidate : fallback;
}

function normalizePositiveInteger(value, fallback = 1) {
  const candidate = Number.parseInt(toTrimmedString(value), 10);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : fallback;
}

function normalizeComparable(value) {
  return toTrimmedString(value).toLowerCase();
}

function normalizeWorkbenchTab(value, pageMode) {
  const candidate = toTrimmedString(value);
  const mappedCandidate =
    candidate === "promise"
      ? "basics"
      : candidate === "output"
        ? "live"
        : candidate === "structure" || candidate === "advanced"
          ? "more"
          : candidate;

  if (pageMode === "create") {
    return ["type", "basics"].includes(mappedCandidate) ? mappedCandidate : "type";
  }

  return ["basics", "preview", "live", "more"].includes(mappedCandidate)
    ? mappedCandidate
    : "basics";
}

export function resolvePagesDeskRouteState(route = {}) {
  const pageMode = normalizeSection(route.pageMode, ["", "create"], "");

  return {
    search: toTrimmedString(route.pageSearch),
    status: toTrimmedString(route.pageStatus),
    storyType: normalizeSection(
      route.pageStoryType,
      ["", "standalone", "post-template", "category-template", "tag-template", "custom"],
      ""
    ),
    attention: normalizeSection(route.pageAttention, ["", "ready", "attention", "live", "not-live"], ""),
    sort: normalizeSection(
      route.pageSort,
      ["updated-desc", "title-asc", "outputs-desc", "live-first"],
      "updated-desc"
    ),
    page: normalizePositiveInteger(route.pagePage, 1),
    pageId: toTrimmedString(route.pageId),
    pageMode,
    createPreset: normalizeSection(
      route.pageCreatePreset,
      ["", "standalone", "post-detail-template", "category-detail-template"],
      ""
    ),
    createStage: normalizeSection(route.pageCreateStage, ["type", "basics"], "type"),
    topTab: normalizeSection(route.pagesTab, ["overview", "redirects"], "overview"),
    workbenchTab: normalizeWorkbenchTab(route.pageWorkbenchTab, pageMode)
  };
}

export function resolvePageStoryType(page = {}) {
  if (page.primarySourceType === "none") {
    return {
      id: "standalone",
      label: "Standalone Page",
      detail: "One page, one published output"
    };
  }

  if (page.deploymentMode === "per-record" && page.primarySourceType === "blog-post") {
    return {
      id: "post-template",
      label: "Post Template",
      detail: "Generates one page per post"
    };
  }

  if (page.deploymentMode === "per-record" && page.primarySourceType === "blog-category") {
    return {
      id: "category-template",
      label: "Category Template",
      detail: "Generates one page per category"
    };
  }

  if (page.deploymentMode === "per-record" && page.primarySourceType === "blog-tag") {
    return {
      id: "tag-template",
      label: "Tag Template",
      detail: "Generates one page per tag"
    };
  }

  if (page.primarySourceType === "blog-post") {
    return {
      id: "post-page",
      label: "Post Page",
      detail: "Publishes a single post page"
    };
  }

  if (page.primarySourceType === "blog-category") {
    return {
      id: "category-page",
      label: "Category Page",
      detail: "Publishes a single category page"
    };
  }

  return {
    id: "custom",
    label: "Custom Page",
    detail: "Uses a custom source or publication rule"
  };
}

export function resolveExpectedOutputCount(page = {}) {
  return page.deploymentMode === "per-record"
    ? Math.max(0, Number(page.deploymentTargetCount ?? 0))
    : 1;
}

export function resolveOutputPosture(page = {}) {
  const missingCount = Math.max(0, Number(page.deploymentMissingCount ?? 0));
  const staleCount = Math.max(0, Number(page.deploymentStaleCount ?? 0));
  const syncedCount = Math.max(0, Number(page.deploymentSyncedCount ?? 0));
  const expectedCount = resolveExpectedOutputCount(page);

  if (missingCount > 0) {
    return {
      label: "Missing Output",
      tone: "warning",
      summary: `${missingCount} missing`
    };
  }

  if (staleCount > 0) {
    return {
      label: "Stale Output",
      tone: "warning",
      summary: `${staleCount} stale`
    };
  }

  if (syncedCount > 0 || page.deploymentStatus === "clean") {
    return {
      label: "Live",
      tone: "success",
      summary: `${Math.min(syncedCount, expectedCount)}/${expectedCount} synced`
    };
  }

  return {
    label: "Not Live Yet",
    tone: "default",
    summary: expectedCount > 1 ? `0/${expectedCount} synced` : "No output synced"
  };
}

export function resolveOutputPromise(page = {}) {
  const storyType = resolvePageStoryType(page);
  const expectedOutputCount = resolveExpectedOutputCount(page);

  if (page.deploymentMode === "per-record" && page.primarySourceType === "blog-post") {
    return `${expectedOutputCount} posts -> ${expectedOutputCount} generated pages`;
  }

  if (page.deploymentMode === "per-record" && page.primarySourceType === "blog-category") {
    return `${expectedOutputCount} categories -> ${expectedOutputCount} generated pages`;
  }

  if (page.deploymentMode === "per-record" && page.primarySourceType === "blog-tag") {
    return `${expectedOutputCount} tags -> ${expectedOutputCount} generated pages`;
  }

  return storyType.id === "standalone"
    ? "1 page -> 1 generated page"
    : `${expectedOutputCount} output${expectedOutputCount === 1 ? "" : "s"}`;
}

export function createPagesStorySummary(pages = []) {
  return {
    standaloneCount: pages.filter((page) => page.primarySourceType === "none").length,
    postTemplateCount: pages.filter(
      (page) => page.deploymentMode === "per-record" && page.primarySourceType === "blog-post"
    ).length,
    categoryTemplateCount: pages.filter(
      (page) => page.deploymentMode === "per-record" && page.primarySourceType === "blog-category"
    ).length,
    liveCount: pages.filter((page) => resolveOutputPosture(page).label === "Live").length,
    staleOrMissingCount: pages.filter((page) => resolveOutputPosture(page).label !== "Live").length
  };
}

export function resolvePageSourceSummary(page, sourceOptionsByType) {
  return resolveSourceLabel(
    sourceOptionsByType,
    page?.primarySourceType,
    page?.primarySource?.itemId ?? page?.primarySourceItemId ?? "",
    page?.sourceSelectionMode
  );
}

export function resolvePagePathLabel(page = {}) {
  if (page.deploymentMode === "per-record") {
    return toTrimmedString(page.pathPattern) || toTrimmedString(page.path) || "Not set";
  }
  return toTrimmedString(page.path) || "Not set";
}

function matchesSearch(page, search, sourceOptionsByType) {
  if (!search) {
    return true;
  }

  const storyType = resolvePageStoryType(page);
  const sourceSummary = resolvePageSourceSummary(page, sourceOptionsByType);
  const haystack = [
    page.title,
    page.path,
    page.pathPattern,
    page.status,
    page.pageKind,
    storyType.label,
    sourceSummary
  ]
    .map(normalizeComparable)
    .join(" ");

  return haystack.includes(search);
}

function matchesAttention(page, routeState, readinessMap) {
  if (!routeState.attention) {
    return true;
  }

  const readinessIssues = readinessMap.get(page.id) ?? [];
  const posture = resolveOutputPosture(page);
  const isAttention = readinessIssues.length > 0 || posture.label !== "Live";

  if (routeState.attention === "attention") {
    return isAttention;
  }

  if (routeState.attention === "ready") {
    return readinessIssues.length === 0;
  }

  if (routeState.attention === "live") {
    return posture.label === "Live";
  }

  if (routeState.attention === "not-live") {
    return posture.label !== "Live";
  }

  return true;
}

function comparePageTitles(left, right) {
  return `${left.title ?? ""}`.localeCompare(`${right.title ?? ""}`);
}

function resolveSortTimestamp(page) {
  return Date.parse(page.updatedOn ?? page.createdOn ?? "") || 0;
}

function comparePages(left, right, sortValue) {
  if (sortValue === "title-asc") {
    return comparePageTitles(left, right);
  }

  if (sortValue === "outputs-desc") {
    return (
      resolveExpectedOutputCount(right) - resolveExpectedOutputCount(left) ||
      resolveSortTimestamp(right) - resolveSortTimestamp(left)
    );
  }

  if (sortValue === "live-first") {
    return (
      Number(resolveOutputPosture(left).label !== "Live") - Number(resolveOutputPosture(right).label !== "Live") ||
      resolveSortTimestamp(right) - resolveSortTimestamp(left)
    );
  }

  return resolveSortTimestamp(right) - resolveSortTimestamp(left) || comparePageTitles(left, right);
}

export function buildVisiblePages({
  pages = [],
  readinessMap,
  routeState,
  sourceOptionsByType
}) {
  const search = normalizeComparable(routeState.search);

  const filtered = pages.filter((page) => {
    if (routeState.status && page.status !== routeState.status) {
      return false;
    }

    if (routeState.storyType && resolvePageStoryType(page).id !== routeState.storyType) {
      return false;
    }

    if (!matchesAttention(page, routeState, readinessMap)) {
      return false;
    }

    return matchesSearch(page, search, sourceOptionsByType);
  });

  return [...filtered].sort((left, right) => comparePages(left, right, routeState.sort));
}

export function paginatePages(pages = [], page = 1, pageSize = 8) {
  const safePage = normalizePositiveInteger(page, 1);
  const safePageSize = normalizePositiveInteger(pageSize, 8);
  const offset = (safePage - 1) * safePageSize;

  return {
    page: safePage,
    pageSize: safePageSize,
    totalCount: Array.isArray(pages) ? pages.length : 0,
    rows: Array.isArray(pages) ? pages.slice(offset, offset + safePageSize) : []
  };
}
