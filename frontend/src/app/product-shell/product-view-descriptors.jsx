import { COLLECTIONS_ROUTE_STATE_ADAPTER } from "../../runtime/view-registry/registration-primitives.js";
import { ProductDeploymentsView } from "./ProductDeploymentsView.jsx";
import { ProductDomainsView } from "./ProductDomainsView.jsx";
import { ProductEditorialView } from "./ProductEditorialView.jsx";
import { ProductModerationView } from "./ProductModerationView.jsx";
import { ProductRemotesView } from "./ProductRemotesView.jsx";
import { ProductSystemSettingsView } from "./ProductSystemSettingsView.jsx";

export const PRODUCT_VIEW_DESCRIPTORS = Object.freeze([
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
    render: (context) => <ProductDeploymentsView navigate={context.navigate} />
  },
  {
    moduleId: "test-modules-remote-ops",
    usesCollectionsDomain: false,
    requiredDomains: [],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => <ProductRemotesView navigate={context.navigate} route={context.route} />
  },
  {
    moduleId: "test-modules-editorial",
    usesCollectionsDomain: true,
    requiredDomains: ["collections"],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => (
      <ProductEditorialView navigate={context.navigate} collectionsDomain={context.collectionsDomain} />
    )
  },
  {
    moduleId: "test-modules-engagement",
    usesCollectionsDomain: true,
    requiredDomains: ["collections"],
    routeStateAdapter: COLLECTIONS_ROUTE_STATE_ADAPTER,
    render: (context) => (
      <ProductModerationView navigate={context.navigate} collectionsDomain={context.collectionsDomain} />
    )
  }
]);
