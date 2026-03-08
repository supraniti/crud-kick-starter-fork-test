import { expect, test } from "vitest";
import {
  createEphemeralReferenceServer,
  injectJson
} from "./helpers/reference-slice-runtime-test-helpers.js";

const BLOG_CONTENT_TEST_TIMEOUT_MS = 20_000;

function buildItemsRoute(collectionId) {
  return `/api/reference/collections/${collectionId}/items`;
}

function buildItemRoute(collectionId, itemId) {
  return `/api/reference/collections/${collectionId}/items/${itemId}`;
}

async function seedAuthor(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-authors"), {
    displayName: "Alice Stone",
    legalName: "Alice Miriam Stone",
    bio: "Managing editor for the reference newsroom.",
    email: "alice@example.com",
    role: "managing-editor",
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
    name: "Guides",
    description: "Guide category",
    parentCategoryId: null,
    sortOrder: 10,
    visibility: "public",
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedTag(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-tags"), {
    name: "Release Ops",
    description: "Operational release management",
    color: "#345abc",
    visibility: "public",
    seoTitle: "Release Ops",
    seoDescription: "Release ops taxonomy",
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

function createLongBody(label) {
  return `<p>${label} `.repeat(40) + "</p>";
}

test("blog content creates deterministic revisions and enforces lifecycle role checks", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const editor = await seedAuthor(server);
    const guest = await seedAuthor(server, {
      displayName: "Guest Writer",
      email: "guest@example.com",
      role: "guest"
    });
    const category = await seedCategory(server);
    const tag = await seedTag(server);

    const createPost = await injectJson(server, "POST", buildItemsRoute("blog-posts"), {
      title: "Launch Checklist for Platform Release",
      subtitle: "How the desk keeps releases aligned",
      excerpt: "A repeatable editorial brief for launch coordination.",
      body: createLongBody("Launch checklist content"),
      status: "draft",
      format: "article",
      primaryAuthorId: editor.id,
      coAuthorIds: [guest.id],
      categoryIds: [category.id],
      tagIds: [tag.id],
      featuredMediaId: null,
      galleryMediaIds: [],
      allowComments: true,
      commentPolicy: "open",
      seoTitle: "Launch Checklist",
      seoDescription: "Launch checklist for platform releases",
      ogTitle: "Launch Checklist",
      ogDescription: "Operational launch checklist",
      locale: "en-US",
      translationGroupId: null,
      createdByAuthorId: editor.id,
      updatedByAuthorId: editor.id
    });
    expect(createPost.statusCode).toBe(201);
    expect(createPost.body.item.wordCount).toBeGreaterThanOrEqual(30);
    expect(createPost.body.item.readTimeMinutes).toBeGreaterThanOrEqual(1);

    const initialRevisions = await injectJson(
      server,
      "GET",
      `${buildItemsRoute("blog-post-revisions")}?postId=${createPost.body.item.id}&limit=200`
    );
    expect(initialRevisions.statusCode).toBe(200);
    expect(initialRevisions.body.items).toHaveLength(1);
    expect(initialRevisions.body.items[0]).toEqual(
      expect.objectContaining({
        postId: createPost.body.item.id,
        revisionNumber: 1,
        source: "manual",
        statusSnapshot: "draft"
      })
    );

    const updatePost = await injectJson(
      server,
      "PUT",
      buildItemRoute("blog-posts", createPost.body.item.id),
      {
        title: "Launch Checklist for Platform Release Updated",
        body: createLongBody("Updated launch checklist content"),
        status: "in-review",
        tagIds: [tag.id],
        updatedByAuthorId: editor.id
      }
    );
    expect(updatePost.statusCode).toBe(200);
    expect(updatePost.body.item.status).toBe("in-review");

    const revisedTimeline = await injectJson(
      server,
      "GET",
      `${buildItemsRoute("blog-post-revisions")}?postId=${createPost.body.item.id}&limit=200`
    );
    expect(revisedTimeline.statusCode).toBe(200);
    expect(revisedTimeline.body.items).toHaveLength(2);
    expect(
      revisedTimeline.body.items.map((item) => item.revisionNumber).sort((left, right) => left - right)
    ).toEqual([1, 2]);

    const invalidPublish = await injectJson(
      server,
      "PUT",
      buildItemRoute("blog-posts", createPost.body.item.id),
      {
        status: "published",
        updatedByAuthorId: guest.id
      }
    );
    expect(invalidPublish.statusCode).toBe(400);
    expect(invalidPublish.body.error.code).toBe("BLOG_POST_STATUS_ROLE_FORBIDDEN");
  } finally {
    await server.close();
  }
}, BLOG_CONTENT_TEST_TIMEOUT_MS);

test("blog content restore route rehydrates a revision snapshot and appends rollback history", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);

    const createdPost = await injectJson(server, "POST", buildItemsRoute("blog-posts"), {
      title: "Original Platform Playbook",
      excerpt: "Original excerpt",
      body: createLongBody("Original playbook body"),
      status: "draft",
      format: "tutorial",
      primaryAuthorId: editor.id,
      coAuthorIds: [],
      categoryIds: [category.id],
      tagIds: [tag.id],
      galleryMediaIds: [],
      allowComments: false,
      commentPolicy: "closed",
      createdByAuthorId: editor.id,
      updatedByAuthorId: editor.id
    });
    expect(createdPost.statusCode).toBe(201);

    const updatedPost = await injectJson(
      server,
      "PUT",
      buildItemRoute("blog-posts", createdPost.body.item.id),
      {
        title: "Updated Platform Playbook",
        excerpt: "Updated excerpt",
        body: createLongBody("Updated playbook body"),
        status: "in-review",
        updatedByAuthorId: editor.id
      }
    );
    expect(updatedPost.statusCode).toBe(200);

    const revisionsBeforeRestore = await injectJson(
      server,
      "GET",
      `${buildItemsRoute("blog-post-revisions")}?postId=${createdPost.body.item.id}&limit=200`
    );
    expect(revisionsBeforeRestore.statusCode).toBe(200);
    expect(revisionsBeforeRestore.body.items).toHaveLength(2);
    const originalRevision =
      revisionsBeforeRestore.body.items.find((item) => item.revisionNumber === 1) ?? null;
    expect(originalRevision).toBeTruthy();

    const restoreResponse = await injectJson(
      server,
      "POST",
      `/api/reference/modules/test-modules-blog-content/posts/${createdPost.body.item.id}/restore-revision`,
      {
        revisionId: originalRevision.id,
        updatedByAuthorId: editor.id
      }
    );
    expect(restoreResponse.statusCode).toBe(200);
    expect(restoreResponse.body.item).toEqual(
      expect.objectContaining({
        title: "Original Platform Playbook",
        excerpt: "Original excerpt",
        status: "draft"
      })
    );

    const revisionsAfterRestore = await injectJson(
      server,
      "GET",
      `${buildItemsRoute("blog-post-revisions")}?postId=${createdPost.body.item.id}&limit=200`
    );
    expect(revisionsAfterRestore.statusCode).toBe(200);
    expect(revisionsAfterRestore.body.items).toHaveLength(3);
    const rollbackRevision =
      revisionsAfterRestore.body.items.find((item) => item.revisionNumber === 3) ?? null;
    expect(rollbackRevision).toEqual(
      expect.objectContaining({
        source: "rollback",
        statusSnapshot: "draft",
        titleSnapshot: "Original Platform Playbook"
      })
    );
  } finally {
    await server.close();
  }
}, BLOG_CONTENT_TEST_TIMEOUT_MS);
