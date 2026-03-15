import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BlogContentView } from "../../../../modules/test-modules-content/frontend/BlogContentView.jsx";
import * as referenceApi from "../../api/reference.js";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    fetchReferenceCollectionItems: vi.fn(),
    createReferenceCollectionItem: vi.fn(),
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
          id: "blog-posts",
          label: "Posts",
          capabilities: {
            create: true,
            update: true,
            delete: false
          }
        }
      ]
    },
    collectionSchemaState: {
      loading: false,
      errorMessage: null,
      collection: {
        id: "blog-posts",
        label: "Posts",
        entitySingular: "post",
        fields: []
      }
    },
    collectionItemsState: {
      loading: false,
      errorMessage: null,
      items: [
        {
          id: "post-001",
          title: "Launch Post",
          excerpt: "Launch excerpt",
          body: "<p>Body content</p>".repeat(30),
          status: "draft",
          format: "article",
          primaryAuthorId: "author-001",
          coAuthorIds: [],
          categoryIds: ["cat-001"],
          tagIds: ["tag-001"],
          featuredMediaId: "media-001",
          galleryMediaIds: [],
          allowComments: true,
          commentPolicy: "open",
          seoTitle: "Launch SEO",
          seoDescription: "Launch description",
          ogTitle: "Launch OG",
          ogDescription: "Launch OG description",
          ogImageMediaId: "media-001",
          createdByAuthorId: "author-001",
          updatedByAuthorId: "author-001",
          createdOn: "2026-03-08T10:00:00.000Z",
          updatedOn: "2026-03-08T10:05:00.000Z",
          wordCount: 400,
          readTimeMinutes: 2
        }
      ],
      meta: {
        total: 1,
        offset: 0,
        limit: 200
      }
    },
    referenceOptionsState: {
      "blog-authors": {
        items: [
          { id: "author-001", label: "Alice Stone" },
          { id: "author-002", label: "Mika North" }
        ]
      },
      "blog-categories": {
        items: [
          { id: "cat-001", label: "Guides" },
          { id: "cat-002", label: "DevOps" }
        ]
      },
      "blog-tags": {
        items: [
          { id: "tag-001", label: "Release Ops" },
          { id: "tag-002", label: "Platform" }
        ]
      },
      "media-items": {
        items: [
          { id: "media-001", label: "Launch Hero" },
          { id: "media-002", label: "Diagram" }
        ]
      }
    },
    activeCollectionId: "blog-posts",
    isActiveCollectionAvailable: true,
    activeCollectionUnavailableMessage: null,
    collectionFilterState: {
      search: "",
      status: "",
      format: "",
      primaryAuthorId: ""
    },
    handleSelectCollection: vi.fn(),
    handleCollectionFilterChange: vi.fn(),
    handleClearCollectionFilters: vi.fn(),
    reloadCollectionItems: vi.fn()
  };
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

function installContentFetchMocks({ revisions = [], pages = [] } = {}) {
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-post-revisions") {
      return {
        ok: true,
        items: revisions
      };
    }

    if (collectionId === "blog-pages") {
      return {
        ok: true,
        items: pages
      };
    }

    return {
      ok: true,
      items: []
    };
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("blog content view renders custom editor and revision timeline", async () => {
  installContentFetchMocks({
    revisions: [
      {
        id: "rev-002",
        revisionNumber: 2,
        titleSnapshot: "Launch Post Revised",
        bodySnapshot: "<p>Updated body</p>",
        taxonomySnapshot: {
          categoryIds: ["cat-001"],
          tagIds: ["tag-001"]
        },
        mediaSnapshot: {
          featuredMediaId: "media-001",
          galleryMediaIds: [],
          ogImageMediaId: "media-001"
        },
        seoSnapshot: {
          seoTitle: "Launch SEO",
          seoDescription: "Launch description",
          ogTitle: "Launch OG",
          ogDescription: "Launch OG description"
        },
        statusSnapshot: "in-review",
        changedByAuthorId: "author-001",
        changedOn: "2026-03-08T10:06:00.000Z",
        source: "manual"
      }
    ]
  });

  render(
    <BlogContentView activeModuleLabel="Content" collectionsDomain={createCollectionsDomain()} />
  );

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Content Desk" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Post Editor" })).toBeInTheDocument();
    expect(screen.getByText("Launch Post")).toBeInTheDocument();
    expect(screen.getByText("Revision Timeline")).toBeInTheDocument();
    expect(screen.getByText("Rev 2")).toBeInTheDocument();
    expect(
      screen.getByText("Standalone pages and deployed post templates are managed in the Pages module.")
    ).toBeInTheDocument();
  });
}, 12000);

