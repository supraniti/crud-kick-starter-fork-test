import { createComputedResolverRegistry } from "../../../server/src/core/shared/capability-contracts/local-kernel/computed-resolver-catalog.mjs";
import { normalizeCollectionDefinitions } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime/collection-definition-helpers.mjs";
import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";

const MODULE_ID = "test-modules-blog-taxonomy";
const TAGS_COLLECTION_ID = "blog-tags";
const CATEGORIES_COLLECTION_ID = "blog-categories";
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const { slugify } = createComputedResolverRegistry({
  slugifyMaxLength: 80
});

function toTimestamp() {
  return new Date().toISOString();
}

function listCollectionItems(handler) {
  return handler.list({
    limit: 5000,
    offset: 0
  });
}

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

function normalizeSlugToken(value, fallbackValue = "") {
  return slugify(value ?? fallbackValue) ?? "";
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function withTagCreateDefaults(input = {}) {
  const timestamp = toTimestamp();
  return {
    ...input,
    createdOn: normalizeOptionalText(input.createdOn) ?? timestamp,
    updatedOn: normalizeOptionalText(input.updatedOn) ?? timestamp
  };
}

function withTagUpdateDefaults(body = {}, value = {}) {
  const timestamp = toTimestamp();
  return {
    body: {
      ...body,
      updatedOn: timestamp
    },
    value: {
      ...value,
      updatedOn: timestamp
    }
  };
}

async function collectTagConflicts({
  handler,
  value,
  excludeId = null
}) {
  const itemsPayload = await listCollectionItems(handler);
  const items = Array.isArray(itemsPayload?.items) ? itemsPayload.items : [];
  const conflicts = [];
  const normalizedSlug = normalizeSlugToken(value?.name);
  const color = typeof value?.color === "string" ? value.color.trim() : "";

  if (
    normalizedSlug.length > 0 &&
    items.some((item) => item.id !== excludeId && item.slug === normalizedSlug)
  ) {
    conflicts.push(
      buildConflict("BLOG_TAG_SLUG_CONFLICT", `Tag slug '${normalizedSlug}' already exists`, "slug")
    );
  }

  if (color.length > 0 && !HEX_COLOR_PATTERN.test(color)) {
    conflicts.push(
      buildConflict("BLOG_TAG_COLOR_INVALID", "Tag color must use #RGB or #RRGGBB format", "color")
    );
  }

  return conflicts;
}

async function resolveCategoryHierarchy({
  handler,
  categoryId = null,
  name,
  parentCategoryId = null
}) {
  const normalizedSlug = normalizeSlugToken(name, "category");
  if (typeof parentCategoryId !== "string" || parentCategoryId.length === 0) {
    return {
      conflicts: [],
      path: normalizedSlug,
      depth: 0
    };
  }

  if (parentCategoryId === categoryId) {
    return {
      conflicts: [
        buildConflict(
          "BLOG_CATEGORY_PARENT_SELF",
          "Category cannot be its own parent",
          "parentCategoryId"
        )
      ],
      path: normalizedSlug,
      depth: 0
    };
  }

  const chain = [];
  const visited = new Set(categoryId ? [categoryId] : []);
  let cursorId = parentCategoryId;

  while (typeof cursorId === "string" && cursorId.length > 0) {
    if (visited.has(cursorId)) {
      return {
        conflicts: [
          buildConflict(
            "BLOG_CATEGORY_PARENT_CYCLE",
            "Category hierarchy cannot contain cycles",
            "parentCategoryId"
          )
        ],
        path: normalizedSlug,
        depth: 0
      };
    }

    visited.add(cursorId);
    const parent = await handler.findById(cursorId);
    if (!parent) {
      break;
    }

    chain.unshift(parent);
    cursorId =
      typeof parent.parentCategoryId === "string" && parent.parentCategoryId.length > 0
        ? parent.parentCategoryId
        : null;
  }

  return {
    conflicts: [],
    path: [...chain.map((item) => normalizeSlugToken(item.slug, item.name)), normalizedSlug].join("/"),
    depth: chain.length
  };
}

async function collectCategoryConflicts({
  handler,
  value,
  excludeId = null
}) {
  const itemsPayload = await listCollectionItems(handler);
  const items = Array.isArray(itemsPayload?.items) ? itemsPayload.items : [];
  const conflicts = [];
  const normalizedSlug = normalizeSlugToken(value?.name);

  if (
    normalizedSlug.length > 0 &&
    items.some((item) => item.id !== excludeId && item.slug === normalizedSlug)
  ) {
    conflicts.push(
      buildConflict(
        "BLOG_CATEGORY_SLUG_CONFLICT",
        `Category slug '${normalizedSlug}' already exists`,
        "slug"
      )
    );
  }

  return conflicts;
}

async function prepareCategoryCreateValue(input, handler) {
  const timestamp = toTimestamp();
  const hierarchy = await resolveCategoryHierarchy({
    handler,
    name: input?.name,
    parentCategoryId: input?.parentCategoryId ?? null
  });

  return {
    value: {
      ...input,
      createdOn: normalizeOptionalText(input?.createdOn) ?? timestamp,
      updatedOn: normalizeOptionalText(input?.updatedOn) ?? timestamp,
      path: hierarchy.path,
      depth: hierarchy.depth
    },
    conflicts: hierarchy.conflicts
  };
}

async function prepareCategoryUpdateValue({
  body,
  value,
  item,
  handler
}) {
  const nextTimestamp = toTimestamp();
  const nextName = body.name !== undefined ? value.name : item?.name;
  const nextParentCategoryId =
    body.parentCategoryId !== undefined ? value.parentCategoryId : item?.parentCategoryId ?? null;
  const hierarchy = await resolveCategoryHierarchy({
    handler,
    categoryId: item?.id ?? null,
    name: nextName,
    parentCategoryId: nextParentCategoryId
  });

  return {
    body: {
      ...body,
      path: hierarchy.path,
      depth: hierarchy.depth,
      updatedOn: nextTimestamp
    },
    value: {
      ...value,
      path: hierarchy.path,
      depth: hierarchy.depth,
      updatedOn: nextTimestamp
    },
    conflicts: hierarchy.conflicts
  };
}

async function syncCategoryHierarchy(repository, definition) {
  if (!repository || !definition) {
    return;
  }

  await repository.transact(async (workingState) => {
    const rows = Array.isArray(workingState?.[definition.stateKey])
      ? workingState[definition.stateKey]
      : [];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const resolved = new Map();
    const timestamp = toTimestamp();

    function resolveNode(row, visited = new Set()) {
      if (!row || typeof row.id !== "string") {
        return {
          path: "category",
          depth: 0
        };
      }
      if (resolved.has(row.id)) {
        return resolved.get(row.id);
      }

      const nodeSlug = normalizeSlugToken(row.slug, row.name || row.id);
      const parentId =
        typeof row.parentCategoryId === "string" && row.parentCategoryId.length > 0
          ? row.parentCategoryId
          : null;
      if (!parentId || parentId === row.id || visited.has(parentId) || !byId.has(parentId)) {
        const rootNode = {
          path: nodeSlug,
          depth: 0
        };
        resolved.set(row.id, rootNode);
        return rootNode;
      }

      const nextVisited = new Set(visited);
      nextVisited.add(row.id);
      const parentNode = resolveNode(byId.get(parentId), nextVisited);
      const childNode = {
        path: `${parentNode.path}/${nodeSlug}`,
        depth: parentNode.depth + 1
      };
      resolved.set(row.id, childNode);
      return childNode;
    }

    for (const row of rows) {
      const nextNode = resolveNode(row);
      if (row.path !== nextNode.path || row.depth !== nextNode.depth) {
        row.path = nextNode.path;
        row.depth = nextNode.depth;
        row.updatedOn = timestamp;
      }
    }

    return {
      commit: true,
      value: null
    };
  });
}

function wrapTagsHandler(handler) {
  return {
    ...handler,
    validateInput: async (input, options = {}) => {
      if (options.partial === true) {
        return handler.validateInput(input, options);
      }

      const validation = await handler.validateInput(withTagCreateDefaults(input), options);
      if (!validation.ok) {
        return validation;
      }

      const conflicts = await collectTagConflicts({
        handler,
        value: validation.value
      });
      return mergeValidationResult(validation, conflicts);
    },
    create: async ({ value, reply }) =>
      handler.create({
        value: withTagCreateDefaults(value),
        reply
      }),
    update: async ({ body, value, item, reply }) => {
      const prepared = withTagUpdateDefaults(body, value);
      const conflicts = await collectTagConflicts({
        handler,
        value: prepared.value,
        excludeId: item?.id ?? null
      });
      if (conflicts.length > 0) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, conflicts, "BLOG_TAG_VALIDATION_FAILED")
        };
      }

      return handler.update({
        body: prepared.body,
        value: prepared.value,
        item,
        reply
      });
    }
  };
}

