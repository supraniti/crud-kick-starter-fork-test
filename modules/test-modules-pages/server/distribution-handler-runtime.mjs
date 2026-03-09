import { PAGES_COLLECTION_ID, REDIRECTS_COLLECTION_ID } from "./distribution-shared-runtime.mjs";
import { wrapPagesHandler } from "./distribution-page-handler-runtime.mjs";
import { wrapRedirectsHandler } from "./distribution-redirect-handler-runtime.mjs";

export function createDistributionHandlerRegistry(context = {}) {
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
        normalizedEntry.collectionId === PAGES_COLLECTION_ID
          ? wrapPagesHandler(normalizedEntry.handler, context)
          : normalizedEntry.collectionId === REDIRECTS_COLLECTION_ID
            ? wrapRedirectsHandler(normalizedEntry.handler)
            : normalizedEntry.handler
    });
  };
  return wrappedRegistry;
}
