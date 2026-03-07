import {
  applyNullifyDependencies,
  resolveReferenceDeleteDependencies
} from "../../../server/src/domains/reference/collections/services/reference-collection-delete-dependencies-domain-service.js";
import {
  badRequestWithConflicts,
  collectionPersistenceFailedPayload,
  deleteRestrictedPayload,
  itemNotFoundPayload
} from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  resolveCollectionAccess
} from "../../../server/src/domains/reference/collections/services/reference-collection-workspace-domain-service.js";
import {
  markDeployRequired,
  toDeployStatePayload
} from "../../../server/src/domains/reference/runtime/services/reference-state-utils-domain-service.js";
import {
  EDITABLE_METADATA_FIELDS,
  MAX_UPLOAD_BYTES,
  MEDIA_ITEMS_COLLECTION_ID,
  MODULE_ID
} from "./media-library/media-library-contract.mjs";
import {
  createUploadedMediaItem,
  deleteStoredMediaItem,
  readStoredMediaContent,
  updateStoredMediaMetadata
} from "./media-library/media-library-runtime.mjs";
import { resolveMediaItemsRepository } from "./media-library/media-library-repository.mjs";

function buildTimestampedPayload(payload) {
  return {
    ...payload,
    timestamp: new Date().toISOString()
  };
}

function mediaErrorPayload(error) {
  return buildTimestampedPayload({
    ok: false,
    error: {
      code: error?.code ?? "MEDIA_ROUTE_FAILED",
      message: error?.message ?? "Media route failed"
    }
  });
}

function ensureModuleEnabled(moduleRegistry, moduleId, reply) {
  const moduleState = moduleRegistry.getState(moduleId);
  if (moduleState === "enabled") {
    return true;
  }

  reply.code(409);
  return buildTimestampedPayload({
    ok: false,
    error: {
      code: "MODULE_ROUTE_UNAVAILABLE",
      message: `Module '${moduleId}' is not enabled`
    }
  });
}

function createDeployMarker(runtimeContext) {
  return async function markDeployAndReadPayload() {
    const repository = runtimeContext.remotesDeployRepository;
    if (repository) {
      return repository.transact(async (workingState) => {
        markDeployRequired(workingState);
        return {
          commit: true,
          value: toDeployStatePayload(workingState)
        };
      });
    }

    markDeployRequired(runtimeContext.state);
    return toDeployStatePayload(runtimeContext.state);
  };
}

function readEditableMetadataPatch(body = {}) {
  const patch = {};
  const unexpectedFields = [];

  for (const [key, value] of Object.entries(body ?? {})) {
    if (!EDITABLE_METADATA_FIELDS.includes(key)) {
      unexpectedFields.push(key);
      continue;
    }
    patch[key] = value;
  }

  return {
    patch,
    unexpectedFields
  };
}

function projectValidatedPatch(patch = {}, validatedValue = {}) {
  return Object.fromEntries(
    Object.keys(patch).map((key) => [key, validatedValue[key]])
  );
}

function createRouteContext({
  manifest,
  moduleRegistry,
  collectionHandlerRegistry,
  persistencePluginRegistry,
  runtimeContext
}) {
  const moduleId = manifest?.id ?? MODULE_ID;
  return {
    moduleId,
    basePath: `/api/reference/modules/${moduleId}/media-items`,
    moduleRegistry,
    collectionHandlerRegistry,
    persistencePluginRegistry,
    runtimeContext,
    repository: resolveMediaItemsRepository((collectionId) =>
      persistencePluginRegistry.getCollectionRepository(collectionId)
    ),
    markDeployAndReadPayload: createDeployMarker({
      ...runtimeContext,
      persistencePluginRegistry
    })
  };
}

function ensureMetadataAccess(routeContext, reply) {
  const access = resolveCollectionAccess({
    collectionId: MEDIA_ITEMS_COLLECTION_ID,
    resolveActiveCollectionResolution: () =>
      routeContext.runtimeContext.resolvers.resolveCollectionResolution({ activeOnly: true }),
    collectionHandlerRegistry: routeContext.collectionHandlerRegistry
  });
  if (access.ok) {
    return access;
  }

  reply.code(404);
  return access.payload;
}

