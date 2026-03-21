import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { ProductEditorialView } from "../../app/product-shell/ProductEditorialView.jsx";

function createJsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}

function createCollectionsHarness() {
  const initialItems = [
    {
      id: "author-001",
      displayName: "Alice Stone",
      legalName: "Alice Miriam Stone",
      bio: "Launch editor and long-form reviewer.",
      email: "alice@example.com",
      role: "editor",
      status: "active",
      locale: "en-US",
      avatarMediaId: "media-001",
      expertiseTagIds: ["tag-001"]
    },
    {
      id: "author-002",
      displayName: "Mika North",
      legalName: "Mika North",
      bio: "",
      email: "mika@example.com",
      role: "guest",
      status: "inactive",
      locale: "fr-FR",
      avatarMediaId: null,
      expertiseTagIds: []
    }
  ];

  const schema = {
    id: "blog-authors",
    label: "Authors",
    entitySingular: "author",
    fields: [
      { id: "displayName", label: "Display Name", type: "text", required: true },
      { id: "slug", label: "Slug", type: "computed", required: false },
      { id: "legalName", label: "Legal Name", type: "text", required: false },
      { id: "bio", label: "Bio", type: "text", required: false },
      { id: "avatarMediaId", label: "Avatar Media", type: "reference", required: false, collectionId: "media-items" },
      { id: "email", label: "Email", type: "text", required: true },
      { id: "websiteUrl", label: "Website URL", type: "url", required: false },
      { id: "socialLinks", label: "Social Links", type: "structured-object", required: false },
      { id: "role", label: "Role", type: "enum", required: true, options: ["author", "editor", "managing-editor", "guest"] },
      { id: "status", label: "Status", type: "enum", required: true, options: ["active", "inactive", "blocked"] },
      { id: "locale", label: "Locale", type: "text", required: false },
      { id: "expertiseTagIds", label: "Expertise Tags", type: "reference-multi", required: false, collectionId: "blog-tags" }
    ]
  };

  function Harness({ navigate, route }) {
    const [routeState, setRouteState] = useState(route);
    const [collectionFormState, setCollectionFormState] = useState({
      itemId: null,
      saving: false,
      errorMessage: null,
      successMessage: null,
      errorActions: [],
      displayName: "",
      legalName: "",
      bio: "",
      avatarMediaId: "",
      email: "",
      websiteUrl: "",
      socialLinks: {},
      role: "author",
      status: "active",
      locale: "",
      expertiseTagIds: []
    });
    const [collectionFilterState, setCollectionFilterState] = useState({
      search: "",
      role: "",
      status: ""
    });

    const collectionsDomain = useMemo(
      () => ({
        collectionsState: {
          loading: false,
          errorMessage: null,
          items: [
            {
              id: "blog-authors",
              label: "Authors",
              capabilities: { create: true, update: true, delete: true }
            }
          ]
        },
        collectionSchemaState: {
          loading: false,
          errorMessage: null,
          collection: schema
        },
        collectionItemsState: {
          loading: false,
          errorMessage: null,
          items: initialItems,
          meta: {
            total: initialItems.length,
            offset: 0,
            limit: 25
          }
        },
        referenceOptionsState: {
          "media-items": {
            loading: false,
            errorMessage: null,
            items: [
              {
                id: "media-001",
                displayName: "Alice Portrait",
                altText: "Alice portrait",
                updatedOn: "2026-03-20T12:00:00.000Z"
              },
              {
                id: "media-002",
                displayName: "Contributor Portrait",
                altText: "Contributor portrait",
                updatedOn: "2026-03-19T12:00:00.000Z"
              }
            ]
          },
          "blog-tags": {
            loading: false,
            errorMessage: null,
            items: [
              { id: "tag-001", name: "Platform" },
              { id: "tag-002", name: "Editorial" }
            ]
          }
        },
        activeCollectionId: "blog-authors",
        isActiveCollectionAvailable: true,
        activeCollectionUnavailableMessage: null,
        collectionFilterState,
        collectionFormState,
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
        handleCollectionFilterChange: vi.fn((fieldId, value) => {
          setCollectionFilterState((previous) => ({
            ...previous,
            [fieldId]: value
          }));
        }),
        handleClearCollectionFilters: vi.fn(),
        handleCollectionFormChange: vi.fn((fieldId, value) => {
          setCollectionFormState((previous) => ({
            ...previous,
            [fieldId]: value,
            errorMessage: null,
            successMessage: null
          }));
        }),
        handleEditCollectionItem: vi.fn((item) => {
          setCollectionFormState({
            itemId: item.id,
            saving: false,
            errorMessage: null,
            successMessage: null,
            errorActions: [],
            displayName: item.displayName ?? "",
            legalName: item.legalName ?? "",
            bio: item.bio ?? "",
            avatarMediaId: item.avatarMediaId ?? "",
            email: item.email ?? "",
            websiteUrl: item.websiteUrl ?? "",
            socialLinks: item.socialLinks ?? {},
            role: item.role ?? "author",
            status: item.status ?? "active",
            locale: item.locale ?? "",
            expertiseTagIds: item.expertiseTagIds ?? []
          });
        }),
        handleResetCollectionForm: vi.fn(() => {
          setCollectionFormState({
            itemId: null,
            saving: false,
            errorMessage: null,
            successMessage: null,
            errorActions: [],
            displayName: "",
            legalName: "",
            bio: "",
            avatarMediaId: "",
            email: "",
            websiteUrl: "",
            socialLinks: {},
            role: "author",
            status: "active",
            locale: "",
            expertiseTagIds: []
          });
        }),
        handleSubmitCollectionForm: vi.fn(async () => {
          setCollectionFormState((previous) => ({
            ...previous,
            successMessage: previous.itemId ? "Author updated" : "Author created"
          }));
        }),
        handleDeleteCollectionItem: vi.fn(async () => ({
          ok: true
        })),
        handleInlineCreateReference: vi.fn(),
        handleInlineCreateFormChange: vi.fn(),
        handleCloseInlineCreate: vi.fn(),
        handleSubmitInlineCreate: vi.fn(),
        handleRunCollectionErrorAction: vi.fn(),
        reloadCollectionItems: vi.fn(async () => {})
      }),
      [collectionFilterState, collectionFormState]
    );

    const handleNavigate = (nextRoute, options) => {
      setRouteState(nextRoute);
      navigate(nextRoute, options);
    };

    return (
      <ProductEditorialView
        navigate={handleNavigate}
        route={routeState}
        collectionsDomain={collectionsDomain}
      />
    );
  }

  return Harness;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("authors desk shows a bespoke roster, opens the drawer, and jumps to posts for the selected author", async () => {
  const fetchMock = vi.fn(async () =>
    createJsonResponse(200, {
      ok: true,
      items: [
        {
          id: "post-001",
          title: "Launch Checklist",
          status: "published",
          primaryAuthorId: "author-001",
          categoryIds: ["cat-001"],
          featuredMediaId: "media-010",
          body: "<p>Long enough body.</p>".repeat(20)
        },
        {
          id: "post-002",
          title: "Guest Dispatch",
          status: "draft",
          primaryAuthorId: "author-002",
          categoryIds: ["cat-002"],
          featuredMediaId: "media-011",
          body: "<p>Long enough body.</p>".repeat(12)
        }
      ]
    })
  );
  vi.stubGlobal("fetch", fetchMock);
  const navigate = vi.fn();
  const Harness = createCollectionsHarness();

  render(<Harness navigate={navigate} route={{ moduleId: "test-modules-editorial", authorSort: "activity-desc", authorPage: "1" }} />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Author Roster" })).toBeInTheDocument();
    expect(screen.getByText("Alice Stone")).toBeInTheDocument();
    expect(screen.getByText("Mika North")).toBeInTheDocument();
  });

  fireEvent.click(screen.getAllByRole("button", { name: "1" })[0]);
  expect(navigate).toHaveBeenCalledWith(
    {
      moduleId: "test-modules-content",
      collectionId: "blog-posts",
      primaryAuthorId: "author-001"
    },
    { replace: false }
  );

  fireEvent.click(screen.getByRole("button", { name: "New Author" }));
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "New Author" })).toBeInTheDocument();
  });
}, 12000);

test("authors desk keeps filter and page changes in route actions and blocks invalid duplicate-name submit", async () => {
  const fetchMock = vi.fn(async () =>
    createJsonResponse(200, {
      ok: true,
      items: []
    })
  );
  vi.stubGlobal("fetch", fetchMock);
  const navigate = vi.fn();
  const Harness = createCollectionsHarness();

  render(<Harness navigate={navigate} route={{ moduleId: "test-modules-editorial", role: "editor", authorPage: "2" }} />);

  await waitFor(() => {
    expect(screen.getByText("Roster")).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText("Search authors"), { target: { value: "alice" } });
  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({
      moduleId: "test-modules-editorial",
      role: "editor",
      search: "alice",
      authorPage: 1
    }),
    { replace: true }
  );

  fireEvent.click(screen.getByRole("button", { name: "New Author" }));
  fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Alice Stone" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bad-email" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Author" }));

  await waitFor(() => {
    expect(screen.getByText("Another author already uses this display name.")).toBeInTheDocument();
    expect(screen.getByText("Email must be valid.")).toBeInTheDocument();
  });
}, 12000);
