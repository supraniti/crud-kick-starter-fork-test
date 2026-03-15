import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductEditorialView } from "../../app/product-shell/ProductEditorialView.jsx";

function createCollectionsDomain() {
  return {
    collectionsState: {
      loading: false,
      errorMessage: null,
      items: [
        {
          id: "blog-authors",
          label: "Authors",
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
      }
    },
    collectionItemsState: {
      loading: false,
      errorMessage: null,
      items: [
        {
          id: "author-001",
          displayName: "Alice Stone",
          email: "alice@example.com",
          role: "editor",
          status: "active",
          avatarMediaId: "media-001"
        },
        {
          id: "author-002",
          displayName: "Mika North",
          email: "mika@example.com",
          role: "guest",
          status: "inactive",
          avatarMediaId: null
        }
      ],
      meta: {
        total: 2,
        offset: 0,
        limit: 200
      }
    },
    referenceOptionsState: {
      loading: false,
      errorMessage: null,
      byFieldId: {}
    },
    activeCollectionId: "blog-authors",
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

test("product editorial view exposes authoring readiness and related workflow navigation", async () => {
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
          featuredMediaId: "media-010",
          body: "<p>This is a sufficiently long draft body for editorial readiness proof.</p>".repeat(4)
        },
        {
          id: "post-002",
          title: "Platform Retrospective",
          status: "in-review",
          primaryAuthorId: "",
          categoryIds: [],
          featuredMediaId: "",
          body: "<p>Short body.</p>"
        }
      ]
    })
  );
  const navigate = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  render(<ProductEditorialView navigate={navigate} collectionsDomain={createCollectionsDomain()} />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Editorial Control Desk" })).toBeInTheDocument();
    expect(screen.getByText("Authoring Readiness")).toBeInTheDocument();
    expect(screen.getByText("Launch Checklist")).toBeInTheDocument();
    expect(screen.getByText("Platform Retrospective")).toBeInTheDocument();
    expect(screen.getByText("Missing Avatars")).toBeInTheDocument();
  });

  expect(screen.getByText("Posts still fail the baseline editorial readiness checks. Clear the blockers before treating the roster as release-ready.")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/reference/collections/blog-posts/items?limit=200");

  fireEvent.click(screen.getByRole("button", { name: "Open Posts" }));
  expect(navigate).toHaveBeenCalledWith({ moduleId: "test-modules-content" }, { replace: false });
}, 12000);
