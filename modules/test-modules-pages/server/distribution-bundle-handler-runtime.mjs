import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  buildConflict,
  listExistingItems,
  mergeValidationResult,
  validatePrepared
} from "./distribution-handler-shared-runtime.mjs";
import {
  DEPLOYMENT_BUNDLES_COLLECTION_ID,
  PAGES_COLLECTION_ID,
  REMOTE_CONNECTIONS_COLLECTION_ID,
  REMOTE_TARGETS_COLLECTION_ID,
  normalizeOptionalText,
  normalizePageStatus,
  toTimestamp
} from "./distribution-shared-runtime.mjs";

const BUNDLE_TARGET_REQUIREMENTS = Object.freeze([
  {
    fieldId: "postsProjectionTargetProfileId",
    label: "Posts projection target",
    expectedKind: "firestore-projection",
    expectedProjectionScope: "published-blog-posts"
  },
  {
    fieldId: "categoriesProjectionTargetProfileId",
    label: "Categories projection target",
    expectedKind: "firestore-projection",
    expectedProjectionScope: "public-blog-categories"
  },
  {
    fieldId: "tagsProjectionTargetProfileId",
    label: "Tags projection target",
    expectedKind: "firestore-projection",
    expectedProjectionScope: "public-blog-tags"
  },
  {
    fieldId: "mediaTargetProfileId",
    label: "Media target",
    expectedKind: "media-storage"
  },
  {
    fieldId: "deploymentTargetProfileId",
    label: "HTML deployment target",
    expectedKind: "deployment-storage"
  },
  {
    fieldId: "browserDeliveryTargetProfileId",
    label: "Browser delivery target",
    expectedKind: "browser-delivery"
  }
]);

const BUNDLE_TEXT_FIELD_IDS = Object.freeze([
  "title",
  "pageId",
  "postsProjectionTargetProfileId",
  "categoriesProjectionTargetProfileId",
  "tagsProjectionTargetProfileId",
  "mediaTargetProfileId",
  "deploymentTargetProfileId",
  "browserDeliveryTargetProfileId"
]);

function resolveCollectionHandler(registry, collectionId) {
  return registry && typeof registry.get === "function" ? registry.get(collectionId) ?? null : null;
}

async function resolveReferencedItem(registry, collectionId, itemId) {
  if (!itemId) {
    return null;
  }
  const handler = resolveCollectionHandler(registry, collectionId);
  return handler && typeof handler.findById === "function" ? handler.findById(itemId) : null;
}

function isValidatedConnection(connection) {
  return (
    connection?.connectionStatus === "validated" ||
    connection?.validationSummary?.state === "validated"
  );
}

function isValidatedTarget(target) {
  return (
    target?.targetStatus === "validated" ||
    target?.validationSummary?.state === "validated"
  );
}

function normalizePreparedBundleTextFields(input = {}, currentItem = null) {
  return Object.fromEntries(
    BUNDLE_TEXT_FIELD_IDS.map((fieldId) => [
      fieldId,
      normalizeOptionalText(input?.[fieldId] ?? currentItem?.[fieldId])
    ])
  );
}

function buildPreparedBundleValue(input = {}, currentItem = null) {
  const timestamp = toTimestamp();
  return {
    ...(currentItem ?? {}),
    ...input,
    ...normalizePreparedBundleTextFields(input, currentItem),
    createdOn:
      currentItem?.createdOn ??
      normalizeOptionalText(input?.createdOn ?? currentItem?.createdOn) ??
      timestamp,
    updatedOn: timestamp
  };
}

function buildPreparedBundleUpdateBody(body, preparedValue) {
  return {
    ...body,
    title: preparedValue.title,
    pageId: preparedValue.pageId,
    postsProjectionTargetProfileId: preparedValue.postsProjectionTargetProfileId,
    categoriesProjectionTargetProfileId: preparedValue.categoriesProjectionTargetProfileId,
    tagsProjectionTargetProfileId: preparedValue.tagsProjectionTargetProfileId,
    mediaTargetProfileId: preparedValue.mediaTargetProfileId,
    deploymentTargetProfileId: preparedValue.deploymentTargetProfileId,
    browserDeliveryTargetProfileId: preparedValue.browserDeliveryTargetProfileId,
    createdOn: preparedValue.createdOn,
    updatedOn: preparedValue.updatedOn
  };
}

