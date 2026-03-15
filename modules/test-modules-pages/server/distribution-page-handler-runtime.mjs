import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  LAYOUTS_COLLECTION_ID,
  DEPLOYMENT_MODE_SET,
  PAGE_KIND_SET,
  PAGE_STATUS_SET,
  PRIMARY_SOURCE_TYPE_SET,
  SOURCE_SELECTION_MODE_SET,
  cloneJsonValue,
  hasUnsafePathSegments,
  hasUrlProtocol,
  isPerRecordDeploymentMode,
  normalizePagePath
} from "./distribution-shared-runtime.mjs";
import {
  buildConflict,
  buildPreparedPageUpdateBody,
  buildPreparedPageValue,
  listExistingItems,
  mergeValidationResult,
  validatePrepared
} from "./distribution-handler-shared-runtime.mjs";
import {
  mergeLivePageDeploymentState,
  removeDeletedPageDeploymentArtifact,
  syncPageDeploymentArtifact
} from "./page-deployment-runtime.mjs";

const PAGE_OPTIONAL_TEXT_FIELD_IDS = Object.freeze([
  "pathPattern",
  "canonicalUrl",
  "seoTitle",
  "seoDescription",
  "ogTitle",
  "ogDescription",
  "scheduledOn",
  "publishedOn",
  "archivedOn",
  "deploymentArtifactPath",
  "deploymentSyncedOn",
  "deploymentLastRunOn"
]);

function normalizeOptionalPageText(value) {
  return typeof value === "string" && value.trim().length === 0 ? null : value;
}

function normalizeExposedPageItem(item) {
  if (!item || typeof item !== "object") {
    return item;
  }

  const normalizedItem = {
    ...item
  };
  for (const fieldId of PAGE_OPTIONAL_TEXT_FIELD_IDS) {
    normalizedItem[fieldId] = normalizeOptionalPageText(item[fieldId]);
  }
  return normalizedItem;
}

async function normalizeExposedPageItemWithDeploymentState(item, context = {}) {
  const normalizedItem = normalizeExposedPageItem(item);
  return mergeLivePageDeploymentState({
    page: normalizedItem,
    collectionHandlerRegistry: context.registry,
    resolveSettingsRepository: context.resolveSettingsRepository,
    settingsDefinition: context.manifest?.settings ?? null
  });
}

function collectPrimarySourceConflicts(preparedValue) {
  const conflicts = [];
  const primarySource = preparedValue.primarySource;
  const isPerRecordMode = isPerRecordDeploymentMode(preparedValue.deploymentMode);

  if (preparedValue.primarySourceType === "none" && primarySource !== null) {
    conflicts.push(
      buildConflict(
        "PAGE_PRIMARY_SOURCE_CONFLICT",
        "Primary source details must be empty when source type is none",
        "primarySource"
      )
    );
  }

  if (preparedValue.primarySourceType !== "none" && primarySource === null) {
    conflicts.push(
      buildConflict(
        "PAGE_PRIMARY_SOURCE_REQUIRED",
        "Primary source is required when a source type is selected",
        "primarySource"
      )
    );
    return conflicts;
  }

  if (primarySource === null) {
    return conflicts;
  }

  if (!PRIMARY_SOURCE_TYPE_SET.has(primarySource.sourceType)) {
    conflicts.push(
      buildConflict(
        "PAGE_PRIMARY_SOURCE_TYPE_INVALID",
        `Primary source type '${primarySource.sourceType}' is not allowed`,
        "primarySource"
      )
    );
  }

  if (primarySource.sourceType !== preparedValue.primarySourceType) {
    conflicts.push(
      buildConflict(
        "PAGE_PRIMARY_SOURCE_TYPE_MISMATCH",
        "Primary source type must match the filterable primarySourceType field",
        "primarySourceType"
      )
    );
  }

  if (preparedValue.sourceSelectionMode === "specific-record" && primarySource.itemId === null) {
    conflicts.push(
      buildConflict(
        "PAGE_PRIMARY_SOURCE_ITEM_REQUIRED",
        "Primary source item is required when a source type is selected",
        "primarySource"
      )
    );
  }

  if (isPerRecordMode && primarySource.itemId !== null) {
    conflicts.push(
      buildConflict(
        "PAGE_PRIMARY_SOURCE_ITEM_FORBIDDEN",
        "Per-record templates cannot store a specific primary source item",
        "primarySource"
      )
    );
  }

  return conflicts;
}

