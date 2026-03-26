import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { MODULE_ID } from "./translations-shared-runtime.mjs";
import { createTranslationsHandlerRegistry } from "./translations-handler-runtime.mjs";

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createTranslationsHandlerRegistry(context),
    moduleId: MODULE_ID
  });
}
