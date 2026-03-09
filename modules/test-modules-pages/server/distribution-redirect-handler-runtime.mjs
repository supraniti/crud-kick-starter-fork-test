import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import { hasUrlProtocol, normalizeSourcePath } from "./distribution-shared-runtime.mjs";
import {
  buildConflict,
  buildPreparedRedirectUpdateBody,
  buildPreparedRedirectValue,
  listExistingItems,
  mergeValidationResult,
  validatePrepared
} from "./distribution-handler-shared-runtime.mjs";

function collectRedirectConflictsBase(preparedValue) {
  const conflicts = [];
  const hasTargetPage = preparedValue.targetPageId !== null;
  const hasTargetUrl = preparedValue.targetUrl !== null;

  if (preparedValue.sourcePath.length === 0) {
    conflicts.push(
      buildConflict("PAGE_REDIRECT_SOURCE_PATH_REQUIRED", "Source path is required", "sourcePath")
    );
  }
  if (hasUrlProtocol(preparedValue.sourcePath)) {
    conflicts.push(
      buildConflict(
        "PAGE_REDIRECT_SOURCE_PATH_INVALID",
        "Source path must be a relative path, not a full URL",
        "sourcePath"
      )
    );
  }
  if (!hasTargetPage && !hasTargetUrl) {
    conflicts.push(
      buildConflict(
        "PAGE_REDIRECT_TARGET_REQUIRED",
        "Redirect must target either a page or a URL",
        "targetPageId"
      )
    );
  }
  if (hasTargetPage && hasTargetUrl) {
    conflicts.push(
      buildConflict(
        "PAGE_REDIRECT_TARGET_CONFLICT",
        "Redirect cannot target both a page and a URL at the same time",
        "targetUrl"
      )
    );
  }
  return conflicts;
}

function collectRedirectUniquenessConflicts({ existingRules, currentItem, preparedValue }) {
  const hasDuplicate = existingRules.some(
    (rule) => rule.id !== currentItem?.id && normalizeSourcePath(rule.sourcePath) === preparedValue.sourcePath
  );
  if (!hasDuplicate) {
    return [];
  }
  return [
    buildConflict(
      "PAGE_REDIRECT_SOURCE_PATH_CONFLICT",
      `Redirect source path '${preparedValue.sourcePath}' already exists`,
      "sourcePath"
    )
  ];
}

async function collectRedirectConflicts({ handler, preparedValue, currentItem = null }) {
  const existingRules = await listExistingItems(handler);
  return [
    ...collectRedirectConflictsBase(preparedValue),
    ...collectRedirectUniquenessConflicts({
      existingRules,
      currentItem,
      preparedValue
    })
  ];
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
    payload: badRequestWithConflicts(reply, conflicts, "PAGE_REDIRECT_VALIDATION_FAILED")
  };
}

export function wrapRedirectsHandler(handler) {
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
        value: buildPreparedRedirectUpdateBody(value, preparedValue),
        reply
      });
    },
    update: async ({ body, item, reply }) => {
      const preparedValue = buildPreparedRedirectValue(body, item);
      const preparedBody = buildPreparedRedirectUpdateBody(body, preparedValue);

      const validationFailure = await validatePrepared({
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
