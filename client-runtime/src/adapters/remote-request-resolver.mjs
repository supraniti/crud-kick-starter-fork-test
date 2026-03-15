function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPathValue(source, path) {
  if (!path || path === ".") {
    return source;
  }

  return String(path)
    .split(".")
    .filter(Boolean)
    .reduce((accumulator, segment) => accumulator?.[segment], source);
}

function resolveTemplateValue(mapping, request, context) {
  const requestContext = context?.context && typeof context.context === "object"
    ? context.context
    : context;
  const templateScope = {
    request,
    context: requestContext,
    runtime: context,
    params: request.params,
    payload: request.payload
  };
  const isPathExpression =
    typeof mapping === "string" &&
    /^(request|context|runtime|params|payload)(\.|$)/.test(mapping);
  if (typeof mapping === "string") {
    return isPathExpression ? getPathValue(templateScope, mapping) : mapping;
  }
  if (Array.isArray(mapping)) {
    return mapping.map((entry) => resolveTemplateValue(entry, request, context));
  }
  if (isObject(mapping)) {
    return Object.entries(mapping).reduce((accumulator, [key, value]) => {
      accumulator[key] = resolveTemplateValue(value, request, context);
      return accumulator;
    }, {});
  }
  return mapping;
}

function encodePath(template, pathParams, request, context) {
  return Object.entries(pathParams || {}).reduce((currentPath, [key, value]) => {
    const resolved = resolveTemplateValue(value, request, context);
    return currentPath.replace(`:${key}`, encodeURIComponent(String(resolved ?? "")));
  }, template);
}

function buildQueryString(queryParams, request, context) {
  if (!queryParams) {
    return "";
  }

  const resolved =
    queryParams === "params"
      ? request.params || {}
      : resolveTemplateValue(queryParams, request, context);

  const search = new URLSearchParams();
  Object.entries(resolved || {}).forEach(([key, value]) => {
    if (value == null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, String(entry)));
      return;
    }
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

function buildRequestInit(remoteDefinition, request, context, defaultHeaders) {
  const method = String(remoteDefinition.method || "GET").toUpperCase();
  const bodyTemplate = remoteDefinition.body;
  const bodyPayload =
    bodyTemplate === undefined
      ? null
      : bodyTemplate === "params"
        ? request.params
        : bodyTemplate === "payload"
          ? request.payload
          : resolveTemplateValue(bodyTemplate, request, context);

  const headers = {
    ...defaultHeaders,
    ...(remoteDefinition.headers || {})
  };

  if (bodyPayload !== null && method !== "GET") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  return {
    method,
    headers,
    body: bodyPayload !== null && method !== "GET" ? JSON.stringify(bodyPayload) : undefined
  };
}

export function buildRemoteHttpRequest(baseUrl, remoteDefinition, request, context, defaultHeaders = {}) {
  const path = encodePath(remoteDefinition.path || "/", remoteDefinition.pathParams, request, context);
  const query = buildQueryString(remoteDefinition.queryParams, request, context);
  const url = new URL(`${path}${query}`, baseUrl).toString();
  return {
    url,
    init: buildRequestInit(remoteDefinition, request, context, defaultHeaders)
  };
}
