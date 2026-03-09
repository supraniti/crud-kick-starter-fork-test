import {
  MODULE_ID,
  PAGES_COLLECTION_ID,
  POSTS_COLLECTION_ID,
  normalizePageStatus,
  normalizePrimarySourceType,
  toTimestamp
} from "./distribution-shared-runtime.mjs";
import { resolvePageByPath, resolvePageDeliveryPayload } from "./page-delivery-runtime.mjs";

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

function readUpdatedByAuthorId(body) {
  return typeof body?.updatedByAuthorId === "string" ? body.updatedByAuthorId.trim() : "";
}

function createRouteContext({ manifest, moduleRegistry, collectionHandlerRegistry }) {
  const moduleId = manifest?.id ?? MODULE_ID;
  return {
    moduleId,
    pagesBasePath: `/api/reference/modules/${moduleId}/pages`,
    deliveryBasePath: `/api/reference/modules/${moduleId}/delivery`,
    moduleRegistry,
    collectionHandlerRegistry,
    pagesHandler: collectionHandlerRegistry.get(PAGES_COLLECTION_ID),
    postsHandler: collectionHandlerRegistry.get(POSTS_COLLECTION_ID)
  };
}

function parsePreviewFlag(request) {
  const rawValue = request.query?.preview;
  return rawValue === true || rawValue === "true" || rawValue === "1";
}

async function loadPage(pagesHandler, pageId, reply) {
  const page = await pagesHandler.findById(pageId);
  if (page) {
    return page;
  }
  reply.code(404);
  return errorPayload("PAGE_NOT_FOUND", `Page '${pageId}' was not found`);
}

async function loadPost(postsHandler, postId, reply) {
  if (!postId) {
    return null;
  }
  const post = await postsHandler.findById(postId);
  if (post) {
    return post;
  }
  reply.code(404);
  return errorPayload("PAGE_SOURCE_POST_NOT_FOUND", `Post '${postId}' was not found`);
}

async function updateSourcePostStatus({
  postsHandler,
  post,
  nextStatus,
  updatedByAuthorId,
  reply
}) {
  if (!post || post.status === nextStatus) {
    return post;
  }

  const updateResult = await postsHandler.update({
    body: {
      status: nextStatus,
      updatedByAuthorId
    },
    item: post,
    reply
  });
  if (!updateResult?.ok) {
    reply.code(updateResult?.statusCode ?? 400);
    return updateResult?.payload ?? errorPayload("PAGE_SOURCE_POST_PUBLISH_FAILED", "Failed to publish source post");
  }
  if (typeof postsHandler.afterMutation === "function") {
    await postsHandler.afterMutation({
      action: "update",
      collectionId: POSTS_COLLECTION_ID,
      itemId: post.id
    });
  }

  return postsHandler.findById(post.id);
}

async function maybePublishSourcePost({ postsHandler, page, updatedByAuthorId, reply }) {
  const sourceType = normalizePrimarySourceType(page.primarySource?.sourceType ?? page.primarySourceType);
  const postId = page.primarySource?.itemId ?? null;
  if (sourceType !== "blog-post" || !postId) {
    return true;
  }

  const post = await loadPost(postsHandler, postId, reply);
  if (post?.ok === false) {
    return post;
  }
  if (!post) {
    return true;
  }
  if (post.status === "published") {
    return true;
  }
  if (post.status === "archived") {
    reply.code(409);
    return errorPayload(
      "PAGE_SOURCE_POST_NOT_READY",
      "Blog-post-backed pages cannot publish while the source post is archived"
    );
  }
  if (!updatedByAuthorId) {
    reply.code(400);
    return errorPayload(
      "PAGE_SOURCE_POST_UPDATED_BY_REQUIRED",
      "updatedByAuthorId is required when publishing a page backed by a blog post"
    );
  }

  let currentPost = post;
  const transitionPlan = post.status === "draft" ? ["in-review", "published"] : ["published"];
  for (const nextStatus of transitionPlan) {
    currentPost = await updateSourcePostStatus({
      postsHandler,
      post: currentPost,
      nextStatus,
      updatedByAuthorId,
      reply
    });
    if (currentPost?.ok === false) {
      return currentPost;
    }
  }
  return true;
}

