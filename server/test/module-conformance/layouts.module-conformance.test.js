import { expect, test } from "vitest";
import {
  createEphemeralReferenceServer,
  injectJson
} from "./helpers/reference-slice-runtime-test-helpers.js";

function buildItemsRoute(collectionId) {
  return `/api/reference/collections/${collectionId}/items`;
}

function buildDeliveryRoute(pageId) {
  return `/api/reference/modules/test-modules-pages/pages/${pageId}/delivery`;
}

async function seedAuthor(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-authors"), {
    displayName: "Layout Editor",
    legalName: "Layout Editor",
    bio: "Shapes reusable story templates.",
    email: "layout-editor@example.com",
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
    name: "Layouts",
    description: "Layout announcements",
    parentCategoryId: null,
    sortOrder: 1,
    visibility: "public",
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedTag(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-tags"), {
    name: "Templates",
    description: "Template news",
    color: "#365d75",
    visibility: "public",
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedPost(server, authorId, categoryId, tagId, overrides = {}) {
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  const response = await injectJson(server, "POST", buildItemsRoute("blog-posts"), {
    title: `Layout Driven Story ${uniqueSuffix}`,
    excerpt: "Layout driven story excerpt",
    body: "<p>Layout driven story body with enough editorial copy to satisfy the minimum word count for validation. This reusable layout proof uses a realistic post record, a stable author, category, and tag relationship, and a long enough article body to pass content validation without relying on shortcuts.</p>",
    status: "draft",
    format: "article",
    primaryAuthorId: authorId,
    coAuthorIds: [],
    categoryIds: [categoryId],
    tagIds: [tagId],
    galleryMediaIds: [],
    allowComments: true,
    commentPolicy: "open",
    createdByAuthorId: authorId,
    updatedByAuthorId: authorId,
    ...overrides
  });
  if (response.statusCode !== 201) {
    throw new Error(JSON.stringify(response.body));
  }
  return response.body.item;
}

function createLayoutDocument() {
  return {
    version: 1,
    rootId: "root",
    nodes: {
      root: {
        id: "root",
        kind: "container",
        label: "Root Container",
        layoutMode: "grid",
        props: {
          columns: 12,
          autoRows: 96,
          gap: 24,
          padding: 24,
          minHeight: 720
        },
        placement: {
          grid: { x: 0, y: 0, w: 12, h: 1 },
          flex: { order: 0, basis: "100%", grow: 0, shrink: 0 }
        },
        children: ["hero"]
      },
      hero: {
        id: "hero",
        kind: "block",
        label: "Hero Block",
        props: {
          minHeight: 240,
          emphasis: "default"
        },
        componentInstance: {
          componentKey: "post-title",
          variantKey: "default",
          content: {
            text: {
              mode: "dynamic",
              source: "context",
              path: "context.post.title"
            }
          },
          props: {
            tag: {
              mode: "static",
              value: "h1"
            }
          },
          actions: []
        },
        placement: {
          grid: { x: 0, y: 0, w: 12, h: 3 },
          flex: { order: 0, basis: "100%", grow: 0, shrink: 0 }
        },
        children: []
      }
    }
  };
}

test("layouts create reusable layout records and pages resolve them in delivery payloads", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const author = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);
    const post = await seedPost(server, author.id, category.id, tag.id);

    const createdLayout = await injectJson(server, "POST", buildItemsRoute("page-layouts"), {
      title: "Landing Shell",
      layoutKey: "landing-shell",
      summary: "Reusable landing layout",
      status: "ready",
      layoutDocument: createLayoutDocument()
    });
    expect(createdLayout.statusCode).toBe(201);
    expect(createdLayout.body.item).toEqual(
      expect.objectContaining({
        title: "Landing Shell",
        layoutKey: "landing-shell",
        rootLayoutMode: "grid",
        layoutDocument: expect.objectContaining({
          rootId: "root",
          nodes: expect.objectContaining({
            hero: expect.objectContaining({
              componentInstance: expect.objectContaining({
                componentKey: "post-title"
              })
            })
          })
        })
      })
    );

    const duplicateLayoutKey = await injectJson(server, "POST", buildItemsRoute("page-layouts"), {
      title: "Landing Shell 2",
      layoutKey: "landing-shell",
      status: "draft",
      layoutDocument: createLayoutDocument()
    });
    expect(duplicateLayoutKey.statusCode).toBe(400);
    expect(duplicateLayoutKey.body.error.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "LAYOUT_KEY_CONFLICT"
        })
      ])
    );

    const pageResponse = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Story Landing",
      pageKind: "content-detail",
      primarySourceType: "blog-post",
      path: "/landing",
      layoutId: createdLayout.body.item.id,
      layoutKey: "landing-shell",
      sourceSelectionMode: "specific-record",
      primarySource: {
        sourceType: "blog-post",
        itemId: post.id,
        bindAs: "primary"
      },
      status: "draft",
      seoTitle: "Story Landing",
      seoDescription: "Landing description",
      ogTitle: "Story Landing",
      ogDescription: "Landing description"
    });
    expect(pageResponse.statusCode).toBe(201);

    const deliveryResponse = await injectJson(
      server,
      "GET",
      buildDeliveryRoute(pageResponse.body.item.id)
    );
    expect(deliveryResponse.statusCode).toBe(200);
    expect(deliveryResponse.body.payload.renderModel).toEqual(
      expect.objectContaining({
        layoutId: createdLayout.body.item.id,
        layoutKey: "landing-shell",
        layoutDocument: expect.objectContaining({
          rootId: "root",
          nodes: expect.objectContaining({
            hero: expect.objectContaining({
              componentInstance: expect.objectContaining({
                componentKey: "post-title"
              })
            })
          })
        })
      })
    );
    expect(deliveryResponse.body.payload.application.layout.widgetRenderContract).toEqual(
      expect.objectContaining({
        enabled: true,
        pageKind: "post-detail",
        primarySourceType: "blog-post",
        nodes: expect.objectContaining({
          hero: expect.objectContaining({
            widget: expect.objectContaining({
              componentKey: "post-title"
            })
          })
        })
      })
    );
    expect(deliveryResponse.body.payload.versioning.dependencyKeys).toEqual(
      expect.arrayContaining([`page-layouts:${createdLayout.body.item.id}`])
    );
  } finally {
    await server.close();
  }
}, 30_000);
