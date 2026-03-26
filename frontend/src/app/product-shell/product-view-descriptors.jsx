import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../runtime/view-registry/registration-primitives.js";
import { BlogContentView } from "../../../../modules/test-modules-content/frontend/BlogContentView.jsx";
import { LayoutsView } from "../../../../modules/test-modules-layouts/frontend/LayoutsView.jsx";
import { MediaManagerView } from "../../../../modules/test-modules-media-manager/frontend/MediaManagerView.jsx";
import { BlogDistributionView } from "../../../../modules/test-modules-pages/frontend/BlogDistributionView.jsx";
import { BlogTaxonomyView } from "../../../../modules/test-modules-taxonomy/frontend/BlogTaxonomyView.jsx";
import { ThemesView } from "../../../../modules/test-modules-themes/frontend/ThemesView.jsx";
import { TranslationsView } from "../../../../modules/test-modules-translations/frontend/TranslationsView.jsx";
import { ProductDeploymentsView } from "./ProductDeploymentsView.jsx";
import { ProductDomainsView } from "./ProductDomainsView.jsx";
import { ProductEditorialView } from "./ProductEditorialView.jsx";
import { ProductModerationView } from "./ProductModerationView.jsx";
import { ProductRemotesView } from "./ProductRemotesView.jsx";
import { ProductSystemSettingsView } from "./ProductSystemSettingsView.jsx";

export const PRODUCT_VIEW_DESCRIPTORS = Object.freeze([
  {
    moduleId: "themes",
    usesCollectionsDomain: false,
    requiredDomains: [],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => <ThemesView activeModuleLabel={context.activeModuleLabel} />
  },
  {
    moduleId: "system-settings",
    usesCollectionsDomain: false,
    requiredDomains: [],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => <ProductSystemSettingsView navigate={context.navigate} />
  },
  {
    moduleId: "domains",
    usesCollectionsDomain: false,
    requiredDomains: [],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => <ProductDomainsView navigate={context.navigate} route={context.route} />
  },
  {
    moduleId: "deployments",
    usesCollectionsDomain: false,
    requiredDomains: [],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => <ProductDeploymentsView navigate={context.navigate} route={context.route} />
  },
  {
    moduleId: "test-modules-remote-ops",
    usesCollectionsDomain: false,
    requiredDomains: [],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => <ProductRemotesView navigate={context.navigate} route={context.route} />
  },
  {
    moduleId: "test-modules-media-manager",
    usesCollectionsDomain: true,
    requiredDomains: ["collections", "module-settings"],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => (
      <MediaManagerView
        activeModuleLabel={context.activeModuleLabel}
        collectionsDomain={context.collectionsDomain}
        moduleSettingsDomain={context.moduleSettingsDomain}
        navigate={context.navigate}
        route={context.route}
      />
    )
  },
  {
    moduleId: "test-modules-taxonomy",
    usesCollectionsDomain: true,
    requiredDomains: ["collections", "module-settings"],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => (
      <BlogTaxonomyView
        activeModuleLabel={context.activeModuleLabel}
        collectionsDomain={context.collectionsDomain}
        moduleSettingsDomain={context.moduleSettingsDomain}
        navigate={context.navigate}
        route={context.route}
      />
    )
  },
  {
    moduleId: "test-modules-content",
    usesCollectionsDomain: true,
    requiredDomains: ["collections", "module-settings"],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => (
      <BlogContentView
        activeModuleLabel={context.activeModuleLabel}
        collectionsDomain={context.collectionsDomain}
        moduleSettingsDomain={context.moduleSettingsDomain}
        navigate={context.navigate}
        route={context.route}
      />
    )
  },
  {
    moduleId: "test-modules-editorial",
    usesCollectionsDomain: true,
    requiredDomains: ["collections"],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => (
      <ProductEditorialView
        navigate={context.navigate}
        route={context.route}
        collectionsDomain={context.collectionsDomain}
      />
    )
  },
  {
    moduleId: "test-modules-engagement",
    usesCollectionsDomain: true,
    requiredDomains: ["collections"],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => (
      <ProductModerationView
        navigate={context.navigate}
        route={context.route}
        collectionsDomain={context.collectionsDomain}
      />
    )
  },
  {
    moduleId: "test-modules-themes",
    usesCollectionsDomain: false,
    requiredDomains: [],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => <ThemesView activeModuleLabel={context.activeModuleLabel} />
  },
  {
    moduleId: "test-modules-translations",
    usesCollectionsDomain: false,
    requiredDomains: [],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => <TranslationsView activeModuleLabel={context.activeModuleLabel} />
  },
  {
    moduleId: "test-modules-layouts",
    usesCollectionsDomain: true,
    requiredDomains: ["collections"],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => (
      <LayoutsView
        activeModuleLabel={context.activeModuleLabel}
        navigate={context.navigate}
        route={context.route}
      />
    )
  },
  {
    moduleId: "test-modules-pages",
    usesCollectionsDomain: true,
    requiredDomains: ["collections", "module-settings"],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => (
      <BlogDistributionView
        activeModuleLabel={context.activeModuleLabel}
        collectionsDomain={context.collectionsDomain}
        moduleSettingsDomain={context.moduleSettingsDomain}
        navigate={context.navigate}
        route={context.route}
      />
    )
  }
]);
