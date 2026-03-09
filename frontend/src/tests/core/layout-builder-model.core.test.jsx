import { describe, expect, test } from "vitest";
import {
  addNodeToLayout,
  buildNodePath,
  createContainerInsertionTarget,
  createSiblingInsertionTarget,
  moveNodeInLayout,
  resolveCreationTarget,
  resolveInsertionTarget
} from "../../../../modules/test-modules-layouts/frontend/layout-builder-model.js";
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
});
