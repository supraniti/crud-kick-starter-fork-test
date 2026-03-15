import {
  compareLiveRemoteTarget,
  executeLiveRemoteTarget,
  restoreLiveRemoteTarget
} from "./remote-ops-live-runtime.mjs";
import {
  compareRemoteTarget,
  executeRemoteTarget,
  restoreRemoteTarget,
  validateRemoteTarget
} from "./remote-ops-simulated-runtime.mjs";
import { validateLiveTargetProfile } from "./remote-ops-live-validation-runtime.mjs";
import {
  buildProcedureStatus,
  buildRunPayload,
  resolveScopeKind
} from "./remote-ops-route-runtime.mjs";
import { normalizeRunStatus, toTimestamp } from "./remote-ops-shared-runtime.mjs";

function createFailure(message) {
  return new Error(message);
}

function readFailureMessage(result, fallback) {
  return result?.payload?.error?.message ?? result?.error?.message ?? fallback;
}

async function updateTargetRecord({ targetsHandler, targetProfile, patch, reply }) {
  const result = await targetsHandler.update({
    body: patch,
    item: targetProfile,
    reply
  });
  if (!result?.ok) {
    throw createFailure(readFailureMessage(result, "Failed to update target"));
  }
  return result.item;
}

async function createOperationRun({ runsHandler, payload, reply }) {
  const result = await runsHandler.create({
    value: payload,
    reply
  });
  if (!result?.ok) {
    throw createFailure(readFailureMessage(result, "Failed to record remote operation run"));
  }
  return result.item;
}

async function runValidationProcedure({
  targetProfile,
  connectionProfile,
  collectionHandlerRegistry
}) {
  return targetProfile.adapterMode === "live-gcp"
    ? validateLiveTargetProfile({
        targetProfile,
        connectionProfile,
        collectionHandlerRegistry
      })
    : validateRemoteTarget({
        targetProfile,
        connectionProfile,
        collectionHandlerRegistry
      });
}

async function runCompareProcedure({
  targetProfile,
  connectionProfile,
  collectionHandlerRegistry
}) {
  return targetProfile.adapterMode === "live-gcp"
    ? compareLiveRemoteTarget({
        targetProfile,
        connectionProfile,
        collectionHandlerRegistry
      })
    : compareRemoteTarget({
        targetProfile,
        collectionHandlerRegistry
      });
}

async function runExecuteProcedure({
  targetProfile,
  connectionProfile,
  collectionHandlerRegistry
}) {
  return targetProfile.adapterMode === "live-gcp"
    ? executeLiveRemoteTarget({
        targetProfile,
        connectionProfile,
        collectionHandlerRegistry
      })
    : executeRemoteTarget({
        targetProfile,
        collectionHandlerRegistry
      });
}

async function runRestoreProcedure({
  targetProfile,
  connectionProfile
}) {
  return targetProfile.adapterMode === "live-gcp"
    ? restoreLiveRemoteTarget({
        targetProfile,
        connectionProfile
      })
    : restoreRemoteTarget({
        targetProfile
      });
}

export async function performTargetValidationProcedure({
  targetProfile,
  connectionProfile,
  collectionHandlerRegistry,
  targetsHandler,
  runsHandler,
  reply
}) {
  const result = await runValidationProcedure({
    targetProfile,
    connectionProfile,
    collectionHandlerRegistry
  });
  const updatedTarget = await updateTargetRecord({
    targetsHandler,
    targetProfile,
    patch: {
      targetStatus: result.nextStatus,
      lastValidatedOn: toTimestamp(),
      validationSummary: result.summary
    },
    reply
  });
  const run = await createOperationRun({
    runsHandler,
    payload: buildRunPayload({
      title: `Validate ${targetProfile.title}`,
      connectionProfileId: connectionProfile.id,
      targetProfileId: targetProfile.id,
      procedureType: "validate",
      scopeKind: resolveScopeKind(targetProfile.targetKind),
      direction: "validate",
      dryRun: true,
      status: buildProcedureStatus(result.nextStatus),
      message: result.message,
      summary: {
        warnings: result.summary.warnings,
        sampleKeys: []
      }
    }),
    reply
  });
  return {
    item: updatedTarget,
    run,
    message: result.message,
    summary: result.summary
  };
}

