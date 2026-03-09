import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BlogDistributionView } from "../../../../modules/test-modules-pages/frontend/BlogDistributionView.jsx";
import * as referenceApi from "../../api/reference.js";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    createReferenceCollectionItem: vi.fn(),
    fetchReferenceCollectionItems: vi.fn(),
    updateReferenceCollectionItem: vi.fn()
  };
});

function createCollectionsDomain() {
  return {
    collectionsState: {
      loading: false,
      errorMessage: null,
      items: [
        {
          id: "blog-redirect-rules",
          label: "Redirect Rules",
          capabilities: {
            create: true,
            update: true,
            delete: true
          }
        }
      ]
    },
    collectionSchemaState: {
      loading: false,
      errorMessage: null,
      collection: {
        id: "blog-redirect-rules",
        label: "Redirect Rules",
        entitySingular: "redirect rule",
        fields: []
      }
    },
    collectionItemsState: {
      loading: false,
      errorMessage: null,
      items: []
    },
    referenceOptionsState: {},
    activeCollectionId: "blog-redirect-rules",
    isActiveCollectionAvailable: true,
    activeCollectionUnavailableMessage: null,
    handleSelectCollection: vi.fn(),
    reloadCollectionItems: vi.fn()
  };
}

function installReferenceMocks() {
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return {
        items: [
          {
            id: "page-001",
            title: "Launch Story",
            pageKind: "content-detail",
            primarySourceType: "blog-post",
            path: "/stories/launch-window-update",
            layoutKey: "story-shell",
            primarySource: {
              sourceType: "blog-post",
              itemId: "post-001",
              bindAs: "primary"
            },
            dataSources: [],
            status: "scheduled",
            scheduledOn: "2026-03-09T09:00:00.000Z",
            seoTitle: "Launch Story",
            seoDescription: "Launch story description",
            ogTitle: "Launch Story",
            ogDescription: "Launch story description",
            ogImageMediaId: "media-001",
            createdOn: "2026-03-08T08:00:00.000Z",
            updatedOn: "2026-03-08T08:00:00.000Z"
          }
        ]
      };
    }

    if (collectionId === "blog-redirect-rules") {
      return {
        items: [
          {
            id: "redirect-001",
            sourcePath: "/legacy-launch",
            targetPageId: "page-001",
            targetUrl: null,
            httpCode: "301",
            status: "active",
            reason: "Legacy permalink",
            createdOn: "2026-03-08T08:00:00.000Z",
            updatedOn: "2026-03-08T08:00:00.000Z"
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
            status: "scheduled",
            primaryAuthorId: "author-001",
            excerpt: "Launch story description",
            featuredMediaId: "media-001",
            seoTitle: "Launch Window Update",
            seoDescription: "Launch story description",
            ogTitle: "Launch Window Update",
            ogDescription: "Launch story description",
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

    if (collectionId === "blog-categories") {
      return {
        items: [
          {
            id: "cat-001",
            name: "Releases"
          }
        ]
      };
    }

    if (collectionId === "blog-tags") {
      return {
        items: [
          {
            id: "tag-001",
            name: "Platform"
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

    return {
      items: []
    };
  });
}

function createJsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("pages overview renders standalone pages desk, previews delivery json, and publishes scheduled pages", async () => {
  installReferenceMocks();
  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/pages/page-001/delivery")) {
      return createJsonResponse(200, {
        ok: true,
        payload: {
          contractVersion: 1,
          page: {
            id: "page-001",
            title: "Launch Story",
            path: "/stories/launch-window-update"
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

    if (String(url).includes("/pages/page-001/publish-now")) {
      return createJsonResponse(200, {
        ok: true,
        item: {
          id: "page-001",
          status: "published",
          deploymentArtifactPath: "stories/launch-window-update/index.html",
          deploymentSyncedOn: "2026-03-09T09:05:00.000Z"
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
    expect(screen.getByRole("heading", { name: "Standalone Pages Desk" })).toBeInTheDocument();
    expect(screen.getByText("Launch Story")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Launch Story"));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-pages/pages/page-001/delivery?preview=true",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(screen.getByLabelText("Resolved Page JSON").value).toContain("\"contractVersion\": 1");
  });

  fireEvent.click(screen.getByRole("button", { name: "Publish Page" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-pages/pages/page-001/publish-now",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(screen.getByText("Page published and deployed")).toBeInTheDocument();
  });
}, 15000);

test("pages editor creates standalone pages and redirect manager persists page-targeted redirects", async () => {
  installReferenceMocks();
  referenceApi.createReferenceCollectionItem.mockImplementation(async ({ collectionId, item }) => {
    if (collectionId === "blog-pages") {
      return {
        ok: true,
        item: {
          id: "page-002",
          ...item,
          createdOn: "2026-03-09T08:00:00.000Z",
          updatedOn: "2026-03-09T08:00:00.000Z"
        }
      };
    }

    return {
      ok: true,
      item: {
        id: "redirect-002",
        ...item
      }
    };
  });
  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/pages/page-001/delivery")) {
      return createJsonResponse(200, {
        ok: true,
        payload: {
          contractVersion: 1,
          page: {
            id: "page-001"
          }
        }
      });
    }

    if (String(url).includes("/pages/page-002/delivery")) {
      return createJsonResponse(200, {
        ok: true,
        payload: {
          contractVersion: 1,
          page: {
            id: "page-002"
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

  const collectionsDomain = createCollectionsDomain();

  render(
    <BlogDistributionView
      activeModuleLabel="Pages"
      collectionsDomain={collectionsDomain}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "New Page" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "New Page" }));
  fireEvent.change(screen.getByLabelText("Page Title"), {
    target: {
      value: "Platform Landing"
    }
  });
  fireEvent.change(screen.getByLabelText("Path"), {
    target: {
      value: "/platform"
    }
  });
  fireEvent.change(screen.getByLabelText("Runtime Script URLs"), {
    target: {
      value: "https://cdn.example.com/runtime.js\n/assets/runtime/platform.js"
    }
  });
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Create Page" })).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole("button", { name: "Create Page" }));

  await waitFor(() => {
    expect(referenceApi.createReferenceCollectionItem).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "blog-pages",
        item: expect.objectContaining({
          title: "Platform Landing",
          path: "/platform",
          primarySourceType: "none",
          runtimeScriptUrls: [
            {
              url: "https://cdn.example.com/runtime.js"
            },
            {
              url: "/assets/runtime/platform.js"
            }
          ]
        })
      })
    );
  });

  fireEvent.click(screen.getByRole("tab", { name: "Redirect Manager" }));
  fireEvent.click(screen.getByRole("button", { name: "New Redirect" }));
  fireEvent.change(screen.getByLabelText("Source Path"), {
    target: {
      value: "/legacy-launch-2"
    }
  });
  fireEvent.change(screen.getByLabelText("Target URL"), {
    target: {
      value: "https://example.com/platform"
    }
  });
  fireEvent.change(screen.getByLabelText("Reason"), {
    target: {
      value: "Campaign handoff"
    }
  });
  fireEvent.click(screen.getByRole("button", { name: "Create Redirect" }));

  await waitFor(() => {
    expect(referenceApi.createReferenceCollectionItem).toHaveBeenCalledWith({
      collectionId: "blog-redirect-rules",
      item: {
        sourcePath: "/legacy-launch-2",
        targetPageId: null,
        targetUrl: "https://example.com/platform",
        httpCode: "301",
        status: "active",
        reason: "Campaign handoff"
      }
    });
  });
}, 15000);
