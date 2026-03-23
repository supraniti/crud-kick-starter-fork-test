import { normalizeOptionalText, normalizeTargetConfig } from "./remote-ops-shared-runtime.mjs";

function slugifyName(value, fallback) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  const candidate = normalized || fallback;
  return candidate.slice(0, 63).replace(/-+$/g, "") || fallback;
}

function trimSlashes(value) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.replace(/^\/+|\/+$/g, "") : null;
}

function encodePathSegments(value) {
  return String(value ?? "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function stripManagedSuffix(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  return normalized.replace(
    /(?:-url-map|-cert-map-entry|-cert-map|-cert|-zone|-dns-auth|-ip|-deploy-bb|-media-bb|-https-proxy|-https-fr)$/i,
    ""
  );
}

function buildBaseName(targetProfile, config) {
  const nameSeed =
    stripManagedSuffix(config.urlMapHint) ??
    stripManagedSuffix(config.certificateName) ??
    stripManagedSuffix(config.dnsZone) ??
    normalizeOptionalText(config.hostname) ??
    targetProfile?.id ??
    "browser-delivery";
  return slugifyName(nameSeed.replace(/\./g, "-"), "browser-delivery");
}

export function resolveBrowserDeliveryManagedNames(targetProfile, targetConfig) {
  const config = normalizeTargetConfig(targetConfig, "browser-delivery");
  const baseName = buildBaseName(targetProfile, config);
  const urlMapName = normalizeOptionalText(config.urlMapHint) ?? `${baseName}-url-map`;
  const certificateName = normalizeOptionalText(config.certificateName) ?? `${baseName}-cert`;
  return {
    baseName,
    dnsZoneName: normalizeOptionalText(config.dnsZone) ?? `${baseName}-zone`,
    dnsZoneDnsName: config.hostname ? `${config.hostname}.` : null,
    dnsAuthorizationName: `${baseName}-dns-auth`,
    certificateName,
    certificateMapName: `${baseName}-cert-map`,
    certificateMapEntryName: `${baseName}-cert-map-entry`,
    globalAddressName: `${baseName}-ip`,
    deploymentBackendBucketName: `${baseName}-deploy-bb`,
    mediaBackendBucketName: `${baseName}-media-bb`,
    urlMapName,
    httpsProxyName: `${baseName}-https-proxy`,
    httpsForwardingRuleName: `${baseName}-https-fr`
  };
}

export function buildCertificateMapResourceName(projectId, certificateMapName) {
  return `//certificatemanager.googleapis.com/projects/${projectId}/locations/global/certificateMaps/${certificateMapName}`;
}

export function buildCertificateResourceName(projectId, certificateName) {
  return `projects/${projectId}/locations/global/certificates/${certificateName}`;
}

export function buildDnsAuthorizationResourceName(projectId, dnsAuthorizationName) {
  return `projects/${projectId}/locations/global/dnsAuthorizations/${dnsAuthorizationName}`;
}

export { waitForCertificateManagerOperation, waitForComputeGlobalOperation, loadDnsZone, loadDnsAuthorization, loadCertificate, loadCertificateMap, loadCertificateMapEntry, loadGlobalAddress, loadBackendBucket, loadUrlMap, loadTargetHttpsProxy, loadGlobalForwardingRule, listDnsRecordSets, createManagedZone, createDnsAuthorization, createManagedCertificate, createCertificateMap, createCertificateMapEntry, createGlobalAddress, createBackendBucket, createOrUpdateBackendBucket, createOrUpdateUrlMap, createOrUpdateTargetHttpsProxy, createGlobalForwardingRule, upsertDnsRecord, buildExpectedUrlMapDefinition } from "./remote-ops-gcp-browser-delivery-gcp-runtime.mjs";

export function buildBrowserDeliveryPublicMediaBaseUrl(config, mediaTarget) {
  const hostname = normalizeOptionalText(config.hostname);
  if (!hostname) {
    return null;
  }
  const mediaPrefix = trimSlashes(mediaTarget?.config?.prefix);
  const scheme = config.stackMode === "https-load-balancer" ? "https" : "http";
  return mediaPrefix ? `${scheme}://${hostname}/${encodePathSegments(mediaPrefix)}` : `${scheme}://${hostname}`;
}

