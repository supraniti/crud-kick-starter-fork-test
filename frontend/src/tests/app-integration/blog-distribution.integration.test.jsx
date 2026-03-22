import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

test("pages backlog opens the workbench, previews output, and publishes the selected page", async () => {
  installReferenceMocks(referenceApi);
  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/pages/page-001/preview-sources")) {
      return createJsonResponse(200, {
        ok: true,
        items: [
          {
            id: "post-001",
            label: "Launch Window Update",
            path: "/stories/launch-window-update"
          }
        ]
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
          head: {
            title: "Launch Story SEO",
            description: "Launch story description",
            canonicalUrl: "https://content.example.com/stories/launch-window-update"
          },
          delivery: {
            publicOrigin: "https://content.example.com",
            publicUrl: "https://content.example.com/stories/launch-window-update"
          },
          runtime: {
            clientRuntime: {
              assetUrl: "../../assets/client-runtime.global.js",
              bootstrapDatasets: ["page-payload"],
              remote: {
                baseUrl: "https://content.example.com"
              },
              slots: [],
              queries: [
                {
                  resource: "page",
                  query: "current"
                }
              ],
              actions: [
                {
                  action: "page.refresh"
                }
              ],
              datasets: [
                {
                  dataset: "page-payload"
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
    expect(screen.getByRole("heading", { level: 4, name: "Pages" })).toBeInTheDocument();
    expect(screen.getByText("Launch Story")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Open" }));

  await waitFor(() => {
    expect(screen.getByDisplayValue("Launch Story")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Preview" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-pages/pages/page-001/delivery?preview=true&sourceItemId=post-001",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(screen.getByRole("heading", { name: "SEO + Output Forecast" })).toBeInTheDocument();
    expect(screen.getByText("https://content.example.com/stories/launch-window-update")).toBeInTheDocument();
    expect(screen.getByText(/SEO title:\s*Launch Story SEO/)).toBeInTheDocument();
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

test("pages quick-create flow creates a standalone page and redirect manager persists a redirect", async () => {
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

  render(
    <BlogDistributionView
      activeModuleLabel="Pages"
      collectionsDomain={createCollectionsDomain()}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "New Page" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "New Page" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Standalone Page" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getAllByRole("button", { name: /Choose This Type|Using This Type/i })[0]);

  await waitFor(() => {
    expect(screen.getByLabelText("Page Title")).toHaveValue("");
  });

  fireEvent.change(screen.getByLabelText("Page Title"), {
    target: {
      value: "Platform Landing"
    }
  });
  fireEvent.change(screen.getByLabelText(/Path/i), {
    target: {
      value: "/platform"
    }
  });

  fireEvent.click(screen.getByRole("button", { name: "Create Page" }));

  await waitFor(() => {
    expect(referenceApi.createReferenceCollectionItem).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "blog-pages",
        item: expect.objectContaining({
          title: "Platform Landing",
          path: "/platform",
          primarySourceType: "none"
        })
      })
    );
  });

  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  fireEvent.click(screen.getByRole("tab", { name: "Redirects" }));
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

test("pages workbench exposes structure tools, layout jump, and pages defaults", async () => {
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
          },
          delivery: {
            publicUrl: "https://content.example.com/stories/launch-window-update"
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
    expect(screen.getByDisplayValue("Launch Story")).toBeInTheDocument();
  });

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

  fireEvent.click(screen.getByRole("tab", { name: "More" }));
  fireEvent.click(screen.getByRole("button", { name: "Show Pages Defaults" }));

  await waitFor(() => {
    expect(screen.getByLabelText("App Mount Tag Name")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

  await waitFor(() => {
    expect(handleSaveModuleSettings).toHaveBeenCalled();
  });
}, 15000);
