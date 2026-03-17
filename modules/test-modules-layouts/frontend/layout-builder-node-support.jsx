import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";

function resolveContainerMinHeight(node, isRoot) {
  if (isRoot) {
    return 0;
  }
  return Math.max(180, node.props?.minHeight ?? 320);
}

function resolveContainerContentMinHeight(node, isRoot) {
  if (isRoot) {
    return 0;
  }
  const padding = node.props?.padding ?? 24;
  return Math.max(120, resolveContainerMinHeight(node, false) - padding * 2);
}

function readPercentBasis(node) {
  const basis = node?.placement?.flex?.basis;
  if (typeof basis !== "string" || !basis.trim().endsWith("%")) {
    return null;
  }
  const numeric = Number(basis.trim().slice(0, -1));
  return Number.isFinite(numeric) ? Number(numeric.toFixed(1)) : null;
}

function resolveNodeSizeLabel(node, parentNode, pageContentWidth) {
  if (!parentNode) {
    return `${pageContentWidth}px`;
  }

  if (parentNode.layoutMode === "grid") {
    return `${node.placement?.grid?.w ?? 12}/12`;
  }

  if ((parentNode.props?.direction ?? "column") === "row") {
    const basis = readPercentBasis(node);
    return basis ? `${basis}%` : node.placement?.flex?.basis ?? "auto";
  }

  return "100%";
}

function FlexResizeHandle({ parentId, nodeId, nextSiblingId, node, nextSiblingNode, onResizePair }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    function handlePointerMove(event) {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }
      const deltaPx = event.clientX - dragState.startX;
      const deltaPercent = (deltaPx / dragState.pairWidth) * dragState.totalPercent;
      onResizePair(
        parentId,
        nodeId,
        nextSiblingId,
        dragState.startPercent + deltaPercent
      );
    }

    function handlePointerUp() {
      dragStateRef.current = null;
      setIsDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, nextSiblingId, nodeId, onResizePair, parentId]);

  return (
    <Box
      role="presentation"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const currentShell = event.currentTarget.parentElement;
        const nextShell = currentShell?.ownerDocument?.querySelector(`[data-layout-node-shell="${nextSiblingId}"]`);
        const currentWidth = currentShell?.getBoundingClientRect().width ?? 0;
        const nextWidth = nextShell?.getBoundingClientRect().width ?? 0;
        const pairWidth = currentWidth + nextWidth;
        const currentPercent = readPercentBasis(node) ?? 50;
        const nextPercent = readPercentBasis(nextSiblingNode) ?? 50;
        const totalPercent = currentPercent + nextPercent;

        if (!Number.isFinite(pairWidth) || pairWidth <= 0 || totalPercent <= 0) {
          return;
        }

        dragStateRef.current = {
          pairWidth,
          startPercent: currentPercent,
          totalPercent,
          startX: event.clientX
        };
        setIsDragging(true);
      }}
      sx={{
        position: "absolute",
        top: 28,
        right: -7,
        bottom: 28,
        width: 14,
        zIndex: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "col-resize"
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 52,
          borderRadius: 999,
          backgroundColor: isDragging ? "primary.main" : "rgba(37,99,235,0.28)",
          boxShadow: isDragging ? "0 0 0 6px rgba(37,99,235,0.16)" : "none"
        }}
      />
    </Box>
  );
}

export {
  FlexResizeHandle,
  readPercentBasis,
  resolveContainerContentMinHeight,
  resolveContainerMinHeight,
  resolveNodeSizeLabel
};
