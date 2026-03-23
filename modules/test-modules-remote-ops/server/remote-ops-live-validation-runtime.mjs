import {
  buildServiceAccountConnectionMetadata,
  getServiceAccountAccessToken
} from "./remote-ops-service-account-auth-runtime.mjs";
import {
  LiveApiError,
  requestGoogleJson
} from "./remote-ops-live-google-runtime.mjs";
import { validateFirestoreCollectionPath } from "./remote-ops-live-firestore-runtime.mjs";
import { normalizeOptionalText } from "./remote-ops-shared-runtime.mjs";
import { normalizeBrowserDeliveryConfig } from "../shared/browser-delivery-support.mjs";
import { resolveBrowserDeliveryManagedNames } from "./remote-ops-gcp-browser-delivery-stack-runtime.mjs";

const REMOTE_TARGETS_COLLECTION_ID = "remote-target-profiles";

function createValidationResult(nextStatus, message, checkedItems, warnings = [], canProceed = false) {
  return {
    nextStatus,
    message,
    summary: {
      state: nextStatus === "validated" ? "validated" : nextStatus,
      message,
      checkedItems,
      warnings,
      canProceed
    }
  };
}

function extractProjectNumber(project) {
  const fromName = String(project?.name ?? "").match(/^projects\/(\d+)$/);
  return project?.projectNumber ? String(project.projectNumber) : fromName?.[1] ?? null;
}

function mapProjectDescriptor(project) {
  return {
    projectId: normalizeOptionalText(project?.projectId),
    projectNumber: extractProjectNumber(project),
    displayName: normalizeOptionalText(project?.displayName) ?? normalizeOptionalText(project?.projectId),
    state: normalizeOptionalText(project?.state) ?? "STATE_UNSPECIFIED"
  };
}

async function loadSelectedProject(projectId, accessToken) {
  const normalized = normalizeOptionalText(projectId);
  if (!normalized) {
    return null;
  }
  return requestGoogleJson(
    `https://cloudresourcemanager.googleapis.com/v3/projects/${normalized}`,
    accessToken
  );
}

async function getServiceStatus(projectNumber, serviceName, accessToken) {
  return requestGoogleJson(
    `https://serviceusage.googleapis.com/v1/projects/${projectNumber}/services/${serviceName}`,
    accessToken
  );
}

async function validateFirestoreTarget(targetProfile, connectionProfile, accessToken, checkedItems) {
  if (!connectionProfile.projectNumber || !connectionProfile.projectId) {
    return createValidationResult(
      "error",
      "Select and save a GCP project before validating Firestore targets.",
      checkedItems,
      [],
      false
    );
  }

  const service = await getServiceStatus(connectionProfile.projectNumber, "firestore.googleapis.com", accessToken);
  if (service?.state !== "ENABLED") {
    return createValidationResult(
      "warning",
      "Firestore API is not enabled for the selected project.",
      [...checkedItems, "project access"],
      ["Enable firestore.googleapis.com before pushing projection data."],
      false
    );
  }

  checkedItems.push("project access", "firestore api");
  const collectionPath = normalizeOptionalText(targetProfile.config?.firestoreCollectionPath);
  if (!collectionPath) {
    return createValidationResult(
      "error",
      "Firestore collection path is required for live Firestore targets.",
      checkedItems,
      [],
      false
    );
  }
  validateFirestoreCollectionPath(collectionPath);
  const database = await requestGoogleJson(
    `https://firestore.googleapis.com/v1/projects/${connectionProfile.projectId}/databases/(default)`,
    accessToken
  );
  checkedItems.push("firestore database");
  return createValidationResult(
    "validated",
    `Firestore target is ready for '${collectionPath}' on '${database.name ?? connectionProfile.projectId}'.`,
    checkedItems,
    [],
    true
  );
}

async function validateStorageTarget(targetProfile, accessToken, checkedItems) {
  const bucketName = normalizeOptionalText(targetProfile.config?.bucketName);
  if (!bucketName) {
    return createValidationResult(
      "error",
      "Bucket name is required for storage targets.",
      checkedItems,
      [],
      false
    );
  }

  const bucket = await requestGoogleJson(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}`,
    accessToken
  );
  checkedItems.push("bucket access");
  return createValidationResult(
    "validated",
    `Storage target is ready for bucket '${bucket.name}'.`,
    checkedItems,
    [],
    true
  );
}

async function findLinkedTarget(collectionHandlerRegistry, targetId) {
  const normalizedTargetId = normalizeOptionalText(targetId);
  if (!normalizedTargetId) {
    return null;
  }
  const handler = collectionHandlerRegistry?.get?.(REMOTE_TARGETS_COLLECTION_ID);
  if (!handler || typeof handler.findById !== "function") {
    return null;
  }
  return handler.findById(normalizedTargetId);
}

async function loadBucketIamPolicy(bucketName, accessToken) {
  return requestGoogleJson(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/iam`,
    accessToken
  );
}

