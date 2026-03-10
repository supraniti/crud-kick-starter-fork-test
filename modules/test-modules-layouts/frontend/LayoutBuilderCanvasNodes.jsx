import { Box, Paper, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import {
  buildContainerLayoutStyle,
  buildPlacementStyle,
  resolveDropAxis,
  resolveStrategy
} from "./layout-builder-canvas-layout.js";
import {
  BlockVisual,
  ContainerEmptyState,
  ContainerEndSlot,
  DropSlot,
  NodeHeader
} from "./LayoutBuilderCanvasPrimitives.jsx";

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

function BlockNode({
  node,
  parentMode,
  selectedNodeId,
  onSelectNode,
  onMoveSelectedNodeToTarget,
  onOpenNodeDialog,
  onToggleMoveMode,
  containerId,
  childIndex,
  showDropSlots,
  containerAxis,
  isMoveMode,
  dragHandleProps
}) {
  const isSelected = selectedNodeId === node.id;
  const showContainerSlots = showDropSlots;

  return (
    <Box
      sx={{
        height: parentMode === "grid" ? "100%" : "auto",
        minHeight: 0,
        position: "relative",
        minWidth: 0
      }}
    >
      <DropSlot
        slotId={`insert:${containerId}:${childIndex}`}
        axis={containerAxis}
        showDropSlots={showContainerSlots}
        label={`Move selected node to position ${childIndex + 1}`}
        onClick={() => onMoveSelectedNodeToTarget?.({ containerId, index: childIndex })}
      />
      <Paper
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          onSelectNode(node.id);
        }}
        sx={{
          height: parentMode === "grid" ? "100%" : "auto",
          minHeight: 0,
          minWidth: 0,
          p: 1,
          pt: 5,
          borderRadius: 3,
          cursor: "default",
          borderColor: isSelected ? "primary.main" : "rgba(15,23,42,0.08)",
          boxShadow: isSelected
            ? "0 0 0 3px rgba(37,99,235,0.08), 0 18px 42px rgba(15,23,42,0.08)"
            : "0 12px 28px rgba(15,23,42,0.05)",
          backgroundColor: "rgba(255,255,255,0.98)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          '&:hover .node-toolbar': {
            opacity: 1,
            pointerEvents: "auto"
          }
        }}
      >
        <NodeHeader
          label={node.label}
          isSelected={isSelected}
          isContainer={false}
          isMoveMode={isSelected && isMoveMode}
          canMove
          onOpenNodeDialog={() => onOpenNodeDialog(node.id)}
          onToggleMoveMode={() => onToggleMoveMode?.(node.id)}
          dragHandleProps={dragHandleProps}
        />
        <BlockVisual node={node} parentMode={parentMode} isSelected={isSelected} />
      </Paper>
    </Box>
  );
}

