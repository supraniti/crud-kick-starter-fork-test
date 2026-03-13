import { buildGcpProvisioningModel } from "./remote-ops-gcp-provisioning-model.mjs";
import { analyzeBrowserDeliveryBundle } from "./remote-ops-gcp-browser-delivery-compatibility-runtime.mjs";
import { requestGoogleJson } from "./remote-ops-live-google-runtime.mjs";
import { getServiceAccountAccessToken } from "./remote-ops-service-account-auth-runtime.mjs";
import { normalizeAdapterMode, normalizeOptionalText, normalizeTargetConfig } from "./remote-ops-shared-runtime.mjs";

function createInstruction(permissionGroup) {
  return {
    label: permissionGroup.label,
    guidance: permissionGroup.guidance,
    permissions: permissionGroup.permissions
  };
}

function createBundleReport(bundle, targets = []) {
  return {
    id: bundle.id,
    label: bundle.label,
    state: "unknown",
    targetCount: targets.length,
    targetRefs: targets.map((target) => ({
      id: target.id,
      title: target.title,
      targetKind: target.targetKind
    })),
    requiredApis: bundle.requiredApis.map((serviceName) => ({
      serviceName,
      state: "unknown"
    })),
    resourceChecks: [],
    permissionDiagnostics: [],
    provisionableActions: [],
    missingResources: [],
    configurationWarnings: [],
    costWarnings: bundle.costWarnings,
    notes: [],
    deliveryReports: []
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

function markBundleNotConfigured(report, bundle) {
  report.requiredApis = bundle.requiredApis.map((serviceName) =>
    createApiEntry(serviceName, "not-configured", "No live target is configured for this bundle yet.")
  );
  report.notes.push("No live target is configured for this bundle yet.");
  report.state = "compatible";
  return report;
}

function summarizeReport(connectionProfile, project, bundles, model) {
  const blockedCount = bundles.filter((bundle) => bundle.state === "blocked").length;
  const actionRequiredCount = bundles.filter((bundle) => bundle.state === "action-required").length;
  const compatibleCount = bundles.filter((bundle) => bundle.state === "compatible").length;
  const provisionableActions = bundles.flatMap((bundle) =>
    bundle.provisionableActions.map((action) => ({
      ...action,
      bundleId: bundle.id,
      bundleLabel: bundle.label
    }))
  );
  const missingResources = bundles.flatMap((bundle) =>
    bundle.missingResources.map((resource) => ({
      ...resource,
      bundleId: bundle.id,
      bundleLabel: bundle.label
    }))
  );

  return {
    provider: "gcp",
    analyzedOn: new Date().toISOString(),
    connectionId: connectionProfile.id,
    project,
    modelVersion: model.modelVersion,
    overallState: blockedCount > 0 ? "blocked" : actionRequiredCount > 0 ? "action-required" : "compatible",
    counts: {
      blockedBundles: blockedCount,
      actionRequiredBundles: actionRequiredCount,
      compatibleBundles: compatibleCount
    },
    bundles,
    provisionableActions,
    missingResources,
    safeguardRules: model.safeguardRules
  };
}

function mapProjectDescriptor(project) {
  const fromName = String(project?.name ?? "").match(/^projects\/(\d+)$/);
  return {
    projectId: normalizeOptionalText(project?.projectId),
    projectNumber: normalizeOptionalText(project?.projectNumber) ?? fromName?.[1] ?? null,
    displayName: normalizeOptionalText(project?.displayName) ?? normalizeOptionalText(project?.projectId),
    state: normalizeOptionalText(project?.state) ?? "STATE_UNSPECIFIED"
  };
}

async function loadProject(projectId, accessToken) {
  return requestGoogleJson(
    `https://cloudresourcemanager.googleapis.com/v3/projects/${encodeURIComponent(projectId)}`,
    accessToken
  );
}

async function testProjectPermissions(projectId, permissions, accessToken) {
  const uniquePermissions = [...new Set(permissions.filter(Boolean))];
  if (uniquePermissions.length === 0) {
    return new Set();
  }
  const payload = await requestGoogleJson(
    `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}:testIamPermissions`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        permissions: uniquePermissions
      })
    }
  );
  return new Set(Array.isArray(payload?.permissions) ? payload.permissions : []);
}

