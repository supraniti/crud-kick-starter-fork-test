import {
  CATEGORIES_COLLECTION_ID,
  PAGES_COLLECTION_ID,
  POSTS_COLLECTION_ID,
  TAGS_COLLECTION_ID,
  buildExposedConnectionProfile,
  buildExposedTargetProfile,
  createEmptyCompareSummary,
  createEmptyValidationSummary,
  normalizeTargetConfig,
  normalizeTargetKind,
  toTimestamp
} from "./remote-ops-shared-runtime.mjs";
import {
  resolveSimulatedFirestoreRoot,
  resolveSimulatedStorageRoot
} from "./remote-ops-root.mjs";
import {
  buildCompareSummaryFromDiff,
  buildDiff,
  buildFirestoreProjectionMap,
  buildRunSummaryFromDiff,
  collectFileHashes,
  collectRemoteFirestoreEntries,
  collectRemoteStorageEntries,
  copyFirestoreProjectionEntries,
  copyStorageEntries,
  createProcedureMessage,
  ensureDir,
  pathExists,
  resolveLocalStorageRoot,
  restoreStorageTarget,
  seedSimulatedRemoteExtraFile as seedStorageRemoteExtraFile
} from "./remote-ops-simulated-target-runtime.mjs";

function summarizeValidation(state, message, checkedItems, warnings = []) {
  return {
    state,
    message,
    checkedItems,
    warnings,
    canProceed: state === "validated" || state === "warning"
  };
}


export async function validateConnectionProfile(connectionProfile) {
  const profile = buildExposedConnectionProfile(connectionProfile);
  const checkedItems = ["project access", "auth mode", "credential path"];
  const warnings = [];

  if (!profile.projectId) {
    return {
      nextStatus: "error",
      summary: summarizeValidation("error", "Project ID is required", checkedItems)
    };
  }
  if (!profile.credentialPathHint) {
    warnings.push("Credential path is empty; only the simulated validation path can continue.");
  }

  return {
    nextStatus: warnings.length > 0 ? "warning" : "validated",
    summary: summarizeValidation(
      warnings.length > 0 ? "warning" : "validated",
      warnings.length > 0 ? "Connection validated with Step 1 warnings" : "Connection validated",
      checkedItems,
      warnings
    )
  };
}

export async function simulateConnectionConnect(connectionProfile) {
  const profile = buildExposedConnectionProfile(connectionProfile);
  const warnings = [];
  if (!profile.projectId) {
    return {
      nextStatus: "error",
      summary: summarizeValidation("error", "Project ID is required before connecting", ["project access"]),
      message: "Connection failed"
    };
  }
  return {
    nextStatus: warnings.length > 0 ? "warning" : "connected",
    summary: summarizeValidation(
      warnings.length > 0 ? "warning" : "validated",
      "Simulated service-account import recorded",
      ["auth", "project selection"],
      warnings
    ),
    message: "Simulated service-account import recorded"
  };
}

function buildValidationFailure(checkedItems, message) {
  return {
    nextStatus: "error",
    summary: summarizeValidation("error", message, checkedItems),
    message: "Target validation failed"
  };
}

function buildValidationSuccess(checkedItems, warnings) {
  const hasWarnings = warnings.length > 0;
  return {
    nextStatus: hasWarnings ? "warning" : "validated",
    summary: summarizeValidation(
      hasWarnings ? "warning" : "validated",
      hasWarnings ? "Target validated with Step 1 warnings" : "Target validated",
      checkedItems,
      warnings
    ),
    message: hasWarnings ? "Target validated with warnings" : "Target validated"
  };
}

function validateConnectionState(connection, checkedItems) {
  if (!connection) {
    return buildValidationFailure(checkedItems, "Connection profile is required");
  }
  if (["connected", "validated", "warning"].includes(connection.connectionStatus)) {
    return null;
  }
  return buildValidationFailure(
    checkedItems,
    "Connection profile must be connected or validated first"
  );
}

