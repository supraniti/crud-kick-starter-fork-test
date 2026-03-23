import { requestGoogleJson } from "./remote-ops-live-google-runtime.mjs";
import { normalizeOptionalText } from "./remote-ops-shared-runtime.mjs";

function buildGlobalLocationParent(projectId) {
  return `projects/${projectId}/locations/global`;
}

function buildManagedZoneUrl(projectId, zoneName) {
  return `https://dns.googleapis.com/dns/v1/projects/${encodeURIComponent(projectId)}/managedZones/${encodeURIComponent(zoneName)}`;
}

function buildManagedZoneRecordSetUrl(projectId, zoneName) {
  return `${buildManagedZoneUrl(projectId, zoneName)}/rrsets`;
}

function buildManagedZoneChangesUrl(projectId, zoneName) {
  return `${buildManagedZoneUrl(projectId, zoneName)}/changes`;
}

function buildDnsAuthorizationUrl(projectId, dnsAuthorizationName) {
  return `https://certificatemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/global/dnsAuthorizations/${encodeURIComponent(dnsAuthorizationName)}`;
}

function buildCertificateUrl(projectId, certificateName) {
  return `https://certificatemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/global/certificates/${encodeURIComponent(certificateName)}`;
}

function buildCertificateMapUrl(projectId, certificateMapName) {
  return `https://certificatemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/global/certificateMaps/${encodeURIComponent(certificateMapName)}`;
}

function buildCertificateMapEntryUrl(projectId, certificateMapName, entryName) {
  return `${buildCertificateMapUrl(projectId, certificateMapName)}/certificateMapEntries/${encodeURIComponent(entryName)}`;
}

function buildComputeGlobalUrl(projectId, resourceKind, resourceName = "") {
  const normalizedName = normalizeOptionalText(resourceName);
  const suffix = normalizedName ? `/${encodeURIComponent(normalizedName)}` : "";
  return `https://compute.googleapis.com/compute/v1/projects/${encodeURIComponent(projectId)}/global/${resourceKind}${suffix}`;
}

function buildCertificateMapResourceName(projectId, certificateMapName) {
  return `//certificatemanager.googleapis.com/projects/${projectId}/locations/global/certificateMaps/${certificateMapName}`;
}

function buildCertificateResourceName(projectId, certificateName) {
  return `projects/${projectId}/locations/global/certificates/${certificateName}`;
}

function buildDnsAuthorizationResourceName(projectId, dnsAuthorizationName) {
  return `projects/${projectId}/locations/global/dnsAuthorizations/${dnsAuthorizationName}`;
}

function trimPathPrefix(value) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.replace(/^\/+|\/+$/g, "") : "";
}

function buildMediaRouteRule(mediaTarget, backendBucketLink, priority = 10) {
  const rawPrefix = normalizeOptionalText(mediaTarget?.config?.prefix);
  const trimmedPrefix = rawPrefix ? rawPrefix.replace(/^\/+|\/+$/g, "") : "";
  if (!trimmedPrefix) {
    return null;
  }
  return {
    priority,
    matchRules: [
      {
        fullPathMatch: `/${trimmedPrefix}`
      },
      {
        prefixMatch: `/${trimmedPrefix}/`
      }
    ],
    service: backendBucketLink
  };
}

function buildDeploymentAssetsRouteRule(deploymentPrefix, deploymentBackendBucketLink, priority = 20) {
  if (!deploymentPrefix) {
    return null;
  }
  return {
    priority,
    matchRules: [
      {
        fullPathMatch: "/assets"
      },
      {
        prefixMatch: "/assets/"
      }
    ],
    service: deploymentBackendBucketLink,
    routeAction: {
      urlRewrite: {
        pathPrefixRewrite: `/${deploymentPrefix}/assets`
      }
    }
  };
}

function buildDeploymentRootRouteRule(deploymentPrefix, deploymentBackendBucketLink, priority = 30) {
  if (!deploymentPrefix) {
    return null;
  }
  return {
    priority,
    matchRules: [
      {
        fullPathMatch: "/"
      }
    ],
    service: deploymentBackendBucketLink,
    routeAction: {
      urlRewrite: {
        pathPrefixRewrite: `/${deploymentPrefix}/index.html`
      }
    }
  };
}