async function collectPageConflicts(preparedValue, registry) {
  const conflicts = [];
  if (preparedValue.pageId === null) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_PAGE_REQUIRED",
        "Deployment bundle must point to a published page.",
        "pageId"
      )
    );
    return conflicts;
  }

  const page = await resolveReferencedItem(registry, PAGES_COLLECTION_ID, preparedValue.pageId);
  if (!page) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_PAGE_MISSING",
        "Selected page no longer exists.",
        "pageId"
      )
    );
    return conflicts;
  }

  if (normalizePageStatus(page.status) !== "published") {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_PAGE_NOT_PUBLISHED",
        "Deployment bundle must point to a published page.",
        "pageId"
      )
    );
  }

  return conflicts;
}

async function validateBundleTargetRequirement(requirement, preparedValue, registry) {
  const targetId = preparedValue?.[requirement.fieldId] ?? null;
  const conflicts = [];
  if (targetId === null) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_TARGET_REQUIRED",
        `${requirement.label} is required.`,
        requirement.fieldId
      )
    );
    return {
      target: null,
      connectionId: null,
      conflicts
    };
  }

  const target = await resolveReferencedItem(registry, REMOTE_TARGETS_COLLECTION_ID, targetId);
  if (!target) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_TARGET_MISSING",
        `${requirement.label} no longer exists.`,
        requirement.fieldId
      )
    );
    return {
      target: null,
      connectionId: null,
      conflicts
    };
  }

  if (!isValidatedTarget(target)) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_TARGET_NOT_VALIDATED",
        `${requirement.label} must be validated before the bundle can be saved.`,
        requirement.fieldId
      )
    );
  }

  if (target.targetKind !== requirement.expectedKind) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_TARGET_KIND_INVALID",
        `${requirement.label} must use a ${requirement.expectedKind} target.`,
        requirement.fieldId
      )
    );
  }

  if (
    requirement.expectedProjectionScope &&
    normalizeOptionalText(target?.config?.projectionScope) !== requirement.expectedProjectionScope
  ) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_TARGET_SCOPE_INVALID",
        `${requirement.label} must use projection scope '${requirement.expectedProjectionScope}'.`,
        requirement.fieldId
      )
    );
  }

  const connectionId = normalizeOptionalText(target?.connectionProfileId);
  if (!connectionId) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_TARGET_CONNECTION_MISSING",
        `${requirement.label} is missing its connection profile.`,
        requirement.fieldId
      )
    );
    return {
      target,
      connectionId: null,
      conflicts
    };
  }

  const connection = await resolveReferencedItem(registry, REMOTE_CONNECTIONS_COLLECTION_ID, connectionId);
  if (!connection) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_CONNECTION_MISSING",
        `${requirement.label} points at a connection profile that no longer exists.`,
        requirement.fieldId
      )
    );
  } else if (!isValidatedConnection(connection)) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_CONNECTION_NOT_VALIDATED",
        `${requirement.label} points at a connection that is not validated.`,
        requirement.fieldId
      )
    );
  }

  return {
    target,
    connectionId,
    conflicts
  };
}

function collectSharedConnectionConflicts(bindingResults) {
  const connectionIds = Array.from(
    new Set(
      bindingResults
        .map((entry) => entry.connectionId)
        .filter(Boolean)
    )
  );
  if (connectionIds.length <= 1) {
    return [];
  }

  return [
    buildConflict(
      "PAGE_DEPLOYMENT_BUNDLE_CONNECTION_MISMATCH",
      "Deployment bundle targets must share one validated remote connection.",
      "postsProjectionTargetProfileId"
    )
  ];
}

