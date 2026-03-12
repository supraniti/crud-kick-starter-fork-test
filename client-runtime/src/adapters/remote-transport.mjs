function defaultFetchJson(url, options = {}) {
  return fetch(url, options).then(async (response) => ({
    ok: response.ok,
    status: response.status,
    body: await response.json()
  }));
}

export function createRemoteTransportAdapter(options = {}) {
  const fetchJson = options.fetchJson || defaultFetchJson;

  async function query(definition, request, context) {
    if (typeof definition.executeRemote === "function") {
      return definition.executeRemote({ request, context });
    }
    if (typeof options.query === "function") {
      return options.query({ definition, request, context, fetchJson });
    }
    throw new Error(`[client-runtime] missing remote query handler for ${definition.resource}.${definition.query}`);
  }

  async function dispatch(definition, request, context) {
    if (typeof definition.executeRemote === "function") {
      return definition.executeRemote({ request, context });
    }
    if (typeof options.dispatch === "function") {
      return options.dispatch({ definition, request, context, fetchJson });
    }
    throw new Error(`[client-runtime] missing remote action handler for ${definition.action}`);
  }

  async function fetchDataset(definition, request, context, mode) {
    if (mode === "sync" && typeof definition.fetchSync === "function") {
      return definition.fetchSync({ request, context });
    }
    if (typeof definition.fetchInstall === "function") {
      return definition.fetchInstall({ request, context, mode });
    }
    if (typeof options.fetchDataset === "function") {
      return options.fetchDataset({ definition, request, context, mode, fetchJson });
    }
    throw new Error(`[client-runtime] missing remote dataset handler for ${definition.dataset}`);
  }

  return {
    kind: "remote-transport",
    isAvailable: () => true,
    query,
    dispatch,
    fetchDataset
  };
}
