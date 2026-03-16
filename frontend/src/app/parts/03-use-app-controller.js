import { useCallback, useMemo, useState } from "react";
import { useRemotesDeployDomain } from "../../domains/remotes-deploy/useRemotesDeployDomain.js";
import {
  parseRouteFromLocation,
  resolveViewRegistration
} from "../../runtime/view-registry.jsx";
import {
  defaultApiClients,
  readAuthSession
} from "./01-app-config.js";
import {
  buildProductNavigationItems,
  resolveProductRouteGuide
} from "../product-shell/product-shell-catalog.js";
import { readDeveloperMode } from "../product-shell/product-exposure-policy.js";
import {
  buildAppControllerResult,
  resolveActiveModuleViewState,
  useAppDomains,
  useAuthHandlers,
  useCollectionRouteHandlers,
  useConnectivity,
  useEnsureRouteModuleExists,
  useModuleRouteHandlers,
  useModuleStateLoader,
  useRouteLifecycle,
  useRouteNavigation,
  useViewActionHandlers
} from "./03-use-app-controller.helpers.js";

function resolveRequiredDomainsForModule(moduleId, moduleRuntimeItems) {
  const viewRegistration = resolveViewRegistration(moduleId, {
    moduleRuntimeItems
  });

  return Array.isArray(viewRegistration?.requiredDomains)
    ? viewRegistration.requiredDomains
    : [];
}

function resolveActiveModuleViewContext({
  route,
  navigate,
  moduleRuntimeItems,
  moduleStateItems,
  selectedCategoryIds,
  appDomains,
  remotesDeployDomain,
  handleToggleCategory,
  handleRemoveCategory,
  handleOpenRemotes,
  handleOpenTaxonomies
}) {
  return resolveActiveModuleViewState({
    route,
    navigate,
    moduleRuntimeItems,
    moduleStateItems,
    selectedCategoryIds,
    productsTaxonomiesDomain: appDomains.productsTaxonomiesDomain,
    collectionsDomain: appDomains.collectionsDomain,
    moduleSettingsDomain: appDomains.moduleSettingsDomain,
    missionOperatorDomain: appDomains.missionOperatorDomain,
    remotesDeployDomain,
    handleToggleCategory,
    handleRemoveCategory,
    handleOpenRemotes,
    handleOpenTaxonomies
  });
}

function useResolvedRouteViewState(route, moduleRuntimeItems) {
  const activeViewRegistration = resolveViewRegistration(route.moduleId, {
    moduleRuntimeItems
  });
  const requiredDomains = new Set(
    resolveRequiredDomainsForModule(route.moduleId, moduleRuntimeItems)
  );

  return {
    activeViewRegistration,
    requiredDomains,
    selectedCategoryIds: route.categoryIds ?? [],
    isCollectionsRouteActive: requiredDomains.has("collections")
  };
}

function useRuntimeSettingsState() {
  const [runtimeSettingsOpen, setRuntimeSettingsOpen] = useState(false);
  const handleOpenRuntimeSettings = useCallback(() => {
    setRuntimeSettingsOpen(true);
  }, []);
  const handleCloseRuntimeSettings = useCallback(() => {
    setRuntimeSettingsOpen(false);
  }, []);

  return {
    setRuntimeSettingsOpen,
    runtimeSettingsOpen,
    handleOpenRuntimeSettings,
    handleCloseRuntimeSettings
  };
}

function useProductModuleState(rawModuleState) {
  return useMemo(
    () => ({
      ...rawModuleState,
      items: buildProductNavigationItems(rawModuleState.items)
    }),
    [rawModuleState]
  );
}

function useActiveRouteGuide(moduleStateItems, moduleId) {
  return useMemo(
    () => resolveProductRouteGuide(moduleStateItems, moduleId),
    [moduleStateItems, moduleId]
  );
}

