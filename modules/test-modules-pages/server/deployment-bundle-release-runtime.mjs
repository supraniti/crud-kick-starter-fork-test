import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  createDeploymentBundleReleaseStepPlan,
  createDeploymentBundleRunCreatePayload,
  createDeploymentBundleRunUpdatePayload,
  markDeploymentBundleRunStep
} from "../shared/deployment-bundle-release-shared.mjs";
import { collectDeploymentBundleOperationalConflicts } from "./distribution-bundle-handler-runtime.mjs";
import {
  DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID,
  REMOTE_OPERATION_RUNS_COLLECTION_ID,
  normalizeOptionalText,
  isPagePublished,
  toTimestamp
} from "./distribution-shared-runtime.mjs";
import { runExplicitPageDeploymentSync } from "./page-deployment-runtime.mjs";
import {
  performTargetCompareProcedure,
  performTargetExecuteProcedure,
  performTargetValidationProcedure
} from "../../test-modules-remote-ops/server/remote-ops-target-procedure-runtime.mjs";

const RELEASE_TARGET_BINDINGS = Object.freeze([
  Object.freeze({
    fieldId: "postsProjectionTargetProfileId",
    compareKey: "compare-posts-projection",
    executeKey: "sync-posts-projection"
  }),
  Object.freeze({
    fieldId: "categoriesProjectionTargetProfileId",
    compareKey: "compare-categories-projection",
    executeKey: "sync-categories-projection"
  }),
  Object.freeze({
    fieldId: "tagsProjectionTargetProfileId",
    compareKey: "compare-tags-projection",
    executeKey: "sync-tags-projection"
  }),
  Object.freeze({
    fieldId: null,
    bindingKey: "translations-projection",
    compareKey: "compare-translations-projection",
    executeKey: "sync-translations-projection",
    optional: true
  }),
  Object.freeze({
    fieldId: "mediaTargetProfileId",
    compareKey: "compare-media",
    executeKey: "sync-media"
  }),
  Object.freeze({
    fieldId: "deploymentTargetProfileId",
    compareKey: "compare-html-deployment",
    executeKey: "sync-html-deployment"
  })
]);

function createReleaseError(code, message, statusCode = 400, extras = {}) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  Object.assign(error, extras);
  return error;
}

function buildPayload(payload) {
  return {
    ...payload,
    timestamp: toTimestamp()
  };
}

function normalizeRunFailurePayload(error, reply) {
  if (Array.isArray(error?.conflicts) && error.conflicts.length > 0) {
    reply.code(error.statusCode ?? 400);
    return badRequestWithConflicts(reply, error.conflicts, error.code ?? "PAGE_DEPLOYMENT_BUNDLE_RELEASE_INVALID");
  }

  reply.code(error?.statusCode ?? 500);
  return buildPayload({
    ok: false,
    error: {
      code: error?.code ?? "PAGE_DEPLOYMENT_BUNDLE_RELEASE_FAILED",
      message: error?.message ?? "Failed to run deployment bundle release"
    }
  });
}

async function loadRequiredItem(handler, itemId, notFoundCode, notFoundMessage) {
  const item = itemId ? await handler?.findById(itemId) : null;
  if (item) {
    return item;
  }
  throw createReleaseError(notFoundCode, notFoundMessage, 404);
}

async function validateBundleContract(routeContext, bundle) {
  const conflicts = await collectDeploymentBundleOperationalConflicts({
    registry: routeContext.collectionHandlerRegistry,
    preparedValue: bundle
  });
  if (conflicts.length > 0) {
    throw createReleaseError(
      "PAGE_DEPLOYMENT_BUNDLE_RELEASE_INVALID",
      "Deployment bundle is no longer release-ready.",
      409,
      { conflicts }
    );
  }
}

