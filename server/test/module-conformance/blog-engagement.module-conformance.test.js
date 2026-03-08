import { expect, test } from "vitest";
import {
  createEphemeralReferenceServer,
  injectJson
} from "./helpers/reference-slice-runtime-test-helpers.js";

const BLOG_ENGAGEMENT_TEST_TIMEOUT_MS = 20_000;

function buildItemsRoute(collectionId) {
  return `/api/reference/collections/${collectionId}/items`;
}

function buildItemRoute(collectionId, itemId) {
  return `/api/reference/collections/${collectionId}/items/${itemId}`;
}

async function seedAuthor(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-authors"), {
    displayName: "Desk Editor",
    legalName: "Desk Editor",
    bio: "Editorial desk operator.",
    email: "desk-editor@example.com",
    role: "editor",
    status: "active",
    locale: "en-US",
    expertiseTagIds: [],
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedCategory(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-categories"), {
    name: "Community",
    description: "Community updates",
    parentCategoryId: null,
    sortOrder: 1,
    visibility: "public",
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

function createLongBody(label) {
  return `<p>${label} `.repeat(30) + "</p>";
}

async function seedPost(server, authorId, categoryId, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-posts"), {
    title: "Community Launch Update",
    excerpt: "Community update excerpt",
    body: createLongBody("Community update body"),
    status: "draft",
    format: "article",
    primaryAuthorId: authorId,
    coAuthorIds: [],
    categoryIds: [categoryId],
    tagIds: [],
    galleryMediaIds: [],
    allowComments: true,
    commentPolicy: "open",
    createdByAuthorId: authorId,
    updatedByAuthorId: authorId,
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

test("blog engagement defaults new comments to pending and enforces moderator roles", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const editor = await seedAuthor(server);
    const contributor = await seedAuthor(server, {
      displayName: "Feature Author",
      email: "feature-author@example.com",
      role: "author"
    });
    const category = await seedCategory(server);
    const post = await seedPost(server, editor.id, category.id);

    const createComment = await injectJson(server, "POST", buildItemsRoute("blog-comments"), {
      postId: post.id,
      authorDisplayName: "Reader One",
      authorEmail: "reader.one@example.com",
      body: "This article clarified the roadmap and the migration timing.",
      status: "approved"
    });
    expect(createComment.statusCode).toBe(201);
    expect(createComment.body.item).toEqual(
      expect.objectContaining({
        status: "pending",
        approvedByAuthorId: null,
        approvedOn: null
      })
    );

    const invalidModeration = await injectJson(
      server,
      "PUT",
      buildItemRoute("blog-comments", createComment.body.item.id),
      {
        status: "approved",
        approvedByAuthorId: contributor.id,
        moderationReason: "Looks acceptable"
      }
    );
    expect(invalidModeration.statusCode).toBe(400);
    expect(invalidModeration.body.error.code).toBe("BLOG_COMMENT_MODERATOR_ROLE_FORBIDDEN");

    const approvedComment = await injectJson(
      server,
      "PUT",
      buildItemRoute("blog-comments", createComment.body.item.id),
      {
        status: "approved",
        approvedByAuthorId: editor.id,
        moderationReason: "Approved for publication"
      }
    );
    expect(approvedComment.statusCode).toBe(200);
    expect(approvedComment.body.item).toEqual(
      expect.objectContaining({
        status: "approved",
        approvedByAuthorId: editor.id,
        moderationReason: "Approved for publication"
      })
    );
    expect(approvedComment.body.item.approvedOn).toEqual(expect.any(String));
  } finally {
    await server.close();
  }
}, BLOG_ENGAGEMENT_TEST_TIMEOUT_MS);

test("blog engagement blocks closed-post comments and parent comment cross-post links", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const openPost = await seedPost(server, editor.id, category.id);
    const closedPost = await seedPost(server, editor.id, category.id, {
      title: "Closed Comments Update",
      allowComments: false,
      commentPolicy: "closed"
    });

    const parentComment = await injectJson(server, "POST", buildItemsRoute("blog-comments"), {
      postId: openPost.id,
      authorDisplayName: "Reader Two",
      authorEmail: "reader.two@example.com",
      body: "Helpful update with enough detail for the migration team."
    });
    expect(parentComment.statusCode).toBe(201);

    const closedComment = await injectJson(server, "POST", buildItemsRoute("blog-comments"), {
      postId: closedPost.id,
      authorDisplayName: "Reader Three",
      authorEmail: "reader.three@example.com",
      body: "I wanted to ask a follow-up question about comments."
    });
    expect(closedComment.statusCode).toBe(400);
    expect(closedComment.body.error.code).toBe("BLOG_COMMENT_POLICY_CLOSED");

    const crossPostReply = await injectJson(server, "POST", buildItemsRoute("blog-comments"), {
      postId: closedPost.id,
      parentCommentId: parentComment.body.item.id,
      authorDisplayName: "Reader Four",
      authorEmail: "reader.four@example.com",
      body: "Trying to reply on a different post should fail."
    });
    expect(crossPostReply.statusCode).toBe(400);
    expect(crossPostReply.body.error.code).toBe("BLOG_COMMENT_POLICY_CLOSED");
    expect(crossPostReply.body.error.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BLOG_COMMENT_PARENT_POST_MISMATCH"
        })
      ])
    );
  } finally {
    await server.close();
  }
}, BLOG_ENGAGEMENT_TEST_TIMEOUT_MS);
