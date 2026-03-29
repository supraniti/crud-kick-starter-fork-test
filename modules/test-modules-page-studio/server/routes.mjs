import { normalizePageStudioDocument } from "../shared/page-studio-document.mjs";
import {
  buildPageStudioPreviewModel,
  resolvePageStudioPreviewTheme
} from "../shared/page-studio-preview-model.mjs";

const POSTS_COLLECTION_ID = "blog-posts";
const AUTHORS_COLLECTION_ID = "blog-authors";
const CATEGORIES_COLLECTION_ID = "blog-categories";
const TAGS_COLLECTION_ID = "blog-tags";
const MEDIA_ITEMS_COLLECTION_ID = "media-items";
const THEMES_COLLECTION_ID = "page-themes";

function buildPayload(payload) {
  return {
    ...payload,
    timestamp: new Date().toISOString()
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

export function createPageStudioPreviewRouteContext({ manifest, moduleRegistry, collectionHandlerRegistry }) {
  const moduleId = manifest?.id ?? "test-modules-page-studio";
  return {
    moduleId,
    moduleRegistry,
    postsHandler: collectionHandlerRegistry.get(POSTS_COLLECTION_ID),
    authorsHandler: collectionHandlerRegistry.get(AUTHORS_COLLECTION_ID),
    categoriesHandler: collectionHandlerRegistry.get(CATEGORIES_COLLECTION_ID),
    tagsHandler: collectionHandlerRegistry.get(TAGS_COLLECTION_ID),
    mediaHandler: collectionHandlerRegistry.get(MEDIA_ITEMS_COLLECTION_ID),
    themesHandler: collectionHandlerRegistry.get(THEMES_COLLECTION_ID)
  };
}

async function listHandlerItems(handler, options = {}) {
  if (!handler || typeof handler.list !== "function") {
    return [];
  }
  const payload = await handler.list({
    limit: options.limit ?? 500,
    offset: options.offset ?? 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

function pickPreviewStudioDocument(body = {}) {
  if (body?.studioDocument && typeof body.studioDocument === "object") {
    return body.studioDocument;
  }
  return body;
}

export function createPageStudioPreviewBootstrapHandler(routeContext) {
  return async function pageStudioPreviewBootstrapRoute(request, reply) {
    const availability = ensureModuleEnabled(routeContext.moduleRegistry, routeContext.moduleId, reply);
    if (availability !== true) {
      return availability;
    }

    const studioDocument = normalizePageStudioDocument(pickPreviewStudioDocument(request.body ?? {}));
    const previewParams = studioDocument.preview?.urlParams ?? {};

    const [posts, authors, categories, tags, mediaItems, themes] = await Promise.all([
      listHandlerItems(routeContext.postsHandler),
      listHandlerItems(routeContext.authorsHandler),
      listHandlerItems(routeContext.categoriesHandler),
      listHandlerItems(routeContext.tagsHandler),
      listHandlerItems(routeContext.mediaHandler),
      listHandlerItems(routeContext.themesHandler)
    ]);

    const collections = {
      posts,
      authors,
      categories,
      tags,
      mediaItems,
      themes
    };
    const previewModelState = buildPageStudioPreviewModel({
      studioDocument,
      collections,
      previewParams
    });
    const themeDocument = resolvePageStudioPreviewTheme(studioDocument, themes);

    return buildPayload({
      ok: true,
      preview: {
        page: previewModelState.page ?? null,
        model: previewModelState.model ?? null,
        issue: previewModelState.issue ?? null,
        sourceRecordId: previewModelState.sourceRecordId ?? null,
        themeDocument,
        collections
      }
    });
  };
}

function registerPreviewBootstrapRoute(fastify, routeContext) {
  const routePath = `/api/reference/modules/${routeContext.moduleId}/preview/bootstrap`;
  fastify.post(routePath, createPageStudioPreviewBootstrapHandler(routeContext));
}

export function registerRoutes({ fastify, manifest, moduleRegistry, collectionHandlerRegistry }) {
  const routeContext = createPageStudioPreviewRouteContext({
    manifest,
    moduleRegistry,
    collectionHandlerRegistry
  });
  registerPreviewBootstrapRoute(fastify, routeContext);
}