async function loadReleaseTargetBinding(routeContext, bundle, bindingDefinition) {
  const targetId = bindingDefinition.fieldId ? bundle?.[bindingDefinition.fieldId] ?? null : null;
  let targetProfile = targetId ? await routeContext.remoteTargetsHandler?.findById?.(targetId) : null;
  if (!targetProfile && bindingDefinition.bindingKey) {
    const listedTargetsPayload = await routeContext.remoteTargetsHandler?.list?.({
      limit: 500,
      offset: 0
    });
    const listedTargets = Array.isArray(listedTargetsPayload?.items) ? listedTargetsPayload.items : [];
    targetProfile =
      listedTargets.find(
        (target) =>
          normalizeOptionalText(target?.productBindingKey) === bindingDefinition.bindingKey
      ) ?? null;
  }
  if (!targetProfile && bindingDefinition.optional) {
    return null;
  }
  if (!targetProfile) {
    throw createReleaseError(
      "PAGE_DEPLOYMENT_BUNDLE_TARGET_MISSING",
      targetId ? `Target '${targetId}' was not found` : `Target binding '${bindingDefinition.bindingKey ?? bindingDefinition.fieldId}' is not configured`,
      404
    );
  }
  const connectionProfile = await loadRequiredItem(
    routeContext.remoteConnectionsHandler,
    targetProfile.connectionProfileId,
    "PAGE_DEPLOYMENT_BUNDLE_CONNECTION_MISSING",
    `Connection '${targetProfile.connectionProfileId}' was not found`
  );
  return {
    ...bindingDefinition,
    targetProfile,
    connectionProfile
  };
}

async function buildReleaseContext(routeContext, bundleId) {
  const bundle = await loadRequiredItem(
    routeContext.bundlesHandler,
    bundleId,
    "PAGE_DEPLOYMENT_BUNDLE_NOT_FOUND",
    `Deployment bundle '${bundleId}' was not found`
  );
  await validateBundleContract(routeContext, bundle);

  const page = await loadRequiredItem(
    routeContext.pagesHandler,
    bundle.pageId,
    "PAGE_DEPLOYMENT_BUNDLE_PAGE_MISSING",
    `Page '${bundle.pageId}' was not found`
  );
  if (!isPagePublished(page.status)) {
    throw createReleaseError(
      "PAGE_DEPLOYMENT_BUNDLE_PAGE_NOT_PUBLISHED",
      "Deployment bundle page must stay published before release can run.",
      409
    );
  }

  const targetBindings = await Promise.all(
    RELEASE_TARGET_BINDINGS.map((bindingDefinition) =>
      loadReleaseTargetBinding(routeContext, bundle, bindingDefinition)
    )
  );
  const browserBinding = await loadReleaseTargetBinding(routeContext, bundle, {
    fieldId: "browserDeliveryTargetProfileId",
    validateKey: "validate-browser-delivery"
  });

  return {
    bundle,
    page,
    targetBindings,
    browserBinding
  };
}

async function createBundleRunRecord(routeContext, bundle, page, includeBrowserValidation, reply) {
  const result = await routeContext.bundleRunsHandler.create({
    value: createDeploymentBundleRunCreatePayload({
      bundle,
      page,
      steps: createDeploymentBundleReleaseStepPlan(includeBrowserValidation),
      startedOn: toTimestamp()
    }),
    reply
  });
  if (!result?.ok) {
    throw createReleaseError(
      "PAGE_DEPLOYMENT_BUNDLE_RUN_CREATE_FAILED",
      result?.payload?.error?.message ?? "Failed to create deployment bundle run"
    );
  }
  return result.item;
}

async function updateBundleRunRecord(routeContext, runRecord, steps, status, summaryMessage, reply) {
  const payload = createDeploymentBundleRunUpdatePayload({
    previousRun: runRecord,
    steps,
    status,
    summaryMessage,
    finishedOn: status === "running" ? "" : toTimestamp()
  });
  const result = await routeContext.bundleRunsHandler.update({
    item: runRecord,
    body: payload,
    value: payload,
    reply
  });
  if (!result?.ok) {
    throw createReleaseError(
      "PAGE_DEPLOYMENT_BUNDLE_RUN_UPDATE_FAILED",
      result?.payload?.error?.message ?? "Failed to update deployment bundle run"
    );
  }
  return result.item;
}

function createRunController(routeContext, runRecord, reply) {
  let currentRun = runRecord;
  let currentSteps = currentRun.steps ?? [];

  return {
    get steps() {
      return currentSteps;
    },
    get run() {
      return currentRun;
    },
    async markSuccess(stepKey, message) {
      currentSteps = markDeploymentBundleRunStep(currentSteps, stepKey, "success", message, toTimestamp());
      currentRun = await updateBundleRunRecord(
        routeContext,
        currentRun,
        currentSteps,
        "running",
        "Release pipeline in progress",
        reply
      );
    },
    async markFailure(stepKey, message) {
      currentSteps = markDeploymentBundleRunStep(currentSteps, stepKey, "error", message, toTimestamp());
      currentRun = await updateBundleRunRecord(
        routeContext,
        currentRun,
        currentSteps,
        "failed",
        message,
        reply
      );
    },
    async complete(message) {
      currentRun = await updateBundleRunRecord(
        routeContext,
        currentRun,
        currentSteps,
        "completed",
        message,
        reply
      );
      return currentRun;
    }
  };
}

