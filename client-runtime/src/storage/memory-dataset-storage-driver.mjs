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

function readPathValue(source, pathExpression = "") {
  const path = String(pathExpression || "")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return path.reduce(
    (current, segment) =>
      current && typeof current === "object" ? current[segment] : undefined,
    source
  );
}

function resolveStorageKey(dataset, item, index, keyPath = "id") {
  const resolvedKey = readPathValue(item, keyPath);
  return `${dataset}:${String(resolvedKey ?? index)}`;
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

  async function upsertDataset(dataset, items, status = {}, options = {}) {
    const currentRecords = structuredClone(records.get(dataset) || []);
    const currentByKey = new Map(
      currentRecords.map((item, index) => [
        resolveStorageKey(dataset, item, index, options.keyPath),
        item
      ])
    );

    structuredClone(items || []).forEach((item, index) => {
      currentByKey.set(resolveStorageKey(dataset, item, index, options.keyPath), item);
    });

    const mergedRecords = [...currentByKey.values()];
    records.set(dataset, mergedRecords);
    const currentStatus = metadata.get(dataset) || createMetaRecord(dataset, {});
    metadata.set(dataset, {
      ...currentStatus,
      ...structuredClone(status),
      dataset,
      installed: true,
      recordCount: mergedRecords.length
    });
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
    upsertDataset,
    getDatasetRecords,
    getDatasetStatus,
    updateDatasetStatus
  };
}
