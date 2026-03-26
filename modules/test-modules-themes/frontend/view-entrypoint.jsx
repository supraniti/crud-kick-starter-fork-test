import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../../frontend/src/runtime/view-registry/registration-primitives.js";
import { ThemesView } from "./ThemesView.jsx";

const MODULE_ID = "test-modules-themes";

export function registerModuleViews() {
  return [
    {
      moduleId: MODULE_ID,
      usesCollectionsDomain: false,
      requiredDomains: [],
      routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
      render: (context) => <ThemesView activeModuleLabel={context.activeModuleLabel} />
    }
  ];
}
