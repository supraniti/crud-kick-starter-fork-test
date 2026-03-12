export function normalizeQueryRequest(request = {}) {
  return {
    resource: String(request.resource || "").trim(),
    query: String(request.query || "").trim(),
    params: request.params || {},
    policy: request.policy || null
  };
}

export function normalizeActionRequest(request = {}) {
  return {
    action: String(request.action || "").trim(),
    payload: request.payload || {},
    policy: request.policy || null
  };
}

export function normalizeDatasetRequest(request = {}) {
  return {
    dataset: String(request.dataset || "").trim(),
    params: request.params || {}
  };
}

export function buildQueryKey(request) {
  return `${request.resource}.${request.query}:${JSON.stringify(request.params || {})}`;
}
