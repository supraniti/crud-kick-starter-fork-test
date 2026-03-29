import { PageStudioModuleView } from "./PageStudioModuleView.jsx";
import { normalizePageStudioMode } from "../shared/page-studio-modes.mjs";
import { normalizePageStudioSurface } from "../shared/page-studio-surfaces.mjs";

const MODULE_IDS = Object.freeze(["test-modules-page-studio", "page-studio"]);

const PAGE_STUDIO_ROUTE_STATE_ADAPTER = Object.freeze({
  parseQuery: (query) => ({
    studioMode: normalizePageStudioMode(query.get("studioMode"), "infra"),
    studioSurface: normalizePageStudioSurface(query.get("studioSurface"), "pages"),
    customWidgetId: query.get("customWidgetId") ?? ""
  }),
  normalizeRoute: (route) => ({
    studioMode: normalizePageStudioMode(route?.studioMode, "infra"),
    studioSurface: normalizePageStudioSurface(route?.studioSurface, "pages"),
    customWidgetId: typeof route?.customWidgetId === "string" ? route.customWidgetId : ""
  }),
  buildQuery: (route) => {
    return {
      studioMode: normalizePageStudioMode(route?.studioMode, "infra"),
      studioSurface: normalizePageStudioSurface(route?.studioSurface, "pages"),
      customWidgetId: typeof route?.customWidgetId === "string" ? route.customWidgetId : ""
    };
  }
});

export function registerModuleViews() {
  return MODULE_IDS.map((moduleId) => ({
    moduleId,
    usesCollectionsDomain: false,
    routeStateAdapter: PAGE_STUDIO_ROUTE_STATE_ADAPTER,
    shell: {
      mode: "immersive"
    },
    render: (context) => (
      <PageStudioModuleView
        activeModuleLabel={context.activeModuleLabel}
        navigate={context.navigate}
        route={context.route}
      />
    )
  }));
}