function hasPublicObjectViewerBinding(policy = {}) {
  const bindings = Array.isArray(policy?.bindings) ? policy.bindings : [];
  return bindings.some((binding) => {
    const role = String(binding?.role ?? "");
    const members = Array.isArray(binding?.members) ? binding.members : [];
    return members.includes("allUsers") && role === "roles/storage.objectViewer";
  });
}

async function inspectBrowserBucketReadiness({
  label,
  bucketName,
  accessToken,
  checkedItems,
  warnings
}) {
  const normalizedBucketName = normalizeOptionalText(bucketName);
  if (!normalizedBucketName) {
    warnings.push(`${label} bucket is not configured.`);
    return;
  }
  await requestGoogleJson(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(normalizedBucketName)}`,
    accessToken
  );
  checkedItems.push(`${label} bucket`);
  const policy = await loadBucketIamPolicy(normalizedBucketName, accessToken);
  checkedItems.push(`${label} public-read policy`);
  if (!hasPublicObjectViewerBinding(policy)) {
    warnings.push(`${label} bucket still needs public object read enabled for browser delivery.`);
  }
}

async function validateBrowserDeliveryTarget(
  targetProfile,
  connectionProfile,
  accessToken,
  checkedItems,
  collectionHandlerRegistry
) {
  if (!connectionProfile.projectId) {
    return createValidationResult(
      "error",
      "Select and save a GCP project before validating browser delivery.",
      checkedItems,
      [],
      false
    );
  }

  const config = normalizeBrowserDeliveryConfig(targetProfile.config);
  const hostname = config.hostname;
  const managedNames =
    config.accessMode === "custom-domain" && config.stackMode === "https-load-balancer"
      ? resolveBrowserDeliveryManagedNames(targetProfile, targetProfile.config)
      : null;
  const dnsZone = config.dnsZone ?? managedNames?.dnsZoneName ?? null;
  const certificateName = config.certificateName ?? managedNames?.certificateName ?? null;
  const warnings = [];

  checkedItems.push(`access mode: ${config.accessMode}`);

  if (config.accessMode === "gcp-temporary") {
    if (!config.deploymentTargetProfileId) {
      return createValidationResult(
        "error",
        "Select a linked deployment target before using GCP temporary delivery.",
        checkedItems,
        [],
        false
      );
    }
    checkedItems.push("deployment target link");
    const deploymentTarget = await findLinkedTarget(collectionHandlerRegistry, config.deploymentTargetProfileId);
    if (!deploymentTarget || deploymentTarget.targetKind !== "deployment-storage") {
      return createValidationResult(
        "error",
        "Linked deployment target is missing or invalid for GCP temporary delivery.",
        checkedItems,
        [],
        false
      );
    }
    await inspectBrowserBucketReadiness({
      label: "Deployment",
      bucketName: deploymentTarget.config?.bucketName,
      accessToken,
      checkedItems,
      warnings
    });
    if (!config.mediaTargetProfileId) {
      warnings.push("No linked media target is configured for browser-visible media URLs.");
    } else {
      checkedItems.push("media target link");
      const mediaTarget = await findLinkedTarget(collectionHandlerRegistry, config.mediaTargetProfileId);
      if (!mediaTarget || mediaTarget.targetKind !== "media-storage") {
        warnings.push("Linked media target is missing or invalid for GCP temporary delivery.");
      } else {
        await inspectBrowserBucketReadiness({
          label: "Media",
          bucketName: mediaTarget.config?.bucketName,
          accessToken,
          checkedItems,
          warnings
        });
      }
    }
    return createValidationResult(
      warnings.length > 0 ? "warning" : "validated",
      warnings.length > 0
        ? "GCP temporary browser delivery still needs public bucket access before pages and media are live on the web."
        : "GCP temporary browser delivery is ready with public GCP URLs.",
      checkedItems,
      warnings,
      warnings.length === 0
    );
  }

  if (!hostname) {
    return createValidationResult("error", "Hostname is required for custom-domain browser delivery.", checkedItems, [], false);
  }

  checkedItems.push("hostname");

  if (config.dnsMode === "gcp-managed" && dnsZone) {
    await requestGoogleJson(
      `https://dns.googleapis.com/dns/v1/projects/${connectionProfile.projectId}/managedZones/${encodeURIComponent(dnsZone)}`,
      accessToken
    );
    checkedItems.push("dns zone");
  } else if (config.dnsMode === "gcp-managed") {
    warnings.push("No DNS zone configured. GCP-managed DNS validation was skipped.");
  } else {
    warnings.push("No DNS zone configured. DNS validation was skipped.");
  }

  if (certificateName) {
    await requestGoogleJson(
      `https://certificatemanager.googleapis.com/v1/projects/${connectionProfile.projectId}/locations/global/certificates/${encodeURIComponent(certificateName)}`,
      accessToken
    );
    checkedItems.push("certificate");
  } else {
    warnings.push("No certificate configured. Certificate validation was skipped.");
  }

  const nextStatus = warnings.length > 0 ? "warning" : "validated";
  const message =
    warnings.length > 0
      ? `Custom-domain browser delivery partially validated for '${hostname}'.`
      : `Custom-domain browser delivery is ready for '${hostname}'.`;
  return createValidationResult(nextStatus, message, checkedItems, warnings, warnings.length === 0);
}

