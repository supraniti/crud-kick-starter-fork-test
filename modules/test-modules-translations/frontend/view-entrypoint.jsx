import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../../frontend/src/runtime/view-registry/registration-primitives.js";
import { TranslationsView } from "./TranslationsView.jsx";

const MODULE_ID = "test-modules-translations";

export function registerModuleViews() {
  return [
    {
      moduleId: MODULE_ID,
      usesCollectionsDomain: false,
      requiredDomains: [],
      routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
      render: (context) => <TranslationsView activeModuleLabel={context.activeModuleLabel} />
    }
  ];
}
