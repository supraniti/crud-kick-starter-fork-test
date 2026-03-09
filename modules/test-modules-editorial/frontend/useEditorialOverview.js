import { useCallback, useEffect, useMemo, useState } from "react";

const AUTHORS_COLLECTION_ID = "blog-authors";
const POSTS_COLLECTION_ID = "blog-posts";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createEmptyQueueState() {
  return {
    loading: false,
    available: false,
    items: [],
    errorMessage: null
  };
}

function computeReadiness(post) {
  const hasAuthor = typeof post?.primaryAuthorId === "string" && post.primaryAuthorId.length > 0;
  const hasCategories = Array.isArray(post?.categoryIds) && post.categoryIds.length > 0;
  const hasBody = typeof post?.body === "string" && post.body.trim().length >= 120;
  return hasAuthor && hasCategories && hasBody ? "ready" : "needs-attention";
}

async function readEditorialQueue() {
  const response = await fetch(`/api/reference/collections/${POSTS_COLLECTION_ID}/items?limit=200`);
  if (response.status === 404) {
    return {
      available: false,
      items: [],
      errorMessage: null
    };
  }

  const payload = await response.json();
  if (!response.ok || payload?.ok !== true) {
    throw new Error(payload?.error?.message ?? "Failed to load editorial queue");
  }

  return {
    available: true,
    items: toArray(payload.items),
    errorMessage: null
  };
}

function buildSummary(authors) {
  return {
    total: authors.length,
    active: authors.filter((item) => item.status === "active").length,
    editors: authors.filter((item) =>
      item.role === "editor" || item.role === "managing-editor"
    ).length,
    guests: authors.filter((item) => item.role === "guest").length
  };
}

function filterQueueItems(items, filters) {
  return items.filter((item) => {
    if (filters.status && item.status !== filters.status) {
      return false;
    }
    if (filters.primaryAuthorId && item.primaryAuthorId !== filters.primaryAuthorId) {
      return false;
    }
    if (filters.readiness && computeReadiness(item) !== filters.readiness) {
      return false;
    }
    return true;
  });
}

export function useEditorialOverview({ collectionsDomain }) {
  const [queueState, setQueueState] = useState(createEmptyQueueState);
  const [queueFilters, setQueueFilters] = useState({
    status: "",
    primaryAuthorId: "",
    readiness: ""
  });

  useEffect(() => {
    if (collectionsDomain.activeCollectionId !== AUTHORS_COLLECTION_ID) {
      collectionsDomain.handleSelectCollection(AUTHORS_COLLECTION_ID);
    }
  }, [collectionsDomain.activeCollectionId, collectionsDomain.handleSelectCollection]);

  const reloadQueue = useCallback(async () => {
    setQueueState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));

    try {
      const nextState = await readEditorialQueue();
      setQueueState({
        loading: false,
        available: nextState.available,
        items: nextState.items,
        errorMessage: nextState.errorMessage
      });
    } catch (error) {
      setQueueState({
        loading: false,
        available: false,
        items: [],
        errorMessage: error?.message ?? "Failed to load editorial queue"
      });
    }
  }, []);

  useEffect(() => {
    void reloadQueue();
  }, [reloadQueue]);

  const authors = useMemo(
    () => toArray(collectionsDomain.collectionItemsState.items),
    [collectionsDomain.collectionItemsState.items]
  );
  const summary = useMemo(() => buildSummary(authors), [authors]);
  const filteredQueueItems = useMemo(
    () => filterQueueItems(queueState.items, queueFilters),
    [queueFilters, queueState.items]
  );

  return {
    authors,
    summary,
    queueState,
    queueFilters,
    filteredQueueItems,
    setQueueFilters,
    reloadQueue,
    computeReadiness
  };
}
