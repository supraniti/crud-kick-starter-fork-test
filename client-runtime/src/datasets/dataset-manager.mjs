import { createResultEnvelope } from "../runtime/result-envelope.mjs";

export function createDatasetManager(options) {
  const datasetRegistry = options.datasetRegistry;
  const indexedDb = options.adapters.indexedDb;
  const remote = options.adapters.remote;
  const capabilities = options.capabilities;

  function resolve(datasetName) {
    return datasetRegistry.get(datasetName);
  }

  async function installDataset(request) {
    const definition = resolve(request.dataset);
    if (!definition) {
      return createResultEnvelope({ ok: false, error: { code: "DATASET_NOT_FOUND", message: `Unknown dataset '${request.dataset}'` } });
    }

    if (!capabilities.getSnapshot().indexedDb || !indexedDb.isAvailable()) {
      return createResultEnvelope({ ok: false, error: { code: "INDEXEDDB_UNAVAILABLE", message: "IndexedDB is unavailable" } });
    }

    const remoteResult = await remote.fetchDataset(definition, request, options.context, "install");
    const items = remoteResult.items || [];
    await indexedDb.replaceDataset(definition.dataset, items, {
      version: remoteResult.version || null,
      syncToken: remoteResult.syncToken || null,
      installedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      recordCount: items.length
    });

    return createResultEnvelope({
      ok: true,
      data: { dataset: definition.dataset, itemCount: items.length },
      meta: { source: "remote-install", dataset: definition.dataset }
    });
  }

  async function syncDataset(request) {
    const definition = resolve(request.dataset);
    if (!definition) {
      return createResultEnvelope({ ok: false, error: { code: "DATASET_NOT_FOUND", message: `Unknown dataset '${request.dataset}'` } });
    }

    if (!capabilities.getSnapshot().indexedDb || !indexedDb.isAvailable()) {
      return createResultEnvelope({ ok: false, error: { code: "INDEXEDDB_UNAVAILABLE", message: "IndexedDB is unavailable" } });
    }

    const remoteResult = await remote.fetchDataset(definition, request, options.context, "sync");
    const items = remoteResult.items || [];
    await indexedDb.replaceDataset(definition.dataset, items, {
      version: remoteResult.version || null,
      syncToken: remoteResult.syncToken || null,
      syncedAt: new Date().toISOString(),
      recordCount: items.length
    });

    return createResultEnvelope({
      ok: true,
      data: { dataset: definition.dataset, itemCount: items.length },
      meta: { source: "remote-sync", dataset: definition.dataset }
    });
  }

  async function getDatasetStatus(datasetName) {
    return indexedDb.getDatasetStatus(datasetName);
  }

  async function queryDataset(datasetName, params) {
    return indexedDb.queryDataset(datasetName, params);
  }

  async function upsertDataset(request) {
    const definition = resolve(request.dataset);
    if (!definition) {
      return createResultEnvelope({
        ok: false,
        error: { code: "DATASET_NOT_FOUND", message: `Unknown dataset '${request.dataset}'` }
      });
    }

    if (!capabilities.getSnapshot().indexedDb || !indexedDb.isAvailable()) {
      return createResultEnvelope({
        ok: false,
        error: { code: "INDEXEDDB_UNAVAILABLE", message: "IndexedDB is unavailable" }
      });
    }

    const items = Array.isArray(request.items) ? request.items : [];
    await indexedDb.upsertDataset(
      definition.dataset,
      items,
      {
        version: request.version || null,
        syncToken: request.syncToken || null,
        installedAt: request.installedAt || new Date().toISOString(),
        syncedAt: request.syncedAt || new Date().toISOString()
      },
      {
        keyPath: definition.storageKeyPath || request.storageKeyPath || "id"
      }
    );

    return createResultEnvelope({
      ok: true,
      data: { dataset: definition.dataset, itemCount: items.length },
      meta: { source: "runtime-upsert", dataset: definition.dataset }
    });
  }

  return {
    installDataset,
    syncDataset,
    upsertDataset,
    getDatasetStatus,
    queryDataset
  };
}
