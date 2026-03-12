export function createCapabilityMonitor(options = {}) {
  const globalObject = options.globalObject || globalThis;

  function getSnapshot() {
    return {
      online:
        typeof options.online === "boolean"
          ? options.online
          : globalObject?.navigator?.onLine ?? true,
      memory: true,
      cacheStorage: typeof globalObject?.caches !== "undefined",
      indexedDb: typeof globalObject?.indexedDB !== "undefined"
    };
  }

  return {
    getSnapshot
  };
}
