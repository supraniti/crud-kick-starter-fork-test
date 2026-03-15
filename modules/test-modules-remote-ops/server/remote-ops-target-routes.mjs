import { seedSimulatedRemoteExtraFile } from "./remote-ops-simulated-runtime.mjs";
import {
  createRun,
  ensureModuleEnabled,
  errorPayload,
  loadTargetAndConnection,
  updateItem
} from "./remote-ops-route-runtime.mjs";
import { buildRunPayload, buildSuccessResponse, resolveScopeKind } from "./remote-ops-route-runtime.mjs";
import { compareRemoteTarget } from "./remote-ops-simulated-runtime.mjs";
import {
  performTargetCompareProcedure,
  performTargetExecuteProcedure,
  performTargetRestoreProcedure,
  performTargetValidationProcedure
} from "./remote-ops-target-procedure-runtime.mjs";
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

      const procedure = await performTargetValidationProcedure({
        targetProfile: loaded.targetProfile,
        connectionProfile: loaded.connectionProfile,
        collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
        targetsHandler: routeContext.targetsHandler,
        runsHandler: routeContext.runsHandler,
        reply
      });
      return buildSuccessResponse(procedure.message, {
        item: procedure.item,
        run: procedure.run
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
      const procedure = await performTargetCompareProcedure({
        targetProfile: loaded.targetProfile,
        connectionProfile: loaded.connectionProfile,
        collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
        targetsHandler: routeContext.targetsHandler,
        runsHandler: routeContext.runsHandler,
        reply
      });
      return buildSuccessResponse(procedure.message, {
        item: procedure.item,
        run: procedure.run
      });
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
      try {
        const procedure = await performTargetExecuteProcedure({
          targetProfile: loaded.targetProfile,
          connectionProfile: loaded.connectionProfile,
          collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
          targetsHandler: routeContext.targetsHandler,
          runsHandler: routeContext.runsHandler,
          reply
        });
        return buildSuccessResponse(procedure.message, {
          item: procedure.item,
          run: procedure.run
        });
      } catch (error) {
        if (error?.message === "Run compare before executing this target") {
          reply.code(409);
          return errorPayload("REMOTE_OPS_COMPARE_REQUIRED", error.message);
        }
        throw error;
      }
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
      const procedure = await performTargetRestoreProcedure({
        targetProfile: loaded.targetProfile,
        connectionProfile: loaded.connectionProfile,
        collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
        targetsHandler: routeContext.targetsHandler,
        runsHandler: routeContext.runsHandler,
        reply
      });
      return buildSuccessResponse(procedure.message, {
        item: procedure.item,
        run: procedure.run
      });
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
