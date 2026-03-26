import {
  cloneLayoutDocument,
  createInitialLayoutDocument,
  createLayoutDocumentId,
  createLayoutNode,
  normalizeLayoutDocument
} from "../shared/layout-document.mjs";

function cloneDocument(document) {
  return cloneLayoutDocument(document);
}

function cloneNode(node) {
  return JSON.parse(JSON.stringify(node));
}

function readNode(document, nodeId) {
  return document.nodes[nodeId] ?? null;
}

function clampInsertionIndex(container, targetIndex) {
  if (targetIndex === null || typeof targetIndex === "undefined") {
    return container.children.length;
  }
  const nextIndex = Number(targetIndex);
  if (!Number.isInteger(nextIndex)) {
    return container.children.length;
  }
  return Math.max(0, Math.min(container.children.length, nextIndex));
}

export function createEmptyLayoutDraft() {
  const document = createInitialLayoutDocument();
  return {
    id: null,
    title: "",
    layoutKey: "layout-shell",
    summary: "",
    status: "draft",
    layoutDocument: document
  };
}

export function createLayoutDraftFromItem(item = {}) {
  return {
    id: item.id ?? null,
    title: item.title ?? "",
    layoutKey: item.layoutKey ?? "layout-shell",
    summary: item.summary ?? "",
    status: item.status ?? "draft",
    layoutDocument: normalizeLayoutDocument(item.layoutDocument)
  };
}

export function buildLayoutMutationPayload(draft) {
  return {
    title: draft.title,
    layoutKey: draft.layoutKey,
    summary: draft.summary || null,
    status: draft.status,
    layoutDocument: cloneLayoutDocument(draft.layoutDocument)
  };
}

export function findParentContainerId(document, nodeId, currentContainerId = document.rootId) {
  const container = readNode(document, currentContainerId);
  if (!container || container.kind !== "container") {
    return null;
  }
  if (container.children.includes(nodeId)) {
    return currentContainerId;
  }
  for (const childId of container.children) {
    const child = readNode(document, childId);
    if (child?.kind !== "container") {
      continue;
    }
    const next = findParentContainerId(document, nodeId, child.id);
    if (next) {
      return next;
    }
  }
  return null;
}

export function buildNodePath(document, nodeId) {
  if (!nodeId || !readNode(document, nodeId)) {
    return [];
  }
  if (nodeId === document.rootId) {
    return [document.rootId];
  }
  const parentId = findParentContainerId(document, nodeId);
  if (!parentId) {
    return [nodeId];
  }
  return [...buildNodePath(document, parentId), nodeId];
}

function collectDescendantIds(document, nodeId, visited = new Set()) {
  if (visited.has(nodeId)) {
    return visited;
  }
  visited.add(nodeId);
  const node = readNode(document, nodeId);
  if (!node || node.kind !== "container") {
    return visited;
  }
  for (const childId of node.children) {
    collectDescendantIds(document, childId, visited);
  }
  return visited;
}

export function isDescendantOf(document, nodeId, possibleAncestorId) {
  return collectDescendantIds(document, possibleAncestorId).has(nodeId);
}

function repackGridContainer(document, containerId) {
  const container = readNode(document, containerId);
  if (!container || container.kind !== "container" || container.layoutMode !== "grid") {
    return document;
  }

  const next = cloneDocument(document);
  const nextContainer = next.nodes[containerId];
  const columnCount = Math.max(1, nextContainer.props?.columns ?? 12);
  let currentColumn = 0;
  let currentRow = 0;
  let currentRowHeight = 0;

  for (const childId of nextContainer.children) {
    const child = next.nodes[childId];
    if (!child) {
      continue;
    }

    const width = Math.max(1, Math.min(columnCount, child.placement?.grid?.w ?? 6));
    const height = Math.max(1, child.placement?.grid?.h ?? 2);

    if (currentColumn + width > columnCount) {
      currentRow += currentRowHeight || 1;
      currentColumn = 0;
      currentRowHeight = 0;
    }

    child.placement = {
      ...child.placement,
      grid: {
        ...(child.placement?.grid ?? {}),
        x: currentColumn,
        y: currentRow,
        w: width,
        h: height
      }
    };

    currentColumn += width;
    currentRowHeight = Math.max(currentRowHeight, height);
  }

  return next;
}

