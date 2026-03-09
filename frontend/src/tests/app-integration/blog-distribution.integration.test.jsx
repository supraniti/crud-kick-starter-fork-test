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
      items: [
        {
          id: "redirect-001",
          sourcePath: "/legacy-launch",
          targetPostId: "post-001",
          targetUrl: null,
          httpCode: "301",
          status: "active",
          reason: "Legacy permalink",
          createdOn: "2026-03-08T08:00:00.000Z",
          updatedOn: "2026-03-08T08:00:00.000Z"
        }
      ]
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
    if (collectionId === "blog-posts") {
      return {
        items: [
          {
            id: "post-001",
            title: "Launch Window Update",
            slug: "launch-window-update",
            status: "scheduled",
            primaryAuthorId: "author-001",
            scheduledOn: "2026-03-09T08:30:00.000Z",
            publishedOn: null,
            updatedOn: "2026-03-08T10:00:00.000Z",
            excerpt: "",
            seoTitle: "",
            seoDescription: "",
            ogTitle: "",
            ogDescription: "",
            ogImageMediaId: null,
            featuredMediaId: null
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
          },
          {
            id: "author-002",
            displayName: "Feature Author",
            role: "author",
            status: "active"
          }
        ]
      };
    }

    return {
      items: []
    };
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("pages overview renders readiness warnings and publishes scheduled pages", async () => {
  installReferenceMocks();
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      item: {
        id: "post-001",
        status: "published"
      }
    })
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <BlogDistributionView
      activeModuleLabel="Pages"
      collectionsDomain={createCollectionsDomain()}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Pages Desk" })).toBeInTheDocument();
    expect(screen.getByText("Missing SEO title")).toBeInTheDocument();
    expect(screen.getByText("Pages Queue")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Publish Scheduled Page" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reference/modules/test-modules-pages/posts/post-001/publish-now",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(screen.getByText("Scheduled post published")).toBeInTheDocument();
  });
});

test("blog distribution redirect manager persists new rules through the redirect collection api", async () => {
  installReferenceMocks();
  referenceApi.createReferenceCollectionItem.mockResolvedValue({
    ok: true,
    item: {
      id: "redirect-002",
      sourcePath: "/legacy-launch-2",
      targetUrl: "https://example.com/blog/launch-window-update",
      httpCode: "302",
      status: "active",
      reason: "Campaign handoff"
    }
  });

  const collectionsDomain = createCollectionsDomain();

  render(
    <BlogDistributionView
      activeModuleLabel="Pages"
      collectionsDomain={collectionsDomain}
    />
  );

  await waitFor(() => {
    expect(screen.getByRole("tab", { name: "Redirect Manager" })).toBeInTheDocument();
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
      value: "https://example.com/blog/launch-window-update"
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
        targetPostId: null,
        targetUrl: "https://example.com/blog/launch-window-update",
        httpCode: "301",
        status: "active",
        reason: "Campaign handoff"
      }
    });
    expect(collectionsDomain.reloadCollectionItems).toHaveBeenCalled();
  });
});

