import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  MODULE_ID,
  PAGES_COLLECTION_ID,
  REDIRECTS_COLLECTION_ID,
  hasUrlProtocol,
  normalizeHttpCode,
  normalizeOptionalText,
  normalizePagePath,
  normalizePageStatus,
  normalizeRedirectStatus,
  normalizeSourcePath,
  toTimestamp
} from "./distribution-shared-runtime.mjs";

function buildConflict(code, message, fieldId) {
  return {
    code,
    message,
    fieldId
  };
}

function mergeValidationResult(validation, conflicts) {
  if (!Array.isArray(conflicts) || conflicts.length === 0) {
    return validation;
  }

  return {
    ok: false,
    value: validation.value,
    errors: [...(validation.errors ?? []), ...conflicts]
  };
}

function pickInputValue(input, currentItem, fieldId, fallback = null) {
  return input?.[fieldId] ?? currentItem?.[fieldId] ?? fallback;
}

function buildPreparedPageValue(input = {}, currentItem = null) {
  const timestamp = toTimestamp();
  return {
    ...(currentItem ?? {}),
    ...input,
    sourceType: normalizeOptionalText(pickInputValue(input, currentItem, "sourceType")) ?? "blog-post",
    sourcePostId: normalizeOptionalText(pickInputValue(input, currentItem, "sourcePostId")),
    path: normalizePagePath(pickInputValue(input, currentItem, "path", "")),
    layoutKey: normalizeOptionalText(pickInputValue(input, currentItem, "layoutKey")) ?? "blog-post",
    status: normalizePageStatus(pickInputValue(input, currentItem, "status", "draft")),
    canonicalUrl: normalizeOptionalText(pickInputValue(input, currentItem, "canonicalUrl")),
    seoTitle: normalizeOptionalText(pickInputValue(input, currentItem, "seoTitle")),
    seoDescription: normalizeOptionalText(pickInputValue(input, currentItem, "seoDescription")),
    ogTitle: normalizeOptionalText(pickInputValue(input, currentItem, "ogTitle")),
    ogDescription: normalizeOptionalText(pickInputValue(input, currentItem, "ogDescription")),
    ogImageMediaId: normalizeOptionalText(pickInputValue(input, currentItem, "ogImageMediaId")),
    scheduledOn: normalizeOptionalText(pickInputValue(input, currentItem, "scheduledOn")),
    publishedOn: normalizeOptionalText(pickInputValue(input, currentItem, "publishedOn")),
    archivedOn: normalizeOptionalText(pickInputValue(input, currentItem, "archivedOn")),
    createdOn:
      currentItem?.createdOn ?? normalizeOptionalText(pickInputValue(input, currentItem, "createdOn")) ?? timestamp,
    updatedOn: timestamp
  };
}

function buildPreparedRedirectValue(input = {}, currentItem = null) {
  const timestamp = toTimestamp();
  return {
    ...(currentItem ?? {}),
    ...input,
    sourcePath: normalizeSourcePath(pickInputValue(input, currentItem, "sourcePath", "")),
    targetPostId: normalizeOptionalText(pickInputValue(input, currentItem, "targetPostId")),
    targetUrl: normalizeOptionalText(pickInputValue(input, currentItem, "targetUrl")),
    httpCode: normalizeHttpCode(pickInputValue(input, currentItem, "httpCode", "301")),
    status: normalizeRedirectStatus(pickInputValue(input, currentItem, "status", "active")),
    reason: normalizeOptionalText(pickInputValue(input, currentItem, "reason")),
    createdOn:
      currentItem?.createdOn ?? normalizeOptionalText(pickInputValue(input, currentItem, "createdOn")) ?? timestamp,
    updatedOn: timestamp
  };
}

