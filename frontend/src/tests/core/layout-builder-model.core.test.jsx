import { describe, expect, test } from "vitest";
import {
  addNodeToLayout,
  buildNodePath,
  createContainerInsertionTarget,
  createSiblingInsertionTarget,
  moveNodeInLayout,
  resolveCreationTarget,
  resolveInsertionTarget,
  resolveMoveTarget
} from "../../../../modules/test-modules-layouts/frontend/layout-builder-model.js";
import { buildPlacementStyle } from "../../../../modules/test-modules-layouts/frontend/layout-builder-canvas-layout.js";
import { createInitialLayoutDocument, createLayoutNode } from "../../../../modules/test-modules-layouts/shared/layout-document.mjs";

function createDocumentWithChildren() {
  const document = createInitialLayoutDocument();
  document.nodes.hero = createLayoutNode({
    id: "hero",
    kind: "block",
    label: "Hero Block",
    placement: {
      grid: { w: 12, h: 3 }
    }
  });
  document.nodes.sidebar = createLayoutNode({
    id: "sidebar",
    kind: "container",
    label: "Sidebar Container",
    layoutMode: "flex"
  });
  document.nodes.summary = createLayoutNode({
    id: "summary",
    kind: "block",
    label: "Summary Block"
  });
  document.nodes.root.children = ["hero", "sidebar"];
  document.nodes.sidebar.children = ["summary"];
  return document;
}

