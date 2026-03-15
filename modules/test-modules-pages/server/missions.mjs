import {
  PAGE_DEPLOYMENT_BUNDLE_RELEASE_MISSION_ID,
  validateDeploymentBundleReleaseMissionPayload
} from "../shared/deployment-bundle-release-shared.mjs";
import { MODULE_ID } from "./distribution-shared-runtime.mjs";
import { runDeploymentBundleReleasePipeline } from "./deployment-bundle-release-runtime.mjs";
import { createPagesRouteContext } from "./pages-route-context-runtime.mjs";

function createMissionReplyShim() {
  return {
    statusCode: 200,
    code(nextStatusCode) {
      this.statusCode = nextStatusCode;
      return this;
    }
  };
}

function createMissionExecutionError(payload) {
  const error = new Error(
    payload?.error?.message ?? "Failed to run deployment bundle release mission"
  );
  error.code = payload?.error?.code ?? "PAGE_DEPLOYMENT_BUNDLE_RELEASE_MISSION_FAILED";
  return error;
}

export function registerMissions(context = {}) {
  context.registry.register({
    missionId: PAGE_DEPLOYMENT_BUNDLE_RELEASE_MISSION_ID,
    moduleId: MODULE_ID,
    mission: {
      label: "Deployment Bundle Release",
      description:
        "Runs the persisted Pages deployment bundle release pipeline across local HTML, projections, media, deployment, and browser-delivery validation.",
      payload: {
        fields: [
          {
            id: "bundleId",
            label: "Bundle Id",
            type: "text",
            required: true
          }
        ]
      },
      validatePayload: validateDeploymentBundleReleaseMissionPayload,
      execute: async (payload, missionContext = {}) => {
        const routeContext = createPagesRouteContext({
          manifest: context.manifest,
          moduleRegistry: context.moduleRegistry,
          collectionHandlerRegistry: context.collectionHandlerRegistry,
          resolveSettingsRepository: context.resolveSettingsRepository
        });

        await missionContext.log?.("info", "Starting deployment bundle release", {
          bundleId: payload.bundleId
        });

        const result = await runDeploymentBundleReleasePipeline(
          routeContext,
          payload.bundleId,
          createMissionReplyShim()
        );
        if (!result?.ok) {
          throw createMissionExecutionError(result);
        }

        await missionContext.log?.("info", "Deployment bundle release completed", {
          bundleId: payload.bundleId,
          runId: result?.run?.id ?? null
        });

        return result;
      }
    }
  });
}
