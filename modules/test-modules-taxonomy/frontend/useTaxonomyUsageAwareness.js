import { useCallback, useEffect, useMemo, useState } from "react";

const POSTS_COLLECTION_ID = "blog-posts";
const PAGES_COLLECTION_ID = "blog-pages";
const TAGS_COLLECTION_ID = "blog-tags";
const CATEGORIES_COLLECTION_ID = "blog-categories";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createUsageState() {
  return {
    loading: false,
    errorMessage: null,
    posts: [],
    pages: []
  };
}

async function readCollectionItems(collectionId) {
  const response = await fetch(`/api/reference/collections/${collectionId}/items?limit=200`, {
    headers: {
      accept: "application/json"
    }
  });
  if (response.status === 404) {
    return [];
  }
  const payload = await response.json();
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error?.message ?? `Failed to load ${collectionId}`);
  }
  return toArray(payload.items);
}

function hasDataSourceKind(page, kind) {
  return toArray(page?.dataSources).some((descriptor) => descriptor?.kind === kind);
}

function buildReferenceCountMap(posts, fieldId) {
  const counts = new Map();
  for (const post of posts) {
    for (const value of toArray(post?.[fieldId])) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

function buildUsageRows(activeCollectionId, items, posts) {
  const referenceCountMap = buildReferenceCountMap(
    posts,
    activeCollectionId === CATEGORIES_COLLECTION_ID ? "categoryIds" : "tagIds"
  );
  return toArray(items)
    .map((item) => ({
      id: item.id,
      label: item.name ?? item.title ?? item.slug ?? item.id,
      actualReferenceCount: referenceCountMap.get(item.id) ?? 0,
      recordedUsageCount: Number(item.usageCount ?? 0)
    }))
    .sort(
      (left, right) =>
        right.actualReferenceCount - left.actualReferenceCount ||
        right.recordedUsageCount - left.recordedUsageCount ||
        left.label.localeCompare(right.label)
    )
    .slice(0, 6);
}

function buildUsageSummary(activeCollectionId, items, posts, pages) {
  const categorizedPosts = posts.filter((post) => toArray(post?.categoryIds).length > 0).length;
  const taggedPosts = posts.filter((post) => toArray(post?.tagIds).length > 0).length;
  const postsMissingCategories = posts.filter((post) => toArray(post?.categoryIds).length === 0).length;
  const categoryTemplatePages = pages.filter((page) => page?.primarySourceType === "blog-category").length;
  const categoryListingPages = pages.filter((page) => hasDataSourceKind(page, "posts-by-category")).length;
  const tagListingPages = pages.filter((page) => hasDataSourceKind(page, "posts-by-tag")).length;
  const referencedItemIds = new Set(
    posts.flatMap((post) =>
      activeCollectionId === CATEGORIES_COLLECTION_ID ? toArray(post?.categoryIds) : toArray(post?.tagIds)
    )
  );

  return {
    totalPosts: posts.length,
    categorizedPosts,
    taggedPosts,
    postsMissingCategories,
    categoryTemplatePages,
    categoryListingPages,
    tagListingPages,
    referencedTerms: toArray(items).filter((item) => referencedItemIds.has(item.id)).length,
    unusedTerms: toArray(items).filter((item) => !referencedItemIds.has(item.id)).length
  };
}

export function useTaxonomyUsageAwareness({ activeCollectionId, items }) {
  const [usageState, setUsageState] = useState(createUsageState);

  const reload = useCallback(async () => {
    setUsageState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));

    try {
      const [posts, pages] = await Promise.all([
        readCollectionItems(POSTS_COLLECTION_ID),
        readCollectionItems(PAGES_COLLECTION_ID)
      ]);
      setUsageState({
        loading: false,
        errorMessage: null,
        posts,
        pages
      });
    } catch (error) {
      setUsageState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load taxonomy usage awareness",
        posts: [],
        pages: []
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const usageSummary = useMemo(
    () => buildUsageSummary(activeCollectionId, items, usageState.posts, usageState.pages),
    [activeCollectionId, items, usageState.pages, usageState.posts]
  );
  const usageRows = useMemo(
    () => buildUsageRows(activeCollectionId, items, usageState.posts),
    [activeCollectionId, items, usageState.posts]
  );

  return {
    usageState,
    usageSummary,
    usageRows,
    reload
  };
}