function wrapCategoriesHandler({
  handler,
  definition,
  resolveCollectionRepository
}) {
  const runAfterMutation = async (input) => {
    if (typeof handler.afterMutation === "function") {
      await handler.afterMutation(input);
    }

    if (typeof resolveCollectionRepository !== "function") {
      return;
    }

    const repository = resolveCollectionRepository(CATEGORIES_COLLECTION_ID);
    await syncCategoryHierarchy(repository, definition);
  };

  return {
    ...handler,
    validateInput: async (input, options = {}) => {
      if (options.partial === true) {
        return handler.validateInput(input, options);
      }

      const prepared = await prepareCategoryCreateValue(input, handler);
      const validation = await handler.validateInput(prepared.value, options);
      if (!validation.ok) {
        return validation;
      }

      const conflicts = [
        ...prepared.conflicts,
        ...(await collectCategoryConflicts({
          handler,
          value: validation.value
        }))
      ];
      return mergeValidationResult(validation, conflicts);
    },
    create: async ({ value, reply }) => {
      const prepared = await prepareCategoryCreateValue(value, handler);
      if (prepared.conflicts.length > 0) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, prepared.conflicts, "BLOG_CATEGORY_VALIDATION_FAILED")
        };
      }

      return handler.create({
        value: prepared.value,
        reply
      });
    },
    update: async ({ body, value, item, reply }) => {
      const prepared = await prepareCategoryUpdateValue({
        body,
        value,
        item,
        handler
      });
      const conflicts = [
        ...prepared.conflicts,
        ...(await collectCategoryConflicts({
          handler,
          value: prepared.value,
          excludeId: item?.id ?? null
        }))
      ];
      if (conflicts.length > 0) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, conflicts, "BLOG_CATEGORY_VALIDATION_FAILED")
        };
      }

      return handler.update({
        body: prepared.body,
        value: prepared.value,
        item,
        reply
      });
    },
    afterMutation: runAfterMutation
  };
}

export function createTaxonomyHandlerRegistry({
  registry,
  manifest,
  resolveCollectionRepository
} = {}) {
  if (!registry || typeof registry !== "object" || typeof registry.register !== "function") {
    return registry;
  }

  const definitions = new Map(
    normalizeCollectionDefinitions([], MODULE_ID, manifest?.collections ?? []).map((definition) => [
      definition.collectionId,
      definition
    ])
  );
  const wrappedRegistry = Object.create(registry);

  wrappedRegistry.register = (entry = {}) => {
    const normalizedEntry = entry && typeof entry === "object" ? entry : {};
    let nextHandler = normalizedEntry.handler;

    if (normalizedEntry.collectionId === TAGS_COLLECTION_ID) {
      nextHandler = wrapTagsHandler(nextHandler);
    }
    if (normalizedEntry.collectionId === CATEGORIES_COLLECTION_ID) {
      nextHandler = wrapCategoriesHandler({
        handler: nextHandler,
        definition: definitions.get(CATEGORIES_COLLECTION_ID),
        resolveCollectionRepository
      });
    }

    return registry.register({
      ...normalizedEntry,
      handler: nextHandler
    });
  };

  return wrappedRegistry;
}
