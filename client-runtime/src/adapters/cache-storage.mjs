function buildCacheUrl(namespace, key) {
  const normalizedNamespace = encodeURIComponent(String(namespace ?? "crud-client-runtime"));
  const normalizedKey = encodeURIComponent(String(key ?? ""));
  return `https://crud-client-runtime.local/cache/${normalizedNamespace}/${normalizedKey}`;
}

function buildCacheRequest(namespace, key, globalObject) {
  const requestCtor = globalObject?.Request || Request;
  return new requestCtor(buildCacheUrl(namespace, key), { method: "GET" });
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
    const namespacedKey = buildCacheUrl(namespace, key);
    if (!cache) {
      return memoryFallback.has(namespacedKey) ? structuredClone(memoryFallback.get(namespacedKey)) : null;
    }
    const match = await cache.match(buildCacheRequest(namespace, key, globalObject));
    if (!match) {
      return null;
    }
    return match.json();
  }

  async function write(key, value) {
    const cache = await getCache();
    const namespacedKey = buildCacheUrl(namespace, key);
    if (!cache) {
      memoryFallback.set(namespacedKey, structuredClone(value));
      return;
    }
    await cache.put(
      buildCacheRequest(namespace, key, globalObject),
      new Response(JSON.stringify(value), {
        headers: { "content-type": "application/json" }
      })
    );
  }

  async function remove(key) {
    const cache = await getCache();
    const namespacedKey = buildCacheUrl(namespace, key);
    if (!cache) {
      memoryFallback.delete(namespacedKey);
      return;
    }
    await cache.delete(buildCacheRequest(namespace, key, globalObject));
  }

  return {
    kind: "cache-storage",
    isAvailable: () => typeof globalObject?.caches !== "undefined",
    read,
    write,
    remove
  };
}
