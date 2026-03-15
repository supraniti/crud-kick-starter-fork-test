import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BlogDistributionView } from "../../../../modules/test-modules-pages/frontend/BlogDistributionView.jsx";
import * as referenceApi from "../../api/reference.js";
import {
  createCollectionsDomain,
  createJsonResponse,
  installReferenceMocks
} from "./blog-distribution.integration-support.jsx";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    createReferenceCollectionItem: vi.fn(),
    fetchReferenceCollectionItems: vi.fn(),
    updateReferenceCollectionItem: vi.fn()
  };
});

test("pages editor supports per-record post templates and previews a concrete post instance", async () => {
  installReferenceMocks(referenceApi);
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return {
        items: [
          {
            id: "page-010",
            title: "Posts Page",
            pageKind: "content-detail",
            deploymentMode: "per-record",
            primarySourceType: "blog-post",
            sourceSelectionMode: "all-records",
            path: "/posts",
            pathPattern: "/posts/{slug}",
            layoutKey: "page-shell",
            primarySource: {
              sourceType: "blog-post",
              itemId: null,
              bindAs: "primary"
            },
            dataSources: [],
            status: "draft",
            seoTitle: "Post Detail",
            seoDescription: "Fallback description",
            ogTitle: "Post Detail",
            ogDescription: "Fallback description",
            ogImageMediaId: "media-001",
            deploymentStatus: "missing",
            deploymentTargetCount: 0,
            deploymentSyncedCount: 0,
            deploymentStaleCount: 0,
            deploymentMissingCount: 0,
            createdOn: "2026-03-08T08:00:00.000Z",
            updatedOn: "2026-03-08T08:00:00.000Z"
          }
        ]
      };
    }

    if (collectionId === "blog-redirect-rules") {
      return { items: [] };
    }

    if (collectionId === "page-layouts") {
      return {
        items: [
          {
            id: "layout-001",
            title: "Post Layout"
          }
        ]
      };
    }

    if (collectionId === "blog-posts") {
      return {
        items: [
          {
            id: "post-001",
            title: "Launch Window Update",
            slug: "launch-window-update",
            status: "published",
            primaryAuthorId: "author-001",
            excerpt: "Launch story description",
            body: "A full body for preview",
            featuredMediaId: "media-001",
            seoTitle: "Launch Window Update",
            seoDescription: "Launch story description",
            ogTitle: "Launch Window Update",
            ogDescription: "Launch story description",
            ogImageMediaId: "media-001"
          },
          {
            id: "post-002",
            title: "Quarterly Review",
            slug: "quarterly-review",
            status: "published",
            primaryAuthorId: "author-001",
            excerpt: "Quarterly review description",
            body: "Another full body for preview",
            featuredMediaId: "media-001",
            seoTitle: "Quarterly Review",
            seoDescription: "Quarterly review description",
            ogTitle: "Quarterly Review",
            ogDescription: "Quarterly review description",
            ogImageMediaId: "media-001"
          }
        ]
      };
    }

    if (collectionId === "blog-authors") {
      return {
        items: [
          {
            id: "author-001",
            displayName: "Distribution Editor",
            role: "editor",
            status: "active"
          }
        ]
      };
    }

    if (collectionId === "blog-categories" || collectionId === "blog-tags") {
      return { items: [] };
    }

    if (collectionId === "media-items") {
      return {
        items: [
          {
            id: "media-001",
            displayName: "Launch Hero"
          }
        ]
      };
    }

    return { items: [] };
  });

  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/pages/page-010/preview-sources")) {
      return createJsonResponse(200, {
        ok: true,
        items: [
          {
            id: "post-001",
            label: "Launch Window Update",
            path: "/posts/launch-window-update"
          },
          {
            id: "post-002",
            label: "Quarterly Review",
            path: "/posts/quarterly-review"
          }
        ]
      });
    }

    if (String(url).includes("/pages/page-010/deployment-instances")) {
      return createJsonResponse(200, {
        ok: true,
        items: []
      });
    }

    if (String(url).includes("/pages/page-010/delivery?preview=true&sourceItemId=post-001")) {
      return createJsonResponse(200, {
        ok: true,
        payload: {
          contractVersion: 1,
          page: {
            id: "page-010",
            path: "/posts/launch-window-update",
            deploymentMode: "per-record"
          },
          data: {
            primary: {
              collectionId: "blog-posts",
              itemId: "post-001"
            }
          }
        }
      });
    }

    return createJsonResponse(404, {
      ok: false,
      error: {
        message: "not found"
      }
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <BlogDistributionView
      activeModuleLabel="Pages"
      collectionsDomain={createCollectionsDomain()}
    />
  );

  await waitFor(() => {
    expect(screen.getByText("Posts Page")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Posts Page"));

  await waitFor(() => {
    expect(screen.getByRole("combobox", { name: "Deployment Mode" })).toHaveTextContent("per-record");
    expect(screen.getByLabelText("Path Pattern")).toHaveValue("/posts/{slug}");
  });

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-pages/pages/page-010/preview-sources",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-pages/pages/page-010/delivery?preview=true&sourceItemId=post-001",
      expect.objectContaining({
        method: "GET"
      })
    );
  });

  expect(screen.getByRole("combobox", { name: "Preview Source Post" })).toHaveTextContent(
    "Launch Window Update - /posts/launch-window-update"
  );
  expect(screen.getByLabelText("Resolved Page JSON").value).toContain("/posts/launch-window-update");
}, 15000);