function measureBlockHeightPx(node) {
  return Math.max((node?.props?.minHeight ?? 160) + 72, 220);
}

function measureGridChildrenHeightPx(document, container) {
  const gap = container.props?.gap ?? 20;
  const columnCount = Math.max(1, container.props?.columns ?? 12);
  let usedColumns = 0;
  let rowHeight = 0;
  let rowCount = 0;
  let totalHeight = 0;

  for (const childId of container.children) {
    const child = readNode(document, childId);
    if (!child) {
      continue;
    }

    const childWidth = Math.max(1, Math.min(columnCount, child.placement?.grid?.w ?? 12));
    const childHeight = measureNodeHeightPx(document, child.id);

    if (usedColumns > 0 && usedColumns + childWidth > columnCount) {
      totalHeight += rowHeight;
      rowCount += 1;
      usedColumns = 0;
      rowHeight = 0;
    }

    usedColumns += childWidth;
    rowHeight = Math.max(rowHeight, childHeight);
  }

  if (usedColumns > 0) {
    totalHeight += rowHeight;
    rowCount += 1;
  }

  if (rowCount > 1) {
    totalHeight += gap * (rowCount - 1);
  }

  return totalHeight;
}

function measureFlexChildrenHeightPx(document, container) {
  const gap = container.props?.gap ?? 20;
  const direction = container.props?.direction ?? "column";
  const wrap = container.props?.wrap ?? "nowrap";
  const childHeights = container.children
    .map((childId) => measureNodeHeightPx(document, childId))
    .filter((height) => Number.isFinite(height) && height > 0);

  if (childHeights.length === 0) {
    return 0;
  }

  if (direction === "row" && wrap === "nowrap") {
    return Math.max(...childHeights);
  }

  return childHeights.reduce((sum, height) => sum + height, 0) + gap * Math.max(0, childHeights.length - 1);
}

function measureContainerHeightPx(document, containerId) {
  const container = readNode(document, containerId);
  if (!container || container.kind !== "container") {
    return 0;
  }

  const minHeight = container.props?.minHeight ?? 320;
  const padding = container.props?.padding ?? 24;
  const chromeHeight = 72;

  if (!Array.isArray(container.children) || container.children.length === 0) {
    return Math.max(minHeight, 320) + chromeHeight;
  }

  const childrenHeight = container.layoutMode === "flex"
    ? measureFlexChildrenHeightPx(document, container)
    : measureGridChildrenHeightPx(document, container);

  return Math.max(minHeight, childrenHeight + padding * 2) + chromeHeight;
}

function measureNodeHeightPx(document, nodeId) {
  const node = readNode(document, nodeId);
  if (!node) {
    return 0;
  }
  if (node.kind === "container") {
    return measureContainerHeightPx(document, nodeId);
  }
  return measureBlockHeightPx(node);
}

function normalizeGridContainerHeights(document, containerId = document.rootId) {
  const next = cloneDocument(document);

  function visit(currentContainerId) {
    const container = next.nodes[currentContainerId];
    if (!container || container.kind !== "container") {
      return;
    }

    for (const childId of container.children) {
      const child = next.nodes[childId];
      if (child?.kind === "container") {
        visit(child.id);
      }
    }

    if (container.layoutMode !== "grid") {
      return;
    }

    const autoRows = Math.max(1, container.props?.autoRows ?? 120);
    for (const childId of container.children) {
      const child = next.nodes[childId];
      if (child?.kind !== "container") {
        continue;
      }
      const requiredRows = Math.max(4, Math.ceil(measureContainerHeightPx(next, child.id) / autoRows));
      child.placement = {
        ...child.placement,
        grid: {
          ...(child.placement?.grid ?? {}),
          h: requiredRows
        }
      };
    }
  }

  visit(containerId);
  return next;
}

function repackGridPlacements(document) {
  let next = cloneDocument(document);
  for (const node of Object.values(next.nodes)) {
    if (node?.kind === "container" && node.layoutMode === "grid") {
      next = repackGridContainer(next, node.id);
    }
  }
  return next;
}

export function repackAllGridContainers(document) {
  let next = repackGridPlacements(document);
  next = normalizeGridContainerHeights(next);
  next = repackGridPlacements(next);
  return normalizeGridContainerHeights(next);
}