async function testBucketPermissions(bucketName, permissions, accessToken) {
  const uniquePermissions = [...new Set(permissions.filter(Boolean))];
  if (!bucketName || uniquePermissions.length === 0) {
    return new Set();
  }
  const params = new URLSearchParams();
  uniquePermissions.forEach((permission) => {
    params.append("permissions", permission);
  });
  const payload = await requestGoogleJson(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/iam/testPermissions?${params.toString()}`,
    accessToken
  );
  return new Set(Array.isArray(payload?.permissions) ? payload.permissions : []);
}

async function loadServiceStatus(projectNumber, serviceName, accessToken) {
  return requestGoogleJson(
    `https://serviceusage.googleapis.com/v1/projects/${projectNumber}/services/${serviceName}`,
    accessToken
  );
}

async function loadFirestoreDatabase(projectId, accessToken) {
  return requestGoogleJson(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)`,
    accessToken
  );
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

async function loadDnsZone(projectId, dnsZone, accessToken) {
  return requestGoogleJson(
    `https://dns.googleapis.com/dns/v1/projects/${encodeURIComponent(projectId)}/managedZones/${encodeURIComponent(dnsZone)}`,
    accessToken
  );
}

async function loadCertificate(projectId, certificateName, accessToken) {
  return requestGoogleJson(
    `https://certificatemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/global/certificates/${encodeURIComponent(certificateName)}`,
    accessToken
  );
}

async function loadUrlMap(projectId, urlMapHint, accessToken) {
  return requestGoogleJson(
    `https://compute.googleapis.com/compute/v1/projects/${encodeURIComponent(projectId)}/global/urlMaps/${encodeURIComponent(urlMapHint)}`,
    accessToken
  );
}

function findPermissionGroup(bundle, id) {
  return bundle.permissionGroups.find((group) => group.id === id) ?? null;
}

function getInspectPermissionGroup(bundle) {
  if (bundle.id === "firestore-projection") {
    return findPermissionGroup(bundle, "firestore-inspect");
  }
  if (bundle.id === "deployment-storage") {
    return findPermissionGroup(bundle, "storage-inspect");
  }
  if (bundle.id === "media-storage") {
    return findPermissionGroup(bundle, "media-inspect");
  }
  return findPermissionGroup(bundle, "browser-delivery-inspect");
}

function getProvisionPermissionGroup(bundle) {
  if (bundle.id === "firestore-projection") {
    return findPermissionGroup(bundle, "firestore-provision");
  }
  if (bundle.id === "deployment-storage") {
    return findPermissionGroup(bundle, "storage-provision");
  }
  if (bundle.id === "media-storage") {
    return findPermissionGroup(bundle, "media-provision");
  }
  return findPermissionGroup(bundle, "browser-delivery-provision");
}

function createMissingPermissionDiagnostic(permissionGroup, grantedPermissions, summary) {
  if (!permissionGroup) {
    return null;
  }
  const missingPermissions = permissionGroup.permissions.filter(
    (permission) => !grantedPermissions.has(permission)
  );
  if (missingPermissions.length === 0) {
    return null;
  }
  return {
    kind: "permission-missing",
    summary,
    instruction: createInstruction(permissionGroup),
    missingPermissions
  };
}

function createApiEntry(serviceName, state, details = null) {
  return {
    serviceName,
    state,
    details
  };
}

async function analyzeApiStates(bundle, report, project, accessToken, projectPermissions) {
  const inspectGroup = getInspectPermissionGroup(bundle);
  if (inspectGroup) {
    const diagnostic = createMissingPermissionDiagnostic(
      inspectGroup,
      projectPermissions,
      `Missing project permissions to inspect ${bundle.label.toLowerCase()}.`
    );
    if (diagnostic) {
      report.permissionDiagnostics.push(diagnostic);
      report.requiredApis = bundle.requiredApis.map((serviceName) =>
        createApiEntry(serviceName, "permission-denied", diagnostic.summary)
      );
      return false;
    }
  }

  for (const serviceName of bundle.requiredApis) {
    try {
      const service = await loadServiceStatus(project.projectNumber, serviceName, accessToken);
      const isEnabled = service?.state === "ENABLED";
      report.requiredApis = report.requiredApis.map((entry) =>
        entry.serviceName === serviceName
          ? createApiEntry(serviceName, isEnabled ? "enabled" : "disabled", service?.state ?? null)
          : entry
      );
      if (!isEnabled) {
        const provisionGroup = getProvisionPermissionGroup(bundle);
        report.missingResources.push({
          kind: "api",
          label: `Enable ${serviceName}`,
          serviceName
        });
        report.provisionableActions.push({
          id: `enable-${serviceName}`,
          label: `Enable ${serviceName}`,
          resourceKind: "api",
          createSupported: true,
          phaseStatus: "execution-started",
          availableNow: provisionGroup
            ? provisionGroup.permissions.every((permission) => projectPermissions.has(permission))
            : false,
          missingPermissions: provisionGroup
            ? provisionGroup.permissions.filter((permission) => !projectPermissions.has(permission))
            : [],
          notes: [`${bundle.label} requires ${serviceName}.`]
        });
      }
    } catch (error) {
      report.requiredApis = report.requiredApis.map((entry) =>
        entry.serviceName === serviceName
          ? createApiEntry(serviceName, "error", error?.message ?? "Failed to inspect API state")
          : entry
      );
      report.permissionDiagnostics.push({
        kind: "inspection-failed",
        summary: `Failed to inspect '${serviceName}'.`,
        instruction: {
          label: "Check API visibility",
          guidance: "Confirm the project exists and the service account can read Service Usage state.",
          permissions: ["serviceusage.services.get", "resourcemanager.projects.get"]
        },
        missingPermissions: []
      });
    }
  }

  return report.requiredApis.every((entry) => entry.state === "enabled");
}

