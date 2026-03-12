function buildCacheKey(namespace, key) {
  return `${namespace}:${key}`;
}

export function createCacheStorageAdapter(options = {}) {
  const globalObject = options.globalObject || globalThis;
  const namespace = options.namespace || "crud-client-runtime";
  const memoryFallback = new Map();

  async function getCache() {
    if (!globalObject?.caches) {
      return null;
    }
    return globalObject.caches.open(namespace);
  }

  async function read(key) {
    const cache = await getCache();
    const namespacedKey = buildCacheKey(namespace, key);
    if (!cache) {
      return memoryFallback.has(namespacedKey) ? structuredClone(memoryFallback.get(namespacedKey)) : null;
    }
    const match = await cache.match(namespacedKey);
    if (!match) {
      return null;
    }
    return match.json();
  }

  async function write(key, value) {
    const cache = await getCache();
    const namespacedKey = buildCacheKey(namespace, key);
    if (!cache) {
      memoryFallback.set(namespacedKey, structuredClone(value));
      return;
    }
    await cache.put(
      namespacedKey,
      new Response(JSON.stringify(value), {
        headers: { "content-type": "application/json" }
      })
    );
  }

  async function remove(key) {
    const cache = await getCache();
    const namespacedKey = buildCacheKey(namespace, key);
    if (!cache) {
      memoryFallback.delete(namespacedKey);
      return;
    }
    await cache.delete(namespacedKey);
  }

  return {
    kind: "cache-storage",
    isAvailable: () => typeof globalObject?.caches !== "undefined",
    read,
    write,
    remove
  };
}
