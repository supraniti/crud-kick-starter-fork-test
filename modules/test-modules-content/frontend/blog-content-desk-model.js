function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSection(value, allowed, fallback) {
  const candidate = toTrimmedString(value);
  return allowed.includes(candidate) ? candidate : fallback;
}

function normalizePositiveInteger(value, fallback = 1) {
  const candidate = Number.parseInt(`${value ?? ""}`.trim(), 10);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : fallback;
}

function normalizeEditorSection(value) {
  const candidate = toTrimmedString(value);
  if (candidate === "essentials") {
    return "story";
  }
  if (candidate === "taxonomy") {
    return "organize";
  }
  if (candidate === "writing") {
    return "story";
  }
  return normalizeSection(
    candidate,
    ["story", "organize", "media", "seo", "publish", "revisions"],
    "story"
  );
}

function normalizeComparable(value) {
  return toTrimmedString(value).toLowerCase();
}

function matchesSearch(post, search, authorLabelMap, categoryLabelMap, tagLabelMap) {
  if (!search) {
    return true;
  }

  const authorLabel = authorLabelMap.get(post.primaryAuthorId) ?? "";
  const categoryLabels = (Array.isArray(post.categoryIds) ? post.categoryIds : [])
    .map((itemId) => categoryLabelMap.get(itemId) ?? "")
    .join(" ");
  const tagLabels = (Array.isArray(post.tagIds) ? post.tagIds : [])
    .map((itemId) => tagLabelMap.get(itemId) ?? "")
    .join(" ");
  const haystack = [
    post.title,
    post.subtitle,
    post.excerpt,
    post.status,
    post.format,
    authorLabel,
    categoryLabels,
    tagLabels
  ]
    .map(normalizeComparable)
    .join(" ");

  return haystack.includes(search);
}

function matchesListFilter(values, filterValue) {
  if (!filterValue) {
    return true;
  }
  return Array.isArray(values) && values.includes(filterValue);
}

function resolveReadinessState(healthIssues = []) {
  return Array.isArray(healthIssues) && healthIssues.length === 0 ? "ready" : "attention";
}

function resolveDeploymentFilterLabel(state = null) {
  const label = normalizeComparable(state?.label);
  if (label === "deployed") {
    return "deployed";
  }
  if (label === "needs deployment" || label === "missing outputs") {
    return "needs-deployment";
  }
  if (label === "no page") {
    return "no-page";
  }
  if (label === "local only") {
    return "local-only";
  }
  return "";
}

function matchesIssueFilter(post, issueFilter, postHealthMap) {
  if (!issueFilter) {
    return true;
  }
  const issues = Array.isArray(postHealthMap.get(post.id)) ? postHealthMap.get(post.id) : [];
  return issues.includes(issueFilter);
}

function matchesScalarFilters(post, routeState) {
  if (routeState.status && post.status !== routeState.status) {
    return false;
  }
  if (routeState.format && post.format !== routeState.format) {
    return false;
  }
  if (routeState.primaryAuthorId && post.primaryAuthorId !== routeState.primaryAuthorId) {
    return false;
  }
  return true;
}

function matchesReferenceFilters(post, routeState) {
  if (!matchesListFilter(post.categoryIds, routeState.categoryId)) {
    return false;
  }
  if (!matchesListFilter(post.tagIds, routeState.tagId)) {
    return false;
  }
  return true;
}

function matchesStateFilters(post, routeState, postHealthMap, postDeploymentStateMap) {
  if (!matchesIssueFilter(post, routeState.issue, postHealthMap)) {
    return false;
  }
  if (routeState.readiness) {
    const readinessState = resolveReadinessState(postHealthMap.get(post.id) ?? []);
    if (readinessState !== routeState.readiness) {
      return false;
    }
  }
  if (routeState.deployment) {
    const deploymentLabel = resolveDeploymentFilterLabel(postDeploymentStateMap.get(post.id) ?? null);
    if (deploymentLabel !== routeState.deployment) {
      return false;
    }
  }
  return true;
}

