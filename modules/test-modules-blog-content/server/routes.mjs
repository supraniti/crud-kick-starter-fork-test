import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import { clearQueuedRevisionMeta, queueNextRevisionMeta } from "./content-revision-meta-runtime.mjs";
import {
  MODULE_ID,
  POSTS_COLLECTION_ID,
  REVISIONS_COLLECTION_ID,
  toTimestamp
} from "./content-shared-runtime.mjs";

function buildPayload(payload) {
  return {
    ...payload,
    timestamp: toTimestamp()
  };
}

function errorPayload(code, message) {
  return buildPayload({
    ok: false,
    error: {
      code,
      message
    }
  });
}

function ensureModuleEnabled(moduleRegistry, moduleId, reply) {
  if (moduleRegistry?.getState(moduleId) === "enabled") {
    return true;
  }

  reply.code(409);
  return errorPayload("MODULE_ROUTE_UNAVAILABLE", `Module '${moduleId}' is not enabled`);
}

function createRouteContext({ manifest, moduleRegistry, collectionHandlerRegistry }) {
  const moduleId = manifest?.id ?? MODULE_ID;
  return {
    moduleId,
    basePath: `/api/reference/modules/${moduleId}/posts`,
    moduleRegistry,
    postsHandler: collectionHandlerRegistry.get(POSTS_COLLECTION_ID),
    revisionsHandler: collectionHandlerRegistry.get(REVISIONS_COLLECTION_ID)
  };
}

function buildRestoreTaxonomyFields(revision) {
  return {
    categoryIds: revision.taxonomySnapshot?.categoryIds ?? [],
    tagIds: revision.taxonomySnapshot?.tagIds ?? []
  };
}

function buildRestoreMediaFields(revision) {
  return {
    featuredMediaId: revision.mediaSnapshot?.featuredMediaId ?? null,
    galleryMediaIds: revision.mediaSnapshot?.galleryMediaIds ?? [],
    ogImageMediaId: revision.mediaSnapshot?.ogImageMediaId ?? null
  };
}

function buildRestoreSeoFields(revision) {
  return {
    canonicalUrl: revision.seoSnapshot?.canonicalUrl ?? null,
    seoTitle: revision.seoSnapshot?.seoTitle ?? null,
    seoDescription: revision.seoSnapshot?.seoDescription ?? null,
    ogTitle: revision.seoSnapshot?.ogTitle ?? null,
    ogDescription: revision.seoSnapshot?.ogDescription ?? null
  };
}

function buildRestoreBody(revision, requestBody = {}) {
  return {
    title: revision.titleSnapshot,
    subtitle: revision.subtitleSnapshot,
    excerpt: revision.excerptSnapshot,
    body: revision.bodySnapshot,
    status: revision.statusSnapshot,
    scheduledOn: revision.scheduledOnSnapshot ?? null,
    publishedOn: revision.publishedOnSnapshot ?? null,
    archivedOn: revision.archivedOnSnapshot ?? null,
    updatedByAuthorId: requestBody.updatedByAuthorId ?? revision.changedByAuthorId,
    ...buildRestoreTaxonomyFields(revision),
    ...buildRestoreMediaFields(revision),
    ...buildRestoreSeoFields(revision)
  };
}

function readRevisionId(body) {
  return typeof body?.revisionId === "string" ? body.revisionId.trim() : "";
}

function ensureRestoreHandlers(routeContext, reply) {
  const { postsHandler, revisionsHandler } = routeContext;
  if (postsHandler && revisionsHandler) {
    return { postsHandler, revisionsHandler };
  }

  reply.code(500);
  return {
    error: errorPayload("BLOG_CONTENT_ROUTE_UNAVAILABLE", "Blog content handlers are not registered")
  };
}

async function loadRestoreTargets({ postsHandler, revisionsHandler, postId, revisionId, reply }) {
  const post = await postsHandler.findById(postId);
  if (!post) {
    reply.code(404);
    return {
      error: errorPayload("BLOG_POST_NOT_FOUND", `Post '${postId}' was not found`)
    };
  }

  const revision = await revisionsHandler.findById(revisionId);
  if (!revision) {
    reply.code(404);
    return {
      error: errorPayload("BLOG_POST_REVISION_NOT_FOUND", `Revision '${revisionId}' was not found`)
    };
  }

  if (revision.postId !== postId) {
    reply.code(400);
    return {
      error: errorPayload(
        "BLOG_POST_REVISION_MISMATCH",
        `Revision '${revisionId}' does not belong to post '${postId}'`
      )
    };
  }

  return { post, revision };
}