test("pages editor supports per-record category templates and previews a concrete category instance", async () => {
  installReferenceMocks(referenceApi);
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return {
        items: [
          {
            id: "page-011",
            title: "Categories Page",
            pageKind: "listing",
            deploymentMode: "per-record",
            primarySourceType: "blog-category",
            sourceSelectionMode: "all-records",
            path: "/category",
            pathPattern: "/category/{slug}",
            layoutKey: "listing-shell",
            primarySource: {
              sourceType: "blog-category",
              itemId: null,
              bindAs: "primary"
            },
            dataSources: [],
            status: "draft",
            seoTitle: "Category Detail",
            seoDescription: "Fallback category description",
            ogTitle: "Category Detail",
            ogDescription: "Fallback category description",
            ogImageMediaId: "media-001",
            deploymentStatus: "missing",
            deploymentTargetCount: 0,
            deploymentSyncedCount: 0,
            deploymentStaleCount: 0,
            deploymentMissingCount: 0,
            createdOn: "2026-03-08T08:00:00.000Z",
            updatedOn: "2026-03-08T08:00:00.000Z"
          }
        ]
      };
    }

    if (collectionId === "blog-redirect-rules") {
      return { items: [] };
    }

    if (collectionId === "page-layouts") {
      return {
        items: [
          {
            id: "layout-010",
            title: "Category Layout"
          }
        ]
      };
    }

    if (collectionId === "blog-categories") {
      return {
        items: [
          {
            id: "category-001",
            name: "Guides",
            slug: "guides",
            description: "Guides category",
            visibility: "public"
          },
          {
            id: "category-002",
            name: "Release Ops",
            slug: "release-ops",
            description: "Release ops category",
            visibility: "public"
          }
        ]
      };
    }

    if (collectionId === "blog-posts" || collectionId === "blog-authors" || collectionId === "blog-tags") {
      return { items: [] };
    }

    if (collectionId === "media-items") {
      return {
        items: [
          {
            id: "media-001",
            displayName: "Category Hero"
          }
        ]
      };
    }

    return { items: [] };
  });

  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/pages/page-011/preview-sources")) {
      return createJsonResponse(200, {
        ok: true,
        items: [
          {
            id: "category-001",
            label: "Guides",
            path: "/category/guides"
          },
          {
            id: "category-002",
            label: "Release Ops",
            path: "/category/release-ops"
          }
        ]
      });
    }

    if (String(url).includes("/pages/page-011/deployment-instances")) {
      return createJsonResponse(200, {
        ok: true,
        items: []
      });
    }

    if (String(url).includes("/pages/page-011/delivery?preview=true&sourceItemId=category-001")) {
      return createJsonResponse(200, {
        ok: true,
        payload: {
          contractVersion: 1,
          page: {
            id: "page-011",
            path: "/category/guides",
            deploymentMode: "per-record"
          },
          data: {
            primary: {
              collectionId: "blog-categories",
              itemId: "category-001"
            }
          }
        }
      });
    }

    return createJsonResponse(404, {
      ok: false,
      error: {
        message: "not found"
      }
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <BlogDistributionView
      activeModuleLabel="Pages"
      collectionsDomain={createCollectionsDomain()}
    />
  );

  await waitFor(() => {
    expect(screen.getByText("Categories Page")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Categories Page"));

  await waitFor(() => {
    expect(screen.getByRole("combobox", { name: "Deployment Mode" })).toHaveTextContent("per-record");
    expect(screen.getByLabelText("Path Pattern")).toHaveValue("/category/{slug}");
  });

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-pages/pages/page-011/preview-sources",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-pages/pages/page-011/delivery?preview=true&sourceItemId=category-001",
      expect.objectContaining({
        method: "GET"
      })
    );
  });

  expect(screen.getByRole("combobox", { name: "Preview Source Category" })).toHaveTextContent(
    "Guides - /category/guides"
  );
  expect(screen.getByLabelText("Resolved Page JSON").value).toContain("/category/guides");
}, 15000);

