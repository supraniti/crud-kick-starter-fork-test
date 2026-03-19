export const BROWSER_DELIVERY_ACCESS_MODE_SET = new Set([
  "gcp-temporary",
  "custom-domain"
]);

export const BROWSER_DELIVERY_DNS_MODE_SET = new Set([
  "external",
  "gcp-managed"
]);

export const BROWSER_DELIVERY_STACK_MODE_SET = new Set([
  "direct-storage",
  "https-load-balancer"
]);

function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOrigin(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.replace(/\/+$/g, "") : null;
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

export function normalizeBrowserDeliveryStackMode(value, fallback = "direct-storage") {
  return normalizeEnum(value, BROWSER_DELIVERY_STACK_MODE_SET, fallback);
}

export function normalizeBrowserDeliveryConfig(value = {}) {
  const config = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    accessMode: normalizeBrowserDeliveryAccessMode(config.accessMode),
    stackMode: normalizeBrowserDeliveryStackMode(config.stackMode),
    dnsMode: normalizeBrowserDeliveryDnsMode(config.dnsMode),
    hostname: normalizeText(config.hostname),
    applicationApiOrigin: normalizeOrigin(config.applicationApiOrigin),
    firebaseProjectId: normalizeText(config.firebaseProjectId),
    firebaseApiKey: normalizeText(config.firebaseApiKey),
    firebaseAppId: normalizeText(config.firebaseAppId),
    firebaseAuthDomain: normalizeText(config.firebaseAuthDomain),
    firebaseStorageBucket: normalizeText(config.firebaseStorageBucket),
    firebaseMessagingSenderId: normalizeText(config.firebaseMessagingSenderId),
    firebaseMeasurementId: normalizeText(config.firebaseMeasurementId),
    publicCommentsCollectionPath: normalizeText(config.publicCommentsCollectionPath),
    dnsZone: normalizeText(config.dnsZone),
    certificateName: normalizeText(config.certificateName),
    urlMapHint: normalizeText(config.urlMapHint),
    deploymentTargetProfileId: normalizeText(config.deploymentTargetProfileId),
    mediaTargetProfileId: normalizeText(config.mediaTargetProfileId)
  };
}

