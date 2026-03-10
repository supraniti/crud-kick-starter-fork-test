const LAYOUT_NODE_KIND_SET = new Set(["container", "block"]);
const LAYOUT_MODE_SET = new Set(["grid", "flex"]);
const FLEX_DIRECTION_SET = new Set(["row", "column"]);
const FLEX_WRAP_SET = new Set(["nowrap", "wrap"]);
const FLEX_JUSTIFY_SET = new Set([
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly"
]);
const FLEX_ALIGN_SET = new Set(["stretch", "flex-start", "center", "flex-end"]);

function clampInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const normalized = Math.trunc(numeric);
  return Math.max(min, Math.min(max, normalized));
}

function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEnum(value, allowedValues, fallback) {
  return allowedValues.has(value) ? value : fallback;
}

function createDefaultGridPlacement(overrides = {}) {
  return {
    x: clampInteger(overrides.x, 0, { min: 0, max: 11 }),
    y: clampInteger(overrides.y, 0, { min: 0, max: 999 }),
    w: clampInteger(overrides.w, 12, { min: 1, max: 12 }),
    h: clampInteger(overrides.h, 2, { min: 1, max: 24 })
  };
}

function createDefaultFlexPlacement(overrides = {}) {
  return {
    order: clampInteger(overrides.order, 0, { min: 0, max: 999 }),
    basis: normalizeText(overrides.basis, "100%"),
    grow: clampInteger(overrides.grow, 0, { min: 0, max: 12 }),
    shrink: clampInteger(overrides.shrink, 0, { min: 0, max: 12 })
  };
}

function createDefaultContainerProps(layoutMode = "grid", overrides = {}) {
  const base = {
    gap: clampInteger(overrides.gap, 20, { min: 0, max: 96 }),
    padding: clampInteger(overrides.padding, 24, { min: 0, max: 96 }),
    minHeight: clampInteger(overrides.minHeight, 280, { min: 0, max: 2400 })
  };

  if (layoutMode === "flex") {
    return {
      ...base,
      direction: normalizeEnum(overrides.direction, FLEX_DIRECTION_SET, "column"),
      wrap: normalizeEnum(overrides.wrap, FLEX_WRAP_SET, "nowrap"),
      justifyContent: normalizeEnum(overrides.justifyContent, FLEX_JUSTIFY_SET, "flex-start"),
      alignItems: normalizeEnum(overrides.alignItems, FLEX_ALIGN_SET, "stretch")
    };
  }

  return {
    ...base,
    columns: clampInteger(overrides.columns, 12, { min: 1, max: 12 }),
    autoRows: clampInteger(overrides.autoRows, 120, { min: 24, max: 360 })
  };
}

