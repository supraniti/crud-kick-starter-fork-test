import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductModerationView } from "../../app/product-shell/ProductModerationView.jsx";
import * as referenceApi from "../../api/reference.js";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    fetchReferenceCollectionItems: vi.fn(),
    updateReferenceCollectionItem: vi.fn(),
    importReferencePublicCommentsToLocal: vi.fn()
  };
});

function createCollectionsDomain() {
  return {
    collectionsState: {
      loading: false,
      errorMessage: null,
      items: [
        {
          id: "blog-comments",
          label: "Comments",
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
        id: "blog-comments",
        label: "Comments",
        entitySingular: "comment",
        fields: []
      }
    },
    collectionItemsState: {
      loading: false,
      errorMessage: null,
      items: [
        {
          id: "comment-002",
          postId: "post-001",
          parentCommentId: "comment-001",
          authorDisplayName: "Reader Two",
          authorEmail: "reader.two@example.com",
          body: "A threaded reply that needs moderation attention.",
          status: "pending",
          moderationReason: null,
          approvedByAuthorId: null,
          approvedOn: null,
          createdOn: "2026-03-08T10:10:00.000Z",
          updatedOn: "2026-03-08T10:10:00.000Z"
        },
        {
          id: "comment-001",
          postId: "post-001",
          parentCommentId: null,
          authorDisplayName: "Reader One",
          authorEmail: "reader.one@example.com",
          body: "The launch notes were useful and easy to follow.",
          status: "pending",
          moderationReason: null,
          approvedByAuthorId: null,
          approvedOn: null,
          createdOn: "2026-03-08T10:00:00.000Z",
          updatedOn: "2026-03-08T10:00:00.000Z"
        }
      ]
    },
    referenceOptionsState: {
      "blog-posts": {
        items: [{ id: "post-001", label: "Launch Update" }]
      },
      "blog-authors": {
        items: [
          { id: "author-001", label: "Desk Editor" },
          { id: "author-002", label: "Managing Editor" }
        ]
      }
    },
    activeCollectionId: "blog-comments",
    isActiveCollectionAvailable: true,
    activeCollectionUnavailableMessage: null,
    handleSelectCollection: vi.fn(),
    reloadCollectionItems: vi.fn()
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("product moderation view renders a queue-first desk and contextual comment drawer", async () => {
  referenceApi.fetchReferenceCollectionItems.mockResolvedValue({
    ok: true,
    items: [
      {
        id: "post-001",
        title: "Launch Update",
        status: "published",
        allowComments: true,
        commentPolicy: "open"
      }
    ]
  });
  referenceApi.importReferencePublicCommentsToLocal.mockResolvedValue({
    ok: true,
    importedCount: 2,
    skippedCount: 0,
    failedCount: 0,
    remoteCount: 2,
    projectId: "merchant-guild",
    collectionPath: "publicComments"
  });
  const collectionsDomain = createCollectionsDomain();

  render(<ProductModerationView collectionsDomain={collectionsDomain} route={{}} />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Moderation Queue" })).toBeInTheDocument();
    expect(screen.getByText("Queue Health")).toBeInTheDocument();
    expect(screen.getByText("Discussion Hotspots")).toBeInTheDocument();
    expect(screen.getByText("Public Intake")).toBeInTheDocument();
    expect(screen.getByText("Search And Filter")).toBeInTheDocument();
    expect(screen.getByText("Reader Two")).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(referenceApi.importReferencePublicCommentsToLocal).toHaveBeenCalled();
    expect(collectionsDomain.reloadCollectionItems).toHaveBeenCalled();
  });

  fireEvent.click(screen.getByText("Reader Two"));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Runtime Tester" })).toBeInTheDocument();
    expect(screen.getByText("Comment Context")).toBeInTheDocument();
  });
});

test("product moderation view moderates the selected comment from the drawer workbench", async () => {
  referenceApi.fetchReferenceCollectionItems.mockResolvedValue({
    ok: true,
    items: [
      {
        id: "post-001",
        title: "Launch Update",
        status: "published",
        allowComments: true,
        commentPolicy: "open"
      }
    ]
  });
  referenceApi.importReferencePublicCommentsToLocal.mockResolvedValue({
    ok: true,
    importedCount: 0,
    skippedCount: 2,
    failedCount: 0,
    remoteCount: 2,
    projectId: "merchant-guild",
    collectionPath: "publicComments"
  });
  referenceApi.updateReferenceCollectionItem.mockResolvedValue({
    ok: true,
    item: {
      id: "comment-002",
      status: "approved"
    }
  });
  const collectionsDomain = createCollectionsDomain();

  render(<ProductModerationView collectionsDomain={collectionsDomain} route={{}} />);

  await waitFor(() => {
    expect(screen.getByText("Reader Two")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText("Reader Two"));

  await waitFor(() => {
    expect(screen.getByText("Comment Context")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("tab", { name: "Moderate" }));

  await waitFor(() => {
    expect(screen.getByText("Moderation Decision")).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText("Moderation Reason"), {
    target: {
      value: "Editorial approval complete"
    }
  });
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));

  await waitFor(() => {
    expect(referenceApi.updateReferenceCollectionItem).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "blog-comments",
        itemId: "comment-002",
        item: expect.objectContaining({
          status: "approved",
          moderationReason: "Editorial approval complete",
          approvedByAuthorId: "author-001"
        })
      })
    );
    expect(collectionsDomain.reloadCollectionItems).toHaveBeenCalled();
  });
});
