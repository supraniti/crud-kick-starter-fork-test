import { useCallback, useEffect, useMemo } from "react";

export function useLayoutRouteSync({
  layouts,
  navigate,
  route,
  selection
}) {
  const routeLayoutId = typeof route?.layoutId === "string" ? route.layoutId : "";
  const routeLayoutExists = routeLayoutId.length > 0 && layouts.some((layout) => layout.id === routeLayoutId);

  useEffect(() => {
    if (
      selection.isCreatingNewLayout
      || routeLayoutId.length === 0
      || routeLayoutId === selection.selectedLayoutId
    ) {
      return;
    }
    if (!routeLayoutExists) {
      return;
    }
    selection.setIsCreatingNewLayout(false);
    selection.setSelectedLayoutId(routeLayoutId);
    selection.setIsNodeDialogOpen(false);
    selection.setIsMoveMode(false);
  }, [
    layouts,
    routeLayoutExists,
    routeLayoutId,
    selection.isCreatingNewLayout,
    selection.selectedLayoutId,
    selection.setIsCreatingNewLayout,
    selection.setIsMoveMode,
    selection.setIsNodeDialogOpen,
    selection.setSelectedLayoutId
  ]);

  useEffect(() => {
    if (typeof navigate !== "function") {
      return;
    }
    if (routeLayoutId.length > 0 && layouts.length === 0) {
      return;
    }
    const nextLayoutId = selection.isCreatingNewLayout ? "" : selection.selectedLayoutId ?? "";
    if (
      routeLayoutExists
      && routeLayoutId !== nextLayoutId
    ) {
      return;
    }
    if (routeLayoutId === nextLayoutId) {
      return;
    }
    navigate(
      {
        ...route,
        layoutId: nextLayoutId
      },
      { replace: true }
    );
  }, [
    navigate,
    layouts.length,
    route,
    routeLayoutExists,
    routeLayoutId,
    selection.isCreatingNewLayout,
    selection.selectedLayoutId
  ]);
}

export function useLayoutDeploymentImpact({ selectedLayout, pages, navigate, route }) {
  const selectedLayoutDeploymentImpact = useMemo(() => {
    if (!selectedLayout?.id) {
      return {
        totalTemplates: 0,
        publishedTemplates: 0,
        staleTemplates: 0,
        missingTemplates: 0,
        cleanTemplates: 0,
        pages: []
      };
    }

    const linkedPages = pages.filter((page) => page.layoutId === selectedLayout.id);
    return {
      totalTemplates: linkedPages.length,
      publishedTemplates: linkedPages.filter((page) => page.status === "published").length,
      staleTemplates: linkedPages.filter((page) => page.deploymentStatus === "stale").length,
      missingTemplates: linkedPages.filter((page) => page.deploymentStatus === "missing").length,
      cleanTemplates: linkedPages.filter((page) => page.deploymentStatus === "clean").length,
      pages: linkedPages
    };
  }, [pages, selectedLayout?.id]);

  const returnRoute = useMemo(() => {
    const moduleId = typeof route?.returnModuleId === "string" ? route.returnModuleId : "";
    if (moduleId.length === 0) {
      return null;
    }
    return {
      moduleId,
      pageId: typeof route?.returnPageId === "string" ? route.returnPageId : "",
      tab: typeof route?.returnTab === "string" ? route.returnTab : ""
    };
  }, [route]);

  const returnToCallingRoute = useCallback(() => {
    if (!returnRoute || typeof navigate !== "function") {
      return;
    }
    navigate(returnRoute, { replace: false });
  }, [navigate, returnRoute]);

  return {
    selectedLayoutDeploymentImpact,
    returnRoute,
    returnToCallingRoute
  };
}