function buildDeploymentPageRouteRule(deploymentPrefix, deploymentBackendBucketLink, priority = 40) {
  if (!deploymentPrefix) {
    return null;
  }
  return {
    priority,
    matchRules: [
      {
        pathTemplateMatch: "/{pagePath=**}"
      }
    ],
    service: deploymentBackendBucketLink,
    routeAction: {
      urlRewrite: {
        pathTemplateRewrite: `/${deploymentPrefix}/{pagePath}/index.html`
      }
    }
  };
}

function buildBackendBucketPathMatcher(hostname, deploymentBackendBucketLink, deploymentTarget = null, mediaTarget = null, mediaBackendBucketLink = null) {
  const deploymentPrefix = trimPathPrefix(deploymentTarget?.config?.prefix);
  const routeRules = [
    buildMediaRouteRule(mediaTarget, mediaBackendBucketLink, 10),
    buildDeploymentAssetsRouteRule(deploymentPrefix, deploymentBackendBucketLink, 20),
    buildDeploymentRootRouteRule(deploymentPrefix, deploymentBackendBucketLink, 30),
    buildDeploymentPageRouteRule(deploymentPrefix, deploymentBackendBucketLink, 40)
  ].filter(Boolean);

  return {
    defaultService: deploymentBackendBucketLink,
    hostRules: [
      {
        hosts: [hostname],
        pathMatcher: "primary-matcher"
      }
    ],
    pathMatchers: [
      {
        name: "primary-matcher",
        defaultService: deploymentBackendBucketLink,
        ...(routeRules.length > 0 ? { routeRules } : {})
      }
    ]
  };
}

export async function waitForCertificateManagerOperation(accessToken, operationName) {
  const normalizedName = normalizeOptionalText(operationName);
  if (!normalizedName) {
    return null;
  }
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const payload = await requestGoogleJson(
      `https://certificatemanager.googleapis.com/v1/${normalizedName}`,
      accessToken
    );
    if (payload?.done === true) {
      if (payload?.error?.message) {
        throw new Error(payload.error.message);
      }
      return payload?.response ?? payload;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out while waiting for Certificate Manager operation '${normalizedName}'.`);
}

export async function waitForComputeGlobalOperation(projectId, accessToken, operationName) {
  const normalizedName = normalizeOptionalText(operationName);
  if (!normalizedName) {
    return null;
  }
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const payload = await requestGoogleJson(
      buildComputeGlobalUrl(projectId, "operations", normalizedName),
      accessToken
    );
    if (payload?.status === "DONE") {
      const errors = Array.isArray(payload?.error?.errors) ? payload.error.errors : [];
      if (errors.length > 0) {
        throw new Error(errors.map((entry) => entry?.message).filter(Boolean).join("; "));
      }
      return payload;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out while waiting for Compute operation '${normalizedName}'.`);
}

export async function loadDnsZone(projectId, zoneName, accessToken) {
  return requestGoogleJson(buildManagedZoneUrl(projectId, zoneName), accessToken);
}

export async function loadDnsAuthorization(projectId, dnsAuthorizationName, accessToken) {
  return requestGoogleJson(buildDnsAuthorizationUrl(projectId, dnsAuthorizationName), accessToken);
}

export async function loadCertificate(projectId, certificateName, accessToken) {
  return requestGoogleJson(buildCertificateUrl(projectId, certificateName), accessToken);
}

export async function loadCertificateMap(projectId, certificateMapName, accessToken) {
  return requestGoogleJson(buildCertificateMapUrl(projectId, certificateMapName), accessToken);
}

export async function loadCertificateMapEntry(projectId, certificateMapName, entryName, accessToken) {
  return requestGoogleJson(buildCertificateMapEntryUrl(projectId, certificateMapName, entryName), accessToken);
}

export async function loadGlobalAddress(projectId, addressName, accessToken) {
  return requestGoogleJson(buildComputeGlobalUrl(projectId, "addresses", addressName), accessToken);
}

export async function loadBackendBucket(projectId, backendBucketName, accessToken) {
  return requestGoogleJson(buildComputeGlobalUrl(projectId, "backendBuckets", backendBucketName), accessToken);
}

export async function loadUrlMap(projectId, urlMapName, accessToken) {
  return requestGoogleJson(buildComputeGlobalUrl(projectId, "urlMaps", urlMapName), accessToken);
}

export async function loadTargetHttpsProxy(projectId, proxyName, accessToken) {
  return requestGoogleJson(buildComputeGlobalUrl(projectId, "targetHttpsProxies", proxyName), accessToken);
}

