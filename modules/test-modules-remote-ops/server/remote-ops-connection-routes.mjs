import {
  buildServiceAccountConnectionMetadata,
  importServiceAccountCredentialFile,
  readServiceAccountCredentialFromPath
} from "./remote-ops-service-account-auth-runtime.mjs";
import {
  simulateConnectionConnect,
  validateConnectionProfile
} from "./remote-ops-simulated-runtime.mjs";
import {
  buildProcedureStatus,
  buildRunPayload,
  buildSuccessResponse,
  createRun,
  ensureModuleEnabled,
  errorPayload,
  loadItem,
  updateItem
} from "./remote-ops-route-runtime.mjs";
import { ensureStandardProductBundle } from "./remote-ops-product-bundle-runtime.mjs";
import { validateLiveConnectionProfile } from "./remote-ops-live-validation-runtime.mjs";
import { buildGcpBillingOverview } from "./remote-ops-gcp-billing-runtime.mjs";
import { normalizeOptionalText, toTimestamp } from "./remote-ops-shared-runtime.mjs";

function buildConnectionPatchFromValidation(connectionProfile, result) {
  return {
    connectionStatus: result.nextStatus,
    lastValidatedOn: toTimestamp(),
    validationSummary: result.summary,
    projectId: result.project?.projectId ?? connectionProfile.projectId ?? null,
    projectNumber: result.project?.projectNumber ?? connectionProfile.projectNumber ?? null,
    projectDisplayName: result.project?.displayName ?? connectionProfile.projectDisplayName ?? null,
    serviceAccountEmail: result.serviceAccountEmail ?? connectionProfile.serviceAccountEmail ?? null,
    serviceAccountKeyId: result.serviceAccountKeyId ?? connectionProfile.serviceAccountKeyId ?? null
  };
}

async function recordConnectionRun(routeContext, connectionProfileId, title, status, message, reply) {
  return createRun(
    routeContext,
    buildRunPayload({
      title,
      connectionProfileId,
      procedureType: "connect",
      scopeKind: "connection",
      direction: "validate",
      dryRun: false,
      status,
      message,
      summary: {
        warnings: [],
        sampleKeys: []
      }
    }),
    reply
  );
}

async function loadConnectionProfile(routeContext, request, reply) {
  return loadItem(routeContext.connectionsHandler, request.params?.connectionId, "connection profile", reply);
}

function shouldUseLiveConnectionValidation(connectionProfile) {
  return connectionProfile.authMode === "service-account-key" && Boolean(connectionProfile.credentialPathHint);
}

function buildLoadedConnectionPatch(connectionProfile, loadedCredential) {
  const metadata = buildServiceAccountConnectionMetadata(loadedCredential);
  return {
    authMode: "service-account-key",
    credentialPathHint: metadata.credentialPathHint,
    credentialLabel: connectionProfile.credentialLabel ?? metadata.credentialLabel,
    serviceAccountEmail: metadata.serviceAccountEmail,
    serviceAccountKeyId: metadata.serviceAccountKeyId,
    projectId: connectionProfile.projectId ?? metadata.projectId ?? null,
    projectNumber: null,
    projectDisplayName: null,
    connectionStatus: "connected",
    lastConnectedOn: toTimestamp(),
    validationSummary: {
      state: "unknown",
      message: "Service account key loaded. Validate the connection to confirm project access.",
      checkedItems: ["service account credential"],
      warnings: [],
      canProceed: false
    }
  };
}

function registerConnectRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/connections/:connectionId/connect`,
    async function connectionConnectRoute(request, reply) {
      const availability = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
      if (availability !== true) {
        return availability;
      }
      const connectionProfile = await loadConnectionProfile(routeContext, request, reply);
      if (connectionProfile?.ok === false) {
        return connectionProfile;
      }
      if (connectionProfile.authMode !== "service-account-key") {
        reply.code(409);
        return errorPayload(
          "REMOTE_OPS_AUTH_MODE_UNSUPPORTED",
          "Step 1 live connect now supports service-account-key only."
        );
      }
      try {
        const loadedCredential = await readServiceAccountCredentialFromPath(
          connectionProfile.credentialPathHint ?? request.body?.credentialPath
        );
        const updatedConnection = await updateItem(
          routeContext.connectionsHandler,
          connectionProfile,
          buildLoadedConnectionPatch(connectionProfile, loadedCredential),
          reply
        );
        if (updatedConnection?.ok === false) {
          return updatedConnection;
        }
        const run = await recordConnectionRun(
          routeContext,
          connectionProfile.id,
          `Connect ${connectionProfile.profileName}`,
          "succeeded",
          `Loaded service account '${loadedCredential.credential.clientEmail}'.`,
          reply
        );
        if (run?.ok === false) {
          return run;
        }
        return buildSuccessResponse(
          `Loaded service account '${loadedCredential.credential.clientEmail}'.`,
          {
            item: updatedConnection,
            run
          }
        );
      } catch (error) {
        reply.code(400);
        return errorPayload(
          "REMOTE_OPS_SERVICE_ACCOUNT_LOAD_FAILED",
          error?.message ?? "Failed to load the service-account key file."
        );
      }
    }
  );
}

function registerImportCredentialRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/connections/:connectionId/import-key-file`,
    async function connectionImportKeyFileRoute(request, reply) {
      const availability = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
      if (availability !== true) {
        return availability;
      }
      const connectionProfile = await loadConnectionProfile(routeContext, request, reply);
      if (connectionProfile?.ok === false) {
        return connectionProfile;
      }
      if (connectionProfile.authMode !== "service-account-key") {
        reply.code(409);
        return errorPayload(
          "REMOTE_OPS_AUTH_MODE_UNSUPPORTED",
          "Step 1 live import now supports service-account-key only."
        );
      }
      try {
        const importedCredential = await importServiceAccountCredentialFile({
          connectionId: connectionProfile.id,
          fileName: request.body?.fileName,
          fileContent: request.body?.fileContent,
          previousPath: connectionProfile.credentialPathHint
        });
        const updatedConnection = await updateItem(
          routeContext.connectionsHandler,
          connectionProfile,
          buildLoadedConnectionPatch(connectionProfile, importedCredential),
          reply
        );
        if (updatedConnection?.ok === false) {
          return updatedConnection;
        }
        const run = await recordConnectionRun(
          routeContext,
          connectionProfile.id,
          `Connect ${connectionProfile.profileName}`,
          "succeeded",
          `Imported service account '${importedCredential.credential.clientEmail}'.`,
          reply
        );
        if (run?.ok === false) {
          return run;
        }
        return buildSuccessResponse(
          `Imported service account '${importedCredential.credential.clientEmail}'.`,
          {
            item: updatedConnection,
            run
          }
        );
      } catch (error) {
        reply.code(400);
        return errorPayload(
          "REMOTE_OPS_SERVICE_ACCOUNT_IMPORT_FAILED",
          error?.message ?? "Failed to import the service-account key file."
        );
      }
    }
  );
}

function registerSimulateConnectRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/connections/:connectionId/simulate-connect`,
    async function connectionSimulateConnectRoute(request, reply) {
      const availability = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
      if (availability !== true) {
        return availability;
      }
      const connectionProfile = await loadConnectionProfile(routeContext, request, reply);
      if (connectionProfile?.ok === false) {
        return connectionProfile;
      }
      const result = await simulateConnectionConnect(connectionProfile);
      const updatedConnection = await updateItem(
        routeContext.connectionsHandler,
        connectionProfile,
        {
          connectionStatus: result.nextStatus,
          lastConnectedOn: toTimestamp(),
          validationSummary: result.summary
        },
        reply
      );
      if (updatedConnection?.ok === false) {
        return updatedConnection;
      }
      const run = await recordConnectionRun(
        routeContext,
        connectionProfile.id,
        `Connect ${connectionProfile.profileName}`,
        buildProcedureStatus(result.nextStatus),
        result.message,
        reply
      );
      if (run?.ok === false) {
        return run;
      }
      return buildSuccessResponse(result.message, {
        item: updatedConnection,
        run
      });
    }
  );
}

function registerValidateConnectionRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/connections/:connectionId/validate`,
    async function connectionValidateRoute(request, reply) {
      const availability = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
      if (availability !== true) {
        return availability;
      }
      const connectionProfile = await loadConnectionProfile(routeContext, request, reply);
      if (connectionProfile?.ok === false) {
        return connectionProfile;
      }

      const result = shouldUseLiveConnectionValidation(connectionProfile)
        ? await validateLiveConnectionProfile(connectionProfile)
        : await validateConnectionProfile(connectionProfile);
      const updatedConnection = await updateItem(
        routeContext.connectionsHandler,
        connectionProfile,
        buildConnectionPatchFromValidation(connectionProfile, result),
        reply
      );
      if (updatedConnection?.ok === false) {
        return updatedConnection;
      }

      const run = await createRun(
        routeContext,
        buildRunPayload({
          title: `Validate ${connectionProfile.profileName}`,
          connectionProfileId: connectionProfile.id,
          procedureType: "validate",
          scopeKind: "connection",
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

      const productBundle = await ensureStandardProductBundle(
        routeContext,
        updatedConnection,
        reply
      );
      if (productBundle?.ok === false) {
        reply.code(productBundle.statusCode ?? 400);
        return productBundle.payload;
      }

      return buildSuccessResponse(result.message, {
        item: updatedConnection,
        run,
        productBundle: productBundle.bundle
      });
    }
  );
}

function registerBillingOverviewRoute(fastify, routeContext) {
  fastify.get(
    `/api/reference/modules/${routeContext.moduleId}/connections/:connectionId/billing-overview`,
    async function connectionBillingOverviewRoute(request, reply) {
      const availability = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
      if (availability !== true) {
        return availability;
      }
      const connectionProfile = await loadConnectionProfile(routeContext, request, reply);
      if (connectionProfile?.ok === false) {
        return connectionProfile;
      }
      if (connectionProfile.authMode !== "service-account-key") {
        reply.code(409);
        return errorPayload(
          "REMOTE_OPS_AUTH_MODE_UNSUPPORTED",
          "Billing overview currently supports service-account-key connections only."
        );
      }
      try {
        const report = await buildGcpBillingOverview(connectionProfile);
        return buildSuccessResponse("Loaded GCP billing overview.", {
          report
        });
      } catch (error) {
        reply.code(400);
        return errorPayload(
          "REMOTE_OPS_BILLING_OVERVIEW_FAILED",
          error?.message ?? "Failed to load the GCP billing overview."
        );
      }
    }
  );
}

export function registerConnectionRoutes(fastify, routeContext) {
  registerImportCredentialRoute(fastify, routeContext);
  registerConnectRoute(fastify, routeContext);
  registerSimulateConnectRoute(fastify, routeContext);
  registerValidateConnectionRoute(fastify, routeContext);
  registerBillingOverviewRoute(fastify, routeContext);
}
