import {
  collectGoogleJsonPages,
  requestGoogleJson
} from "../../test-modules-remote-ops/server/remote-ops-live-google-runtime.mjs";
import { getServiceAccountAccessToken } from "../../test-modules-remote-ops/server/remote-ops-service-account-auth-runtime.mjs";
import { COMMENTS_COLLECTION_ID } from "../../test-modules-engagement/server/engagement-shared-runtime.mjs";
import { resolvePageByPath } from "./page-delivery-runtime.mjs";
import { normalizeOptionalText, normalizePagePath } from "./distribution-shared-runtime.mjs";
import { resolvePublishedFirestoreDescriptor } from "./page-firestore-publication-runtime.mjs";
import {
  buildPublicApplicationViewPayload,
  buildReaderDeferredPayload,
  buildReaderPageBootstrapPayload
} from "./page-application-view-runtime.mjs";
import { readPagesModuleSettings } from "./page-settings-runtime.mjs";
import { normalizeTargetConfig } from "../../test-modules-remote-ops/server/remote-ops-shared-runtime.mjs";

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

function splitCollectionPath(collectionPath) {
  const normalized = normalizeOptionalText(collectionPath);
  if (!normalized) {
    throw buildPublicApiError(
      "PUBLIC_COMMENT_COLLECTION_PATH_REQUIRED",
      "The public comments collection path is not configured.",
      409
    );
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0 || segments.length % 2 === 0) {
    throw buildPublicApiError(
      "PUBLIC_COMMENT_COLLECTION_PATH_INVALID",
      "The public comments collection path must point to a collection.",
      409
    );
  }
  return {
    normalizedPath: segments.join("/"),
    collectionId: segments.at(-1),
    parentSegments: segments.slice(0, -1)
  };
}