function buildRollbackMeta({ requestBody, restoreBody, revision }) {
  const requestedSummary =
    typeof requestBody?.changeSummary === "string" ? requestBody.changeSummary.trim() : "";
  return {
    source: "rollback",
    isAutosave: false,
    changedByAuthorId: restoreBody.updatedByAuthorId,
    changeSummary: requestedSummary || `Restored revision ${revision.revisionNumber}`,
    changedOn: toTimestamp()
  };
}

async function runRestoreUpdate({ postId, postsHandler, post, restoreBody, reply }) {
  try {
    const updateResult = await postsHandler.update({
      body: restoreBody,
      item: post,
      reply
    });
    if (updateResult?.ok) {
      return { updateResult };
    }

    clearQueuedRevisionMeta(postId);
    reply.code(updateResult?.statusCode ?? 400);
    return {
      error: updateResult?.payload ?? badRequestWithConflicts(reply, [])
    };
  } catch (error) {
    clearQueuedRevisionMeta(postId);
    reply.code(500);
    return {
      error: errorPayload(
        "BLOG_POST_RESTORE_FAILED",
        error?.message ?? "Failed to restore blog post revision"
      )
    };
  }
}

async function persistRollbackRevision({ postId, postsHandler, reply }) {
  if (typeof postsHandler.afterMutation !== "function") {
    return null;
  }

  try {
    await postsHandler.afterMutation({
      action: "update",
      collectionId: POSTS_COLLECTION_ID,
      itemId: postId
    });
    return null;
  } catch (error) {
    reply.code(500);
    return errorPayload(
      "BLOG_POST_REVISION_RESTORE_PERSISTENCE_FAILED",
      error?.message ?? "Restored post but failed to record rollback revision"
    );
  }
}

async function resolveUpdatedItem(postsHandler, postId) {
  const updatedPost = await postsHandler.findById(postId);
  if (!updatedPost || typeof postsHandler.resolveRow !== "function") {
    return updatedPost;
  }
  return postsHandler.resolveRow(updatedPost);
}

function createRestoreRevisionHandler(routeContext) {
  return async function restoreRevisionRoute(request, reply) {
    const moduleAvailability = ensureModuleEnabled(
      routeContext.moduleRegistry,
      routeContext.moduleId,
      reply
    );
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }

    const revisionId = readRevisionId(request.body);
    if (revisionId.length === 0) {
      reply.code(400);
      return errorPayload("BLOG_POST_REVISION_ID_REQUIRED", "revisionId is required");
    }

    const handlerState = ensureRestoreHandlers(routeContext, reply);
    if (handlerState.error) {
      return handlerState.error;
    }

    const postId = request.params?.postId;
    const targetState = await loadRestoreTargets({
      postsHandler: handlerState.postsHandler,
      revisionsHandler: handlerState.revisionsHandler,
      postId,
      revisionId,
      reply
    });
    if (targetState.error) {
      return targetState.error;
    }

    const restoreBody = buildRestoreBody(targetState.revision, request.body ?? {});
    queueNextRevisionMeta(
      postId,
      buildRollbackMeta({
        requestBody: request.body,
        restoreBody,
        revision: targetState.revision
      })
    );

    const updateState = await runRestoreUpdate({
      postId,
      postsHandler: handlerState.postsHandler,
      post: targetState.post,
      restoreBody,
      reply
    });
    if (updateState.error) {
      return updateState.error;
    }

    const persistenceError = await persistRollbackRevision({
      postId,
      postsHandler: handlerState.postsHandler,
      reply
    });
    if (persistenceError) {
      return persistenceError;
    }

    const resolvedItem = await resolveUpdatedItem(handlerState.postsHandler, postId);
    return buildPayload({
      ok: true,
      item: resolvedItem ?? null,
      restoredFromRevisionId: revisionId
    });
  };
}

function registerRestoreRevisionRoute(fastify, routeContext) {
  fastify.post(
    `${routeContext.basePath}/:postId/restore-revision`,
    createRestoreRevisionHandler(routeContext)
  );
}

export function registerRoutes({ fastify, manifest, moduleRegistry, collectionHandlerRegistry }) {
  const routeContext = createRouteContext({
    manifest,
    moduleRegistry,
    collectionHandlerRegistry
  });

  registerRestoreRevisionRoute(fastify, routeContext);
}
