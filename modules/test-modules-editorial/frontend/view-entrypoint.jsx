import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../../frontend/src/runtime/view-registry/registration-primitives.js";
import { BlogEditorialView } from "./BlogEditorialView.jsx";

const MODULE_ID = "test-modules-editorial";

export function registerModuleViews() {
  return [
    {
      moduleId: MODULE_ID,
      usesCollectionsDomain: true,
      requiredDomains: ["collections"],
      routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
      render: (context) => (
        <BlogEditorialView
          activeModuleLabel={context.activeModuleLabel}
          collectionsDomain={context.collectionsDomain}
        />
      )
    }
  ];
}

