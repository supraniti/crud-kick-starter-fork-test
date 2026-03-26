import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import { buildPredefinedThemeRecords } from "../shared/theme-document.mjs";
import {
  THEMES_COLLECTION_ID,
  buildExposedThemeItem,
  buildPersistedThemeBody,
  buildPreparedThemeValue
} from "./themes-shared-runtime.mjs";

function buildConflict(code, message, fieldId) {
  return {
    code,
    message,
    fieldId
  };
}

async function listExistingThemes(handler) {
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

function createSeedController(handler) {
  let pendingSeed = null;

  return async function ensureSeeded() {
    if (!pendingSeed) {
      pendingSeed = (async () => {
        const existingThemes = await listExistingThemes(handler);
        if (existingThemes.length > 0) {
          return existingThemes;
        }

        for (const seedRecord of buildPredefinedThemeRecords()) {
          await handler.create({
            value: seedRecord
          });
        }
        return listExistingThemes(handler);
      })().finally(() => {
        pendingSeed = null;
      });
    }

    return pendingSeed;
  };
}

function selectPreferredGlobalDefault(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    items.find((item) => item?.isGlobalDefault === true) ??
    items.find((item) => item?.themeKey === "editorial-default") ??
    items.find((item) => item?.status !== "archived") ??
    items[0] ??
    null
  );
}

function createGlobalDefaultRepairController(handler) {
  let pendingRepair = null;

  return async function ensureSingleGlobalDefault() {
    if (!pendingRepair) {
      pendingRepair = (async () => {
        const existingThemes = await listExistingThemes(handler);
        if (existingThemes.length === 0) {
          return existingThemes;
        }

        const preferredDefault = selectPreferredGlobalDefault(existingThemes);
        if (!preferredDefault) {
          return existingThemes;
        }

        const updates = existingThemes.filter((item) => {
          const shouldBeDefault = item.id === preferredDefault.id;
          return (item.isGlobalDefault === true) !== shouldBeDefault;
        });

        for (const item of updates) {
          await handler.update({
            body: {
              isGlobalDefault: item.id === preferredDefault.id
            },
            value: {
              ...item,
              isGlobalDefault: item.id === preferredDefault.id
            },
            item
          });
        }

        return listExistingThemes(handler);
      })().finally(() => {
        pendingRepair = null;
      });
    }

    return pendingRepair;
  };
}

async function syncGlobalDefaultFlags(handler, currentItemId, keepDefaultId) {
  const existingThemes = await listExistingThemes(handler);
  const updates = existingThemes.filter(
    (item) => item.id !== currentItemId && item.id !== keepDefaultId && item.isGlobalDefault === true
  );
  for (const item of updates) {
    await handler.update({
      body: {
        isGlobalDefault: false
      },
      value: {
        ...item,
        isGlobalDefault: false
      },
      item
    });
  }
}

async function promoteFirstThemeToDefault(handler, excludedItemId = null) {
  const existingThemes = await listExistingThemes(handler);
  const candidate = existingThemes.find((item) => item.id !== excludedItemId) ?? null;
  if (!candidate || candidate.isGlobalDefault === true) {
    return;
  }
  await handler.update({
    body: {
      isGlobalDefault: true
    },
    value: {
      ...candidate,
      isGlobalDefault: true
    },
    item: candidate
  });
}

async function collectThemeConflicts(handler, preparedValue, currentItem = null) {
  const conflicts = [];
  if (!preparedValue.title) {
    conflicts.push(buildConflict("THEME_TITLE_REQUIRED", "Theme title is required", "title"));
  }
  if (!preparedValue.themeKey) {
    conflicts.push(buildConflict("THEME_KEY_REQUIRED", "Theme key is required", "themeKey"));
  }

  const existingThemes = await listExistingThemes(handler);
  const duplicateKey = existingThemes.find(
    (item) => item.id !== preparedValue.currentItemId && String(item.themeKey || "").trim() === preparedValue.themeKey
  );
  if (duplicateKey) {
    conflicts.push(
      buildConflict(
        "THEME_KEY_CONFLICT",
        `Theme key '${preparedValue.themeKey}' already exists`,
        "themeKey"
      )
    );
  }

  if (
    currentItem?.isGlobalDefault === true &&
    preparedValue.isGlobalDefault !== true &&
    !existingThemes.some(
      (item) => item.id !== preparedValue.currentItemId && item.isGlobalDefault === true
    )
  ) {
    conflicts.push(
      buildConflict(
        "THEME_DEFAULT_REQUIRED",
        "At least one theme must remain the global default",
        "isGlobalDefault"
      )
    );
  }

  return conflicts;
}