describe("layout builder model", () => {
  test("creates follow-up blocks after the selected block instead of falling back to root append", () => {
    const document = createDocumentWithChildren();
    const target = resolveCreationTarget(document, "hero");
    const next = addNodeToLayout(document, target, "block", {
      label: "Follow-up Block"
    });

    expect(next.document.nodes.root.children).toEqual([
      "hero",
      next.selectedNodeId,
      "sidebar"
    ]);
  });

  test("creates child blocks inside the selected container", () => {
    const document = createDocumentWithChildren();
    const target = resolveCreationTarget(document, "sidebar");
    const next = addNodeToLayout(document, target, "block", {
      label: "Sidebar Child"
    });

    expect(next.document.nodes.sidebar.children).toEqual([
      "summary",
      next.selectedNodeId
    ]);
  });

  test("resolves explicit insertion rails before and after siblings", () => {
    const document = createDocumentWithChildren();

    expect(resolveInsertionTarget(document, "node:hero:before")).toEqual({
      containerId: "root",
      index: 0
    });
    expect(resolveInsertionTarget(document, "node:hero:after")).toEqual({
      containerId: "root",
      index: 1
    });
    expect(resolveInsertionTarget(document, "insert:root:end")).toEqual({
      containerId: "root",
      index: 2
    });
  });

  test("moves nodes into nested containers using explicit inside targets", () => {
    const document = createDocumentWithChildren();
    const target = resolveInsertionTarget(document, "inside:sidebar:end");
    const next = moveNodeInLayout(document, "hero", target.containerId, target.index);

    expect(next.nodes.root.children).toEqual(["sidebar"]);
    expect(next.nodes.sidebar.children).toEqual(["summary", "hero"]);
  });

  test("reorders nodes within the same container using explicit slot indices", () => {
    const document = createDocumentWithChildren();
    document.nodes.root.children = ["hero", "sidebar", "outro"];
    document.nodes.outro = createLayoutNode({
      id: "outro",
      kind: "block",
      label: "Outro Block"
    });

    const movedToEnd = moveNodeInLayout(document, "hero", "root", 3);
    expect(movedToEnd.nodes.root.children).toEqual(["sidebar", "outro", "hero"]);

    const movedToMiddle = moveNodeInLayout(document, "outro", "root", 1);
    expect(movedToMiddle.nodes.root.children).toEqual(["hero", "outro", "sidebar"]);
  });

  test("grows nested grid-container span as children are added so content stays inside the parent", () => {
    let document = createInitialLayoutDocument();
    document.nodes.parent = createLayoutNode({
      id: "parent",
      kind: "container",
      label: "Parent Grid",
      layoutMode: "grid",
      placement: {
        grid: { w: 12, h: 6 }
      }
    });
    document.nodes.nested = createLayoutNode({
      id: "nested",
      kind: "container",
      label: "Nested Grid",
      layoutMode: "grid",
      placement: {
        grid: { w: 12, h: 4 }
      }
    });
    document.nodes.root.children = ["parent"];
    document.nodes.parent.children = ["nested"];

    for (let index = 0; index < 4; index += 1) {
      const next = addNodeToLayout(document, { containerId: "nested", index: null }, "block", {
        label: `Nested Block ${index + 1}`
      });
      document = next.document;
    }

    expect(document.nodes.parent.children).toEqual(["nested"]);
    expect(document.nodes.nested.children).toHaveLength(4);
    expect(document.nodes.nested.placement.grid.h).toBeGreaterThan(4);
    expect(document.nodes.nested.placement.grid.y).toBe(0);
  });

  test("reflows later siblings after a nested grid container grows", () => {
    let document = createInitialLayoutDocument();
    document.nodes.parent = createLayoutNode({
      id: "parent",
      kind: "container",
      label: "Parent Grid",
      layoutMode: "grid",
      placement: {
        grid: { w: 12, h: 6 }
      }
    });
    document.nodes.gridChild = createLayoutNode({
      id: "gridChild",
      kind: "container",
      label: "Grid Child",
      layoutMode: "grid",
      placement: {
        grid: { w: 12, h: 4 }
      }
    });
    document.nodes.flexChild = createLayoutNode({
      id: "flexChild",
      kind: "container",
      label: "Flex Child",
      layoutMode: "flex",
      placement: {
        grid: { w: 12, h: 4 }
      }
    });
    document.nodes.root.children = ["parent"];
    document.nodes.parent.children = ["gridChild", "flexChild"];

    for (let index = 0; index < 3; index += 1) {
      const next = addNodeToLayout(document, { containerId: "gridChild", index: null }, "block", {
        label: `Nested Block ${index + 1}`
      });
      document = next.document;
    }

    expect(document.nodes.gridChild.placement.grid.h).toBeGreaterThan(4);
    expect(document.nodes.flexChild.placement.grid.y).toBe(document.nodes.gridChild.placement.grid.h);
  });

  test("uses row-flex placement without forcing block width to 100 percent", () => {
    const parent = createLayoutNode({
      id: "row-parent",
      kind: "container",
      layoutMode: "flex",
      props: {
        direction: "row",
        wrap: "nowrap",
        gap: 24
      }
    });
    const child = createLayoutNode({
      id: "row-child",
      kind: "block",
      placement: {
        flex: { basis: "50%", grow: 0, shrink: 0 }
      }
    });

    expect(buildPlacementStyle(child, parent, {}, false)).toEqual(
      expect.objectContaining({
        flexBasis: "50%",
        width: "auto",
        maxWidth: "50%",
        minWidth: 0
      })
    );
  });

  test("keeps column-flex children stretched to full width", () => {
    const parent = createLayoutNode({
      id: "column-parent",
      kind: "container",
      layoutMode: "flex",
      props: {
        direction: "column",
        wrap: "nowrap"
      }
    });
    const child = createLayoutNode({
      id: "column-child",
      kind: "block",
      placement: {
        flex: { basis: "50%", grow: 0, shrink: 0 }
      }
    });

    expect(buildPlacementStyle(child, parent, {}, false)).toEqual(
      expect.objectContaining({
        flexBasis: "50%",
        width: "100%"
      })
    );
  });

  test("accounts for gap budget when a wrapped row flex container uses percentage siblings", () => {
    const parent = createLayoutNode({
      id: "wrapped-row-parent",
      kind: "container",
      layoutMode: "flex",
      props: {
        direction: "row",
        wrap: "wrap",
        gap: 20
      },
      children: ["left", "right"]
    });
    const left = createLayoutNode({
      id: "left",
      kind: "block",
      placement: {
        flex: { basis: "50%", grow: 0, shrink: 0 }
      }
    });
    const right = createLayoutNode({
      id: "right",
      kind: "block",
      placement: {
        flex: { basis: "50%", grow: 0, shrink: 0 }
      }
    });

    const leftStyle = buildPlacementStyle(left, parent, { left, right }, false);
    const rightStyle = buildPlacementStyle(right, parent, { left, right }, false);

    expect(leftStyle).toEqual(
      expect.objectContaining({
        flexBasis: "calc(50% - 10px)",
        maxWidth: "calc(50% - 10px)"
      })
    );
    expect(rightStyle).toEqual(
      expect.objectContaining({
        flexBasis: "calc(50% - 10px)",
        maxWidth: "calc(50% - 10px)"
      })
    );
  });

  test("builds breadcrumbs through the container tree", () => {
    const document = createDocumentWithChildren();

    expect(buildNodePath(document, "summary")).toEqual(["root", "sidebar", "summary"]);
    expect(createContainerInsertionTarget(document, "sidebar", 0)).toEqual({
      containerId: "sidebar",
      index: 0
    });
    expect(createSiblingInsertionTarget(document, "summary", "before")).toEqual({
      containerId: "sidebar",
      index: 0
    });
  });

  test("resolves same-container reorder targets from active and hovered nodes", () => {
    const document = createDocumentWithChildren();

    expect(resolveMoveTarget(document, "hero", "sidebar")).toEqual({
      containerId: "root",
      index: 2
    });

    expect(resolveMoveTarget(document, "sidebar", "hero")).toEqual({
      containerId: "root",
      index: 0
    });
  });

  test("resolves cross-container hover to the target container order", () => {
    const document = createDocumentWithChildren();
    document.nodes.root.children = ["hero", "sidebar", "outro"];
    document.nodes.outro = createLayoutNode({
      id: "outro",
      kind: "block",
      label: "Outro Block"
    });

    expect(resolveMoveTarget(document, "hero", "summary")).toEqual({
      containerId: "sidebar",
      index: 1
    });
  });

  test("resolves explicit insert slots for deterministic move targets", () => {
    const document = createDocumentWithChildren();
    document.nodes.root.children = ["hero", "sidebar", "outro"];
    document.nodes.outro = createLayoutNode({
      id: "outro",
      kind: "block",
      label: "Outro Block"
    });

    expect(resolveMoveTarget(document, "hero", "insert:root:2")).toEqual({
      containerId: "root",
      index: 2
    });

    expect(resolveMoveTarget(document, "summary", "insert:root:1")).toEqual({
      containerId: "root",
      index: 1
    });
  });
});
