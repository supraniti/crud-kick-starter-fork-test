import { requestGoogleJson } from "../../test-modules-remote-ops/server/remote-ops-live-google-runtime.mjs";
import { getServiceAccountAccessToken } from "../../test-modules-remote-ops/server/remote-ops-service-account-auth-runtime.mjs";
import { COMMENTS_COLLECTION_ID } from "../../test-modules-engagement/server/engagement-shared-runtime.mjs";
import { resolvePageByPath } from "./page-delivery-runtime.mjs";
import { normalizeOptionalText, normalizePagePath } from "./distribution-shared-runtime.mjs";
import { resolvePublishedFirestoreDescriptor } from "./page-firestore-publication-runtime.mjs";

function readPrimaryRecord(payload = {}) {
  const record = payload?.data?.primary?.record;
  return record && typeof record === "object" ? record : null;
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if ("nullValue" in value) {
    return null;
  }
  if ("booleanValue" in value) {
    return Boolean(value.booleanValue);
  }
  if ("integerValue" in value) {
    return Number.parseInt(value.integerValue, 10);
  }
  if ("doubleValue" in value) {
    return Number(value.doubleValue);
  }
  if ("stringValue" in value) {
    return String(value.stringValue);
  }
  if ("timestampValue" in value) {
    return String(value.timestampValue);
  }
  if ("arrayValue" in value) {
    const values = Array.isArray(value.arrayValue?.values) ? value.arrayValue.values : [];
    return values.map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    const fields = value.mapValue?.fields ?? {};
    return Object.entries(fields).reduce((result, [key, fieldValue]) => {
      result[key] = decodeFirestoreValue(fieldValue);
      return result;
    }, {});
  }
  return null;
}

function decodeFirestoreDocument(document = {}) {
  return decodeFirestoreValue({
    mapValue: {
      fields: document?.fields ?? {}
    }
  }) ?? {};
}

function buildPublicApiPayload(payload = {}) {
  return {
    ...payload,
    timestamp: new Date().toISOString()
  };
}

function buildPublicApiError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function setPublicApiCorsHeaders(reply) {
  reply.header("access-control-allow-origin", "*");
  reply.header("access-control-allow-methods", "GET, POST, OPTIONS");
  reply.header("access-control-allow-headers", "content-type");
}

function ensureModuleEnabled(routeContext, reply) {
  if (routeContext.moduleRegistry?.getState(routeContext.moduleId) === "enabled") {
    return true;
  }
  reply.code(409);
  return buildPublicApiPayload({
    ok: false,
    error: {
      code: "MODULE_ROUTE_UNAVAILABLE",
      message: `Module '${routeContext.moduleId}' is not enabled`
    }
  });
}

async function resolvePublishedPagePayload(routeContext, rawPath) {
  const normalizedPath = normalizePagePath(rawPath);
  if (!normalizedPath) {
    throw buildPublicApiError("PUBLIC_PAGE_PATH_REQUIRED", "path query parameter is required", 400);
  }
  const payload = await resolvePageByPath({
    collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
    path: normalizedPath,
    preview: false,
    resolveSettingsRepository: routeContext.resolveSettingsRepository,
    settingsDefinition: routeContext.manifest?.settings ?? null
  });
  if (!payload) {
    throw buildPublicApiError(
      "PUBLIC_PAGE_NOT_FOUND",
      `No deliverable page matched path '${normalizedPath}'`,
      404
    );
  }
  return payload;
}

async function resolvePublishedDocument(routeContext, pagePath) {
  const payload = await resolvePublishedPagePayload(routeContext, pagePath);
  const primaryRecord = readPrimaryRecord(payload);
  if (!primaryRecord) {
    throw buildPublicApiError(
      "PUBLIC_PAGE_PRIMARY_RECORD_MISSING",
      "The resolved page does not contain a primary content record.",
      409
    );
  }
  const firestoreDescriptor = await resolvePublishedFirestoreDescriptor({
    collectionHandlerRegistry: routeContext.collectionHandlerRegistry,
    resolveSettingsRepository: routeContext.resolveSettingsRepository,
    payload
  });
  if (!firestoreDescriptor) {
    throw buildPublicApiError(
      "PUBLIC_FIRESTORE_TARGET_NOT_CONFIGURED",
      "No Firestore projection target is configured for this page source type.",
      409
    );
  }
  const connectionProfile = await routeContext.remoteConnectionsHandler?.findById?.(
    firestoreDescriptor.connectionProfileId
  );
  if (!connectionProfile) {
    throw buildPublicApiError(
      "PUBLIC_FIRESTORE_CONNECTION_NOT_FOUND",
      "No connection profile is available for the Firestore projection target.",
      409
    );
  }

  const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
  const document = await requestGoogleJson(firestoreDescriptor.documentUrl, accessToken, {
    method: "GET"
  });

  return {
    ok: true,
    pagePath: normalizePagePath(pagePath),
    primarySourceType: payload.page.primarySourceType,
    documentId: firestoreDescriptor.documentId,
    firestore: {
      projectId: firestoreDescriptor.projectId,
      collectionPath: firestoreDescriptor.collectionPath,
      documentUrl: firestoreDescriptor.documentUrl
    },
    document: decodeFirestoreDocument(document)
  };
}