function buildListCollectionUrl(projectId, collectionPath, pageToken = null) {
  const path = splitCollectionPath(collectionPath);
  const parentSegments = path.parentSegments.length > 0 ? `/${path.parentSegments.join("/")}` : "";
  const baseUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents${parentSegments}/${encodeURIComponent(path.collectionId)}?pageSize=200`;
  return pageToken ? `${baseUrl}&pageToken=${encodeURIComponent(pageToken)}` : baseUrl;
}

function normalizeImportedCommentTimestamp(value) {
  const normalized = normalizeOptionalText(value);
  return normalized ?? new Date().toISOString();
}

function normalizeImportedCommentText(value, fallback = "") {
  return normalizeOptionalText(value) ?? fallback;
}

function normalizeImportedCommentEmail(value) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toLowerCase() : "";
}

function buildImportedCommentSignature(comment = {}, parentCommentId = null) {
  return [
    normalizeOptionalText(comment.postId) ?? "",
    normalizeOptionalText(parentCommentId ?? comment.parentCommentId) ?? "",
    normalizeImportedCommentText(comment.authorDisplayName),
    normalizeImportedCommentEmail(comment.authorEmail),
    normalizeImportedCommentText(comment.body),
    normalizeImportedCommentTimestamp(comment.createdOn ?? comment.createdAt)
  ].join("::");
}

function buildImportedCommentInput(remoteComment = {}, parentCommentId = null) {
  return {
    postId: normalizeOptionalText(remoteComment.postId),
    parentCommentId: normalizeOptionalText(parentCommentId),
    authorDisplayName: normalizeImportedCommentText(remoteComment.authorDisplayName, "Remote Reader"),
    authorEmail: normalizeOptionalText(remoteComment.authorEmail),
    body: normalizeImportedCommentText(remoteComment.body),
    createdOn: normalizeImportedCommentTimestamp(remoteComment.createdAt ?? remoteComment.createdOn)
  };
}

async function resolvePublicCommentsBinding(routeContext) {
  const settings = await readPagesModuleSettings({
    resolveSettingsRepository: routeContext.resolveSettingsRepository,
    settingsDefinition: routeContext.manifest?.settings ?? null,
    collectionHandlerRegistry: routeContext.collectionHandlerRegistry
  });
  const configuredBrowserTargetId = normalizeOptionalText(settings?.remoteBrowserDeliveryTargetProfileId);
  const configuredBrowserTarget = configuredBrowserTargetId
    ? await routeContext.remoteTargetsHandler?.findById?.(configuredBrowserTargetId)
    : null;
  const targetListPayload = configuredBrowserTarget
    ? null
    : await routeContext.remoteTargetsHandler?.list?.({
        limit: 500,
        offset: 0
      });
  const fallbackBrowserTarget = Array.isArray(targetListPayload?.items)
    ? targetListPayload.items.find((target) => target?.productBindingKey === "browser-delivery")
    : null;
  const browserTarget = configuredBrowserTarget ?? fallbackBrowserTarget;
  if (!browserTarget || browserTarget.targetKind !== "browser-delivery") {
    throw buildPublicApiError(
      "PUBLIC_COMMENT_BROWSER_TARGET_NOT_FOUND",
      "A browser-delivery target is required before public comments can be imported locally.",
      409
    );
  }

  const connectionProfile = await routeContext.remoteConnectionsHandler?.findById?.(
    browserTarget.connectionProfileId
  );
  if (!connectionProfile) {
    throw buildPublicApiError(
      "PUBLIC_COMMENT_CONNECTION_NOT_FOUND",
      "The connection profile for the browser-delivery target could not be found.",
      409
    );
  }

  const browserConfig = normalizeTargetConfig(browserTarget.config, browserTarget.targetKind);
  const projectId =
    normalizeOptionalText(browserConfig.firebaseProjectId) ??
    normalizeOptionalText(connectionProfile.projectId);
  const collectionPath =
    normalizeOptionalText(browserConfig.publicCommentsCollectionPath) ?? "publicComments";
  if (!projectId) {
    throw buildPublicApiError(
      "PUBLIC_COMMENT_PROJECT_REQUIRED",
      "The browser-delivery target must resolve a GCP project id before public comments can be imported.",
      409
    );
  }

  return {
    browserTargetId: browserTarget.id ?? null,
    projectId,
    collectionPath,
    connectionProfile
  };
}

async function collectRemotePublicComments(binding) {
  const { accessToken } = await getServiceAccountAccessToken(binding.connectionProfile);
  const documents = await collectGoogleJsonPages({
    accessToken,
    buildUrl(pageToken) {
      return buildListCollectionUrl(binding.projectId, binding.collectionPath, pageToken);
    },
    extractItems(payload) {
      return Array.isArray(payload?.documents) ? payload.documents : [];
    }
  });

  return documents
    .map((document) => ({
      id: normalizeOptionalText(String(document?.name ?? "").split("/").at(-1)),
      ...decodeFirestoreDocument(document)
    }))
    .filter((document) => document.id);
}

async function listLocalComments(commentsHandler) {
  const payload = await commentsHandler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

function parseCommentStatusFilter(rawValue = null) {
  const statuses = String(rawValue ?? "approved")
    .split(",")
    .map((entry) => normalizeOptionalText(entry))
    .filter(Boolean);
  return statuses.length > 0 ? statuses : ["approved"];
}

async function resolveCommentsPostId(routeContext, query = {}) {
  const explicitPostId = normalizeOptionalText(query.postId);
  if (explicitPostId) {
    return explicitPostId;
  }
  const pagePath = normalizeOptionalText(query.path);
  if (!pagePath) {
    throw buildPublicApiError(
      "PUBLIC_COMMENT_POST_REQUIRED",
      "postId or path query parameter is required.",
      400
    );
  }
  const payload = await resolvePublishedPagePayload(routeContext, pagePath);
  const primaryRecord = readPrimaryRecord(payload);
  const primarySourceType = normalizeOptionalText(payload?.page?.primarySourceType);
  if (primarySourceType !== "blog-post" || !primaryRecord?.id) {
    throw buildPublicApiError(
      "PUBLIC_COMMENT_POST_NOT_RESOLVED",
      "The requested page does not resolve to a published post.",
      409
    );
  }
  return primaryRecord.id;
}

async function listPublicComments(routeContext, query = {}) {
  const commentsHandler = routeContext.collectionHandlerRegistry.get(COMMENTS_COLLECTION_ID);
  if (!commentsHandler) {
    throw buildPublicApiError(
      "PUBLIC_COMMENT_HANDLER_UNAVAILABLE",
      "The comments handler is not registered.",
      500
    );
  }

  const [postId, localComments] = await Promise.all([
    resolveCommentsPostId(routeContext, query),
    listLocalComments(commentsHandler)
  ]);
  const allowedStatuses = parseCommentStatusFilter(query.status);
  const matchingComments = localComments
    .filter((comment) => comment?.postId === postId)
    .filter((comment) => allowedStatuses.includes(normalizeOptionalText(comment?.status) ?? ""))
    .sort((left, right) =>
      normalizeImportedCommentTimestamp(left?.createdOn ?? left?.createdAt).localeCompare(
        normalizeImportedCommentTimestamp(right?.createdOn ?? right?.createdAt)
      )
    );

  const items = await Promise.all(
    matchingComments.map(async (comment) =>
      typeof commentsHandler.resolveRow === "function" ? commentsHandler.resolveRow(comment) : comment
    )
  );

  return {
    ok: true,
    postId,
    statuses: allowedStatuses,
    items
  };
}

async function importPublicCommentsIntoLocal(routeContext, reply) {
  const commentsHandler = routeContext.collectionHandlerRegistry.get(COMMENTS_COLLECTION_ID);
  if (!commentsHandler) {
    throw buildPublicApiError(
      "PUBLIC_COMMENT_HANDLER_UNAVAILABLE",
      "The local comments handler is not registered.",
      500
    );
  }

  const binding = await resolvePublicCommentsBinding(routeContext);
  const [remoteComments, localComments] = await Promise.all([
    collectRemotePublicComments(binding),
    listLocalComments(commentsHandler)
  ]);

  const localCommentsBySignature = new Map();
  for (const localComment of localComments) {
    localCommentsBySignature.set(buildImportedCommentSignature(localComment), localComment);
  }

  const remoteIds = new Set(remoteComments.map((item) => item.id));
  const remoteToLocalId = new Map();
  const failures = [];
  let importedCount = 0;
  let skippedCount = 0;

  let pending = [...remoteComments].sort((left, right) =>
    normalizeImportedCommentTimestamp(left.createdAt ?? left.createdOn).localeCompare(
      normalizeImportedCommentTimestamp(right.createdAt ?? right.createdOn)
    )
  );

  while (pending.length > 0) {
    const deferred = [];
    let progressed = false;

    for (const remoteComment of pending) {
      const parentRemoteId = normalizeOptionalText(remoteComment.parentCommentId);
      const parentLocalId = parentRemoteId ? remoteToLocalId.get(parentRemoteId) ?? null : null;
      if (parentRemoteId && remoteIds.has(parentRemoteId) && !parentLocalId) {
        deferred.push(remoteComment);
        continue;
      }

      const createInput = buildImportedCommentInput(remoteComment, parentLocalId);
      if (!createInput.postId || !createInput.body) {
        failures.push({
          remoteId: remoteComment.id,
          message: "Remote public comment is missing required post or body fields."
        });
        progressed = true;
        continue;
      }

      const signature = buildImportedCommentSignature(createInput, parentLocalId);
      const existingLocalComment = localCommentsBySignature.get(signature);
      if (existingLocalComment?.id) {
        remoteToLocalId.set(remoteComment.id, existingLocalComment.id);
        skippedCount += 1;
        progressed = true;
        continue;
      }

      const validation = await commentsHandler.validateInput(createInput);
      if (!validation?.ok) {
        failures.push({
          remoteId: remoteComment.id,
          message: validation?.errors?.[0]?.message ?? "Remote public comment failed local validation."
        });
        progressed = true;
        continue;
      }

      const createResult = await commentsHandler.create({
        value: validation.value,
        reply
      });
      if (!createResult?.ok) {
        failures.push({
          remoteId: remoteComment.id,
          message: createResult?.payload?.error?.message ?? "Failed to import remote public comment."
        });
        progressed = true;
        continue;
      }

      if (typeof commentsHandler.afterMutation === "function") {
        await commentsHandler.afterMutation({
          action: "create",
          collectionId: COMMENTS_COLLECTION_ID,
          itemId: createResult.item?.id ?? null
        });
      }

      const localComment =
        createResult.item ??
        (createResult.item?.id ? await commentsHandler.findById(createResult.item.id) : null);
      if (localComment?.id) {
        localCommentsBySignature.set(signature, localComment);
        remoteToLocalId.set(remoteComment.id, localComment.id);
      }
      importedCount += 1;
      progressed = true;
    }

    if (!progressed) {
      for (const remoteComment of deferred) {
        failures.push({
          remoteId: remoteComment.id,
          message: "Remote public comment depends on a missing parent comment."
        });
      }
      break;
    }

    pending = deferred;
  }

  return {
    ok: true,
    projectId: binding.projectId,
    collectionPath: binding.collectionPath,
    browserTargetId: binding.browserTargetId,
    remoteCount: remoteComments.length,
    importedCount,
    skippedCount,
    failedCount: failures.length,
    failures: failures.slice(0, 8)
  };
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

async function resolvePublicApplicationView(routeContext, pagePath) {
  const payload = await resolvePublishedPagePayload(routeContext, pagePath);
  return buildPublicApplicationViewPayload(payload, {
    collectionHandlerRegistry: routeContext.collectionHandlerRegistry
  });
}

async function resolvePublicReaderBootstrap(routeContext, pagePath) {
  const payload = await resolvePublishedPagePayload(routeContext, pagePath);
  const document = await buildReaderPageBootstrapPayload(payload, {
    collectionHandlerRegistry: routeContext.collectionHandlerRegistry
  });
  return {
    ok: true,
    pagePath: normalizePagePath(pagePath),
    items: document ? [document] : [],
    total: document ? 1 : 0
  };
}

async function resolvePublicReaderDeferred(routeContext, pagePath) {
  const payload = await resolvePublishedPagePayload(routeContext, pagePath);
  const document = await buildReaderDeferredPayload(payload, {
    collectionHandlerRegistry: routeContext.collectionHandlerRegistry
  });
  return {
    ok: true,
    pagePath: normalizePagePath(pagePath),
    items: document ? [document] : [],
    total: document ? 1 : 0
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
  const publicApplicationViewPath = `/api/reference/modules/${routeContext.moduleId}/public/application-view`;
  const publicReaderBootstrapPath = `/api/reference/modules/${routeContext.moduleId}/public/reader/bootstrap`;
  const publicReaderDeferredPath = `/api/reference/modules/${routeContext.moduleId}/public/reader/deferred`;
  const publishedDocumentPath = `/api/reference/modules/${routeContext.moduleId}/public/published-document`;
  const commentsPath = `/api/reference/modules/${routeContext.moduleId}/public/comments`;
  const importCommentsPath = `/api/reference/modules/${routeContext.moduleId}/public/comments/import-local`;

  fastify.options(publicApplicationViewPath, async function publicApplicationViewOptions(_request, reply) {
    setPublicApiCorsHeaders(reply);
    reply.code(204);
    return null;
  });

  fastify.options(publicReaderBootstrapPath, async function publicReaderBootstrapOptions(_request, reply) {
    setPublicApiCorsHeaders(reply);
    reply.code(204);
    return null;
  });

  fastify.options(publicReaderDeferredPath, async function publicReaderDeferredOptions(_request, reply) {
    setPublicApiCorsHeaders(reply);
    reply.code(204);
    return null;
  });

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

  fastify.options(importCommentsPath, async function publicCommentsImportOptions(_request, reply) {
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

  fastify.get(publicApplicationViewPath, async function publicApplicationViewRoute(request, reply) {
    setPublicApiCorsHeaders(reply);
    const moduleAvailability = ensureModuleEnabled(routeContext, reply);
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }
    try {
      const path = typeof request.query?.path === "string" ? request.query.path : "";
      return buildPublicApiPayload(await resolvePublicApplicationView(routeContext, path));
    } catch (error) {
      reply.code(error?.statusCode ?? 500);
      return buildPublicApiPayload({
        ok: false,
        error: {
          code: error?.code ?? "PUBLIC_APPLICATION_VIEW_FAILED",
          message: error?.message ?? "Failed to resolve the public application view."
        }
      });
    }
  });

  fastify.get(publicReaderBootstrapPath, async function publicReaderBootstrapRoute(request, reply) {
    setPublicApiCorsHeaders(reply);
    const moduleAvailability = ensureModuleEnabled(routeContext, reply);
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }
    try {
      const path = typeof request.query?.path === "string" ? request.query.path : "";
      return buildPublicApiPayload(await resolvePublicReaderBootstrap(routeContext, path));
    } catch (error) {
      reply.code(error?.statusCode ?? 500);
      return buildPublicApiPayload({
        ok: false,
        error: {
          code: error?.code ?? "PUBLIC_READER_BOOTSTRAP_FAILED",
          message: error?.message ?? "Failed to resolve the public reader bootstrap."
        }
      });
    }
  });

  fastify.get(publicReaderDeferredPath, async function publicReaderDeferredRoute(request, reply) {
    setPublicApiCorsHeaders(reply);
    const moduleAvailability = ensureModuleEnabled(routeContext, reply);
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }
    try {
      const path = typeof request.query?.path === "string" ? request.query.path : "";
      return buildPublicApiPayload(await resolvePublicReaderDeferred(routeContext, path));
    } catch (error) {
      reply.code(error?.statusCode ?? 500);
      return buildPublicApiPayload({
        ok: false,
        error: {
          code: error?.code ?? "PUBLIC_READER_DEFERRED_FAILED",
          message: error?.message ?? "Failed to resolve the public reader deferred document."
        }
      });
    }
  });

  fastify.get(commentsPath, async function publicCommentsListRoute(request, reply) {
    setPublicApiCorsHeaders(reply);
    const moduleAvailability = ensureModuleEnabled(routeContext, reply);
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }
    try {
      return buildPublicApiPayload(await listPublicComments(routeContext, request.query ?? {}));
    } catch (error) {
      reply.code(error?.statusCode ?? 500);
      return buildPublicApiPayload({
        ok: false,
        error: {
          code: error?.code ?? "PUBLIC_COMMENT_LIST_FAILED",
          message: error?.message ?? "Failed to list public comments."
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

  fastify.post(importCommentsPath, async function publicCommentsImportRoute(_request, reply) {
    setPublicApiCorsHeaders(reply);
    const moduleAvailability = ensureModuleEnabled(routeContext, reply);
    if (moduleAvailability !== true) {
      return moduleAvailability;
    }
    try {
      return buildPublicApiPayload(await importPublicCommentsIntoLocal(routeContext, reply));
    } catch (error) {
      reply.code(error?.statusCode ?? 500);
      return buildPublicApiPayload({
        ok: false,
        error: {
          code: error?.code ?? "PUBLIC_COMMENT_IMPORT_FAILED",
          message: error?.message ?? "Failed to import public comments into the local queue."
        }
      });
    }
  });
}
