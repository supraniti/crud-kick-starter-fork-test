import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  AUTHORS_COLLECTION_ID,
  COMMENTS_COLLECTION_ID,
  MIN_COMMENT_BODY_LENGTH,
  MODERATION_ROLE_SET,
  POSTS_COLLECTION_ID,
  isModeratedStatus,
  isValidEmail,
  normalizeCommentStatus,
  normalizeEmail,
  normalizeOptionalText,
  normalizeTrimmedText,
  toTimestamp
} from "./engagement-shared-runtime.mjs";

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

function pickValue(input, currentItem, fieldId, fallback = null) {
  return input?.[fieldId] ?? currentItem?.[fieldId] ?? fallback;
}

function buildModerationFields({ input, currentItem, status, timestamp }) {
  if (!isModeratedStatus(status)) {
    return {
      approvedByAuthorId: null,
      approvedOn: null
    };
  }

  return {
    approvedByAuthorId: normalizeOptionalText(
      pickValue(input, currentItem, "approvedByAuthorId")
    ),
    approvedOn: normalizeOptionalText(pickValue(input, currentItem, "approvedOn")) ?? timestamp
  };
}

function buildPreparedCommentValue(input = {}, currentItem = null, mode = "create") {
  const timestamp = toTimestamp();
  const status =
    mode === "create"
      ? "pending"
      : normalizeCommentStatus(pickValue(input, currentItem, "status", "pending"));

  return {
    ...(currentItem ?? {}),
    ...input,
    postId: pickValue(input, currentItem, "postId"),
    parentCommentId: normalizeOptionalText(pickValue(input, currentItem, "parentCommentId")),
    authorDisplayName: normalizeTrimmedText(pickValue(input, currentItem, "authorDisplayName", "")),
    authorEmail: normalizeEmail(pickValue(input, currentItem, "authorEmail")),
    body: normalizeTrimmedText(pickValue(input, currentItem, "body", "")),
    status,
    moderationReason: normalizeOptionalText(pickValue(input, currentItem, "moderationReason")),
    ...buildModerationFields({
      input,
      currentItem,
      status,
      timestamp
    }),
    createdOn: currentItem?.createdOn ?? normalizeOptionalText(input.createdOn) ?? timestamp,
    updatedOn: timestamp
  };
}

function buildPreparedUpdateBody(body, preparedValue) {
  return {
    ...body,
    postId: preparedValue.postId,
    parentCommentId: preparedValue.parentCommentId,
    authorDisplayName: preparedValue.authorDisplayName,
    authorEmail: preparedValue.authorEmail,
    body: preparedValue.body,
    status: preparedValue.status,
    moderationReason: preparedValue.moderationReason,
    approvedByAuthorId: preparedValue.approvedByAuthorId,
    approvedOn: preparedValue.approvedOn,
    createdOn: preparedValue.createdOn,
    updatedOn: preparedValue.updatedOn
  };
}

