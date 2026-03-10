import {
  rectSortingStrategy,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";

function readNodeProps(node) {
  return node?.props ?? {};
}

function readGridPlacement(node) {
  return node?.placement?.grid ?? {};
}

function readFlexPlacement(node) {
  return node?.placement?.flex ?? {};
}

function readBasisPercent(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized.endsWith("%")) {
    return null;
  }

  const numeric = Number(normalized.slice(0, -1));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

function buildRowPercentageGroups(parentNode, nodesById = {}) {
  const groups = [];
  let currentGroup = [];
  let currentPercent = 0;

  for (const childId of parentNode?.children ?? []) {
    const childNode = nodesById?.[childId];
    if (!childNode) {
      continue;
    }

    const basis = childNode?.placement?.flex?.basis ?? "100%";
    const basisPercent = readBasisPercent(basis);

    if (!basisPercent) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
        currentPercent = 0;
      }
      continue;
    }

    if (currentGroup.length > 0 && currentPercent + basisPercent > 100) {
      groups.push(currentGroup);
      currentGroup = [];
      currentPercent = 0;
    }

    currentGroup.push({
      nodeId: childId,
      basisPercent
    });
    currentPercent += basisPercent;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function resolveAdjustedRowBasis(node, parentNode, nodesById = {}) {
  const basis = node?.placement?.flex?.basis ?? "100%";
  const basisPercent = readBasisPercent(basis);
  if (!basisPercent) {
    return basis;
  }

  const groups = buildRowPercentageGroups(parentNode, nodesById);
  const currentGroup = groups.find((group) => group.some((entry) => entry.nodeId === node.id));
  if (!currentGroup || currentGroup.length <= 1) {
    return basis;
  }

  const rowPercentTotal = currentGroup.reduce((sum, entry) => sum + entry.basisPercent, 0);
  if (!Number.isFinite(rowPercentTotal) || rowPercentTotal <= 0) {
    return basis;
  }

  const gap = parentNode?.props?.gap ?? 20;
  const totalGap = gap * Math.max(0, currentGroup.length - 1);
  if (totalGap <= 0) {
    return basis;
  }

  const gapShare = Number(((totalGap * basisPercent) / rowPercentTotal).toFixed(2));
  return `calc(${basis} - ${gapShare}px)`;
}

function buildRootContainerStyle() {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "28px",
    width: "100%",
    minWidth: 0
  };
}

function buildFlexContainerStyle(props) {
  return {
    display: "flex",
    flexDirection: props.direction ?? "column",
    flexWrap: props.wrap ?? "nowrap",
    justifyContent: props.justifyContent ?? "flex-start",
    alignItems: props.alignItems ?? "stretch",
    gap: `${props.gap ?? 20}px`,
    width: "100%",
    minWidth: 0,
    alignContent: "flex-start"
  };
}

function buildGridContainerStyle(props) {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${props.columns ?? 12}, minmax(0, 1fr))`,
    gridAutoRows: `${props.autoRows ?? 120}px`,
    gap: `${props.gap ?? 20}px`,
    width: "100%",
    minWidth: 0,
    alignItems: "stretch",
    alignContent: "start"
  };
}

export function buildContainerLayoutStyle(node, isRoot = false) {
  if (isRoot) {
    return buildRootContainerStyle();
  }

  const props = readNodeProps(node);

  if (node.layoutMode === "flex") {
    return buildFlexContainerStyle(props);
  }

  return buildGridContainerStyle(props);
}

function buildRootPlacementStyle() {
  return {
    width: "100%",
    minWidth: 0
  };
}

function buildFlexPlacementStyle(node, parentNode, nodesById = {}) {
  const flexPlacement = readFlexPlacement(node);
  const parentProps = readNodeProps(parentNode);
  const basis = flexPlacement.basis ?? "100%";
  const isRow = (parentProps.direction ?? "column") === "row";
  const effectiveBasis = isRow
    ? resolveAdjustedRowBasis(node, parentNode, nodesById)
    : basis;

  return {
    order: flexPlacement.order ?? 0,
    flexBasis: effectiveBasis,
    flexGrow: flexPlacement.grow ?? 0,
    flexShrink: flexPlacement.shrink ?? 0,
    width: isRow ? "auto" : "100%",
    maxWidth: isRow && basis !== "auto" ? effectiveBasis : undefined,
    minWidth: 0,
    minHeight: 0,
    alignSelf: "stretch"
  };
}

function buildGridPlacementStyle(gridPlacement) {
  return {
    gridColumn: `span ${gridPlacement.w ?? 12}`,
    gridRow: `span ${gridPlacement.h ?? 3}`,
    minWidth: 0,
    minHeight: 0,
    alignSelf: "stretch"
  };
}

export function buildPlacementStyle(node, parentNode, nodesById = {}, isRootParent = false) {
  if (isRootParent) {
    return buildRootPlacementStyle();
  }

  const parentMode = parentNode?.layoutMode ?? "grid";
  if (parentMode === "flex") {
    return buildFlexPlacementStyle(node, parentNode, nodesById);
  }

  return buildGridPlacementStyle(readGridPlacement(node));
}

export function resolveStrategy(node, isRoot = false) {
  if (isRoot) {
    return verticalListSortingStrategy;
  }

  if (node.layoutMode === "grid") {
    return rectSortingStrategy;
  }

  if ((node.props?.direction ?? "column") === "column" && (node.props?.wrap ?? "nowrap") === "nowrap") {
    return verticalListSortingStrategy;
  }

  return rectSortingStrategy;
}

export function resolveDropAxis(node, isRoot = false) {
  return "vertical";
}
