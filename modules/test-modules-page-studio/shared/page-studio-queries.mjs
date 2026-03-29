function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeInteger(value, fallback, { min = 1, max = 100 } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const normalized = Math.trunc(numeric);
  return Math.max(min, Math.min(max, normalized));
}

const PAGE_STUDIO_QUERY_DEFINITIONS = Object.freeze([
  {
    kind: "primary-post-by-param",
    label: "Current Post From URL Param",
    sourceType: "blog-post",
    summary: "Resolve one published post from a route param such as slug.",
    defaultBindAs: "primaryPost",
    defaultParamId: "slug",
    defaultLookupField: "slug",
    defaultSortKey: "publishedOn",
    defaultSortDirection: "desc",
    category: "primary"
  },
  {
    kind: "primary-category-by-param",
    label: "Current Category From URL Param",
    sourceType: "blog-category",
    summary: "Resolve one category from a route param such as slug.",
    defaultBindAs: "primaryCategory",
    defaultParamId: "slug",
    defaultLookupField: "slug",
    defaultSortKey: "name",
    defaultSortDirection: "asc",
    category: "primary"
  },
  {
    kind: "posts-by-author",
    label: "Posts From Author",
    sourceType: "blog-post",
    summary: "Load published posts for a chosen author or the current primary post author.",
    defaultBindAs: "postsByAuthor",
    defaultLimit: 6,
    defaultSortKey: "publishedOn",
    defaultSortDirection: "desc",
    category: "listing"
  },
  {
    kind: "posts-by-category",
    label: "Posts From Category",
    sourceType: "blog-post",
    summary: "Load published posts for a chosen category or the current primary category.",
    defaultBindAs: "postsByCategory",
    defaultLimit: 12,
    defaultSortKey: "publishedOn",
    defaultSortDirection: "desc",
    category: "listing"
  },
  {
    kind: "posts-by-tag",
    label: "Posts From Tag",
    sourceType: "blog-post",
    summary: "Load published posts for a chosen tag or the current primary post tag.",
    defaultBindAs: "postsByTag",
    defaultLimit: 6,
    defaultSortKey: "publishedOn",
    defaultSortDirection: "desc",
    category: "listing"
  },
  {
    kind: "related-posts-by-author",
    label: "More Posts From Primary Author",
    sourceType: "blog-post",
    summary: "Load more published posts from the current primary post author.",
    defaultBindAs: "relatedByAuthor",
    defaultLimit: 3,
    defaultSortKey: "publishedOn",
    defaultSortDirection: "desc",
    category: "related"
  },
  {
    kind: "related-posts-by-category",
    label: "More Posts From Primary Category",
    sourceType: "blog-post",
    summary: "Load more published posts from the first category on the current primary post.",
    defaultBindAs: "relatedByCategory",
    defaultLimit: 3,
    defaultSortKey: "publishedOn",
    defaultSortDirection: "desc",
    category: "related"
  },
  {
    kind: "related-posts-by-tag",
    label: "More Posts From Primary Tag",
    sourceType: "blog-post",
    summary: "Load more published posts from the first tag on the current primary post.",
    defaultBindAs: "relatedByTag",
    defaultLimit: 3,
    defaultSortKey: "publishedOn",
    defaultSortDirection: "desc",
    category: "related"
  }
]);

const PAGE_STUDIO_QUERY_DEFINITION_BY_KIND = new Map(
  PAGE_STUDIO_QUERY_DEFINITIONS.map((entry) => [entry.kind, entry])
);

export { PAGE_STUDIO_QUERY_DEFINITIONS };

export function resolvePageStudioQueryDefinition(kind) {
  return PAGE_STUDIO_QUERY_DEFINITION_BY_KIND.get(kind) ?? PAGE_STUDIO_QUERY_DEFINITIONS[0];
}

export function buildPageStudioQueryDefinition(kind = "primary-post-by-param", overrides = {}) {
  const definition = resolvePageStudioQueryDefinition(kind);
  return {
    id: normalizeText(overrides.id, definition.kind),
    kind: definition.kind,
    label: normalizeText(overrides.label, definition.label),
    sourceType: definition.sourceType,
    summary: normalizeText(overrides.summary, definition.summary),
    category: definition.category ?? "listing",
    bindAs: normalizeText(overrides.bindAs, definition.defaultBindAs),
    paramId: normalizeText(overrides.paramId, definition.defaultParamId ?? ""),
    lookupField: normalizeText(overrides.lookupField, definition.defaultLookupField ?? ""),
    itemId: normalizeText(overrides.itemId, ""),
    sortKey: normalizeText(overrides.sortKey, definition.defaultSortKey ?? "publishedOn"),
    sortDirection: normalizeText(overrides.sortDirection, definition.defaultSortDirection ?? "desc"),
    limit:
      typeof definition.defaultLimit === "number"
        ? normalizeInteger(overrides.limit, definition.defaultLimit, { min: 1, max: 24 })
        : null
  };
}

export function normalizePageStudioQueryDefinition(rawValue = {}, index = 0) {
  const requestedKind = normalizeText(rawValue?.kind, PAGE_STUDIO_QUERY_DEFINITIONS[0].kind);
  return buildPageStudioQueryDefinition(requestedKind, {
    id: normalizeText(rawValue?.id, `query-${index + 1}`),
    label: rawValue?.label,
    summary: rawValue?.summary,
    bindAs: rawValue?.bindAs,
    paramId: rawValue?.paramId,
    lookupField: rawValue?.lookupField,
    itemId: rawValue?.itemId,
    sortKey: rawValue?.sortKey,
    sortDirection: rawValue?.sortDirection,
    limit: rawValue?.limit
  });
}

export function inferPageStudioPrimaryQuery(queries = []) {
  return (Array.isArray(queries) ? queries : []).find(
    (entry) =>
      entry?.kind === "primary-post-by-param" ||
      entry?.kind === "primary-category-by-param"
  ) ?? null;
}

export function resolvePageStudioContextContract(studioDocument = {}) {
  const primaryQuery = inferPageStudioPrimaryQuery(studioDocument?.infra?.queries ?? []);
  if (primaryQuery?.kind === "primary-category-by-param") {
    return {
      pageKind: "category-detail",
      primarySourceType: "blog-category"
    };
  }
  if (primaryQuery?.kind === "primary-post-by-param") {
    return {
      pageKind: "post-detail",
      primarySourceType: "blog-post"
    };
  }
  return {
    pageKind: null,
    primarySourceType: null
  };
}
