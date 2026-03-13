import { requestGoogleJson } from "./remote-ops-live-google-runtime.mjs";
import { analyzeGcpCompatibility } from "./remote-ops-gcp-compatibility-runtime.mjs";
import { getServiceAccountAccessToken } from "./remote-ops-service-account-auth-runtime.mjs";
import { normalizeOptionalText, normalizeTargetConfig } from "./remote-ops-shared-runtime.mjs";

function buildActionIndex(actions = []) {
  return new Map(actions.map((action) => [action.id, action]));
}

function createProvisioningError(message, code = "REMOTE_OPS_GCP_PROVISIONING_FAILED") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function dedupe(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function sortProvisionableActions(actions) {
  const priority = new Map([
    ["api", 0],
    ["firestore-database", 1],
    ["bucket", 2],
    ["bucket-website", 3],
    ["public-read", 4]
  ]);
  return [...actions].sort((left, right) => {
    const leftPriority = priority.get(left.resourceKind) ?? 10;
    const rightPriority = priority.get(right.resourceKind) ?? 10;
    return leftPriority - rightPriority || String(left.label ?? "").localeCompare(String(right.label ?? ""));
  });
}

async function waitForLongRunningOperation(accessToken, buildUrl, operationName) {
  const normalizedName = normalizeOptionalText(operationName);
  if (!normalizedName) {
    return null;
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const payload = await requestGoogleJson(buildUrl(normalizedName), accessToken);
    if (payload?.done === true) {
      if (payload?.error?.message) {
        throw createProvisioningError(payload.error.message);
      }
      return payload?.response ?? payload;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw createProvisioningError(`Timed out while waiting for operation '${normalizedName}' to finish.`);
}

async function enableRequiredApis(projectNumber, serviceNames, accessToken) {
  const uniqueServices = dedupe(serviceNames);
  if (uniqueServices.length === 0) {
    return [];
  }
  const payload = await requestGoogleJson(
    `https://serviceusage.googleapis.com/v1/projects/${encodeURIComponent(projectNumber)}/services:batchEnable`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        serviceIds: uniqueServices
      })
    }
  );
  await waitForLongRunningOperation(
    accessToken,
    (operationName) => `https://serviceusage.googleapis.com/v1/${operationName}`,
    payload?.name
  );
  return uniqueServices;
}

function normalizeBucketLocation(region) {
  return normalizeOptionalText(region) ?? "US";
}

async function createStorageBucket(projectId, bucketName, region, accessToken) {
  await requestGoogleJson(
    `https://storage.googleapis.com/storage/v1/b?project=${encodeURIComponent(projectId)}`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: bucketName,
        location: normalizeBucketLocation(region),
        storageClass: "STANDARD",
        iamConfiguration: {
          uniformBucketLevelAccess: {
            enabled: true
          }
        }
      })
    }
  );
}

async function configureBucketWebsite(bucketName, accessToken) {
  await requestGoogleJson(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}`,
    accessToken,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        website: {
          mainPageSuffix: "index.html"
        }
      })
    }
  );
}

async function loadBucketIamPolicy(bucketName, accessToken) {
  return requestGoogleJson(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/iam`,
    accessToken
  );
}

async function setBucketIamPolicy(bucketName, policy, accessToken) {
  return requestGoogleJson(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/iam`,
    accessToken,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(policy)
    }
  );
}

async function enablePublicObjectRead(bucketName, accessToken) {
  const policy = await loadBucketIamPolicy(bucketName, accessToken);
  const bindings = Array.isArray(policy?.bindings) ? [...policy.bindings] : [];
  const existingBinding = bindings.find((binding) => binding?.role === "roles/storage.objectViewer");
  if (existingBinding) {
    const members = new Set(Array.isArray(existingBinding.members) ? existingBinding.members : []);
    members.add("allUsers");
    existingBinding.members = [...members];
  } else {
    bindings.push({
      role: "roles/storage.objectViewer",
      members: ["allUsers"]
    });
  }
  await setBucketIamPolicy(
    bucketName,
    {
      ...policy,
      bindings
    },
    accessToken
  );
}

function normalizeFirestoreLocation(region) {
  return normalizeOptionalText(region) ?? "us-central1";
}

async function createDefaultFirestoreDatabase(projectId, region, accessToken) {
  const payload = await requestGoogleJson(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases?databaseId=${encodeURIComponent("(default)")}`,
    accessToken,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: "FIRESTORE_NATIVE",
        locationId: normalizeFirestoreLocation(region),
        appEngineIntegrationMode: "DISABLED",
        deleteProtectionState: "DELETE_PROTECTION_DISABLED",
        databaseEdition: "STANDARD"
      })
    }
  );
  await waitForLongRunningOperation(
    accessToken,
    (operationName) => `https://firestore.googleapis.com/v1/${operationName}`,
    payload?.name
  );
}

