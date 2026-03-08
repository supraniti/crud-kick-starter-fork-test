import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { createDistributionHandlerRegistry } from "./distribution-handler-runtime.mjs";
import { MODULE_ID } from "./distribution-shared-runtime.mjs";

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createDistributionHandlerRegistry(context),
    moduleId: MODULE_ID
  });
}
