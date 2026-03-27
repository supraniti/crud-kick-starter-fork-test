import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDeskPages } from "../../test-modules-pages/frontend/blog-distribution-workspace-support.js";

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
      setState({
        loading: false,
        errorMessage: null,
        pages: await fetchDeskPages()
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
