function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createMemoryCacheAdapter() {
  const items = new Map();

  function read(key) {
    const entry = items.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      items.delete(key);
      return null;
    }
    return clone(entry.value);
  }

  function write(key, value, options = {}) {
    items.set(key, {
      value: clone(value),
      expiresAt: options.ttlMs ? Date.now() + options.ttlMs : null
    });
  }

  function remove(key) {
    items.delete(key);
  }

  function clear() {
    items.clear();
  }

  return {
    kind: "memory-cache",
    isAvailable: () => true,
    read,
    write,
    remove,
    clear
  };
}