function useProductShellModuleState({ api, isAuthenticated, reloadToken, routeModuleId }) {
  const rawModuleState = useModuleStateLoader({
    api,
    isAuthenticated,
    reloadToken
  });
  const moduleState = useProductModuleState(rawModuleState);
  const activeRouteGuide = useActiveRouteGuide(moduleState.items, routeModuleId);
  return {
    moduleState,
    activeRouteGuide
  };
}

function useAppController({ api = defaultApiClients }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => readAuthSession());
  const [route, setRoute] = useState(() => parseRouteFromLocation());
  const {
    setRuntimeSettingsOpen,
    runtimeSettingsOpen,
    handleOpenRuntimeSettings,
    handleCloseRuntimeSettings
  } = useRuntimeSettingsState();
  const remotesDeployDomain = useRemotesDeployDomain({
    api,
    isAuthenticated,
    activeModuleId: route.moduleId,
    resolveRemotesDeployEnabled: ({ activeModuleId, moduleRuntimeItems }) =>
      resolveRequiredDomainsForModule(activeModuleId, moduleRuntimeItems).includes(
        "remotes-deploy"
      )
  });
  const moduleRuntimeItems = remotesDeployDomain.moduleRuntimeState.items;
  const {
    activeViewRegistration,
    requiredDomains,
    selectedCategoryIds,
    isCollectionsRouteActive
  } = useResolvedRouteViewState(route, moduleRuntimeItems);
  const navigate = useRouteNavigation(setRoute, moduleRuntimeItems);
  const collectionRouteHandlers = useCollectionRouteHandlers({ navigate, isCollectionsRouteActive, route });
  const { connectivityMode, runConnectivityCheck } = useConnectivity(api);
  useRouteLifecycle({
    isAuthenticated,
    moduleRuntimeItems,
    setRoute,
    navigate,
    route
  });
  const { moduleState, activeRouteGuide } = useProductShellModuleState({
    api,
    isAuthenticated,
    reloadToken: remotesDeployDomain.moduleRuntimeReloadToken,
    routeModuleId: route.moduleId
  });
  useEnsureRouteModuleExists({
    isAuthenticated,
    moduleRuntimeItems,
    moduleStateItems: moduleState.items,
    navigate
  });
  const appDomains = useAppDomains({
    api,
    isAuthenticated,
    requiredDomains,
    route,
    selectedCategoryIds,
    isCollectionsRouteActive,
    moduleRuntimeItems,
    remotesDeployDomain,
    collectionRouteHandlers
  });
  const { handleSignIn, handleSignOut } = useAuthHandlers({
    setIsAuthenticated,
    setRoute,
    setRuntimeSettingsOpen,
    navigate,
    route
  });
  const {
    handleSelectModule,
    handleToggleCategory,
    handleRemoveCategory,
    handleOpenTaxonomies,
    handleOpenRemotes
  } = useModuleRouteHandlers({
    route, moduleRuntimeItems, selectedCategoryIds, navigate
  });
  const { viewActions, handleRunViewAction } = useViewActionHandlers({
    activeViewRegistration,
    route,
    navigate,
    moduleRuntimeItems
  });
  const { routeUrl, activeModuleView } = resolveActiveModuleViewContext({
    route,
    navigate,
    moduleRuntimeItems,
    moduleStateItems: moduleState.items,
    selectedCategoryIds,
    appDomains,
    remotesDeployDomain,
    handleToggleCategory,
    handleRemoveCategory,
    handleOpenRemotes,
    handleOpenTaxonomies
  });
  return buildAppControllerResult({
    isAuthenticated,
    handleSignIn,
    route,
    moduleState,
    connectivityMode,
    runConnectivityCheck,
    handleSignOut,
    viewActions,
    handleRunViewAction,
    requiredDomains,
    remotesDeployDomain,
    activeViewRegistration,
    activeModuleView,
    routeUrl,
    activeRouteGuide,
    handleSelectModule,
    handleOpenRemotes,
    developerModeEnabled: readDeveloperMode(),
    runtimeSettingsOpen,
    handleOpenRuntimeSettings,
    handleCloseRuntimeSettings
  });
}

export { useAppController };
