import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { MODULE_ID } from "./engagement-shared-runtime.mjs";
import { createEngagementHandlerRegistry } from "./engagement-handler-runtime.mjs";

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createEngagementHandlerRegistry(context),
    moduleId: MODULE_ID
  });
}
