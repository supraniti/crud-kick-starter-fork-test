import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  buildExposedCustomWidgetItem,
  buildPersistedCustomWidgetBody,
  buildPreparedCustomWidgetValue
} from "../shared/page-studio-custom-widget-document.mjs";
import { CUSTOM_WIDGETS_COLLECTION_ID } from "./page-studio-shared-runtime.mjs";

function buildConflict(code, message, fieldId) {
  return {
    code,
    message,
    fieldId
  };
}

async function listExistingCustomWidgets(handler) {
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

async function collectCustomWidgetConflicts(handler, preparedValue) {
  const conflicts = [];
  if (!preparedValue.title) {
    conflicts.push(buildConflict("CUSTOM_WIDGET_TITLE_REQUIRED", "Widget title is required", "title"));
  }
  if (!preparedValue.widgetKey) {
    conflicts.push(buildConflict("CUSTOM_WIDGET_KEY_REQUIRED", "Widget key is required", "widgetKey"));
  }
  if (
    !preparedValue.templateInstance?.componentKey &&
    !(Array.isArray(preparedValue.composition?.blocks) && preparedValue.composition.blocks.length > 0)
  ) {
    conflicts.push(
      buildConflict(
        "CUSTOM_WIDGET_BODY_REQUIRED",
        "Custom widget requires either a configured template or a composed widget body",
        "compositionJson"
      )
    );
  }

  const existingItems = await listExistingCustomWidgets(handler);
  const duplicateKey = existingItems.find(
    (item) => item.id !== preparedValue.currentItemId && String(item.widgetKey || "").trim() === preparedValue.widgetKey
  );
  if (duplicateKey) {
    conflicts.push(
      buildConflict(
        "CUSTOM_WIDGET_KEY_CONFLICT",
        `Widget key '${preparedValue.widgetKey}' already exists`,
        "widgetKey"
      )
    );
  }
  return conflicts;
}

function exposeListPayload(payload) {
  return {
    ...payload,
    items: Array.isArray(payload?.items) ? payload.items.map(buildExposedCustomWidgetItem) : []
  };
}

export function wrapPageStudioCustomWidgetsHandler(handler) {
  return {
    ...handler,
    list: async (options = {}) => exposeListPayload(await handler.list(options)),
    findById: async (itemId) => buildExposedCustomWidgetItem(await handler.findById(itemId)),
    validateInput: async (input, options = {}) => {
      const currentItem = options?.item ?? null;
      const preparedValue = buildPreparedCustomWidgetValue(input, currentItem);
      const validation = await handler.validateInput(buildPersistedCustomWidgetBody(preparedValue), options);
      if (!validation.ok) {
        return validation;
      }
      const conflicts = await collectCustomWidgetConflicts(handler, preparedValue);
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
      const preparedValue = buildPreparedCustomWidgetValue(value);
      const validatedBody = buildPersistedCustomWidgetBody(preparedValue);
      const validation = await handler.validateInput(validatedBody);
      if (!validation.ok) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, validation.errors)
        };
      }

      const conflicts = await collectCustomWidgetConflicts(handler, preparedValue);
      if (conflicts.length > 0) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, conflicts, "CUSTOM_WIDGET_VALIDATION_FAILED")
        };
      }

      const result = await handler.create({
        value: validatedBody,
        reply
      });
      return result?.ok === true
        ? {
            ...result,
            item: buildExposedCustomWidgetItem(result.item)
          }
        : result;
    },
    update: async ({ body, item, reply }) => {
      const preparedValue = buildPreparedCustomWidgetValue(body, item);
      const validatedBody = buildPersistedCustomWidgetBody(preparedValue);
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

      const conflicts = await collectCustomWidgetConflicts(handler, preparedValue);
      if (conflicts.length > 0) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, conflicts, "CUSTOM_WIDGET_VALIDATION_FAILED")
        };
      }

      const result = await handler.update({
        body: validatedBody,
        value: preparedValue,
        item,
        reply
      });
      return result?.ok === true
        ? {
            ...result,
            item: buildExposedCustomWidgetItem(await handler.findById(item?.id))
          }
        : result;
    }
  };
}

export function createPageStudioHandlerRegistry(context = {}) {
  const { registry } = context;
  if (!registry || typeof registry !== "object" || typeof registry.register !== "function") {
    return registry;
  }

  const wrappedRegistry = Object.create(registry);
  wrappedRegistry.register = (entry = {}) => {
    const normalizedEntry = entry && typeof entry === "object" ? entry : {};
    return registry.register({
      ...normalizedEntry,
      handler:
        normalizedEntry.collectionId === CUSTOM_WIDGETS_COLLECTION_ID
          ? wrapPageStudioCustomWidgetsHandler(normalizedEntry.handler)
          : normalizedEntry.handler
    });
  };
  return wrappedRegistry;
}