function collectDataSourceConflicts(preparedValue) {
  const conflicts = [];
  const bindAsSet = new Set();
  const keySet = new Set();

  for (const descriptor of preparedValue.dataSources) {
    if (keySet.has(descriptor.key)) {
      conflicts.push(
        buildConflict(
          "PAGE_DATA_SOURCE_KEY_CONFLICT",
          `Data source key '${descriptor.key}' must be unique`,
          "dataSources"
        )
      );
    }
    keySet.add(descriptor.key);

    if (bindAsSet.has(descriptor.bindAs)) {
      conflicts.push(
        buildConflict(
          "PAGE_DATA_SOURCE_BINDING_CONFLICT",
          `Data source binding '${descriptor.bindAs}' must be unique`,
          "dataSources"
        )
      );
    }
    bindAsSet.add(descriptor.bindAs);

    if (descriptor.itemId === null) {
      conflicts.push(
        buildConflict(
          "PAGE_DATA_SOURCE_ITEM_REQUIRED",
          `Data source '${descriptor.key}' requires an itemId`,
          "dataSources"
        )
      );
    }

    if (descriptor.kind === "posts-by-author" && descriptor.sourceType !== "blog-author") {
      conflicts.push(
        buildConflict(
          "PAGE_DATA_SOURCE_SOURCE_TYPE_INVALID",
          `Data source '${descriptor.key}' must use blog-author for posts-by-author`,
          "dataSources"
        )
      );
    }
    if (descriptor.kind === "posts-by-category" && descriptor.sourceType !== "blog-category") {
      conflicts.push(
        buildConflict(
          "PAGE_DATA_SOURCE_SOURCE_TYPE_INVALID",
          `Data source '${descriptor.key}' must use blog-category for posts-by-category`,
          "dataSources"
        )
      );
    }
    if (descriptor.kind === "posts-by-tag" && descriptor.sourceType !== "blog-tag") {
      conflicts.push(
        buildConflict(
          "PAGE_DATA_SOURCE_SOURCE_TYPE_INVALID",
          `Data source '${descriptor.key}' must use blog-tag for posts-by-tag`,
          "dataSources"
        )
      );
    }
  }

  return conflicts;
}

function collectPageIdentityConflicts(preparedValue, isPerRecordMode) {
  const conflicts = [];
  if (preparedValue.title === null) {
    conflicts.push(buildConflict("PAGE_TITLE_REQUIRED", "Page title is required", "title"));
  }
  if (!DEPLOYMENT_MODE_SET.has(preparedValue.deploymentMode)) {
    conflicts.push(
      buildConflict("PAGE_DEPLOYMENT_MODE_INVALID", "Deployment mode is invalid", "deploymentMode")
    );
  }
  if (!SOURCE_SELECTION_MODE_SET.has(preparedValue.sourceSelectionMode)) {
    conflicts.push(
      buildConflict(
        "PAGE_SOURCE_SELECTION_MODE_INVALID",
        "Source selection mode is invalid",
        "sourceSelectionMode"
      )
    );
  }
  if (!isPerRecordMode && preparedValue.path.length === 0) {
    conflicts.push(buildConflict("PAGE_PATH_REQUIRED", "Page path is required", "path"));
  }
  if (preparedValue.path.length > 0 && hasUrlProtocol(preparedValue.path)) {
    conflicts.push(
      buildConflict(
        "PAGE_PATH_INVALID",
        "Page path must be a relative path, not a full URL",
        "path"
      )
    );
  }
  if (preparedValue.path.length > 0 && hasUnsafePathSegments(preparedValue.path)) {
    conflicts.push(
      buildConflict(
        "PAGE_PATH_UNSAFE",
        "Page path cannot contain '.' or '..' path segments",
        "path"
      )
    );
  }
  if (!PAGE_KIND_SET.has(preparedValue.pageKind)) {
    conflicts.push(buildConflict("PAGE_KIND_INVALID", "Page kind is invalid", "pageKind"));
  }
  if (!PAGE_STATUS_SET.has(preparedValue.status)) {
    conflicts.push(buildConflict("PAGE_STATUS_INVALID", "Page status is invalid", "status"));
  }
  if (preparedValue.status === "scheduled" && preparedValue.scheduledOn === null) {
    conflicts.push(
      buildConflict(
        "PAGE_SCHEDULED_ON_REQUIRED",
        "Scheduled pages require a scheduledOn timestamp",
        "scheduledOn"
      )
    );
  }
  if (preparedValue.runtimeScriptUrls.length > 20) {
    conflicts.push(
      buildConflict(
        "PAGE_RUNTIME_SCRIPT_LIMIT_EXCEEDED",
        "Pages may define at most 20 runtime script URLs",
        "runtimeScriptUrls"
      )
    );
  }
  return conflicts;
}

