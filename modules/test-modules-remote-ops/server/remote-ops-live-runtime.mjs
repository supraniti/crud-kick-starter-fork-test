import { createEmptyCompareSummary, normalizeTargetKind } from "./remote-ops-shared-runtime.mjs";
import { compareLiveFirestoreTarget, executeLiveFirestoreTarget } from "./remote-ops-live-firestore-runtime.mjs";
import { compareLiveStorageTarget, executeLiveStorageTarget, restoreLiveStorageTarget } from "./remote-ops-live-storage-runtime.mjs";

function buildUnsupportedResult(message) {
  return {
    summary: {
      ...createEmptyCompareSummary(),
      state: "error",
      message
    },
    runSummary: {
      createCount: 0,
      updateCount: 0,
      deleteCount: 0,
      restoredCount: 0,
      sampleKeys: [],
      warnings: [message]
    },
    message
  };
}

export async function compareLiveRemoteTarget({ targetProfile, connectionProfile, collectionHandlerRegistry }) {
  switch (normalizeTargetKind(targetProfile.targetKind)) {
    case "firestore-projection":
      return compareLiveFirestoreTarget({ targetProfile, connectionProfile, collectionHandlerRegistry });
    case "deployment-storage":
    case "media-storage":
      return compareLiveStorageTarget({ targetProfile, connectionProfile });
    case "browser-delivery":
      return {
        summary: {
          ...createEmptyCompareSummary(),
          state: "clean",
          message: "Browser-delivery targets still support validation only."
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
        message: "Browser-delivery targets still support validation only."
      };
    default:
      return buildUnsupportedResult("Unsupported live target kind.");
  }
}

export async function executeLiveRemoteTarget({ targetProfile, connectionProfile, collectionHandlerRegistry }) {
  switch (normalizeTargetKind(targetProfile.targetKind)) {
    case "firestore-projection":
      return executeLiveFirestoreTarget({ targetProfile, connectionProfile, collectionHandlerRegistry });
    case "deployment-storage":
    case "media-storage":
      return executeLiveStorageTarget({ targetProfile, connectionProfile });
    default:
      return buildUnsupportedResult("Live execute is not supported for this target kind.");
  }
}

export async function restoreLiveRemoteTarget({ targetProfile, connectionProfile }) {
  switch (normalizeTargetKind(targetProfile.targetKind)) {
    case "deployment-storage":
    case "media-storage":
      return restoreLiveStorageTarget({ targetProfile, connectionProfile });
    default:
      return {
        status: "warning",
        message: "Live restore is currently supported for storage targets only.",
        runSummary: {
          createCount: 0,
          updateCount: 0,
          deleteCount: 0,
          restoredCount: 0,
          sampleKeys: [],
          warnings: ["Live restore is currently supported for storage targets only."]
        }
      };
  }
}
