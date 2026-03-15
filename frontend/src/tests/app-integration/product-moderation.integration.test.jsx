import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductModerationView } from "../../app/product-shell/ProductModerationView.jsx";
import * as referenceApi from "../../api/reference.js";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
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

test("product moderation view keeps comment moderation tied to the moderator roster", async () => {
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
  referenceApi.updateReferenceCollectionItem.mockResolvedValue({
    ok: true,
    item: {
      id: "comment-002",
      status: "approved"
    }
  });
  const collectionsDomain = createCollectionsDomain();
  const navigate = vi.fn();

  render(<ProductModerationView navigate={navigate} collectionsDomain={collectionsDomain} />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Moderation Control Desk" })).toBeInTheDocument();
    expect(screen.getByText("Moderation Readiness")).toBeInTheDocument();
    expect(screen.getByText("Remote Intake Contract")).toBeInTheDocument();
    expect(screen.getByText("Compliance Signals")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
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

  fireEvent.click(screen.getAllByRole("button", { name: "Open Authors" })[0]);
  expect(navigate).toHaveBeenCalledWith({ moduleId: "test-modules-editorial" }, { replace: false });
  fireEvent.click(screen.getByRole("button", { name: "Open Pages" }));
  expect(navigate).toHaveBeenCalledWith({ moduleId: "test-modules-pages" }, { replace: false });
});
