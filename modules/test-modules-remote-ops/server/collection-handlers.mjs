import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  CONNECTIONS_COLLECTION_ID,
  MODULE_ID,
  RUNS_COLLECTION_ID,
  TARGETS_COLLECTION_ID,
  buildExposedConnectionProfile,
  buildExposedOperationRun,
  buildExposedTargetProfile,
  createEmptyCompareSummary,
  createEmptyValidationSummary,
  normalizeAuthMode,
  normalizeAdapterMode,
  normalizeConnectionProfileStatus as normalizeConnectionStatus,
  normalizeOptionalText,
  normalizeRunStatus,
  normalizeRunSummary,
  normalizeTargetConfig,
  normalizeTargetKind,
  normalizeTargetPolicy,
  normalizeTargetStatus,
  normalizeText,
  normalizeValidationSummary,
  normalizeCompareSummary,
  toTimestamp
} from "./remote-ops-shared-runtime.mjs";
import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";

function exposeListPayload(payload, transformItem) {
  return {
    ...payload,
    items: Array.isArray(payload?.items) ? payload.items.map(transformItem) : []
  };
}

function unwrapItemEnvelope(candidate) {
  if (candidate && typeof candidate === "object" && candidate.item && typeof candidate.item === "object") {
    return candidate.item;
  }
  return candidate;
}

function resolveField(input, currentItem, fieldId) {
  return input?.[fieldId] ?? currentItem?.[fieldId];
}

function normalizePreparedTextField(input, currentItem, fieldId, fallback = "") {
  return normalizeText(resolveField(input, currentItem, fieldId), fallback);
}

function normalizePreparedOptionalTextField(input, currentItem, fieldId) {
  return normalizeOptionalText(resolveField(input, currentItem, fieldId));
}

function buildPreparedConnectionStatus(input, currentItem) {
  return normalizeConnectionStatus(
    resolveField(input, currentItem, "connectionStatus"),
    currentItem?.connectionStatus ?? "draft"
  );
}

function buildPreparedTargetStatus(input, currentItem) {
  return normalizeTargetStatus(
    resolveField(input, currentItem, "targetStatus"),
    currentItem?.targetStatus ?? "draft"
  );
}

function buildPreparedConnectionValidationSummary(input, currentItem) {
  return normalizeValidationSummary(
    resolveField(input, currentItem, "validationSummary") ?? createEmptyValidationSummary()
  );
}

function buildPreparedTargetValidationSummary(input, currentItem) {
  return normalizeValidationSummary(
    resolveField(input, currentItem, "validationSummary") ?? createEmptyValidationSummary()
  );
}

function buildPreparedTargetCompareSummary(input, currentItem) {
  return normalizeCompareSummary(
    resolveField(input, currentItem, "compareSummary") ?? createEmptyCompareSummary()
  );
}

function buildPreparedConnectionProfile(input = {}, currentItem = null) {
  return {
    ...(currentItem ?? {}),
    profileName: normalizePreparedTextField(input, currentItem, "profileName"),
    provider: "gcp",
    credentialPathHint: normalizePreparedOptionalTextField(input, currentItem, "credentialPathHint"),
    serviceAccountEmail: normalizePreparedOptionalTextField(input, currentItem, "serviceAccountEmail"),
    serviceAccountKeyId: normalizePreparedOptionalTextField(input, currentItem, "serviceAccountKeyId"),
    environmentLabel: normalizePreparedOptionalTextField(input, currentItem, "environmentLabel"),
    authMode: normalizeAuthMode(resolveField(input, currentItem, "authMode")),
    projectId: normalizePreparedOptionalTextField(input, currentItem, "projectId"),
    projectNumber: normalizePreparedOptionalTextField(input, currentItem, "projectNumber"),
    projectDisplayName: normalizePreparedOptionalTextField(input, currentItem, "projectDisplayName"),
    operatorEmail: normalizePreparedOptionalTextField(input, currentItem, "operatorEmail"),
    region: normalizePreparedOptionalTextField(input, currentItem, "region"),
    credentialLabel: normalizePreparedOptionalTextField(input, currentItem, "credentialLabel"),
    connectionStatus: buildPreparedConnectionStatus(input, currentItem),
    lastConnectedOn: normalizePreparedOptionalTextField(input, currentItem, "lastConnectedOn"),
    lastValidatedOn: normalizePreparedOptionalTextField(input, currentItem, "lastValidatedOn"),
    validationSummary: buildPreparedConnectionValidationSummary(input, currentItem)
  };
}