function exposeListPayload(payload) {
  return {
    ...payload,
    items: Array.isArray(payload?.items) ? payload.items.map(buildExposedThemeItem) : []
  };
}

export function wrapThemesHandler(handler) {
  const ensureSeeded = createSeedController(handler);
  const ensureSingleGlobalDefault = createGlobalDefaultRepairController(handler);

  async function ensureCatalogReady() {
    await ensureSeeded();
    return ensureSingleGlobalDefault();
  }

  return {
    ...handler,
    list: async (options = {}) => {
      await ensureCatalogReady();
      return exposeListPayload(await handler.list(options));
    },
    findById: async (itemId) => {
      await ensureCatalogReady();
      return buildExposedThemeItem(await handler.findById(itemId));
    },
    validateInput: async (input, options = {}) => {
      await ensureCatalogReady();
      const currentItem = options?.item ?? null;
      const preparedValue = buildPreparedThemeValue(input, currentItem);
      const validation = await handler.validateInput(buildPersistedThemeBody(preparedValue), options);
      if (!validation.ok) {
        return validation;
      }
      const conflicts = await collectThemeConflicts(handler, preparedValue, currentItem);
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
      await ensureCatalogReady();
      const preparedValue = buildPreparedThemeValue(value);
      const validatedBody = buildPersistedThemeBody(preparedValue);
      const validation = await handler.validateInput(validatedBody);
      if (!validation.ok) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, validation.errors)
        };
      }
      const conflicts = await collectThemeConflicts(handler, preparedValue);
      if (conflicts.length > 0) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, conflicts, "THEME_VALIDATION_FAILED")
        };
      }

      const result = await handler.create({
        value: validatedBody,
        reply
      });
      if (result?.ok !== true) {
        return result;
      }

      if (preparedValue.isGlobalDefault) {
        await syncGlobalDefaultFlags(handler, result.item?.id ?? null, null);
      }
      return {
        ...result,
        item: buildExposedThemeItem(await handler.findById(result.item?.id))
      };
    },
    update: async ({ body, item, reply }) => {
      await ensureCatalogReady();
      const preparedValue = buildPreparedThemeValue(body, item);
      const validatedBody = buildPersistedThemeBody(preparedValue);
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

      const conflicts = await collectThemeConflicts(handler, preparedValue, item);
      if (conflicts.length > 0) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, conflicts, "THEME_VALIDATION_FAILED")
        };
      }

      const result = await handler.update({
        body: validatedBody,
        value: preparedValue,
        item,
        reply
      });
      if (result?.ok !== true) {
        return result;
      }

      if (preparedValue.isGlobalDefault) {
        await syncGlobalDefaultFlags(handler, item?.id ?? null, null);
      }
      return {
        ...result,
        item: buildExposedThemeItem(await handler.findById(item?.id))
      };
    },
    removeByIndex: async (index, itemId) => {
      await ensureCatalogReady();
      const existingItem = await handler.findById(itemId);
      const result = await handler.removeByIndex(index, itemId);
      if (existingItem?.isGlobalDefault === true) {
        await promoteFirstThemeToDefault(handler, itemId);
      }
      return result;
    }
  };
}

export function createThemesHandlerRegistry(context = {}) {
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
        normalizedEntry.collectionId === THEMES_COLLECTION_ID
          ? wrapThemesHandler(normalizedEntry.handler)
          : normalizedEntry.handler
    });
  };
  return wrappedRegistry;
}
