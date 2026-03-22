const DEFAULT_SORT = "pending-first";
const COMMENT_PAGE_SIZE = 10;

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(`${value ?? ""}`, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSection(value, allowed, fallback) {
  const candidate = toTrimmedString(value);
  return allowed.includes(candidate) ? candidate : fallback;
}

function normalizeComparable(value) {
  return toTrimmedString(value).toLowerCase();
}

function normalizeSortValue(value) {
  return normalizeSection(
    value,
    ["pending-first", "newest-desc", "oldest-asc", "status-asc", "post-asc"],
    DEFAULT_SORT
  );
}

function normalizeTabValue(value) {
  return normalizeSection(value, ["context", "moderate", "history"], "context");
}

function buildPostLabelMap(postOptions = []) {
  return new Map(postOptions.map((option) => [option.id, option.label]));
}

function buildModeratorLabelMap(authorOptions = []) {
  return new Map(authorOptions.map((option) => [option.id, option.label]));
}

function formatSubmittedLabel(value) {
  const candidate = toTrimmedString(value);
  if (!candidate) {
    return "Unknown";
  }
  return candidate.replace("T", " ").replace(".000Z", "Z").slice(0, 16);
}

function buildThreadStats(comments = []) {
  const countsByRootId = new Map();
  for (const comment of comments) {
    const rootId = toTrimmedString(comment.parentCommentId) || comment.id;
    countsByRootId.set(rootId, (countsByRootId.get(rootId) ?? 0) + 1);
  }
  return countsByRootId;
}

function buildFlags(comment) {
  const flags = [];
  if (comment.parentCommentId) {
    flags.push("Reply");
  }
  if (!comment.authorEmail) {
    flags.push("Missing email");
  }
  if (
    (comment.status === "approved" || comment.status === "rejected" || comment.status === "spam") &&
    !comment.approvedByAuthorId
  ) {
    flags.push("Missing moderator");
  }
  return flags;
}

function matchesSearch(comment, search, postLabel, moderatorLabel) {
  if (!search) {
    return true;
  }
  const haystack = [
    comment.authorDisplayName,
    comment.authorEmail,
    comment.body,
    postLabel,
    moderatorLabel
  ]
    .map(normalizeComparable)
    .join(" ");
  return haystack.includes(search);
}

function compareRows(left, right, sortValue) {
  if (sortValue === "oldest-asc") {
    return left.createdOn.localeCompare(right.createdOn) || left.authorDisplayName.localeCompare(right.authorDisplayName);
  }
  if (sortValue === "status-asc") {
    return left.status.localeCompare(right.status) || right.createdOn.localeCompare(left.createdOn);
  }
  if (sortValue === "post-asc") {
    return left.postLabel.localeCompare(right.postLabel) || right.createdOn.localeCompare(left.createdOn);
  }
  if (sortValue === "newest-desc") {
    return right.createdOn.localeCompare(left.createdOn) || left.authorDisplayName.localeCompare(right.authorDisplayName);
  }
  const leftPendingScore = left.status === "pending" ? 0 : 1;
  const rightPendingScore = right.status === "pending" ? 0 : 1;
  return (
    leftPendingScore - rightPendingScore ||
    right.createdOn.localeCompare(left.createdOn) ||
    left.authorDisplayName.localeCompare(right.authorDisplayName)
  );
}

export function resolveModerationRouteState(route = {}) {
  return {
    search: toTrimmedString(route.commentSearch || route.search),
    status: toTrimmedString(route.commentStatus || route.status),
    postId: toTrimmedString(route.commentPostId || route.postId),
    moderatorId: toTrimmedString(route.commentModeratorId || route.moderatorId),
    sort: normalizeSortValue(route.commentSort),
    page: normalizePositiveInteger(route.commentPage, 1),
    commentId: toTrimmedString(route.commentId),
    tab: normalizeTabValue(route.commentTab)
  };
}

export function buildCommentDeskRows(comments = [], postOptions = [], authorOptions = []) {
  const postLabelMap = buildPostLabelMap(postOptions);
  const moderatorLabelMap = buildModeratorLabelMap(authorOptions);
  const threadStats = buildThreadStats(comments);

  return comments.map((comment) => {
    const threadRootId = toTrimmedString(comment.parentCommentId) || comment.id;
    const postLabel = postLabelMap.get(comment.postId) ?? comment.postId ?? "Unknown post";
    const moderatorLabel = moderatorLabelMap.get(comment.approvedByAuthorId) ?? "";
    return {
      ...comment,
      postLabel,
      moderatorLabel,
      threadRootId,
      threadSize: threadStats.get(threadRootId) ?? 1,
      bodyPreview: toTrimmedString(comment.body).slice(0, 120),
      submittedLabel: formatSubmittedLabel(comment.createdOn),
      flags: buildFlags(comment)
    };
  });
}

export function buildVisibleCommentRows(rows = [], routeState = {}) {
  const search = normalizeComparable(routeState.search);
  const filteredRows = rows.filter((row) => {
    if (routeState.status && row.status !== routeState.status) {
      return false;
    }
    if (routeState.postId && row.postId !== routeState.postId) {
      return false;
    }
    if (routeState.moderatorId && row.approvedByAuthorId !== routeState.moderatorId) {
      return false;
    }
    return matchesSearch(row, search, row.postLabel, row.moderatorLabel);
  });
  return [...filteredRows].sort((left, right) => compareRows(left, right, routeState.sort));
}

export function paginateCommentRows(rows = [], page = 1) {
  const totalPages = Math.max(1, Math.ceil(rows.length / COMMENT_PAGE_SIZE));
  const normalizedPage = Math.min(normalizePositiveInteger(page, 1), totalPages);
  const startIndex = (normalizedPage - 1) * COMMENT_PAGE_SIZE;
  return {
    page: normalizedPage,
    totalPages,
    totalCount: rows.length,
    pageSize: COMMENT_PAGE_SIZE,
    rows: rows.slice(startIndex, startIndex + COMMENT_PAGE_SIZE)
  };
}

export function buildCommentDeskSummary(rows = []) {
  const pendingRows = rows.filter((row) => row.status === "pending");
  const oldestPending = [...pendingRows].sort((left, right) => left.createdOn.localeCompare(right.createdOn))[0] ?? null;
  return {
    total: rows.length,
    pending: pendingRows.length,
    approved: rows.filter((row) => row.status === "approved").length,
    flagged: rows.filter((row) => row.status === "rejected" || row.status === "spam").length,
    replies: rows.filter((row) => row.parentCommentId).length,
    missingModerator: rows.filter((row) => row.flags.includes("Missing moderator")).length,
    oldestPendingLabel: oldestPending ? oldestPending.submittedLabel : "Queue clear"
  };
}

export function buildDiscussionHotspots(rows = []) {
  const countsByPost = new Map();
  for (const row of rows) {
    const entry = countsByPost.get(row.postId) ?? {
      postId: row.postId,
      postLabel: row.postLabel,
      total: 0,
      pending: 0
    };
    entry.total += 1;
    if (row.status === "pending") {
      entry.pending += 1;
    }
    countsByPost.set(row.postId, entry);
  }
  return [...countsByPost.values()]
    .sort((left, right) => right.total - left.total || right.pending - left.pending || left.postLabel.localeCompare(right.postLabel))
    .slice(0, 3);
}