export async function loadGlobalForwardingRule(projectId, forwardingRuleName, accessToken) {
  return requestGoogleJson(buildComputeGlobalUrl(projectId, "forwardingRules", forwardingRuleName), accessToken);
}

export async function listDnsRecordSets(projectId, zoneName, accessToken, recordName = null, recordType = null) {
  const params = new URLSearchParams();
  if (recordName) {
    params.set("name", recordName);
  }
  if (recordType) {
    params.set("type", recordType);
  }
  const url = `${buildManagedZoneRecordSetUrl(projectId, zoneName)}${params.toString() ? `?${params.toString()}` : ""}`;
  const payload = await requestGoogleJson(url, accessToken);
  return Array.isArray(payload?.rrsets) ? payload.rrsets : [];
}


export async function createManagedZone(projectId, zoneName, dnsName, accessToken) {
  return requestGoogleJson(
    `https://dns.googleapis.com/dns/v1/projects/${encodeURIComponent(projectId)}/managedZones`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: zoneName,
        dnsName,
        description: `Managed zone for ${dnsName}`
      })
    }
  );
}

export async function createDnsAuthorization(projectId, dnsAuthorizationName, hostname, accessToken) {
  const payload = await requestGoogleJson(
    `https://certificatemanager.googleapis.com/v1/${buildGlobalLocationParent(projectId)}/dnsAuthorizations?dnsAuthorizationId=${encodeURIComponent(dnsAuthorizationName)}`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        domain: hostname
      })
    }
  );
  return waitForCertificateManagerOperation(accessToken, payload?.name);
}

export async function createManagedCertificate(projectId, certificateName, hostname, dnsAuthorizationName, accessToken) {
  const payload = await requestGoogleJson(
    `https://certificatemanager.googleapis.com/v1/${buildGlobalLocationParent(projectId)}/certificates?certificateId=${encodeURIComponent(certificateName)}`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        managed: {
          domains: [hostname],
          dnsAuthorizations: [buildDnsAuthorizationResourceName(projectId, dnsAuthorizationName)]
        }
      })
    }
  );
  return waitForCertificateManagerOperation(accessToken, payload?.name);
}

export async function createCertificateMap(projectId, certificateMapName, hostname, accessToken) {
  const payload = await requestGoogleJson(
    `https://certificatemanager.googleapis.com/v1/${buildGlobalLocationParent(projectId)}/certificateMaps?certificateMapId=${encodeURIComponent(certificateMapName)}`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        description: `Certificate map for ${hostname}`
      })
    }
  );
  return waitForCertificateManagerOperation(accessToken, payload?.name);
}

export async function createCertificateMapEntry(
  projectId,
  certificateMapName,
  entryName,
  hostname,
  certificateName,
  accessToken
) {
  const payload = await requestGoogleJson(
    `https://certificatemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/global/certificateMaps/${encodeURIComponent(certificateMapName)}/certificateMapEntries?certificateMapEntryId=${encodeURIComponent(entryName)}`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        hostname,
        certificates: [buildCertificateResourceName(projectId, certificateName)]
      })
    }
  );
  return waitForCertificateManagerOperation(accessToken, payload?.name);
}

export async function createGlobalAddress(projectId, addressName, accessToken) {
  const payload = await requestGoogleJson(
    buildComputeGlobalUrl(projectId, "addresses"),
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: addressName,
        addressType: "EXTERNAL",
        ipVersion: "IPV4",
        networkTier: "PREMIUM"
      })
    }
  );
  return waitForComputeGlobalOperation(projectId, accessToken, payload?.name);
}

export async function createBackendBucket(projectId, backendBucketName, bucketName, accessToken) {
  const payload = await requestGoogleJson(
    buildComputeGlobalUrl(projectId, "backendBuckets"),
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: backendBucketName,
        bucketName,
        enableCdn: true,
        description: `Backend bucket for ${bucketName}`
      })
    }
  );
  return waitForComputeGlobalOperation(projectId, accessToken, payload?.name);
}

