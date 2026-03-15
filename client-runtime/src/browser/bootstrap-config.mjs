function readPathValue(value, pathExpression = "") {
  const path = String(pathExpression || "")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return path.reduce(
    (current, segment) =>
      current && typeof current === "object" ? current[segment] : undefined,
    value
  );
}

function readInlineJsonScript(globalObject, scriptId) {
  const documentObject = globalObject?.document;
  const script = documentObject?.getElementById(scriptId);
  if (!script) {
    throw new Error(`[client-runtime] inline JSON script '${scriptId}' was not found`);
  }
  const text = typeof script.textContent === "string" ? script.textContent : "";
  return JSON.parse(text || "null");
}

function createInlineDatasetFetcher(definition, globalObject) {
  return async function fetchInlineDataset() {
    const rawValue = readInlineJsonScript(globalObject, definition.inlineScriptId);
    const sourceValue = definition.valuePath
      ? readPathValue(rawValue, definition.valuePath)
      : rawValue;
    const items = definition.recordMode === "array"
      ? (Array.isArray(sourceValue) ? sourceValue : [])
      : sourceValue === undefined || sourceValue === null
        ? []
        : [sourceValue];

    return {
      items,
      version:
        (definition.versionPath ? readPathValue(rawValue, definition.versionPath) : undefined) ??
        null,
      syncToken:
        (definition.syncTokenPath ? readPathValue(rawValue, definition.syncTokenPath) : undefined) ??
        null
    };
  };
}

function normalizeDatasetDefinition(definition, globalObject) {
  if (definition?.bootstrapMode !== "inline-json-script") {
    return definition;
  }
  const fetchInlineDataset = createInlineDatasetFetcher(definition, globalObject);
  return {
    ...definition,
    fetchInstall: definition.fetchInstall || fetchInlineDataset,
    fetchSync: definition.fetchSync || fetchInlineDataset
  };
}

export function normalizeGlobalRuntimeOptions(options = {}, globalObject = globalThis) {
  return {
    ...options,
    datasets: Array.isArray(options.datasets)
      ? options.datasets.map((definition) => normalizeDatasetDefinition(definition, globalObject))
      : []
  };
}

export async function bootstrapConfiguredDatasets(runtime, options = {}) {
  const bootstrapDatasets = Array.isArray(options.bootstrapDatasets) ? options.bootstrapDatasets : [];
  for (const dataset of bootstrapDatasets) {
    await runtime.installDataset({ dataset });
  }
}
