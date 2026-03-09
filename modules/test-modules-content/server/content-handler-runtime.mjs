import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  PUBLISH_ROLE_SET,
  POSTS_COLLECTION_ID,
  REVISIONS_COLLECTION_ID,
  buildRevisionRecord,
  computeReadTimeMinutes,
  computeWordCount,
  normalizeIdList,
  normalizeIsoTimestamp,
  normalizeLifecycleStatus,
  normalizeOptionalText,
  normalizeText,
  sanitizeHtmlContent,
  slugify,
  toTimestamp
} from "./content-shared-runtime.mjs";
import { consumeNextRevisionMeta } from "./content-revision-meta-runtime.mjs";

const AUTHORS_COLLECTION_ID = "blog-authors";
const DEFAULT_BODY_MIN_WORDS = 30;
const FORMAT_SET = new Set(["article", "news", "opinion", "tutorial", "review"]);
const COMMENT_POLICY_SET = new Set(["open", "registered-only", "closed"]);
const ELEVATED_STATUS_SET = new Set(["scheduled", "published", "archived"]);
const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  draft: new Set(["draft", "in-review"]),
  "in-review": new Set(["draft", "in-review", "scheduled", "published", "archived"]),
  scheduled: new Set(["draft", "in-review", "scheduled", "published", "archived"]),
  published: new Set(["published", "archived"]),
  archived: new Set(["archived", "draft"])
});

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

function normalizeEnumeratedValue(value, allowedValues, fallback) {
  const normalized = normalizeText(value).toLowerCase();
  return allowedValues.has(normalized) ? normalized : fallback;
}

function normalizeFormat(value, fallback = "article") {
  return normalizeEnumeratedValue(value, FORMAT_SET, fallback);
}

function normalizeCommentPolicy(value, fallback = "open") {
  return normalizeEnumeratedValue(value, COMMENT_POLICY_SET, fallback);
}

function buildPreparedTextFields(input, currentItem) {
  return {
    title: normalizeText(pickInputValue(input, currentItem, "title", "")),
    subtitle: normalizeOptionalText(pickInputValue(input, currentItem, "subtitle")),
    excerpt: normalizeOptionalText(pickInputValue(input, currentItem, "excerpt")),
    canonicalUrl: normalizeOptionalText(pickInputValue(input, currentItem, "canonicalUrl")),
    seoTitle: normalizeOptionalText(pickInputValue(input, currentItem, "seoTitle")),
    seoDescription: normalizeOptionalText(pickInputValue(input, currentItem, "seoDescription")),
    ogTitle: normalizeOptionalText(pickInputValue(input, currentItem, "ogTitle")),
    ogDescription: normalizeOptionalText(pickInputValue(input, currentItem, "ogDescription")),
    locale: normalizeOptionalText(pickInputValue(input, currentItem, "locale")),
    translationGroupId: normalizeOptionalText(
      pickInputValue(input, currentItem, "translationGroupId")
    )
  };
}

function buildPreparedRelationFields(input, currentItem) {
  return {
    primaryAuthorId: normalizeOptionalText(pickInputValue(input, currentItem, "primaryAuthorId")),
    coAuthorIds: normalizeIdList(pickInputValue(input, currentItem, "coAuthorIds", [])),
    categoryIds: normalizeIdList(pickInputValue(input, currentItem, "categoryIds", [])),
    tagIds: normalizeIdList(pickInputValue(input, currentItem, "tagIds", [])),
    featuredMediaId: normalizeOptionalText(pickInputValue(input, currentItem, "featuredMediaId")),
    galleryMediaIds: normalizeIdList(pickInputValue(input, currentItem, "galleryMediaIds", [])),
    ogImageMediaId: normalizeOptionalText(pickInputValue(input, currentItem, "ogImageMediaId"))
  };
}

function resolveAllowComments(input, currentItem) {
  const providedValue = input?.allowComments;
  if (providedValue !== undefined) {
    return providedValue === true;
  }
  return currentItem?.allowComments !== false;
}

function buildPreparedCommentFields(input, currentItem) {
  const allowComments = resolveAllowComments(input, currentItem);
  return {
    allowComments,
    commentPolicy: allowComments
      ? normalizeCommentPolicy(pickInputValue(input, currentItem, "commentPolicy"))
      : "closed"
  };
}

