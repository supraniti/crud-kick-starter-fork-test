const DB_NAME = "crud-client-runtime";
const DB_VERSION = 1;
const RECORD_STORE = "records";
const META_STORE = "meta";

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexeddb request failed"));
  });
}

function openDatabase(indexedDbFactory) {
  return new Promise((resolve, reject) => {
    const request = indexedDbFactory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORD_STORE)) {
        const records = database.createObjectStore(RECORD_STORE, { keyPath: "recordKey" });
        records.createIndex("dataset", "dataset", { unique: false });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "dataset" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexeddb open failed"));
  });
}

async function withStore(indexedDbFactory, storeName, mode, callback) {
  const database = await openDatabase(indexedDbFactory);
  const transaction = database.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const result = await callback(store);
  await new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("indexeddb transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("indexeddb transaction aborted"));
  });
  database.close();
  return result;
}

export function createBrowserIndexedDbStorageDriver(options = {}) {
  const indexedDbFactory = options.indexedDbFactory || globalThis.indexedDB;

  async function replaceDataset(dataset, items, status = {}) {
    if (!indexedDbFactory) {
      throw new Error("indexeddb unavailable");
    }

    await withStore(indexedDbFactory, RECORD_STORE, "readwrite", async (store) => {
      const existing = await requestToPromise(store.index("dataset").getAll(dataset));
      existing.forEach((entry) => store.delete(entry.recordKey));
      items.forEach((item, index) => {
        store.put({
          recordKey: `${dataset}:${String(item.id ?? index)}`,
          dataset,
          data: structuredClone(item)
        });
      });
    });

    await withStore(indexedDbFactory, META_STORE, "readwrite", async (store) => {
      store.put({
        dataset,
        installed: true,
        recordCount: items.length,
        version: status.version || null,
        syncToken: status.syncToken || null,
        installedAt: status.installedAt || new Date().toISOString(),
        syncedAt: status.syncedAt || new Date().toISOString()
      });
    });
  }

  async function getDatasetRecords(dataset) {
    if (!indexedDbFactory) {
      return [];
    }
    const rows = await withStore(indexedDbFactory, RECORD_STORE, "readonly", (store) =>
      requestToPromise(store.index("dataset").getAll(dataset))
    );
    return rows.map((row) => structuredClone(row.data));
  }

  async function getDatasetStatus(dataset) {
    if (!indexedDbFactory) {
      return null;
    }
    return withStore(indexedDbFactory, META_STORE, "readonly", (store) =>
      requestToPromise(store.get(dataset))
    );
  }

  async function updateDatasetStatus(dataset, patch = {}) {
    const current = (await getDatasetStatus(dataset)) || { dataset };
    const next = { ...current, ...structuredClone(patch) };
    await withStore(indexedDbFactory, META_STORE, "readwrite", async (store) => {
      store.put(next);
    });
    return next;
  }

  return {
    kind: "browser-indexeddb-storage",
    isAvailable: () => typeof indexedDbFactory !== "undefined",
    replaceDataset,
    getDatasetRecords,
    getDatasetStatus,
    updateDatasetStatus
  };
}