function createDefaultBlockProps(overrides = {}) {
  return {
    minHeight: clampInteger(overrides.minHeight, 160, { min: 0, max: 2400 }),
    emphasis: normalizeText(overrides.emphasis, "default")
  };
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createLayoutDocumentId(prefix = "node") {
  const token = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${token}`;
}

export function createLayoutNode(node = {}) {
  const kind = normalizeEnum(node.kind, LAYOUT_NODE_KIND_SET, "block");
  const layoutMode = normalizeEnum(node.layoutMode, LAYOUT_MODE_SET, "grid");
  const placement = {
    grid: createDefaultGridPlacement(node.placement?.grid),
    flex: createDefaultFlexPlacement(node.placement?.flex)
  };

  return {
    id: normalizeText(node.id, createLayoutDocumentId(kind === "container" ? "container" : "block")),
    kind,
    label: normalizeText(node.label, kind === "container" ? "Container" : "Content Block"),
    layoutMode: kind === "container" ? layoutMode : undefined,
    props: kind === "container"
      ? createDefaultContainerProps(layoutMode, node.props)
      : createDefaultBlockProps(node.props),
    placement,
    children: kind === "container"
      ? (Array.isArray(node.children) ? [...new Set(node.children.filter((entry) => typeof entry === "string" && entry.trim().length > 0))] : [])
      : []
  };
}

export function createInitialLayoutDocument(options = {}) {
  const rootMode = normalizeEnum(options.rootMode, LAYOUT_MODE_SET, "flex");
  const rootId = normalizeText(options.rootId, "root");
  return {
    version: 1,
    rootId,
    nodes: {
      [rootId]: createLayoutNode({
        id: rootId,
        kind: "container",
        label: "Page",
        layoutMode: rootMode,
        props: createDefaultContainerProps(rootMode, {
          direction: "column",
          wrap: "nowrap",
          gap: 32,
          padding: 0,
          minHeight: 960
        }),
        children: []
      })
    }
  };
}

export function normalizeLayoutDocument(rawValue) {
  const fallback = createInitialLayoutDocument();
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return fallback;
  }

  const rootId = normalizeText(rawValue.rootId, fallback.rootId);
  const rawNodes = rawValue.nodes && typeof rawValue.nodes === "object" && !Array.isArray(rawValue.nodes)
    ? rawValue.nodes
    : {};
  const normalizedNodes = {};

  for (const [nodeId, nodeValue] of Object.entries(rawNodes)) {
    normalizedNodes[nodeId] = createLayoutNode({
      ...(nodeValue && typeof nodeValue === "object" ? nodeValue : {}),
      id: nodeId
    });
  }

  if (!normalizedNodes[rootId] || normalizedNodes[rootId].kind !== "container") {
    normalizedNodes[rootId] = createLayoutNode({
      id: rootId,
      kind: "container",
      label: "Page",
      layoutMode: "flex",
      props: createDefaultContainerProps("flex", {
        direction: "column",
        wrap: "nowrap",
        gap: 32,
        padding: 0,
        minHeight: 960
      }),
      children: []
    });
  }

  return {
    version: clampInteger(rawValue.version, 1, { min: 1, max: 10 }),
    rootId,
    nodes: normalizedNodes
  };
}

function collectReachableNodeIds(document) {
  const visited = new Set();

  function visit(nodeId) {
    if (visited.has(nodeId)) {
      return;
    }
    visited.add(nodeId);
    const node = document.nodes[nodeId];
    if (!node || node.kind !== "container") {
      return;
    }
    for (const childId of node.children) {
      visit(childId);
    }
  }

  visit(document.rootId);
  return visited;
}

export function validateLayoutDocument(rawValue) {
  const document = normalizeLayoutDocument(rawValue);
  const issues = [];
  const rootNode = document.nodes[document.rootId];

  if (!rootNode || rootNode.kind !== "container") {
    issues.push({
      code: "LAYOUT_ROOT_INVALID",
      message: "Root layout node must exist and be a container",
      fieldId: "layoutDocument"
    });
    return {
      document,
      issues
    };
  }

  const seenChildren = new Set();
  for (const [nodeId, node] of Object.entries(document.nodes)) {
    if (!LAYOUT_NODE_KIND_SET.has(node.kind)) {
      issues.push({
        code: "LAYOUT_NODE_KIND_INVALID",
        message: `Layout node '${nodeId}' uses an unsupported kind`,
        fieldId: "layoutDocument"
      });
    }

    if (node.kind === "container") {
      const childSet = new Set();
      for (const childId of node.children) {
        if (!document.nodes[childId]) {
          issues.push({
            code: "LAYOUT_CHILD_MISSING",
            message: `Container '${nodeId}' references missing child '${childId}'`,
            fieldId: "layoutDocument"
          });
          continue;
        }
        if (childSet.has(childId)) {
          issues.push({
            code: "LAYOUT_CHILD_DUPLICATE",
            message: `Container '${nodeId}' references child '${childId}' more than once`,
            fieldId: "layoutDocument"
          });
        }
        childSet.add(childId);
        seenChildren.add(childId);
      }
    }
  }

  const reachableIds = collectReachableNodeIds(document);
  for (const nodeId of Object.keys(document.nodes)) {
    if (!reachableIds.has(nodeId)) {
      issues.push({
        code: "LAYOUT_NODE_ORPHANED",
        message: `Layout node '${nodeId}' is not reachable from the root container`,
        fieldId: "layoutDocument"
      });
    }
  }

  if (seenChildren.has(document.rootId)) {
    issues.push({
      code: "LAYOUT_ROOT_REUSED",
      message: "Root container cannot be nested under another container",
      fieldId: "layoutDocument"
    });
  }

  return {
    document,
    issues
  };
}

export function serializeLayoutDocument(rawValue) {
  return JSON.stringify(normalizeLayoutDocument(rawValue));
}

export function parseStoredLayoutDocument(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return createInitialLayoutDocument();
  }
  try {
    return normalizeLayoutDocument(JSON.parse(value));
  } catch {
    return createInitialLayoutDocument();
  }
}

export function cloneLayoutDocument(rawValue) {
  return cloneJsonValue(normalizeLayoutDocument(rawValue));
}

export {
  FLEX_ALIGN_SET,
  FLEX_DIRECTION_SET,
  FLEX_JUSTIFY_SET,
  FLEX_WRAP_SET,
  LAYOUT_MODE_SET,
  LAYOUT_NODE_KIND_SET
};
