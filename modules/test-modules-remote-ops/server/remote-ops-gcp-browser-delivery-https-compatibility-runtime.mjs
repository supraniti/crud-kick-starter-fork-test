import { normalizeOptionalText, normalizeTargetConfig } from "./remote-ops-shared-runtime.mjs";
import { buildTemporaryStorageBaseUrl } from "../shared/browser-delivery-support.mjs";
import {
  buildExpectedUrlMapDefinition,
  buildBrowserDeliveryDnsInstructions,
  buildBrowserDeliveryPublicMediaBaseUrl,
  loadBackendBucket,
  loadCertificate,
  loadCertificateMap,
  loadCertificateMapEntry,
  loadDnsAuthorization,
  loadDnsZone,
  loadGlobalAddress,
  loadGlobalForwardingRule,
  loadTargetHttpsProxy,
  loadUrlMap,
  listDnsRecordSets,
  resolveBrowserDeliveryManagedNames,
  validateBrowserDeliveryStackCompatibility
} from "./remote-ops-gcp-browser-delivery-stack-runtime.mjs";

function normalizeUrlMapMatchRule(rule = {}) {
  return {
    fullPathMatch: normalizeOptionalText(rule?.fullPathMatch),
    prefixMatch: normalizeOptionalText(rule?.prefixMatch),
    pathTemplateMatch: normalizeOptionalText(rule?.pathTemplateMatch)
  };
}

function normalizeUrlMapRouteRule(rule = {}) {
  return {
    priority: Number(rule?.priority ?? 0),
    service: normalizeOptionalText(rule?.service),
    matchRules: Array.isArray(rule?.matchRules)
      ? rule.matchRules.map(normalizeUrlMapMatchRule).sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right))
        )
      : [],
    routeAction: {
      urlRewrite: {
        pathPrefixRewrite: normalizeOptionalText(rule?.routeAction?.urlRewrite?.pathPrefixRewrite),
        pathTemplateRewrite: normalizeOptionalText(rule?.routeAction?.urlRewrite?.pathTemplateRewrite)
      }
    }
  };
}

function normalizeUrlMapPathMatcher(pathMatcher = {}) {
  return {
    name: normalizeOptionalText(pathMatcher?.name),
    defaultService: normalizeOptionalText(pathMatcher?.defaultService),
    routeRules: Array.isArray(pathMatcher?.routeRules)
      ? pathMatcher.routeRules
          .map(normalizeUrlMapRouteRule)
          .sort((left, right) => left.priority - right.priority || JSON.stringify(left).localeCompare(JSON.stringify(right)))
      : []
  };
}

function normalizeUrlMapForComparison(urlMap = {}) {
  return {
    defaultService: normalizeOptionalText(urlMap?.defaultService),
    hostRules: Array.isArray(urlMap?.hostRules)
      ? urlMap.hostRules
          .map((entry) => ({
            hosts: Array.isArray(entry?.hosts) ? [...entry.hosts].sort() : [],
            pathMatcher: normalizeOptionalText(entry?.pathMatcher)
          }))
          .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
      : [],
    pathMatchers: Array.isArray(urlMap?.pathMatchers)
      ? urlMap.pathMatchers
          .map(normalizeUrlMapPathMatcher)
          .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
      : []
  };
}

function isUrlMapShapeCompatible(actualUrlMap, expectedUrlMap) {
  return JSON.stringify(normalizeUrlMapForComparison(actualUrlMap)) === JSON.stringify(normalizeUrlMapForComparison(expectedUrlMap));
}

function isInspectablePermissionFailure(error) {
  const statusCode = Number(error?.statusCode ?? 0);
  const message = String(error?.message ?? "").toLowerCase();
  return (
    statusCode === 403 ||
    message.includes("permission") ||
    message.includes("forbidden") ||
    message.includes("not authorized")
  );
}