function selectExecutableActions(report, requestedActionIds = null) {
  const requestedIds = Array.isArray(requestedActionIds) && requestedActionIds.length > 0 ? new Set(requestedActionIds) : null;
  return sortProvisionableActions(
    report.provisionableActions.filter((action) => {
      if (requestedIds && !requestedIds.has(action.id)) {
        return false;
      }
      return action.createSupported === true && action.availableNow === true && action.phaseStatus === "execution-started";
    })
  );
}

function collectBlockedRequestedActions(report, requestedActionIds = null) {
  const requestedIds = Array.isArray(requestedActionIds) && requestedActionIds.length > 0 ? new Set(requestedActionIds) : null;
  return report.provisionableActions.filter((action) => {
    if (!requestedIds) {
      return false;
    }
    return requestedIds.has(action.id) && !(action.createSupported === true && action.availableNow === true && action.phaseStatus === "execution-started");
  });
}

function ensureSafeguardsConfirmed(model, confirmedSafeguardIds) {
  const confirmedIds = new Set(Array.isArray(confirmedSafeguardIds) ? confirmedSafeguardIds : []);
  const missingIds = model.safeguardRules
    .map((rule) => rule.id)
    .filter((ruleId) => !confirmedIds.has(ruleId));
  if (missingIds.length > 0) {
    throw createProvisioningError(
      `Provisioning requires explicit confirmation for safeguard rules: ${missingIds.join(", ")}.`,
      "REMOTE_OPS_GCP_SAFEGUARD_CONFIRMATION_REQUIRED"
    );
  }
}

function findBucketTarget(targetProfiles, targetId) {
  return targetProfiles.find((targetProfile) => targetProfile.id === targetId) ?? null;
}

function findAnyTarget(targetProfiles, targetId) {
  return targetProfiles.find((targetProfile) => targetProfile.id === targetId) ?? null;
}

async function executeBucketActions({
  iterationActions,
  executedActionIds,
  executedActions,
  targetProfiles,
  projectId,
  region,
  accessToken
}) {
  for (const action of iterationActions.filter(
    (entry) => entry.resourceKind === "bucket" && !executedActionIds.has(entry.id)
  )) {
    const targetProfile = findBucketTarget(targetProfiles, action.targetId);
    if (!targetProfile) {
      continue;
    }
    const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
    const bucketName = normalizeOptionalText(config.bucketName);
    if (!bucketName) {
      continue;
    }
    await createStorageBucket(projectId, bucketName, region, accessToken);
    executedActionIds.add(action.id);
    executedActions.push({
      id: action.id,
      label: action.label,
      resourceKind: action.resourceKind
    });
  }
}

async function executeBrowserDeliveryActions({
  iterationActions,
  executedActionIds,
  executedActions,
  targetProfiles,
  accessToken
}) {
  for (const action of iterationActions.filter(
    (entry) =>
      (entry.resourceKind === "bucket-website" || entry.resourceKind === "public-read") &&
      !executedActionIds.has(entry.id)
  )) {
    const linkedTarget = findAnyTarget(targetProfiles, action.linkedTargetId);
    if (!linkedTarget) {
      continue;
    }
    const linkedConfig = normalizeTargetConfig(linkedTarget.config, linkedTarget.targetKind);
    const bucketName = normalizeOptionalText(linkedConfig.bucketName);
    if (!bucketName) {
      continue;
    }
    if (action.resourceKind === "bucket-website") {
      await configureBucketWebsite(bucketName, accessToken);
    } else {
      await enablePublicObjectRead(bucketName, accessToken);
    }
    executedActionIds.add(action.id);
    executedActions.push({
      id: action.id,
      label: action.label,
      resourceKind: action.resourceKind
    });
  }
}

