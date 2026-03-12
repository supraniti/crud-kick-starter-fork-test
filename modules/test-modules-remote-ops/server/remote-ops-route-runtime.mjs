import {
  CONNECTIONS_COLLECTION_ID,
  MODULE_ID,
  RUNS_COLLECTION_ID,
  TARGETS_COLLECTION_ID,
  normalizeRunStatus,
  toTimestamp
} from "./remote-ops-shared-runtime.mjs";

export function buildPayload(payload) {
  return {
    ...payload,
    timestamp: toTimestamp()
  };
}

export function errorPayload(code, message) {
  return buildPayload({
    ok: false,
    error: {
      code,
      message
    }
  });
}

export function ensureModuleEnabled(moduleRegistry, moduleId, reply) {
  if (moduleRegistry?.getState(moduleId) === "enabled") {
    return true;
  }
  reply.code(409);
  return errorPayload("MODULE_ROUTE_UNAVAILABLE", `Module '${moduleId}' is not enabled`);
}

export function createRouteContext({
  manifest,
  moduleRegistry,
  collectionHandlerRegistry
}) {
  const moduleId = manifest?.id ?? MODULE_ID;
  return {
    moduleId,
    moduleRegistry,
    collectionHandlerRegistry,
    connectionsHandler: collectionHandlerRegistry.get(CONNECTIONS_COLLECTION_ID),
    targetsHandler: collectionHandlerRegistry.get(TARGETS_COLLECTION_ID),
    runsHandler: collectionHandlerRegistry.get(RUNS_COLLECTION_ID)
  };
}

export async function loadItem(handler, itemId, itemType, reply) {
  const item = await handler?.findById(itemId);
  if (item) {
    return item;
  }
  reply.code(404);
  return errorPayload(`${itemType.toUpperCase()}_NOT_FOUND`, `${itemType} '${itemId}' was not found`);
}

export async function updateItem(handler, item, patch, reply) {
  const result = await handler.update({
    body: patch,
    item,
    reply
  });
  if (result?.ok === true) {
    return result.item;
  }
  reply.code(result?.statusCode ?? 400);
  return result?.payload ?? errorPayload("REMOTE_OPS_UPDATE_FAILED", "Failed to update item");
}

export async function createRun(routeContext, payload, reply) {
  const result = await routeContext.runsHandler.create({
    value: payload,
    reply
  });
  if (result?.ok === true) {
    return result.item;
  }
  reply.code(result?.statusCode ?? 400);
  return result?.payload ?? errorPayload("REMOTE_OPS_RUN_CREATE_FAILED", "Failed to record operation run");
}

export function buildRunPayload({
  title,
  connectionProfileId = null,
  targetProfileId = null,
  procedureType,
  scopeKind,
  direction,
  dryRun,
  status,
  message,
  summary
}) {
  const timestamp = toTimestamp();
  return {
    title,
    connectionProfileId,
    targetProfileId,
    procedureType,
    scopeKind,
    direction,
    dryRun,
    status: normalizeRunStatus(status, "succeeded"),
    message,
    summary,
    startedOn: timestamp,
    finishedOn: timestamp
  };
}

export function buildSuccessResponse(message, extras = {}) {
  return buildPayload({
    ok: true,
    message,
    ...extras
  });
}

export function buildProcedureStatus(nextStatus) {
  if (nextStatus === "error") {
    return "failed";
  }
  if (nextStatus === "warning") {
    return "warning";
  }
  return "succeeded";
}

export function resolveScopeKind(targetKind) {
  if (targetKind === "firestore-projection") {
    return "firestore";
  }
  if (targetKind === "deployment-storage") {
    return "deployment";
  }
  if (targetKind === "media-storage") {
    return "media";
  }
  if (targetKind === "browser-delivery") {
    return "browser-delivery";
  }
  return "connection";
}

export async function loadTargetAndConnection(routeContext, targetId, reply) {
  const targetProfile = await loadItem(routeContext.targetsHandler, targetId, "target profile", reply);
  if (targetProfile?.ok === false) {
    return targetProfile;
  }
  const connectionProfile = await loadItem(
    routeContext.connectionsHandler,
    targetProfile.connectionProfileId,
    "connection profile",
    reply
  );
  if (connectionProfile?.ok === false) {
    return connectionProfile;
  }
  return {
    targetProfile,
    connectionProfile
  };
}