async function inspectBrowserHttpsResource({
  report,
  kind,
  label,
  resourceName,
  loader,
  action,
  notes = []
}) {
  try {
    const resource = await loader();
    report.resourceChecks.push({
      kind,
      state: "present",
      label,
      resourceName: resource?.name ?? resourceName
    });
    return resource;
  } catch (error) {
    if (error?.statusCode === 404) {
      report.missingResources.push({
        kind,
        label,
        resourceName
      });
      if (action) {
        report.provisionableActions.push(action);
      }
      return null;
    }
    if (action && isInspectablePermissionFailure(error)) {
      report.resourceChecks.push({
        kind,
        state: "unknown",
        label,
        resourceName,
        details: error?.message ?? `Unable to inspect ${kind} before provisioning`
      });
      report.missingResources.push({
        kind,
        label,
        resourceName
      });
      report.provisionableActions.push(action);
      return null;
    }
    report.resourceChecks.push({
      kind,
      state: "error",
      label,
      resourceName,
      details: error?.message ?? `Failed to inspect ${kind}`
    });
    if (notes.length > 0) {
      report.configurationWarnings.push(...notes);
    }
    return null;
  }
}

function buildHttpsDeliveryReport({ targetProfile, descriptor, dnsInstructions = [], nameServers = [] }) {
  return {
    targetId: targetProfile.id,
    title: targetProfile.title,
    ...descriptor,
    dnsInstructions,
    nameServers
  };
}

function buildBrowserDeliveryActionId(targetProfile, suffix) {
  return `browser-delivery-${targetProfile.id}-${suffix}`;
}

function buildHttpsAction({
  buildProvisioningAction,
  targetProfile,
  suffix,
  label,
  resourceKind,
  notes,
  projectPermissions,
  provisionGroup,
  requiredPermissions = null,
  linkedTargetId = null
}) {
  return buildProvisioningAction({
    id: buildBrowserDeliveryActionId(targetProfile, suffix),
    label,
    resourceKind,
    targetId: targetProfile.id,
    linkedTargetId,
    notes,
    permissionGroup: provisionGroup,
    projectPermissions,
    requiredPermissions
  });
}

function getBrowserProvisionGroup(bundle) {
  return bundle.permissionGroups.find((group) => group.id === "browser-delivery-provision") ?? null;
}

async function inspectHttpsManagedResource({
  report,
  buildProvisioningAction,
  targetProfile,
  suffix,
  label,
  actionLabel,
  resourceKind,
  resourceName,
  loader,
  notes,
  projectPermissions,
  provisionGroup,
  requiredPermissions = null,
  linkedTargetId = null
}) {
  return inspectBrowserHttpsResource({
    report,
    kind: resourceKind,
    label,
    resourceName,
    loader,
    action: buildHttpsAction({
      buildProvisioningAction,
      targetProfile,
      suffix,
      label: actionLabel,
      resourceKind,
      notes,
      projectPermissions,
      provisionGroup,
      requiredPermissions,
      linkedTargetId
    })
  });
}

async function inspectHttpsApis({
  report,
  config,
  project,
  accessToken,
  analyzeOptionalBrowserApi,
  provisionGroup,
  projectPermissions,
  targetProfile
}) {
  const dnsRequired = config.dnsMode === "gcp-managed";
  const apiContext = {
    provisionGroup,
    projectPermissions,
    targetId: targetProfile?.id ?? null,
    targetTitle: targetProfile?.title ?? "Browser delivery"
  };
  await analyzeOptionalBrowserApi(report, "dns.googleapis.com", dnsRequired, project, accessToken, apiContext);
  await analyzeOptionalBrowserApi(report, "certificatemanager.googleapis.com", true, project, accessToken, apiContext);
  await analyzeOptionalBrowserApi(report, "compute.googleapis.com", true, project, accessToken, apiContext);
  return dnsRequired;
}