function collectBrowserLinkageConflicts(preparedValue, browserTarget) {
  if (!browserTarget || browserTarget.targetKind !== "browser-delivery") {
    return [];
  }

  const browserConfig = browserTarget.config ?? {};
  const linkedDeploymentId = normalizeOptionalText(browserConfig.deploymentTargetProfileId);
  const linkedMediaId = normalizeOptionalText(browserConfig.mediaTargetProfileId);
  const conflicts = [];

  if (
    linkedDeploymentId &&
    linkedDeploymentId !== preparedValue.deploymentTargetProfileId
  ) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_BROWSER_DEPLOYMENT_MISMATCH",
        "Browser delivery target points at a different HTML deployment target than the selected bundle.",
        "browserDeliveryTargetProfileId"
      )
    );
  }

  if (linkedMediaId && linkedMediaId !== preparedValue.mediaTargetProfileId) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_BROWSER_MEDIA_MISMATCH",
        "Browser delivery target points at a different media target than the selected bundle.",
        "browserDeliveryTargetProfileId"
      )
    );
  }

  return conflicts;
}

async function collectBundleConflicts({ handler, preparedValue }) {
  const conflicts = [];
  if (preparedValue.title === null) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_TITLE_REQUIRED",
        "Deployment bundle title is required.",
        "title"
      )
    );
  }

  conflicts.push(...(await collectPageConflicts(preparedValue, handler.context?.registry)));

  const bindingResults = [];
  for (const requirement of BUNDLE_TARGET_REQUIREMENTS) {
    const bindingResult = await validateBundleTargetRequirement(
      requirement,
      preparedValue,
      handler.context?.registry
    );
    bindingResults.push(bindingResult);
    conflicts.push(...bindingResult.conflicts);
  }

  conflicts.push(...collectSharedConnectionConflicts(bindingResults));
  const browserBinding = bindingResults.find(
    (entry) => entry.target?.id === preparedValue.browserDeliveryTargetProfileId
  );
  conflicts.push(...collectBrowserLinkageConflicts(preparedValue, browserBinding?.target ?? null));

  const duplicateTitle = (await listExistingItems(handler)).some(
    (item) =>
      item?.id !== preparedValue.id &&
      normalizeOptionalText(item?.title) === preparedValue.title
  );
  if (duplicateTitle) {
    conflicts.push(
      buildConflict(
        "PAGE_DEPLOYMENT_BUNDLE_TITLE_CONFLICT",
        `Deployment bundle title '${preparedValue.title}' already exists.`,
        "title"
      )
    );
  }

  return conflicts;
}

async function validatePreparedBundle({ handler, preparedValue, reply }) {
  const conflicts = await collectBundleConflicts({ handler, preparedValue });
  if (conflicts.length === 0) {
    return null;
  }

  return {
    ok: false,
    statusCode: 400,
    payload: badRequestWithConflicts(reply, conflicts, "PAGE_DEPLOYMENT_BUNDLE_VALIDATION_FAILED")
  };
}

export function wrapDeploymentBundlesHandler(handler, context = {}) {
  const contextualHandler = {
    ...handler,
    context
  };

  return {
    ...handler,
    validateInput: async (input, options = {}) => {
      if (options.partial === true) {
        return handler.validateInput(input, options);
      }

      const preparedValue = buildPreparedBundleValue(input);
      const validation = await handler.validateInput(preparedValue, options);
      if (!validation.ok) {
        return validation;
      }

      const conflicts = await collectBundleConflicts({
        handler: contextualHandler,
        preparedValue
      });
      return mergeValidationResult(validation, conflicts);
    },
    create: async ({ value, reply }) => {
      const preparedValue = buildPreparedBundleValue(value);
      const validation = await handler.validateInput(preparedValue);
      if (!validation.ok) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, validation.errors)
        };
      }

      const conflictFailure = await validatePreparedBundle({
        handler: contextualHandler,
        preparedValue,
        reply
      });
      if (conflictFailure) {
        return conflictFailure;
      }

      return handler.create({
        value: buildPreparedBundleUpdateBody(value, preparedValue),
        reply
      });
    },
    update: async ({ body, item, reply }) => {
      const preparedValue = buildPreparedBundleValue(body, item);
      const preparedBody = buildPreparedBundleUpdateBody(body, preparedValue);

      const validationFailure = await validatePrepared({
        handler,
        preparedBody,
        reply
      });
      if (validationFailure) {
        return validationFailure;
      }

      const conflictFailure = await validatePreparedBundle({
        handler: contextualHandler,
        preparedValue,
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
