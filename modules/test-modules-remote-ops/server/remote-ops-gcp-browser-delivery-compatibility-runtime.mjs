import { requestGoogleJson } from "./remote-ops-live-google-runtime.mjs";
import { normalizeOptionalText, normalizeTargetConfig } from "./remote-ops-shared-runtime.mjs";
import { buildBrowserDeliveryDescriptor } from "../shared/browser-delivery-support.mjs";
import { inspectHttpsBrowserTarget } from "./remote-ops-gcp-browser-delivery-https-compatibility-runtime.mjs";

function createInstruction(permissionGroup) {
  return {
    label: permissionGroup?.label ?? "Missing permissions",
    guidance: permissionGroup?.guidance ?? "Grant the required permissions and retry.",
    permissions: permissionGroup?.permissions ?? []
  };
}

function createApiEntry(serviceName, state, details = null) {
  return {
    serviceName,
    state,
    details
  };
}

function updateBundleState(report) {
  if (report.permissionDiagnostics.length > 0) {
    report.state = "blocked";
    return report;
  }
  if (report.missingResources.length > 0 || report.configurationWarnings.length > 0) {
    report.state = "action-required";
    return report;
  }
  report.state = "compatible";
  return report;
}

async function analyzeOptionalBrowserApi(
  report,
  serviceName,
  shouldInspect,
  project,
  accessToken,
  {
    provisionGroup = null,
    projectPermissions = new Set(),
    targetId = null,
    targetTitle = "Browser delivery"
  } = {}
) {
  if (!shouldInspect) {
    report.requiredApis = report.requiredApis.map((entry) =>
      entry.serviceName === serviceName
        ? createApiEntry(serviceName, "not-required", "Not required for the current browser-delivery mode.")
        : entry
    );
    return;
  }

  try {
    const service = await requestGoogleJson(
      `https://serviceusage.googleapis.com/v1/projects/${project.projectNumber}/services/${serviceName}`,
      accessToken
    );
    const isEnabled = service?.state === "ENABLED";
    report.requiredApis = report.requiredApis.map((entry) =>
      entry.serviceName === serviceName
        ? createApiEntry(serviceName, isEnabled ? "enabled" : "disabled", service?.state ?? null)
        : entry
    );
    if (!isEnabled) {
      report.missingResources.push({
        kind: "api",
        label: `Enable ${serviceName}`,
        serviceName
      });
      report.provisionableActions.push(
        buildProvisioningAction({
          id: `enable-${serviceName}`,
          label: `Enable ${serviceName}`,
          resourceKind: "api",
          targetId,
          notes: [`${targetTitle} requires ${serviceName}.`],
          permissionGroup: provisionGroup,
          projectPermissions,
          requiredPermissions: ["serviceusage.services.enable"]
        })
      );
    }
  } catch (error) {
    report.requiredApis = report.requiredApis.map((entry) =>
      entry.serviceName === serviceName
        ? createApiEntry(serviceName, "error", error?.message ?? "Failed to inspect API state")
        : entry
    );
  }
}

async function loadStorageBucket(bucketName, accessToken) {
  return requestGoogleJson(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}`,
    accessToken
  );
}

async function loadBucketIamPolicy(bucketName, accessToken) {
  return requestGoogleJson(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/iam`,
    accessToken
  );
}

function buildActionAvailability(permissionGroup, projectPermissions, requiredPermissions = null) {
  const permissions = Array.isArray(requiredPermissions) && requiredPermissions.length > 0
    ? requiredPermissions
    : permissionGroup?.permissions ?? [];
  if (permissions.length === 0) {
    return {
      availableNow: false,
      missingPermissions: []
    };
  }
  const missingPermissions = permissions.filter(
    (permission) => !projectPermissions.has(permission)
  );
  return {
    availableNow: missingPermissions.length === 0,
    missingPermissions
  };
}

