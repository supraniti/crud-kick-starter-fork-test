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
    minHeight: `${props.minHeight ?? 320}px`,
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
    minHeight: `${props.minHeight ?? 320}px`,
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

function buildFlexPlacementStyle(flexPlacement) {
  const basis = flexPlacement.basis ?? "100%";

  return {
    order: flexPlacement.order ?? 0,
    flexBasis: basis,
    flexGrow: flexPlacement.grow ?? 0,
    flexShrink: flexPlacement.shrink ?? 0,
    width: basis === "auto" ? "auto" : "100%",
    minWidth: 0
  };
}

function buildGridPlacementStyle(gridPlacement) {
  return {
    gridColumn: `span ${gridPlacement.w ?? 12}`,
    gridRow: `span ${gridPlacement.h ?? 3}`,
    minWidth: 0
  };
}

export function buildPlacementStyle(node, parentMode, isRootParent = false) {
  if (isRootParent) {
    return buildRootPlacementStyle();
  }

  if (parentMode === "flex") {
    return buildFlexPlacementStyle(readFlexPlacement(node));
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