function insertChild(document, containerId, nodeId, targetIndex = null) {
  const next = cloneDocument(document);
  const container = next.nodes[containerId];
  if (!container || container.kind !== "container") {
    return next;
  }

  const currentChildren = container.children.filter((childId) => childId !== nodeId);
  const insertionIndex = clampInsertionIndex(
    {
      ...container,
      children: currentChildren
    },
    targetIndex
  );
  currentChildren.splice(insertionIndex, 0, nodeId);
  container.children = currentChildren;
  return repackAllGridContainers(next);
}

export function createContainerInsertionTarget(document, containerId, targetIndex = null) {
  const container = readNode(document, containerId);
  if (!container || container.kind !== "container") {
    return {
      containerId: document.rootId,
      index: readNode(document, document.rootId)?.children?.length ?? 0
    };
  }

  return {
    containerId,
    index: clampInsertionIndex(container, targetIndex)
  };
}

export function createSiblingInsertionTarget(document, nodeId, position = "after") {
  const parentId = findParentContainerId(document, nodeId);
  if (!parentId) {
    return createContainerInsertionTarget(document, document.rootId, null);
  }
  const parentNode = readNode(document, parentId);
  const siblingIndex = parentNode.children.indexOf(nodeId);
  if (siblingIndex < 0) {
    return createContainerInsertionTarget(document, parentId, null);
  }
  return createContainerInsertionTarget(
    document,
    parentId,
    position === "before" ? siblingIndex : siblingIndex + 1
  );
}

export function resolveCreationTarget(document, selectedNodeId) {
  const selectedNode = readNode(document, selectedNodeId);
  if (!selectedNode) {
    return createContainerInsertionTarget(document, document.rootId, null);
  }
  if (selectedNode.kind === "container") {
    return createContainerInsertionTarget(document, selectedNode.id, null);
  }
  return createSiblingInsertionTarget(document, selectedNode.id, "after");
}

export function addNodeToLayout(document, target, kind, overrides = {}) {
  const next = cloneDocument(document);
  const normalizedTarget = typeof target === "string"
    ? createContainerInsertionTarget(next, target, null)
    : createContainerInsertionTarget(next, target?.containerId ?? next.rootId, target?.index ?? null);
  const defaultPlacement =
    kind === "container"
      ? {
          grid: { w: 12, h: 4 },
          flex: { basis: "100%", grow: 0, shrink: 0 }
        }
      : {
          grid: { w: 12, h: 3 },
          flex: { basis: "100%", grow: 0, shrink: 0 }
        };
  const defaultProps =
    kind === "container"
      ? {
          minHeight: 320,
          gap: 20,
          padding: 24,
          autoRows: 120,
          direction: "column",
          wrap: "nowrap"
        }
      : {
          minHeight: 160
        };
  const nextNode = createLayoutNode({
    id: createLayoutDocumentId(kind === "container" ? "container" : "block"),
    kind,
    label: overrides.label ?? (kind === "container" ? "Container" : "Content Block"),
    layoutMode: kind === "container" ? overrides.layoutMode ?? "grid" : undefined,
    props: {
      ...defaultProps,
      ...(overrides.props ?? {})
    },
    placement: {
      ...defaultPlacement,
      ...(overrides.placement ?? {}),
      grid: {
        ...defaultPlacement.grid,
        ...(overrides.placement?.grid ?? {})
      },
      flex: {
        ...defaultPlacement.flex,
        ...(overrides.placement?.flex ?? {})
      }
    }
  });
  next.nodes[nextNode.id] = nextNode;
  return {
    selectedNodeId: nextNode.id,
    document: insertChild(next, normalizedTarget.containerId, nextNode.id, normalizedTarget.index)
  };
}

export function updateNodeInLayout(document, nodeId, updater) {
  const node = readNode(document, nodeId);
  if (!node) {
    return document;
  }
  const next = cloneDocument(document);
  const current = next.nodes[nodeId];
  const patch = typeof updater === "function" ? updater(cloneNode(current)) : updater;
  next.nodes[nodeId] = {
    ...current,
    ...(patch ?? {})
  };
  if (next.nodes[nodeId].kind === "container") {
    next.nodes[nodeId].children = Array.isArray(next.nodes[nodeId].children)
      ? next.nodes[nodeId].children
      : [];
  }
  return repackAllGridContainers(next);
}

