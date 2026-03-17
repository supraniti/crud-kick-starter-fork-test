import {
  cloneLayoutDocument,
  createLayoutDocumentId,
  createLayoutNode
} from "../shared/layout-document.mjs";
import { findParentContainerId, repackAllGridContainers } from "./layout-builder-model.js";

function clampInsertionIndex(children, targetIndex) {
  if (!Number.isInteger(targetIndex)) {
    return children.length;
  }
  return Math.max(0, Math.min(children.length, targetIndex));
}

function cloneBlueprintNode(spec = {}) {
  const node = createLayoutNode({
    ...spec,
    id: createLayoutDocumentId(spec.kind === "container" ? "container" : "block")
  });
  const nodes = {
    [node.id]: node
  };

  if (node.kind !== "container") {
    return {
      rootId: node.id,
      nodes
    };
  }

  node.children = [];
  for (const childSpec of spec.children ?? []) {
    const subtree = cloneBlueprintNode(childSpec);
    node.children.push(subtree.rootId);
    Object.assign(nodes, subtree.nodes);
  }

  return {
    rootId: node.id,
    nodes
  };
}

function cloneExistingSubtree(document, nodeId) {
  const sourceNode = document.nodes?.[nodeId];
  if (!sourceNode) {
    return null;
  }

  const node = createLayoutNode({
    ...sourceNode,
    id: createLayoutDocumentId(sourceNode.kind === "container" ? "container" : "block")
  });
  const nodes = {
    [node.id]: node
  };

  if (sourceNode.kind !== "container") {
    return {
      rootId: node.id,
      nodes
    };
  }

  node.children = [];
  for (const childId of sourceNode.children ?? []) {
    const subtree = cloneExistingSubtree(document, childId);
    if (!subtree) {
      continue;
    }
    node.children.push(subtree.rootId);
    Object.assign(nodes, subtree.nodes);
  }

  return {
    rootId: node.id,
    nodes
  };
}

function insertSubtree(document, target, subtree) {
  const next = cloneLayoutDocument(document);
  const container = next.nodes[target.containerId];
  if (!container || container.kind !== "container") {
    return document;
  }

  Object.assign(next.nodes, subtree.nodes);
  const insertionIndex = clampInsertionIndex(container.children, target.index);
  container.children.splice(insertionIndex, 0, subtree.rootId);
  return repackAllGridContainers(next);
}

function readPercentBasis(node) {
  const basis = node?.placement?.flex?.basis;
  if (typeof basis !== "string" || !basis.trim().endsWith("%")) {
    return null;
  }
  const numeric = Number(basis.trim().slice(0, -1));
  return Number.isFinite(numeric) ? numeric : null;
}

export function insertBlueprintIntoLayout(document, target, blueprint) {
  const subtree = cloneBlueprintNode(blueprint);
  return {
    selectedNodeId: subtree.rootId,
    document: insertSubtree(document, target, subtree)
  };
}

export function duplicateNodeInLayout(document, nodeId) {
  if (!nodeId || nodeId === document.rootId) {
    return {
      selectedNodeId: nodeId,
      document
    };
  }

  const parentId = findParentContainerId(document, nodeId);
  if (!parentId) {
    return {
      selectedNodeId: nodeId,
      document
    };
  }

  const parent = document.nodes[parentId];
  const targetIndex = parent.children.indexOf(nodeId) + 1;
  const subtree = cloneExistingSubtree(document, nodeId);
  if (!subtree) {
    return {
      selectedNodeId: nodeId,
      document
    };
  }

  return {
    selectedNodeId: subtree.rootId,
    document: insertSubtree(document, { containerId: parentId, index: targetIndex }, subtree)
  };
}

export function resizeFlexPairInLayout(document, parentId, nodeId, nextSiblingId, nextPercent) {
  const next = cloneLayoutDocument(document);
  const parent = next.nodes[parentId];
  const node = next.nodes[nodeId];
  const nextSibling = next.nodes[nextSiblingId];

  if (!parent || !node || !nextSibling || parent.kind !== "container") {
    return document;
  }

  const currentPercent = readPercentBasis(node) ?? 50;
  const siblingPercent = readPercentBasis(nextSibling) ?? 50;
  const totalPercent = currentPercent + siblingPercent;
  const clampedCurrent = Math.max(15, Math.min(totalPercent - 15, nextPercent));
  const clampedSibling = Math.max(15, totalPercent - clampedCurrent);

  node.placement.flex = {
    ...(node.placement?.flex ?? {}),
    basis: `${Number(clampedCurrent.toFixed(3))}%`,
    grow: 0,
    shrink: 0
  };
  nextSibling.placement.flex = {
    ...(nextSibling.placement?.flex ?? {}),
    basis: `${Number(clampedSibling.toFixed(3))}%`,
    grow: 0,
    shrink: 0
  };

  return repackAllGridContainers(next);
}
