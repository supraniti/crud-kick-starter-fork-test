import { registerGeneratedCollectionHandlers } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { createThemesHandlerRegistry } from "./themes-handler-runtime.mjs";
import { MODULE_ID } from "./themes-shared-runtime.mjs";

export function registerCollectionHandlers(context = {}) {
  return registerGeneratedCollectionHandlers({
    ...context,
    registry: createThemesHandlerRegistry(context),
    moduleId: MODULE_ID
  });
}
