import {
  normalizeBrowserDeliveryAccessMode,
  normalizeBrowserDeliveryConfig,
  normalizeBrowserDeliveryDnsMode
} from "../shared/browser-delivery-support.mjs";

export const MODULE_ID = "test-modules-remote-ops";
export const CONNECTIONS_COLLECTION_ID = "remote-connection-profiles";
export const TARGETS_COLLECTION_ID = "remote-target-profiles";
export const RUNS_COLLECTION_ID = "remote-operation-runs";
export const POSTS_COLLECTION_ID = "blog-posts";
export const PAGES_COLLECTION_ID = "blog-pages";

export const CONNECTION_STATUS_SET = new Set([
  "draft",
  "connected",
  "validated",
  "warning",
  "error"
]);
export const TARGET_STATUS_SET = new Set(["draft", "validated", "warning", "error"]);
export const RUN_STATUS_SET = new Set(["succeeded", "warning", "failed"]);
export const AUTH_MODE_SET = new Set(["service-account-key", "service-account"]);
export const ADAPTER_MODE_SET = new Set(["simulated-gcp", "live-gcp"]);
export const TARGET_KIND_SET = new Set([
  "firestore-projection",
  "deployment-storage",
  "media-storage",
  "browser-delivery"
]);
export {
  normalizeBrowserDeliveryAccessMode,
  normalizeBrowserDeliveryConfig,
  normalizeBrowserDeliveryDnsMode
} from "../shared/browser-delivery-support.mjs";

export function toTimestamp(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeEnum(value, allowedValues, fallback) {
  const normalized = normalizeText(value).toLowerCase();
  return allowedValues.has(normalized) ? normalized : fallback;
}

export function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

export function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

export function canonicalizeJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValue);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalizeJsonValue(value[key]);
        return result;
      }, {});
  }
  return value ?? null;
}

export function stringifyCanonicalJson(value) {
  return `${JSON.stringify(canonicalizeJsonValue(value), null, 2)}\n`;
}

export function createEmptyValidationSummary() {
  return {
    state: "unknown",
    message: null,
    checkedItems: [],
    warnings: [],
    canProceed: false
  };
}

export function createEmptyCompareSummary() {
  return {
    state: "unknown",
    message: null,
    createCount: 0,
    updateCount: 0,
    deleteCount: 0,
    localOnlyCount: 0,
    remoteOnlyCount: 0,
    sampleKeys: []
  };
}

export function normalizeValidationSummary(value) {
  const summary = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    state: normalizeEnum(summary.state, new Set(["unknown", "validated", "warning", "error"]), "unknown"),
    message: normalizeOptionalText(summary.message),
    checkedItems: Array.isArray(summary.checkedItems)
      ? summary.checkedItems.filter((item) => typeof item === "string" && item.trim().length > 0)
      : [],
    warnings: Array.isArray(summary.warnings)
      ? summary.warnings.filter((item) => typeof item === "string" && item.trim().length > 0)
      : [],
    canProceed: normalizeBoolean(summary.canProceed, false)
  };
}

export function normalizeCompareSummary(value) {
  const summary = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const toCount = (input) => (Number.isFinite(input) ? Math.max(0, Math.trunc(input)) : 0);
  return {
    state: normalizeEnum(summary.state, new Set(["unknown", "clean", "drift", "error"]), "unknown"),
    message: normalizeOptionalText(summary.message),
    createCount: toCount(summary.createCount),
    updateCount: toCount(summary.updateCount),
    deleteCount: toCount(summary.deleteCount),
    localOnlyCount: toCount(summary.localOnlyCount),
    remoteOnlyCount: toCount(summary.remoteOnlyCount),
    sampleKeys: Array.isArray(summary.sampleKeys)
      ? summary.sampleKeys.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 8)
      : []
  };
}

export function normalizeRunSummary(value) {
  const summary = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const toCount = (input) => (Number.isFinite(input) ? Math.max(0, Math.trunc(input)) : 0);
  return {
    createCount: toCount(summary.createCount),
    updateCount: toCount(summary.updateCount),
    deleteCount: toCount(summary.deleteCount),
    restoredCount: toCount(summary.restoredCount),
    sampleKeys: Array.isArray(summary.sampleKeys)
      ? summary.sampleKeys.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 8)
      : [],
    warnings: Array.isArray(summary.warnings)
      ? summary.warnings.filter((item) => typeof item === "string" && item.trim().length > 0).slice(0, 8)
      : []
  };
}