function buildTrafficRecordInstruction(config, globalAddress) {
  const hostname = normalizeOptionalText(config.hostname);
  if (!hostname) {
    return null;
  }
  return {
    label: "Traffic record",
    recordType: "A",
    recordName: hostname,
    recordValue: normalizeOptionalText(globalAddress?.address) ?? "(reserved global IP pending)",
    notes: [
      config.dnsMode === "gcp-managed"
        ? "The managed zone should contain this A record once provisioning completes."
        : "Create this A record at your DNS provider."
    ]
  };
}

function buildCertificateAuthorizationInstruction(config, dnsAuthorization) {
  const dnsRecord = dnsAuthorization?.dnsResourceRecord;
  if (!dnsRecord?.name || !dnsRecord?.type || !dnsRecord?.data) {
    return null;
  }
  return {
    label: "Certificate DNS authorization",
    recordType: dnsRecord.type,
    recordName: dnsRecord.name,
    recordValue: dnsRecord.data,
    notes: [
      config.dnsMode === "gcp-managed"
        ? "The managed zone should contain this certificate authorization record once provisioning completes."
        : "Create this record at your DNS provider before the managed certificate can become active."
    ]
  };
}

function buildZoneDelegationInstruction(config, dnsZone) {
  if (config.dnsMode !== "gcp-managed" || !Array.isArray(dnsZone?.nameServers) || dnsZone.nameServers.length === 0) {
    return null;
  }
  return {
    label: "Zone delegation",
    recordType: "NS",
    recordName: normalizeOptionalText(config.hostname),
    recordValue: dnsZone.nameServers.join(", "),
    notes: ["Delegate the hostname or matching parent zone to these Cloud DNS name servers."]
  };
}

export function buildBrowserDeliveryDnsInstructions({
  config,
  globalAddress = null,
  dnsAuthorization = null,
  dnsZone = null
}) {
  const instructions = [];
  const hostname = normalizeOptionalText(config.hostname);
  if (!hostname) {
    return instructions;
  }
  if (config.accessMode === "custom-domain" && config.stackMode === "https-load-balancer") {
    const trafficInstruction = buildTrafficRecordInstruction(config, globalAddress);
    const certificateInstruction = buildCertificateAuthorizationInstruction(config, dnsAuthorization);
    const delegationInstruction = buildZoneDelegationInstruction(config, dnsZone);
    if (trafficInstruction) {
      instructions.push(trafficInstruction);
    }
    if (certificateInstruction) {
      instructions.push(certificateInstruction);
    }
    if (delegationInstruction) {
      instructions.push(delegationInstruction);
    }
    return instructions;
  }
  return [];
}

function buildBackendBucketPathMatcher(hostname, deploymentBackendBucketLink, mediaRule = null) {
  const pathMatcher = {
    name: "site-matcher",
    defaultService: deploymentBackendBucketLink
  };
  if (mediaRule) {
    pathMatcher.pathRules = [
      {
        paths: [mediaRule.pathPattern],
        service: mediaRule.backendBucketLink
      }
    ];
  }
  return {
    defaultService: deploymentBackendBucketLink,
    hostRules: [
      {
        hosts: [hostname],
        pathMatcher: pathMatcher.name
      }
    ],
    pathMatchers: [pathMatcher]
  };
}

function buildMediaPathRule(mediaTarget, backendBucketLink) {
  const mediaPrefix = trimSlashes(mediaTarget?.config?.prefix);
  if (!mediaPrefix) {
    return {
      pathPattern: "/media/*",
      backendBucketLink
    };
  }
  return {
    pathPattern: `/${mediaPrefix}/*`,
    backendBucketLink
  };
}

export function validateBrowserDeliveryStackCompatibility({
  config,
  deploymentTarget,
  reportTitle
}) {
  const warnings = [];
  if (config.accessMode !== "custom-domain" || config.stackMode !== "https-load-balancer") {
    return warnings;
  }
  if (!normalizeOptionalText(deploymentTarget?.config?.bucketName)) {
    warnings.push(`${reportTitle}: linked deployment bucket is required for HTTPS load-balancer mode.`);
  }
  return warnings;
}

