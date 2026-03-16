function normalizeText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function resolveRuntimePayload(runtimePreviewState) {
  return runtimePreviewState?.payload && typeof runtimePreviewState.payload === "object"
    ? runtimePreviewState.payload
    : null;
}

function resolveRuntimeDelivery(runtimePreviewState) {
  const payload = resolveRuntimePayload(runtimePreviewState);
  return payload?.delivery && typeof payload.delivery === "object" ? payload.delivery : null;
}

function resolveRuntimePage(runtimePreviewState) {
  const payload = resolveRuntimePayload(runtimePreviewState);
  return payload?.page && typeof payload.page === "object" ? payload.page : null;
}

function resolveLocalArtifactPath(selectedPage, runtimePreviewState) {
  const explicitArtifactPath = normalizeText(selectedPage?.deploymentArtifactPath);
  if (explicitArtifactPath) {
    return `deployment/${explicitArtifactPath}`;
  }

  const resolvedPath = normalizeText(resolveRuntimePage(runtimePreviewState)?.path);
  if (!resolvedPath) {
    return "Not deployed yet";
  }

  const normalizedRelativePath = resolvedPath.replace(/^\/+/, "");
  if (!normalizedRelativePath) {
    return "deployment/index.html";
  }
  return `deployment/${normalizedRelativePath}/index.html`;
}

function resolvePublicOrigin(bundleForecast, runtimePreviewState) {
  const delivery = resolveRuntimeDelivery(runtimePreviewState);
  return (
    normalizeText(delivery?.publicOrigin) ||
    normalizeText(delivery?.temporaryDeploymentBaseUrl) ||
    normalizeText(bundleForecast?.publicOrigin) ||
    "Not resolved yet"
  );
}

function resolvePublicUrl(bundleForecast, runtimePreviewState) {
  const delivery = resolveRuntimeDelivery(runtimePreviewState);
  return normalizeText(delivery?.publicUrl) || normalizeText(bundleForecast?.publicUrl) || "Not resolved yet";
}

function resolvePublicMediaBaseUrl(bundleForecast, runtimePreviewState) {
  const delivery = resolveRuntimeDelivery(runtimePreviewState);
  return (
    normalizeText(delivery?.publicMediaBaseUrl) ||
    normalizeText(delivery?.temporaryMediaBaseUrl) ||
    normalizeText(bundleForecast?.publicMediaBaseUrl) ||
    "Not resolved yet"
  );
}

function resolvePathLabel(bundleForecast, runtimePreviewState) {
  return normalizeText(resolveRuntimePage(runtimePreviewState)?.path) || bundleForecast?.pathLabel || "Not configured";
}

export function resolveDeploymentBrowseState({ selectedPage = null, bundleForecast = null, runtimePreviewState = null }) {
  return {
    localArtifactPath: resolveLocalArtifactPath(selectedPage, runtimePreviewState),
    publicOrigin: resolvePublicOrigin(bundleForecast, runtimePreviewState),
    publicUrl: resolvePublicUrl(bundleForecast, runtimePreviewState),
    publicMediaBaseUrl: resolvePublicMediaBaseUrl(bundleForecast, runtimePreviewState),
    pathLabel: resolvePathLabel(bundleForecast, runtimePreviewState)
  };
}
