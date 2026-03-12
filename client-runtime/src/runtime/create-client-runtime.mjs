import { createActionRegistry, createDatasetRegistry, createQueryRegistry } from "../registries/index.mjs";
import { createMemoryCacheAdapter } from "../adapters/memory-cache.mjs";
import { createCacheStorageAdapter } from "../adapters/cache-storage.mjs";
import { createCapabilityMonitor } from "../adapters/capability-monitor.mjs";
import { createIndexedDbAdapter } from "../adapters/indexeddb-adapter.mjs";
import { createRemoteTransportAdapter } from "../adapters/remote-transport.mjs";
import { createDatasetManager } from "../datasets/dataset-manager.mjs";
import { executeQuery } from "../query/query-executor.mjs";
import { executeAction } from "../action/action-executor.mjs";
import { normalizeDatasetRequest } from "./request-shapes.mjs";

export function createClientRuntime(options = {}) {
  const queryRegistry = createQueryRegistry(options.queries || []);
  const actionRegistry = createActionRegistry(options.actions || []);
  const datasetRegistry = createDatasetRegistry(options.datasets || []);

  const adapters = {
    memory: options.adapters?.memory || createMemoryCacheAdapter(),
    cacheStorage: options.adapters?.cacheStorage || createCacheStorageAdapter({ globalObject: options.globalObject }),
    indexedDb:
      options.adapters?.indexedDb ||
      createIndexedDbAdapter({
        indexedDbFactory: options.globalObject?.indexedDB,
        globalObject: options.globalObject
      }),
    remote: options.adapters?.remote || createRemoteTransportAdapter(options.remote || {})
  };

  const capabilities = options.capabilities || createCapabilityMonitor({ globalObject: options.globalObject });

  const context = {
    queryRegistry,
    actionRegistry,
    datasetRegistry,
    adapters,
    capabilities,
    context: options.context || {}
  };

  const datasetManager = createDatasetManager(context);
  context.datasetManager = datasetManager;

  return {
    query: (request) => executeQuery(request, context),
    dispatch: (request) => executeAction(request, context),
    installDataset: (request) => datasetManager.installDataset(normalizeDatasetRequest(request)),
    syncDataset: (request) => datasetManager.syncDataset(normalizeDatasetRequest(request)),
    getDatasetStatus: (dataset) => datasetManager.getDatasetStatus(dataset),
    getCapabilities: () => capabilities.getSnapshot(),
    getRegistries: () => ({ queryRegistry, actionRegistry, datasetRegistry })
  };
}
