import {
  buildExposedTranslationUnit,
  buildPreparedTranslationUnitValue,
  findTranslationUnitByCompositeKey
} from "./translations-shared-runtime.mjs";

function buildPayload(payload) {
  return {
    ...payload,
    timestamp: new Date().toISOString()
  };
}

function errorPayload(code, message) {
  return buildPayload({
    ok: false,
    error: {
      code,
      message
    }
  });
}

function ensureModuleEnabled(moduleRegistry, moduleId, reply) {
  if (moduleRegistry?.getState(moduleId) === "enabled") {
    return true;
  }
  reply.code(409);
  return errorPayload("MODULE_ROUTE_UNAVAILABLE", `Module '${moduleId}' is not enabled`);
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function createRouteContext({ manifest, moduleRegistry, collectionHandlerRegistry }) {
  const moduleId = manifest?.id ?? "test-modules-translations";
  return {
    moduleId,
    moduleRegistry,
    translationsHandler: collectionHandlerRegistry.get("translation-units")
  };
}

function registerLookupRoute(fastify, routeContext) {
  fastify.get(`/api/reference/modules/${routeContext.moduleId}/translation-unit`, async (request, reply) => {
    const available = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
    if (available !== true) {
      return available;
    }
    const entityType = normalizeOptionalText(request.query?.entityType);
    const entityId = normalizeOptionalText(request.query?.entityId);
    const fieldPath = normalizeOptionalText(request.query?.fieldPath);
    if (!entityType || !entityId || !fieldPath) {
      reply.code(400);
      return errorPayload("TRANSLATION_LOOKUP_INPUT_REQUIRED", "entityType, entityId, and fieldPath are required.");
    }
    const item = await findTranslationUnitByCompositeKey(routeContext.translationsHandler, {
      entityType,
      entityId,
      fieldPath
    });
    return buildPayload({
      ok: true,
      item: buildExposedTranslationUnit(item)
    });
  });
}

function registerUpsertRoute(fastify, routeContext) {
  fastify.post(`/api/reference/modules/${routeContext.moduleId}/translation-unit/upsert`, async (request, reply) => {
    const available = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
    if (available !== true) {
      return available;
    }
    const body = request.body ?? {};
    const preparedValue = buildPreparedTranslationUnitValue(body);
    const existingItem = await findTranslationUnitByCompositeKey(routeContext.translationsHandler, preparedValue);
    if (Object.keys(preparedValue.translations ?? {}).length === 0) {
      if (!existingItem) {
        return buildPayload({ ok: true, action: "noop", item: null });
      }
      const deleteResult = await routeContext.translationsHandler.removeByIndex(existingItem.index, existingItem.id);
      if (deleteResult?.ok !== true) {
        reply.code(deleteResult?.statusCode ?? 400);
        return deleteResult?.payload ?? errorPayload("TRANSLATION_DELETE_FAILED", "Failed to delete empty translation entry.");
      }
      return buildPayload({ ok: true, action: "deleted", item: null });
    }
    const result = existingItem
      ? await routeContext.translationsHandler.update({ body, item: existingItem, reply })
      : await routeContext.translationsHandler.create({ value: body, reply });
    if (result?.ok !== true) {
      reply.code(result?.statusCode ?? 400);
      return result?.payload ?? errorPayload("TRANSLATION_UPSERT_FAILED", "Failed to persist translation entry.");
    }
    return buildPayload({
      ok: true,
      action: existingItem ? "updated" : "created",
      item: buildExposedTranslationUnit(result.item)
    });
  });
}

export function registerRoutes({ fastify, manifest, moduleRegistry, collectionHandlerRegistry }) {
  const routeContext = createRouteContext({ manifest, moduleRegistry, collectionHandlerRegistry });
  registerLookupRoute(fastify, routeContext);
  registerUpsertRoute(fastify, routeContext);
}
