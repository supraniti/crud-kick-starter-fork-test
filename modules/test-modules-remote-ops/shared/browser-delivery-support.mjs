export const BROWSER_DELIVERY_ACCESS_MODE_SET = new Set([
  "gcp-temporary",
  "custom-domain"
]);

export const BROWSER_DELIVERY_DNS_MODE_SET = new Set([
  "external",
  "gcp-managed"
]);

function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEnum(value, allowedValues, fallback) {
  const normalized = normalizeText(value)?.toLowerCase() ?? "";
  return allowedValues.has(normalized) ? normalized : fallback;
}

function trimSlashes(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.replace(/^\/+|\/+$/g, "") : null;
}

function encodeUrlPathSegment(value) {
  return encodeURIComponent(String(value ?? ""));
}

function encodeRelativePath(relativePath) {
  return String(relativePath ?? "")
    .split("/")
    .filter(Boolean)
    .map(encodeUrlPathSegment)
    .join("/");
}

export function normalizeBrowserDeliveryAccessMode(value, fallback = "gcp-temporary") {
  return normalizeEnum(value, BROWSER_DELIVERY_ACCESS_MODE_SET, fallback);
}

export function normalizeBrowserDeliveryDnsMode(value, fallback = "external") {
  return normalizeEnum(value, BROWSER_DELIVERY_DNS_MODE_SET, fallback);
}

export function normalizeBrowserDeliveryConfig(value = {}) {
  const config = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    accessMode: normalizeBrowserDeliveryAccessMode(config.accessMode),
    dnsMode: normalizeBrowserDeliveryDnsMode(config.dnsMode),
    hostname: normalizeText(config.hostname),
    dnsZone: normalizeText(config.dnsZone),
    certificateName: normalizeText(config.certificateName),
    urlMapHint: normalizeText(config.urlMapHint),
    deploymentTargetProfileId: normalizeText(config.deploymentTargetProfileId),
    mediaTargetProfileId: normalizeText(config.mediaTargetProfileId)
  };
}

export function buildTemporaryStorageBaseUrl(bucketName, prefix = null) {
  const normalizedBucketName = normalizeText(bucketName);
  if (!normalizedBucketName) {
    return null;
  }
  const encodedPrefix = trimSlashes(prefix);
  return encodedPrefix
    ? `https://storage.googleapis.com/${encodeUrlPathSegment(normalizedBucketName)}/${encodeRelativePath(encodedPrefix)}`
    : `https://storage.googleapis.com/${encodeUrlPathSegment(normalizedBucketName)}`;
}

export function buildTemporaryArtifactUrl(bucketName, prefix = null, artifactRelativePath = null) {
  const baseUrl = buildTemporaryStorageBaseUrl(bucketName, prefix);
  const normalizedArtifactPath = trimSlashes(artifactRelativePath);
  if (!baseUrl || !normalizedArtifactPath) {
    return baseUrl;
  }
  return `${baseUrl}/${encodeRelativePath(normalizedArtifactPath)}`;
}

export function resolveBrowserDeliveryScheme(config = {}) {
  return config.certificateName || config.urlMapHint ? "https" : "http";
}

export function buildCustomDomainOrigin(config = {}) {
  const normalizedConfig = normalizeBrowserDeliveryConfig(config);
  if (!normalizedConfig.hostname) {
    return null;
  }
  return `${resolveBrowserDeliveryScheme(normalizedConfig)}://${normalizedConfig.hostname}`;
}

export function buildCustomDomainDnsInstruction(config = {}) {
  const normalizedConfig = normalizeBrowserDeliveryConfig(config);
  if (!normalizedConfig.hostname) {
    return null;
  }

  return {
    dnsMode: normalizedConfig.dnsMode,
    recordType: "CNAME",
    recordName: normalizedConfig.hostname,
    recordValue: "c.storage.googleapis.com.",
    notes: [
      "This direct-storage path expects the deployment bucket name to match the hostname.",
      "Root/apex domains usually cannot use CNAME directly; use a subdomain or a provider-specific ALIAS/ANAME feature.",
      "Without a separate HTTPS delivery stack, this path should be treated as HTTP-oriented."
    ]
  };
}