function getProjectionScopeCollectionWarning(projectionScope, collectionHandlerRegistry) {
  if (projectionScope === "published-pages") {
    return !collectionHandlerRegistry.get(PAGES_COLLECTION_ID)
      ? "Pages collection handler is unavailable; Firestore projection scope may be incomplete."
      : null;
  }
  if (projectionScope === "public-blog-categories") {
    return !collectionHandlerRegistry.get(CATEGORIES_COLLECTION_ID)
      ? "Categories collection handler is unavailable; Firestore projection scope may be incomplete."
      : null;
  }
  if (projectionScope === "public-blog-tags") {
    return !collectionHandlerRegistry.get(TAGS_COLLECTION_ID)
      ? "Tags collection handler is unavailable; Firestore projection scope may be incomplete."
      : null;
  }
  return !collectionHandlerRegistry.get(POSTS_COLLECTION_ID)
    ? "Posts collection handler is unavailable; Firestore projection scope may be incomplete."
    : null;
}

async function validateFirestoreProjectionTarget({
  checkedItems,
  warnings,
  config,
  target,
  collectionHandlerRegistry
}) {
  if (!config.firestoreCollectionPath) {
    return buildValidationFailure(checkedItems, "Firestore collection path is required");
  }
  await ensureDir(resolveSimulatedFirestoreRoot(target.id));
  const projectionWarning = getProjectionScopeCollectionWarning(
    config.projectionScope,
    collectionHandlerRegistry
  );
  if (projectionWarning) {
    warnings.push(projectionWarning);
  }
  return null;
}

async function validateStorageTarget({ checkedItems, warnings, config, target }) {
  if (!config.bucketName) {
    return buildValidationFailure(checkedItems, "Bucket name is required");
  }
  await ensureDir(resolveSimulatedStorageRoot(target.id));
  const localRoot = resolveLocalStorageRoot(target);
  if (!(await pathExists(localRoot))) {
    warnings.push(`Local root '${localRoot}' does not exist yet.`);
  }
  return null;
}

function validateBrowserDeliveryTarget({ checkedItems, warnings, config }) {
  if (!config.hostname || !config.dnsZone || !config.certificateName) {
    return buildValidationFailure(
      checkedItems,
      "Hostname, DNS zone, and certificate name are required"
    );
  }
  warnings.push("Step 1 validates browser-delivery shape only; no real DNS/TLS calls are made.");
  return null;
}

async function validateTargetKind(context) {
  const { target, checkedItems } = context;
  switch (normalizeTargetKind(target.targetKind)) {
    case "firestore-projection":
      return validateFirestoreProjectionTarget(context);
    case "deployment-storage":
    case "media-storage":
      return validateStorageTarget(context);
    case "browser-delivery":
      return validateBrowserDeliveryTarget(context);
    default:
      return buildValidationFailure(checkedItems, "Unsupported target kind");
  }
}

export async function validateRemoteTarget({ targetProfile, connectionProfile, collectionHandlerRegistry }) {
  const target = buildExposedTargetProfile(targetProfile);
  const connection = buildExposedConnectionProfile(connectionProfile);
  const checkedItems = ["connection state", "target config", "simulated remote root"];
  const warnings = [];
  const connectionFailure = validateConnectionState(connection, checkedItems);

  if (connectionFailure) {
    return connectionFailure;
  }

  const kindFailure = await validateTargetKind({
    checkedItems,
    warnings,
    config: normalizeTargetConfig(target.config, target.targetKind),
    target,
    collectionHandlerRegistry
  });
  if (kindFailure) {
    return kindFailure;
  }

  return buildValidationSuccess(checkedItems, warnings);
}