function buildProvisioningAction({
  id,
  label,
  resourceKind,
  targetId,
  linkedTargetId = null,
  notes = [],
  permissionGroup,
  projectPermissions,
  requiredPermissions = null
}) {
  const availability = buildActionAvailability(permissionGroup, projectPermissions, requiredPermissions);
  return {
    id,
    label,
    resourceKind,
    targetId,
    linkedTargetId,
    createSupported: true,
    phaseStatus: "execution-started",
    availableNow: availability.availableNow,
    missingPermissions: availability.missingPermissions,
    notes
  };
}

function hasPublicObjectViewerBinding(policy = {}) {
  const bindings = Array.isArray(policy?.bindings) ? policy.bindings : [];
  return bindings.some((binding) => {
    const role = String(binding?.role ?? "");
    const members = Array.isArray(binding?.members) ? binding.members : [];
    if (!members.includes("allUsers")) {
      return false;
    }
    return role === "roles/storage.objectViewer" || role === "roles/storage.legacyObjectReader";
  });
}

function findTargetById(targetProfiles, targetId) {
  const normalizedTargetId = normalizeOptionalText(targetId);
  if (!normalizedTargetId) {
    return null;
  }
  return targetProfiles.find((targetProfile) => targetProfile.id === normalizedTargetId) ?? null;
}

async function inspectDirectStorageLinkedBucket({
  report,
  label,
  bucketName,
  requireWebsite,
  actionIdPrefix,
  targetId,
  linkedTargetId,
  accessToken,
  projectPermissions,
  inspectPermissionGroup,
  provisionPermissionGroup
}) {
  const normalizedBucketName = normalizeOptionalText(bucketName);
  if (!normalizedBucketName) {
    report.configurationWarnings.push(`${label}: linked bucket is not configured.`);
    return;
  }

  let bucket;
  try {
    bucket = await loadStorageBucket(normalizedBucketName, accessToken);
    report.resourceChecks.push({
      kind: "bucket",
      state: "present",
      label,
      bucketName: normalizedBucketName
    });
  } catch (error) {
    report.resourceChecks.push({
      kind: "bucket",
      state: error?.statusCode === 404 ? "missing" : "error",
      label,
      bucketName: normalizedBucketName,
      details: error?.message ?? "Failed to inspect bucket"
    });
    return;
  }

  if (requireWebsite && bucket?.website?.mainPageSuffix !== "index.html") {
    report.missingResources.push({
      kind: "bucket-website",
      label: `${label} website main page suffix`,
      bucketName: normalizedBucketName
    });
    report.provisionableActions.push(
      buildProvisioningAction({
        id: `${actionIdPrefix}-website`,
        label: `Configure website settings on '${normalizedBucketName}'`,
        resourceKind: "bucket-website",
        targetId,
        linkedTargetId,
        notes: ["Set main page suffix to index.html for direct browser delivery."],
        permissionGroup: provisionPermissionGroup,
        projectPermissions,
        requiredPermissions: ["storage.buckets.update"]
      })
    );
  }

  try {
    const policy = await loadBucketIamPolicy(normalizedBucketName, accessToken);
    if (!hasPublicObjectViewerBinding(policy)) {
      report.missingResources.push({
        kind: "public-read",
        label: `${label} public object read`,
        bucketName: normalizedBucketName
      });
      report.provisionableActions.push(
        buildProvisioningAction({
          id: `${actionIdPrefix}-public-read`,
          label: `Enable public object read on '${normalizedBucketName}'`,
          resourceKind: "public-read",
          targetId,
          linkedTargetId,
          notes: ["Required for browser clients to fetch deployed HTML or media directly."],
          permissionGroup: provisionPermissionGroup,
          projectPermissions,
          requiredPermissions: ["storage.buckets.setIamPolicy"]
        })
      );
    }
  } catch (_error) {
    report.permissionDiagnostics.push({
      kind: "permission-missing",
      summary: `${label}: service account cannot inspect bucket IAM policy.`,
      instruction: createInstruction(inspectPermissionGroup),
      missingPermissions: inspectPermissionGroup?.permissions ?? []
    });
  }
}

