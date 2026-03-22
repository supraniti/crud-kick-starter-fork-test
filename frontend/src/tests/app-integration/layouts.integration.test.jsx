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

  const view = render(<LayoutsView activeModuleLabel="Layouts" />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Layout Builder" })).toBeInTheDocument();
    expect(screen.getByText("Landing Shell")).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Blank Layout" }));
  fireEvent.change(screen.getByLabelText("Layout Title"), {
    target: { value: "Story Grid" }
  });
  fireEvent.change(screen.getByLabelText("Layout Key"), {
    target: { value: "story-grid" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Add page section" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: /2 Columns/i }));

  await waitFor(() => {
    expect(screen.getAllByText("Two Column Row").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Feature Block").length).toBeGreaterThan(0);
  });

  fireEvent.click(screen.getByLabelText("Add section"));
  fireEvent.click(await screen.findByRole("menuitem", { name: /Hero Block/i }));
  await waitFor(() => {
    expect(screen.getAllByText("Hero Block").length).toBeGreaterThan(0);
  });
  const heroNodeShell = Array.from(view.container.querySelectorAll("[data-layout-node-shell]")).find(
    (shell) => shell.textContent.includes("Hero Block") && !shell.querySelector("[data-layout-node-shell]")
  );
  expect(heroNodeShell).toBeTruthy();
  fireEvent.click(heroNodeShell.querySelector('[aria-label="Edit node"]'));
  await waitFor(() => {
    expect(screen.getByLabelText("Block Label")).toBeInTheDocument();
  });
  fireEvent.change(screen.getByLabelText("Block Label"), {
    target: { value: "Hero Placeholder" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  await waitFor(() => {
    expect(screen.queryByLabelText("Block Label")).not.toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Layers" }));

  await waitFor(() => {
    expect(screen.getAllByText("Hero Placeholder").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Content Block").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Feature Block").length).toBeGreaterThan(0);
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
  expect(createCall.item.layoutDocument.nodes.root.children).toHaveLength(1);
  const createdContainerId = createCall.item.layoutDocument.nodes.root.children[0];
  expect(createCall.item.layoutDocument.nodes[createdContainerId].label).toBe("Two Column Row");
  expect(createCall.item.layoutDocument.nodes[createdContainerId].children).toHaveLength(3);
  const childNodes = createCall.item.layoutDocument.nodes[createdContainerId].children.map(
    (childId) => createCall.item.layoutDocument.nodes[childId]
  );
  expect(childNodes.some((child) => child.props?.placeholderType === "hero")).toBe(true);
}, 35_000);

test("layout builder can compose container and block structures through the live builder flow", async () => {
  referenceApi.fetchReferenceCollectionItems.mockImplementation(async ({ collectionId }) => {
    if (collectionId === "page-layouts" || collectionId === "blog-pages") {
      return { items: [] };
    }

    return { items: [] };
  });

  referenceApi.createReferenceCollectionItem.mockResolvedValue({
    ok: true,
    item: {
      id: "layout-100",
      title: "Campaign Page",
      layoutKey: "campaign-page",
      summary: null,
      status: "draft",
      layoutDocument: createLayoutDocument(),
      rootLayoutMode: "grid"
    }
  });

  const view = render(<LayoutsView activeModuleLabel="Layouts" />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Layout Builder" })).toBeInTheDocument();
  });

  expect(screen.getByText("Canvas Workspace")).toBeInTheDocument();
  expect(screen.getByText("Viewport: 1440 x 900 px")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Desktop 1440" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tablet 768" })).toBeInTheDocument();
  expect(screen.getByText("Zoom 100%")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Blank Layout" }));
  fireEvent.change(screen.getByLabelText("Layout Title"), {
    target: { value: "Campaign Page" }
  });
  fireEvent.change(screen.getByLabelText("Layout Key"), {
    target: { value: "campaign-page" }
  });

  fireEvent.click(screen.getByRole("button", { name: "Add page section" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: /Sidebar \+ Content/i }));

  await waitFor(() => {
    expect(screen.getAllByText("Sidebar Content Row").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sidebar Block").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Content Block").length).toBeGreaterThan(0);
  });

  fireEvent.click(screen.getByLabelText("Add section"));
  fireEvent.click(await screen.findByRole("menuitem", { name: /CTA Block/i }));

  await waitFor(() => {
    expect(screen.getAllByText("CTA Block").length).toBeGreaterThan(0);
    expect(screen.getAllByText("25%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("75%").length).toBeGreaterThan(0);
  });

  const ctaNodeShell = Array.from(view.container.querySelectorAll("[data-layout-node-shell]")).find(
    (shell) => shell.textContent.includes("CTA Block") && !shell.querySelector("[data-layout-node-shell]")
  );
  expect(ctaNodeShell).toBeTruthy();
  fireEvent.click(ctaNodeShell.querySelector('[aria-label="Duplicate node"]'));

  await waitFor(() => {
    expect(screen.getAllByText("CTA Block").length).toBeGreaterThan(1);
  });

  expect(screen.getAllByText("Sidebar Content Row").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Content Block").length).toBeGreaterThan(0);

  await waitFor(() => {
    expect(screen.getByText("Layout Basics")).toBeInTheDocument();
    expect(screen.getByText("Used In Pages")).toBeInTheDocument();
    expect(screen.getByText("Selected Node")).toBeInTheDocument();
    expect(screen.getByText("Rendered Base Preview")).toBeInTheDocument();
    expect(screen.getByText("Advanced JSON")).toBeInTheDocument();
  });
}, 20000);

test("layout builder surfaces deployment impact and can return to the calling page", async () => {
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
            id: "page-020",
            title: "Posts Page",
            layoutId: "layout-001",
            status: "published",
            deploymentStatus: "stale"
          },
          {
            id: "page-021",
            title: "Landing Page",
            layoutId: "layout-001",
            status: "published",
            deploymentStatus: "clean"
          }
        ]
      };
    }

    return { items: [] };
  });

  const navigate = vi.fn();

  render(
    <LayoutsView
      activeModuleLabel="Layouts"
      navigate={navigate}
      route={{
        moduleId: "test-modules-layouts",
        layoutId: "layout-001",
        returnModuleId: "test-modules-pages",
        returnPageId: "page-020",
        returnTab: "overview"
      }}
    />
  );

  await waitFor(() => {
    expect(screen.getByText("Landing Shell")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Return To Page" })).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(screen.getByText(/published page templates reference this layout/i)).toBeInTheDocument();
    expect(screen.getByText(/1 clean,\s*1 stale,\s*0 missing\./i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Return To Page" }));

  expect(navigate).toHaveBeenCalledWith(
    {
      moduleId: "test-modules-pages",
      pageId: "page-020",
      tab: "overview"
    },
    { replace: false }
  );
}, 15000);
