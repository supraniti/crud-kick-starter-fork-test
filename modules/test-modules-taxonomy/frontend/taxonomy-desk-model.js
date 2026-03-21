const CATEGORY_BRANCH = "categories";
const TAG_BRANCH = "tags";
const PUBLICATION_BRANCH = "publication";
const DEFAULT_CATEGORY_SORT = "tree";
const DEFAULT_TAG_SORT = "usage-desc";
const TAG_PAGE_SIZE = 10;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(`${value ?? ""}`, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeComparableText(value) {
  return toTrimmedString(value).toLowerCase();
}

function normalizeSlug(value) {
  return toTrimmedString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeBranch(value) {
  const candidate = toTrimmedString(value);
  if (candidate === TAG_BRANCH || candidate === PUBLICATION_BRANCH) {
    return candidate;
  }
  return CATEGORY_BRANCH;
}

function normalizeCategorySort(value) {
  const candidate = toTrimmedString(value);
  return ["tree", "usage-desc", "name-asc"].includes(candidate)
    ? candidate
    : DEFAULT_CATEGORY_SORT;
}

function normalizeTagSort(value) {
  const candidate = toTrimmedString(value);
  return ["usage-desc", "name-asc", "name-desc", "updated-desc"].includes(candidate)
    ? candidate
    : DEFAULT_TAG_SORT;
}

function parseExpandedIds(value) {
  return toTrimmedString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toTimestampValue(value) {
  const parsed = Date.parse(typeof value === "string" ? value : "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function resolveTaxonomyRouteState(route = {}) {
  return {
    branch: normalizeBranch(route.taxonomyBranch),
    publicationScope:
      normalizeBranch(route.publicationScope) === TAG_BRANCH ? TAG_BRANCH : CATEGORY_BRANCH,
    categorySearch: toTrimmedString(route.categorySearch),
    categoryVisibility: toTrimmedString(route.categoryVisibility),
    categorySort: normalizeCategorySort(route.categorySort),
    categoryId: toTrimmedString(route.categoryId),
    categoryMode: toTrimmedString(route.categoryMode) === "create" ? "create" : "",
    categoryExpanded: parseExpandedIds(route.categoryExpanded),
    tagSearch: toTrimmedString(route.tagSearch),
    tagVisibility: toTrimmedString(route.tagVisibility),
    tagSort: normalizeTagSort(route.tagSort),
    tagPage: normalizePositiveInteger(route.tagPage, 1),
    tagId: toTrimmedString(route.tagId),
    tagMode: toTrimmedString(route.tagMode) === "create" ? "create" : ""
  };
}

export function buildCategorySummary(categories = [], referenceCountMap = new Map()) {
  return {
    total: categories.length,
    roots: categories.filter((category) => !toTrimmedString(category.parentCategoryId)).length,
    withImage: categories.filter((category) => toTrimmedString(category.featuredMediaId).length > 0).length,
    internal: categories.filter((category) => category.visibility === "internal").length,
    unused: categories.filter((category) => (referenceCountMap.get(category.id) ?? 0) === 0).length
  };
}

export function buildTagSummary(tags = [], referenceCountMap = new Map()) {
  return {
    total: tags.length,
    publicCount: tags.filter((tag) => tag.visibility !== "internal").length,
    internal: tags.filter((tag) => tag.visibility === "internal").length,
    colored: tags.filter((tag) => toTrimmedString(tag.color).length > 0).length,
    unused: tags.filter((tag) => (referenceCountMap.get(tag.id) ?? 0) === 0).length
  };
}

function buildTreeMap(categories = []) {
  const byParent = new Map();
  const byId = new Map();

  for (const category of categories) {
    byId.set(category.id, category);
    const parentKey = toTrimmedString(category.parentCategoryId) || "__root__";
    const siblings = byParent.get(parentKey) ?? [];
    siblings.push(category);
    byParent.set(parentKey, siblings);
  }

  return { byParent, byId };
}

export function buildCategoryRows(categories = [], referenceCountMap = new Map()) {
  const { byParent } = buildTreeMap(categories);

  function visit(parentKey, depth) {
    const siblings = [...(byParent.get(parentKey) ?? [])].sort((left, right) => {
      const leftOrder = Number.isFinite(left?.sortOrder) ? left.sortOrder : 0;
      const rightOrder = Number.isFinite(right?.sortOrder) ? right.sortOrder : 0;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return toTrimmedString(left?.name).localeCompare(toTrimmedString(right?.name));
    });

    return siblings.flatMap((category) => {
      const childRows = visit(category.id, depth + 1);
      return [
        {
          ...category,
          treeDepth: depth,
          childCount: childRows.filter((row) => row.parentCategoryId === category.id).length,
          referenceCount: referenceCountMap.get(category.id) ?? 0,
          hasChildren: childRows.length > 0
        },
        ...childRows
      ];
    });
  }

  return visit("__root__", 0);
}

function hasVisibleAncestor(row, visibleRowIds = new Set()) {
  const parentId = toTrimmedString(row.parentCategoryId);
  if (!parentId) {
    return true;
  }
  return visibleRowIds.has(parentId);
}

export function buildVisibleCategoryRows(categoryRows = [], routeState = {}) {
  const search = normalizeComparableText(routeState.categorySearch);
  const visibility = normalizeComparableText(routeState.categoryVisibility);
  const expandedIds = new Set(routeState.categoryExpanded);

  let rows = categoryRows.filter((row) => {
    if (visibility && normalizeComparableText(row.visibility || "public") !== visibility) {
      return false;
    }
    if (search) {
      const haystack = [row.name, row.path, row.description].map(normalizeComparableText).join(" ");
      return haystack.includes(search);
    }
    return true;
  });

  if (!search) {
    const visibleRowIds = new Set();
    rows = rows.filter((row) => {
      const parentId = toTrimmedString(row.parentCategoryId);
      if (!parentId) {
        visibleRowIds.add(row.id);
        return true;
      }
      if (!hasVisibleAncestor(row, visibleRowIds) || !expandedIds.has(parentId)) {
        return false;
      }
      visibleRowIds.add(row.id);
      return true;
    });
  }

  if (routeState.categorySort === "usage-desc") {
    rows = [...rows].sort(
      (left, right) =>
        right.referenceCount - left.referenceCount ||
        toTrimmedString(left.name).localeCompare(toTrimmedString(right.name))
    );
  }

  if (routeState.categorySort === "name-asc") {
    rows = [...rows].sort((left, right) =>
      toTrimmedString(left.name).localeCompare(toTrimmedString(right.name))
    );
  }

  return rows;
}

export function buildCategoryPathPreview({ categoryId = "", name = "", parentCategoryId = "", categories = [] }) {
  const { byId } = buildTreeMap(categories);
  const pieces = [];
  const slug = normalizeSlug(name || "category");
  const visited = new Set([categoryId]);
  let cursorId = toTrimmedString(parentCategoryId);

  while (cursorId && byId.has(cursorId) && !visited.has(cursorId)) {
    const parent = byId.get(cursorId);
    pieces.unshift(normalizeSlug(parent.slug || parent.name || parent.id));
    visited.add(cursorId);
    cursorId = toTrimmedString(parent.parentCategoryId);
  }

  pieces.push(slug || "category");
  return pieces.join("/");
}

export function buildCategoryValidation(formState = {}, categories = []) {
  const errors = {};
  const name = toTrimmedString(formState.name);
  const activeItemId = toTrimmedString(formState.itemId);
  const parentCategoryId = toTrimmedString(formState.parentCategoryId);
  const slug = normalizeSlug(name);

  if (name.length < 2) {
    errors.name = "Category name must be at least 2 characters.";
  }

  const duplicate = categories.find((category) => {
    if (category.id === activeItemId) {
      return false;
    }
    return normalizeSlug(category.slug || category.name) === slug;
  });
  if (!errors.name && duplicate) {
    errors.name = "Another category already uses this public identity.";
  }

  if (activeItemId && parentCategoryId && activeItemId === parentCategoryId) {
    errors.parentCategoryId = "A category cannot be its own parent.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function buildTagValidation(formState = {}, tags = []) {
  const errors = {};
  const name = toTrimmedString(formState.name);
  const color = toTrimmedString(formState.color);
  const activeItemId = toTrimmedString(formState.itemId);
  const slug = normalizeSlug(name);

  if (name.length < 2) {
    errors.name = "Tag name must be at least 2 characters.";
  }

  const duplicate = tags.find((tag) => {
    if (tag.id === activeItemId) {
      return false;
    }
    return normalizeSlug(tag.slug || tag.name) === slug;
  });
  if (!errors.name && duplicate) {
    errors.name = "Another tag already uses this public identity.";
  }

  if (color && !HEX_COLOR_PATTERN.test(color)) {
    errors.color = "Use #RGB or #RRGGBB.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function buildTagRows(tags = [], routeState = {}, referenceCountMap = new Map()) {
  const search = normalizeComparableText(routeState.tagSearch);
  const visibility = normalizeComparableText(routeState.tagVisibility);

  const rows = tags
    .map((tag) => ({
      ...tag,
      referenceCount: referenceCountMap.get(tag.id) ?? 0
    }))
    .filter((tag) => {
      if (visibility && normalizeComparableText(tag.visibility || "public") !== visibility) {
        return false;
      }
      if (!search) {
        return true;
      }
      const haystack = [tag.name, tag.slug, tag.description, tag.seoTitle].map(normalizeComparableText).join(" ");
      return haystack.includes(search);
    });

  rows.sort((left, right) => {
    if (routeState.tagSort === "name-asc") {
      return toTrimmedString(left.name).localeCompare(toTrimmedString(right.name));
    }
    if (routeState.tagSort === "name-desc") {
      return toTrimmedString(right.name).localeCompare(toTrimmedString(left.name));
    }
    if (routeState.tagSort === "updated-desc") {
      return (
        toTimestampValue(right.updatedOn ?? right.createdOn) -
          toTimestampValue(left.updatedOn ?? left.createdOn) ||
        toTrimmedString(left.name).localeCompare(toTrimmedString(right.name))
      );
    }
    return (
      right.referenceCount - left.referenceCount ||
      toTrimmedString(left.name).localeCompare(toTrimmedString(right.name))
    );
  });

  return rows;
}

export function paginateTagRows(rows = [], page = 1) {
  const safePage = normalizePositiveInteger(page, 1);
  const totalPages = Math.max(1, Math.ceil(rows.length / TAG_PAGE_SIZE));
  const normalizedPage = Math.min(safePage, totalPages);
  const startIndex = (normalizedPage - 1) * TAG_PAGE_SIZE;
  return {
    page: normalizedPage,
    pageSize: TAG_PAGE_SIZE,
    totalPages,
    rows: rows.slice(startIndex, startIndex + TAG_PAGE_SIZE)
  };
}

export function buildTagBatchCandidates(input = "", tags = []) {
  const existingSlugs = new Set(tags.map((tag) => normalizeSlug(tag.slug || tag.name)));
  const candidates = [];
  const duplicateNames = [];
  const seen = new Set();

  for (const token of input.split(/[\n,]+/g)) {
    const name = toTrimmedString(token);
    if (!name) {
      continue;
    }
    const slug = normalizeSlug(name);
    if (!slug || existingSlugs.has(slug) || seen.has(slug)) {
      duplicateNames.push(name);
      continue;
    }
    seen.add(slug);
    candidates.push(name);
  }

  return {
    candidates,
    duplicateNames
  };
}

export function buildReferenceCountMap(posts = [], fieldId = "") {
  const counts = new Map();
  for (const post of toArray(posts)) {
    for (const value of toArray(post?.[fieldId])) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

export { CATEGORY_BRANCH, TAG_BRANCH, PUBLICATION_BRANCH, DEFAULT_CATEGORY_SORT, DEFAULT_TAG_SORT, TAG_PAGE_SIZE };
