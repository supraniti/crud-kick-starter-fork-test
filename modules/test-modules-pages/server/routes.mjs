import {
  isPagePublished,
  PAGES_COLLECTION_ID,
  POSTS_COLLECTION_ID,
  normalizePageStatus,
  normalizePrimarySourceType,
  toTimestamp
} from "./distribution-shared-runtime.mjs";
import { registerDeploymentBundleReleaseRoute } from "./deployment-bundle-release-runtime.mjs";
import { createPagesRouteContext } from "./pages-route-context-runtime.mjs";
import {
  listPagePreviewSourceOptions,
  resolvePageByPath,
  resolvePageDeliveryPayload,
  resolvePagePreviewPayload
} from "./page-delivery-runtime.mjs";
import {
  evaluatePageDeploymentState,
  listPageDeploymentInstances,
  runExplicitPageDeploymentSync
} from "./page-deployment-runtime.mjs";
import { registerPagePublicApplicationRoutes } from "./page-public-application-routes-runtime.mjs";
import { registerRuntimeProbeRoutes } from "./page-runtime-probe-runtime.mjs";

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

function parsePreviewFlag(request) {
  const rawValue = request.query?.preview;
  return rawValue === true || rawValue === "true" || rawValue === "1";
}

function readSourceItemIdQuery(request) {
  return typeof request.query?.sourceItemId === "string"
    ? request.query.sourceItemId.trim()
    : "";
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
    value: {
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

    const publishUpdate = buildPagePublishUpdate(page);
    const updateResult = await routeContext.pagesHandler.update({
      body: publishUpdate,
      value: publishUpdate,
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

    const preview = parsePreviewFlag(request) || page.status !== "published";
    const payload = preview
      ? await resolvePagePreviewPayload({
          collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
          page,
          requestedSourceItemId: readSourceItemIdQuery(request) || null,
          resolveSettingsRepository: routeContext.resolveSettingsRepository,
          settingsDefinition: routeContext.manifest?.settings ?? null
        })
      : await resolvePageDeliveryPayload({
          collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
          page,
          preview: false,
          resolveSettingsRepository: routeContext.resolveSettingsRepository,
          settingsDefinition: routeContext.manifest?.settings ?? null
        });

    return buildPayload({
      ok: true,
      payload
    });
  };
}

function createPagePreviewSourcesHandler(routeContext) {
  return async function pagePreviewSourcesRoute(request, reply) {
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

    const items = await listPagePreviewSourceOptions({
      collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
      page
    });
    return buildPayload({
      ok: true,
      items
    });
  };
}

function createPagesDeskItemsHandler(routeContext) {
  return async function pagesDeskItemsRoute(_request, reply) {
    const moduleAvailability = ensureModuleEnabled(
      routeContext.moduleRegistry,
      routeContext.moduleId,
      reply
    );
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }

    const payload = await routeContext.pagesHandler.list({
      limit: 500,
      offset: 0
    });
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const liveItems = await Promise.all(
      items.map(async (page) => {
        const canonicalPage = page?.id
          ? await routeContext.pagesHandler.findById(page.id)
          : page;
        const evaluation = await evaluatePageDeploymentState({
          page: canonicalPage ?? page,
          collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
          resolveSettingsRepository: routeContext.resolveSettingsRepository,
          settingsDefinition: routeContext.manifest?.settings ?? null
        });
        return evaluation.page ?? canonicalPage ?? page;
      })
    );

    return buildPayload({
      ok: true,
      items: liveItems
    });
  };
}

function createSyncDeploymentHandler(routeContext) {
  return async function syncDeploymentRoute(request, reply) {
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
    if (!isPagePublished(page.status)) {
      reply.code(409);
      return errorPayload(
        "PAGE_DEPLOYMENT_SYNC_STATUS_INVALID",
        "Only published pages can sync deployment outputs"
      );
    }

    const syncResult = await runExplicitPageDeploymentSync({
      handler: routeContext.pagesHandler,
      page,
      previousPage: page,
      collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
      resolveSettingsRepository: routeContext.resolveSettingsRepository,
      settingsDefinition: routeContext.manifest?.settings ?? null
    });

    const item = syncResult?.page ?? (await routeContext.pagesHandler.findById(page.id));
    const instances =
      Array.isArray(syncResult?.instances)
        ? syncResult.instances
        : await listPageDeploymentInstances({
            page: item,
            collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
            resolveSettingsRepository: routeContext.resolveSettingsRepository,
            settingsDefinition: routeContext.manifest?.settings ?? null
          });

    return buildPayload({
      ok: true,
      item,
      instances
    });
  };
}

function createDeploymentInstancesHandler(routeContext) {
  return async function deploymentInstancesRoute(request, reply) {
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

    const evaluation = await evaluatePageDeploymentState({
      page,
      collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
      resolveSettingsRepository: routeContext.resolveSettingsRepository,
      settingsDefinition: routeContext.manifest?.settings ?? null
    });

    return buildPayload({
      ok: true,
      item: evaluation.page ?? page,
      items: evaluation.instances
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
      preview: parsePreviewFlag(request),
      resolveSettingsRepository: routeContext.resolveSettingsRepository,
      settingsDefinition: routeContext.manifest?.settings ?? null
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

export function registerRoutes({
  fastify,
  manifest,
  moduleRegistry,
  collectionHandlerRegistry,
  resolveSettingsRepository
}) {
  const routeContext = createPagesRouteContext({
    manifest,
    moduleRegistry,
    collectionHandlerRegistry,
    resolveSettingsRepository
  });

  fastify.post(`${routeContext.pagesBasePath}/:pageId/publish-now`, createPublishNowHandler(routeContext));
  fastify.get(`${routeContext.pagesBasePath}/desk-items`, createPagesDeskItemsHandler(routeContext));
  fastify.post(
    `${routeContext.pagesBasePath}/:pageId/sync-deployment`,
    createSyncDeploymentHandler(routeContext)
  );
  fastify.get(`${routeContext.pagesBasePath}/:pageId/delivery`, createPageDeliveryHandler(routeContext));
  fastify.get(
    `${routeContext.pagesBasePath}/:pageId/preview-sources`,
    createPagePreviewSourcesHandler(routeContext)
  );
  fastify.get(
    `${routeContext.pagesBasePath}/:pageId/deployment-instances`,
    createDeploymentInstancesHandler(routeContext)
  );
  fastify.get(`${routeContext.deliveryBasePath}/resolve`, createPathDeliveryHandler(routeContext));
  registerPagePublicApplicationRoutes(fastify, routeContext);
  registerRuntimeProbeRoutes(fastify, routeContext);
  registerDeploymentBundleReleaseRoute(fastify, routeContext);
}
