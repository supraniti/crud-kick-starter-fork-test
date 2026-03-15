import { buildRemoteHttpRequest } from "./remote-request-resolver.mjs";

function defaultFetchJson(url, options = {}, fetchImpl = fetch) {
  return fetchImpl(url, options).then(async (response) => ({
    ok: response.ok,
    status: response.status,
    body: await response.json()
  }));
}

function readPathValue(source, pathExpression = "") {
  const path = String(pathExpression || "")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return path.reduce(
    (current, segment) =>
      current && typeof current === "object" ? current[segment] : undefined,
    source
  );
}

function resolveResponseBody(body, remoteDefinition = {}) {
  const responsePath =
    typeof remoteDefinition.responsePath === "string" ? remoteDefinition.responsePath.trim() : "";
  return responsePath ? readPathValue(body, responsePath) : body;
}

function normalizeDatasetRemoteResult(definition, body, remoteDefinition) {
  const resolvedBody = resolveResponseBody(body, remoteDefinition);
  const valuePath =
    typeof definition.remoteValuePath === "string" && definition.remoteValuePath.trim().length > 0
      ? definition.remoteValuePath
      : definition.valuePath;
  const versionPath =
    typeof definition.remoteVersionPath === "string" && definition.remoteVersionPath.trim().length > 0
      ? definition.remoteVersionPath
      : definition.versionPath;
  const syncTokenPath =
    typeof definition.remoteSyncTokenPath === "string" &&
    definition.remoteSyncTokenPath.trim().length > 0
      ? definition.remoteSyncTokenPath
      : definition.syncTokenPath;
  const sourceValue =
    typeof valuePath === "string" && valuePath.trim().length > 0
      ? readPathValue(body, valuePath)
      : resolvedBody;
  const items =
    definition.recordMode === "array"
      ? (Array.isArray(sourceValue) ? sourceValue : [])
      : sourceValue === undefined || sourceValue === null
        ? []
        : [sourceValue];
  return {
    items,
    version: (versionPath ? readPathValue(body, versionPath) : undefined) ?? null,
    syncToken: (syncTokenPath ? readPathValue(body, syncTokenPath) : undefined) ?? null
  };
}

export function createRemoteTransportAdapter(options = {}) {
  const fetchImpl = options.fetchImpl || options.globalObject?.fetch || fetch;
  const fetchJson =
    options.fetchJson || ((url, requestInit) => defaultFetchJson(url, requestInit, fetchImpl));
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
    return resolveResponseBody(response.body, remoteDefinition);
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
    const remoteDefinition =
      mode === "sync"
        ? definition.remoteSync || definition.remote
        : definition.remoteInstall || definition.remote;
    if (remoteDefinition) {
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
      return normalizeDatasetRemoteResult(definition, response.body, remoteDefinition);
    }
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