export function normalizeConnectionProfileStatus(value, fallback = "draft") {
  return normalizeEnum(value, CONNECTION_STATUS_SET, fallback);
}

export function normalizeTargetStatus(value, fallback = "draft") {
  return normalizeEnum(value, TARGET_STATUS_SET, fallback);
}

export function normalizeRunStatus(value, fallback = "succeeded") {
  return normalizeEnum(value, RUN_STATUS_SET, fallback);
}

export function normalizeAuthMode(value, fallback = "service-account-key") {
  const normalized = normalizeEnum(value, AUTH_MODE_SET, fallback);
  return normalized === "service-account" ? "service-account-key" : normalized;
}

export function normalizeTargetKind(value, fallback = "firestore-projection") {
  return normalizeEnum(value, TARGET_KIND_SET, fallback);
}

export function normalizeAdapterMode(value, fallback = "simulated-gcp") {
  return normalizeEnum(value, ADAPTER_MODE_SET, fallback);
}

export function createDefaultTargetConfig(targetKind = "firestore-projection") {
  switch (normalizeTargetKind(targetKind)) {
    case "deployment-storage":
      return {
        projectionScope: null,
        firestoreCollectionPath: null,
        bucketName: null,
        prefix: "site",
        localRootHint: "deployment",
        hostname: null,
        dnsZone: null,
        certificateName: null,
        urlMapHint: null
      };
    case "media-storage":
      return {
        projectionScope: null,
        firestoreCollectionPath: null,
        bucketName: null,
        prefix: "library",
        localRootHint: "media",
        hostname: null,
        dnsZone: null,
        certificateName: null,
        urlMapHint: null
      };
    case "browser-delivery":
      return {
        projectionScope: null,
        firestoreCollectionPath: null,
        bucketName: null,
        prefix: null,
        localRootHint: "deployment",
        accessMode: "gcp-temporary",
        dnsMode: "external",
        hostname: null,
        dnsZone: null,
        certificateName: null,
        urlMapHint: null,
        deploymentTargetProfileId: null,
        mediaTargetProfileId: null
      };
    case "firestore-projection":
    default:
      return {
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "publishedPosts",
        bucketName: null,
        prefix: null,
        localRootHint: null,
        hostname: null,
        dnsZone: null,
        certificateName: null,
        urlMapHint: null
      };
  }
}

function pickConfigValue(config, defaults, fieldId) {
  return Object.prototype.hasOwnProperty.call(config, fieldId) ? config[fieldId] : defaults[fieldId];
}

function normalizeCommonTargetConfig(config, defaults) {
  return {
    projectionScope: normalizeOptionalText(pickConfigValue(config, defaults, "projectionScope")),
    firestoreCollectionPath: normalizeOptionalText(
      pickConfigValue(config, defaults, "firestoreCollectionPath")
    ),
    bucketName: normalizeOptionalText(pickConfigValue(config, defaults, "bucketName")),
    prefix: normalizeOptionalText(pickConfigValue(config, defaults, "prefix")),
    localRootHint: normalizeOptionalText(pickConfigValue(config, defaults, "localRootHint"))
  };
}

function normalizeDefaultTargetConfig(config, defaults) {
  return {
    ...normalizeCommonTargetConfig(config, defaults),
    accessMode: normalizeOptionalText(pickConfigValue(config, defaults, "accessMode")),
    dnsMode: normalizeOptionalText(pickConfigValue(config, defaults, "dnsMode")),
    hostname: normalizeOptionalText(pickConfigValue(config, defaults, "hostname")),
    dnsZone: normalizeOptionalText(pickConfigValue(config, defaults, "dnsZone")),
    certificateName: normalizeOptionalText(pickConfigValue(config, defaults, "certificateName")),
    urlMapHint: normalizeOptionalText(pickConfigValue(config, defaults, "urlMapHint")),
    deploymentTargetProfileId: normalizeOptionalText(
      pickConfigValue(config, defaults, "deploymentTargetProfileId")
    ),
    mediaTargetProfileId: normalizeOptionalText(
      pickConfigValue(config, defaults, "mediaTargetProfileId")
    )
  };
}

