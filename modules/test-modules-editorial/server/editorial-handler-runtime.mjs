import { createComputedResolverRegistry } from "../../../server/src/core/shared/capability-contracts/local-kernel/computed-resolver-catalog.mjs";
import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";

const AUTHORS_COLLECTION_ID = "blog-authors";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const { slugify } = createComputedResolverRegistry({
  slugifyMaxLength: 80
});

function toTimestamp() {
  return new Date().toISOString();
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeDisplayName(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function listAuthorItems(handler) {
  return handler.list({
    limit: 5000,
    offset: 0
  });
}

function withCreateDefaults(input = {}) {
  const timestamp = toTimestamp();
  return {
    ...input,
    createdOn: normalizeOptionalText(input.createdOn) ?? timestamp,
    updatedOn: normalizeOptionalText(input.updatedOn) ?? timestamp,
    lastPublishedOn: normalizeOptionalText(input.lastPublishedOn)
  };
}

function withUpdateDefaults(body = {}, value = {}) {
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

function toValidationConflict(code, message, fieldId) {
  return {
    code,
    message,
    fieldId
  };
}

async function collectAuthorConflicts({
  handler,
  value,
  excludeId = null
}) {
  const itemsPayload = await listAuthorItems(handler);
  const items = Array.isArray(itemsPayload?.items) ? itemsPayload.items : [];
  const conflicts = [];
  const normalizedSlug = slugify(value?.displayName ?? "") ?? "";
  const normalizedEmail = normalizeEmail(value?.email);
  const normalizedDisplayName = normalizeDisplayName(value?.displayName);

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    conflicts.push(
      toValidationConflict(
        "BLOG_AUTHOR_EMAIL_INVALID",
        "Author email must be a valid email address",
        "email"
      )
    );
  }

  if (
    normalizedDisplayName.length > 0 &&
    items.some(
      (item) =>
        item.id !== excludeId &&
        normalizeDisplayName(item.displayName) === normalizedDisplayName
    )
  ) {
    conflicts.push(
      toValidationConflict(
        "BLOG_AUTHOR_DISPLAY_NAME_CONFLICT",
        `Author display name '${value?.displayName ?? ""}' already exists`,
        "displayName"
      )
    );
  }

  if (
    normalizedSlug.length > 0 &&
    items.some((item) => item.id !== excludeId && item.slug === normalizedSlug)
  ) {
    conflicts.push(
      toValidationConflict(
        "BLOG_AUTHOR_SLUG_CONFLICT",
        `Author slug '${normalizedSlug}' already exists`,
        "slug"
      )
    );
  }

  if (
    value?.status === "active" &&
    normalizedEmail.length > 0 &&
    items.some(
      (item) =>
        item.id !== excludeId &&
        item.status === "active" &&
        normalizeEmail(item.email) === normalizedEmail
    )
  ) {
    conflicts.push(
      toValidationConflict(
        "BLOG_AUTHOR_EMAIL_CONFLICT",
        `Active author email '${normalizedEmail}' already exists`,
        "email"
      )
    );
  }

  return conflicts;
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

function wrapAuthorHandler(handler) {
  return {
    ...handler,
    validateInput: async (input, options = {}) => {
      if (options.partial === true) {
        return handler.validateInput(input, options);
      }

      const validation = await handler.validateInput(withCreateDefaults(input), options);
      if (!validation.ok) {
        return validation;
      }

      const conflicts = await collectAuthorConflicts({
        handler,
        value: validation.value
      });
      return mergeValidationResult(validation, conflicts);
    },
    create: async ({ value, reply }) =>
      handler.create({
        value: withCreateDefaults(value),
        reply
      }),
    update: async ({ body, value, item, reply }) => {
      const prepared = withUpdateDefaults(body, value);
      const conflicts = await collectAuthorConflicts({
        handler,
        value: prepared.value,
        excludeId: item?.id ?? null
      });
      if (conflicts.length > 0) {
        return {
          ok: false,
          statusCode: 400,
          payload: badRequestWithConflicts(reply, conflicts, "BLOG_AUTHOR_VALIDATION_FAILED")
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

export function createEditorialHandlerRegistry(registry) {
  if (!registry || typeof registry !== "object" || typeof registry.register !== "function") {
    return registry;
  }

  const wrappedRegistry = Object.create(registry);
  wrappedRegistry.register = (entry = {}) => {
    const normalizedEntry = entry && typeof entry === "object" ? entry : {};
    return registry.register({
      ...normalizedEntry,
      handler:
        normalizedEntry.collectionId === AUTHORS_COLLECTION_ID
          ? wrapAuthorHandler(normalizedEntry.handler)
          : normalizedEntry.handler
    });
  };
  return wrappedRegistry;
}