async function createComment(routeContext, body = {}, reply) {
  const commentsHandler = routeContext.collectionHandlerRegistry.get(COMMENTS_COLLECTION_ID);
  if (!commentsHandler) {
    throw buildPublicApiError(
      "PUBLIC_COMMENT_HANDLER_UNAVAILABLE",
      "The comments handler is not registered.",
      500
    );
  }

  const input = {
    postId: normalizeOptionalText(body.postId),
    parentCommentId: normalizeOptionalText(body.parentCommentId),
    authorDisplayName: normalizeOptionalText(body.authorDisplayName) ?? "",
    authorEmail: normalizeOptionalText(body.authorEmail),
    body: normalizeOptionalText(body.body) ?? ""
  };

  const validation = await commentsHandler.validateInput(input);
  if (!validation?.ok) {
    reply.code(400);
    return buildPublicApiPayload({
      ok: false,
      error: {
        code: "PUBLIC_COMMENT_VALIDATION_FAILED",
        message: "Comment validation failed.",
        conflicts: validation?.errors ?? []
      }
    });
  }

  const createResult = await commentsHandler.create({
    value: validation.value,
    reply
  });
  if (!createResult?.ok) {
    reply.code(createResult?.statusCode ?? 400);
    return createResult?.payload ?? buildPublicApiPayload({
      ok: false,
      error: {
        code: "PUBLIC_COMMENT_CREATE_FAILED",
        message: "Failed to create public comment."
      }
    });
  }

  if (typeof commentsHandler.afterMutation === "function") {
    await commentsHandler.afterMutation({
      action: "create",
      collectionId: COMMENTS_COLLECTION_ID,
      itemId: createResult.item?.id ?? null
    });
  }

  reply.code(201);
  return buildPublicApiPayload({
    ok: true,
    item: await commentsHandler.resolveRow(createResult.item)
  });
}

export function registerPagePublicApplicationRoutes(fastify, routeContext) {
  const publishedDocumentPath = `/api/reference/modules/${routeContext.moduleId}/public/published-document`;
  const commentsPath = `/api/reference/modules/${routeContext.moduleId}/public/comments`;

  fastify.options(publishedDocumentPath, async function publicPublishedDocumentOptions(_request, reply) {
    setPublicApiCorsHeaders(reply);
    reply.code(204);
    return null;
  });

  fastify.options(commentsPath, async function publicCommentsOptions(_request, reply) {
    setPublicApiCorsHeaders(reply);
    reply.code(204);
    return null;
  });

  fastify.get(publishedDocumentPath, async function publicPublishedDocumentRoute(request, reply) {
    setPublicApiCorsHeaders(reply);
    const moduleAvailability = ensureModuleEnabled(routeContext, reply);
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }
    try {
      const path = typeof request.query?.path === "string" ? request.query.path : "";
      return buildPublicApiPayload(await resolvePublishedDocument(routeContext, path));
    } catch (error) {
      reply.code(error?.statusCode ?? 500);
      return buildPublicApiPayload({
        ok: false,
        error: {
          code: error?.code ?? "PUBLIC_PUBLISHED_DOCUMENT_FAILED",
          message: error?.message ?? "Failed to resolve the published document."
        }
      });
    }
  });

  fastify.post(commentsPath, async function publicCommentsRoute(request, reply) {
    setPublicApiCorsHeaders(reply);
    const moduleAvailability = ensureModuleEnabled(routeContext, reply);
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }
    try {
      return await createComment(routeContext, request.body ?? {}, reply);
    } catch (error) {
      reply.code(error?.statusCode ?? 500);
      return buildPublicApiPayload({
        ok: false,
        error: {
          code: error?.code ?? "PUBLIC_COMMENT_CREATE_FAILED",
          message: error?.message ?? "Failed to create the public comment."
        }
      });
    }
  });
}
