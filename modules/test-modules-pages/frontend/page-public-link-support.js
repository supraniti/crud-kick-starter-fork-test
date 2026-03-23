import { buildBrowserDeliveryDescriptor } from "../../test-modules-remote-ops/shared/browser-delivery-support.mjs";

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizePath(path) {
  const normalized = normalizeText(path);
  if (!normalized) {
    return "";
  }
  const compact = normalized.replace(/\/+/g, "/");
  if (compact === "/") {
    return "/";
  }
  return compact.startsWith("/") ? compact : `/${compact}`;
}

function shouldUseIndexArtifact(publicOrigin, accessMode) {
  if (normalizeText(accessMode) !== "custom-domain") {
    return true;
  }
  const normalizedOrigin = normalizeText(publicOrigin);
  if (!normalizedOrigin) {
    return false;
  }
  try {
    const originUrl = new URL(normalizedOrigin);
    return (
      originUrl.hostname === "storage.googleapis.com" ||
      originUrl.hostname.endsWith(".storage.googleapis.com")
    );
  } catch {
    return false;
  }
}

export function buildPublicPageUrl(publicOrigin, pathValue, accessMode) {
  const normalizedOrigin = normalizeText(publicOrigin).replace(/\/+$/g, "");
  const normalizedPath = normalizePath(pathValue);
  if (!normalizedOrigin || !normalizedPath) {
    return "";
  }
  if (!shouldUseIndexArtifact(normalizedOrigin, accessMode)) {
    return normalizedPath === "/" ? `${normalizedOrigin}/` : `${normalizedOrigin}${normalizedPath}`;
  }
  if (normalizedPath === "/") {
    return `${normalizedOrigin}/index.html`;
  }
  return `${normalizedOrigin}${normalizedPath}/index.html`;
}

function escapePathTokenSegment(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolvePathTokenValue(tokenName, sourceRecord = {}) {
  if (tokenName === "slug") {
    return escapePathTokenSegment(sourceRecord?.slug ?? "");
  }
  if (tokenName === "id") {
    return escapePathTokenSegment(sourceRecord?.id ?? "");
  }
  return "";
}

export function buildResolvedPagePath(page = {}, sourceRecord = null) {
  if (page?.deploymentMode !== "per-record") {
    return normalizePath(page?.path);
  }

  const pattern = normalizeText(page?.pathPattern) || normalizeText(page?.path);
  if (!pattern) {
    return "";
  }

  return normalizePath(
    pattern.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_, tokenName) =>
      resolvePathTokenValue(tokenName, sourceRecord)
    )
  );
}

export function resolveArtifactRelativePath(pathValue) {
  const normalizedPath = normalizePath(pathValue);
  if (!normalizedPath || normalizedPath === "/") {
    return "index.html";
  }
  return [
    ...normalizedPath.split("/").filter(Boolean),
    "index.html"
  ].join("/");
}

function findTargetById(targets = [], targetId = "") {
  return (Array.isArray(targets) ? targets : []).find((target) => target?.id === targetId) ?? null;
}

function findProductBindingTarget(targets = [], bindingKey = "") {
  return (Array.isArray(targets) ? targets : []).find(
    (target) => target?.productBindingKey === bindingKey
  ) ?? null;
}

function resolveDeliveryTargets({
  page,
  targets,
  fallbackDeploymentTarget = null,
  fallbackBrowserTarget = null,
  fallbackMediaTarget = null
}) {
  const browserTarget =
    findTargetById(targets, normalizeText(page?.remoteBrowserDeliveryTargetProfileId)) ??
    fallbackBrowserTarget ??
    findProductBindingTarget(targets, "browser-delivery");
  const deploymentTarget =
    findTargetById(targets, normalizeText(page?.remoteDeploymentTargetProfileId)) ??
    fallbackDeploymentTarget ??
    findProductBindingTarget(targets, "deployment-storage");
  const mediaTarget =
    findTargetById(targets, normalizeText(browserTarget?.config?.mediaTargetProfileId)) ??
    fallbackMediaTarget ??
    findProductBindingTarget(targets, "media-storage");

  return {
    browserTarget,
    deploymentTarget,
    mediaTarget
  };
}

export function resolvePagePublicOutput({
  page,
  sourceRecord = null,
  targets = [],
  fallbackDeploymentTarget = null,
  fallbackBrowserTarget = null,
  fallbackMediaTarget = null
}) {
  if (!page) {
    return {
      path: "",
      artifactRelativePath: "",
      localArtifactPath: "",
      publicOrigin: "",
      publicUrl: "",
      publicMediaBaseUrl: "",
      deploymentTargetTitle: "",
      browserTargetTitle: ""
    };
  }

  const resolvedPath = buildResolvedPagePath(page, sourceRecord);
  const artifactRelativePath = resolveArtifactRelativePath(
    resolvedPath || normalizeText(page?.path)
  );
  const { browserTarget, deploymentTarget, mediaTarget } = resolveDeliveryTargets({
    page,
    targets,
    fallbackDeploymentTarget,
    fallbackBrowserTarget,
    fallbackMediaTarget
  });
  const deliveryDescriptor = buildBrowserDeliveryDescriptor({
    browserTarget,
    deploymentTarget,
    mediaTarget,
    pagePath: resolvedPath,
    artifactRelativePath
  });

  return {
    path: resolvedPath,
    artifactRelativePath,
    localArtifactPath: artifactRelativePath ? `deployment/${artifactRelativePath}` : "",
    publicOrigin: normalizeText(deliveryDescriptor.publicOrigin),
    publicUrl: buildPublicPageUrl(
      deliveryDescriptor.publicOrigin,
      resolvedPath,
      deliveryDescriptor.accessMode
    ) || normalizeText(deliveryDescriptor.publicUrl),
    publicMediaBaseUrl: normalizeText(deliveryDescriptor.publicMediaBaseUrl),
    deploymentTargetTitle: normalizeText(deploymentTarget?.title),
    browserTargetTitle: normalizeText(browserTarget?.title)
  };
}
