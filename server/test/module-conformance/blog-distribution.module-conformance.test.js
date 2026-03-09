import { expect, test } from "vitest";
import {
  createEphemeralReferenceServer,
  injectJson
} from "./helpers/reference-slice-runtime-test-helpers.js";

const BLOG_DISTRIBUTION_TEST_TIMEOUT_MS = 20_000;
const MODULE_ID = "test-modules-pages";

function buildItemsRoute(collectionId) {
  return `/api/reference/collections/${collectionId}/items`;
}

function buildModuleRoute(postId) {
  return `/api/reference/modules/${MODULE_ID}/posts/${postId}/publish-now`;
}

async function seedAuthor(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-authors"), {
    displayName: "Distribution Editor",
    legalName: "Distribution Editor",
    bio: "Owns scheduling and permalink decisions.",
    email: "distribution-editor@example.com",
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
    name: "Releases",
    description: "Release announcements",
    parentCategoryId: null,
    sortOrder: 1,
    visibility: "public",
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

function createLongBody(label) {
  return `<p>${label} `.repeat(32) + "</p>";
}

async function seedPost(server, authorId, categoryId, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-posts"), {
    title: "Release Window Update",
    excerpt: "Release window update excerpt",
    body: createLongBody("Release window update body"),
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

test("pages redirect rules normalize source paths and reject ambiguous targets", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const post = await seedPost(server, editor.id, category.id);

    const missingTarget = await injectJson(server, "POST", buildItemsRoute("blog-redirect-rules"), {
      sourcePath: "launch-update",
      httpCode: "301",
      status: "active"
    });
    expect(missingTarget.statusCode).toBe(400);
    expect(missingTarget.body.error.code).toBe("BLOG_REDIRECT_TARGET_REQUIRED");
    expect(missingTarget.body.error.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BLOG_REDIRECT_TARGET_REQUIRED"
        })
      ])
    );

    const createdRule = await injectJson(server, "POST", buildItemsRoute("blog-redirect-rules"), {
      sourcePath: "launch-update",
      targetPostId: post.id,
      httpCode: "301",
      status: "active",
      reason: "Permalink migration"
    });
    expect(createdRule.statusCode).toBe(201);
    expect(createdRule.body.item).toEqual(
      expect.objectContaining({
        sourcePath: "/launch-update",
        targetPostId: post.id
      })
    );

    const duplicateRule = await injectJson(server, "POST", buildItemsRoute("blog-redirect-rules"), {
      sourcePath: "/launch-update/",
      targetUrl: "https://example.com/blog/launch-update",
      httpCode: "302",
      status: "active"
    });
    expect(duplicateRule.statusCode).toBe(400);
    expect(duplicateRule.body.error.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BLOG_REDIRECT_SOURCE_PATH_CONFLICT"
        })
      ])
    );

    const ambiguousTarget = await injectJson(server, "POST", buildItemsRoute("blog-redirect-rules"), {
      sourcePath: "/launch-redirect",
      targetPostId: post.id,
      targetUrl: "https://example.com/blog/release-window-update",
      httpCode: "301",
      status: "active"
    });
    expect(ambiguousTarget.statusCode).toBe(400);
    expect(ambiguousTarget.body.error.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BLOG_REDIRECT_TARGET_CONFLICT"
        })
      ])
    );
  } finally {
    await server.close();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("pages publish-now route coordinates with scheduled post lifecycle and synced page records", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const scheduledPost = await seedPost(server, editor.id, category.id, {
      title: "Scheduled Launch Update",
      status: "scheduled",
      scheduledOn: "2026-03-09T08:30:00.000Z"
    });

    const syncedPages = await injectJson(
      server,
      "GET",
      `${buildItemsRoute("blog-pages")}?sourcePostId=${scheduledPost.id}&limit=200`
    );
    expect(syncedPages.statusCode).toBe(200);
    expect(syncedPages.body.items).toHaveLength(1);
    expect(syncedPages.body.items[0]).toEqual(
      expect.objectContaining({
        sourcePostId: scheduledPost.id,
        status: "scheduled"
      })
    );

    const publishResponse = await injectJson(server, "POST", buildModuleRoute(scheduledPost.id), {
      updatedByAuthorId: editor.id
    });
    expect(publishResponse.statusCode).toBe(200);
    expect(publishResponse.body.item).toEqual(
      expect.objectContaining({
        id: scheduledPost.id,
        status: "published",
        updatedByAuthorId: editor.id,
        publishedOn: expect.any(String)
      })
    );

    const revisionsResponse = await injectJson(
      server,
      "GET",
      `${buildItemsRoute("blog-post-revisions")}?postId=${scheduledPost.id}&limit=200`
    );
    expect(revisionsResponse.statusCode).toBe(200);
    expect(revisionsResponse.body.items).toHaveLength(2);

    const publishedPages = await injectJson(
      server,
      "GET",
      `${buildItemsRoute("blog-pages")}?sourcePostId=${scheduledPost.id}&limit=200`
    );
    expect(publishedPages.statusCode).toBe(200);
    expect(publishedPages.body.items).toHaveLength(1);
    expect(publishedPages.body.items[0]).toEqual(
      expect.objectContaining({
        sourcePostId: scheduledPost.id,
        status: "published",
        publishedOn: expect.any(String)
      })
    );

    const draftPost = await seedPost(server, editor.id, category.id, {
      title: "Draft Launch Update"
    });
    const invalidPublish = await injectJson(server, "POST", buildModuleRoute(draftPost.id), {
      updatedByAuthorId: editor.id
    });
    expect(invalidPublish.statusCode).toBe(409);
    expect(invalidPublish.body.error.code).toBe("BLOG_DISTRIBUTION_PUBLISH_STATUS_INVALID");
  } finally {
    await server.close();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);