test("blog content view surfaces authoring readiness and cross-module navigation hints", async () => {
  installContentFetchMocks({
    pages: [
      {
        id: "page-011",
        title: "Launch Post Page",
        status: "published",
        deploymentMode: "single-page",
        primarySourceType: "blog-post",
        primarySource: {
          sourceType: "blog-post",
          itemId: "post-001"
        }
      }
    ]
  });

  const navigate = vi.fn();
  render(<BlogContentView activeModuleLabel="Content" collectionsDomain={createCollectionsDomain()} navigate={navigate} />);

  await waitFor(() => {
    expect(screen.getByText("Authoring Readiness")).toBeInTheDocument();
    expect(screen.getByText(/Primary author: Alice Stone/i)).toBeInTheDocument();
    expect(screen.getByText(/Featured media: Launch Hero/i)).toBeInTheDocument();
    expect(screen.getByText(/Impacted pages: Launch Post Page/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Open Taxonomies" }));

  expect(navigate).toHaveBeenCalledWith({ moduleId: "test-modules-taxonomy" }, { replace: false });
}, 15000);

test("blog content editor saves posts and restores revisions through the module route", async () => {
  installContentFetchMocks({
    revisions: [
      {
        id: "rev-001",
        revisionNumber: 1,
        titleSnapshot: "Launch Post",
        bodySnapshot: "<p>Original body</p>",
        taxonomySnapshot: {
          categoryIds: ["cat-001"],
          tagIds: ["tag-001"]
        },
        mediaSnapshot: {
          featuredMediaId: "media-001",
          galleryMediaIds: [],
          ogImageMediaId: "media-001"
        },
        seoSnapshot: {
          seoTitle: "Launch SEO",
          seoDescription: "Launch description",
          ogTitle: "Launch OG",
          ogDescription: "Launch OG description"
        },
        statusSnapshot: "draft",
        changedByAuthorId: "author-001",
        changedOn: "2026-03-08T10:00:00.000Z",
        source: "manual"
      }
    ]
  });
  referenceApi.updateReferenceCollectionItem.mockResolvedValue({
    ok: true,
    item: {
      id: "post-001",
      title: "Launch Post Updated",
      excerpt: "Launch excerpt",
      body: "<p>Updated body</p>",
      status: "draft",
      format: "article",
      primaryAuthorId: "author-001",
      coAuthorIds: [],
      categoryIds: ["cat-001"],
      tagIds: ["tag-001"],
      featuredMediaId: "media-001",
      galleryMediaIds: [],
      allowComments: true,
      commentPolicy: "open",
      createdByAuthorId: "author-001",
      updatedByAuthorId: "author-001"
    }
  });
  const fetchMock = vi.fn(async () =>
    createJsonResponse(200, {
      ok: true,
      item: {
        id: "post-001",
        title: "Launch Post",
        excerpt: "Launch excerpt",
        body: "<p>Original body</p>",
        status: "draft",
        format: "article",
        primaryAuthorId: "author-001",
        coAuthorIds: [],
        categoryIds: ["cat-001"],
        tagIds: ["tag-001"],
        featuredMediaId: "media-001",
        galleryMediaIds: [],
        allowComments: true,
        commentPolicy: "open",
        createdByAuthorId: "author-001",
        updatedByAuthorId: "author-001"
      }
    })
  );
  vi.stubGlobal("fetch", fetchMock);

  const collectionsDomain = createCollectionsDomain();

  render(<BlogContentView activeModuleLabel="Content" collectionsDomain={collectionsDomain} />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Save Post" })).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText("Title"), {
    target: {
      value: "Launch Post Updated"
    }
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Post" }));

  await waitFor(() => {
    expect(referenceApi.updateReferenceCollectionItem).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "blog-posts",
        itemId: "post-001"
      })
    );
  });

  fireEvent.click(screen.getByRole("button", { name: "Restore Selected Revision" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-content/posts/post-001/restore-revision",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(collectionsDomain.reloadCollectionItems).toHaveBeenCalled();
  });
}, 20000);

test("blog content editor keeps the newly created draft selected before collection reload catches up", async () => {
  installContentFetchMocks();
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-post-revisions") {
      return {
        ok: true,
        items: []
      };
    }

    return {
      ok: true,
      items: []
    };
  });
  referenceApi.createReferenceCollectionItem.mockResolvedValue({
    ok: true,
    item: {
      id: "post-002",
      title: "Created Draft",
      subtitle: "Fresh draft subtitle",
      excerpt: "Fresh draft excerpt",
      body: "<p>Fresh draft body</p>",
      status: "draft",
      format: "article",
      primaryAuthorId: "author-001",
      coAuthorIds: [],
      categoryIds: ["cat-001"],
      tagIds: ["tag-001"],
      featuredMediaId: "media-001",
      galleryMediaIds: [],
      allowComments: true,
      commentPolicy: "open",
      seoTitle: "Created Draft",
      seoDescription: "Fresh draft excerpt",
      ogTitle: "Created Draft",
      ogDescription: "Fresh draft excerpt",
      ogImageMediaId: "media-001",
      createdByAuthorId: "author-001",
      updatedByAuthorId: "author-001"
    }
  });

  const collectionsDomain = createCollectionsDomain();

  render(<BlogContentView activeModuleLabel="Content" collectionsDomain={collectionsDomain} />);

  await waitFor(() => {
    expect(screen.getAllByRole("button", { name: "New Draft" }).length).toBeGreaterThan(0);
  });

  fireEvent.click(screen.getAllByRole("button", { name: "New Draft" })[1]);
  fireEvent.change(screen.getByLabelText("Title"), {
    target: {
      value: "Created Draft"
    }
  });
  fireEvent.change(screen.getByLabelText("Body (Sanitized HTML)"), {
    target: {
      value: "<p>Fresh draft body</p>"
    }
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Post" }));

  await waitFor(() => {
    expect(referenceApi.createReferenceCollectionItem).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "blog-posts"
      })
    );
    expect(screen.getByLabelText("Title")).toHaveValue("Created Draft");
    expect(screen.getByText("Post created")).toBeInTheDocument();
  });
}, 30000);