function getLiveTargetsForBundle(targetProfiles, bundle) {
  const targetKinds = new Set(bundle.targetKinds);
  return targetProfiles.filter(
    (targetProfile) =>
      normalizeAdapterMode(targetProfile.adapterMode) === "live-gcp" &&
      targetKinds.has(targetProfile.targetKind)
  );
}

async function analyzeFirestoreBundle(report, bundle, targetProfiles, project, accessToken, projectPermissions) {
  if (targetProfiles.length === 0) {
    return markBundleNotConfigured(report, bundle);
  }
  const apiReady = await analyzeApiStates(bundle, report, project, accessToken, projectPermissions);
  if (!apiReady) {
    return updateBundleState(report);
  }

  try {
    const database = await loadFirestoreDatabase(project.projectId, accessToken);
    report.resourceChecks.push({
      kind: "firestore-database",
      state: "present",
      label: "Default Firestore database",
      resourceName: database?.name ?? `projects/${project.projectId}/databases/(default)`
    });
  } catch (error) {
    if (error?.statusCode === 404) {
      report.missingResources.push({
        kind: "firestore-database",
        label: "Default Firestore database"
      });
      const provisionGroup = findPermissionGroup(bundle, "firestore-provision");
      report.provisionableActions.push({
        id: "create-firestore-default-database",
        label: "Create default Firestore database",
        resourceKind: "firestore-database",
        createSupported: true,
        phaseStatus: "execution-started",
        availableNow: provisionGroup ? provisionGroup.permissions.every((permission) => projectPermissions.has(permission)) : false,
        missingPermissions: provisionGroup
          ? provisionGroup.permissions.filter((permission) => !projectPermissions.has(permission))
          : [],
        notes: [
          `Planned location: ${normalizeOptionalText(project.region) ?? "connection region or Google default"}.`
        ]
      });
    } else if (error?.statusCode === 403) {
      const permissionGroup = findPermissionGroup(bundle, "firestore-inspect");
      report.permissionDiagnostics.push({
        kind: "permission-missing",
        summary: "Missing permission to inspect the default Firestore database.",
        instruction: createInstruction(permissionGroup),
        missingPermissions: permissionGroup?.permissions ?? []
      });
    } else {
      report.resourceChecks.push({
        kind: "firestore-database",
        state: "error",
        label: "Default Firestore database",
        details: error?.message ?? "Failed to inspect Firestore database"
      });
    }
  }
  return updateBundleState(report);
}

function getStoragePermissionGroups(bundle) {
  return {
    syncGroup: findPermissionGroup(bundle, bundle.id === "media-storage" ? "media-sync" : "storage-sync"),
    provisionGroup: findPermissionGroup(
      bundle,
      bundle.id === "media-storage" ? "media-provision" : "storage-provision"
    )
  };
}

function createBucketProvisioningAction(targetProfile, config, provisionGroup, projectPermissions) {
  return {
    id: `create-bucket-${targetProfile.id}`,
    label: `Create bucket '${config.bucketName}'`,
    resourceKind: "bucket",
    targetId: targetProfile.id,
    createSupported: true,
    phaseStatus: "execution-started",
    availableNow: provisionGroup
      ? provisionGroup.permissions.every((permission) => projectPermissions.has(permission))
      : false,
    missingPermissions: provisionGroup
      ? provisionGroup.permissions.filter((permission) => !projectPermissions.has(permission))
      : [],
    notes: [`Configured prefix: ${config.prefix ?? "(root)"}`]
  };
}