async function executeBoundStep(runController, stepKey, executor) {
  try {
    const result = await executor();
    await runController.markSuccess(stepKey, result?.message ?? "");
    return result;
  } catch (error) {
    await runController.markFailure(stepKey, error?.message ?? "Release pipeline step failed");
    throw error;
  }
}

async function runLocalHtmlSync(routeContext, releaseContext, runController) {
  return executeBoundStep(runController, "sync-local-html", async () => {
    await runExplicitPageDeploymentSync({
      handler: routeContext.pagesHandler,
      page: releaseContext.page,
      previousPage: releaseContext.page,
      collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
      resolveSettingsRepository: routeContext.resolveSettingsRepository,
      settingsDefinition: routeContext.manifest?.settings ?? null
    });
    return {
      message: "Local deployment synced"
    };
  });
}

async function runRemoteBindingCompare(routeContext, binding, runController) {
  if (!binding) {
    return;
  }
  const procedure = await executeBoundStep(runController, binding.compareKey, () =>
    performTargetCompareProcedure({
      targetProfile: binding.targetProfile,
      connectionProfile: binding.connectionProfile,
      collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
      targetsHandler: routeContext.remoteTargetsHandler,
      runsHandler: routeContext.remoteRunsHandler,
      reply: routeContext.reply
    })
  );
  binding.targetProfile = procedure.item ?? binding.targetProfile;
}

async function runRemoteBindingExecute(routeContext, binding, runController) {
  if (!binding) {
    return;
  }
  const procedure = await executeBoundStep(runController, binding.executeKey, () =>
    performTargetExecuteProcedure({
      targetProfile: binding.targetProfile,
      connectionProfile: binding.connectionProfile,
      collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
      targetsHandler: routeContext.remoteTargetsHandler,
      runsHandler: routeContext.remoteRunsHandler,
      reply: routeContext.reply
    })
  );
  binding.targetProfile = procedure.item ?? binding.targetProfile;
}

async function runBrowserValidation(routeContext, releaseContext, runController) {
  const procedure = await executeBoundStep(runController, "validate-browser-delivery", () =>
    performTargetValidationProcedure({
      targetProfile: releaseContext.browserBinding.targetProfile,
      connectionProfile: releaseContext.browserBinding.connectionProfile,
      collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
      targetsHandler: routeContext.remoteTargetsHandler,
      runsHandler: routeContext.remoteRunsHandler,
      reply: routeContext.reply
    })
  );
  releaseContext.browserBinding.targetProfile = procedure.item ?? releaseContext.browserBinding.targetProfile;
}

export async function runDeploymentBundleReleasePipeline(routeContext, bundleId, reply) {
  try {
    const boundContext = {
      ...routeContext,
      reply
    };
    const releaseContext = await buildReleaseContext(boundContext, bundleId);
    const runRecord = await createBundleRunRecord(
      boundContext,
      releaseContext.bundle,
      releaseContext.page,
      true,
      reply
    );
    const runController = createRunController(boundContext, runRecord, reply);

    await runLocalHtmlSync(boundContext, releaseContext, runController);
    for (const binding of releaseContext.targetBindings) {
      await runRemoteBindingCompare(boundContext, binding, runController);
      await runRemoteBindingExecute(boundContext, binding, runController);
    }
    await runBrowserValidation(boundContext, releaseContext, runController);

    const completedRun = await runController.complete(
      `Release pipeline completed for '${releaseContext.bundle.title}'`
    );
    return buildPayload({
      ok: true,
      message: `Release pipeline completed for '${releaseContext.bundle.title}'`,
      run: completedRun
    });
  } catch (error) {
    return normalizeRunFailurePayload(error, reply);
  }
}

export function registerDeploymentBundleReleaseRoute(fastify, routeContext) {
  fastify.post(
    `/api/reference/modules/${routeContext.moduleId}/deployment-bundles/:bundleId/run-release`,
    async function deploymentBundleReleaseRoute(request, reply) {
      return runDeploymentBundleReleasePipeline(routeContext, request.params?.bundleId, reply);
    }
  );
}

export {
  DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID,
  REMOTE_OPERATION_RUNS_COLLECTION_ID
};