export async function compareRemoteTarget({ targetProfile, collectionHandlerRegistry }) {
  const target = buildExposedTargetProfile(targetProfile);
  switch (normalizeTargetKind(target.targetKind)) {
    case "firestore-projection": {
      const localEntries = await buildFirestoreProjectionMap(collectionHandlerRegistry, target);
      const remoteEntries = await collectRemoteFirestoreEntries(target);
      const diff = buildDiff(localEntries, remoteEntries);
      return {
        summary: buildCompareSummaryFromDiff(diff, createProcedureMessage("Firestore projection", diff)),
        diff,
        localEntries,
        remoteEntries,
        message: createProcedureMessage("Firestore projection", diff)
      };
    }
    case "deployment-storage":
    case "media-storage": {
      const localEntries = await collectFileHashes(resolveLocalStorageRoot(target));
      const remoteEntries = await collectRemoteStorageEntries(target);
      const diff = buildDiff(localEntries, remoteEntries);
      const noun = target.targetKind === "deployment-storage" ? "Deployment target" : "Media target";
      return {
        summary: buildCompareSummaryFromDiff(diff, createProcedureMessage(noun, diff)),
        diff,
        localEntries,
        remoteEntries,
        message: createProcedureMessage(noun, diff)
      };
    }
    case "browser-delivery":
      return {
        summary: {
          ...createEmptyCompareSummary(),
          state: "clean",
          message: "Browser-delivery targets support validation only in Step 1"
        },
        diff: {
          createKeys: [],
          updateKeys: [],
          deleteKeys: [],
          sampleKeys: [],
          localOnlyCount: 0,
          remoteOnlyCount: 0,
          isClean: true
        },
        localEntries: new Map(),
        remoteEntries: new Map(),
        message: "Browser-delivery targets support validation only in Step 1"
      };
    default:
      return {
        summary: {
          ...createEmptyCompareSummary(),
          state: "error",
          message: "Unsupported target kind"
        },
        diff: {
          createKeys: [],
          updateKeys: [],
          deleteKeys: [],
          sampleKeys: [],
          localOnlyCount: 0,
          remoteOnlyCount: 0,
          isClean: true
        },
        localEntries: new Map(),
        remoteEntries: new Map(),
        message: "Unsupported target kind"
      };
  }
}

export async function executeRemoteTarget({ targetProfile, collectionHandlerRegistry }) {
  const target = buildExposedTargetProfile(targetProfile);
  const compareResult = await compareRemoteTarget({
    targetProfile: target,
    collectionHandlerRegistry
  });
  const warnings = [];

  switch (normalizeTargetKind(target.targetKind)) {
    case "firestore-projection":
      await copyFirestoreProjectionEntries(
        target,
        compareResult.localEntries,
        compareResult.diff,
        Boolean(target.policy?.allowDeletes)
      );
      break;
    case "deployment-storage":
    case "media-storage":
      await copyStorageEntries(
        target,
        compareResult.localEntries,
        compareResult.diff,
        Boolean(target.policy?.allowDeletes)
      );
      break;
    case "browser-delivery":
      warnings.push("Browser-delivery targets do not execute remote changes in Step 1.");
      break;
    default:
      warnings.push("Unsupported target kind");
      break;
  }

  const postCompare = await compareRemoteTarget({
    targetProfile: target,
    collectionHandlerRegistry
  });
  return {
    summary: postCompare.summary,
    runSummary: buildRunSummaryFromDiff(compareResult.diff, warnings),
    message: warnings[0] ?? "Target execution completed"
  };
}

export async function restoreRemoteTarget({ targetProfile }) {
  const target = buildExposedTargetProfile(targetProfile);
  if (!target.policy?.allowRestore) {
    return {
      status: "warning",
      message: "Restore is disabled by policy",
      runSummary: {
        createCount: 0,
        updateCount: 0,
        deleteCount: 0,
        restoredCount: 0,
        sampleKeys: [],
        warnings: ["Restore is disabled by policy"]
      }
    };
  }

  if (!["deployment-storage", "media-storage"].includes(target.targetKind)) {
    return {
      status: "warning",
      message: "Restore smoke flow is only implemented for storage targets in Step 1",
      runSummary: {
        createCount: 0,
        updateCount: 0,
        deleteCount: 0,
        restoredCount: 0,
        sampleKeys: [],
        warnings: ["Restore smoke flow is only implemented for storage targets in Step 1"]
      }
    };
  }
  return restoreStorageTarget(target);
}

export async function seedSimulatedRemoteExtraFile(targetProfile) {
  const target = buildExposedTargetProfile(targetProfile);
  if (!["deployment-storage", "media-storage"].includes(target.targetKind)) {
    return null;
  }
  return seedStorageRemoteExtraFile(target, toTimestamp());
}
