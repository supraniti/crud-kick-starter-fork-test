function normalizeSearch(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function includesSearch(haystack, needle) {
  return typeof haystack === "string" && haystack.toLowerCase().includes(needle);
}

function toTimestampValue(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function buildReadinessIssues(page = {}) {
  const issues = [];
  const isPerRecordMode = page.deploymentMode === "per-record";
  const requiredMetadataChecks = [
    ["seoTitle", "Missing SEO title"],
    ["seoDescription", "Missing SEO description"],
    ["ogTitle", "Missing OpenGraph title"],
    ["ogDescription", "Missing OpenGraph description"],
    ["ogImageMediaId", "Missing OpenGraph image"]
  ];

  if (!isPerRecordMode && !page.path) {
    issues.push("Missing page path");
  }
  if (isPerRecordMode && !page.pathPattern) {
    issues.push("Missing path pattern");
  }
  if (!page.layoutKey) {
    issues.push("Missing layout key");
  }
  for (const [fieldId, message] of requiredMetadataChecks) {
    if (!page[fieldId]) {
      issues.push(message);
    }
  }
  if (isPerRecordMode && page.primarySourceType !== "blog-post") {
    issues.push("Per-record templates require blog-post source type");
  }
  if (isPerRecordMode && page.sourceSelectionMode !== "all-records") {
    issues.push("Per-record templates must select all source records");
  }
  if (page.pageKind !== "standalone" && page.primarySourceType === "none" && (!Array.isArray(page.dataSources) || page.dataSources.length === 0)) {
    issues.push("No source or data query configured");
  }
  if (page.status === "scheduled" && !page.scheduledOn) {
    issues.push("Missing scheduled timestamp");
  }

  return issues;
}

export function sortPagesForDesk(items = []) {
  return [...items].sort((left, right) => {
    const scheduledDelta = toTimestampValue(left?.scheduledOn) - toTimestampValue(right?.scheduledOn);
    if (scheduledDelta !== 0) {
      return scheduledDelta;
    }
    return toTimestampValue(right?.updatedOn) - toTimestampValue(left?.updatedOn);
  });
}

export function sortRedirectRules(items = []) {
  return [...items].sort((left, right) =>
    String(left?.sourcePath ?? "").localeCompare(String(right?.sourcePath ?? ""))
  );
}

export function matchesPageFilters(page, filters, issues) {
  const search = normalizeSearch(filters.search);
  if (
    search.length > 0 &&
    ![page.title, page.path, page.layoutKey, page.seoTitle, page.primarySourceType]
      .filter((value) => typeof value === "string")
      .some((value) => includesSearch(value, search))
  ) {
    return false;
  }
  if (filters.status && page.status !== filters.status) {
    return false;
  }
  if (filters.pageKind && page.pageKind !== filters.pageKind) {
    return false;
  }
  if (filters.primarySourceType && page.primarySourceType !== filters.primarySourceType) {
    return false;
  }
  if (filters.readiness === "warnings" && issues.length === 0) {
    return false;
  }
  if (filters.readiness === "ready" && issues.length > 0) {
    return false;
  }
  return true;
}

export function matchesRedirectFilters(rule, filters) {
  const search = normalizeSearch(filters.search);
  if (
    search.length > 0 &&
    ![rule.sourcePath, rule.targetUrl, rule.reason]
      .filter((value) => typeof value === "string")
      .some((value) => includesSearch(value, search))
  ) {
    return false;
  }
  if (filters.status && rule.status !== filters.status) {
    return false;
  }
  if (filters.httpCode && rule.httpCode !== filters.httpCode) {
    return false;
  }
  if (filters.targetPageId && rule.targetPageId !== filters.targetPageId) {
    return false;
  }
  return true;
}

export function buildDistributionSummary({ pages, redirects, readinessMap }) {
  return {
    published: pages.filter((page) => page.status === "published").length,
    syncedOutputs: pages.reduce((total, page) => total + Number(page.deploymentSyncedCount ?? 0), 0),
    staleOutputs: pages.reduce((total, page) => total + Number(page.deploymentStaleCount ?? 0), 0),
    missingOutputs: pages.reduce((total, page) => total + Number(page.deploymentMissingCount ?? 0), 0),
    warnings: pages.filter((page) => (readinessMap.get(page.id) ?? []).length > 0).length,
    activeRedirects: redirects.filter((rule) => rule.status === "active").length
  };
}