function comparePostTitles(left, right) {
  return `${left.title ?? ""}`.localeCompare(`${right.title ?? ""}`);
}

function resolveSortTimestamp(post) {
  return Date.parse(post.updatedOn ?? post.createdOn ?? "") || 0;
}

function resolvePublishedFirstScore(post) {
  if (post.status === "published") {
    return 0;
  }
  if (post.status === "scheduled") {
    return 1;
  }
  return 2;
}

function comparePosts(left, right, sortValue) {
  if (sortValue === "title-asc") {
    return comparePostTitles(left, right);
  }
  if (sortValue === "title-desc") {
    return comparePostTitles(right, left);
  }
  if (sortValue === "published-first") {
    return (
      resolvePublishedFirstScore(left) - resolvePublishedFirstScore(right) ||
      resolveSortTimestamp(right) - resolveSortTimestamp(left)
    );
  }
  return resolveSortTimestamp(right) - resolveSortTimestamp(left) || comparePostTitles(left, right);
}

export function resolveContentDeskRouteState(route = {}) {
  const legacyDeskSection = normalizeSection(
    route.postsSection,
    ["authoring", "release", "revisions"],
    "authoring"
  );
  const fallbackEditorSection =
    legacyDeskSection === "release" ? "publish" : legacyDeskSection === "revisions" ? "revisions" : "story";
  return {
    search: toTrimmedString(route.postSearch),
    status: toTrimmedString(route.postStatus),
    format: toTrimmedString(route.postFormat),
    primaryAuthorId: toTrimmedString(route.postAuthorId),
    categoryId: toTrimmedString(route.postCategoryId),
    tagId: toTrimmedString(route.postTagId),
    issue: normalizeSection(route.postIssue, ["", "seo", "media", "body", "taxonomy"], ""),
    readiness: normalizeSection(route.postReadiness, ["", "ready", "attention"], ""),
    deployment: normalizeSection(
      route.postDeployment,
      ["", "local-only", "needs-deployment", "deployed", "no-page"],
      ""
    ),
    sort: normalizeSection(
      route.postSort,
      ["updated-desc", "title-asc", "title-desc", "published-first"],
      "updated-desc"
    ),
    page: normalizePositiveInteger(route.postPage, 1),
    postId: toTrimmedString(route.postId),
    postMode: normalizeSection(route.postMode, ["", "create"], ""),
    editorSection: toTrimmedString(route.postEditorSection)
      ? normalizeEditorSection(route.postEditorSection)
      : fallbackEditorSection
  };
}

export function buildContentAuthorLabelMap(options = []) {
  return new Map(options.map((option) => [option.id, option.label]));
}

export function buildContentTermLabelMap(options = []) {
  return new Map(options.map((option) => [option.id, option.label]));
}

export function buildVisiblePosts({
  posts = [],
  routeState,
  postHealthMap,
  postDeploymentStateMap,
  authorLabelMap,
  categoryLabelMap,
  tagLabelMap
}) {
  const search = normalizeComparable(routeState.search);

  const filtered = posts.filter((post) => {
    if (!matchesScalarFilters(post, routeState)) {
      return false;
    }
    if (!matchesReferenceFilters(post, routeState)) {
      return false;
    }
    if (!matchesStateFilters(post, routeState, postHealthMap, postDeploymentStateMap)) {
      return false;
    }
    return matchesSearch(post, search, authorLabelMap, categoryLabelMap, tagLabelMap);
  });

  return [...filtered].sort((left, right) => comparePosts(left, right, routeState.sort));
}

export function paginatePosts(posts = [], page = 1, pageSize = 10) {
  const safePage = normalizePositiveInteger(page, 1);
  const safePageSize = normalizePositiveInteger(pageSize, 10);
  const offset = (safePage - 1) * safePageSize;
  return {
    page: safePage,
    pageSize: safePageSize,
    totalCount: Array.isArray(posts) ? posts.length : 0,
    rows: Array.isArray(posts) ? posts.slice(offset, offset + safePageSize) : []
  };
}
