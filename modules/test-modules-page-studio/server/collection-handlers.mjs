import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { createPageStudioHandlerRegistry } from "./page-studio-custom-widgets-handler-runtime.mjs";
import { MODULE_ID } from "./page-studio-shared-runtime.mjs";

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createPageStudioHandlerRegistry(context),
    moduleId: MODULE_ID
  });
}
