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
          rootId: "root"
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
      title: "Standalone Landing",
      pageKind: "standalone",
      primarySourceType: "none",
      path: "/landing",
      layoutId: createdLayout.body.item.id,
      layoutKey: "landing-shell",
      status: "draft",
      seoTitle: "Standalone Landing",
      seoDescription: "Landing description",
      ogTitle: "Standalone Landing",
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
          rootId: "root"
        })
      })
    );
    expect(deliveryResponse.body.payload.versioning.dependencyKeys).toEqual(
      expect.arrayContaining([`page-layouts:${createdLayout.body.item.id}`])
    );
  } finally {
    await server.close();
  }
});
