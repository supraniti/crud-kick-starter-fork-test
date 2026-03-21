import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../../frontend/src/runtime/view-registry/registration-primitives.js";
import { AuthorDeskView } from "./AuthorDeskView.jsx";

const MODULE_ID = "test-modules-editorial";

export function registerModuleViews() {
  return [
    {
      moduleId: MODULE_ID,
      usesCollectionsDomain: true,
      requiredDomains: ["collections"],
      routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
      render: (context) => (
        <AuthorDeskView
          navigate={context.navigate}
          route={context.route}
          collectionsDomain={context.collectionsDomain}
        />
      )
    }
  ];
}