async function inspectHttpsDnsResources({
  report,
  buildProvisioningAction,
  targetProfile,
  config,
  project,
  accessToken,
  names,
  projectPermissions,
  provisionGroup,
  dnsRequired
}) {
  const dnsZone = dnsRequired
    ? await inspectHttpsManagedResource({
        report,
        buildProvisioningAction,
        targetProfile,
        suffix: "dns-zone",
        label: `${targetProfile.title} DNS zone`,
        actionLabel: `Create DNS zone '${names.dnsZoneName}'`,
        resourceKind: "dns-zone",
        resourceName: names.dnsZoneName,
        loader: () => loadDnsZone(project.projectId, names.dnsZoneName, accessToken),
        notes: [`Manage zone '${names.dnsZoneDnsName ?? config.hostname ?? "hostname"}' on GCP.`],
        projectPermissions,
        provisionGroup,
        requiredPermissions: ["dns.managedZones.create"]
      })
    : null;

  const dnsAuthorization = await inspectHttpsManagedResource({
    report,
    buildProvisioningAction,
    targetProfile,
    suffix: "dns-authorization",
    label: `${targetProfile.title} DNS authorization`,
    actionLabel: `Create DNS authorization '${names.dnsAuthorizationName}'`,
    resourceKind: "dns-authorization",
    resourceName: names.dnsAuthorizationName,
    loader: () => loadDnsAuthorization(project.projectId, names.dnsAuthorizationName, accessToken),
    notes: ["Required for the Google-managed HTTPS certificate."],
    projectPermissions,
    provisionGroup,
    requiredPermissions: ["certificatemanager.dnsauthorizations.create"]
  });

  return {
    dnsZone,
    dnsAuthorization
  };
}

async function inspectHttpsCertificateResources({
  report,
  buildProvisioningAction,
  targetProfile,
  project,
  accessToken,
  names,
  projectPermissions,
  provisionGroup
}) {
  const certificate = await inspectHttpsManagedResource({
    report,
    buildProvisioningAction,
    targetProfile,
    suffix: "managed-certificate",
    label: `${targetProfile.title} certificate`,
    actionLabel: `Create managed certificate '${names.certificateName}'`,
    resourceKind: "managed-certificate",
    resourceName: names.certificateName,
    loader: () => loadCertificate(project.projectId, names.certificateName, accessToken),
    notes: ["Requires DNS authorization before the certificate becomes active."],
    projectPermissions,
    provisionGroup,
    requiredPermissions: ["certificatemanager.certs.create"]
  });

  await inspectHttpsManagedResource({
    report,
    buildProvisioningAction,
    targetProfile,
    suffix: "certificate-map",
    label: `${targetProfile.title} certificate map`,
    actionLabel: `Create certificate map '${names.certificateMapName}'`,
    resourceKind: "certificate-map",
    resourceName: names.certificateMapName,
    loader: () => loadCertificateMap(project.projectId, names.certificateMapName, accessToken),
    notes: ["Links the managed certificate to the HTTPS proxy."],
    projectPermissions,
    provisionGroup,
    requiredPermissions: ["certificatemanager.certmaps.create"]
  });

  await inspectHttpsManagedResource({
    report,
    buildProvisioningAction,
    targetProfile,
    suffix: "certificate-map-entry",
    label: `${targetProfile.title} certificate map entry`,
    actionLabel: `Create certificate map entry '${names.certificateMapEntryName}'`,
    resourceKind: "certificate-map-entry",
    resourceName: names.certificateMapEntryName,
    loader: () =>
      loadCertificateMapEntry(project.projectId, names.certificateMapName, names.certificateMapEntryName, accessToken),
    notes: ["Binds the hostname to the managed certificate."],
    projectPermissions,
    provisionGroup,
    requiredPermissions: ["certificatemanager.certmapentries.create"]
  });

  return certificate;
}

