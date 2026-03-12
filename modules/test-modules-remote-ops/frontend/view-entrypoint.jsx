import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../../frontend/src/runtime/view-registry/registration-primitives.js";
import { RemoteOpsView } from "./RemoteOpsView.jsx";

const MODULE_ID = "test-modules-remote-ops";

export function registerModuleViews() {
  return [
    {
      moduleId: MODULE_ID,
      usesCollectionsDomain: true,
      requiredDomains: ["collections"],
      routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
      render: (context) => (
        <RemoteOpsView
          activeModuleLabel={context.activeModuleLabel}
          navigate={context.navigate}
          route={context.route}
        />
      )
    }
  ];
}