function normalizeBrowserOnlyTargetConfig(config, defaults) {
  const browserDeliveryConfig = normalizeBrowserDeliveryConfig({
    accessMode: pickConfigValue(config, defaults, "accessMode"),
    dnsMode: pickConfigValue(config, defaults, "dnsMode"),
    hostname: pickConfigValue(config, defaults, "hostname"),
    dnsZone: pickConfigValue(config, defaults, "dnsZone"),
    certificateName: pickConfigValue(config, defaults, "certificateName"),
    urlMapHint: pickConfigValue(config, defaults, "urlMapHint"),
    deploymentTargetProfileId: pickConfigValue(config, defaults, "deploymentTargetProfileId"),
    mediaTargetProfileId: pickConfigValue(config, defaults, "mediaTargetProfileId")
  });
  return {
    ...normalizeCommonTargetConfig(config, defaults),
    accessMode: browserDeliveryConfig.accessMode,
    dnsMode: browserDeliveryConfig.dnsMode,
    hostname: browserDeliveryConfig.hostname,
    dnsZone: browserDeliveryConfig.dnsZone,
    certificateName: browserDeliveryConfig.certificateName,
    urlMapHint: browserDeliveryConfig.urlMapHint,
    deploymentTargetProfileId: browserDeliveryConfig.deploymentTargetProfileId,
    mediaTargetProfileId: browserDeliveryConfig.mediaTargetProfileId
  };
}

export function normalizeTargetConfig(value, targetKind = "firestore-projection") {
  const config = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const defaults = createDefaultTargetConfig(targetKind);
  return targetKind === "browser-delivery"
    ? normalizeBrowserOnlyTargetConfig(config, defaults)
    : normalizeDefaultTargetConfig(config, defaults);
}

export function createDefaultTargetPolicy() {
  return {
    allowDeletes: false,
    allowRestore: true,
    requireDryRunFirst: true
  };
}

export function normalizeTargetPolicy(value) {
  const policy = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const defaults = createDefaultTargetPolicy();
  return {
    allowDeletes: normalizeBoolean(policy.allowDeletes, defaults.allowDeletes),
    allowRestore: normalizeBoolean(policy.allowRestore, defaults.allowRestore),
    requireDryRunFirst: normalizeBoolean(policy.requireDryRunFirst, defaults.requireDryRunFirst)
  };
}

export function buildExposedConnectionProfile(item) {
  if (!item || typeof item !== "object") {
    return item;
  }
  return {
    ...item,
    authMode: normalizeAuthMode(item.authMode),
    credentialPathHint: normalizeOptionalText(item.credentialPathHint),
    serviceAccountEmail: normalizeOptionalText(item.serviceAccountEmail),
    serviceAccountKeyId: normalizeOptionalText(item.serviceAccountKeyId),
    environmentLabel: normalizeOptionalText(item.environmentLabel),
    projectId: normalizeOptionalText(item.projectId),
    projectNumber: normalizeOptionalText(item.projectNumber),
    projectDisplayName: normalizeOptionalText(item.projectDisplayName),
    operatorEmail: normalizeOptionalText(item.operatorEmail),
    region: normalizeOptionalText(item.region),
    credentialLabel: normalizeOptionalText(item.credentialLabel),
    lastConnectedOn: normalizeOptionalText(item.lastConnectedOn),
    lastValidatedOn: normalizeOptionalText(item.lastValidatedOn),
    validationSummary: normalizeValidationSummary(item.validationSummary)
  };
}

export function buildExposedTargetProfile(item) {
  if (!item || typeof item !== "object") {
    return item;
  }
  return {
    ...item,
    adapterMode: normalizeAdapterMode(item.adapterMode),
    config: normalizeTargetConfig(item.config, item.targetKind),
    policy: normalizeTargetPolicy(item.policy),
    lastValidatedOn: normalizeOptionalText(item.lastValidatedOn),
    lastComparedOn: normalizeOptionalText(item.lastComparedOn),
    validationSummary: normalizeValidationSummary(item.validationSummary),
    compareSummary: normalizeCompareSummary(item.compareSummary)
  };
}

export function buildExposedOperationRun(item) {
  if (!item || typeof item !== "object") {
    return item;
  }
  return {
    ...item,
    message: normalizeOptionalText(item.message),
    summary: normalizeRunSummary(item.summary)
  };
}