function buildPreparedTargetProfile(input = {}, currentItem = null) {
  const targetKind = normalizeTargetKind(resolveField(input, currentItem, "targetKind"));
  return {
    ...(currentItem ?? {}),
    title: normalizePreparedTextField(input, currentItem, "title"),
    productBindingKey: normalizePreparedOptionalTextField(input, currentItem, "productBindingKey"),
    connectionProfileId: normalizePreparedTextField(input, currentItem, "connectionProfileId"),
    targetKind,
    adapterMode: normalizeAdapterMode(resolveField(input, currentItem, "adapterMode")),
    config: normalizeTargetConfig(resolveField(input, currentItem, "config"), targetKind),
    policy: normalizeTargetPolicy(resolveField(input, currentItem, "policy")),
    targetStatus: buildPreparedTargetStatus(input, currentItem),
    lastValidatedOn: normalizePreparedOptionalTextField(input, currentItem, "lastValidatedOn"),
    lastComparedOn: normalizePreparedOptionalTextField(input, currentItem, "lastComparedOn"),
    validationSummary: buildPreparedTargetValidationSummary(input, currentItem),
    compareSummary: buildPreparedTargetCompareSummary(input, currentItem)
  };
}

function buildPreparedOperationRun(input = {}, currentItem = null) {
  const timestamp = toTimestamp();
  return {
    ...(currentItem ?? {}),
    title: normalizePreparedTextField(input, currentItem, "title", "Remote Procedure"),
    connectionProfileId: normalizePreparedOptionalTextField(input, currentItem, "connectionProfileId"),
    targetProfileId: normalizePreparedOptionalTextField(input, currentItem, "targetProfileId"),
    procedureType: normalizePreparedTextField(input, currentItem, "procedureType", "validate"),
    scopeKind: normalizePreparedTextField(input, currentItem, "scopeKind", "connection"),
    direction: normalizePreparedTextField(input, currentItem, "direction", "validate"),
    dryRun: typeof input?.dryRun === "boolean" ? input.dryRun : currentItem?.dryRun !== false,
    status: normalizeRunStatus(resolveField(input, currentItem, "status"), "succeeded"),
    message: normalizePreparedOptionalTextField(input, currentItem, "message"),
    summary: normalizeRunSummary(resolveField(input, currentItem, "summary")),
    startedOn: normalizePreparedTextField(input, currentItem, "startedOn", timestamp),
    finishedOn: normalizePreparedTextField(input, currentItem, "finishedOn", timestamp)
  };
}

function buildPersistedConnectionProfileBody(preparedValue) {
  return {
    profileName: preparedValue.profileName,
    provider: preparedValue.provider,
    credentialPathHint: preparedValue.credentialPathHint,
    serviceAccountEmail: preparedValue.serviceAccountEmail,
    serviceAccountKeyId: preparedValue.serviceAccountKeyId,
    environmentLabel: preparedValue.environmentLabel,
    authMode: preparedValue.authMode,
    projectId: preparedValue.projectId,
    projectNumber: preparedValue.projectNumber,
    projectDisplayName: preparedValue.projectDisplayName,
    operatorEmail: preparedValue.operatorEmail,
    region: preparedValue.region,
    credentialLabel: preparedValue.credentialLabel,
    connectionStatus: preparedValue.connectionStatus,
    lastConnectedOn: preparedValue.lastConnectedOn,
    lastValidatedOn: preparedValue.lastValidatedOn,
    validationSummary: preparedValue.validationSummary
  };
}