async function inspectHttpsOriginsAndRouting({
  report,
  buildProvisioningAction,
  targetProfile,
  config,
  project,
  accessToken,
  names,
  projectPermissions,
  provisionGroup,
  deploymentTarget,
  mediaTarget
}) {
  const globalAddress = await inspectHttpsManagedResource({
    report,
    buildProvisioningAction,
    targetProfile,
    suffix: "global-address",
    label: `${targetProfile.title} global address`,
    actionLabel: `Reserve global address '${names.globalAddressName}'`,
    resourceKind: "global-address",
    resourceName: names.globalAddressName,
    loader: () => loadGlobalAddress(project.projectId, names.globalAddressName, accessToken),
    notes: ["Required for the public HTTPS hostname."],
    projectPermissions,
    provisionGroup,
    requiredPermissions: ["compute.globalAddresses.create"]
  });

  const deploymentBucketName = normalizeOptionalText(deploymentTarget?.config?.bucketName);
  if (!deploymentBucketName) {
    report.configurationWarnings.push(`${targetProfile.title}: linked deployment bucket is missing.`);
  } else {
    await inspectHttpsManagedResource({
      report,
      buildProvisioningAction,
      targetProfile,
      suffix: "deployment-backend-bucket",
      label: `${targetProfile.title} deployment backend bucket`,
      actionLabel: `Create deployment backend bucket '${names.deploymentBackendBucketName}'`,
      resourceKind: "deployment-backend-bucket",
      resourceName: names.deploymentBackendBucketName,
      loader: () => loadBackendBucket(project.projectId, names.deploymentBackendBucketName, accessToken),
      notes: [`Link deployment bucket '${deploymentBucketName}' into the HTTPS delivery stack.`],
      projectPermissions,
      provisionGroup,
      requiredPermissions: ["compute.backendBuckets.create"],
      linkedTargetId: deploymentTarget?.id ?? null
    });
  }

  const mediaBucketName = normalizeOptionalText(mediaTarget?.config?.bucketName);
  if (mediaBucketName) {
    await inspectHttpsManagedResource({
      report,
      buildProvisioningAction,
      targetProfile,
      suffix: "media-backend-bucket",
      label: `${targetProfile.title} media backend bucket`,
      actionLabel: `Create media backend bucket '${names.mediaBackendBucketName}'`,
      resourceKind: "media-backend-bucket",
      resourceName: names.mediaBackendBucketName,
      loader: () => loadBackendBucket(project.projectId, names.mediaBackendBucketName, accessToken),
      notes: [`Link media bucket '${mediaBucketName}' into the HTTPS delivery stack.`],
      projectPermissions,
      provisionGroup,
      requiredPermissions: ["compute.backendBuckets.create"],
      linkedTargetId: mediaTarget?.id ?? null
    });
  }

  const expectedUrlMap = buildExpectedUrlMapDefinition(
    project.projectId,
    names.urlMapName,
    config.hostname,
    deploymentTarget,
    names.deploymentBackendBucketName,
    mediaTarget,
    names.mediaBackendBucketName
  );
  const urlMapNotes = ["Routes the hostname to deployment and optional media backend buckets."];
  try {
    const urlMap = await loadUrlMap(project.projectId, names.urlMapName, accessToken);
    if (!isUrlMapShapeCompatible(urlMap, expectedUrlMap)) {
      report.resourceChecks.push({
        kind: "url-map",
        state: "drifted",
        label: `${targetProfile.title} URL map`,
        resourceName: names.urlMapName,
        details: "Existing URL map does not match the required route rules for the current browser-delivery contract."
      });
      report.missingResources.push({
        kind: "url-map",
        label: `${targetProfile.title} URL map`,
        resourceName: names.urlMapName
      });
      report.provisionableActions.push(
        buildHttpsAction({
          buildProvisioningAction,
          targetProfile,
          suffix: "url-map",
          label: `Create or update URL map '${names.urlMapName}'`,
          resourceKind: "url-map",
          notes: urlMapNotes,
          projectPermissions,
          provisionGroup,
          requiredPermissions: ["compute.urlMaps.create", "compute.urlMaps.update"]
        })
      );
    } else {
      report.resourceChecks.push({
        kind: "url-map",
        state: "present",
        label: `${targetProfile.title} URL map`,
        resourceName: urlMap?.name ?? names.urlMapName
      });
    }
  } catch (error) {
    if (error?.statusCode === 404) {
      report.missingResources.push({
        kind: "url-map",
        label: `${targetProfile.title} URL map`,
        resourceName: names.urlMapName
      });
      report.provisionableActions.push(
        buildHttpsAction({
          buildProvisioningAction,
          targetProfile,
          suffix: "url-map",
          label: `Create or update URL map '${names.urlMapName}'`,
          resourceKind: "url-map",
          notes: urlMapNotes,
          projectPermissions,
          provisionGroup,
          requiredPermissions: ["compute.urlMaps.create", "compute.urlMaps.update"]
        })
      );
    } else if (isInspectablePermissionFailure(error)) {
      report.resourceChecks.push({
        kind: "url-map",
        state: "unknown",
        label: `${targetProfile.title} URL map`,
        resourceName: names.urlMapName,
        details: error?.message ?? "Unable to inspect url-map before provisioning"
      });
      report.missingResources.push({
        kind: "url-map",
        label: `${targetProfile.title} URL map`,
        resourceName: names.urlMapName
      });
      report.provisionableActions.push(
        buildHttpsAction({
          buildProvisioningAction,
          targetProfile,
          suffix: "url-map",
          label: `Create or update URL map '${names.urlMapName}'`,
          resourceKind: "url-map",
          notes: urlMapNotes,
          projectPermissions,
          provisionGroup,
          requiredPermissions: ["compute.urlMaps.create", "compute.urlMaps.update"]
        })
      );
    } else {
      report.resourceChecks.push({
        kind: "url-map",
        state: "error",
        label: `${targetProfile.title} URL map`,
        resourceName: names.urlMapName,
        details: error?.message ?? "Failed to inspect url-map"
      });
    }
  }

  await inspectHttpsManagedResource({
    report,
    buildProvisioningAction,
    targetProfile,
    suffix: "https-proxy",
    label: `${targetProfile.title} HTTPS proxy`,
    actionLabel: `Create HTTPS proxy '${names.httpsProxyName}'`,
    resourceKind: "https-proxy",
    resourceName: names.httpsProxyName,
    loader: () => loadTargetHttpsProxy(project.projectId, names.httpsProxyName, accessToken),
    notes: ["Terminates HTTPS and attaches the managed certificate map."],
    projectPermissions,
    provisionGroup,
    requiredPermissions: ["compute.targetHttpsProxies.create"]
  });

  await inspectHttpsManagedResource({
    report,
    buildProvisioningAction,
    targetProfile,
    suffix: "https-forwarding-rule",
    label: `${targetProfile.title} HTTPS forwarding rule`,
    actionLabel: `Create HTTPS forwarding rule '${names.httpsForwardingRuleName}'`,
    resourceKind: "https-forwarding-rule",
    resourceName: names.httpsForwardingRuleName,
    loader: () => loadGlobalForwardingRule(project.projectId, names.httpsForwardingRuleName, accessToken),
    notes: ["Publishes the hostname on TCP 443 using the reserved global IP."],
    projectPermissions,
    provisionGroup,
    requiredPermissions: ["compute.globalForwardingRules.create"]
  });

  return globalAddress;
}