test("pages editor syncs per-record deployment and shows deployment instances", async () => {
  let deploymentSynced = false;
  installReferenceMocks(referenceApi);
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return {
        items: [
          {
            id: "page-020",
            title: "Posts Page",
            pageKind: "content-detail",
            deploymentMode: "per-record",
            primarySourceType: "blog-post",
            sourceSelectionMode: "all-records",
            path: "/posts",
            pathPattern: "/posts/{slug}",
            layoutKey: "page-shell",
            primarySource: {
              sourceType: "blog-post",
              itemId: null,
              bindAs: "primary"
            },
            dataSources: [],
            status: "published",
            seoTitle: "Post Detail",
            seoDescription: "Fallback description",
            ogTitle: "Post Detail",
            ogDescription: "Fallback description",
            ogImageMediaId: "media-001",
            deploymentStatus: deploymentSynced ? "clean" : "stale",
            deploymentTargetCount: 2,
            deploymentSyncedCount: deploymentSynced ? 2 : 1,
            deploymentStaleCount: deploymentSynced ? 0 : 1,
            deploymentMissingCount: 0,
            deploymentSyncedOn: deploymentSynced ? "2026-03-10T10:00:00.000Z" : "2026-03-09T10:00:00.000Z",
            deploymentLastRunOn: deploymentSynced ? "2026-03-10T10:00:00.000Z" : "2026-03-09T10:00:00.000Z",
            createdOn: "2026-03-08T08:00:00.000Z",
            updatedOn: deploymentSynced ? "2026-03-10T09:55:00.000Z" : "2026-03-10T09:55:00.000Z"
          }
        ]
      };
    }

    if (collectionId === "blog-redirect-rules") {
      return { items: [] };
    }

    if (collectionId === "page-layouts") {
      return { items: [] };
    }

    if (collectionId === "blog-posts") {
      return {
        items: [
          {
            id: "post-001",
            title: "Launch Window Update",
            slug: "launch-window-update",
            status: "published",
            primaryAuthorId: "author-001",
            excerpt: "Launch story description",
            body: "A full body for preview",
            featuredMediaId: "media-001"
          },
          {
            id: "post-002",
            title: "Quarterly Review",
            slug: "quarterly-review",
            status: "published",
            primaryAuthorId: "author-001",
            excerpt: "Quarterly review description",
            body: "Another full body for preview",
            featuredMediaId: "media-001"
          }
        ]
      };
    }

    if (collectionId === "blog-authors") {
      return {
        items: [
          {
            id: "author-001",
            displayName: "Distribution Editor",
            role: "editor",
            status: "active"
          }
        ]
      };
    }

    if (collectionId === "media-items") {
      return {
        items: [
          {
            id: "media-001",
            displayName: "Launch Hero"
          }
        ]
      };
    }

    return { items: [] };
  });

  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/pages/page-020/preview-sources")) {
      return createJsonResponse(200, {
        ok: true,
        items: [
          {
            id: "post-001",
            label: "Launch Window Update",
            path: "/posts/launch-window-update"
          }
        ]
      });
    }

    if (String(url).includes("/pages/page-020/deployment-instances")) {
      return createJsonResponse(200, {
        ok: true,
        items: deploymentSynced
          ? [
              {
                sourceItemId: "post-001",
                sourceLabel: "Launch Window Update",
                resolvedPath: "/posts/launch-window-update",
                artifactRelativePath: "posts/launch-window-update/index.html",
                status: "synced",
                lastSyncedOn: "2026-03-10T10:00:00.000Z"
              },
              {
                sourceItemId: "post-002",
                sourceLabel: "Quarterly Review",
                resolvedPath: "/posts/quarterly-review",
                artifactRelativePath: "posts/quarterly-review/index.html",
                status: "synced",
                lastSyncedOn: "2026-03-10T10:00:00.000Z"
              }
            ]
          : [
              {
                sourceItemId: "post-001",
                sourceLabel: "Launch Window Update",
                resolvedPath: "/posts/launch-window-update",
                artifactRelativePath: "posts/launch-window-update/index.html",
                status: "stale",
                staleReasonSummary: "Source record changed"
              },
              {
                sourceItemId: "post-002",
                sourceLabel: "Quarterly Review",
                resolvedPath: "/posts/quarterly-review",
                artifactRelativePath: "posts/quarterly-review/index.html",
                status: "synced",
                lastSyncedOn: "2026-03-09T10:00:00.000Z"
              }
            ]
      });
    }

    if (String(url).includes("/pages/page-020/delivery?preview=true&sourceItemId=post-001")) {
      return createJsonResponse(200, {
        ok: true,
        payload: {
          contractVersion: 1,
          page: {
            id: "page-020",
            path: "/posts/launch-window-update",
            deploymentMode: "per-record"
          }
        }
      });
    }

    if (String(url).includes("/pages/page-020/sync-deployment")) {
      deploymentSynced = true;
      return createJsonResponse(200, {
        ok: true,
        item: {
          id: "page-020",
          deploymentSyncedCount: 2
        },
        items: []
      });
    }

    return createJsonResponse(404, {
      ok: false,
      error: {
        message: "not found"
      }
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <BlogDistributionView
      activeModuleLabel="Pages"
      collectionsDomain={createCollectionsDomain()}
    />
  );

  await waitFor(() => {
    expect(screen.getAllByText("Posts Page").length).toBeGreaterThan(0);
  });

  fireEvent.click(screen.getAllByText("Posts Page")[0]);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Sync Deployment" })).toBeInTheDocument();
    expect(screen.getByText("Source record changed")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Sync Deployment" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-pages/pages/page-020/sync-deployment",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(screen.getByText("Deployment synced for 2 outputs")).toBeInTheDocument();
    expect(screen.getByText("2/2 synced")).toBeInTheDocument();
  });
}, 15000);