async function listExistingRules(handler) {
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

async function listExistingPages(handler) {
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

function collectPageFieldConflicts(preparedValue) {
  const conflicts = [];
  if (preparedValue.sourceType !== "blog-post") {
    conflicts.push(
      buildConflict(
        "BLOG_PAGE_SOURCE_TYPE_INVALID",
        "Pages currently support only the blog-post source type in T01",
        "sourceType"
      )
    );
  }
  if (preparedValue.sourcePostId === null) {
    conflicts.push(
      buildConflict(
        "BLOG_PAGE_SOURCE_POST_REQUIRED",
        "Page must reference a source post",
        "sourcePostId"
      )
    );
  }
  if (preparedValue.path.length === 0) {
    conflicts.push(
      buildConflict("BLOG_PAGE_PATH_REQUIRED", "Page path is required", "path")
    );
  }
  if (hasUrlProtocol(preparedValue.path)) {
    conflicts.push(
      buildConflict(
        "BLOG_PAGE_PATH_INVALID",
        "Page path must be a relative path, not a full URL",
        "path"
      )
    );
  }
  return conflicts;
}

function collectPageUniquenessConflicts({ existingPages, currentItem, preparedValue }) {
  const conflicts = [];
  const hasSourceDuplicate = existingPages.some(
    (page) => page.id !== currentItem?.id && page.sourcePostId === preparedValue.sourcePostId
  );
  if (hasSourceDuplicate) {
    conflicts.push(
      buildConflict(
        "BLOG_PAGE_SOURCE_POST_CONFLICT",
        "Page source post must be unique",
        "sourcePostId"
      )
    );
  }

  const hasPathDuplicate = existingPages.some(
    (page) => page.id !== currentItem?.id && normalizePagePath(page.path) === preparedValue.path
  );
  if (hasPathDuplicate) {
    conflicts.push(
      buildConflict(
        "BLOG_PAGE_PATH_CONFLICT",
        `Page path '${preparedValue.path}' already exists`,
        "path"
      )
    );
  }

  return conflicts;
}

async function collectPageConflicts({ handler, preparedValue, currentItem = null }) {
  const existingPages = await listExistingPages(handler);
  return [
    ...collectPageFieldConflicts(preparedValue),
    ...collectPageUniquenessConflicts({
      existingPages,
      currentItem,
      preparedValue
    })
  ];
}

function collectTargetConflicts(preparedValue) {
  const conflicts = [];
  const hasTargetPost = normalizeOptionalText(preparedValue.targetPostId) !== null;
  const hasTargetUrl = normalizeOptionalText(preparedValue.targetUrl) !== null;

  if (preparedValue.sourcePath.length === 0) {
    conflicts.push(
      buildConflict("BLOG_REDIRECT_SOURCE_PATH_REQUIRED", "Source path is required", "sourcePath")
    );
  }
  if (hasUrlProtocol(preparedValue.sourcePath)) {
    conflicts.push(
      buildConflict(
        "BLOG_REDIRECT_SOURCE_PATH_INVALID",
        "Source path must be a relative path, not a full URL",
        "sourcePath"
      )
    );
  }
  if (!hasTargetPost && !hasTargetUrl) {
    conflicts.push(
      buildConflict(
        "BLOG_REDIRECT_TARGET_REQUIRED",
        "Redirect must target either a post or a URL",
        "targetPostId"
      )
    );
  }
  if (hasTargetPost && hasTargetUrl) {
    conflicts.push(
      buildConflict(
        "BLOG_REDIRECT_TARGET_CONFLICT",
        "Redirect cannot target both a post and a URL at the same time",
        "targetUrl"
      )
    );
  }

  return conflicts;
}

function collectSourcePathConflicts({ existingRules, currentItem, preparedValue }) {
  if (preparedValue.sourcePath.length === 0) {
    return [];
  }

  const hasDuplicate = existingRules.some(
    (rule) => rule.id !== currentItem?.id && normalizeSourcePath(rule.sourcePath) === preparedValue.sourcePath
  );
  if (!hasDuplicate) {
    return [];
  }

  return [
    buildConflict(
      "BLOG_REDIRECT_SOURCE_PATH_CONFLICT",
      `Redirect source path '${preparedValue.sourcePath}' already exists`,
      "sourcePath"
    )
  ];
}

async function collectRedirectConflicts({ handler, preparedValue, currentItem = null }) {
  const [existingRules] = await Promise.all([listExistingRules(handler)]);
  return [
    ...collectTargetConflicts(preparedValue),
    ...collectSourcePathConflicts({
      existingRules,
      currentItem,
      preparedValue
    })
  ];
}

function buildPreparedPageUpdateBody(body, preparedValue) {
  return {
    ...body,
    sourceType: preparedValue.sourceType,
    sourcePostId: preparedValue.sourcePostId,
    path: preparedValue.path,
    layoutKey: preparedValue.layoutKey,
    status: preparedValue.status,
    canonicalUrl: preparedValue.canonicalUrl,
    seoTitle: preparedValue.seoTitle,
    seoDescription: preparedValue.seoDescription,
    ogTitle: preparedValue.ogTitle,
    ogDescription: preparedValue.ogDescription,
    ogImageMediaId: preparedValue.ogImageMediaId,
    scheduledOn: preparedValue.scheduledOn,
    publishedOn: preparedValue.publishedOn,
    archivedOn: preparedValue.archivedOn,
    createdOn: preparedValue.createdOn,
    updatedOn: preparedValue.updatedOn
  };
}

function buildPreparedUpdateBody(body, preparedValue) {
  return {
    ...body,
    sourcePath: preparedValue.sourcePath,
    targetPostId: preparedValue.targetPostId,
    targetUrl: preparedValue.targetUrl,
    httpCode: preparedValue.httpCode,
    status: preparedValue.status,
    reason: preparedValue.reason,
    createdOn: preparedValue.createdOn,
    updatedOn: preparedValue.updatedOn
  };
}

async function validatePreparedUpdate({ handler, preparedBody, reply }) {
  const validation = await handler.validateInput(preparedBody, {
    partial: true
  });
  if (validation.ok) {
    return null;
  }

  return {
    ok: false,
    statusCode: 400,
    payload: badRequestWithConflicts(reply, validation.errors)
  };
}

async function validatePreparedPage({ handler, preparedValue, currentItem, reply }) {
  const conflicts = await collectPageConflicts({
    handler,
    preparedValue,
    currentItem
  });
  if (conflicts.length === 0) {
    return null;
  }

  return {
    ok: false,
    statusCode: 400,
    payload: badRequestWithConflicts(reply, conflicts, "BLOG_PAGE_VALIDATION_FAILED")
  };
}

async function validatePreparedRedirect({ handler, preparedValue, currentItem, reply }) {
  const conflicts = await collectRedirectConflicts({
    handler,
    preparedValue,
    currentItem
  });
  if (conflicts.length === 0) {
    return null;
  }

  return {
    ok: false,
    statusCode: 400,
    payload: badRequestWithConflicts(reply, conflicts, "BLOG_REDIRECT_VALIDATION_FAILED")
  };
}

function wrapPagesHandler(handler) {
  return {
    ...handler,
    validateInput: async (input, options = {}) => {
      if (options.partial === true) {
        return handler.validateInput(input, options);
      }

      const preparedValue = buildPreparedPageValue(input);
      const validation = await handler.validateInput(preparedValue, options);
      if (!validation.ok) {
        return validation;
      }

      const conflicts = await collectPageConflicts({
        handler,
        preparedValue
      });
      return mergeValidationResult(validation, conflicts);
    },
    create: async ({ value, reply }) => {
      const preparedValue = buildPreparedPageValue(value);
      const validation = await handler.validateInput(preparedValue);
      if (!validation.ok) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, validation.errors)
        };
      }

      const conflictFailure = await validatePreparedPage({
        handler,
        preparedValue,
        reply
      });
      if (conflictFailure) {
        return conflictFailure;
      }

      return handler.create({
        value: preparedValue,
        reply
      });
    },
    update: async ({ body, item, reply }) => {
      const preparedValue = buildPreparedPageValue(body, item);
      const preparedBody = buildPreparedPageUpdateBody(body, preparedValue);
      const validationFailure = await validatePreparedUpdate({
        handler,
        preparedBody,
        reply
      });
      if (validationFailure) {
        return validationFailure;
      }

      const conflictFailure = await validatePreparedPage({
        handler,
        preparedValue,
        currentItem: item,
        reply
      });
      if (conflictFailure) {
        return conflictFailure;
      }

      return handler.update({
        body: preparedBody,
        value: preparedValue,
        item,
        reply
      });
    }
  };
}