export async function validateLiveConnectionProfile(connectionProfile) {
  try {
    const { accessToken, loadedCredential } = await getServiceAccountAccessToken(connectionProfile);
    const checkedItems = ["service account credential", "access token"];
    const selectedProjectId =
      normalizeOptionalText(connectionProfile.projectId) ?? loadedCredential.credential.projectId;

    if (!selectedProjectId) {
      return {
        ...createValidationResult(
          "warning",
          "Service account key loaded successfully. Select or enter a project to continue.",
          checkedItems,
          [],
          false
        ),
        serviceAccountEmail: loadedCredential.credential.clientEmail
      };
    }

    const selectedProject = await loadSelectedProject(selectedProjectId, accessToken);
    const project = mapProjectDescriptor(selectedProject);
    const warnings = [];
    if (
      loadedCredential.credential.projectId &&
      loadedCredential.credential.projectId !== selectedProjectId
    ) {
      warnings.push(
        `The selected project '${selectedProjectId}' differs from the credential project '${loadedCredential.credential.projectId}'.`
      );
    }

    return {
      ...createValidationResult(
        warnings.length > 0 ? "warning" : "validated",
        warnings.length > 0
          ? `Connected as '${loadedCredential.credential.clientEmail}' to '${project.displayName}'.`
          : `Connected as '${loadedCredential.credential.clientEmail}' to '${project.displayName}'.`,
        [...checkedItems, "project access"],
        warnings,
        warnings.length === 0
      ),
      project,
      serviceAccountEmail: loadedCredential.credential.clientEmail,
      serviceAccountKeyId: loadedCredential.credential.privateKeyId
    };
  } catch (error) {
    return createValidationResult(
      "error",
      error?.message ?? "Live connection validation failed.",
      ["service account credential"],
      [],
      false
    );
  }
}

export async function validateLiveTargetProfile({ targetProfile, connectionProfile, collectionHandlerRegistry }) {
  try {
    const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
    const checkedItems = ["service account credential", "access token"];

    if (targetProfile.targetKind === "firestore-projection") {
      return await validateFirestoreTarget(targetProfile, connectionProfile, accessToken, checkedItems);
    }
    if (targetProfile.targetKind === "deployment-storage" || targetProfile.targetKind === "media-storage") {
      return await validateStorageTarget(targetProfile, accessToken, checkedItems);
    }
    if (targetProfile.targetKind === "browser-delivery") {
      return await validateBrowserDeliveryTarget(
        targetProfile,
        connectionProfile,
        accessToken,
        checkedItems,
        collectionHandlerRegistry
      );
    }
    return createValidationResult("error", "Unsupported live target kind.", checkedItems, [], false);
  } catch (error) {
    const warning = error instanceof LiveApiError && error.statusCode === 404
      ? "Configured remote resource was not found."
      : null;
    return createValidationResult(
      "error",
      error?.message ?? "Live target validation failed.",
      ["service account credential"],
      warning ? [warning] : [],
      false
    );
  }
}
