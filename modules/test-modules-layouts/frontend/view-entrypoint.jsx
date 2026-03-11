import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../../frontend/src/runtime/view-registry/registration-primitives.js";
import { LayoutsView } from "./LayoutsView.jsx";

const MODULE_ID = "test-modules-layouts";

export function registerModuleViews() {
  return [
    {
      moduleId: MODULE_ID,
      usesCollectionsDomain: true,
      requiredDomains: ["collections"],
      shell: {
        mode: "immersive"
      },
      routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
      render: (context) => (
        <LayoutsView
          activeModuleLabel={context.activeModuleLabel}
          navigate={context.navigate}
          route={context.route}
        />
      )
    }
  ];
}
