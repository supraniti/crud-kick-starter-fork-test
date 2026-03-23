import { createBrowserIndexedDbStorageDriver } from "../storage/browser-indexeddb-storage-driver.mjs";
import { runLocalStructuredQuery } from "../query/local-query-engine.mjs";

export function createIndexedDbAdapter(options = {}) {
  const storage =
    options.storage ||
    createBrowserIndexedDbStorageDriver({
      indexedDbFactory: options.indexedDbFactory,
      globalObject: options.globalObject
    });

  async function replaceDataset(dataset, items, status = {}) {
    return storage.replaceDataset(dataset, items, status);
  }

  async function upsertDataset(dataset, items, status = {}, options = {}) {
    if (typeof storage.upsertDataset === "function") {
      return storage.upsertDataset(dataset, items, status, options);
    }
    return storage.replaceDataset(dataset, items, status);
  }

  async function queryDataset(dataset, params = {}) {
    const records = await storage.getDatasetRecords(dataset);
    return runLocalStructuredQuery(records, params);
  }

  async function getDatasetStatus(dataset) {
    return storage.getDatasetStatus(dataset);
  }

  async function updateDatasetStatus(dataset, patch = {}) {
    return storage.updateDatasetStatus(dataset, patch);
  }

  return {
    kind: "indexeddb",
    isAvailable: () => storage.isAvailable(),
    replaceDataset,
    upsertDataset,
    queryDataset,
    getDatasetStatus,
    updateDatasetStatus
  };
}
