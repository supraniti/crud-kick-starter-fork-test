import { POSTS_COLLECTION_ID, PUBLISHABLE_STATUS, MODULE_ID, toTimestamp } from "./distribution-shared-runtime.mjs";

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
    postsHandler: collectionHandlerRegistry.get(POSTS_COLLECTION_ID)
  };
}

function readUpdatedByAuthorId(body) {
  return typeof body?.updatedByAuthorId === "string" ? body.updatedByAuthorId.trim() : "";
}

function ensurePostsHandler(routeContext, reply) {
  if (routeContext.postsHandler) {
    return routeContext.postsHandler;
  }

  reply.code(500);
  return errorPayload(
    "BLOG_DISTRIBUTION_ROUTE_UNAVAILABLE",
    "Blog distribution post handlers are not registered"
  );
}

async function loadPost(postsHandler, postId, reply) {
  const post = await postsHandler.findById(postId);
  if (post) {
    return post;
  }

  reply.code(404);
  return errorPayload("BLOG_DISTRIBUTION_POST_NOT_FOUND", `Post '${postId}' was not found`);
}

function ensurePublishablePost(post, reply) {
  if (post.status === PUBLISHABLE_STATUS) {
    return true;
  }

  reply.code(409);
  return errorPayload(
    "BLOG_DISTRIBUTION_PUBLISH_STATUS_INVALID",
    `Only ${PUBLISHABLE_STATUS} posts can be published from the distribution desk`
  );
}

async function persistRevision(postsHandler, postId, reply) {
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
      "BLOG_DISTRIBUTION_REVISION_PERSIST_FAILED",
      error?.message ?? "Published post but failed to append the revision record"
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

function createPublishNowHandler(routeContext) {
  return async function publishNowRoute(request, reply) {
    const moduleAvailability = ensureModuleEnabled(
      routeContext.moduleRegistry,
      routeContext.moduleId,
      reply
    );
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }

    const updatedByAuthorId = readUpdatedByAuthorId(request.body);
    if (updatedByAuthorId.length === 0) {
      reply.code(400);
      return errorPayload(
        "BLOG_DISTRIBUTION_UPDATED_BY_REQUIRED",
        "updatedByAuthorId is required"
      );
    }

    const postsHandler = ensurePostsHandler(routeContext, reply);
    if (postsHandler?.ok === false) {
      return postsHandler;
    }

    const postId = request.params?.postId;
    const post = await loadPost(postsHandler, postId, reply);
    if (post?.ok === false) {
      return post;
    }

    const publishableState = ensurePublishablePost(post, reply);
    if (publishableState !== true) {
      return publishableState;
    }

    const updateResult = await postsHandler.update({
      body: {
        status: "published",
        updatedByAuthorId
      },
      item: post,
      reply
    });
    if (!updateResult?.ok) {
      reply.code(updateResult?.statusCode ?? 400);
      return updateResult?.payload ?? errorPayload("BLOG_DISTRIBUTION_PUBLISH_FAILED", "Failed to publish post");
    }

    const persistenceError = await persistRevision(postsHandler, postId, reply);
    if (persistenceError) {
      return persistenceError;
    }

    const item = await resolveUpdatedItem(postsHandler, postId);
    return buildPayload({
      ok: true,
      item: item ?? null
    });
  };
}

export function registerRoutes({ fastify, manifest, moduleRegistry, collectionHandlerRegistry }) {
  const routeContext = createRouteContext({
    manifest,
    moduleRegistry,
    collectionHandlerRegistry
  });

  fastify.post(`${routeContext.basePath}/:postId/publish-now`, createPublishNowHandler(routeContext));
}