function appendHttpsDeliveryReport({
  report,
  targetProfile,
  descriptor,
  config,
  mediaTarget,
  deploymentTarget,
  dnsZone,
  dnsAuthorization,
  globalAddress
}) {
  report.deliveryReports.push(
    buildHttpsDeliveryReport({
      targetProfile,
      descriptor: {
        ...descriptor,
        publicMediaBaseUrl: buildBrowserDeliveryPublicMediaBaseUrl(config, mediaTarget),
        temporaryDeploymentBaseUrl: buildTemporaryStorageBaseUrl(
          deploymentTarget?.config?.bucketName,
          deploymentTarget?.config?.prefix
        ),
        temporaryMediaBaseUrl: buildTemporaryStorageBaseUrl(
          mediaTarget?.config?.bucketName,
          mediaTarget?.config?.prefix
        )
      },
      dnsInstructions: buildBrowserDeliveryDnsInstructions({
        config,
        globalAddress,
        dnsAuthorization,
        dnsZone
      }),
      nameServers: Array.isArray(dnsZone?.nameServers) ? dnsZone.nameServers : []
    })
  );
}

async function inspectManagedZoneRecords({
  report,
  buildProvisioningAction,
  targetProfile,
  config,
  project,
  accessToken,
  dnsZone,
  globalAddress,
  dnsAuthorization,
  provisionGroup,
  projectPermissions
}) {
  if (!dnsZone || config.dnsMode !== "gcp-managed") {
    return;
  }
  const hostname = normalizeOptionalText(config.hostname);
  if (hostname && globalAddress?.address) {
    const trafficRecords = await listDnsRecordSets(
      project.projectId,
      dnsZone.name,
      accessToken,
      `${hostname}.`,
      "A"
    );
    const hasTrafficRecord = trafficRecords.some((entry) =>
      Array.isArray(entry?.rrdatas) && entry.rrdatas.includes(globalAddress.address)
    );
    if (!hasTrafficRecord) {
      report.missingResources.push({
        kind: "dns-a-record",
        label: `${targetProfile.title} traffic A record`,
        resourceName: `${hostname}.`
      });
      report.provisionableActions.push(
        buildHttpsAction({
          buildProvisioningAction,
          targetProfile,
          suffix: "dns-a-record",
          label: `Create traffic A record for '${hostname}'`,
          resourceKind: "dns-a-record",
          notes: [`Point '${hostname}' to reserved global IP '${globalAddress.address}'.`],
          projectPermissions,
          provisionGroup,
          requiredPermissions: ["dns.changes.create"]
        })
      );
    }
  }
  const dnsRecord = dnsAuthorization?.dnsResourceRecord;
  if (dnsRecord?.name && dnsRecord?.type && dnsRecord?.data) {
    const authRecords = await listDnsRecordSets(
      project.projectId,
      dnsZone.name,
      accessToken,
      dnsRecord.name,
      dnsRecord.type
    );
    const hasAuthRecord = authRecords.some((entry) =>
      Array.isArray(entry?.rrdatas) && entry.rrdatas.includes(dnsRecord.data)
    );
    if (!hasAuthRecord) {
      report.missingResources.push({
        kind: "dns-authorization-record",
        label: `${targetProfile.title} certificate authorization record`,
        resourceName: dnsRecord.name
      });
      report.provisionableActions.push(
        buildHttpsAction({
          buildProvisioningAction,
          targetProfile,
          suffix: "dns-authorization-record",
          label: `Create certificate authorization record for '${targetProfile.title}'`,
          resourceKind: "dns-authorization-record",
          notes: [`Publish ${dnsRecord.type} ${dnsRecord.name} -> ${dnsRecord.data}.`],
          projectPermissions,
          provisionGroup,
          requiredPermissions: ["dns.changes.create"]
        })
      );
    }
  }
}