function buildPagePublishUpdate(page) {
  const currentPublishedOn =
    typeof page?.publishedOn === "string" && page.publishedOn.trim().length > 0
      ? page.publishedOn.trim()
      : null;
  return {
    status: "published",
    publishedOn: currentPublishedOn ?? toTimestamp()
  };
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

    if (!routeContext.pagesHandler) {
      reply.code(500);
      return errorPayload("PAGE_ROUTE_UNAVAILABLE", "Page handlers are not registered");
    }

    const page = await loadPage(routeContext.pagesHandler, request.params?.pageId, reply);
    if (page?.ok === false) {
      return page;
    }
    const pageStatus = normalizePageStatus(page.status);
    if (pageStatus === "archived") {
      reply.code(409);
      return errorPayload(
        "PAGE_PUBLISH_STATUS_INVALID",
        "Archived pages cannot be published from the pages desk"
      );
    }

    const postPublishResult = await maybePublishSourcePost({
      postsHandler: routeContext.postsHandler,
      page,
      updatedByAuthorId: readUpdatedByAuthorId(request.body),
      reply
    });
    if (postPublishResult !== true) {
      return postPublishResult;
    }

    const updateResult = await routeContext.pagesHandler.update({
      body: buildPagePublishUpdate(page),
      item: page,
      reply
    });
    if (!updateResult?.ok) {
      reply.code(updateResult?.statusCode ?? 400);
      return updateResult?.payload ?? errorPayload("PAGE_PUBLISH_FAILED", "Failed to publish page");
    }
    if (typeof routeContext.pagesHandler.afterMutation === "function") {
      await routeContext.pagesHandler.afterMutation({
        action: "update",
        collectionId: PAGES_COLLECTION_ID,
        itemId: page.id
      });
    }

    const item = await routeContext.pagesHandler.findById(page.id);
    return buildPayload({
      ok: true,
      item: item ?? null
    });
  };
}

function createPageDeliveryHandler(routeContext) {
  return async function pageDeliveryRoute(request, reply) {
    const moduleAvailability = ensureModuleEnabled(
      routeContext.moduleRegistry,
      routeContext.moduleId,
      reply
    );
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }

    const page = await loadPage(routeContext.pagesHandler, request.params?.pageId, reply);
    if (page?.ok === false) {
      return page;
    }

    const payload = await resolvePageDeliveryPayload({
      collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
      page,
      preview: parsePreviewFlag(request) || page.status !== "published"
    });

    return buildPayload({
      ok: true,
      payload
    });
  };
}

function createPathDeliveryHandler(routeContext) {
  return async function pagePathDeliveryRoute(request, reply) {
    const moduleAvailability = ensureModuleEnabled(
      routeContext.moduleRegistry,
      routeContext.moduleId,
      reply
    );
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }

    const path = typeof request.query?.path === "string" ? request.query.path : "";
    if (!path.trim()) {
      reply.code(400);
      return errorPayload("PAGE_PATH_REQUIRED", "path query parameter is required");
    }

    const payload = await resolvePageByPath({
      collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
      path,
      preview: parsePreviewFlag(request)
    });
    if (payload) {
      return buildPayload({
        ok: true,
        payload
      });
    }

    reply.code(404);
    return errorPayload("PAGE_PATH_NOT_FOUND", `No deliverable page matched path '${path}'`);
  };
}

export function registerRoutes({ fastify, manifest, moduleRegistry, collectionHandlerRegistry }) {
  const routeContext = createRouteContext({
    manifest,
    moduleRegistry,
    collectionHandlerRegistry
  });

  fastify.post(`${routeContext.pagesBasePath}/:pageId/publish-now`, createPublishNowHandler(routeContext));
  fastify.get(`${routeContext.pagesBasePath}/:pageId/delivery`, createPageDeliveryHandler(routeContext));
  fastify.get(`${routeContext.deliveryBasePath}/resolve`, createPathDeliveryHandler(routeContext));
}