test("blog content view surfaces deployment impact for published posts and routes to the pages desk", async () => {
  installContentFetchMocks({
    pages: [
      {
        id: "page-010",
        title: "Posts Page",
        status: "published",
        deploymentMode: "per-record",
        primarySourceType: "blog-post",
        sourceSelectionMode: "all-records",
        pathPattern: "/posts/{slug}",
        deploymentStatus: "stale",
        deploymentSyncedCount: 1,
        deploymentTargetCount: 2
      }
    ]
  });
  const navigate = vi.fn();
  const collectionsDomain = createCollectionsDomain();
  collectionsDomain.collectionItemsState.items[0].status = "published";

  render(
    <BlogContentView
      activeModuleLabel="Content"
      collectionsDomain={collectionsDomain}
      navigate={navigate}
    />
  );

  await waitFor(() => {
    expect(screen.getByText("Deployment Impact")).toBeInTheDocument();
    expect(screen.getByText("Posts Page")).toBeInTheDocument();
  });

  fireEvent.click(screen.getAllByRole("button", { name: "Open Pages" }).at(-1));

  expect(navigate).toHaveBeenCalledWith(
    {
      moduleId: "test-modules-pages",
      pageId: "page-010"
    },
    { replace: false }
  );
}, 15000);

test("blog content view embeds remote projection compare and sync actions", async () => {
  installContentFetchMocks({
    pages: [
      {
        id: "page-010",
        title: "Posts Page",
        status: "published",
        deploymentMode: "per-record",
        primarySourceType: "blog-post",
        sourceSelectionMode: "all-records",
        pathPattern: "/posts/{slug}",
        deploymentStatus: "clean",
        deploymentSyncedCount: 2,
        deploymentTargetCount: 2
      }
    ]
  });

  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "blog-post-revisions") {
      return { ok: true, items: [] };
    }
    if (collectionId === "blog-pages") {
      return {
        ok: true,
        items: [
          {
            id: "page-010",
            title: "Posts Page",
            status: "published",
            deploymentMode: "per-record",
            primarySourceType: "blog-post",
            sourceSelectionMode: "all-records",
            pathPattern: "/posts/{slug}",
            deploymentStatus: "clean",
            deploymentSyncedCount: 2,
            deploymentTargetCount: 2
          }
        ]
      };
    }
    if (collectionId === "remote-target-profiles") {
      return {
        ok: true,
        items: [
          {
            id: "target-firestore",
            title: "Posts Projection",
            targetKind: "firestore-projection",
            adapterMode: "live-gcp",
            targetStatus: "validated",
            compareSummary: {
              createCount: 0,
              updateCount: 1,
              deleteCount: 0,
              localOnlyCount: 0,
              remoteOnlyCount: 0
            }
          }
        ]
      };
    }
    if (collectionId === "remote-operation-runs") {
      return {
        ok: true,
        items: [
          {
            id: "run-010",
            targetProfileId: "target-firestore",
            procedureType: "compare",
            status: "succeeded",
            finishedOn: "2026-03-12T12:00:00.000Z"
          }
        ]
      };
    }
    if (collectionId === "remote-connection-profiles") {
      return {
        ok: true,
        items: []
      };
    }
    return { ok: true, items: [] };
  });

  const fetchMock = vi.fn(async (url) => {
    if (String(url).includes("/targets/target-firestore/compare")) {
      return createJsonResponse(200, {
        ok: true,
        message: "Compared projection"
      });
    }
    if (String(url).includes("/targets/target-firestore/execute")) {
      return createJsonResponse(200, {
        ok: true,
        message: "Synced projection"
      });
    }
    return createJsonResponse(200, { ok: true, item: { id: "noop" } });
  });
  vi.stubGlobal("fetch", fetchMock);

  const navigate = vi.fn();
  const collectionsDomain = createCollectionsDomain();
  collectionsDomain.collectionItemsState.items[0].status = "published";
  const moduleSettingsDomain = {
    moduleSettingsState: {
      loading: false,
      saving: false,
      errorMessage: null,
      successMessage: null,
      moduleId: "test-modules-content",
      schema: { fields: [] },
      draftValues: {
        remoteProjectionTargetProfileId: "target-firestore"
      }
    },
    activeModuleSettingsMeta: { moduleId: "test-modules-content", state: "enabled" },
    activeModuleSettingsPersistencePolicy: null,
    isActiveModuleSettingsAvailable: true,
    handleSettingsFieldChange: vi.fn(),
    handleSaveModuleSettings: vi.fn(async () => {})
  };

  render(
    <BlogContentView
      activeModuleLabel="Content"
      collectionsDomain={collectionsDomain}
      moduleSettingsDomain={moduleSettingsDomain}
      navigate={navigate}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Compare Projection" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Compare Projection" }));
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-firestore/compare",
      expect.objectContaining({ method: "POST" })
    );
  });

  fireEvent.click(screen.getByRole("button", { name: "Sync Projection" }));
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-remote-ops/targets/target-firestore/execute",
      expect.objectContaining({ method: "POST" })
    );
  });

  fireEvent.click(screen.getByRole("button", { name: "Open Remotes" }));

  expect(navigate).toHaveBeenCalledWith(
    {
      moduleId: "test-modules-remote-ops",
      tab: "targets",
      targetId: "target-firestore"
    },
    { replace: false }
  );
}, 15000);
