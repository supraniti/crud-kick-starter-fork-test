import { expect, test } from "vitest";
import {
  createEphemeralReferenceServer,
  injectJson
} from "./helpers/reference-slice-runtime-test-helpers.js";

const BLOG_EDITORIAL_TAXONOMY_TIMEOUT_MS = 20_000;

function buildItemsRoute(collectionId) {
  return `/api/reference/collections/${collectionId}/items`;
}

function buildItemRoute(collectionId, itemId) {
  return `/api/reference/collections/${collectionId}/items/${itemId}`;
}

test("blog editorial enforces active email uniqueness and slug uniqueness", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const firstAuthor = await injectJson(server, "POST", buildItemsRoute("blog-authors"), {
      displayName: "Alice Stone",
      legalName: "Alice Miriam Stone",
      bio: "Launch editor for the reference newsroom.",
      email: "alice@example.com",
      role: "editor",
      status: "active",
      locale: "en-US",
      expertiseTagIds: []
    });
    expect(firstAuthor.statusCode).toBe(201);

    const inactiveDuplicateEmail = await injectJson(
      server,
      "POST",
      buildItemsRoute("blog-authors"),
      {
        displayName: "Alicia North",
        bio: "Guest contributor profile for analytics essays.",
        email: "alice@example.com",
        role: "guest",
        status: "inactive",
        locale: "en-US",
        expertiseTagIds: []
      }
    );
    expect(inactiveDuplicateEmail.statusCode).toBe(201);

    const activeDuplicateEmail = await injectJson(server, "POST", buildItemsRoute("blog-authors"), {
      displayName: "Atlas Editor",
      bio: "Assignment editor for long-form features.",
      email: "alice@example.com",
      role: "editor",
      status: "active",
      locale: "en-US",
      expertiseTagIds: []
    });
    expect(activeDuplicateEmail.statusCode).toBe(400);
    expect(activeDuplicateEmail.body.error.code).toBe("BLOG_AUTHOR_EMAIL_CONFLICT");

    const duplicateSlug = await injectJson(server, "POST", buildItemsRoute("blog-authors"), {
      displayName: "Alice-Stone",
      bio: "Slug conflict proof.",
      email: "alice.stone+alt@example.com",
      role: "author",
      status: "inactive",
      locale: "en-US",
      expertiseTagIds: []
    });
    expect(duplicateSlug.statusCode).toBe(400);
    expect(duplicateSlug.body.error.code).toBe("BLOG_AUTHOR_SLUG_CONFLICT");

    const duplicateDisplayName = await injectJson(server, "POST", buildItemsRoute("blog-authors"), {
      displayName: "Alice Stone",
      bio: "Display name conflict proof.",
      email: "alice.stone+display@example.com",
      role: "author",
      status: "inactive",
      locale: "en-US",
      expertiseTagIds: []
    });
    expect(duplicateDisplayName.statusCode).toBe(400);
    expect(duplicateDisplayName.body.error.code).toBe("BLOG_AUTHOR_DISPLAY_NAME_CONFLICT");
  } finally {
    await server.close();
  }
}, BLOG_EDITORIAL_TAXONOMY_TIMEOUT_MS);

test("blog taxonomy enforces tag slug uniqueness and category cycle safety", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const firstTag = await injectJson(server, "POST", buildItemsRoute("blog-tags"), {
      name: "Release Ops",
      description: "Operational release management",
      color: "#123abc",
      visibility: "public",
      seoTitle: "Release Ops",
      seoDescription: "Release operations taxonomy"
    });
    expect(firstTag.statusCode).toBe(201);

    const duplicateTagSlug = await injectJson(server, "POST", buildItemsRoute("blog-tags"), {
      name: "Release-Ops",
      description: "Duplicate slug proof",
      color: "#123abc",
      visibility: "internal",
      seoTitle: "Release Ops Internal",
      seoDescription: "Internal release ops taxonomy"
    });
    expect(duplicateTagSlug.statusCode).toBe(400);
    expect(duplicateTagSlug.body.error.code).toBe("BLOG_TAG_SLUG_CONFLICT");

    const rootCategory = await injectJson(server, "POST", buildItemsRoute("blog-categories"), {
      name: "Guides",
      description: "Root category for guides",
      parentCategoryId: null,
      sortOrder: 10,
      visibility: "public"
    });
    expect(rootCategory.statusCode).toBe(201);
    expect(rootCategory.body.item.path).toBe("guides");
    expect(rootCategory.body.item.depth).toBe(0);

    const childCategory = await injectJson(server, "POST", buildItemsRoute("blog-categories"), {
      name: "DevOps",
      description: "Nested category for platform work",
      parentCategoryId: rootCategory.body.item.id,
      sortOrder: 20,
      visibility: "internal"
    });
    expect(childCategory.statusCode).toBe(201);
    expect(childCategory.body.item.path).toBe("guides/devops");
    expect(childCategory.body.item.depth).toBe(1);

    const cycleAttempt = await injectJson(
      server,
      "PUT",
      buildItemRoute("blog-categories", rootCategory.body.item.id),
      {
        parentCategoryId: childCategory.body.item.id
      }
    );
    expect(cycleAttempt.statusCode).toBe(400);
    expect(cycleAttempt.body.error.code).toBe("BLOG_CATEGORY_PARENT_CYCLE");
  } finally {
    await server.close();
  }
}, BLOG_EDITORIAL_TAXONOMY_TIMEOUT_MS);
