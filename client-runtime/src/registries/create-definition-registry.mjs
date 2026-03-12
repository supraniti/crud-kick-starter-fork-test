export function createDefinitionRegistry(definitions = [], keyBuilder) {
  const items = new Map();

  function register(definition) {
    const key = keyBuilder(definition);
    if (!key) {
      throw new Error("[client-runtime] definition key is required");
    }
    items.set(key, Object.freeze({ ...definition }));
    return items.get(key);
  }

  function get(key) {
    return items.get(key) || null;
  }

  function list() {
    return Array.from(items.values());
  }

  definitions.forEach(register);

  return {
    register,
    get,
    list
  };
}
