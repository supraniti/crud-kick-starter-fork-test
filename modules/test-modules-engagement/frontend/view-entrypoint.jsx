import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../../frontend/src/runtime/view-registry/registration-primitives.js";
import { BlogEngagementView } from "./BlogEngagementView.jsx";

const MODULE_ID = "test-modules-engagement";

export function registerModuleViews() {
  return [
    {
      moduleId: MODULE_ID,
      usesCollectionsDomain: true,
      requiredDomains: ["collections"],
      routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
      render: (context) => (
        <BlogEngagementView
          activeModuleLabel={context.activeModuleLabel}
          collectionsDomain={context.collectionsDomain}
        />
      )
    }
  ];
}

