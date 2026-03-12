import { buildGcpProvisioningModel } from "./remote-ops-gcp-provisioning-model.mjs";
import { analyzeGcpCompatibility } from "./remote-ops-gcp-compatibility-runtime.mjs";
import { executeGcpProvisioning } from "./remote-ops-gcp-provisioning-execution-runtime.mjs";
import {
  buildProcedureStatus,
  buildRunPayload,
  buildSuccessResponse,
  createRun,
  ensureModuleEnabled,
  errorPayload,
  loadItem
} from "./remote-ops-route-runtime.mjs";

async function loadConnectionProfile(routeContext, connectionId, reply) {
  return loadItem(routeContext.connectionsHandler, connectionId, "connection profile", reply);
}

async function loadConnectionTargets(routeContext, connectionId) {
  const payload = await routeContext.targetsHandler.list({
    limit: 500
  });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.filter((item) => item.connectionProfileId === connectionId);
}

function registerProvisioningModelRoute(fastify, routeContext) {
  fastify.get(
    `/api/reference/modules/${routeContext.moduleId}/gcp/provisioning-model`,
    async function provisioningModelRoute(_request, reply) {
      const availability = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
      if (availability !== true) {
        return availability;
      }

      return buildSuccessResponse("Loaded GCP provisioning model.", {
        model: buildGcpProvisioningModel()
      });
    }
  );
}

function registerAnalyzeCompatibilityRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/connections/:connectionId/analyze-compatibility`,
    async function analyzeCompatibilityRoute(request, reply) {
      const availability = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
      if (availability !== true) {
        return availability;
      }

      const connectionProfile = await loadConnectionProfile(routeContext, request.params?.connectionId, reply);
      if (connectionProfile?.ok === false) {
        return connectionProfile;
      }

      try {
        const targetProfiles = await loadConnectionTargets(routeContext, connectionProfile.id);
        const report = await analyzeGcpCompatibility({
          connectionProfile,
          targetProfiles
        });
        const run = await createRun(
          routeContext,
          buildRunPayload({
            title: `Analyze Compatibility ${connectionProfile.profileName}`,
            connectionProfileId: connectionProfile.id,
            procedureType: "validate",
            scopeKind: "connection",
            direction: "compare",
            dryRun: true,
            status: buildProcedureStatus(
              report.overallState === "blocked"
                ? "error"
                : report.overallState === "action-required"
                  ? "warning"
                  : "validated"
            ),
            message:
              report.overallState === "compatible"
                ? "Remote compatibility requirements are satisfied."
                : report.overallState === "blocked"
                  ? "Remote compatibility is blocked by missing permissions."
                  : "Remote compatibility requires additional provisioning or configuration.",
            summary: {
              createCount: report.provisionableActions.length,
              updateCount: 0,
              deleteCount: 0,
              restoredCount: 0,
              sampleKeys: report.missingResources
                .map((resource) => resource.label ?? resource.serviceName ?? resource.bucketName)
                .filter(Boolean)
                .slice(0, 8),
              warnings: report.bundles
                .flatMap((bundle) => bundle.configurationWarnings)
                .filter(Boolean)
                .slice(0, 8)
            }
          }),
          reply
        );
        if (run?.ok === false) {
          return run;
        }

        return buildSuccessResponse("Loaded remote compatibility analysis.", {
          report,
          run
        });
      } catch (error) {
        reply.code(400);
        return errorPayload(
          "REMOTE_OPS_COMPATIBILITY_ANALYSIS_FAILED",
          error?.message ?? "Failed to analyze remote compatibility."
        );
      }
    }
  );
}

function registerProvisionMissingRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/connections/:connectionId/provision-missing`,
    async function provisionMissingRoute(request, reply) {
      const availability = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
      if (availability !== true) {
        return availability;
      }

      const connectionProfile = await loadConnectionProfile(routeContext, request.params?.connectionId, reply);
      if (connectionProfile?.ok === false) {
        return connectionProfile;
      }

      try {
        const targetProfiles = await loadConnectionTargets(routeContext, connectionProfile.id);
        const model = buildGcpProvisioningModel();
        const report = await analyzeGcpCompatibility({
          connectionProfile,
          targetProfiles
        });
        const provisioningResult = await executeGcpProvisioning({
          model,
          connectionProfile,
          targetProfiles,
          report,
          confirmedSafeguardIds: request.body?.confirmedSafeguardIds,
          actionIds: request.body?.actionIds
        });
        const nextReport = await analyzeGcpCompatibility({
          connectionProfile,
          targetProfiles
        });
        const run = await createRun(
          routeContext,
          buildRunPayload({
            title: `Provision Missing ${connectionProfile.profileName}`,
            connectionProfileId: connectionProfile.id,
            procedureType: "execute",
            scopeKind: "connection",
            direction: "push",
            dryRun: false,
            status: buildProcedureStatus(
              nextReport.overallState === "blocked"
                ? "error"
                : nextReport.overallState === "action-required"
                  ? "warning"
                  : "validated"
            ),
            message: provisioningResult.message,
            summary: provisioningResult.summary
          }),
          reply
        );
        if (run?.ok === false) {
          return run;
        }

        return buildSuccessResponse(provisioningResult.message, {
          report: nextReport,
          run,
          executedActions: provisioningResult.executedActions
        });
      } catch (error) {
        reply.code(error?.code === "REMOTE_OPS_GCP_SAFEGUARD_CONFIRMATION_REQUIRED" ? 409 : 400);
        return errorPayload(
          error?.code ?? "REMOTE_OPS_PROVISION_MISSING_FAILED",
          error?.message ?? "Failed to provision missing remote requirements."
        );
      }
    }
  );
}

export function registerProvisioningRoutes(fastify, routeContext) {
  registerProvisioningModelRoute(fastify, routeContext);
  registerAnalyzeCompatibilityRoute(fastify, routeContext);
  registerProvisionMissingRoute(fastify, routeContext);
}
