import {
  TRANSLATION_UNITS_COLLECTION_ID,
  buildExposedTranslationUnit,
  buildPreparedTranslationUnitValue,
  buildTranslationConflict,
  buildPersistedTranslationUnitBody,
  listExistingTranslationUnits,
  validationFailure
} from "./translations-shared-runtime.mjs";

function createConflictList(preparedValue) {
  const conflicts = [];
  if (!preparedValue.entityType) {
    conflicts.push(buildTranslationConflict("TRANSLATION_ENTITY_TYPE_REQUIRED", "Entity type is required.", "entityType"));
  }
  if (!preparedValue.entityId) {
    conflicts.push(buildTranslationConflict("TRANSLATION_ENTITY_ID_REQUIRED", "Entity id is required.", "entityId"));
  }
  if (!preparedValue.fieldPath) {
    conflicts.push(buildTranslationConflict("TRANSLATION_FIELD_PATH_REQUIRED", "Field path is required.", "fieldPath"));
  }
  if (!preparedValue.fieldLabel) {
    conflicts.push(buildTranslationConflict("TRANSLATION_FIELD_LABEL_REQUIRED", "Field label is required.", "fieldLabel"));
  }
  if (!preparedValue.entityLabel) {
    conflicts.push(buildTranslationConflict("TRANSLATION_ENTITY_LABEL_REQUIRED", "Entity label is required.", "entityLabel"));
  }
  if (!preparedValue.sourceValue?.trim()) {
    conflicts.push(buildTranslationConflict("TRANSLATION_SOURCE_VALUE_REQUIRED", "Source value is required before translations can be saved.", "sourceValue"));
  }
  return conflicts;
}

async function collectTranslationUnitConflicts(handler, preparedValue, currentItem = null) {
  const conflicts = createConflictList(preparedValue);
  if (conflicts.length > 0) {
    return conflicts;
  }
  const existingItems = await listExistingTranslationUnits(handler);
  const duplicate = existingItems.find((item) => item.id !== currentItem?.id && item.entityType === preparedValue.entityType && item.entityId === preparedValue.entityId && item.fieldPath === preparedValue.fieldPath);
  if (duplicate) {
    conflicts.push(buildTranslationConflict("TRANSLATION_UNIT_DUPLICATE", "A translation entry already exists for this field.", "fieldPath"));
  }
  return conflicts;
}

export function wrapTranslationsHandler(handler) {
  return {
    ...handler,
    list: async (options = {}) => {
      const payload = await handler.list(options);
      return {
        ...payload,
        items: Array.isArray(payload?.items) ? payload.items.map(buildExposedTranslationUnit) : []
      };
    },
    findById: async (itemId) => buildExposedTranslationUnit(await handler.findById(itemId)),
    validateInput: async (input, options = {}) => {
      const currentItem = options?.item ?? null;
      const preparedValue = buildPreparedTranslationUnitValue(input, currentItem);
      const validation = await handler.validateInput(buildPersistedTranslationUnitBody(preparedValue), options);
      if (!validation.ok) {
        return validation;
      }
      const conflicts = await collectTranslationUnitConflicts(handler, preparedValue, currentItem);
      if (conflicts.length === 0) {
        return validation;
      }
      return {
        ok: false,
        value: validation.value,
        errors: [...(validation.errors ?? []), ...conflicts]
      };
    },
    create: async ({ value, reply }) => {
      const preparedValue = buildPreparedTranslationUnitValue(value);
      const conflicts = await collectTranslationUnitConflicts(handler, preparedValue, null);
      if (conflicts.length > 0) {
        return validationFailure(reply, conflicts);
      }
      const result = await handler.create({
        value: buildPersistedTranslationUnitBody(preparedValue),
        reply
      });
      if (result?.ok !== true) {
        return result;
      }
      return {
        ...result,
        item: buildExposedTranslationUnit(await handler.findById(result.item?.id))
      };
    },
    update: async ({ body, item, reply }) => {
      const preparedValue = buildPreparedTranslationUnitValue(body, item);
      const conflicts = await collectTranslationUnitConflicts(handler, preparedValue, item);
      if (conflicts.length > 0) {
        return validationFailure(reply, conflicts);
      }
      const result = await handler.update({
        body: buildPersistedTranslationUnitBody(preparedValue),
        value: preparedValue,
        item,
        reply
      });
      if (result?.ok !== true) {
        return result;
      }
      return {
        ...result,
        item: buildExposedTranslationUnit(await handler.findById(item?.id))
      };
    }
  };
}

export function createTranslationsHandlerRegistry(context = {}) {
  const { registry } = context;
  if (!registry || typeof registry.register !== "function") {
    return registry;
  }
  const wrappedRegistry = Object.create(registry);
  wrappedRegistry.register = (entry = {}) =>
    registry.register({
      ...entry,
      handler: entry?.collectionId === TRANSLATION_UNITS_COLLECTION_ID ? wrapTranslationsHandler(entry.handler) : entry.handler
    });
  return wrappedRegistry;
}
