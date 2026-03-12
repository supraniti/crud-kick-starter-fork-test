import { buildRemoteHttpRequest } from "./remote-request-resolver.mjs";

function defaultFetchJson(url, options = {}) {
  return fetch(url, options).then(async (response) => ({
    ok: response.ok,
    status: response.status,
    body: await response.json()
  }));
}

export function createRemoteTransportAdapter(options = {}) {
  const fetchJson = options.fetchJson || defaultFetchJson;
  const baseUrl = options.baseUrl || "http://localhost/";
  const defaultHeaders = options.defaultHeaders || {};

  async function runDeclarativeRemote(remoteDefinition, request, context) {
    const requestDescriptor = buildRemoteHttpRequest(
      baseUrl,
      remoteDefinition,
      request,
      context,
      defaultHeaders
    );
    const response = await fetchJson(requestDescriptor.url, requestDescriptor.init);
    if (!response.ok) {
      throw new Error(
        `[client-runtime] remote request failed with status ${response.status} for ${requestDescriptor.url}`
      );
    }
    return response.body;
  }

  async function query(definition, request, context) {
    if (typeof definition.executeRemote === "function") {
      return definition.executeRemote({ request, context });
    }
    if (definition.remote) {
      return runDeclarativeRemote(definition.remote, request, context);
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
    if (definition.remote) {
      return runDeclarativeRemote(definition.remote, request, context);
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