function buildPersistedTargetProfileBody(preparedValue) {
  return {
    title: preparedValue.title,
    productBindingKey: preparedValue.productBindingKey,
    connectionProfileId: preparedValue.connectionProfileId,
    targetKind: preparedValue.targetKind,
    adapterMode: preparedValue.adapterMode,
    config: preparedValue.config,
    policy: preparedValue.policy,
    targetStatus: preparedValue.targetStatus,
    lastValidatedOn: preparedValue.lastValidatedOn,
    lastComparedOn: preparedValue.lastComparedOn,
    validationSummary: preparedValue.validationSummary,
    compareSummary: preparedValue.compareSummary
  };
}

function buildPersistedOperationRunBody(preparedValue) {
  return {
    title: preparedValue.title,
    connectionProfileId: preparedValue.connectionProfileId,
    targetProfileId: preparedValue.targetProfileId,
    procedureType: preparedValue.procedureType,
    scopeKind: preparedValue.scopeKind,
    direction: preparedValue.direction,
    dryRun: preparedValue.dryRun,
    status: preparedValue.status,
    message: preparedValue.message,
    summary: preparedValue.summary,
    startedOn: preparedValue.startedOn,
    finishedOn: preparedValue.finishedOn
  };
}

function createWrappedHandler(handler, collectionId) {
  const transformItem =
    collectionId === CONNECTIONS_COLLECTION_ID
      ? buildExposedConnectionProfile
      : collectionId === TARGETS_COLLECTION_ID
        ? buildExposedTargetProfile
        : buildExposedOperationRun;

  const buildPrepared =
    collectionId === CONNECTIONS_COLLECTION_ID
      ? buildPreparedConnectionProfile
      : collectionId === TARGETS_COLLECTION_ID
        ? buildPreparedTargetProfile
        : buildPreparedOperationRun;
  const buildPersistedBody =
    collectionId === CONNECTIONS_COLLECTION_ID
      ? buildPersistedConnectionProfileBody
      : collectionId === TARGETS_COLLECTION_ID
        ? buildPersistedTargetProfileBody
        : buildPersistedOperationRunBody;

  return {
    ...handler,
    list: async (options = {}) => exposeListPayload(await handler.list(options), transformItem),
    findById: async (itemId) => transformItem(unwrapItemEnvelope(await handler.findById(itemId))),
    validateInput: async (input, options = {}) => {
      const preparedValue = buildPrepared(input);
      return handler.validateInput(buildPersistedBody(preparedValue), options);
    },
    create: async ({ value, reply }) => {
      const preparedValue = buildPrepared(value);
      const validatedBody = buildPersistedBody(preparedValue);
      const validation = await handler.validateInput(validatedBody);
      if (!validation.ok) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, validation.errors)
        };
      }
      const result = await handler.create({
        value: validatedBody,
        reply
      });
      return result?.ok === true
        ? {
            ...result,
            item: transformItem(unwrapItemEnvelope(result.item))
          }
        : result;
    },
    update: async ({ body, item, reply }) => {
      const preparedValue = buildPrepared(body, item);
      const validatedBody = buildPersistedBody(preparedValue);
      const validation = await handler.validateInput(validatedBody, {
        partial: true
      });
      if (!validation.ok) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, validation.errors)
        };
      }
      const result = await handler.update({
        body: validatedBody,
        value: validatedBody,
        item,
        reply
      });
      return result?.ok === true
        ? {
            ...result,
            item: transformItem(unwrapItemEnvelope(result.item))
          }
        : result;
    }
  };
}

function createHandlerRegistry(context = {}) {
  const { registry } = context;
  if (!registry || typeof registry !== "object" || typeof registry.register !== "function") {
    return registry;
  }

  const wrappedRegistry = Object.create(registry);
  wrappedRegistry.register = (entry = {}) => {
    const normalizedEntry = entry && typeof entry === "object" ? entry : {};
    const collectionId = normalizedEntry.collectionId;
    const shouldWrap = [
      CONNECTIONS_COLLECTION_ID,
      TARGETS_COLLECTION_ID,
      RUNS_COLLECTION_ID
    ].includes(collectionId);
    return registry.register({
      ...normalizedEntry,
      handler: shouldWrap ? createWrappedHandler(normalizedEntry.handler, collectionId) : normalizedEntry.handler
    });
  };
  return wrappedRegistry;
}

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createHandlerRegistry(context),
    moduleId: MODULE_ID
  });
}