function collectSourceSelectionConflicts(preparedValue, isPerRecordMode) {
  const conflicts = [];

  if (
    preparedValue.primarySourceType === "none" &&
    preparedValue.sourceSelectionMode !== "none"
  ) {
    conflicts.push(
      buildConflict(
        "PAGE_SOURCE_SELECTION_MODE_CONFLICT",
        "Source selection mode must be none when no primary source type is configured",
        "sourceSelectionMode"
      )
    );
  }

  if (
    preparedValue.primarySourceType !== "none" &&
    !isPerRecordMode &&
    preparedValue.sourceSelectionMode === "none"
  ) {
    conflicts.push(
      buildConflict(
        "PAGE_SOURCE_SELECTION_MODE_REQUIRED",
        "Pages with a primary source type must choose how the source is selected",
        "sourceSelectionMode"
      )
    );
  }

  return conflicts;
}

function supportsPerRecordPrimarySourceType(primarySourceType) {
  return primarySourceType === "blog-post" || primarySourceType === "blog-category";
}

function collectPerRecordTemplateConflicts(preparedValue, isPerRecordMode) {
  if (!isPerRecordMode) {
    return [];
  }

  const conflicts = [];
  if (!supportsPerRecordPrimarySourceType(preparedValue.primarySourceType)) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_SOURCE_TYPE_UNSUPPORTED",
        "Per-record templates currently support blog-post and blog-category sources",
        "primarySourceType"
      )
    );
  }
  if (preparedValue.sourceSelectionMode !== "all-records") {
    conflicts.push(
      buildConflict(
        "PAGE_SOURCE_SELECTION_MODE_CONFLICT",
        "Per-record templates must select all records from the source type",
        "sourceSelectionMode"
      )
    );
  }
  if (!preparedValue.pathPattern) {
    conflicts.push(
      buildConflict(
        "PAGE_PATH_PATTERN_REQUIRED",
        "Per-record templates require a path pattern",
        "pathPattern"
      )
    );
    return conflicts;
  }

  if (hasUrlProtocol(preparedValue.pathPattern)) {
    conflicts.push(
      buildConflict(
        "PAGE_PATH_PATTERN_INVALID",
        "Path pattern must be a relative path, not a full URL",
        "pathPattern"
      )
    );
  }
  if (hasUnsafePathSegments(preparedValue.pathPattern)) {
    conflicts.push(
      buildConflict(
        "PAGE_PATH_PATTERN_UNSAFE",
        "Path pattern cannot contain '.' or '..' path segments",
        "pathPattern"
      )
    );
  }

  return conflicts;
}

function collectRequiredSourceConflicts(preparedValue) {
  if (
    preparedValue.pageKind !== "standalone" &&
    preparedValue.primarySourceType === "none" &&
    preparedValue.dataSources.length === 0
  ) {
    return [
      buildConflict(
        "PAGE_SOURCE_REQUIRED",
        "Non-standalone pages must define a primary source or at least one data source",
        "primarySourceType"
      )
    ];
  }

  return [];
}

function collectPageFieldConflicts(preparedValue) {
  const isPerRecordMode = isPerRecordDeploymentMode(preparedValue.deploymentMode);
  return [
    ...collectPageIdentityConflicts(preparedValue, isPerRecordMode),
    ...collectPrimarySourceConflicts(preparedValue),
    ...collectDataSourceConflicts(preparedValue),
    ...collectSourceSelectionConflicts(preparedValue, isPerRecordMode),
    ...collectPerRecordTemplateConflicts(preparedValue, isPerRecordMode),
    ...collectRequiredSourceConflicts(preparedValue)
  ];
}

function collectPageUniquenessConflicts({ existingPages, currentItem, preparedValue }) {
  if (isPerRecordDeploymentMode(preparedValue.deploymentMode) || preparedValue.path.length === 0) {
    return [];
  }

  const hasPathDuplicate = existingPages.some(
    (page) => page.id !== currentItem?.id && normalizePagePath(page.path) === preparedValue.path
  );
  if (!hasPathDuplicate) {
    return [];
  }

  return [
    buildConflict(
      "PAGE_PATH_CONFLICT",
      `Page path '${preparedValue.path}' already exists`,
      "path"
    )
  ];
}

