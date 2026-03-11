import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchReferenceCollectionItems } from "../../../frontend/src/api/reference.js";

const PAGES_COLLECTION_ID = "blog-pages";

function createDeploymentAwarenessState() {
  return {
    loading: false,
    errorMessage: null,
    pages: []
  };
}

function matchesPostTemplate(page, post) {
  if (!page || !post || page.primarySourceType !== "blog-post" || page.status !== "published") {
    return false;
  }

  if (page.deploymentMode === "per-record" && page.sourceSelectionMode === "all-records") {
    return post.status === "published";
  }

  return page.primarySource?.itemId === post.id;
}

export function useContentDeploymentAwareness({ selectedPost }) {
  const [state, setState] = useState(createDeploymentAwarenessState);

  const reload = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));

    try {
      const payload = await fetchReferenceCollectionItems({
        collectionId: PAGES_COLLECTION_ID,
        limit: 200
      });
      setState({
        loading: false,
        errorMessage: null,
        pages: Array.isArray(payload?.items) ? payload.items : []
      });
    } catch (error) {
      setState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load page deployment awareness",
        pages: []
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const impactedTemplates = useMemo(
    () => state.pages.filter((page) => matchesPostTemplate(page, selectedPost)),
    [selectedPost, state.pages]
  );

  const summary = useMemo(() => ({
    totalTemplates: impactedTemplates.length,
    cleanTemplates: impactedTemplates.filter((page) => page.deploymentStatus === "clean").length,
    staleTemplates: impactedTemplates.filter((page) => page.deploymentStatus === "stale").length,
    missingTemplates: impactedTemplates.filter((page) => page.deploymentStatus === "missing").length,
    primaryPageId: impactedTemplates[0]?.id ?? ""
  }), [impactedTemplates]);

  return {
    state,
    reload,
    impactedTemplates,
    summary
  };
}