function validateMetadataPatch(reply, body, access) {
  const { patch, unexpectedFields } = readEditableMetadataPatch(body);
  if (unexpectedFields.length > 0) {
    reply.code(400);
    return buildTimestampedPayload({
      ok: false,
      error: {
        code: "MEDIA_METADATA_FIELDS_UNSUPPORTED",
        message: `Unsupported metadata fields: ${unexpectedFields.join(", ")}`
      }
    });
  }
  if (Object.keys(patch).length === 0) {
    reply.code(400);
    return buildTimestampedPayload({
      ok: false,
      error: {
        code: "MEDIA_METADATA_EMPTY",
        message: "At least one metadata field is required"
      }
    });
  }

  return {
    ok: true,
    patch,
    validate: async () => {
      const validation = await access.handler.validateInput(patch, {
        partial: true
      });
      if (!validation.ok) {
        return badRequestWithConflicts(reply, validation.errors, "MEDIA_METADATA_INVALID");
      }

      return {
        ok: true,
        normalizedPatch: projectValidatedPatch(patch, validation.value)
      };
    }
  };
}

async function resolveDeleteCleanup(routeContext, mediaItemId) {
  const activeCollections = routeContext.runtimeContext.resolvers.resolveCollectionResolution({
    activeOnly: true
  });
  const deleteDependencies = await resolveReferenceDeleteDependencies({
    activeCollections,
    targetCollectionId: MEDIA_ITEMS_COLLECTION_ID,
    targetItemId: mediaItemId,
    resolveCollectionRepository: (collectionId) =>
      routeContext.persistencePluginRegistry.getCollectionRepository(collectionId),
    resolveSettingsRepository: (moduleId) =>
      routeContext.persistencePluginRegistry.getSettingsRepository(moduleId)
  });
  const restrictDependencies = deleteDependencies.filter((entry) => entry.policy === "restrict");
  if (restrictDependencies.length > 0) {
    return {
      ok: false,
      restrictDependencies
    };
  }

  const nullifyDependencies = deleteDependencies.filter((entry) => entry.policy === "nullify");
  if (nullifyDependencies.length > 0) {
    await applyNullifyDependencies({
      nullifyDependencies,
      targetItemId: mediaItemId,
      resolveCollectionRepository: (collectionId) =>
        routeContext.persistencePluginRegistry.getCollectionRepository(collectionId)
    });
  }

  return {
    ok: true
  };
}

function registerUploadRoute(fastify, routeContext) {
  fastify.post(
    `${routeContext.basePath}/uploads`,
    {
      bodyLimit: Math.ceil(MAX_UPLOAD_BYTES * 1.5)
    },
    async (request, reply) => {
      const availabilityPayload = ensureModuleEnabled(
        routeContext.moduleRegistry,
        routeContext.moduleId,
        reply
      );
      if (availabilityPayload !== true) {
        return availabilityPayload;
      }

      try {
        const item = await createUploadedMediaItem(routeContext.repository, request.body ?? {});
        const deploy = await routeContext.markDeployAndReadPayload();
        reply.code(201);
        return buildTimestampedPayload({
          ok: true,
          moduleId: routeContext.moduleId,
          collectionId: MEDIA_ITEMS_COLLECTION_ID,
          item,
          deploy
        });
      } catch (error) {
        reply.code(error?.statusCode ?? 500);
        return mediaErrorPayload(error);
      }
    }
  );
}