async function collectPageConflicts({ handler, preparedValue, currentItem = null }) {
  const layoutConflicts = [];
  if (preparedValue.layoutId) {
    const layoutsHandler = handler?.context?.registry?.get?.(LAYOUTS_COLLECTION_ID);
    const layout = layoutsHandler && typeof layoutsHandler.findById === "function"
      ? await layoutsHandler.findById(preparedValue.layoutId)
      : null;
    if (!layout) {
      layoutConflicts.push(
        buildConflict(
          "PAGE_LAYOUT_NOT_FOUND",
          `Layout '${preparedValue.layoutId}' was not found`,
          "layoutId"
        )
      );
    }
  }

  const existingPages = await listExistingItems(handler);
  return [
    ...collectPageFieldConflicts(preparedValue),
    ...layoutConflicts,
    ...collectPageUniquenessConflicts({
      existingPages,
      currentItem,
      preparedValue
    })
  ];
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
    payload: badRequestWithConflicts(reply, conflicts, "PAGE_VALIDATION_FAILED")
  };
}

function createPageDeploymentCoordinator(handler, context = {}) {
  const previousPagesByItemId = new Map();
  const removedPagesByItemId = new Map();
  const settingsDefinition = context.manifest?.settings ?? null;

  async function runBaseAfterMutation(input) {
    if (typeof handler.afterMutation === "function") {
      await handler.afterMutation(input);
    }
  }

  return {
    captureUpdatedItem(item) {
      if (item?.id) {
        previousPagesByItemId.set(item.id, cloneJsonValue(item));
      }
    },
    clearUpdatedItem(itemId) {
      if (itemId) {
        previousPagesByItemId.delete(itemId);
      }
    },
    captureRemovedItem(item) {
      if (item?.id) {
        removedPagesByItemId.set(item.id, cloneJsonValue(item));
      }
    },
    clearRemovedItem(itemId) {
      if (itemId) {
        removedPagesByItemId.delete(itemId);
      }
    },
    async runAfterMutation(input = {}) {
      await runBaseAfterMutation(input);
      if (input.action === "delete") {
        const removedPage = removedPagesByItemId.get(input.itemId) ?? null;
        removedPagesByItemId.delete(input.itemId);
        if (removedPage) {
          await removeDeletedPageDeploymentArtifact(removedPage, context.registry);
        }
        return;
      }

      const page = input.itemId ? await handler.findById(input.itemId) : null;
      const previousPage = previousPagesByItemId.get(input.itemId) ?? null;
      previousPagesByItemId.delete(input.itemId);
      await syncPageDeploymentArtifact({
        handler,
        page,
        previousPage,
        collectionHandlerRegistry: context.registry,
        resolveSettingsRepository: context.resolveSettingsRepository,
        settingsDefinition
      });
    }
  };
}

export function wrapPagesHandler(handler, context = {}) {
  const deploymentCoordinator = createPageDeploymentCoordinator(handler, context);
  const contextualHandler = {
    ...handler,
    context
  };

  return {
    ...handler,
    list: async (query = {}) => {
      const payload = await handler.list(query);
      return {
        ...payload,
        items: Array.isArray(payload?.items)
          ? await Promise.all(
              payload.items.map((item) =>
                normalizeExposedPageItemWithDeploymentState(item, context)
              )
            )
          : []
      };
    },
    findById: async (itemId) =>
      normalizeExposedPageItemWithDeploymentState(await handler.findById(itemId), context),
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
        handler: contextualHandler,
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
        handler: contextualHandler,
        preparedValue,
        reply
      });
      if (conflictFailure) {
        return conflictFailure;
      }

      return handler.create({
        value: buildPreparedPageUpdateBody(value, preparedValue),
        reply
      });
    },
    update: async ({ body, item, reply }) => {
      deploymentCoordinator.captureUpdatedItem(item);
      const preparedValue = buildPreparedPageValue(body, item);
      const preparedBody = buildPreparedPageUpdateBody(body, preparedValue);

      const validationFailure = await validatePrepared({
        handler,
        preparedBody,
        reply
      });
      if (validationFailure) {
        deploymentCoordinator.clearUpdatedItem(item?.id);
        return validationFailure;
      }

      const conflictFailure = await validatePreparedPage({
        handler: contextualHandler,
        preparedValue,
        currentItem: item,
        reply
      });
      if (conflictFailure) {
        deploymentCoordinator.clearUpdatedItem(item?.id);
        return conflictFailure;
      }

      const result = await handler.update({
        body: preparedBody,
        value: preparedValue,
        item,
        reply
      });
      if (!result?.ok) {
        deploymentCoordinator.clearUpdatedItem(item?.id);
      }
      return result;
    },
    removeByIndex: async (index, itemId) => {
      const item = itemId ? await handler.findById(itemId) : null;
      deploymentCoordinator.captureRemovedItem(item);
      try {
        return await handler.removeByIndex(index, itemId);
      } catch (error) {
        deploymentCoordinator.clearRemovedItem(item?.id);
        throw error;
      }
    },
    afterMutation: deploymentCoordinator.runAfterMutation
  };
}
