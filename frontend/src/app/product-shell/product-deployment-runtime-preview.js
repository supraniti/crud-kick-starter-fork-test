function normalizeText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatQueryLabel(definition = {}) {
  return `${definition.resource ?? "resource"}.${definition.query ?? "query"}`;
}

function formatActionLabel(definition = {}) {
  return definition.action ?? "action";
}

function formatDatasetLabel(definition = {}) {
  return definition.dataset ?? "dataset";
}

function formatSlotLabel(definition = {}) {
  return `${definition.bindAs ?? "slot"} • ${definition.sourceType ?? "none"} • ${definition.recordMode ?? "single-item"}`;
}

function createEmptyPreview() {
  return {
    runtimeAssetUrl: "",
    runtimeRemoteBaseUrl: "",
    previewSourceLabel: "",
    bootstrapDatasets: [],
    queries: [],
    actions: [],
    datasets: [],
    slots: [],
    mediaUrls: [],
    rawRuntimeJson: ""
  };
}

function resolvePreviewSourceLabel(previewSource) {
  return (
    normalizeText(previewSource?.label)
    || normalizeText(previewSource?.title)
    || normalizeText(previewSource?.name)
    || normalizeText(previewSource?.path)
    || normalizeText(previewSource?.id)
  );
}

export function createDeploymentRuntimePreview({ payload, previewSource }) {
  const runtime = payload?.runtime?.clientRuntime;
  if (!runtime || typeof runtime !== "object") {
    return createEmptyPreview();
  }

  return {
    runtimeAssetUrl: normalizeText(runtime.assetUrl),
    runtimeRemoteBaseUrl: normalizeText(runtime.remote?.baseUrl),
    previewSourceLabel: resolvePreviewSourceLabel(previewSource),
    bootstrapDatasets: toArray(runtime.bootstrapDatasets),
    queries: toArray(runtime.queries).map(formatQueryLabel),
    actions: toArray(runtime.actions).map(formatActionLabel),
    datasets: toArray(runtime.datasets).map(formatDatasetLabel),
    slots: toArray(runtime.slots).map(formatSlotLabel),
    mediaUrls: toArray(payload?.media?.items)
      .map((item) => normalizeText(item?.preferredUrl) || normalizeText(item?.publicUrl) || normalizeText(item?.temporaryUrl))
      .filter(Boolean),
    rawRuntimeJson: JSON.stringify(runtime, null, 2)
  };
}
