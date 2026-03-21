import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MediaManagerView } from "../../../../modules/test-modules-media-manager/frontend/MediaManagerView.jsx";

const MODULE_ROUTE_BASE = "/api/reference/modules/test-modules-media-manager/media-items";
const EXISTING_JOB = {
  id: "job-existing",
  type: "mission:media-library-image-compression",
  status: "succeeded",
  createdAt: "2026-03-06T08:00:00.000Z",
  payload: {
    mediaItemId: "media-0001",
    preset: "thumbnail"
  },
  result: {
    output: {
      sourceMediaId: "media-0001",
      derivedMediaId: "media-0002"
    }
  }
};

class MockFileReader {
  readAsDataURL(file) {
    this.result = `data:${file.type};base64,AAAA`;
    if (typeof this.onload === "function") {
      this.onload();
    }
  }
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

function createCollectionsDomain() {
  return {
    activeCollectionId: "media-items",
    handleSelectCollection: vi.fn(),
    reloadCollectionItems: vi.fn().mockResolvedValue(undefined),
    handleCollectionFilterChange: vi.fn(),
    handleClearCollectionFilters: vi.fn(),
    collectionFilterState: {
      search: "",
      status: "",
      category: "",
      isDerived: ""
    },
    collectionItemsState: {
      loading: false,
      errorMessage: null,
      items: [
        {
          id: "media-0001",
          displayName: "Hero Banner",
          mediaKind: "image",
          mimeType: "image/png",
          fileSizeBytes: 67,
          width: 1,
          height: 1,
          status: "ready",
          altText: "Original alt",
          description: "Original description",
          category: "library",
          usageLabels: ["hero"],
          isDerived: false,
          sourceMediaId: null,
          operationPreset: "original",
          storageKey: "originals/media-0001.png",
          relativePath: "originals/media-0001.png",
          createdOn: "2026-03-06T09:00:00.000Z",
          updatedOn: "2026-03-06T09:10:00.000Z"
        },
        {
          id: "media-0002",
          displayName: "Hero Banner (Thumbnail)",
          mediaKind: "image",
          mimeType: "image/jpeg",
          fileSizeBytes: 52,
          width: 1,
          height: 1,
          status: "ready",
          altText: "",
          description: "",
          category: "library",
          usageLabels: ["thumbnail"],
          isDerived: true,
          sourceMediaId: "media-0001",
          operationPreset: "thumbnail",
          storageKey: "derived/media-0001/media-0002-thumbnail.jpg",
          relativePath: "derived/media-0001/media-0002-thumbnail.jpg",
          createdOn: "2026-03-06T09:05:00.000Z",
          updatedOn: "2026-03-06T09:05:00.000Z"
        }
      ]
    }
  };
}

function createFetchMock() {
  return vi.fn(async (url, options = {}) => {
    const method = options.method ?? "GET";

    if (typeof url === "string" && url.startsWith("/api/reference/collections/blog-authors/items") && method === "GET") {
      return createJsonResponse(200, {
        ok: true,
        items: [
          {
            id: "author-001",
            displayName: "Alice Stone",
            avatarMediaId: "media-0001"
          }
        ]
      });
    }

    if (typeof url === "string" && url.startsWith("/api/reference/collections/blog-posts/items") && method === "GET") {
      return createJsonResponse(200, {
        ok: true,
        items: [
          {
            id: "post-001",
            title: "Hero Story",
            featuredMediaId: "media-0001",
            ogImageMediaId: "media-0002",
            galleryMediaIds: ["media-0001"]
          }
        ]
      });
    }

    if (typeof url === "string" && url.startsWith("/api/reference/collections/blog-categories/items") && method === "GET") {
      return createJsonResponse(200, {
        ok: true,
        items: [
          {
            id: "category-001",
            name: "Guides",
            featuredMediaId: "media-0002"
          }
        ]
      });
    }

    if (typeof url === "string" && url.startsWith("/api/reference/collections/blog-pages/items") && method === "GET") {
      return createJsonResponse(200, {
        ok: true,
        items: [
          {
            id: "page-001",
            title: "Story Page",
            heroMediaId: "media-0001"
          }
        ]
      });
    }

    if (url === "/api/reference/missions/jobs" && method === "GET") {
      return createJsonResponse(200, {
        ok: true,
        items: [EXISTING_JOB]
      });
    }

    if (url === `${MODULE_ROUTE_BASE}/uploads` && method === "POST") {
      return createJsonResponse(201, {
        ok: true,
        item: {
          id: "media-0100"
        }
      });
    }

    if (url === `${MODULE_ROUTE_BASE}/media-0001/metadata` && method === "PUT") {
      return createJsonResponse(200, {
        ok: true,
        item: {
          id: "media-0001"
        }
      });
    }

    if (url === "/api/reference/missions/media-library-image-compression/jobs" && method === "POST") {
      return createJsonResponse(202, {
        ok: true,
        job: {
          id: "job-new",
          status: "queued"
        }
      });
    }

    if (url === `${MODULE_ROUTE_BASE}/media-0001` && method === "DELETE") {
      return createJsonResponse(200, {
        ok: true
      });
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
  });
}

function findFetchCall(fetchMock, url, method) {
  return fetchMock.mock.calls.find(([calledUrl, calledOptions = {}]) => {
    return calledUrl === url && (calledOptions.method ?? "GET") === method;
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("media manager view renders mission history and uses module-owned media routes for mutations", async () => {
  const collectionsDomain = createCollectionsDomain();
  const fetchMock = createFetchMock();
  const navigate = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("FileReader", MockFileReader);
  vi.spyOn(window, "confirm").mockReturnValue(true);

  const { container } = render(
    <MediaManagerView
      activeModuleLabel="Media Manager"
      collectionsDomain={collectionsDomain}
      navigate={navigate}
      route={{ mediaId: "media-0001", mediaTab: "details" }}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Local Media Library" })).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(screen.getByText("job-existing")).toBeInTheDocument();
  });

  const fileInput = container.querySelector('input[type="file"]');
  fireEvent.change(fileInput, {
    target: {
      files: [new File(["pixel"], "hero.png", { type: "image/png" })]
    }
  });

  await waitFor(() => {
    expect(findFetchCall(fetchMock, `${MODULE_ROUTE_BASE}/uploads`, "POST")).toBeTruthy();
    expect(collectionsDomain.reloadCollectionItems).toHaveBeenCalled();
  });

  const uploadCall = findFetchCall(fetchMock, `${MODULE_ROUTE_BASE}/uploads`, "POST");
  expect(JSON.parse(uploadCall[1].body)).toEqual(
    expect.objectContaining({
      fileName: "hero.png",
      mimeType: "image/png",
      contentBase64: "AAAA"
    })
  );

  fireEvent.click(screen.getByRole("tab", { name: "Details" }));

  await waitFor(() => {
    expect(screen.getByLabelText("Alt text")).toHaveValue("Original alt");
  });

  fireEvent.change(screen.getByLabelText("Alt text"), {
    target: {
      value: "Updated alt"
    }
  });

  await waitFor(() => {
    expect(screen.getByLabelText("Alt text")).toHaveValue("Updated alt");
  });

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(findFetchCall(fetchMock, `${MODULE_ROUTE_BASE}/media-0001/metadata`, "PUT")).toBeTruthy();
  });

  const metadataCall = findFetchCall(fetchMock, `${MODULE_ROUTE_BASE}/media-0001/metadata`, "PUT");
  expect(JSON.parse(metadataCall[1].body)).toEqual(
    expect.objectContaining({
      displayName: "Hero Banner",
      altText: "Updated alt",
      category: "library",
      usageLabels: ["hero"]
    })
  );

  fireEvent.click(screen.getByRole("tab", { name: "Details" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Create Web Optimized" })[0]);
  await waitFor(() => {
    expect(
      findFetchCall(fetchMock, "/api/reference/missions/media-library-image-compression/jobs", "POST")
    ).toBeTruthy();
  });

  const missionCall = findFetchCall(
    fetchMock,
    "/api/reference/missions/media-library-image-compression/jobs",
    "POST"
  );
  expect(JSON.parse(missionCall[1].body)).toEqual({
    mediaItemId: "media-0001",
    preset: "web-optimized"
  });

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => {
    expect(findFetchCall(fetchMock, `${MODULE_ROUTE_BASE}/media-0001`, "DELETE")).toBeTruthy();
  });

  expect(window.confirm).toHaveBeenCalledWith(
    "Delete 'Hero Banner' from the media library?"
  );
}, 15000);

test("media manager filters call the collection domain with field id and value", async () => {
  const collectionsDomain = createCollectionsDomain();
  const fetchMock = createFetchMock();
  const navigate = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  render(
    <MediaManagerView
      activeModuleLabel="Media Manager"
      collectionsDomain={collectionsDomain}
      route={{}}
      navigate={navigate}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Local Media Library" })).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText("Search"), {
    target: {
      value: "Hero"
    }
  });
  fireEvent.mouseDown(screen.getByLabelText("Asset Type"));
  fireEvent.click(screen.getByRole("option", { name: "Derived" }));

  expect(collectionsDomain.handleCollectionFilterChange).toHaveBeenNthCalledWith(
    1,
    "search",
    "Hero"
  );
  expect(collectionsDomain.handleCollectionFilterChange).toHaveBeenNthCalledWith(
    2,
    "isDerived",
    "true"
  );
  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({
      search: "Hero"
    }),
    { replace: true }
  );
});

test("media manager embeds remote media compare, sync, and restore procedures", async () => {
  const collectionsDomain = createCollectionsDomain();
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = options.method ?? "GET";

    if (url === "/api/reference/missions/jobs" && method === "GET") {
      return createJsonResponse(200, {
        ok: true,
        items: [EXISTING_JOB]
      });
    }

    if (url === "/api/reference/modules/test-modules-remote-ops/targets/target-media/compare" && method === "POST") {
      return createJsonResponse(200, {
        ok: true,
        message: "Compared media target"
      });
    }

    if (url === "/api/reference/modules/test-modules-remote-ops/targets/target-media/execute" && method === "POST") {
      return createJsonResponse(200, {
        ok: true,
        message: "Synced media target"
      });
    }

    if (url === "/api/reference/modules/test-modules-remote-ops/targets/target-media/restore" && method === "POST") {
      return createJsonResponse(200, {
        ok: true,
        message: "Restored media target"
      });
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const navigate = vi.fn();
  const moduleSettingsDomain = {
    moduleSettingsState: {
      loading: false,
      saving: false,
      errorMessage: null,
      successMessage: null,
      moduleId: "test-modules-media-manager",
      schema: { fields: [] },
      draftValues: {
        remoteMediaTargetProfileId: "target-media"
      }
    },
    activeModuleSettingsMeta: { moduleId: "test-modules-media-manager", state: "enabled" },
    activeModuleSettingsPersistencePolicy: null,
    isActiveModuleSettingsAvailable: true,
    handleSettingsFieldChange: vi.fn(),
    handleSaveModuleSettings: vi.fn(async () => {})
  };

  const actualReferenceApi = await vi.importActual("../../api/reference.js");
  vi.spyOn(actualReferenceApi, "fetchReferenceCollectionItems").mockImplementation(async ({ collectionId, offset = 0 }) => {
    if (collectionId === "blog-authors") {
      return { items: [] };
    }

    if (collectionId === "blog-posts") {
      return { items: [] };
    }

    if (collectionId === "blog-categories") {
      return { items: [] };
    }

    if (collectionId === "blog-pages") {
      return { items: [] };
    }

    if (collectionId === "remote-target-profiles") {
      return {
        items: [
          {
            id: "target-media",
            title: "Media Bucket",
            targetKind: "media-storage",
            adapterMode: "live-gcp",
            targetStatus: "validated",
            compareSummary: {
              createCount: 0,
              updateCount: 1,
              deleteCount: 0,
              localOnlyCount: 0,
              remoteOnlyCount: 1
            }
          }
        ]
      };
    }

    if (collectionId === "remote-operation-runs") {
      return {
        items: [
          {
            id: "run-media",
            targetProfileId: "target-media",
            procedureType: "compare",
            status: "succeeded",
            finishedOn: "2026-03-12T12:00:00.000Z"
          }
        ]
      };
    }

    if (collectionId === "remote-connection-profiles") {
      return { items: [] };
    }

    return { items: [] };
  });

  render(
    <MediaManagerView
      activeModuleLabel="Media Manager"
      collectionsDomain={collectionsDomain}
      moduleSettingsDomain={moduleSettingsDomain}
      navigate={navigate}
      route={{ mediaId: "media-0001", mediaTab: "publish" }}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("tab", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByText("Artifact Links")).toBeInTheDocument();
  });

  expect(
    screen.getAllByText("Media Bucket is connected and ready for compare or sync.").length
  ).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("tab", { name: "Publish" }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Show Remote Sync" })).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole("button", { name: "Show Remote Sync" }));

  fireEvent.click(screen.getByRole("button", { name: "Compare Remote" }));
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-media/compare",
      expect.objectContaining({ method: "POST" })
    );
  });

  fireEvent.click(screen.getByRole("button", { name: "Sync Remote Media" }));
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-media/execute",
      expect.objectContaining({ method: "POST" })
    );
  });
  await waitFor(() => {
    expect(screen.getAllByText("Synced media target").length).toBeGreaterThan(0);
  });

  fireEvent.click(screen.getByRole("button", { name: "Restore Missing Local File" }));
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-media/restore",
      expect.objectContaining({ method: "POST" })
    );
  });

  fireEvent.click(screen.getByRole("button", { name: "Open Remotes" }));

  expect(navigate).toHaveBeenCalledWith(
    {
      moduleId: "test-modules-remote-ops",
      tab: "targets",
      targetId: "target-media"
    },
    { replace: false }
  );
}, 25000);

