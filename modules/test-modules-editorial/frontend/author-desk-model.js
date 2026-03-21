const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const DEFAULT_SORT = "activity-desc";
const SORT_OPTIONS = Object.freeze([
  { value: "activity-desc", label: "Most active" },
  { value: "published-desc", label: "Most published" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "newest-desc", label: "Newest updated" }
]);
const AUTHOR_PAGE_SIZE = 10;

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(`${value ?? ""}`, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSortValue(value) {
  const candidate = toTrimmedString(value);
  return SORT_OPTIONS.some((option) => option.value === candidate) ? candidate : DEFAULT_SORT;
}

function toTimestampValue(value) {
  const parsed = Date.parse(typeof value === "string" ? value : "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeComparableText(value) {
  return toTrimmedString(value).toLowerCase();
}

function hasAuthorBio(author) {
  return toTrimmedString(author?.bio).length > 0;
}

function hasAuthorAvatar(author) {
  return toTrimmedString(author?.avatarMediaId).length > 0;
}

function sortRows(rows, sortValue) {
  const nextRows = [...rows];
  nextRows.sort((left, right) => {
    if (sortValue === "published-desc") {
      return (
        right.publishedPosts - left.publishedPosts ||
        right.totalPosts - left.totalPosts ||
        left.displayName.localeCompare(right.displayName)
      );
    }
    if (sortValue === "name-asc") {
      return left.displayName.localeCompare(right.displayName);
    }
    if (sortValue === "name-desc") {
      return right.displayName.localeCompare(left.displayName);
    }
    if (sortValue === "newest-desc") {
      return (
        toTimestampValue(right.updatedOn ?? right.createdOn) -
          toTimestampValue(left.updatedOn ?? left.createdOn) ||
        left.displayName.localeCompare(right.displayName)
      );
    }
    return (
      right.totalPosts - left.totalPosts ||
      right.publishedPosts - left.publishedPosts ||
      left.displayName.localeCompare(right.displayName)
    );
  });
  return nextRows;
}

export function resolveAuthorRouteState(route = {}) {
  return {
    search: toTrimmedString(route.search),
    role: toTrimmedString(route.role),
    status: toTrimmedString(route.status),
    locale: toTrimmedString(route.locale),
    sort: normalizeSortValue(route.authorSort),
    page: normalizePositiveInteger(route.authorPage, 1),
    authorId: toTrimmedString(route.authorId),
    authorMode: toTrimmedString(route.authorMode) === "create" ? "create" : ""
  };
}

export function buildAuthorSummary(authors = [], assignmentRows = []) {
  return {
    total: authors.length,
    active: authors.filter((author) => author.status === "active").length,
    editors: authors.filter(
      (author) => author.role === "editor" || author.role === "managing-editor"
    ).length,
    missingAvatar: authors.filter((author) => !hasAuthorAvatar(author)).length,
    missingBio: authors.filter((author) => !hasAuthorBio(author)).length,
    authoredPosts: assignmentRows.reduce((sum, row) => sum + row.totalPosts, 0)
  };
}

export function buildAuthorAssignmentRows(authors = [], posts = []) {
  const statsByAuthorId = new Map();
  for (const author of authors) {
    statsByAuthorId.set(author.id, {
      totalPosts: 0,
      publishedPosts: 0,
      draftPosts: 0
    });
  }

  for (const post of posts) {
    const authorId = toTrimmedString(post?.primaryAuthorId);
    if (!authorId || !statsByAuthorId.has(authorId)) {
      continue;
    }
    const stats = statsByAuthorId.get(authorId);
    stats.totalPosts += 1;
    if (post.status === "published") {
      stats.publishedPosts += 1;
    } else {
      stats.draftPosts += 1;
    }
  }

  return authors.map((author) => {
    const stats = statsByAuthorId.get(author.id) ?? {
      totalPosts: 0,
      publishedPosts: 0,
      draftPosts: 0
    };
    const profileGaps = [];
    if (!hasAuthorAvatar(author)) {
      profileGaps.push("Missing avatar");
    }
    if (!hasAuthorBio(author)) {
      profileGaps.push("Missing bio");
    }

    return {
      ...author,
      displayName: toTrimmedString(author.displayName) || author.id,
      totalPosts: stats.totalPosts,
      publishedPosts: stats.publishedPosts,
      draftPosts: stats.draftPosts,
      profileGaps
    };
  });
}

export function buildVisibleAuthorRows(rows = [], routeState = {}) {
  const localeFilter = normalizeComparableText(routeState.locale);
  const filteredRows = rows.filter((row) => {
    if (localeFilter && normalizeComparableText(row.locale) !== localeFilter) {
      return false;
    }
    return true;
  });
  return sortRows(filteredRows, routeState.sort);
}

export function paginateAuthorRows(rows = [], page = 1) {
  const safePage = normalizePositiveInteger(page, 1);
  const totalPages = Math.max(1, Math.ceil(rows.length / AUTHOR_PAGE_SIZE));
  const normalizedPage = Math.min(safePage, totalPages);
  const startIndex = (normalizedPage - 1) * AUTHOR_PAGE_SIZE;
  return {
    page: normalizedPage,
    totalPages,
    pageSize: AUTHOR_PAGE_SIZE,
    rows: rows.slice(startIndex, startIndex + AUTHOR_PAGE_SIZE)
  };
}

export function buildLocaleOptions(authors = []) {
  return [...new Set(
    authors
      .map((author) => toTrimmedString(author.locale))
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right));
}

export function buildAuthorValidation(formState = {}, authors = []) {
  const errors = {};
  const displayName = toTrimmedString(formState.displayName);
  const email = toTrimmedString(formState.email);
  const websiteUrl = toTrimmedString(formState.websiteUrl);
  const activeItemId = toTrimmedString(formState.itemId);

  if (displayName.length < 2) {
    errors.displayName = "Display name must be at least 2 characters.";
  }

  const duplicateDisplayName = authors.find((author) => {
    if (author.id === activeItemId) {
      return false;
    }
    return normalizeComparableText(author.displayName) === normalizeComparableText(displayName);
  });
  if (!errors.displayName && duplicateDisplayName) {
    errors.displayName = "Another author already uses this display name.";
  }

  if (email.length === 0) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Email must be valid.";
  }

  if (websiteUrl.length > 0) {
    try {
      new URL(websiteUrl);
    } catch {
      errors.websiteUrl = "Website URL must be valid.";
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function sortMediaGalleryItems(items = []) {
  return [...items].sort((left, right) => {
    const rightTime = toTimestampValue(right?.updatedOn ?? right?.createdOn);
    const leftTime = toTimestampValue(left?.updatedOn ?? left?.createdOn);
    return (
      rightTime - leftTime ||
      toTrimmedString(left?.displayName).localeCompare(toTrimmedString(right?.displayName))
    );
  });
}

export function readSocialField(formState = {}, fieldId = "") {
  const links = formState.socialLinks;
  if (!links || typeof links !== "object" || Array.isArray(links)) {
    return "";
  }
  return typeof links[fieldId] === "string" ? links[fieldId] : "";
}

export function updateSocialField(formState = {}, fieldId = "", value = "") {
  const currentLinks =
    formState.socialLinks && typeof formState.socialLinks === "object" && !Array.isArray(formState.socialLinks)
      ? formState.socialLinks
      : {};
  return {
    ...currentLinks,
    [fieldId]: value
  };
}

export { AUTHOR_PAGE_SIZE, DEFAULT_SORT, SORT_OPTIONS };
