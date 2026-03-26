import { buildGcpProvisioningModel } from "./remote-ops-gcp-provisioning-model.mjs";
import { analyzeGcpCompatibility } from "./remote-ops-gcp-compatibility-runtime.mjs";
import { executeGcpProvisioning } from "./remote-ops-gcp-provisioning-execution-runtime.mjs";
import {
  ensureStandardProductBundle,
  listMissingManagedTargetSpecs,
  resolveManagedTargetCompatibilityBundleId
} from "./remote-ops-product-bundle-runtime.mjs";
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

function createManagedTargetProvisionAction(spec) {
  return {
    id: `prepare-managed-target-${spec.key}`,
    label: `Prepare ${spec.title}`,
    resourceKind: "managed-target",
    bindingKey: spec.key,
    createSupported: true,
    phaseStatus: "execution-started",
    availableNow: true,
    missingPermissions: [],
    notes: [`Create the standard managed target for ${spec.title}.`]
  };
}

function recomputeCompatibilitySummary(report) {
  const bundles = Array.isArray(report?.bundles) ? report.bundles : [];
  const blockedBundles = bundles.filter((bundle) => bundle?.state === "blocked").length;
  const actionRequiredBundles = bundles.filter((bundle) => bundle?.state === "action-required").length;
  const compatibleBundles = bundles.filter((bundle) => bundle?.state === "compatible").length;
  report.provisionableActions = bundles.flatMap((bundle) =>
    (Array.isArray(bundle?.provisionableActions) ? bundle.provisionableActions : []).map((action) => ({
      ...action,
      bundleId: bundle.id,
      bundleLabel: bundle.label
    }))
  );
  report.missingResources = bundles.flatMap((bundle) =>
    (Array.isArray(bundle?.missingResources) ? bundle.missingResources : []).map((resource) => ({
      ...resource,
      bundleId: bundle.id,
      bundleLabel: bundle.label
    }))
  );
  report.counts = {
    blockedBundles,
    actionRequiredBundles,
    compatibleBundles
  };
  report.overallState = blockedBundles > 0 ? "blocked" : actionRequiredBundles > 0 ? "action-required" : "compatible";
  return report;
}

function augmentCompatibilityReportWithManagedTargetGaps(report, targetProfiles = []) {
  const missingSpecs = listMissingManagedTargetSpecs(targetProfiles);
  if (missingSpecs.length === 0) {
    return report;
  }

  for (const spec of missingSpecs) {
    const bundleId = resolveManagedTargetCompatibilityBundleId(spec.key);
    const bundle = Array.isArray(report?.bundles)
      ? report.bundles.find((entry) => entry?.id === bundleId) ?? null
      : null;
    if (!bundle) {
      continue;
    }
    const alreadyTracked = Array.isArray(bundle.missingResources)
      ? bundle.missingResources.some((resource) => resource?.bindingKey === spec.key)
      : false;
    if (alreadyTracked) {
      continue;
    }
    bundle.missingResources = [
      ...(Array.isArray(bundle.missingResources) ? bundle.missingResources : []),
      {
        kind: "managed-target",
        label: spec.title,
        bindingKey: spec.key
      }
    ];
    bundle.provisionableActions = [
      ...(Array.isArray(bundle.provisionableActions) ? bundle.provisionableActions : []),
      createManagedTargetProvisionAction(spec)
    ];
    bundle.notes = [
      ...(Array.isArray(bundle.notes) ? bundle.notes : []),
      `${spec.title} has not been prepared yet.`
    ];
    if (bundle.state !== "blocked") {
      bundle.state = "action-required";
    }
  }

  return recomputeCompatibilitySummary(report);
}

function selectRequestedManagedTargetSpecs(connectionTargets, actionIds = null) {
  const requestedIds =
    Array.isArray(actionIds) && actionIds.length > 0 ? new Set(actionIds) : null;
  return listMissingManagedTargetSpecs(connectionTargets).filter((spec) => {
    if (!requestedIds) {
      return true;
    }
    return requestedIds.has(`prepare-managed-target-${spec.key}`);
  });
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
        const report = augmentCompatibilityReportWithManagedTargetGaps(
          await analyzeGcpCompatibility({
            connectionProfile,
            targetProfiles
          }),
          targetProfiles
        );
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
        let targetProfiles = await loadConnectionTargets(routeContext, connectionProfile.id);
        const model = buildGcpProvisioningModel();
        let report = augmentCompatibilityReportWithManagedTargetGaps(
          await analyzeGcpCompatibility({
            connectionProfile,
            targetProfiles
          }),
          targetProfiles
        );
        const requestedManagedTargetSpecs = selectRequestedManagedTargetSpecs(
          targetProfiles,
          request.body?.actionIds
        );
        const executedManagedActions = [];
        if (requestedManagedTargetSpecs.length > 0) {
          const bundleResult = await ensureStandardProductBundle(
            routeContext,
            connectionProfile,
            reply
          );
          if (bundleResult?.ok !== true) {
            return bundleResult?.payload ?? errorPayload(
              "REMOTE_OPS_MANAGED_TARGET_PREPARE_FAILED",
              "Failed to prepare managed product targets."
            );
          }
          executedManagedActions.push(
            ...requestedManagedTargetSpecs.map((spec) => ({
              id: `prepare-managed-target-${spec.key}`,
              label: `Prepare ${spec.title}`,
              resourceKind: "managed-target"
            }))
          );
          targetProfiles = await loadConnectionTargets(routeContext, connectionProfile.id);
          report = augmentCompatibilityReportWithManagedTargetGaps(
            await analyzeGcpCompatibility({
              connectionProfile,
              targetProfiles
            }),
            targetProfiles
          );
        }
        const gcpActionIds = Array.isArray(request.body?.actionIds)
          ? request.body.actionIds.filter((actionId) => !String(actionId).startsWith("prepare-managed-target-"))
          : null;
        const provisioningResult = await executeGcpProvisioning({
          model,
          connectionProfile,
          targetProfiles,
          report,
          confirmedSafeguardIds: request.body?.confirmedSafeguardIds,
          actionIds: gcpActionIds
        });
        const nextReport = augmentCompatibilityReportWithManagedTargetGaps(
          await analyzeGcpCompatibility({
            connectionProfile,
            targetProfiles: await loadConnectionTargets(routeContext, connectionProfile.id)
          }),
          await loadConnectionTargets(routeContext, connectionProfile.id)
        );
        const combinedExecutedActions = [...executedManagedActions, ...(provisioningResult.executedActions ?? [])];
        const combinedSummary = {
          createCount: combinedExecutedActions.length,
          updateCount: 0,
          deleteCount: 0,
          restoredCount: 0,
          sampleKeys: combinedExecutedActions.map((action) => action.label).slice(0, 8),
          warnings: combinedExecutedActions.length > 0 ? [] : provisioningResult.summary?.warnings ?? []
        };
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
            message:
              combinedExecutedActions.length > 0
                ? `Prepared ${combinedExecutedActions.length} missing remote requirement${combinedExecutedActions.length === 1 ? "" : "s"}.`
                : provisioningResult.message,
            summary: combinedSummary
          }),
          reply
        );
        if (run?.ok === false) {
          return run;
        }

        return buildSuccessResponse(
          combinedExecutedActions.length > 0
            ? `Prepared ${combinedExecutedActions.length} missing remote requirement${combinedExecutedActions.length === 1 ? "" : "s"}.`
            : provisioningResult.message,
          {
          report: nextReport,
          run,
          executedActions: combinedExecutedActions
          }
        );
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
