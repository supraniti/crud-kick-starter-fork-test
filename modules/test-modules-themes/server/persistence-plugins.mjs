import {
  createGeneratedCollectionsRepository,
  registerGeneratedCollectionPersistencePlugins
} from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs";
import { MODULE_ID } from "./themes-shared-runtime.mjs";

function createPluginIdRewritingRegistry(registry, pluginId) {
  if (!registry || typeof registry !== "object" || typeof registry.register !== "function") {
    return registry;
  }

  const wrappedRegistry = Object.create(registry);
  wrappedRegistry.register = (entry = {}) => {
    const normalizedEntry = entry && typeof entry === "object" ? entry : {};
    return registry.register({
      ...normalizedEntry,
      pluginId
    });
  };
  return wrappedRegistry;
}

export function registerPersistencePlugins(context = {}) {
  const pluginId = `${MODULE_ID}-persistence`;
  return registerGeneratedCollectionPersistencePlugins({
    ...context,
    registry: createPluginIdRewritingRegistry(context.registry, pluginId),
    moduleId: MODULE_ID,
    persistenceMode: context.persistenceMode
  });
}

export function createTestModulesThemesRepository(options = {}) {
  return createGeneratedCollectionsRepository({
    ...options,
    moduleId: MODULE_ID,
    persistenceMode: options.persistenceMode
  });
}