function buildPreparedActorFields(input, currentItem) {
  const createdByAuthorId = normalizeOptionalText(
    pickInputValue(input, currentItem, "createdByAuthorId")
  );
  return {
    createdByAuthorId,
    updatedByAuthorId: normalizeOptionalText(
      pickInputValue(input, currentItem, "updatedByAuthorId", createdByAuthorId)
    )
  };
}

function resolvePublishedOn(status, publishedOn, timestamp) {
  if (status === "published") {
    return publishedOn ?? timestamp;
  }
  if (status === "archived") {
    return publishedOn;
  }
  return null;
}

function buildPreparedLifecycleFields({ input, currentItem, status, timestamp }) {
  const scheduledOn = normalizeIsoTimestamp(pickInputValue(input, currentItem, "scheduledOn"));
  const publishedOn = normalizeIsoTimestamp(pickInputValue(input, currentItem, "publishedOn"));
  const archivedOn = normalizeIsoTimestamp(pickInputValue(input, currentItem, "archivedOn"));
  return {
    scheduledOn: status === "scheduled" ? scheduledOn : null,
    publishedOn: resolvePublishedOn(status, publishedOn, timestamp),
    archivedOn: status === "archived" ? archivedOn ?? timestamp : null
  };
}

function buildPreparedPostValue(input = {}, currentItem = null) {
  const timestamp = toTimestamp();
  const status = normalizeLifecycleStatus(pickInputValue(input, currentItem, "status", "draft"));
  const body = sanitizeHtmlContent(pickInputValue(input, currentItem, "body", ""));
  const wordCount = computeWordCount(body);
  const prepared = {
    ...(currentItem ?? {}),
    ...input,
    ...buildPreparedTextFields(input, currentItem),
    ...buildPreparedRelationFields(input, currentItem),
    ...buildPreparedCommentFields(input, currentItem),
    ...buildPreparedActorFields(input, currentItem),
    ...buildPreparedLifecycleFields({
      input,
      currentItem,
      status,
      timestamp
    }),
    body,
    status,
    format: normalizeFormat(pickInputValue(input, currentItem, "format", "article")),
    createdOn: currentItem?.createdOn ?? normalizeIsoTimestamp(input.createdOn) ?? timestamp,
    updatedOn: timestamp,
    wordCount,
    readTimeMinutes: computeReadTimeMinutes(wordCount)
  };

  prepared.coAuthorIds = prepared.coAuthorIds.filter((authorId) => authorId !== prepared.primaryAuthorId);
  return prepared;
}

