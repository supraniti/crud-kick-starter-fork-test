import { createClientRuntime } from "../runtime/create-client-runtime.mjs";

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
  const runtime = createClientRuntime({ ...options, globalObject });
  attachRuntime(runtime, globalObject);
  globalObject.crudClientRuntime = {
    configure(nextOptions = {}) {
      return installGlobalRuntime(nextOptions, globalObject);
    },
    getRuntime() {
      return runtime;
    }
  };
  return runtime;
}

if (typeof window !== "undefined") {
  installGlobalRuntime(window.__CRUD_CLIENT_RUNTIME_CONFIG__ || {}, window);
}
