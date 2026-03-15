import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../../frontend/src/runtime/view-registry/registration-primitives.js";
import { BlogTaxonomyView } from "./BlogTaxonomyView.jsx";

const MODULE_ID = "test-modules-taxonomy";

export function registerModuleViews() {
  return [
    {
      moduleId: MODULE_ID,
      usesCollectionsDomain: true,
      requiredDomains: ["collections", "module-settings"],
      routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
      render: (context) => (
        <BlogTaxonomyView
          activeModuleLabel={context.activeModuleLabel}
          collectionsDomain={context.collectionsDomain}
          moduleSettingsDomain={context.moduleSettingsDomain}
          navigate={context.navigate}
        />
      )
    }
  ];
}