export async function createOrUpdateUrlMap(
  projectId,
  urlMapName,
  hostname,
  deploymentTarget,
  deploymentBackendBucketName,
  mediaTarget,
  mediaBackendBucketName,
  accessToken
) {
  const deploymentBackendBucketLink = buildComputeGlobalUrl(projectId, "backendBuckets", deploymentBackendBucketName);
  const mediaBackendBucketLink =
    mediaTarget && mediaBackendBucketName
      ? buildComputeGlobalUrl(projectId, "backendBuckets", mediaBackendBucketName)
      : null;
  const payloadBody = {
    name: urlMapName,
    ...buildBackendBucketPathMatcher(
      hostname,
      deploymentBackendBucketLink,
      deploymentTarget,
      mediaTarget,
      mediaBackendBucketLink
    )
  };
  try {
    await loadUrlMap(projectId, urlMapName, accessToken);
    const payload = await requestGoogleJson(
      buildComputeGlobalUrl(projectId, "urlMaps", urlMapName),
      accessToken,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payloadBody)
      }
    );
    return waitForComputeGlobalOperation(projectId, accessToken, payload?.name);
  } catch (error) {
    if (error?.statusCode !== 404) {
      throw error;
    }
    const payload = await requestGoogleJson(
      buildComputeGlobalUrl(projectId, "urlMaps"),
      accessToken,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payloadBody)
      }
    );
    return waitForComputeGlobalOperation(projectId, accessToken, payload?.name);
  }
}

export async function createOrUpdateTargetHttpsProxy(
  projectId,
  proxyName,
  urlMapName,
  certificateMapName,
  accessToken
) {
  const certificateMap = buildCertificateMapResourceName(projectId, certificateMapName);
  const urlMap = buildComputeGlobalUrl(projectId, "urlMaps", urlMapName);
  try {
    await loadTargetHttpsProxy(projectId, proxyName, accessToken);
  } catch (error) {
    if (error?.statusCode !== 404) {
      throw error;
    }
    const payload = await requestGoogleJson(
      buildComputeGlobalUrl(projectId, "targetHttpsProxies"),
      accessToken,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: proxyName,
          urlMap,
          certificateMap
        })
      }
    );
    await waitForComputeGlobalOperation(projectId, accessToken, payload?.name);
  }
  const urlMapPayload = await requestGoogleJson(
    `${buildComputeGlobalUrl(projectId, "targetHttpsProxies", proxyName)}/setUrlMap`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        urlMap
      })
    }
  );
  await waitForComputeGlobalOperation(projectId, accessToken, urlMapPayload?.name);
  const updatePayload = await requestGoogleJson(
    `${buildComputeGlobalUrl(projectId, "targetHttpsProxies", proxyName)}/setCertificateMap`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        certificateMap
      })
    }
  );
  return waitForComputeGlobalOperation(projectId, accessToken, updatePayload?.name);
}

export async function createGlobalForwardingRule(projectId, ruleName, addressName, proxyName, accessToken) {
  const payload = await requestGoogleJson(
    buildComputeGlobalUrl(projectId, "forwardingRules"),
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: ruleName,
        IPAddress: buildComputeGlobalUrl(projectId, "addresses", addressName),
        IPProtocol: "TCP",
        loadBalancingScheme: "EXTERNAL_MANAGED",
        networkTier: "PREMIUM",
        portRange: "443",
        target: buildComputeGlobalUrl(projectId, "targetHttpsProxies", proxyName)
      })
    }
  );
  return waitForComputeGlobalOperation(projectId, accessToken, payload?.name);
}

function normalizeRecord(name, type, ttl, rrdatas) {
  return {
    name,
    type,
    ttl,
    rrdatas: [...new Set(rrdatas.filter(Boolean))]
  };
}

function recordsEqual(left, right) {
  return (
    left?.name === right?.name &&
    left?.type === right?.type &&
    Number(left?.ttl ?? 0) === Number(right?.ttl ?? 0) &&
    JSON.stringify([...(left?.rrdatas ?? [])].sort()) === JSON.stringify([...(right?.rrdatas ?? [])].sort())
  );
}

export async function upsertDnsRecord(projectId, zoneName, record, accessToken) {
  const existingRecords = await listDnsRecordSets(projectId, zoneName, accessToken, record.name, record.type);
  const current = existingRecords.find((entry) => entry.name === record.name && entry.type === record.type) ?? null;
  const desired = normalizeRecord(record.name, record.type, record.ttl ?? 300, record.rrdatas ?? []);
  if (current && recordsEqual(current, desired)) {
    return {
      changed: false
    };
  }

  const payload = await requestGoogleJson(buildManagedZoneChangesUrl(projectId, zoneName), accessToken, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      additions: [desired],
      deletions: current ? [current] : []
    })
  });
  return {
    changed: true,
    change: payload
  };
}