function buildFirebaseWebAppDescriptor(browserConfig, connectionProfile = null) {
  const projectId = browserConfig.firebaseProjectId ?? normalizeText(connectionProfile?.projectId);
  if (!projectId || !browserConfig.firebaseApiKey || !browserConfig.firebaseAppId) {
    return null;
  }

  return {
    projectId,
    apiKey: browserConfig.firebaseApiKey,
    appId: browserConfig.firebaseAppId,
    authDomain: browserConfig.firebaseAuthDomain ?? `${projectId}.firebaseapp.com`,
    storageBucket: browserConfig.firebaseStorageBucket,
    messagingSenderId: browserConfig.firebaseMessagingSenderId,
    measurementId: browserConfig.firebaseMeasurementId,
    publicCommentsCollectionPath: browserConfig.publicCommentsCollectionPath ?? "publicComments"
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
  const normalizedConfig = normalizeBrowserDeliveryConfig(config);
  if (normalizedConfig.accessMode === "custom-domain") {
    return normalizedConfig.stackMode === "https-load-balancer" ? "https" : "http";
  }
  return "http";
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

  if (normalizedConfig.stackMode === "https-load-balancer") {
    return {
      dnsMode: normalizedConfig.dnsMode,
      recordType: "A",
      recordName: normalizedConfig.hostname,
      recordValue: "(reserved global IP will be shown after compatibility analysis)",
      notes: [
        "HTTPS load-balancer mode expects the hostname to point at the reserved global IP.",
        "A certificate DNS-authorization record may also be required before the managed certificate becomes active.",
        normalizedConfig.dnsMode === "gcp-managed"
          ? "When DNS is GCP-managed, the app can maintain the required record sets inside the managed zone."
          : "When DNS is external, create the shown records at your DNS provider."
      ]
    };
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

function createBaseDescriptor(browserConfig, deploymentTarget, mediaTarget, connectionProfile = null) {
  return {
    accessMode: browserConfig.accessMode,
    stackMode: browserConfig.stackMode,
    dnsMode: browserConfig.dnsMode,
    hostname: browserConfig.hostname,
    applicationApiOrigin: browserConfig.applicationApiOrigin,
    firebaseWebApp: buildFirebaseWebAppDescriptor(browserConfig, connectionProfile),
    publicOrigin: null,
    publicUrl: null,
    publicMediaBaseUrl: null,
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

function applyDirectStorageCustomDomainWarnings(descriptor, browserConfig, deploymentTarget) {
  const deploymentBucketName = normalizeText(deploymentTarget?.config?.bucketName);
  const deploymentPrefix = trimSlashes(deploymentTarget?.config?.prefix);
  if (!deploymentBucketName) {
    descriptor.warnings.push("The linked deployment target does not define a bucket.");
    return descriptor;
  }
  if (browserConfig.hostname && deploymentBucketName !== browserConfig.hostname) {
    descriptor.warnings.push("Direct-storage custom domain mode expects the deployment bucket name to match the hostname.");
  }
  if (deploymentPrefix) {
    descriptor.warnings.push("Direct-storage custom domain mode expects the deployment prefix to be empty for root path delivery.");
  }
  return descriptor;
}

function applyCustomDomainMediaBase(descriptor, browserConfig, mediaTarget) {
  if (!descriptor.publicOrigin || browserConfig.stackMode !== "https-load-balancer") {
    return descriptor;
  }
  const mediaPrefix = trimSlashes(mediaTarget?.config?.prefix ?? null);
  descriptor.publicMediaBaseUrl = mediaPrefix
    ? `${descriptor.publicOrigin}/${encodeRelativePath(mediaPrefix)}`
    : descriptor.publicOrigin;
  return descriptor;
}

function applyCustomDomainDescriptor(descriptor, browserConfig, deploymentTarget, pagePath, mediaTarget) {
  descriptor.publicOrigin = buildCustomDomainOrigin(browserConfig);
  descriptor.dnsInstruction = buildCustomDomainDnsInstruction(browserConfig);
  if (!browserConfig.hostname) {
    descriptor.warnings.push("Custom domain mode requires a hostname.");
  }
  if (!deploymentTarget) {
    descriptor.warnings.push("Custom domain mode requires a linked deployment storage target.");
  } else if (browserConfig.stackMode === "direct-storage") {
    applyDirectStorageCustomDomainWarnings(descriptor, browserConfig, deploymentTarget);
  }
  if (descriptor.publicOrigin && pagePath) {
    descriptor.publicUrl = `${descriptor.publicOrigin}${pagePath}`;
  }
  return applyCustomDomainMediaBase(descriptor, browserConfig, mediaTarget);
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
  descriptor.publicMediaBaseUrl = descriptor.temporaryMediaBaseUrl;
  descriptor.publicUrl = buildTemporaryArtifactUrl(
    deploymentTarget?.config?.bucketName,
    deploymentTarget?.config?.prefix,
    artifactRelativePath
  );
  descriptor.notes.push(
    "Temporary GCP mode resolves to provider-owned public object URLs rather than an owned custom domain."
  );
  descriptor.notes.push(
    "Linked deployment and media buckets must allow public object reads for these URLs to work in a browser."
  );
  return descriptor;
}

export function buildBrowserDeliveryDescriptor({
  browserTarget = null,
  deploymentTarget = null,
  mediaTarget = null,
  connectionProfile = null,
  pagePath = null,
  artifactRelativePath = null
}) {
  const browserConfig = normalizeBrowserDeliveryConfig(browserTarget?.config);
  const descriptor = createBaseDescriptor(browserConfig, deploymentTarget, mediaTarget, connectionProfile);
  if (browserConfig.accessMode === "custom-domain") {
    return applyCustomDomainDescriptor(descriptor, browserConfig, deploymentTarget, pagePath, mediaTarget);
  }
  return applyTemporaryDescriptor(descriptor, deploymentTarget, artifactRelativePath);
}
