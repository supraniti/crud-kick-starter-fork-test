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

function createPostItem(index) {
  return {
    id: `post-${String(index).padStart(3, "0")}`,
    title: `Launch Post ${index}`,
    subtitle: `Launch subtitle ${index}`,
    excerpt: `Launch excerpt ${index}`,
    body: "<p>Body content</p>".repeat(30),
    status: index % 2 === 0 ? "published" : "draft",
    format: "article",
    primaryAuthorId: "author-001",
    coAuthorIds: [],
    categoryIds: ["cat-001"],
    tagIds: ["tag-001"],
    featuredMediaId: "media-001",
    galleryMediaIds: [],
    allowComments: true,
    commentPolicy: "open",
    seoTitle: `Launch SEO ${index}`,
    seoDescription: `Launch description ${index}`,
    ogTitle: `Launch OG ${index}`,
    ogDescription: `Launch OG description ${index}`,
    ogImageMediaId: "media-001",
    createdByAuthorId: "author-001",
    updatedByAuthorId: "author-001",
    createdOn: `2026-03-${String(index).padStart(2, "0")}T10:00:00.000Z`,
    updatedOn: `2026-03-${String(index).padStart(2, "0")}T10:05:00.000Z`,
    wordCount: 400,
    readTimeMinutes: 2
  };
}

function createCollectionsDomain(items = [createPostItem(1)]) {
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
      items,
      meta: {
        total: items.length,
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

test("posts view keeps the editorial backlog on the page and opens one story in a drawer", async () => {
  installContentFetchMocks({
    pages: [
      {
        id: "page-011",
        title: "Launch Post Page",
        status: "published",
        deploymentStatus: "clean",
        deploymentMode: "single-page",
        primarySourceType: "blog-post",
        primarySource: {
          sourceType: "blog-post",
          itemId: "post-001"
        },
        path: "/launch-post"
      }
    ]
  });

  render(<BlogContentView activeModuleLabel="Content" collectionsDomain={createCollectionsDomain()} />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Editorial Backlog" })).toBeInTheDocument();
    expect(screen.getByText("Launch Post 1")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Launch Post 1"));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Launch Post 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Write The Post" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Publish" })).toBeInTheDocument();
  });
}, 15000);

test("posts view restores filter and publish state from the URL", async () => {
  installContentFetchMocks({
    pages: [
      {
        id: "page-011",
        title: "Launch Post Page",
        status: "published",
        deploymentStatus: "stale",
        deploymentMode: "single-page",
        primarySourceType: "blog-post",
        primarySource: {
          sourceType: "blog-post",
          itemId: "post-001"
        },
        path: "/launch-post"
      }
    ]
  });

  const collectionsDomain = createCollectionsDomain();

  render(
    <BlogContentView
      activeModuleLabel="Content"
      collectionsDomain={collectionsDomain}
      route={{
        postSearch: "Launch",
        postStatus: "published",
        postId: "post-001",
        postEditorSection: "publish"
      }}
    />
  );

  await waitFor(() => {
    expect(collectionsDomain.handleCollectionFilterChange).toHaveBeenCalledWith("search", "Launch");
    expect(collectionsDomain.handleCollectionFilterChange).toHaveBeenCalledWith("status", "published");
    expect(screen.getByRole("heading", { name: "Publication Path" })).toBeInTheDocument();
  });

  expect(screen.getByDisplayValue("Launch")).toBeInTheDocument();
  expect(screen.getByText("The page template exists, but the public HTML needs a fresh release before this story is live.")).toBeInTheDocument();
}, 15000);

test("posts view keeps route-backed pagination aligned with the visible backlog", async () => {
  installContentFetchMocks();

  render(
    <BlogContentView
      activeModuleLabel="Content"
      collectionsDomain={createCollectionsDomain(Array.from({ length: 20 }, (_entry, index) => createPostItem(index + 1)))}
      route={{
        postPage: "2"
      }}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Editorial Backlog" })).toBeInTheDocument();
    expect(screen.getByText("Launch Post 12")).toBeInTheDocument();
  });

  expect(screen.queryByText("Launch Post 20")).not.toBeInTheDocument();
  expect(screen.queryByText("Launch Post 1")).not.toBeInTheDocument();
}, 15000);

test("posts media tab uses the gallery picker flow", async () => {
  installContentFetchMocks();

  render(
    <BlogContentView
      activeModuleLabel="Content"
      collectionsDomain={createCollectionsDomain()}
      route={{
        postId: "post-001",
        postEditorSection: "media"
      }}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("tab", { name: "Media", selected: true })).toBeInTheDocument();
  });

  fireEvent.click(screen.getAllByRole("button", { name: "Choose" })[0]);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Choose Featured Image" })).toBeInTheDocument();
  });
}, 15000);

test("posts drawer saves updates and restores revisions", async () => {
  installContentFetchMocks({
    revisions: [
      {
        id: "rev-001",
        revisionNumber: 1,
        titleSnapshot: "Launch Post 1",
        bodySnapshot: "<p>Original body</p>",
        taxonomySnapshot: {
          categoryIds: ["cat-001"],
          tagIds: ["tag-001"]
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
      subtitle: "Launch subtitle 1",
      excerpt: "Launch excerpt 1",
      body: "<p>Updated body</p>",
      status: "published",
      format: "article",
      primaryAuthorId: "author-001",
      coAuthorIds: [],
      categoryIds: ["cat-001"],
      tagIds: ["tag-001"],
      featuredMediaId: "media-001",
      galleryMediaIds: [],
      allowComments: true,
      commentPolicy: "open",
      seoTitle: "Launch SEO 1",
      seoDescription: "Launch description 1",
      ogTitle: "Launch OG 1",
      ogDescription: "Launch OG description 1",
      ogImageMediaId: "media-001",
      createdByAuthorId: "author-001",
      updatedByAuthorId: "author-001"
    }
  });

  const fetchMock = vi.fn(async () =>
    createJsonResponse(200, {
      ok: true,
      item: {
        id: "post-001",
        title: "Launch Post 1",
        excerpt: "Launch excerpt 1",
        body: "<p>Original body</p>",
        status: "published",
        format: "article",
        primaryAuthorId: "author-001",
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

  render(
    <BlogContentView
      activeModuleLabel="Content"
      collectionsDomain={collectionsDomain}
      route={{
        postId: "post-001",
        postEditorSection: "story"
      }}
    />
  );

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

  fireEvent.click(screen.getByRole("tab", { name: "Revisions" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Revision History" })).toBeInTheDocument();
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

test("posts view creates a new draft from the drawer without losing the draft state", async () => {
  installContentFetchMocks();
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

  render(<BlogContentView activeModuleLabel="Content" collectionsDomain={createCollectionsDomain()} />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "New Post" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "New Post" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "New Post" })).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText("Title"), {
    target: {
      value: "Created Draft"
    }
  });
  fireEvent.change(screen.getByLabelText("Body"), {
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
}, 20000);
