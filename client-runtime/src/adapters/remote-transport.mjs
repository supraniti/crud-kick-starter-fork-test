import { buildRemoteHttpRequest } from "./remote-request-resolver.mjs";

function defaultFetchJson(url, options = {}, fetchImpl = fetch) {
  return fetchImpl(url, options).then(async (response) => ({
    ok: response.ok,
    status: response.status,
    body: await response.json()
  }));
}

function buildRemoteFailureMessage(status, url, body) {
  const remoteMessage =
    body && typeof body === "object" && typeof body.error?.message === "string"
      ? body.error.message
      : body && typeof body === "object" && typeof body.message === "string"
        ? body.message
        : "";
  return remoteMessage
    ? `[client-runtime] remote request failed with status ${status} for ${url}: ${remoteMessage}`
    : `[client-runtime] remote request failed with status ${status} for ${url}`;
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

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if ("nullValue" in value) {
    return null;
  }
  if ("booleanValue" in value) {
    return Boolean(value.booleanValue);
  }
  if ("integerValue" in value) {
    return Number.parseInt(value.integerValue, 10);
  }
  if ("doubleValue" in value) {
    return Number(value.doubleValue);
  }
  if ("stringValue" in value) {
    return String(value.stringValue);
  }
  if ("timestampValue" in value) {
    return String(value.timestampValue);
  }
  if ("arrayValue" in value) {
    const values = Array.isArray(value.arrayValue?.values) ? value.arrayValue.values : [];
    return values.map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    const fields = value.mapValue?.fields ?? {};
    return Object.entries(fields).reduce((result, [key, fieldValue]) => {
      result[key] = decodeFirestoreValue(fieldValue);
      return result;
    }, {});
  }
  return null;
}

function decodeFirestoreDocument(document = {}) {
  const decoded = decodeFirestoreValue({
    mapValue: {
      fields: document?.fields ?? {}
    }
  }) ?? {};
  if (typeof decoded !== "object" || Array.isArray(decoded)) {
    return decoded;
  }
  const name = typeof document?.name === "string" ? document.name : "";
  const documentId = name ? name.split("/").at(-1) ?? null : null;
  return {
    ...decoded,
    ...(documentId && !("id" in decoded) ? { id: documentId } : {}),
    __firestoreDocumentName: name || null,
    __firestoreCreateTime: document?.createTime ?? null,
    __firestoreUpdateTime: document?.updateTime ?? null
  };
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

function normalizeQueryRemoteResult(definition, body, remoteDefinition) {
  const remoteResult =
    definition?.remoteResult && typeof definition.remoteResult === "object"
      ? definition.remoteResult
      : null;
  if (!remoteResult) {
    return resolveResponseBody(body, remoteDefinition);
  }

  const resolvedBody = resolveResponseBody(body, remoteDefinition);
  const resultType = typeof remoteResult.type === "string" ? remoteResult.type.trim() : "";
  if (resultType === "firestore-document") {
    return decodeFirestoreDocument(resolvedBody);
  }
  if (resultType !== "collection") {
    return resolvedBody;
  }

  const itemsSource =
    typeof remoteResult.itemsPath === "string" && remoteResult.itemsPath.trim().length > 0
      ? readPathValue(resolvedBody, remoteResult.itemsPath)
      : resolvedBody;
  const items = Array.isArray(itemsSource) ? itemsSource : [];
  const total =
    (typeof remoteResult.totalPath === "string" && remoteResult.totalPath.trim().length > 0
      ? readPathValue(resolvedBody, remoteResult.totalPath)
      : undefined) ?? items.length;

  return {
    items,
    total: Number.isFinite(Number(total)) ? Number(total) : items.length
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
      throw new Error(buildRemoteFailureMessage(response.status, requestDescriptor.url, response.body));
    }
    return response.body;
  }

  async function query(definition, request, context) {
    if (typeof definition.executeRemote === "function") {
      return definition.executeRemote({ request, context });
    }
    if (definition.remote) {
      const responseBody = await runDeclarativeRemote(definition.remote, request, context);
      return normalizeQueryRemoteResult(definition, responseBody, definition.remote);
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
      const responseBody = await runDeclarativeRemote(definition.remote, request, context);
      return resolveResponseBody(responseBody, definition.remote);
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
        throw new Error(buildRemoteFailureMessage(response.status, requestDescriptor.url, response.body));
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
