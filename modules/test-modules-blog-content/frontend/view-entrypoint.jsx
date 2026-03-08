import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../../frontend/src/runtime/view-registry/registration-primitives.js";
import { BlogContentView } from "./BlogContentView.jsx";

const MODULE_ID = "test-modules-blog-content";

export function registerModuleViews() {
  return [
    {
      moduleId: MODULE_ID,
      usesCollectionsDomain: true,
      requiredDomains: ["collections"],
      routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
      render: (context) => (
        <BlogContentView
          activeModuleLabel={context.activeModuleLabel}
          collectionsDomain={context.collectionsDomain}
        />
      )
    }
  ];
}
