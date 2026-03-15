function toPixels(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric}px` : fallback;
}

function readGridPlacement(node = {}) {
  const placement = node?.placement?.grid ?? {};
  return {
    x: Number.isFinite(Number(placement.x)) ? Number(placement.x) : 0,
    y: Number.isFinite(Number(placement.y)) ? Number(placement.y) : 0,
    w: Number.isFinite(Number(placement.w)) ? Number(placement.w) : 12,
    h: Number.isFinite(Number(placement.h)) ? Number(placement.h) : 1
  };
}

function readFlexPlacement(node = {}) {
  const placement = node?.placement?.flex ?? {};
  return {
    order: Number.isFinite(Number(placement.order)) ? Number(placement.order) : 0,
    basis: typeof placement.basis === "string" && placement.basis.trim().length > 0 ? placement.basis : "100%",
    grow: Number.isFinite(Number(placement.grow)) ? Number(placement.grow) : 0,
    shrink: Number.isFinite(Number(placement.shrink)) ? Number(placement.shrink) : 0
  };
}

export function createContainerPreviewStyle(node = {}, isRoot = false) {
  const props = node?.props ?? {};
  const baseStyle = {
    display: node?.layoutMode === "grid" ? "grid" : "flex",
    gap: toPixels(props.gap, "20px"),
    padding: toPixels(props.padding, isRoot ? "0px" : "20px"),
    minHeight: toPixels(props.minHeight, isRoot ? "520px" : "180px"),
    borderRadius: "20px",
    border: isRoot ? "1px solid rgba(37, 99, 235, 0.18)" : "1px solid rgba(15, 23, 42, 0.12)",
    background: isRoot
      ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,247,250,0.96))"
      : "linear-gradient(180deg, rgba(248,250,252,0.96), rgba(241,245,249,0.96))"
  };

  if (node?.layoutMode === "grid") {
    return {
      ...baseStyle,
      gridTemplateColumns: `repeat(${Number(props.columns ?? 12)}, minmax(0, 1fr))`,
      gridAutoRows: toPixels(props.autoRows, "120px"),
      alignContent: "start"
    };
  }

  return {
    ...baseStyle,
    flexDirection: props.direction ?? "column",
    flexWrap: props.wrap ?? "nowrap",
    justifyContent: props.justifyContent ?? "flex-start",
    alignItems: props.alignItems ?? "stretch",
    alignContent: "stretch"
  };
}

export function createNodePlacementStyle(node = {}, parentNode = null) {
  if (!parentNode || parentNode.kind !== "container") {
    return {};
  }

  if (parentNode.layoutMode === "grid") {
    const placement = readGridPlacement(node);
    return {
      gridColumn: `${placement.x + 1} / span ${placement.w}`,
      gridRow: `${placement.y + 1} / span ${placement.h}`
    };
  }

  const placement = readFlexPlacement(node);
  return {
    order: placement.order,
    flexBasis: placement.basis,
    flexGrow: placement.grow,
    flexShrink: placement.shrink
  };
}

function createNodeTagName(node = {}, isRoot = false) {
  if (isRoot) {
    return "main";
  }
  return node.kind === "container" ? "section" : "div";
}

function createMarkupLine({ node, depth, isRoot }) {
  const indent = "  ".repeat(depth);
  const tagName = createNodeTagName(node, isRoot);
  const roleToken = node.kind === "container" ? `${node.layoutMode}-container` : "content-block";
  const label = node.label ?? (node.kind === "container" ? "Container" : "Content Block");
  return `${indent}<${tagName} data-layout-node="${node.id}" data-layout-role="${roleToken}" aria-label="${label}">`;
}

function createClosingLine({ node, depth, isRoot }) {
  const indent = "  ".repeat(depth);
  return `${indent}</${createNodeTagName(node, isRoot)}>`;
}

function buildMarkupLines(document, nodeId, depth, isRoot = false) {
  const node = document?.nodes?.[nodeId];
  if (!node) {
    return [];
  }

  const lines = [createMarkupLine({ node, depth, isRoot })];
  if (node.kind === "container") {
    for (const childId of node.children ?? []) {
      lines.push(...buildMarkupLines(document, childId, depth + 1, false));
    }
  } else {
    lines.push(`${"  ".repeat(depth + 1)}<!-- ${node.label ?? "Content Block"} -->`);
  }
  lines.push(createClosingLine({ node, depth, isRoot }));
  return lines;
}

export function createLayoutPreviewMarkup(document = {}) {
  const rootId = typeof document?.rootId === "string" ? document.rootId : "";
  if (!rootId) {
    return "";
  }
  return buildMarkupLines(document, rootId, 0, true).join("\n");
}