function registerMetadataRoute(fastify, routeContext) {
  fastify.put(`${routeContext.basePath}/:itemId/metadata`, async (request, reply) => {
    const availabilityPayload = ensureModuleEnabled(
      routeContext.moduleRegistry,
      routeContext.moduleId,
      reply
    );
    if (availabilityPayload !== true) {
      return availabilityPayload;
    }

    const access = ensureMetadataAccess(routeContext, reply);
    if (!access?.ok) {
      return access;
    }

    const patchValidation = validateMetadataPatch(reply, request.body ?? {}, access);
    if (!patchValidation?.ok) {
      return patchValidation;
    }

    const normalizedPatchResult = await patchValidation.validate();
    if (!normalizedPatchResult?.ok) {
      return normalizedPatchResult;
    }

    const itemId = request.params?.itemId;
    try {
      const updatedItem = await updateStoredMediaMetadata(
        routeContext.repository,
        itemId,
        normalizedPatchResult.normalizedPatch
      );
      if (!updatedItem) {
        reply.code(404);
        return itemNotFoundPayload(MEDIA_ITEMS_COLLECTION_ID, itemId);
      }

      const deploy = await routeContext.markDeployAndReadPayload();
      return buildTimestampedPayload({
        ok: true,
        moduleId: routeContext.moduleId,
        collectionId: MEDIA_ITEMS_COLLECTION_ID,
        item: await access.handler.resolveRow(updatedItem),
        deploy
      });
    } catch (error) {
      reply.code(500);
      return collectionPersistenceFailedPayload(MEDIA_ITEMS_COLLECTION_ID, "update", error);
    }
  });
}

function registerDeleteRoute(fastify, routeContext) {
  fastify.delete(`${routeContext.basePath}/:itemId`, async (request, reply) => {
    const availabilityPayload = ensureModuleEnabled(
      routeContext.moduleRegistry,
      routeContext.moduleId,
      reply
    );
    if (availabilityPayload !== true) {
      return availabilityPayload;
    }

    const itemId = request.params?.itemId;
    try {
      const cleanupResult = await resolveDeleteCleanup(routeContext, itemId);
      if (!cleanupResult.ok) {
        reply.code(409);
        return deleteRestrictedPayload(
          MEDIA_ITEMS_COLLECTION_ID,
          itemId,
          cleanupResult.restrictDependencies
        );
      }

      const removed = await deleteStoredMediaItem(routeContext.repository, itemId);
      if (!removed) {
        reply.code(404);
        return itemNotFoundPayload(MEDIA_ITEMS_COLLECTION_ID, itemId);
      }

      const deploy = await routeContext.markDeployAndReadPayload();
      return buildTimestampedPayload({
        ok: true,
        moduleId: routeContext.moduleId,
        collectionId: MEDIA_ITEMS_COLLECTION_ID,
        removed: {
          id: removed.id
        },
        deploy
      });
    } catch (error) {
      reply.code(500);
      return collectionPersistenceFailedPayload(MEDIA_ITEMS_COLLECTION_ID, "delete", error);
    }
  });
}

function registerContentRoute(fastify, routeContext) {
  fastify.get(`${routeContext.basePath}/:itemId/content`, async (request, reply) => {
    const availabilityPayload = ensureModuleEnabled(
      routeContext.moduleRegistry,
      routeContext.moduleId,
      reply
    );
    if (availabilityPayload !== true) {
      return availabilityPayload;
    }

    try {
      const mediaPayload = await readStoredMediaContent(
        routeContext.repository,
        request.params?.itemId
      );
      if (!mediaPayload) {
        reply.code(404);
        return itemNotFoundPayload(MEDIA_ITEMS_COLLECTION_ID, request.params?.itemId);
      }

      reply.header("cache-control", "no-store");
      reply.type(mediaPayload.item.mimeType);
      return mediaPayload.buffer;
    } catch (error) {
      reply.code(error?.statusCode ?? 500);
      return mediaErrorPayload(error);
    }
  });
}

export function registerRoutes({
  fastify,
  manifest,
  moduleRegistry,
  collectionHandlerRegistry,
  persistencePluginRegistry,
  ...runtimeContext
}) {
  const routeContext = createRouteContext({
    manifest,
    moduleRegistry,
    collectionHandlerRegistry,
    persistencePluginRegistry,
    runtimeContext
  });

  registerUploadRoute(fastify, routeContext);
  registerMetadataRoute(fastify, routeContext);
  registerDeleteRoute(fastify, routeContext);
  registerContentRoute(fastify, routeContext);
}
