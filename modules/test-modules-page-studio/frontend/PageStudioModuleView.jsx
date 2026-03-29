import { useCallback, useEffect, useState } from "react";
import { PageStudioCustomWidgetsWorkspace } from "./PageStudioCustomWidgetsWorkspace.jsx";
import { PageStudioView } from "./PageStudioView.jsx";
import { normalizePageStudioSurface } from "../shared/page-studio-surfaces.mjs";

function buildNextUrl(patch = {}) {
  const nextUrl = new URL(window.location.href);
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      nextUrl.searchParams.delete(key);
      return;
    }
    nextUrl.searchParams.set(key, `${value}`);
  });
  return `${nextUrl.pathname}${nextUrl.search}`;
}

export function PageStudioModuleView({ activeModuleLabel = "Page Studio", navigate = null, route = {} }) {
  const [localRoute, setLocalRoute] = useState(() => ({
    ...route,
    studioSurface: normalizePageStudioSurface(route?.studioSurface, "pages")
  }));

  useEffect(() => {
    setLocalRoute({
      ...route,
      studioSurface: normalizePageStudioSurface(route?.studioSurface, "pages")
    });
  }, [route?.customWidgetId, route?.studioMode, route?.studioSurface]);

  const studioSurface = normalizePageStudioSurface(localRoute?.studioSurface, "pages");

  const patchRouteState = useCallback((patch = {}) => {
    setLocalRoute((previous) => ({
      ...previous,
      ...patch,
      studioSurface: normalizePageStudioSurface(
        Object.prototype.hasOwnProperty.call(patch, "studioSurface")
          ? patch.studioSurface
          : previous?.studioSurface,
        "pages"
      )
    }));
    if (typeof window === "undefined") {
      return;
    }
    window.history.replaceState(null, "", buildNextUrl(patch));
  }, []);

  const openPages = useCallback(() => {
    patchRouteState({
      studioSurface: "pages",
      customWidgetId: null
    });
  }, [patchRouteState]);

  const openCustomWidgets = useCallback(() => {
    patchRouteState({
      studioSurface: "custom-widgets",
      studioMode: localRoute?.studioMode && localRoute.studioMode !== "infra" ? localRoute.studioMode : "layout"
    });
  }, [localRoute?.studioMode, patchRouteState]);

  if (studioSurface === "custom-widgets") {
    return (
      <PageStudioCustomWidgetsWorkspace
        route={localRoute}
        onPatchRouteState={patchRouteState}
        onOpenPages={openPages}
      />
    );
  }

  return (
    <PageStudioView
      activeModuleLabel={activeModuleLabel}
      navigate={navigate}
      route={localRoute}
      onPatchRouteState={patchRouteState}
      onOpenCustomWidgets={openCustomWidgets}
    />
  );
}