export async function inspectHttpsBrowserTarget({
  report,
  bundle,
  buildProvisioningAction,
  analyzeOptionalBrowserApi,
  targetProfile,
  project,
  accessToken,
  projectPermissions,
  deploymentTarget,
  mediaTarget,
  descriptor
}) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const names = resolveBrowserDeliveryManagedNames(targetProfile, config);
  const provisionGroup = getBrowserProvisionGroup(bundle);
  const stackWarnings = validateBrowserDeliveryStackCompatibility({
    config,
    deploymentTarget,
    mediaTarget,
    reportTitle: targetProfile.title
  });
  report.configurationWarnings.push(...stackWarnings);

  const dnsRequired = await inspectHttpsApis({
    report,
    config,
    project,
    accessToken,
    analyzeOptionalBrowserApi,
    provisionGroup,
    projectPermissions,
    targetProfile
  });
  const { dnsZone, dnsAuthorization } = await inspectHttpsDnsResources({
    report,
    buildProvisioningAction,
    targetProfile,
    config,
    project,
    accessToken,
    names,
    projectPermissions,
    provisionGroup,
    dnsRequired
  });
  const certificate = await inspectHttpsCertificateResources({
    report,
    buildProvisioningAction,
    targetProfile,
    project,
    accessToken,
    names,
    projectPermissions,
    provisionGroup
  });
  const globalAddress = await inspectHttpsOriginsAndRouting({
    report,
    buildProvisioningAction,
    targetProfile,
    config,
    project,
    accessToken,
    names,
    projectPermissions,
    provisionGroup,
    deploymentTarget,
    mediaTarget
  });

  await inspectManagedZoneRecords({
    report,
    buildProvisioningAction,
    targetProfile,
    config,
    project,
    accessToken,
    dnsZone,
    globalAddress,
    dnsAuthorization,
    provisionGroup,
    projectPermissions
  });
  appendHttpsDeliveryReport({
    report,
    targetProfile,
    descriptor,
    config,
    mediaTarget,
    deploymentTarget,
    dnsZone,
    dnsAuthorization,
    globalAddress
  });
  report.notes.push(
    `${targetProfile.title}: HTTPS load-balancer mode uses linked storage targets only as origins; browser traffic flows through managed delivery resources.`
  );
  if (certificate?.managed?.state && certificate.managed.state !== "ACTIVE") {
    report.configurationWarnings.push(
      `${targetProfile.title}: managed certificate state is '${certificate.managed.state}'. HTTPS may not be ready yet.`
    );
  }
}

