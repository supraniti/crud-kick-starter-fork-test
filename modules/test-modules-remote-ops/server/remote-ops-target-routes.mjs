import {
  compareLiveRemoteTarget,
  executeLiveRemoteTarget,
  restoreLiveRemoteTarget
} from "./remote-ops-live-runtime.mjs";
import {
  compareRemoteTarget,
  executeRemoteTarget,
  restoreRemoteTarget,
  seedSimulatedRemoteExtraFile,
  validateRemoteTarget
} from "./remote-ops-simulated-runtime.mjs";
import { validateLiveTargetProfile } from "./remote-ops-live-validation-runtime.mjs";
import {
  buildProcedureStatus,
  buildRunPayload,
  buildSuccessResponse,
  createRun,
  ensureModuleEnabled,
  errorPayload,
  loadTargetAndConnection,
  resolveScopeKind,
  updateItem
} from "./remote-ops-route-runtime.mjs";
import { toTimestamp } from "./remote-ops-shared-runtime.mjs";

async function ensureLoadedTarget(routeContext, request, reply) {
  const availability = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
  if (availability !== true) {
    return availability;
  }
  return loadTargetAndConnection(routeContext, request.params?.targetId, reply);
}

function registerTargetValidateRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/targets/:targetId/validate`,
    async function targetValidateRoute(request, reply) {
      const loaded = await ensureLoadedTarget(routeContext, request, reply);
      if (loaded?.ok === false) {
        return loaded;
      }

      const result =
        loaded.targetProfile.adapterMode === "live-gcp"
          ? await validateLiveTargetProfile(loaded)
          : await validateRemoteTarget({
              targetProfile: loaded.targetProfile,
              connectionProfile: loaded.connectionProfile,
              collectionHandlerRegistry: routeContext.collectionHandlerRegistry
            });
      const updatedTarget = await updateItem(
        routeContext.targetsHandler,
        loaded.targetProfile,
        {
          targetStatus: result.nextStatus,
          lastValidatedOn: toTimestamp(),
          validationSummary: result.summary
        },
        reply
      );
      if (updatedTarget?.ok === false) {
        return updatedTarget;
      }

      const run = await createRun(
        routeContext,
        buildRunPayload({
          title: `Validate ${loaded.targetProfile.title}`,
          connectionProfileId: loaded.connectionProfile.id,
          targetProfileId: loaded.targetProfile.id,
          procedureType: "validate",
          scopeKind: resolveScopeKind(loaded.targetProfile.targetKind),
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
      );
      if (run?.ok === false) {
        return run;
      }

      return buildSuccessResponse(result.message, {
        item: updatedTarget,
        run
      });
    }
  );
}

function registerTargetCompareRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/targets/:targetId/compare`,
    async function targetCompareRoute(request, reply) {
      const loaded = await ensureLoadedTarget(routeContext, request, reply);
      if (loaded?.ok === false) {
        return loaded;
      }
      const result =
        loaded.targetProfile.adapterMode === "live-gcp"
          ? await compareLiveRemoteTarget({
              targetProfile: loaded.targetProfile,
              connectionProfile: loaded.connectionProfile,
              collectionHandlerRegistry: routeContext.collectionHandlerRegistry
            })
          : await compareRemoteTarget({
              targetProfile: loaded.targetProfile,
              collectionHandlerRegistry: routeContext.collectionHandlerRegistry
            });
      const updatedTarget = await updateItem(
        routeContext.targetsHandler,
        loaded.targetProfile,
        {
          lastComparedOn: toTimestamp(),
          compareSummary: result.summary
        },
        reply
      );
      if (updatedTarget?.ok === false) {
        return updatedTarget;
      }

      const run = await createRun(
        routeContext,
        buildRunPayload({
          title: `Compare ${loaded.targetProfile.title}`,
          connectionProfileId: loaded.connectionProfile.id,
          targetProfileId: loaded.targetProfile.id,
          procedureType: "compare",
          scopeKind: resolveScopeKind(loaded.targetProfile.targetKind),
          direction: "compare",
          dryRun: true,
          status: result.summary.state === "error" ? "failed" : result.summary.state === "drift" ? "warning" : "succeeded",
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
      );
      if (run?.ok === false) {
        return run;
      }
      return buildSuccessResponse(result.message, { item: updatedTarget, run });
    }
  );
}

function registerTargetExecuteRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/targets/:targetId/execute`,
    async function targetExecuteRoute(request, reply) {
      const loaded = await ensureLoadedTarget(routeContext, request, reply);
      if (loaded?.ok === false) {
        return loaded;
      }
      if (loaded.targetProfile.policy?.requireDryRunFirst && !loaded.targetProfile.lastComparedOn) {
        reply.code(409);
        return errorPayload("REMOTE_OPS_COMPARE_REQUIRED", "Run compare before executing this target");
      }

      const result =
        loaded.targetProfile.adapterMode === "live-gcp"
          ? await executeLiveRemoteTarget({
              targetProfile: loaded.targetProfile,
              connectionProfile: loaded.connectionProfile,
              collectionHandlerRegistry: routeContext.collectionHandlerRegistry
            })
          : await executeRemoteTarget({
              targetProfile: loaded.targetProfile,
              collectionHandlerRegistry: routeContext.collectionHandlerRegistry
            });
      const updatedTarget = await updateItem(
        routeContext.targetsHandler,
        loaded.targetProfile,
        {
          lastComparedOn: toTimestamp(),
          compareSummary: result.summary,
          targetStatus: result.summary.state === "error" ? "error" : result.summary.state === "clean" ? "validated" : "warning"
        },
        reply
      );
      if (updatedTarget?.ok === false) {
        return updatedTarget;
      }

      const run = await createRun(
        routeContext,
        buildRunPayload({
          title: `Execute ${loaded.targetProfile.title}`,
          connectionProfileId: loaded.connectionProfile.id,
          targetProfileId: loaded.targetProfile.id,
          procedureType: "execute",
          scopeKind: resolveScopeKind(loaded.targetProfile.targetKind),
          direction: "push",
          dryRun: false,
          status: result.summary.state === "error" ? "failed" : result.runSummary.warnings?.length > 0 ? "warning" : "succeeded",
          message: result.message,
          summary: result.runSummary
        }),
        reply
      );
      if (run?.ok === false) {
        return run;
      }
      return buildSuccessResponse(result.message, { item: updatedTarget, run });
    }
  );
}

function registerTargetRestoreRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/targets/:targetId/restore`,
    async function targetRestoreRoute(request, reply) {
      const loaded = await ensureLoadedTarget(routeContext, request, reply);
      if (loaded?.ok === false) {
        return loaded;
      }
      const result =
        loaded.targetProfile.adapterMode === "live-gcp"
          ? await restoreLiveRemoteTarget({
              targetProfile: loaded.targetProfile,
              connectionProfile: loaded.connectionProfile
            })
          : await restoreRemoteTarget({
              targetProfile: loaded.targetProfile
            });
      const compareResult =
        loaded.targetProfile.adapterMode === "live-gcp"
          ? await compareLiveRemoteTarget({
              targetProfile: loaded.targetProfile,
              connectionProfile: loaded.connectionProfile,
              collectionHandlerRegistry: routeContext.collectionHandlerRegistry
            })
          : await compareRemoteTarget({
              targetProfile: loaded.targetProfile,
              collectionHandlerRegistry: routeContext.collectionHandlerRegistry
            });
      const updatedTarget = await updateItem(
        routeContext.targetsHandler,
        loaded.targetProfile,
        {
          lastComparedOn: toTimestamp(),
          compareSummary: compareResult.summary,
          targetStatus: compareResult.summary.state === "clean" ? "validated" : "warning"
        },
        reply
      );
      if (updatedTarget?.ok === false) {
        return updatedTarget;
      }

      const run = await createRun(
        routeContext,
        buildRunPayload({
          title: `Restore ${loaded.targetProfile.title}`,
          connectionProfileId: loaded.connectionProfile.id,
          targetProfileId: loaded.targetProfile.id,
          procedureType: "restore",
          scopeKind: resolveScopeKind(loaded.targetProfile.targetKind),
          direction: "restore",
          dryRun: false,
          status: result.status,
          message: result.message,
          summary: result.runSummary
        }),
        reply
      );
      if (run?.ok === false) {
        return run;
      }
      return buildSuccessResponse(result.message, { item: updatedTarget, run });
    }
  );
}

function registerSeedRemoteExtraRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/targets/:targetId/seed-remote-extra`,
    async function seedRemoteExtraRoute(request, reply) {
      const loaded = await ensureLoadedTarget(routeContext, request, reply);
      if (loaded?.ok === false) {
        return loaded;
      }
      if (loaded.targetProfile.adapterMode === "live-gcp") {
        reply.code(409);
        return errorPayload(
          "REMOTE_OPS_LIVE_SEED_UNSUPPORTED",
          "Remote-extra seeding is a simulated-only utility."
        );
      }

      const relativePath = await seedSimulatedRemoteExtraFile(loaded.targetProfile);
      if (!relativePath) {
        reply.code(409);
        return errorPayload(
          "REMOTE_OPS_SEED_UNAVAILABLE",
          "Remote extra seeding is only available for storage targets in Step 1"
        );
      }

      const compareResult = await compareRemoteTarget({
        targetProfile: loaded.targetProfile,
        collectionHandlerRegistry: routeContext.collectionHandlerRegistry
      });
      const updatedTarget = await updateItem(
        routeContext.targetsHandler,
        loaded.targetProfile,
        {
          lastComparedOn: toTimestamp(),
          compareSummary: compareResult.summary,
          targetStatus: "warning"
        },
        reply
      );
      if (updatedTarget?.ok === false) {
        return updatedTarget;
      }

      const run = await createRun(
        routeContext,
        buildRunPayload({
          title: `Seed Remote Extra ${loaded.targetProfile.title}`,
          connectionProfileId: loaded.connectionProfile.id,
          targetProfileId: loaded.targetProfile.id,
          procedureType: "execute",
          scopeKind: resolveScopeKind(loaded.targetProfile.targetKind),
          direction: "push",
          dryRun: false,
          status: "warning",
          message: `Seeded simulated remote extra '${relativePath}'`,
          summary: {
            createCount: 1,
            updateCount: 0,
            deleteCount: 0,
            restoredCount: 0,
            sampleKeys: [relativePath],
            warnings: ["Step 1 smoke utility created a remote-only artifact."]
          }
        }),
        reply
      );
      if (run?.ok === false) {
        return run;
      }
      return buildSuccessResponse(`Seeded simulated remote extra '${relativePath}'`, { item: updatedTarget, run });
    }
  );
}

export function registerTargetRoutes(fastify, routeContext) {
  registerTargetValidateRoute(fastify, routeContext);
  registerTargetCompareRoute(fastify, routeContext);
  registerTargetExecuteRoute(fastify, routeContext);
  registerTargetRestoreRoute(fastify, routeContext);
  registerSeedRemoteExtraRoute(fastify, routeContext);
}
