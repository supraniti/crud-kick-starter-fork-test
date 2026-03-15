import {
  DEPLOYMENT_BUNDLES_COLLECTION_ID,
  DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID,
  MODULE_ID,
  PAGES_COLLECTION_ID,
  POSTS_COLLECTION_ID,
  REMOTE_CONNECTIONS_COLLECTION_ID,
  REMOTE_OPERATION_RUNS_COLLECTION_ID,
  REMOTE_TARGETS_COLLECTION_ID
} from "./distribution-shared-runtime.mjs";

export function createPagesRouteContext({
  manifest,
  moduleRegistry,
  collectionHandlerRegistry,
  resolveSettingsRepository
}) {
  const moduleId = manifest?.id ?? MODULE_ID;
  return {
    moduleId,
    pagesBasePath: `/api/reference/modules/${moduleId}/pages`,
    deliveryBasePath: `/api/reference/modules/${moduleId}/delivery`,
    moduleRegistry,
    manifest,
    resolveSettingsRepository,
    collectionHandlerRegistry,
    pagesHandler: collectionHandlerRegistry.get(PAGES_COLLECTION_ID),
    postsHandler: collectionHandlerRegistry.get(POSTS_COLLECTION_ID),
    bundlesHandler: collectionHandlerRegistry.get(DEPLOYMENT_BUNDLES_COLLECTION_ID),
    bundleRunsHandler: collectionHandlerRegistry.get(DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID),
    remoteConnectionsHandler: collectionHandlerRegistry.get(REMOTE_CONNECTIONS_COLLECTION_ID),
    remoteTargetsHandler: collectionHandlerRegistry.get(REMOTE_TARGETS_COLLECTION_ID),
    remoteRunsHandler: collectionHandlerRegistry.get(REMOTE_OPERATION_RUNS_COLLECTION_ID)
  };
}
