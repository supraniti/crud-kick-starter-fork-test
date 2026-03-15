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

test("pages overview renders standalone pages desk, previews delivery json, and publishes scheduled pages", async () => {
  installReferenceMocks(referenceApi);
  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/pages/page-001/preview-sources")) {
      return createJsonResponse(200, {
        ok: true,
        items: []
      });
    }

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
          },
          runtime: {
            clientRuntime: {
              assetUrl: "/assets/client-runtime.global.js",
              bootstrapDatasets: ["page-payload", "page-media", "post-comments"],
              remote: {
                baseUrl: "https://content.example.com"
              },
              slots: [
                {
                  bindAs: "primary",
                  sourceType: "blog-post",
                  recordMode: "single-item"
                }
              ],
              queries: [
                {
                  resource: "page",
                  query: "current"
                },
                {
                  resource: "comments",
                  query: "byPost"
                }
              ],
              actions: [
                {
                  action: "comments.submit"
                }
              ],
              datasets: [
                {
                  dataset: "page-payload"
                },
                {
                  dataset: "page-media"
                },
                {
                  dataset: "post-comments"
                }
              ]
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
    expect(screen.getByRole("heading", { level: 4, name: "Pages Desk" })).toBeInTheDocument();
    expect(screen.getByText("Launch Story")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Launch Story"));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-pages/pages/page-001/delivery?preview=true&sourceItemId=post-001",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(screen.getByLabelText("Resolved Page JSON").value).toContain("\"contractVersion\": 1");
    expect(screen.getByRole("heading", { name: "Client Runtime Contract" })).toBeInTheDocument();
    expect(screen.getByText("comments.submit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("/assets/client-runtime.global.js")).toBeInTheDocument();
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
  installReferenceMocks(referenceApi);
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
    if (String(url).includes("/pages/page-001/preview-sources")) {
      return createJsonResponse(200, {
        ok: true,
        items: []
      });
    }

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

test("pages desk exposes deployment settings and can open the selected layout builder with return context", async () => {
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-pages") {
      return {
        items: [
          {
            id: "page-001",
            title: "Launch Story",
            pageKind: "content-detail",
            deploymentMode: "single-page",
            primarySourceType: "blog-post",
            sourceSelectionMode: "specific-record",
            path: "/stories/launch-window-update",
            layoutId: "layout-001",
            layoutKey: "story-shell",
            primarySource: {
              sourceType: "blog-post",
              itemId: "post-001",
              bindAs: "primary"
            },
            dataSources: [],
            status: "published",
            seoTitle: "Launch Story",
            seoDescription: "Launch story description",
            ogTitle: "Launch Story",
            ogDescription: "Launch story description",
            ogImageMediaId: "media-001",
            deploymentStatus: "clean",
            deploymentSyncedCount: 1,
            deploymentTargetCount: 1,
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
            title: "Story Shell"
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
    if (String(url).includes("/pages/page-001/preview-sources")) {
      return createJsonResponse(200, {
        ok: true,
        items: []
      });
    }

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

    return createJsonResponse(404, {
      ok: false,
      error: {
        message: "not found"
      }
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  const navigate = vi.fn();
  const handleSaveModuleSettings = vi.fn(async () => {});
  const moduleSettingsDomain = {
    moduleSettingsState: {
      loading: false,
      saving: false,
      errorMessage: null,
      successMessage: null,
      moduleId: "test-modules-pages",
      schema: {
        fields: [
          {
            id: "appMountTagName",
            label: "App Mount Tag Name",
            type: "text"
          }
        ]
      },
      draftValues: {
        appMountTagName: "app-root"
      }
    },
    activeModuleSettingsMeta: {
      moduleId: "test-modules-pages",
      state: "enabled"
    },
    activeModuleSettingsPersistencePolicy: null,
    isActiveModuleSettingsAvailable: true,
    handleSettingsFieldChange: vi.fn(),
    handleSaveModuleSettings
  };

  render(
    <BlogDistributionView
      activeModuleLabel="Pages"
      collectionsDomain={createCollectionsDomain()}
      moduleSettingsDomain={moduleSettingsDomain}
      navigate={navigate}
      route={{
        moduleId: "test-modules-pages",
        pageId: "page-001"
      }}
    />
  );

  await waitFor(() => {
    expect(screen.getByLabelText("App Mount Tag Name")).toBeInTheDocument();
    expect(screen.getByText("Launch Story")).toBeInTheDocument();
  });

  fireEvent.click(screen.getAllByText("Launch Story")[0]);

  const editSelectedLayoutButton = await screen.findByRole("button", {
    name: "Edit Selected Layout"
  });

  fireEvent.click(editSelectedLayoutButton);

  await waitFor(() => {
    expect(navigate).toHaveBeenCalledWith(
      {
        moduleId: "test-modules-layouts",
        layoutId: "layout-001",
        returnModuleId: "test-modules-pages",
        returnPageId: "page-001",
        returnTab: "overview"
      },
      { replace: false }
    );
  });

  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

  await waitFor(() => {
    expect(handleSaveModuleSettings).toHaveBeenCalled();
  });
}, 15000);
