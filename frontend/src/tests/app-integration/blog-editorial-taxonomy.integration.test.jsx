import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BlogEditorialView } from "../../../../modules/test-modules-editorial/frontend/BlogEditorialView.jsx";
import { BlogTaxonomyView } from "../../../../modules/test-modules-taxonomy/frontend/BlogTaxonomyView.jsx";
import * as embeddedRemoteOps from "../../../../modules/test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";

vi.mock("../../../../modules/test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js", async () => {
  const actual = await vi.importActual(
    "../../../../modules/test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js"
  );
  return {
    ...actual,
    useEmbeddedRemoteOpsSupport: vi.fn(() => ({
      supportState: {
        loading: false,
        errorMessage: null
      },
      procedureState: {
        processing: false,
        procedureType: "",
        targetId: "",
        errorMessage: null,
        successMessage: null
      },
      reload: vi.fn(),
      getTargetsByKind: vi.fn(() => []),
      getTargetById: vi.fn(() => null),
      getLatestRunForTarget: vi.fn(() => null),
      validateTarget: vi.fn(),
      compareTarget: vi.fn(),
      executeTarget: vi.fn()
    }))
  };
});

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
  expect(screen.getByRole("heading", { name: "Publication State" })).toBeInTheDocument();
  expect(
    screen.getByText("No Firestore projection target is configured for this taxonomy branch.")
  ).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Category Tree" })).toBeInTheDocument();
  expect(screen.getAllByText("Guides").length).toBeGreaterThan(0);
  expect(screen.getByText("guides/devops")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Tags" }));
  expect(collectionsDomain.handleSelectCollection).toHaveBeenCalledWith("blog-tags");
});

test("blog taxonomy view surfaces separate remote projection panels for categories and tags", async () => {
  const compareTarget = vi.fn();
  const executeTarget = vi.fn();
  const validateTarget = vi.fn();
  embeddedRemoteOps.useEmbeddedRemoteOpsSupport.mockReturnValue({
    supportState: {
      loading: false,
      errorMessage: null
    },
    procedureState: {
      processing: false,
      procedureType: "",
      targetId: "",
      errorMessage: null,
      successMessage: null
    },
    reload: vi.fn(),
    getTargetsByKind: vi.fn(() => [
      {
        id: "target-categories-001",
        title: "Categories Projection",
        targetKind: "firestore-projection",
        targetStatus: "validated",
        config: {
          projectionScope: "public-blog-categories"
        },
        compareSummary: {
          createCount: 2,
          updateCount: 0,
          deleteCount: 0
        }
      },
      {
        id: "target-tags-001",
        title: "Tags Projection",
        targetKind: "firestore-projection",
        targetStatus: "validated",
        config: {
          projectionScope: "public-blog-tags"
        },
        compareSummary: {
          createCount: 1,
          updateCount: 0,
          deleteCount: 0
        }
      }
    ]),
    getTargetById: vi.fn((targetId) =>
      targetId === "target-categories-001"
        ? {
            id: "target-categories-001",
            title: "Categories Projection",
            targetStatus: "validated",
            config: { projectionScope: "public-blog-categories" },
            compareSummary: { createCount: 2, updateCount: 0, deleteCount: 0 }
          }
        : targetId === "target-tags-001"
          ? {
              id: "target-tags-001",
              title: "Tags Projection",
              targetStatus: "validated",
              config: { projectionScope: "public-blog-tags" },
              compareSummary: { createCount: 1, updateCount: 0, deleteCount: 0 }
            }
          : null
    ),
    getLatestRunForTarget: vi.fn(() => null),
    validateTarget,
    compareTarget,
    executeTarget
  });

  const collectionsDomain = createCollectionsDomain({
    activeCollectionId: "blog-categories",
    collectionSchema: {
      id: "blog-categories",
      label: "Categories",
      entitySingular: "category",
      fields: [{ id: "name", label: "Name", type: "text", required: true }]
    },
    collectionItems: [],
    moduleCollections: [
      { id: "blog-categories", label: "Categories", capabilities: { create: true, update: true, delete: true } },
      { id: "blog-tags", label: "Tags", capabilities: { create: true, update: true, delete: true } }
    ]
  });
  const moduleSettingsDomain = {
    moduleSettingsState: {
      draftValues: {
        remoteCategoriesProjectionTargetProfileId: "target-categories-001",
        remoteTagsProjectionTargetProfileId: "target-tags-001"
      },
      saving: false,
      errorMessage: null,
      successMessage: null
    },
    handleSettingsFieldChange: vi.fn(),
    handleSaveModuleSettings: vi.fn(async () => {})
  };

  render(
    <BlogTaxonomyView
      activeModuleLabel="Blog Taxonomy"
      collectionsDomain={collectionsDomain}
      moduleSettingsDomain={moduleSettingsDomain}
      navigate={vi.fn()}
    />
  );

  fireEvent.click(screen.getByRole("tab", { name: "Remote Publication" }));

  expect(screen.getByText("Remote Categories Projection")).toBeInTheDocument();
  expect(screen.getAllByText("Categories Projection").length).toBeGreaterThan(0);
  expect(
    screen.getByText("Only categories with visibility set to public are included in this projection.")
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Tags" }));
  expect(collectionsDomain.handleSelectCollection).toHaveBeenCalledWith("blog-tags");
});

test("blog taxonomy view surfaces posts and pages usage visibility", async () => {
  const fetchMock = vi.fn(async (url) => {
    if (url === "/api/reference/collections/blog-posts/items?limit=200") {
      return createJsonResponse(200, {
        ok: true,
        items: [
          {
            id: "post-001",
            title: "Launch Checklist",
            categoryIds: ["cat-001"],
            tagIds: ["tag-001"]
          },
          {
            id: "post-002",
            title: "Platform Retrospective",
            categoryIds: [],
            tagIds: []
          }
        ]
      });
    }

    if (url === "/api/reference/collections/blog-pages/items?limit=200") {
      return createJsonResponse(200, {
        ok: true,
        items: [
          {
            id: "page-001",
            title: "Category Template",
            primarySourceType: "blog-category",
            dataSources: [
              {
                kind: "posts-by-category",
                sourceType: "blog-category"
              }
            ]
          }
        ]
      });
    }

    throw new Error(`Unexpected fetch request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const navigate = vi.fn();
  const collectionsDomain = createCollectionsDomain({
    activeCollectionId: "blog-categories",
    collectionSchema: {
      id: "blog-categories",
      label: "Categories",
      entitySingular: "category",
      fields: [{ id: "name", label: "Name", type: "text", required: true }]
    },
    collectionItems: [
      {
        id: "cat-001",
        name: "Guides",
        usageCount: 3
      },
      {
        id: "cat-002",
        name: "DevOps",
        usageCount: 0
      }
    ],
    moduleCollections: [
      { id: "blog-categories", label: "Categories", capabilities: { create: true, update: true, delete: true } },
      { id: "blog-tags", label: "Tags", capabilities: { create: true, update: true, delete: true } }
    ]
  });

  render(
    <BlogTaxonomyView
      activeModuleLabel="Blog Taxonomy"
      collectionsDomain={collectionsDomain}
      navigate={navigate}
    />
  );

  await waitFor(() => {
    expect(screen.getByText("Posts + Category Pages")).toBeInTheDocument();
    expect(screen.getByText(/Guides: 1 post reference/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Category Templates 1/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Posts Missing Categories 1/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Open Pages" }));

  expect(navigate).toHaveBeenCalledWith(
    {
      moduleId: "pages"
    },
    { replace: false }
  );
});

