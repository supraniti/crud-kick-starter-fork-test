import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { createEditorialHandlerRegistry } from "./editorial-handler-runtime.mjs";

const MODULE_ID = "test-modules-blog-editorial";

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createEditorialHandlerRegistry(context.registry),
    moduleId: MODULE_ID
  });
}
