import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { createLayoutsHandlerRegistry } from "./layouts-handler-runtime.mjs";
import { MODULE_ID } from "./layouts-shared-runtime.mjs";

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createLayoutsHandlerRegistry(context),
    moduleId: MODULE_ID
  });
}
