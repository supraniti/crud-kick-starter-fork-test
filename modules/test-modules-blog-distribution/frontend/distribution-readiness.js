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

export function buildReadinessIssues(post = {}) {
  const issues = [];

  if (!post.seoTitle) {
    issues.push("Missing SEO title");
  }
  if (!post.seoDescription) {
    issues.push("Missing SEO description");
  }
  if (!post.ogTitle) {
    issues.push("Missing OpenGraph title");
  }
  if (!post.ogDescription) {
    issues.push("Missing OpenGraph description");
  }
  if (!post.ogImageMediaId) {
    issues.push("Missing OpenGraph image");
  }
  if (!post.featuredMediaId) {
    issues.push("Missing featured media");
  }
  if (!post.excerpt) {
    issues.push("Missing excerpt");
  }

  return issues;
}

export function sortPostsForQueue(items = []) {
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

export function matchesPostFilters(post, filters, issues) {
  const search = normalizeSearch(filters.search);
  if (
    search.length > 0 &&
    ![post.title, post.slug, post.seoTitle, post.primaryAuthorId]
      .filter((value) => typeof value === "string")
      .some((value) => includesSearch(value, search))
  ) {
    return false;
  }
  if (filters.status && post.status !== filters.status) {
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
  if (filters.targetPostId && rule.targetPostId !== filters.targetPostId) {
    return false;
  }
  return true;
}

export function buildDistributionSummary({ posts, redirects, readinessMap }) {
  const warningCount = posts.filter((post) => (readinessMap.get(post.id) ?? []).length > 0).length;
  return {
    scheduled: posts.filter((post) => post.status === "scheduled").length,
    published: posts.filter((post) => post.status === "published").length,
    warnings: warningCount,
    activeRedirects: redirects.filter((rule) => rule.status === "active").length
  };
}