async function inspectBrowserTarget({
  report,
  bundle,
  targetProfile,
  targetProfiles,
  project,
  accessToken,
  projectPermissions
}) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const deploymentTarget = findTargetById(targetProfiles, config.deploymentTargetProfileId);
  const mediaTarget = findTargetById(targetProfiles, config.mediaTargetProfileId);
  const descriptor = buildBrowserDeliveryDescriptor({
    browserTarget: {
      ...targetProfile,
      config
    },
    deploymentTarget,
    mediaTarget,
    pagePath: "/posts/example-post",
    artifactRelativePath: "posts/example-post/index.html"
  });

  report.configurationWarnings.push(
    ...descriptor.warnings.map((warning) => `${targetProfile.title}: ${warning}`)
  );
  report.notes.push(...descriptor.notes.map((note) => `${targetProfile.title}: ${note}`));

  if (config.accessMode === "custom-domain" && config.stackMode === "https-load-balancer") {
    await inspectHttpsBrowserTarget({
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
    });
    return;
  }

  report.deliveryReports.push({
    targetId: targetProfile.id,
    title: targetProfile.title,
    ...descriptor
  });

  const dnsRequired = config.dnsMode === "gcp-managed" && Boolean(config.dnsZone);
  const certificateRequired = Boolean(config.certificateName);
  const urlMapRequired = Boolean(config.urlMapHint);

  await analyzeOptionalBrowserApi(report, "dns.googleapis.com", dnsRequired, project, accessToken);
  await analyzeOptionalBrowserApi(report, "certificatemanager.googleapis.com", certificateRequired, project, accessToken);
  await analyzeOptionalBrowserApi(report, "compute.googleapis.com", urlMapRequired, project, accessToken);

  const provisionGroup = bundle.permissionGroups.find((group) => group.id === "browser-delivery-provision") ?? null;
  const inspectGroup = bundle.permissionGroups.find((group) => group.id === "browser-delivery-inspect") ?? null;

  if (deploymentTarget?.targetKind === "deployment-storage") {
    const deploymentConfig = normalizeTargetConfig(deploymentTarget.config, deploymentTarget.targetKind);
    await inspectDirectStorageLinkedBucket({
      report,
      label: `${targetProfile.title} deployment bucket`,
      bucketName: deploymentConfig.bucketName,
      requireWebsite: config.accessMode === "custom-domain",
      actionIdPrefix: `browser-delivery-${targetProfile.id}-deployment`,
      targetId: targetProfile.id,
      linkedTargetId: deploymentTarget.id,
      accessToken,
      projectPermissions,
      inspectPermissionGroup: inspectGroup,
      provisionPermissionGroup: provisionGroup
    });
  }
  if (mediaTarget?.targetKind === "media-storage") {
    const mediaConfig = normalizeTargetConfig(mediaTarget.config, mediaTarget.targetKind);
    await inspectDirectStorageLinkedBucket({
      report,
      label: `${targetProfile.title} media bucket`,
      bucketName: mediaConfig.bucketName,
      requireWebsite: false,
      actionIdPrefix: `browser-delivery-${targetProfile.id}-media`,
      targetId: targetProfile.id,
      linkedTargetId: mediaTarget.id,
      accessToken,
      projectPermissions,
      inspectPermissionGroup: inspectGroup,
      provisionPermissionGroup: provisionGroup
    });
  }
}

export async function analyzeBrowserDeliveryBundle({
  report,
  bundle,
  targetProfiles,
  browserTargets,
  accessToken,
  projectPermissions,
  project,
  markBundleNotConfigured
}) {
  if (!Array.isArray(browserTargets) || browserTargets.length === 0) {
    report.requiredApis = bundle.requiredApis.map((serviceName) =>
      createApiEntry(serviceName, "not-configured", "No live browser-delivery target is configured yet.")
    );
    return markBundleNotConfigured(report, bundle);
  }

  report.requiredApis = bundle.requiredApis.map((serviceName) =>
    createApiEntry(serviceName, "not-required", "Not required for the current browser-delivery mode.")
  );
  for (const targetProfile of browserTargets) {
    await inspectBrowserTarget({
      report,
      bundle,
      targetProfile,
      targetProfiles,
      project,
      accessToken,
      projectPermissions
    });
  }
  return updateBundleState(report);
}
