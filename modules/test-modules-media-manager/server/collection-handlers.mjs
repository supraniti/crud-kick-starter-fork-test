import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { MEDIA_ITEMS_COLLECTION_ID } from "./media-library/media-library-contract.mjs";

const MODULE_ID = "test-modules-media-manager";

function createMutationBlockedPayload(code, message) {
  return {
    ok: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  };
}

function wrapMediaItemsHandler(handler) {
  return {
    ...handler,
    create: async () => ({
      ok: false,
      statusCode: 405,
      payload: createMutationBlockedPayload(
        "MEDIA_ITEMS_CREATE_UNSUPPORTED",
        "Create media items through the module upload route"
      )
    }),
    update: async () => ({
      ok: false,
      statusCode: 405,
      payload: createMutationBlockedPayload(
        "MEDIA_ITEMS_UPDATE_UNSUPPORTED",
        "Update media items through the module metadata route"
      )
    }),
    findIndex: async () => -1
  };
}

function createHandlerRewritingRegistry(registry) {
  if (!registry || typeof registry !== "object" || typeof registry.register !== "function") {
    return registry;
  }

  const wrappedRegistry = Object.create(registry);
  wrappedRegistry.register = (entry = {}) => {
    const normalizedEntry = entry && typeof entry === "object" ? entry : {};
    const handler =
      normalizedEntry.collectionId === MEDIA_ITEMS_COLLECTION_ID
        ? wrapMediaItemsHandler(normalizedEntry.handler)
        : normalizedEntry.handler;
    return registry.register({
      ...normalizedEntry,
      handler
    });
  };
  return wrappedRegistry;
}

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createHandlerRewritingRegistry(context.registry),
    moduleId: MODULE_ID
  });
}
