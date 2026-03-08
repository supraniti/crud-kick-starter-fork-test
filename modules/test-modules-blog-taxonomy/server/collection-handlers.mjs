import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { createTaxonomyHandlerRegistry } from "./taxonomy-handler-runtime.mjs";

const MODULE_ID = "test-modules-blog-taxonomy";

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createTaxonomyHandlerRegistry(context),
    moduleId: MODULE_ID
  });
}