function ContainerChildren({
  node,
  nodes,
  rootId,
  isRoot,
  selectedNodeId,
  onSelectNode,
  onMoveSelectedNodeToTarget,
  onAppendBlockToContainer,
  onAppendGridContainerToContainer,
  onAppendFlexContainerToContainer,
  onOpenNodeDialog,
  onToggleMoveMode,
  showDropSlots,
  isMoveMode,
  moveSourceParentId
}) {
  const childIds = node.children.filter((childId) => nodes[childId]);
  const rootSlotsEnabled = !isRoot || !moveSourceParentId || moveSourceParentId === rootId;
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${node.id}`,
    disabled: isRoot && !rootSlotsEnabled
  });
  const containerAxis = resolveDropAxis(node, isRoot);
  const showContainerSlots = showDropSlots && rootSlotsEnabled;
  const containerPadding = isRoot ? 0 : node.props?.padding ?? 24;
  const childrenLayoutStyle = {
    ...buildContainerLayoutStyle(node, isRoot),
    minHeight: resolveContainerContentMinHeight(node, isRoot),
    padding: `${containerPadding}px`,
    boxSizing: "border-box"
  };

  return (
    <Box
      ref={setDropRef}
      sx={{
        width: "100%",
        minWidth: 0,
        minHeight: resolveContainerMinHeight(node, isRoot),
        borderRadius: isRoot ? 0 : 3,
        backgroundColor: isRoot ? "transparent" : "rgba(248,250,252,0.96)",
        border: isRoot ? "none" : "1px solid rgba(15,23,42,0.08)",
        boxShadow: isRoot ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.6)",
        overflow: "clip",
        outline: isOver ? "2px solid rgba(37,99,235,0.42)" : "none"
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelectNode(node.id);
      }}
    >
      {childIds.length === 0 ? (
        <ContainerEmptyState
          isRoot={isRoot}
          onAddBlock={() => onAppendBlockToContainer(node.id)}
          onAddGridContainer={() => onAppendGridContainerToContainer(node.id)}
          onAddFlexContainer={() => onAppendFlexContainerToContainer(node.id)}
        />
      ) : (
        <>
          <SortableContext items={childIds} strategy={resolveStrategy(node, isRoot)}>
            <Box sx={childrenLayoutStyle}>
              {childIds.map((childId, index) => (
                <SortableCanvasNode
                  key={childId}
                  node={nodes[childId]}
                  nodes={nodes}
                  rootId={rootId}
                  parentNode={node}
                  parentMode={isRoot ? "root" : node.layoutMode}
                  isRootParent={isRoot}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={onSelectNode}
                  onMoveSelectedNodeToTarget={onMoveSelectedNodeToTarget}
                  onAppendBlockToContainer={onAppendBlockToContainer}
                  onAppendGridContainerToContainer={onAppendGridContainerToContainer}
                  onAppendFlexContainerToContainer={onAppendFlexContainerToContainer}
                  onOpenNodeDialog={onOpenNodeDialog}
                  onToggleMoveMode={onToggleMoveMode}
                  containerId={node.id}
                  childIndex={index}
                  showDropSlots={showContainerSlots}
                  containerAxis={containerAxis}
                  isMoveMode={isMoveMode}
                  moveSourceParentId={moveSourceParentId}
                />
              ))}
            </Box>
          </SortableContext>
          <ContainerEndSlot
            slotId={`insert:${node.id}:end`}
            axis={containerAxis}
            showDropSlots={showContainerSlots}
            label={`Move selected node to the end of ${node.label}`}
            onClick={() => onMoveSelectedNodeToTarget?.({ containerId: node.id, index: null })}
          />
        </>
      )}
    </Box>
  );
}

function ContainerSurface({
  node,
  nodes,
  rootId,
  parentMode,
  isRoot,
  selectedNodeId,
  onSelectNode,
  onMoveSelectedNodeToTarget,
  onAppendBlockToContainer,
  onAppendGridContainerToContainer,
  onAppendFlexContainerToContainer,
  onOpenNodeDialog,
  onToggleMoveMode,
  dragHandleProps,
  containerId,
  childIndex,
  showDropSlots,
  containerAxis,
  isMoveMode,
  moveSourceParentId
}) {
  const isSelected = selectedNodeId === node.id;

  if (isRoot) {
    return (
      <ContainerChildren
        node={node}
        nodes={nodes}
        rootId={rootId}
        isRoot={isRoot}
        selectedNodeId={selectedNodeId}
        onSelectNode={onSelectNode}
        onMoveSelectedNodeToTarget={onMoveSelectedNodeToTarget}
        onAppendBlockToContainer={onAppendBlockToContainer}
        onAppendGridContainerToContainer={onAppendGridContainerToContainer}
        onAppendFlexContainerToContainer={onAppendFlexContainerToContainer}
        onOpenNodeDialog={onOpenNodeDialog}
        onToggleMoveMode={onToggleMoveMode}
        showDropSlots={showDropSlots}
        isMoveMode={isMoveMode}
        moveSourceParentId={moveSourceParentId}
      />
    );
  }

  return (
    <Box
      sx={{
        height: parentMode === "grid" ? "100%" : "auto",
        minHeight: 0,
        minWidth: 0,
        position: "relative"
      }}
    >
      <DropSlot
        slotId={`insert:${containerId}:${childIndex}`}
        axis={containerAxis}
        showDropSlots={showDropSlots}
        label={`Move selected node to position ${childIndex + 1}`}
        onClick={() => onMoveSelectedNodeToTarget?.({ containerId, index: childIndex })}
      />
      <Paper
        variant="outlined"
        sx={{
          height: parentMode === "grid" ? "100%" : "auto",
          minHeight: 0,
          minWidth: 0,
          borderRadius: 4,
          borderColor: isSelected ? "primary.main" : "rgba(15,23,42,0.08)",
          backgroundColor: "rgba(255,255,255,0.98)",
          boxShadow: isSelected
            ? "0 0 0 3px rgba(37,99,235,0.08), 0 22px 48px rgba(15,23,42,0.1)"
            : "0 16px 34px rgba(15,23,42,0.06)",
          p: 1,
          pt: 5,
          position: "relative",
          overflow: "hidden",
          '&:hover .node-toolbar': {
            opacity: 1,
            pointerEvents: "auto"
          }
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelectNode(node.id);
        }}
      >
        <NodeHeader
          label={node.label}
          mode={node.layoutMode}
          isSelected={isSelected}
          isContainer
          isMoveMode={isSelected && isMoveMode}
          canMove
          onAddBlock={() => onAppendBlockToContainer(node.id)}
          onAddGridContainer={() => onAppendGridContainerToContainer(node.id)}
          onAddFlexContainer={() => onAppendFlexContainerToContainer(node.id)}
          onOpenNodeDialog={() => onOpenNodeDialog(node.id)}
          onToggleMoveMode={() => onToggleMoveMode?.(node.id)}
          dragHandleProps={dragHandleProps}
        />
        <ContainerChildren
          node={node}
          nodes={nodes}
          rootId={rootId}
          isRoot={isRoot}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onMoveSelectedNodeToTarget={onMoveSelectedNodeToTarget}
          onAppendBlockToContainer={onAppendBlockToContainer}
          onAppendGridContainerToContainer={onAppendGridContainerToContainer}
          onAppendFlexContainerToContainer={onAppendFlexContainerToContainer}
          onOpenNodeDialog={onOpenNodeDialog}
          onToggleMoveMode={onToggleMoveMode}
          showDropSlots={showDropSlots}
          isMoveMode={isMoveMode}
          moveSourceParentId={moveSourceParentId}
        />
      </Paper>
    </Box>
  );
}

function SortableCanvasNode({
  node,
  nodes,
  rootId,
  parentNode,
  parentMode,
  isRootParent,
  selectedNodeId,
  onSelectNode,
  onMoveSelectedNodeToTarget,
  onAppendBlockToContainer,
  onAppendGridContainerToContainer,
  onAppendFlexContainerToContainer,
  onOpenNodeDialog,
  onToggleMoveMode,
  containerId,
  childIndex,
  showDropSlots,
  containerAxis,
  isMoveMode,
  moveSourceParentId
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: node.id });

  if (!node) {
    return null;
  }

  return (
    <Box
      ref={setNodeRef}
      sx={{
        ...buildPlacementStyle(node, parentNode, nodes, isRootParent),
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        height: parentMode === "grid" ? "100%" : "auto",
        minHeight: 0,
        minWidth: 0,
        width: parentMode === "grid" ? "100%" : undefined,
        position: "relative"
      }}
    >
      {node.kind === "container" ? (
        <ContainerSurface
          node={node}
          nodes={nodes}
          rootId={rootId}
          parentMode={parentMode}
          isRoot={false}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onMoveSelectedNodeToTarget={onMoveSelectedNodeToTarget}
          onAppendBlockToContainer={onAppendBlockToContainer}
          onAppendGridContainerToContainer={onAppendGridContainerToContainer}
          onAppendFlexContainerToContainer={onAppendFlexContainerToContainer}
          onOpenNodeDialog={onOpenNodeDialog}
          onToggleMoveMode={onToggleMoveMode}
          dragHandleProps={{
            setActivatorNodeRef,
            attributes,
            listeners
          }}
          containerId={containerId}
          childIndex={childIndex}
          showDropSlots={showDropSlots}
          containerAxis={containerAxis}
          isMoveMode={isMoveMode}
          moveSourceParentId={moveSourceParentId}
        />
      ) : (
        <BlockNode
          node={node}
          parentMode={parentMode}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onMoveSelectedNodeToTarget={onMoveSelectedNodeToTarget}
          onOpenNodeDialog={onOpenNodeDialog}
          onToggleMoveMode={onToggleMoveMode}
          containerId={containerId}
          childIndex={childIndex}
          showDropSlots={showDropSlots}
          containerAxis={containerAxis}
          isMoveMode={isMoveMode}
          dragHandleProps={{
            setActivatorNodeRef,
            attributes,
            listeners
          }}
        />
      )}
    </Box>
  );
}

export function RootStageContent({
  document,
  selectedNodeId,
  onSelectNode,
  onMoveSelectedNodeToTarget,
  onAppendBlockToContainer,
  onAppendGridContainerToContainer,
  onAppendFlexContainerToContainer,
  onOpenNodeDialog,
  onToggleMoveMode,
  showDropSlots,
  isMoveMode,
  moveSourceParentId
}) {
  const rootNode = document?.nodes?.[document.rootId] ?? null;

  if (!rootNode) {
    return null;
  }

  return (
    <Box onClick={() => onSelectNode(rootNode.id)} sx={{ minHeight: 960 }}>
      <ContainerSurface
        node={rootNode}
        nodes={document.nodes}
        rootId={rootNode.id}
        parentMode="root"
        isRoot
        isRootParent
        selectedNodeId={selectedNodeId}
        onSelectNode={onSelectNode}
        onMoveSelectedNodeToTarget={onMoveSelectedNodeToTarget}
        onAppendBlockToContainer={onAppendBlockToContainer}
        onAppendGridContainerToContainer={onAppendGridContainerToContainer}
        onAppendFlexContainerToContainer={onAppendFlexContainerToContainer}
        onOpenNodeDialog={onOpenNodeDialog}
        onToggleMoveMode={onToggleMoveMode}
        dragHandleProps={{
          setActivatorNodeRef: null,
          attributes: {},
          listeners: {}
        }}
        containerId={rootNode.id}
        childIndex={0}
        showDropSlots={showDropSlots}
        containerAxis="vertical"
        isMoveMode={isMoveMode}
        moveSourceParentId={moveSourceParentId}
      />
    </Box>
  );
}

export function DragPreview({ node }) {
  if (!node) {
    return null;
  }

  return (
    <Paper variant="elevation" elevation={10} sx={{ px: 1.5, py: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {node.label}
      </Typography>
    </Paper>
  );
}
