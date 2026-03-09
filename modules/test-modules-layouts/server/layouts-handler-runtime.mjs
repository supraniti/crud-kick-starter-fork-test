import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  LAYOUTS_COLLECTION_ID,
  buildExposedLayoutItem,
  normalizeLayoutKey,
  normalizeLayoutStatus,
  normalizeOptionalText,
  normalizeText,
  prepareLayoutDocument,
  readLayoutDocumentInput,
  toTimestamp
} from "./layouts-shared-runtime.mjs";

function buildConflict(code, message, fieldId) {
  return {
    code,
    message,
    fieldId
  };
}

function resolveLayoutTitle(input = {}, currentItem = null) {
  return normalizeText(input?.title ?? currentItem?.title, "");
}

function resolveLayoutKey(input = {}, currentItem = null, title = "") {
  return normalizeLayoutKey(input?.layoutKey ?? currentItem?.layoutKey ?? title, "layout-shell");
}

function resolveLayoutDocumentBundle(input = {}, currentItem = null) {
  return prepareLayoutDocument(readLayoutDocumentInput(input, currentItem));
}

async function listExistingLayouts(handler) {
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

function buildPreparedLayoutValue(input = {}, currentItem = null) {
  const timestamp = toTimestamp();
  const title = resolveLayoutTitle(input, currentItem);
  const layoutDocument = resolveLayoutDocumentBundle(input, currentItem);
  return {
    ...(currentItem ?? {}),
    title,
    layoutKey: resolveLayoutKey(input, currentItem, title),
    summary: normalizeOptionalText(input?.summary ?? currentItem?.summary),
    status: normalizeLayoutStatus(input?.status ?? currentItem?.status, "draft"),
    rootLayoutMode: layoutDocument.document.nodes[layoutDocument.document.rootId]?.layoutMode ?? "grid",
    layoutDocumentJson: layoutDocument.serialized,
    createdOn: currentItem?.createdOn ?? timestamp,
    updatedOn: timestamp,
    layoutDocument,
    currentItemId: currentItem?.id ?? null
  };
}

function buildPersistedLayoutBody(preparedValue) {
  return {
    title: preparedValue.title,
    layoutKey: preparedValue.layoutKey,
    summary: preparedValue.summary,
    status: preparedValue.status,
    rootLayoutMode: preparedValue.rootLayoutMode,
    layoutDocumentJson: preparedValue.layoutDocumentJson,
    createdOn: preparedValue.createdOn,
    updatedOn: preparedValue.updatedOn
  };
}

async function collectLayoutConflicts(handler, preparedValue) {
  const conflicts = [];
  if (preparedValue.title.length === 0) {
    conflicts.push(buildConflict("LAYOUT_TITLE_REQUIRED", "Layout title is required", "title"));
  }
  if (preparedValue.layoutKey.length === 0) {
    conflicts.push(buildConflict("LAYOUT_KEY_REQUIRED", "Layout key is required", "layoutKey"));
  }
  for (const issue of preparedValue.layoutDocument.issues) {
    conflicts.push(issue);
  }

  const existingLayouts = await listExistingLayouts(handler);
  const hasDuplicateKey = existingLayouts.some(
    (item) => item.id !== preparedValue.currentItemId && normalizeLayoutKey(item.layoutKey) === preparedValue.layoutKey
  );
  if (hasDuplicateKey) {
    conflicts.push(
      buildConflict(
        "LAYOUT_KEY_CONFLICT",
        `Layout key '${preparedValue.layoutKey}' already exists`,
        "layoutKey"
      )
    );
  }

  return conflicts;
}

async function createConflictFailure({ handler, preparedValue, reply }) {
  const conflicts = await collectLayoutConflicts(handler, preparedValue);
  if (conflicts.length === 0) {
    return null;
  }
  return {
    ok: false,
    statusCode: 400,
    payload: badRequestWithConflicts(reply, conflicts, "LAYOUT_VALIDATION_FAILED")
  };
}

function toValidatedBody(preparedValue) {
  return buildPersistedLayoutBody(preparedValue);
}

function exposeListPayload(payload) {
  return {
    ...payload,
    items: Array.isArray(payload?.items) ? payload.items.map(buildExposedLayoutItem) : []
  };
}

export function wrapLayoutsHandler(handler) {
  return {
    ...handler,
    list: async (options = {}) => exposeListPayload(await handler.list(options)),
    findById: async (itemId) => buildExposedLayoutItem(await handler.findById(itemId)),
    validateInput: async (input, options = {}) => {
      const preparedValue = buildPreparedLayoutValue(input);
      const validation = await handler.validateInput(toValidatedBody(preparedValue), options);
      if (!validation.ok || options.partial === true) {
        return validation;
      }

      const conflicts = await collectLayoutConflicts(handler, preparedValue);
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
      const preparedValue = buildPreparedLayoutValue(value);
      const validatedBody = toValidatedBody(preparedValue);
      const validation = await handler.validateInput(validatedBody);
      if (!validation.ok) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, validation.errors)
        };
      }

      const conflictFailure = await createConflictFailure({
        handler,
        preparedValue,
        reply
      });
      if (conflictFailure) {
        return conflictFailure;
      }

      const result = await handler.create({
        value: validatedBody,
        reply
      });
      return result?.ok === true
        ? {
            ...result,
            item: buildExposedLayoutItem(result.item)
          }
        : result;
    },
    update: async ({ body, item, reply }) => {
      const preparedValue = buildPreparedLayoutValue(body, item);
      const validatedBody = toValidatedBody(preparedValue);
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

      const conflictFailure = await createConflictFailure({
        handler,
        preparedValue,
        reply
      });
      if (conflictFailure) {
        return conflictFailure;
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
            item: buildExposedLayoutItem(result.item)
          }
        : result;
    }
  };
}

export function createLayoutsHandlerRegistry(context = {}) {
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
        normalizedEntry.collectionId === LAYOUTS_COLLECTION_ID
          ? wrapLayoutsHandler(normalizedEntry.handler)
          : normalizedEntry.handler
    });
  };
  return wrappedRegistry;
}