function createBaseDescriptor(browserConfig, deploymentTarget, mediaTarget) {
  return {
    accessMode: browserConfig.accessMode,
    dnsMode: browserConfig.dnsMode,
    hostname: browserConfig.hostname,
    publicOrigin: null,
    publicUrl: null,
    temporaryDeploymentBaseUrl: buildTemporaryStorageBaseUrl(
      deploymentTarget?.config?.bucketName,
      deploymentTarget?.config?.prefix
    ),
    temporaryMediaBaseUrl: buildTemporaryStorageBaseUrl(
      mediaTarget?.config?.bucketName,
      mediaTarget?.config?.prefix
    ),
    dnsInstruction: null,
    warnings: [],
    notes: []
  };
}

function applyCustomDomainDescriptor(descriptor, browserConfig, deploymentTarget, pagePath) {
  descriptor.publicOrigin = buildCustomDomainOrigin(browserConfig);
  descriptor.dnsInstruction = buildCustomDomainDnsInstruction(browserConfig);
  if (!browserConfig.hostname) {
    descriptor.warnings.push("Custom domain mode requires a hostname.");
  }
  if (!deploymentTarget) {
    descriptor.warnings.push("Custom domain mode requires a linked deployment storage target.");
  } else {
    const deploymentBucketName = normalizeText(deploymentTarget?.config?.bucketName);
    const deploymentPrefix = trimSlashes(deploymentTarget?.config?.prefix);
    if (!deploymentBucketName) {
      descriptor.warnings.push("The linked deployment target does not define a bucket.");
    }
    if (deploymentBucketName && browserConfig.hostname && deploymentBucketName !== browserConfig.hostname) {
      descriptor.warnings.push("Direct-storage custom domain mode expects the deployment bucket name to match the hostname.");
    }
    if (deploymentPrefix) {
      descriptor.warnings.push("Direct-storage custom domain mode expects the deployment prefix to be empty for root path delivery.");
    }
  }
  if (descriptor.publicOrigin && pagePath) {
    descriptor.publicUrl = `${descriptor.publicOrigin}${pagePath}`;
  }
  return descriptor;
}

function applyTemporaryDescriptor(descriptor, deploymentTarget, artifactRelativePath) {
  if (!deploymentTarget) {
    descriptor.warnings.push("GCP temporary mode requires a linked deployment storage target.");
    return descriptor;
  }
  if (!descriptor.temporaryDeploymentBaseUrl) {
    descriptor.warnings.push("The linked deployment target does not define a temporary GCP base URL.");
    return descriptor;
  }
  descriptor.publicOrigin = descriptor.temporaryDeploymentBaseUrl;
  descriptor.publicUrl = buildTemporaryArtifactUrl(
    deploymentTarget?.config?.bucketName,
    deploymentTarget?.config?.prefix,
    artifactRelativePath
  );
  descriptor.notes.push("Temporary GCP mode resolves to direct object URLs, so deployed HTML URLs include the artifact path.");
  return descriptor;
}

export function buildBrowserDeliveryDescriptor({
  browserTarget = null,
  deploymentTarget = null,
  mediaTarget = null,
  pagePath = null,
  artifactRelativePath = null
}) {
  const browserConfig = normalizeBrowserDeliveryConfig(browserTarget?.config);
  const descriptor = createBaseDescriptor(browserConfig, deploymentTarget, mediaTarget);
  if (browserConfig.accessMode === "custom-domain") {
    return applyCustomDomainDescriptor(descriptor, browserConfig, deploymentTarget, pagePath);
  }
  return applyTemporaryDescriptor(descriptor, deploymentTarget, artifactRelativePath);
}