function wrapRedirectsHandler(handler) {
  return {
    ...handler,
    validateInput: async (input, options = {}) => {
      if (options.partial === true) {
        return handler.validateInput(input, options);
      }

      const preparedValue = buildPreparedRedirectValue(input);
      const validation = await handler.validateInput(preparedValue, options);
      if (!validation.ok) {
        return validation;
      }

      const conflicts = await collectRedirectConflicts({
        handler,
        preparedValue
      });
      return mergeValidationResult(validation, conflicts);
    },
    create: async ({ value, reply }) => {
      const preparedValue = buildPreparedRedirectValue(value);
      const validation = await handler.validateInput(preparedValue);
      if (!validation.ok) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, validation.errors)
        };
      }

      const conflictFailure = await validatePreparedRedirect({
        handler,
        preparedValue,
        reply
      });
      if (conflictFailure) {
        return conflictFailure;
      }

      return handler.create({
        value: preparedValue,
        reply
      });
    },
    update: async ({ body, item, reply }) => {
      const preparedValue = buildPreparedRedirectValue(body, item);
      const preparedBody = buildPreparedUpdateBody(body, preparedValue);
      const validationFailure = await validatePreparedUpdate({
        handler,
        preparedBody,
        reply
      });
      if (validationFailure) {
        return validationFailure;
      }

      const conflictFailure = await validatePreparedRedirect({
        handler,
        preparedValue,
        currentItem: item,
        reply
      });
      if (conflictFailure) {
        return conflictFailure;
      }

      return handler.update({
        body: preparedBody,
        value: preparedValue,
        item,
        reply
      });
    }
  };
}

export function createDistributionHandlerRegistry({ registry } = {}) {
  if (!registry || typeof registry !== "object" || typeof registry.register !== "function") {
    return registry;
  }

  const wrappedRegistry = Object.create(registry);
  wrappedRegistry.register = (entry = {}) => {
    const normalizedEntry = entry && typeof entry === "object" ? entry : {};
    return registry.register({
      ...normalizedEntry,
      handler:
        normalizedEntry.collectionId === PAGES_COLLECTION_ID
          ? wrapPagesHandler(normalizedEntry.handler)
          : normalizedEntry.collectionId === REDIRECTS_COLLECTION_ID
            ? wrapRedirectsHandler(normalizedEntry.handler)
            : normalizedEntry.handler
    });
  };
  return wrappedRegistry;
}

export { MODULE_ID };
