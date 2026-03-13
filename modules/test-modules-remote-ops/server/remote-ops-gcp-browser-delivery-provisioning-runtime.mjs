import {
  createBackendBucket,
  createCertificateMap,
  createCertificateMapEntry,
  createDnsAuthorization,
  createGlobalAddress,
  createGlobalForwardingRule,
  createManagedCertificate,
  createManagedZone,
  createOrUpdateTargetHttpsProxy,
  createOrUpdateUrlMap,
  loadDnsAuthorization,
  loadDnsZone,
  loadGlobalAddress,
  resolveBrowserDeliveryManagedNames,
  upsertDnsRecord
} from "./remote-ops-gcp-browser-delivery-stack-runtime.mjs";
import { normalizeOptionalText, normalizeTargetConfig } from "./remote-ops-shared-runtime.mjs";

const HTTPS_BROWSER_RESOURCE_KINDS = new Set([
  "dns-zone",
  "dns-authorization",
  "managed-certificate",
  "certificate-map",
  "certificate-map-entry",
  "global-address",
  "deployment-backend-bucket",
  "media-backend-bucket",
  "url-map",
  "https-proxy",
  "https-forwarding-rule",
  "dns-a-record",
  "dns-authorization-record"
]);

function findAnyTarget(targetProfiles, targetId) {
  return targetProfiles.find((targetProfile) => targetProfile.id === targetId) ?? null;
}

function findBrowserTarget(targetProfiles, targetId) {
  const target = findAnyTarget(targetProfiles, targetId);
  return target?.targetKind === "browser-delivery" ? target : null;
}

function findBrowserLinkedTargets(targetProfiles, browserTarget) {
  const browserConfig = normalizeTargetConfig(browserTarget?.config, "browser-delivery");
  return {
    deploymentTarget: findAnyTarget(targetProfiles, browserConfig.deploymentTargetProfileId),
    mediaTarget: findAnyTarget(targetProfiles, browserConfig.mediaTargetProfileId),
    browserConfig
  };
}

function recordExecutedAction(executedActionIds, executedActions, action) {
  executedActionIds.add(action.id);
  executedActions.push({
    id: action.id,
    label: action.label,
    resourceKind: action.resourceKind
  });
}

function resolveHttpsBrowserActionContext(action, targetProfiles) {
  const browserTarget = findBrowserTarget(targetProfiles, action.targetId);
  if (!browserTarget) {
    return null;
  }
  const { deploymentTarget, mediaTarget, browserConfig } = findBrowserLinkedTargets(targetProfiles, browserTarget);
  const hostname = normalizeOptionalText(browserConfig.hostname);
  if (!hostname) {
    return null;
  }
  return {
    browserTarget,
    deploymentTarget,
    mediaTarget,
    browserConfig,
    hostname,
    names: resolveBrowserDeliveryManagedNames(browserTarget, browserConfig)
  };
}

function resolveLinkedBucketName(targetProfile) {
  const config = normalizeTargetConfig(targetProfile?.config, targetProfile?.targetKind);
  return normalizeOptionalText(config.bucketName);
}

async function executeHttpsBrowserCoreAction(action, context, projectId, accessToken) {
  const { deploymentTarget, mediaTarget, hostname, names } = context;
  switch (action.resourceKind) {
    case "dns-zone":
      return createManagedZone(projectId, names.dnsZoneName, names.dnsZoneDnsName ?? `${hostname}.`, accessToken);
    case "dns-authorization":
      return createDnsAuthorization(projectId, names.dnsAuthorizationName, hostname, accessToken);
    case "managed-certificate":
      return createManagedCertificate(projectId, names.certificateName, hostname, names.dnsAuthorizationName, accessToken);
    case "certificate-map":
      return createCertificateMap(projectId, names.certificateMapName, hostname, accessToken);
    case "certificate-map-entry":
      return createCertificateMapEntry(
        projectId,
        names.certificateMapName,
        names.certificateMapEntryName,
        hostname,
        names.certificateName,
        accessToken
      );
    case "global-address":
      return createGlobalAddress(projectId, names.globalAddressName, accessToken);
    case "deployment-backend-bucket": {
      const bucketName = resolveLinkedBucketName(deploymentTarget);
      if (!bucketName) {
        return null;
      }
      return createBackendBucket(projectId, names.deploymentBackendBucketName, bucketName, accessToken);
    }
    case "media-backend-bucket": {
      const bucketName = resolveLinkedBucketName(mediaTarget);
      if (!bucketName) {
        return null;
      }
      return createBackendBucket(projectId, names.mediaBackendBucketName, bucketName, accessToken);
    }
    case "url-map":
      return createOrUpdateUrlMap(
        projectId,
        names.urlMapName,
        hostname,
        names.deploymentBackendBucketName,
        mediaTarget,
        names.mediaBackendBucketName,
        accessToken
      );
    case "https-proxy":
      return createOrUpdateTargetHttpsProxy(
        projectId,
        names.httpsProxyName,
        names.urlMapName,
        names.certificateMapName,
        accessToken
      );
    case "https-forwarding-rule":
      return createGlobalForwardingRule(
        projectId,
        names.httpsForwardingRuleName,
        names.globalAddressName,
        names.httpsProxyName,
        accessToken
      );
    default:
      return null;
  }
}

async function executeHttpsBrowserDnsAction(action, context, projectId, accessToken) {
  const { browserConfig, hostname, names } = context;
  if (browserConfig.dnsMode !== "gcp-managed") {
    return null;
  }
  if (action.resourceKind === "dns-a-record") {
    const zone = await loadDnsZone(projectId, names.dnsZoneName, accessToken);
    const address = await loadGlobalAddress(projectId, names.globalAddressName, accessToken);
    if (!address?.address) {
      return null;
    }
    return upsertDnsRecord(
      projectId,
      zone.name,
      {
        name: `${hostname}.`,
        type: "A",
        ttl: 300,
        rrdatas: [address.address]
      },
      accessToken
    );
  }
  if (action.resourceKind === "dns-authorization-record") {
    const dnsAuthorization = await loadDnsAuthorization(projectId, names.dnsAuthorizationName, accessToken);
    const dnsZone = await loadDnsZone(projectId, names.dnsZoneName, accessToken);
    const dnsRecord = dnsAuthorization?.dnsResourceRecord;
    if (!dnsRecord?.name || !dnsRecord?.type || !dnsRecord?.data) {
      return null;
    }
    return upsertDnsRecord(
      projectId,
      dnsZone.name,
      {
        name: dnsRecord.name,
        type: dnsRecord.type,
        ttl: 300,
        rrdatas: [dnsRecord.data]
      },
      accessToken
    );
  }
  return null;
}

export async function executeHttpsBrowserDeliveryActions({
  iterationActions,
  executedActionIds,
  executedActions,
  targetProfiles,
  projectId,
  accessToken
}) {
  const httpsActions = iterationActions.filter(
    (entry) => HTTPS_BROWSER_RESOURCE_KINDS.has(entry.resourceKind) && !executedActionIds.has(entry.id)
  );
  for (const action of httpsActions) {
    const context = resolveHttpsBrowserActionContext(action, targetProfiles);
    if (!context) {
      continue;
    }
    await executeHttpsBrowserCoreAction(action, context, projectId, accessToken);
    await executeHttpsBrowserDnsAction(action, context, projectId, accessToken);
    recordExecutedAction(executedActionIds, executedActions, action);
  }
}
