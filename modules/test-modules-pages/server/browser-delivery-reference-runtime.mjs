import { buildBrowserDeliveryDescriptor, normalizeBrowserDeliveryConfig } from "../../test-modules-remote-ops/shared/browser-delivery-support.mjs";
import { readStoredRemoteTargetProfileById } from "../../test-modules-remote-ops/shared/target-profile-state-support.mjs";

const REMOTE_TARGETS_COLLECTION_ID = "remote-target-profiles";

async function findTargetById(collectionHandlerRegistry, targetId) {
  if (!targetId) {
    return null;
  }
  const handler = collectionHandlerRegistry?.get?.(REMOTE_TARGETS_COLLECTION_ID);
  if (handler && typeof handler.findById === "function") {
    const liveItem = await handler.findById(targetId);
    if (liveItem) {
      return liveItem;
    }
  }
  return readStoredRemoteTargetProfileById(targetId);
}

function extractTargetState(target = null) {
  if (!target || typeof target !== "object") {
    return null;
  }
  return {
    id: target.id,
    title: target.title ?? null,
    targetKind: target.targetKind ?? null,
    config: target.config ?? {}
  };
}

export async function resolveBrowserDeliverySettingsState({
  collectionHandlerRegistry,
  browserDeliveryTargetProfileId = null
}) {
  if (!browserDeliveryTargetProfileId) {
    return {
      browserTarget: null,
      deploymentTarget: null,
      mediaTarget: null
    };
  }

  const browserTarget = await findTargetById(collectionHandlerRegistry, browserDeliveryTargetProfileId);
  if (!browserTarget || browserTarget.targetKind !== "browser-delivery") {
    return {
      browserTarget: null,
      deploymentTarget: null,
      mediaTarget: null
    };
  }

  const browserConfig = normalizeBrowserDeliveryConfig(browserTarget.config);
  const [deploymentTarget, mediaTarget] = await Promise.all([
    findTargetById(collectionHandlerRegistry, browserConfig.deploymentTargetProfileId),
    findTargetById(collectionHandlerRegistry, browserConfig.mediaTargetProfileId)
  ]);

  return {
    browserTarget: extractTargetState(browserTarget),
    deploymentTarget: extractTargetState(deploymentTarget),
    mediaTarget: extractTargetState(mediaTarget)
  };
}

export function resolveBrowserDeliveryPayloadState({
  browserDeliveryState,
  pagePath,
  artifactRelativePath
}) {
  if (!browserDeliveryState?.browserTarget) {
    return null;
  }

  return buildBrowserDeliveryDescriptor({
    browserTarget: browserDeliveryState.browserTarget,
    deploymentTarget: browserDeliveryState.deploymentTarget,
    mediaTarget: browserDeliveryState.mediaTarget,
    pagePath,
    artifactRelativePath
  });
}
