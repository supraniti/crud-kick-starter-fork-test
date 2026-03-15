import { createClientRuntime } from "../runtime/create-client-runtime.mjs";
import {
  bootstrapConfiguredDatasets,
  normalizeGlobalRuntimeOptions
} from "./bootstrap-config.mjs";

function attachRuntime(runtime, globalObject) {
  globalObject.dataLayer = {
    query: (request) => runtime.query(request),
    installDataset: (request) => runtime.installDataset(request),
    syncDataset: (request) => runtime.syncDataset(request),
    getDatasetStatus: (dataset) => runtime.getDatasetStatus(dataset)
  };

  globalObject.actionLayer = {
    dispatch: (request) => runtime.dispatch(request)
  };
}

export function installGlobalRuntime(options = {}, globalObject = globalThis) {
  const normalizedOptions = normalizeGlobalRuntimeOptions(options, globalObject);
  const runtime = createClientRuntime({ ...normalizedOptions, globalObject });
  attachRuntime(runtime, globalObject);
  const ready = bootstrapConfiguredDatasets(runtime, normalizedOptions).catch((error) => {
    globalObject.console?.error?.(error);
    throw error;
  });
  globalObject.crudClientRuntime = {
    configure(nextOptions = {}) {
      return installGlobalRuntime(nextOptions, globalObject);
    },
    getRuntime() {
      return runtime;
    },
    ready
  };
  return runtime;
}

if (typeof window !== "undefined") {
  installGlobalRuntime(window.__CRUD_CLIENT_RUNTIME_CONFIG__ || {}, window);
}