export async function performTargetCompareProcedure({
  targetProfile,
  connectionProfile,
  collectionHandlerRegistry,
  targetsHandler,
  runsHandler,
  reply
}) {
  const result = await runCompareProcedure({
    targetProfile,
    connectionProfile,
    collectionHandlerRegistry
  });
  const updatedTarget = await updateTargetRecord({
    targetsHandler,
    targetProfile,
    patch: {
      lastComparedOn: toTimestamp(),
      compareSummary: result.summary
    },
    reply
  });
  const run = await createOperationRun({
    runsHandler,
    payload: buildRunPayload({
      title: `Compare ${targetProfile.title}`,
      connectionProfileId: connectionProfile.id,
      targetProfileId: targetProfile.id,
      procedureType: "compare",
      scopeKind: resolveScopeKind(targetProfile.targetKind),
      direction: "compare",
      dryRun: true,
      status:
        result.summary.state === "error"
          ? "failed"
          : result.summary.state === "drift"
            ? "warning"
            : "succeeded",
      message: result.message,
      summary: {
        createCount: result.summary.createCount,
        updateCount: result.summary.updateCount,
        deleteCount: result.summary.deleteCount,
        restoredCount: 0,
        sampleKeys: result.summary.sampleKeys,
        warnings: []
      }
    }),
    reply
  });
  return {
    item: updatedTarget,
    run,
    message: result.message,
    summary: result.summary
  };
}

export async function performTargetExecuteProcedure({
  targetProfile,
  connectionProfile,
  collectionHandlerRegistry,
  targetsHandler,
  runsHandler,
  reply
}) {
  if (targetProfile.policy?.requireDryRunFirst && !targetProfile.lastComparedOn) {
    throw createFailure("Run compare before executing this target");
  }

  const result = await runExecuteProcedure({
    targetProfile,
    connectionProfile,
    collectionHandlerRegistry
  });
  const updatedTarget = await updateTargetRecord({
    targetsHandler,
    targetProfile,
    patch: {
      lastComparedOn: toTimestamp(),
      compareSummary: result.summary,
      targetStatus:
        result.summary.state === "error"
          ? "error"
          : result.summary.state === "clean"
            ? "validated"
            : "warning"
    },
    reply
  });
  const run = await createOperationRun({
    runsHandler,
    payload: buildRunPayload({
      title: `Execute ${targetProfile.title}`,
      connectionProfileId: connectionProfile.id,
      targetProfileId: targetProfile.id,
      procedureType: "execute",
      scopeKind: resolveScopeKind(targetProfile.targetKind),
      direction: "push",
      dryRun: false,
      status:
        result.summary.state === "error"
          ? "failed"
          : result.runSummary.warnings?.length > 0
            ? "warning"
            : "succeeded",
      message: result.message,
      summary: result.runSummary
    }),
    reply
  });
  return {
    item: updatedTarget,
    run,
    message: result.message,
    summary: result.summary,
    runSummary: result.runSummary
  };
}

export async function performTargetRestoreProcedure({
  targetProfile,
  connectionProfile,
  collectionHandlerRegistry,
  targetsHandler,
  runsHandler,
  reply
}) {
  const restoreResult = await runRestoreProcedure({
    targetProfile,
    connectionProfile
  });
  const compareResult = await runCompareProcedure({
    targetProfile,
    connectionProfile,
    collectionHandlerRegistry
  });
  const updatedTarget = await updateTargetRecord({
    targetsHandler,
    targetProfile,
    patch: {
      lastComparedOn: toTimestamp(),
      compareSummary: compareResult.summary,
      targetStatus: compareResult.summary.state === "clean" ? "validated" : "warning"
    },
    reply
  });
  const run = await createOperationRun({
    runsHandler,
    payload: buildRunPayload({
      title: `Restore ${targetProfile.title}`,
      connectionProfileId: connectionProfile.id,
      targetProfileId: targetProfile.id,
      procedureType: "restore",
      scopeKind: resolveScopeKind(targetProfile.targetKind),
      direction: "restore",
      dryRun: false,
      status: normalizeRunStatus(restoreResult.status, "warning"),
      message: restoreResult.message,
      summary: restoreResult.runSummary
    }),
    reply
  });
  return {
    item: updatedTarget,
    run,
    message: restoreResult.message,
    summary: compareResult.summary,
    runSummary: restoreResult.runSummary
  };
}
