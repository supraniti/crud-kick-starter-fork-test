import { buildBrowserDeliveryDescriptor, normalizeBrowserDeliveryConfig } from "../../test-modules-remote-ops/shared/browser-delivery-support.mjs";
import {
  readStoredRemoteConnectionProfileById,
  readStoredRemoteTargetProfileById
} from "../../test-modules-remote-ops/shared/target-profile-state-support.mjs";

const REMOTE_TARGETS_COLLECTION_ID = "remote-target-profiles";
const REMOTE_CONNECTIONS_COLLECTION_ID = "remote-connection-profiles";

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

async function findConnectionById(collectionHandlerRegistry, connectionId) {
  if (!connectionId) {
    return null;
  }
  const handler = collectionHandlerRegistry?.get?.(REMOTE_CONNECTIONS_COLLECTION_ID);
  if (handler && typeof handler.findById === "function") {
    const liveItem = await handler.findById(connectionId);
    if (liveItem) {
      return liveItem;
    }
  }
  return readStoredRemoteConnectionProfileById(connectionId);
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

function extractConnectionState(connection = null) {
  if (!connection || typeof connection !== "object") {
    return null;
  }
  return {
    id: connection.id,
    profileName: connection.profileName ?? null,
    provider: connection.provider ?? null,
    authMode: connection.authMode ?? null,
    credentialPathHint: connection.credentialPathHint ?? null,
    serviceAccountEmail: connection.serviceAccountEmail ?? null,
    projectId: connection.projectId ?? null
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
  const [deploymentTarget, mediaTarget, connectionProfile] = await Promise.all([
    findTargetById(collectionHandlerRegistry, browserConfig.deploymentTargetProfileId),
    findTargetById(collectionHandlerRegistry, browserConfig.mediaTargetProfileId),
    findConnectionById(collectionHandlerRegistry, browserTarget.connectionProfileId)
  ]);

  return {
    browserTarget: extractTargetState(browserTarget),
    deploymentTarget: extractTargetState(deploymentTarget),
    mediaTarget: extractTargetState(mediaTarget),
    connectionProfile: extractConnectionState(connectionProfile)
  };
}

export async function resolveBrowserDeliveryPayloadState({
  browserDeliveryState,
  pagePath,
  artifactRelativePath
}) {
  if (!browserDeliveryState?.browserTarget) {
    return null;
  }

  const descriptor = buildBrowserDeliveryDescriptor({
    browserTarget: browserDeliveryState.browserTarget,
    deploymentTarget: browserDeliveryState.deploymentTarget,
    mediaTarget: browserDeliveryState.mediaTarget,
    connectionProfile: browserDeliveryState.connectionProfile,
    pagePath,
    artifactRelativePath
  });
  return descriptor;
}