async function listExistingPosts(handler) {
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

async function readAuthor(handler, authorId) {
  if (!handler || typeof handler.findById !== "function" || typeof authorId !== "string") {
    return null;
  }
  return handler.findById(authorId);
}

function isTransitionAllowed(currentStatus, nextStatus) {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? ALLOWED_STATUS_TRANSITIONS.draft;
  return allowed.has(nextStatus);
}

function collectSlugConflicts({ existingPosts, currentItem, normalizedSlug }) {
  if (
    normalizedSlug.length === 0 ||
    !existingPosts.some((item) => item.id !== currentItem?.id && item.slug === normalizedSlug)
  ) {
    return [];
  }

  return [
    buildConflict("BLOG_POST_SLUG_CONFLICT", `Post slug '${normalizedSlug}' already exists`, "slug")
  ];
}

function collectContentConflicts(preparedValue) {
  const conflicts = [];
  if (preparedValue.wordCount < DEFAULT_BODY_MIN_WORDS) {
    conflicts.push(
      buildConflict(
        "BLOG_POST_BODY_TOO_SHORT",
        `Post body must include at least ${DEFAULT_BODY_MIN_WORDS} words`,
        "body"
      )
    );
  }
  if (preparedValue.categoryIds.length === 0) {
    conflicts.push(
      buildConflict("BLOG_POST_CATEGORY_REQUIRED", "Post must include at least one category", "categoryIds")
    );
  }
  return conflicts;
}

function collectAuthorConflicts({ preparedValue, primaryAuthor, createdByAuthor, updatedByAuthor }) {
  const conflicts = [];
  if (!primaryAuthor || primaryAuthor.status !== "active") {
    conflicts.push(
      buildConflict(
        "BLOG_POST_PRIMARY_AUTHOR_INACTIVE",
        "Primary author must reference an active author",
        "primaryAuthorId"
      )
    );
  }
  if (!createdByAuthor || createdByAuthor.status !== "active") {
    conflicts.push(
      buildConflict(
        "BLOG_POST_CREATED_BY_INVALID",
        "Created By must reference an active author",
        "createdByAuthorId"
      )
    );
  }
  if (!updatedByAuthor || updatedByAuthor.status !== "active") {
    conflicts.push(
      buildConflict(
        "BLOG_POST_UPDATED_BY_INVALID",
        "Updated By must reference an active author",
        "updatedByAuthorId"
      )
    );
  }
  return conflicts;
}

function collectWorkflowConflicts({ currentItem, preparedValue, updatedByAuthor }) {
  const currentStatus = normalizeLifecycleStatus(currentItem?.status ?? "draft");
  const nextStatus = normalizeLifecycleStatus(preparedValue.status);
  const conflicts = [];

  if (currentItem && !isTransitionAllowed(currentStatus, nextStatus)) {
    conflicts.push(
      buildConflict(
        "BLOG_POST_STATUS_TRANSITION_INVALID",
        `Post cannot transition from '${currentStatus}' to '${nextStatus}'`,
        "status"
      )
    );
  }

  if (ELEVATED_STATUS_SET.has(nextStatus) && updatedByAuthor && !PUBLISH_ROLE_SET.has(updatedByAuthor.role)) {
    conflicts.push(
      buildConflict(
        "BLOG_POST_STATUS_ROLE_FORBIDDEN",
        "Only editors or managing editors can schedule, publish, or archive posts",
        "updatedByAuthorId"
      )
    );
  }

  if (nextStatus === "scheduled" && preparedValue.scheduledOn === null) {
    conflicts.push(
      buildConflict(
        "BLOG_POST_SCHEDULED_ON_REQUIRED",
        "Scheduled posts must include a valid scheduledOn timestamp",
        "scheduledOn"
      )
    );
  }

  return conflicts;
}

async function collectAuthorState(authorsHandler, preparedValue) {
  const [primaryAuthor, createdByAuthor, updatedByAuthor] = await Promise.all([
    readAuthor(authorsHandler, preparedValue.primaryAuthorId),
    readAuthor(authorsHandler, preparedValue.createdByAuthorId),
    readAuthor(authorsHandler, preparedValue.updatedByAuthorId)
  ]);
  return {
    primaryAuthor,
    createdByAuthor,
    updatedByAuthor
  };
}

async function collectPostConflicts({
  postsHandler,
  authorsHandler,
  preparedValue,
  currentItem = null
}) {
  const normalizedSlug = slugify(preparedValue.title ?? "") ?? "";
  const [existingPosts, authorState] = await Promise.all([
    listExistingPosts(postsHandler),
    collectAuthorState(authorsHandler, preparedValue)
  ]);

  return [
    ...collectSlugConflicts({
      existingPosts,
      currentItem,
      normalizedSlug
    }),
    ...collectContentConflicts(preparedValue),
    ...collectAuthorConflicts({
      preparedValue,
      ...authorState
    }),
    ...collectWorkflowConflicts({
      currentItem,
      preparedValue,
      updatedByAuthor: authorState.updatedByAuthor
    })
  ];
}

async function appendRevisionRecord({ postsHandler, revisionsHandler, postId }) {
  if (!postsHandler || !revisionsHandler || typeof postId !== "string") {
    return;
  }

  const post = await postsHandler.findById(postId);
  if (!post) {
    return;
  }

  const revisionsPayload = await revisionsHandler.list({
    postId,
    limit: 5000,
    offset: 0
  });
  const revisions = Array.isArray(revisionsPayload?.items) ? revisionsPayload.items : [];
  const nextRevisionNumber =
    revisions.reduce(
      (maxValue, item) =>
        Number.isFinite(item?.revisionNumber) ? Math.max(maxValue, item.revisionNumber) : maxValue,
      0
    ) + 1;
  const revisionMeta = consumeNextRevisionMeta(postId) ?? {
    source: "manual",
    isAutosave: false
  };
  const createResult = await revisionsHandler.create({
    value: buildRevisionRecord(post, revisionMeta, nextRevisionNumber),
    reply: null
  });

  if (!createResult?.ok) {
    throw new Error(
      createResult?.payload?.error?.message ?? "Failed to persist blog post revision"
    );
  }
}

function buildPreparedUpdateBody(body, preparedValue) {
  return {
    ...body,
    title: preparedValue.title,
    subtitle: preparedValue.subtitle,
    excerpt: preparedValue.excerpt,
    body: preparedValue.body,
    status: preparedValue.status,
    format: preparedValue.format,
    primaryAuthorId: preparedValue.primaryAuthorId,
    coAuthorIds: preparedValue.coAuthorIds,
    categoryIds: preparedValue.categoryIds,
    tagIds: preparedValue.tagIds,
    featuredMediaId: preparedValue.featuredMediaId,
    galleryMediaIds: preparedValue.galleryMediaIds,
    allowComments: preparedValue.allowComments,
    commentPolicy: preparedValue.commentPolicy,
    canonicalUrl: preparedValue.canonicalUrl,
    seoTitle: preparedValue.seoTitle,
    seoDescription: preparedValue.seoDescription,
    ogTitle: preparedValue.ogTitle,
    ogDescription: preparedValue.ogDescription,
    ogImageMediaId: preparedValue.ogImageMediaId,
    scheduledOn: preparedValue.scheduledOn,
    publishedOn: preparedValue.publishedOn,
    archivedOn: preparedValue.archivedOn,
    readTimeMinutes: preparedValue.readTimeMinutes,
    wordCount: preparedValue.wordCount,
    locale: preparedValue.locale,
    translationGroupId: preparedValue.translationGroupId,
    createdByAuthorId: preparedValue.createdByAuthorId,
    updatedByAuthorId: preparedValue.updatedByAuthorId,
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

async function validatePreparedPost({ handler, registry, preparedValue, currentItem, reply }) {
  const conflicts = await collectPostConflicts({
    postsHandler: handler,
    authorsHandler: registry.get(AUTHORS_COLLECTION_ID),
    preparedValue,
    currentItem
  });
  if (conflicts.length === 0) {
    return null;
  }

  return {
    ok: false,
    statusCode: 400,
    payload: badRequestWithConflicts(reply, conflicts, "BLOG_POST_VALIDATION_FAILED")
  };
}

function wrapPostsHandler(handler, registry) {
  return {
    ...handler,
    validateInput: async (input, options = {}) => {
      if (options.partial === true) {
        return handler.validateInput(input, options);
      }

      const preparedValue = buildPreparedPostValue(input);
      const validation = await handler.validateInput(preparedValue, options);
      if (!validation.ok) {
        return validation;
      }

      const conflicts = await collectPostConflicts({
        postsHandler: handler,
        authorsHandler: registry.get(AUTHORS_COLLECTION_ID),
        preparedValue: validation.value
      });
      return mergeValidationResult(validation, conflicts);
    },
    create: async ({ value, reply }) =>
      handler.create({
        value: buildPreparedPostValue(value),
        reply
      }),
    update: async ({ body, item, reply }) => {
      const preparedValue = buildPreparedPostValue(body, item);
      const preparedBody = buildPreparedUpdateBody(body, preparedValue);
      const validationFailure = await validatePreparedUpdate({
        handler,
        preparedBody,
        reply
      });
      if (validationFailure) {
        return validationFailure;
      }

      const conflictFailure = await validatePreparedPost({
        handler,
        registry,
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
    },
    afterMutation: async ({ itemId }) => {
      await appendRevisionRecord({
        postsHandler: handler,
        revisionsHandler: registry.get(REVISIONS_COLLECTION_ID),
        postId: itemId
      });
    }
  };
}

export function createContentHandlerRegistry({ registry } = {}) {
  if (!registry || typeof registry !== "object" || typeof registry.register !== "function") {
    return registry;
  }

  const wrappedRegistry = Object.create(registry);
  wrappedRegistry.register = (entry = {}) => {
    const normalizedEntry = entry && typeof entry === "object" ? entry : {};
    return registry.register({
      ...normalizedEntry,
      handler:
        normalizedEntry.collectionId === POSTS_COLLECTION_ID
          ? wrapPostsHandler(normalizedEntry.handler, registry)
          : normalizedEntry.handler
    });
  };
  return wrappedRegistry;
}