async function inspectStorageTarget({
  report,
  targetProfile,
  accessToken,
  syncGroup,
  provisionGroup,
  projectPermissions
}) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const bucketName = normalizeOptionalText(config.bucketName);
  if (!bucketName) {
    report.configurationWarnings.push(`${targetProfile.title}: bucket name is not configured.`);
    return;
  }

  try {
    const bucket = await loadStorageBucket(bucketName, accessToken);
    report.resourceChecks.push({
      kind: "bucket",
      state: "present",
      label: targetProfile.title,
      bucketName: bucket.name
    });
    if (!syncGroup) {
      return;
    }
    const grantedBucketPermissions = await testBucketPermissions(bucketName, syncGroup.permissions, accessToken);
    const missingPermissions = syncGroup.permissions.filter(
      (permission) => !grantedBucketPermissions.has(permission)
    );
    if (missingPermissions.length > 0) {
      report.permissionDiagnostics.push({
        kind: "permission-missing",
        summary: `${targetProfile.title}: missing bucket permissions for sync.`,
        instruction: createInstruction(syncGroup),
        missingPermissions
      });
    }
    return;
  } catch (error) {
    if (error?.statusCode === 404) {
      report.missingResources.push({
        kind: "bucket",
        label: targetProfile.title,
        bucketName
      });
      report.provisionableActions.push(
        createBucketProvisioningAction(targetProfile, config, provisionGroup, projectPermissions)
      );
      return;
    }
    if (error?.statusCode === 403) {
      report.permissionDiagnostics.push({
        kind: "permission-missing",
        summary: `${targetProfile.title}: service account cannot inspect bucket '${bucketName}'.`,
        instruction: createInstruction(syncGroup ?? provisionGroup),
        missingPermissions: syncGroup?.permissions ?? provisionGroup?.permissions ?? []
      });
      return;
    }
    report.resourceChecks.push({
      kind: "bucket",
      state: "error",
      label: targetProfile.title,
      bucketName,
      details: error?.message ?? "Failed to inspect bucket"
    });
  }
}

async function analyzeStorageBundle(report, bundle, targetProfiles, accessToken, projectPermissions, project) {
  if (targetProfiles.length === 0) {
    return markBundleNotConfigured(report, bundle);
  }
  const apiReady = await analyzeApiStates(bundle, report, project, accessToken, projectPermissions);
  if (!apiReady) {
    return updateBundleState(report);
  }
  const { syncGroup, provisionGroup } = getStoragePermissionGroups(bundle);
  for (const targetProfile of targetProfiles) {
    await inspectStorageTarget({
      report,
      targetProfile,
      accessToken,
      syncGroup,
      provisionGroup,
      projectPermissions
    });
  }
  return updateBundleState(report);
}

export async function analyzeGcpCompatibility({ connectionProfile, targetProfiles }) {
  const model = buildGcpProvisioningModel();
  const normalizedProjectId = normalizeOptionalText(connectionProfile.projectId);
  if (!normalizedProjectId) {
    throw new Error("Project ID is required before running compatibility analysis.");
  }

  const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
  const loadedProject = await loadProject(normalizedProjectId, accessToken);
  const project = {
    ...mapProjectDescriptor(loadedProject),
    region: normalizeOptionalText(connectionProfile.region)
  };
  const projectPermissions = await testProjectPermissions(
    project.projectId,
    model.compatibilityBundles.flatMap((bundle) =>
      bundle.permissionGroups.flatMap((group) => group.permissions)
    ),
    accessToken
  );

  const bundles = [];
  for (const bundle of model.compatibilityBundles) {
    const bundleTargets = getLiveTargetsForBundle(targetProfiles, bundle);
    const report = createBundleReport(bundle, bundleTargets);
    if (bundle.id === "firestore-projection") {
      bundles.push(await analyzeFirestoreBundle(report, bundle, bundleTargets, project, accessToken, projectPermissions));
      continue;
    }
    if (bundle.id === "deployment-storage" || bundle.id === "media-storage") {
      bundles.push(
        await analyzeStorageBundle(report, bundle, bundleTargets, accessToken, projectPermissions, project)
      );
      continue;
    }
    bundles.push(
      await analyzeBrowserDeliveryBundle({
        report,
        bundle,
        targetProfiles,
        browserTargets: bundleTargets,
        accessToken,
        projectPermissions,
        project,
        markBundleNotConfigured
      })
    );
  }

  return summarizeReport(connectionProfile, project, bundles, model);
}