export async function executeGcpProvisioning({
  model,
  connectionProfile,
  targetProfiles,
  report,
  confirmedSafeguardIds,
  actionIds = null
}) {
  ensureSafeguardsConfirmed(model, confirmedSafeguardIds);

  const blockedRequestedActions = collectBlockedRequestedActions(report, actionIds);
  if (blockedRequestedActions.length > 0) {
    throw createProvisioningError(
      `Provisioning is blocked for: ${blockedRequestedActions.map((action) => action.label).join(", ")}.`,
      "REMOTE_OPS_GCP_PROVISIONING_BLOCKED"
    );
  }

  const actions = selectExecutableActions(report, actionIds);
  if (actions.length === 0) {
    return {
      message: "No missing supported resources are ready to provision.",
      summary: {
        createCount: 0,
        updateCount: 0,
        deleteCount: 0,
        restoredCount: 0,
        sampleKeys: [],
        warnings: ["No ready provisioning actions were found for the current compatibility report."]
      },
      executedActions: []
    };
  }

  const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
  const projectId = normalizeOptionalText(connectionProfile.projectId);
  const projectNumber = normalizeOptionalText(report?.project?.projectNumber ?? connectionProfile.projectNumber);
  if (!projectId || !projectNumber) {
    throw createProvisioningError("Project ID and project number are required before provisioning can run.");
  }

  const executedActions = [];
  const executedActionIds = new Set();
  let workingReport = report;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const iterationActions = selectExecutableActions(workingReport, actionIds).filter(
      (action) => !executedActionIds.has(action.id)
    );
    if (iterationActions.length === 0) {
      break;
    }
    const actionIndex = buildActionIndex(iterationActions);

    const apiServiceNames = iterationActions
      .filter((action) => action.resourceKind === "api")
      .map((action) => action.id.replace(/^enable-/, ""));
    if (apiServiceNames.length > 0) {
      const enabledServices = await enableRequiredApis(projectNumber, apiServiceNames, accessToken);
      enabledServices.forEach((serviceName) => {
        const action = actionIndex.get(`enable-${serviceName}`);
        if (action) {
          executedActionIds.add(action.id);
          executedActions.push({
            id: action.id,
            label: action.label,
            resourceKind: action.resourceKind
          });
        }
      });
    }

    if (actionIndex.has("create-firestore-default-database")) {
      await createDefaultFirestoreDatabase(projectId, connectionProfile.region, accessToken);
      const action = actionIndex.get("create-firestore-default-database");
      executedActionIds.add(action.id);
      executedActions.push({
        id: action.id,
        label: action.label,
        resourceKind: action.resourceKind
      });
    }

    await executeBucketActions({
      iterationActions,
      executedActionIds,
      executedActions,
      targetProfiles,
      projectId,
      region: connectionProfile.region,
      accessToken
    });

    await executeBrowserDeliveryActions({
      iterationActions,
      executedActionIds,
      executedActions,
      targetProfiles,
      accessToken
    });

    workingReport = await analyzeGcpCompatibility({
      connectionProfile,
      targetProfiles
    });
  }

  return {
    message:
      executedActions.length > 0
        ? `Provisioned ${executedActions.length} missing remote requirement${executedActions.length === 1 ? "" : "s"}.`
        : "No missing supported resources were provisioned.",
    summary: {
      createCount: executedActions.length,
      updateCount: 0,
      deleteCount: 0,
      restoredCount: 0,
      sampleKeys: executedActions.map((action) => action.label).slice(0, 8),
      warnings: []
    },
    executedActions
  };
}
