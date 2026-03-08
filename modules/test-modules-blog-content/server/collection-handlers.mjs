import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { MODULE_ID } from "./content-shared-runtime.mjs";
import { createContentHandlerRegistry } from "./content-handler-runtime.mjs";

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createContentHandlerRegistry(context),
    moduleId: MODULE_ID
  });
}
