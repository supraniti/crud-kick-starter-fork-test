import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LayoutsView } from "../../../../modules/test-modules-layouts/frontend/LayoutsView.jsx";
import * as referenceApi from "../../api/reference.js";

vi.mock("../../api/reference.js", async () => {
  const actual = await vi.importActual("../../api/reference.js");
  return {
    ...actual,
    createReferenceCollectionItem: vi.fn(),
    deleteReferenceCollectionItem: vi.fn(),
    fetchReferenceCollectionItems: vi.fn(),
    updateReferenceCollectionItem: vi.fn()
  };
});

function createLayoutDocument() {
  return {
    version: 1,
    rootId: "root",
    nodes: {
      root: {
        id: "root",
        kind: "container",
        label: "Root Container",
        layoutMode: "grid",
        props: {
          columns: 12,
          autoRows: 96,
          gap: 24,
          padding: 24,
          minHeight: 720
        },
        placement: {
          grid: { x: 0, y: 0, w: 12, h: 1 },
          flex: { order: 0, basis: "100%", grow: 0, shrink: 0 }
        },
        children: []
      }
    }
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("layout builder creates reusable layout records and supports multiple inserts into the same container", async () => {
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "page-layouts") {
      return {
        items: [
          {
            id: "layout-001",
            title: "Landing Shell",
            layoutKey: "landing-shell",
            summary: "Reusable layout",
            status: "ready",
            layoutDocument: createLayoutDocument(),
            rootLayoutMode: "grid"
          }
        ]
      };
    }

    if (collectionId === "blog-pages") {
      return {
        items: [
          {
            id: "page-001",
            title: "Landing Page",
            layoutId: "layout-001"
          }
        ]
      };
    }

    return { items: [] };
  });

  referenceApi.createReferenceCollectionItem.mockResolvedValue({
    ok: true,
    item: {
      id: "layout-002",
      title: "Story Grid",
      layoutKey: "story-grid",
      summary: null,
      status: "draft",
      layoutDocument: createLayoutDocument(),
      rootLayoutMode: "grid"
    }
  });

  render(<LayoutsView activeModuleLabel="Layouts" />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Layout Builder" })).toBeInTheDocument();
    expect(screen.getByText("Landing Shell")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "New Layout" }));
  fireEvent.change(screen.getByLabelText("Layout Title"), {
    target: { value: "Story Grid" }
  });
  fireEvent.change(screen.getByLabelText("Layout Key"), {
    target: { value: "story-grid" }
  });
  fireEvent.click(screen.getAllByRole("button", { name: "Add Block" })[0]);

  await waitFor(() => {
    expect(screen.getByLabelText("Block Label")).toHaveValue("Content Block");
  });

  fireEvent.click(screen.getAllByRole("button", { name: "Add Block" })[0]);
  fireEvent.click(screen.getByRole("tab", { name: "Layers" }));

  await waitFor(() => {
    expect(screen.getAllByText("Content Block").length).toBeGreaterThan(1);
  });

  fireEvent.click(screen.getByRole("button", { name: "Create Layout" }));

  await waitFor(() => {
    expect(referenceApi.createReferenceCollectionItem).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "page-layouts",
        item: expect.objectContaining({
          title: "Story Grid",
          layoutKey: "story-grid",
          layoutDocument: expect.objectContaining({
            rootId: "root",
            nodes: expect.any(Object)
          })
        })
      })
    );
  });

  const createCall = referenceApi.createReferenceCollectionItem.mock.calls[0][0];
  expect(createCall.item.layoutDocument.nodes.root.children).toHaveLength(2);
}, 15000);