test("media manager surfaces sync posture, artifact urls, and remote-only visibility", async () => {
  const collectionsDomain = createCollectionsDomain();
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = options.method ?? "GET";

    if (url === "/api/reference/missions/jobs" && method === "GET") {
      return createJsonResponse(200, {
        ok: true,
        items: [EXISTING_JOB]
      });
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const moduleSettingsDomain = {
    moduleSettingsState: {
      loading: false,
      saving: false,
      errorMessage: null,
      successMessage: null,
      moduleId: "test-modules-media-manager",
      schema: { fields: [] },
      draftValues: {
        remoteMediaTargetProfileId: "target-media"
      }
    },
    activeModuleSettingsMeta: { moduleId: "test-modules-media-manager", state: "enabled" },
    activeModuleSettingsPersistencePolicy: null,
    isActiveModuleSettingsAvailable: true,
    handleSettingsFieldChange: vi.fn(),
    handleSaveModuleSettings: vi.fn(async () => {})
  };

  const actualReferenceApi = await vi.importActual("../../api/reference.js");
  vi.spyOn(actualReferenceApi, "fetchReferenceCollectionItems").mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-authors") {
      return { items: [] };
    }

    if (collectionId === "blog-posts") {
      return { items: [] };
    }

    if (collectionId === "blog-categories") {
      return { items: [] };
    }

    if (collectionId === "blog-pages") {
      return { items: [] };
    }

    if (collectionId === "remote-target-profiles") {
      return {
        items: [
          {
            id: "target-media",
            title: "Media Bucket",
            connectionProfileId: "connection-1",
            targetKind: "media-storage",
            adapterMode: "live-gcp",
            targetStatus: "validated",
            compareSummary: {
              createCount: 0,
              updateCount: 0,
              deleteCount: 0,
              localOnlyCount: 0,
              remoteOnlyCount: 2,
              sampleKeys: [
                "library/orphans/legacy-banner.png",
                "library/orphans/legacy-thumb.jpg"
              ]
            },
            config: {
              bucketName: "merchant-guild-media-679134333951",
              prefix: "library"
            }
          },
          {
            id: "target-browser",
            title: "Public Browser Delivery",
            connectionProfileId: "connection-1",
            targetKind: "browser-delivery",
            adapterMode: "live-gcp",
            targetStatus: "validated",
            config: {
              accessMode: "custom-domain",
              stackMode: "https-load-balancer",
              dnsMode: "external",
              hostname: "cdn.merchant-guild.example",
              mediaTargetProfileId: "target-media",
              deploymentTargetProfileId: "target-deployment"
            }
          },
          {
            id: "target-deployment",
            title: "HTML Deployment",
            connectionProfileId: "connection-1",
            targetKind: "deployment-storage",
            adapterMode: "live-gcp",
            targetStatus: "validated",
            config: {
              bucketName: "merchant-guild-deployment-679134333951",
              prefix: "site"
            }
          }
        ]
      };
    }

    if (collectionId === "remote-operation-runs") {
      if (offset === 0) {
        return {
          items: Array.from({ length: 200 }, (_, index) => ({
            id: `run-media-compare-${index + 1}`,
            targetProfileId: "target-media",
            procedureType: "compare",
            status: "succeeded",
            finishedOn: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`
          })),
          meta: {
            total: 201
          }
        };
      }
      return {
        items: [
          {
            id: "run-media-execute",
            targetProfileId: "target-media",
            procedureType: "execute",
            status: "succeeded",
            finishedOn: "2026-03-12T12:00:00.000Z"
          }
        ],
        meta: {
          total: 201
        }
      };
    }

    if (collectionId === "remote-connection-profiles") {
      return { items: [] };
    }

    return { items: [] };
  });

  render(
    <MediaManagerView
      activeModuleLabel="Media Manager"
      collectionsDomain={collectionsDomain}
      moduleSettingsDomain={moduleSettingsDomain}
      navigate={vi.fn()}
      route={{ mediaId: "media-0001", mediaTab: "publish", mediaView: "list" }}
    />
  );

  await waitFor(() => {
    expect(screen.getByText("Selection And Bulk Actions")).toBeInTheDocument();
    expect(screen.getByText("Total Assets")).toBeInTheDocument();
  });

  fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Select Visible" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare Remote Target" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync Remote Target" })).toBeInTheDocument();
    expect(screen.getAllByText("Synced").length).toBeGreaterThan(0);
    expect(screen.getByText("Artifact Links")).toBeInTheDocument();
  }, { timeout: 5000 });
}, 15000);

test("media manager shows usage awareness and keeps selected asset state in the route", async () => {
  const collectionsDomain = createCollectionsDomain();
  const fetchMock = createFetchMock();
  const navigate = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  render(
    <MediaManagerView
      activeModuleLabel="Media Manager"
      collectionsDomain={collectionsDomain}
      route={{ mediaId: "media-0001", mediaTab: "usage", mediaSort: "usage-desc" }}
      navigate={navigate}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("tab", { name: "Usage" })).toBeInTheDocument();
    expect(
      screen.getByText("See where the current asset appears across authors, posts, taxonomies, and pages.")
    ).toBeInTheDocument();
  });

  expect(screen.getByText("Alice Stone")).toBeInTheDocument();
  expect(screen.getAllByText("Hero Story").length).toBeGreaterThan(0);
  expect(screen.getByText("Story Page")).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("button", { name: "Open" })[0]);

  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({
      moduleId: "authors",
      authorId: "author-001"
    }),
    { replace: false }
  );
}, 15000);
