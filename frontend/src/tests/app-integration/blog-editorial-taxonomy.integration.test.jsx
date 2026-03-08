import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BlogEditorialView } from "../../../../modules/test-modules-blog-editorial/frontend/BlogEditorialView.jsx";
import { BlogTaxonomyView } from "../../../../modules/test-modules-blog-taxonomy/frontend/BlogTaxonomyView.jsx";

function createCollectionsDomain({
  activeCollectionId,
  collectionSchema,
  collectionItems,
  moduleCollections
}) {
  return {
    collectionsState: {
      loading: false,
      errorMessage: null,
      items: moduleCollections
    },
    collectionSchemaState: {
      loading: false,
      errorMessage: null,
      collection: collectionSchema
    },
    collectionItemsState: {
      loading: false,
      errorMessage: null,
      items: collectionItems,
      meta: {
        total: collectionItems.length,
        offset: 0,
        limit: 200
      }
    },
    referenceOptionsState: {
      loading: false,
      errorMessage: null,
      byFieldId: {}
    },
    activeCollectionId,
    isActiveCollectionAvailable: true,
    activeCollectionUnavailableMessage: null,
    collectionFilterState: {
      search: "",
      status: "",
      visibility: ""
    },
    collectionFormState: {
      mode: "create",
      itemId: null,
      errorMessage: null,
      successMessage: null,
      errorActions: []
    },
    inlineCreateState: {
      open: false,
      saving: false,
      loadingSchema: false,
      errorMessage: null,
      sourceField: null,
      targetCollectionId: "",
      targetCollectionLabel: "",
      collectionSchema: null,
      formState: {}
    },
    handleSelectCollection: vi.fn(),
    handleCollectionFilterChange: vi.fn(),
    handleClearCollectionFilters: vi.fn(),
    handleCollectionFormChange: vi.fn(),
    handleEditCollectionItem: vi.fn(),
    handleResetCollectionForm: vi.fn(),
    handleSubmitCollectionForm: vi.fn(),
    handleDeleteCollectionItem: vi.fn(),
    handleInlineCreateReference: vi.fn(),
    handleInlineCreateFormChange: vi.fn(),
    handleCloseInlineCreate: vi.fn(),
    handleSubmitInlineCreate: vi.fn(),
    handleRunCollectionErrorAction: vi.fn(),
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("blog editorial view renders author summary and editorial queue snapshot", async () => {
  const fetchMock = vi.fn(async () =>
    createJsonResponse(200, {
      ok: true,
      items: [
        {
          id: "post-001",
          title: "Launch Checklist",
          status: "draft",
          primaryAuthorId: "author-001",
          categoryIds: ["cat-001"],
          body: "<p>This is a sufficiently long draft body for editorial readiness proof.</p>".repeat(4)
        },
        {
          id: "post-002",
          title: "Platform Retrospective",
          status: "in-review",
          primaryAuthorId: "author-002",
          categoryIds: [],
          body: "<p>Short body.</p>"
        }
      ]
    })
  );
  vi.stubGlobal("fetch", fetchMock);

  const collectionsDomain = createCollectionsDomain({
    activeCollectionId: "blog-authors",
    collectionSchema: {
      id: "blog-authors",
      label: "Authors",
      entitySingular: "author",
      fields: [
        { id: "displayName", label: "Display Name", type: "text", required: true },
        { id: "slug", label: "Slug", type: "computed", required: false },
        { id: "email", label: "Email", type: "text", required: true },
        { id: "role", label: "Role", type: "enum", required: true, options: ["author", "editor"] },
        { id: "status", label: "Status", type: "enum", required: true, options: ["active", "inactive"] },
        { id: "createdOn", label: "Created On", type: "text", required: true },
        { id: "updatedOn", label: "Updated On", type: "text", required: true }
      ]
    },
    collectionItems: [
      {
        id: "author-001",
        displayName: "Alice Stone",
        email: "alice@example.com",
        role: "editor",
        status: "active"
      },
      {
        id: "author-002",
        displayName: "Mika North",
        email: "mika@example.com",
        role: "guest",
        status: "inactive"
      }
    ],
    moduleCollections: [
      {
        id: "blog-authors",
        label: "Authors",
        capabilities: { create: true, update: true, delete: true }
      }
    ]
  });

  render(
    <BlogEditorialView activeModuleLabel="Blog Editorial" collectionsDomain={collectionsDomain} />
  );

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Author Desk" })).toBeInTheDocument();
    expect(screen.getByText("Launch Checklist")).toBeInTheDocument();
    expect(screen.getByText("Platform Retrospective")).toBeInTheDocument();
  });

  expect(screen.getByText("Editorial Queue")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/reference/collections/blog-posts/items?limit=200");
});

test("blog taxonomy view renders tree summary and collection switcher", async () => {
  const collectionsDomain = createCollectionsDomain({
    activeCollectionId: "blog-categories",
    collectionSchema: {
      id: "blog-categories",
      label: "Categories",
      entitySingular: "category",
      fields: [
        { id: "name", label: "Name", type: "text", required: true },
        { id: "slug", label: "Slug", type: "computed", required: false },
        { id: "parentCategoryId", label: "Parent Category", type: "reference", required: false, collectionId: "blog-categories" },
        { id: "path", label: "Path", type: "text", required: true },
        { id: "depth", label: "Depth", type: "number", required: true },
        { id: "sortOrder", label: "Sort Order", type: "number", required: true },
        { id: "visibility", label: "Visibility", type: "enum", required: true, options: ["public", "internal"] }
      ]
    },
    collectionItems: [
      {
        id: "cat-001",
        name: "Guides",
        path: "guides",
        depth: 0,
        sortOrder: 10,
        visibility: "public",
        parentCategoryId: null
      },
      {
        id: "cat-002",
        name: "DevOps",
        path: "guides/devops",
        depth: 1,
        sortOrder: 20,
        visibility: "internal",
        parentCategoryId: "cat-001"
      }
    ],
    moduleCollections: [
      {
        id: "blog-categories",
        label: "Categories",
        capabilities: { create: true, update: true, delete: true }
      },
      {
        id: "blog-tags",
        label: "Tags",
        capabilities: { create: true, update: true, delete: true }
      }
    ]
  });

  render(
    <BlogTaxonomyView activeModuleLabel="Blog Taxonomy" collectionsDomain={collectionsDomain} />
  );

  expect(screen.getByRole("heading", { name: "Taxonomy Studio" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Category Tree" })).toBeInTheDocument();
  expect(screen.getAllByText("Guides").length).toBeGreaterThan(0);
  expect(screen.getByText("guides/devops")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Tags" }));
  expect(collectionsDomain.handleSelectCollection).toHaveBeenCalledWith("blog-tags");
});
