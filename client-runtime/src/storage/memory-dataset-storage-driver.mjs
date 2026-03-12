function createMetaRecord(dataset, status) {
  return {
    dataset,
    installed: true,
    recordCount: Number(status.recordCount || 0),
    version: status.version || null,
    syncToken: status.syncToken || null,
    installedAt: status.installedAt || null,
    syncedAt: status.syncedAt || null
  };
}

export function createMemoryDatasetStorageDriver() {
  const records = new Map();
  const metadata = new Map();

  async function replaceDataset(dataset, items, status = {}) {
    records.set(dataset, structuredClone(items));
    metadata.set(dataset, createMetaRecord(dataset, status));
  }

  async function getDatasetRecords(dataset) {
    return structuredClone(records.get(dataset) || []);
  }

  async function getDatasetStatus(dataset) {
    return structuredClone(metadata.get(dataset) || null);
  }

  async function updateDatasetStatus(dataset, patch = {}) {
    const current = metadata.get(dataset) || createMetaRecord(dataset, {});
    metadata.set(dataset, { ...current, ...structuredClone(patch) });
    return getDatasetStatus(dataset);
  }

  return {
    kind: "memory-dataset-storage",
    isAvailable: () => true,
    replaceDataset,
    getDatasetRecords,
    getDatasetStatus,
    updateDatasetStatus
  };
}
