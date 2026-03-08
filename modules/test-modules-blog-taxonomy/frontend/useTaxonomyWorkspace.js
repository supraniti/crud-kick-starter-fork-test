import { useEffect, useMemo } from "react";

const TAGS_COLLECTION_ID = "blog-tags";
const CATEGORIES_COLLECTION_ID = "blog-categories";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildCategoryTreeRows(items) {
  const byParent = new Map();
  for (const item of items) {
    const parentKey =
      typeof item?.parentCategoryId === "string" && item.parentCategoryId.length > 0
        ? item.parentCategoryId
        : "__root__";
    const siblings = byParent.get(parentKey) ?? [];
    siblings.push(item);
    byParent.set(parentKey, siblings);
  }

  function visit(parentKey, depth) {
    const rows = byParent.get(parentKey) ?? [];
    rows.sort((left, right) => {
      const leftOrder = Number.isFinite(left?.sortOrder) ? left.sortOrder : 0;
      const rightOrder = Number.isFinite(right?.sortOrder) ? right.sortOrder : 0;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return (left?.name ?? "").localeCompare(right?.name ?? "");
    });

    return rows.flatMap((row) => [
      {
        ...row,
        treeDepth: depth
      },
      ...visit(row.id, depth + 1)
    ]);
  }

  return visit("__root__", 0);
}

function buildSummary(activeCollectionId, items) {
  if (activeCollectionId === TAGS_COLLECTION_ID) {
    return {
      primaryLabel: "Tags",
      total: items.length,
      secondary: items.filter((item) => item.visibility === "internal").length,
      tertiary: items.filter((item) => typeof item.color === "string" && item.color.length > 0).length,
      quaternary: items.filter((item) => Number(item.usageCount ?? 0) === 0).length
    };
  }

  return {
    primaryLabel: "Categories",
    total: items.length,
    secondary: items.filter((item) => !item.parentCategoryId).length,
    tertiary: items.filter((item) => item.visibility === "internal").length,
    quaternary: items.reduce(
      (maxDepth, item) => Math.max(maxDepth, Number(item.depth ?? 0)),
      0
    )
  };
}

export function useTaxonomyWorkspace({ collectionsDomain }) {
  useEffect(() => {
    if (
      collectionsDomain.activeCollectionId !== TAGS_COLLECTION_ID &&
      collectionsDomain.activeCollectionId !== CATEGORIES_COLLECTION_ID
    ) {
      collectionsDomain.handleSelectCollection(CATEGORIES_COLLECTION_ID);
    }
  }, [collectionsDomain.activeCollectionId, collectionsDomain.handleSelectCollection]);

  const items = useMemo(
    () => toArray(collectionsDomain.collectionItemsState.items),
    [collectionsDomain.collectionItemsState.items]
  );
  const categoryTreeRows = useMemo(
    () =>
      collectionsDomain.activeCollectionId === CATEGORIES_COLLECTION_ID
        ? buildCategoryTreeRows(items)
        : [],
    [collectionsDomain.activeCollectionId, items]
  );
  const summary = useMemo(
    () => buildSummary(collectionsDomain.activeCollectionId, items),
    [collectionsDomain.activeCollectionId, items]
  );

  return {
    items,
    summary,
    categoryTreeRows
  };
}