export function removeNodeFromLayout(document, nodeId) {
  if (!nodeId || nodeId === document.rootId) {
    return document;
  }
  const parentId = findParentContainerId(document, nodeId);
  if (!parentId) {
    return document;
  }

  const next = cloneDocument(document);
  const idsToRemove = [...collectDescendantIds(next, nodeId)];
  next.nodes[parentId].children = next.nodes[parentId].children.filter((childId) => childId !== nodeId);
  for (const descendantId of idsToRemove) {
    delete next.nodes[descendantId];
  }
  return repackAllGridContainers(next);
}

export function moveNodeInLayout(document, nodeId, targetContainerId, targetIndex = null) {
  if (!nodeId || nodeId === document.rootId) {
    return document;
  }

  const sourceContainerId = findParentContainerId(document, nodeId);
  const targetContainer = readNode(document, targetContainerId);
  if (!sourceContainerId || !targetContainer || targetContainer.kind !== "container") {
    return document;
  }
  if (targetContainerId === nodeId || isDescendantOf(document, targetContainerId, nodeId)) {
    return document;
  }

  const next = cloneDocument(document);
  const sourceIndex = next.nodes[sourceContainerId].children.indexOf(nodeId);
  let adjustedTargetIndex = targetIndex;

  if (
    sourceContainerId === targetContainerId
    && Number.isInteger(adjustedTargetIndex)
    && sourceIndex >= 0
    && sourceIndex < adjustedTargetIndex
  ) {
    adjustedTargetIndex -= 1;
  }

  next.nodes[sourceContainerId].children = next.nodes[sourceContainerId].children.filter((childId) => childId !== nodeId);
  return insertChild(next, targetContainerId, nodeId, adjustedTargetIndex);
}

export function resolveInsertionTarget(document, overId) {
  if (!overId || typeof overId !== "string") {
    return {
      containerId: document.rootId,
      index: null
    };
  }

  if (overId.startsWith("drop:")) {
    return {
      containerId: overId.slice(5),
      index: null
    };
  }

  if (overId.startsWith("insert:")) {
    const [, containerId, rawIndex] = overId.split(":");
    if (rawIndex === "end") {
      return createContainerInsertionTarget(document, containerId, null);
    }
    return createContainerInsertionTarget(document, containerId, Number(rawIndex));
  }

  if (overId.startsWith("inside:")) {
    const [, containerId, placement] = overId.split(":");
    return createContainerInsertionTarget(document, containerId, placement === "start" ? 0 : null);
  }

  if (overId.startsWith("node:")) {
    const [, nodeId, placement] = overId.split(":");
    return createSiblingInsertionTarget(document, nodeId, placement === "before" ? "before" : "after");
  }

  const parentId = findParentContainerId(document, overId);
  if (!parentId) {
    return {
      containerId: document.rootId,
      index: null
    };
  }

  const parent = readNode(document, parentId);
  return {
    containerId: parentId,
    index: parent.children.indexOf(overId) + 1
  };
}

export function resolveMoveTarget(document, activeId, overId) {
  if (!activeId || !overId || activeId === overId) {
    return null;
  }

  if (
    overId.startsWith("drop:")
    || overId.startsWith("insert:")
    || overId.startsWith("inside:")
    || overId.startsWith("node:")
  ) {
    return resolveInsertionTarget(document, overId);
  }

  const sourceContainerId = findParentContainerId(document, activeId);
  const targetContainerId = findParentContainerId(document, overId);
  if (!targetContainerId) {
    return createContainerInsertionTarget(document, document.rootId, null);
  }

  const targetContainer = readNode(document, targetContainerId);
  if (!targetContainer || targetContainer.kind !== "container") {
    return createContainerInsertionTarget(document, document.rootId, null);
  }

  const hoveredIndex = targetContainer.children.indexOf(overId);
  if (hoveredIndex < 0) {
    return createContainerInsertionTarget(document, targetContainerId, null);
  }

  if (sourceContainerId && sourceContainerId === targetContainerId) {
    const sourceContainer = readNode(document, sourceContainerId);
    const sourceIndex = sourceContainer?.children.indexOf(activeId) ?? -1;
    const targetIndex = sourceIndex >= 0 && sourceIndex < hoveredIndex
      ? hoveredIndex + 1
      : hoveredIndex;
    return createContainerInsertionTarget(document, targetContainerId, targetIndex);
  }

  return createContainerInsertionTarget(document, targetContainerId, hoveredIndex + 1);
}