async function listComments(handler) {
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

async function readRecord(handler, itemId) {
  if (!handler || typeof handler.findById !== "function" || typeof itemId !== "string") {
    return null;
  }
  return handler.findById(itemId);
}

function collectBodyConflicts(preparedValue) {
  const conflicts = [];
  if (preparedValue.body.length < MIN_COMMENT_BODY_LENGTH) {
    conflicts.push(
      buildConflict(
        "BLOG_COMMENT_BODY_TOO_SHORT",
        `Comment body must include at least ${MIN_COMMENT_BODY_LENGTH} characters`,
        "body"
      )
    );
  }
  if (preparedValue.authorEmail && !isValidEmail(preparedValue.authorEmail)) {
    conflicts.push(
      buildConflict(
        "BLOG_COMMENT_EMAIL_INVALID",
        "Comment author email must be a valid email address",
        "authorEmail"
      )
    );
  }
  return conflicts;
}

function collectPostPolicyConflicts(post, preparedValue) {
  if (!post) {
    return [];
  }
  if (post.allowComments === false || post.commentPolicy === "closed") {
    return [
      buildConflict(
        "BLOG_COMMENT_POLICY_CLOSED",
        "Comments are closed for the selected post",
        "postId"
      )
    ];
  }
  return [];
}

function collectParentCommentConflicts(parentComment, preparedValue, currentItem) {
  const parentCommentId = preparedValue.parentCommentId;
  if (!parentCommentId) {
    return [];
  }

  const conflicts = [];
  if (currentItem?.id && parentCommentId === currentItem.id) {
    conflicts.push(
      buildConflict(
        "BLOG_COMMENT_PARENT_SELF",
        "Comment cannot be its own parent",
        "parentCommentId"
      )
    );
  }
  if (parentComment && parentComment.postId !== preparedValue.postId) {
    conflicts.push(
      buildConflict(
        "BLOG_COMMENT_PARENT_POST_MISMATCH",
        "Parent comment must belong to the same post",
        "parentCommentId"
      )
    );
  }
  return conflicts;
}

function collectModeratorConflicts(moderator, preparedValue) {
  if (!isModeratedStatus(preparedValue.status)) {
    return [];
  }

  const conflicts = [];
  if (!preparedValue.approvedByAuthorId) {
    conflicts.push(
      buildConflict(
        "BLOG_COMMENT_MODERATOR_REQUIRED",
        "Moderation actions require a moderator author",
        "approvedByAuthorId"
      )
    );
  }
  if (!moderator || moderator.status !== "active") {
    conflicts.push(
      buildConflict(
        "BLOG_COMMENT_MODERATOR_INACTIVE",
        "Moderator must reference an active author",
        "approvedByAuthorId"
      )
    );
  }
  if (moderator && !MODERATION_ROLE_SET.has(moderator.role)) {
    conflicts.push(
      buildConflict(
        "BLOG_COMMENT_MODERATOR_ROLE_FORBIDDEN",
        "Only editors or managing editors can moderate comments",
        "approvedByAuthorId"
      )
    );
  }
  return conflicts;
}

async function collectCommentConflicts({
  commentsHandler,
  postsHandler,
  authorsHandler,
  preparedValue,
  currentItem = null
}) {
  const [post, moderator, parentComment] = await Promise.all([
    readRecord(postsHandler, preparedValue.postId),
    readRecord(authorsHandler, preparedValue.approvedByAuthorId),
    readRecord(commentsHandler, preparedValue.parentCommentId)
  ]);

  return [
    ...collectBodyConflicts(preparedValue),
    ...collectPostPolicyConflicts(post, preparedValue),
    ...collectParentCommentConflicts(parentComment, preparedValue, currentItem),
    ...collectModeratorConflicts(moderator, preparedValue)
  ];
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

async function validatePreparedComment({ handler, registry, preparedValue, currentItem, reply }) {
  const conflicts = await collectCommentConflicts({
    commentsHandler: handler,
    postsHandler: registry.get(POSTS_COLLECTION_ID),
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
    payload: badRequestWithConflicts(reply, conflicts, "BLOG_COMMENT_VALIDATION_FAILED")
  };
}

function wrapCommentsHandler(handler, registry) {
  return {
    ...handler,
    validateInput: async (input, options = {}) => {
      if (options.partial === true) {
        return handler.validateInput(input, options);
      }

      const preparedValue = buildPreparedCommentValue(input);
      const validation = await handler.validateInput(preparedValue, options);
      if (!validation.ok) {
        return validation;
      }

      const conflicts = await collectCommentConflicts({
        commentsHandler: handler,
        postsHandler: registry.get(POSTS_COLLECTION_ID),
        authorsHandler: registry.get(AUTHORS_COLLECTION_ID),
        preparedValue: validation.value
      });
      return mergeValidationResult(validation, conflicts);
    },
    create: async ({ value, reply }) =>
      handler.create({
        value: buildPreparedCommentValue(value),
        reply
      }),
    update: async ({ body, item, reply }) => {
      const preparedValue = buildPreparedCommentValue(body, item, "update");
      const preparedBody = buildPreparedUpdateBody(body, preparedValue);
      const validationFailure = await validatePreparedUpdate({
        handler,
        preparedBody,
        reply
      });
      if (validationFailure) {
        return validationFailure;
      }

      const conflictFailure = await validatePreparedComment({
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
    }
  };
}

export function createEngagementHandlerRegistry({ registry } = {}) {
  if (!registry || typeof registry !== "object" || typeof registry.register !== "function") {
    return registry;
  }

  const wrappedRegistry = Object.create(registry);
  wrappedRegistry.register = (entry = {}) => {
    const normalizedEntry = entry && typeof entry === "object" ? entry : {};
    return registry.register({
      ...normalizedEntry,
      handler:
        normalizedEntry.collectionId === COMMENTS_COLLECTION_ID
          ? wrapCommentsHandler(normalizedEntry.handler, registry)
          : normalizedEntry.handler
    });
  };
  return wrappedRegistry;
}
