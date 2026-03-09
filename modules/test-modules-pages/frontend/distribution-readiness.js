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

  if (!page.path) {
    issues.push("Missing page path");
  }
  if (!page.layoutKey) {
    issues.push("Missing layout key");
  }
  if (!page.seoTitle) {
    issues.push("Missing SEO title");
  }
  if (!page.seoDescription) {
    issues.push("Missing SEO description");
  }
  if (!page.ogTitle) {
    issues.push("Missing OpenGraph title");
  }
  if (!page.ogDescription) {
    issues.push("Missing OpenGraph description");
  }
  if (!page.ogImageMediaId) {
    issues.push("Missing OpenGraph image");
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
  const warningCount = pages.filter((page) => (readinessMap.get(page.id) ?? []).length > 0).length;
  return {
    scheduled: pages.filter((page) => page.status === "scheduled").length,
    published: pages.filter((page) => page.status === "published").length,
    warnings: warningCount,
    activeRedirects: redirects.filter((rule) => rule.status === "active").length
  };
}
