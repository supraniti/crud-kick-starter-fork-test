import { PageStudioView } from "./PageStudioView.jsx";
import { normalizePageStudioMode } from "../shared/page-studio-modes.mjs";

const MODULE_IDS = Object.freeze(["test-modules-page-studio", "page-studio"]);

const PAGE_STUDIO_ROUTE_STATE_ADAPTER = Object.freeze({
  parseQuery: (query) => ({
    studioMode: normalizePageStudioMode(query.get("studioMode"), "infra")
  }),
  normalizeRoute: (route) => ({
    studioMode: normalizePageStudioMode(route?.studioMode, "infra")
  }),
  buildQuery: (route) => {
    return {
      studioMode: normalizePageStudioMode(route?.studioMode, "infra")
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
      <PageStudioView
        activeModuleLabel={context.activeModuleLabel}
        navigate={context.navigate}
        route={context.route}
      />
    )
  }));
}
