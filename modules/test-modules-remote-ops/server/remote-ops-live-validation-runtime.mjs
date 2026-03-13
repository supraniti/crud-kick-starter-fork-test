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

async function validateBrowserDeliveryTarget(targetProfile, connectionProfile, accessToken, checkedItems) {
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
  const dnsZone = config.dnsZone;
  const certificateName = config.certificateName;
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
    if (!config.mediaTargetProfileId) {
      warnings.push("No linked media target configured. Media temporary URLs will be unavailable.");
    }
    return createValidationResult(
      warnings.length > 0 ? "warning" : "validated",
      "GCP temporary browser delivery is configured.",
      checkedItems,
      warnings,
      true
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

export async function validateLiveTargetProfile({ targetProfile, connectionProfile }) {
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
      return await validateBrowserDeliveryTarget(targetProfile, connectionProfile, accessToken, checkedItems);
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
