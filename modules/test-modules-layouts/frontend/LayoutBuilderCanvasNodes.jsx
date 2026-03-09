import { Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";

function buildContainerLayoutStyle(node, isRoot = false) {
  if (isRoot) {
    return {
      display: "flex",
      flexDirection: "column",
      gap: "32px"
    };
  }

  if (node.layoutMode === "flex") {
    return {
      display: "flex",
      flexDirection: node.props?.direction ?? "column",
      flexWrap: node.props?.wrap ?? "nowrap",
      justifyContent: node.props?.justifyContent ?? "flex-start",
      alignItems: node.props?.alignItems ?? "stretch",
      gap: `${node.props?.gap ?? 20}px`,
      padding: 0,
      minHeight: `${node.props?.minHeight ?? 320}px`
    };
  }

  return {
    display: "grid",
    gridTemplateColumns: `repeat(${node.props?.columns ?? 12}, minmax(0, 1fr))`,
    gridAutoRows: `${node.props?.autoRows ?? 120}px`,
    gap: `${node.props?.gap ?? 20}px`,
    padding: 0,
    minHeight: `${node.props?.minHeight ?? 320}px`
  };
}

function buildPlacementStyle(node, parentMode, isRootParent = false) {
  if (isRootParent) {
    return {
      width: "100%"
    };
  }

  if (parentMode === "flex") {
    return {
      order: node.placement?.flex?.order ?? 0,
      flexBasis: node.placement?.flex?.basis ?? "100%",
      flexGrow: node.placement?.flex?.grow ?? 0,
      flexShrink: node.placement?.flex?.shrink ?? 0,
      width: node.placement?.flex?.basis === "auto" ? "auto" : "100%"
    };
  }

  return {
    gridColumn: `span ${node.placement?.grid?.w ?? 12}`,
    gridRow: `span ${node.placement?.grid?.h ?? 2}`
  };
}

function resolveStrategy(node, isRoot = false) {
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

function ActionButton({ children, color = "inherit", onClick, variant = "text" }) {
  return (
    <Button
      size="small"
      variant={variant}
      color={color}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      sx={{
        minWidth: 0,
        px: 1.25,
        py: 0.5,
        borderRadius: 999,
        textTransform: "none"
      }}
    >
      {children}
    </Button>
  );
}

function DragHandle({ setActivatorNodeRef, attributes, listeners }) {
  return (
    <Tooltip title="Drag to reorder">
      <IconButton
        ref={setActivatorNodeRef}
        size="small"
        aria-label="Drag node"
        onClick={(event) => event.stopPropagation()}
        sx={{
          width: 34,
          height: 34,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper"
        }}
        {...attributes}
        {...listeners}
      >
        ::
      </IconButton>
    </Tooltip>
  );
}

function NodeLabel({ node, isRoot = false }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
      <Typography variant={isRoot ? "h6" : "subtitle1"} sx={{ fontWeight: 700 }}>
        {node.label}
      </Typography>
      {node.kind === "container" && !isRoot ? (
        <Chip size="small" variant="outlined" color="primary" label={node.layoutMode} />
      ) : null}
    </Stack>
  );
}

function ContainerEmptyState({ isRoot, onAddBlock, onAddGridContainer, onAddFlexContainer }) {
  return (
    <Stack
      spacing={2.25}
      alignItems="center"
      justifyContent="center"
      sx={{
        minHeight: isRoot ? 420 : 320,
        borderRadius: 3,
        border: "2px dashed rgba(15,23,42,0.14)",
        backgroundColor: "rgba(255,255,255,0.82)",
        px: 4,
        py: 5,
        textAlign: "center"
      }}
    >
      <Stack spacing={1} alignItems="center">
        <Typography variant="overline" color="text.secondary">
          {isRoot ? "Empty Page" : "Empty Section"}
        </Typography>
        <Typography variant="h5">
          {isRoot ? "Start with a full-width section" : "This section is ready to contain blocks"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
          {isRoot
            ? "Sections define the major page structure. Add one first, then place blocks or nested containers inside it."
            : "Use this frame as a real container surface. Add blocks for content placeholders or nested containers for deeper structure."}
        </Typography>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} useFlexGap flexWrap="wrap">
        <Button variant="contained" onClick={onAddGridContainer}>
          Add Section
        </Button>
        <Button variant="outlined" onClick={onAddBlock}>
          Add Block
        </Button>
        <Button variant="outlined" onClick={onAddFlexContainer}>
          Add Flex Container
        </Button>
      </Stack>
    </Stack>
  );
}

function ContainerFooterActions({ onAddBlock, onAddGridContainer, onAddFlexContainer }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      sx={{ pt: 1.5 }}
    >
      <Button size="small" variant="contained" onClick={onAddGridContainer}>
        Add Section
      </Button>
      <Button size="small" variant="outlined" onClick={onAddBlock}>
        Add Block
      </Button>
      <Button size="small" variant="outlined" onClick={onAddFlexContainer}>
        Add Flex Container
      </Button>
    </Stack>
  );
}

function BlockVisual({ node, isSelected }) {
  return (
    <Box
      sx={{
        minHeight: `${node.props?.minHeight ?? 220}px`,
        borderRadius: 3,
        border: "1px solid rgba(15,23,42,0.08)",
        background: isSelected
          ? "linear-gradient(180deg, rgba(239,246,255,1), rgba(219,234,254,0.78))"
          : "linear-gradient(180deg, rgba(255,255,255,1), rgba(248,250,252,0.96))",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        '&::before': {
          content: '""',
          position: "absolute",
          inset: 20,
          borderRadius: 2.5,
          border: "1px dashed rgba(15,23,42,0.12)"
        }
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ position: "relative", letterSpacing: "0.08em", textTransform: "uppercase" }}
      >
        Block
      </Typography>
    </Box>
  );
}

function BlockNode({
  node,
  parentMode,
  isRootParent,
  selectedNodeId,
  onSelectNode,
  onAddBlockBefore,
  onAddBlockAfter,
  onAddGridContainerBefore,
  onAddGridContainerAfter,
  onRemoveSelectedNode
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
  const isSelected = selectedNodeId === node.id;

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      onClick={(event) => {
        event.stopPropagation();
        onSelectNode(node.id);
      }}
      sx={{
        ...buildPlacementStyle(node, parentMode, isRootParent),
        transform: CSS.Transform.toString(transform),
        transition,
        p: 2,
        borderRadius: 3,
        cursor: "default",
        opacity: isDragging ? 0.55 : 1,
        borderColor: isSelected ? "primary.main" : "rgba(15,23,42,0.08)",
        boxShadow: isSelected
          ? "0 0 0 4px rgba(37,99,235,0.08), 0 18px 42px rgba(15,23,42,0.08)"
          : "0 14px 34px rgba(15,23,42,0.06)",
        backgroundColor: "rgba(255,255,255,0.98)",
        display: "flex",
        flexDirection: "column",
        gap: 1.5
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <NodeLabel node={node} />
        <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
          {isSelected ? (
            <>
              <ActionButton onClick={onAddBlockBefore}>Add Before</ActionButton>
              <ActionButton onClick={onAddBlockAfter}>Add After</ActionButton>
              <ActionButton onClick={onAddGridContainerBefore}>Section Before</ActionButton>
              <ActionButton onClick={onAddGridContainerAfter}>Section After</ActionButton>
              <ActionButton color="error" onClick={onRemoveSelectedNode}>Delete</ActionButton>
            </>
          ) : null}
          <DragHandle
            setActivatorNodeRef={setActivatorNodeRef}
            attributes={attributes}
            listeners={listeners}
          />
        </Stack>
      </Stack>
      <BlockVisual node={node} isSelected={isSelected} />
    </Paper>
  );
}

function SectionSurface({
  node,
  nodes,
  rootId,
  parentMode,
  isRoot,
  isRootParent,
  selectedNodeId,
  onSelectNode,
  onAppendBlockToContainer,
  onAppendGridContainerToContainer,
  onAppendFlexContainerToContainer,
  onAddBlockBefore,
  onAddBlockAfter,
  onAddGridContainerBefore,
  onAddGridContainerAfter,
  onRemoveSelectedNode,
  dragHandleProps
}) {
  const childIds = node.children.filter((childId) => nodes[childId]);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `drop:${node.id}` });
  const isSelected = selectedNodeId === node.id;
  const bodyLayoutStyle = childIds.length === 0
    ? {
        minHeight: isRoot ? 0 : `${node.props?.minHeight ?? 320}px`
      }
    : buildContainerLayoutStyle(node, isRoot);

  const content = (
    <Stack spacing={2.25}>
      {!isRoot ? (
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <NodeLabel node={node} />
          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
            {isSelected ? (
              <>
                <ActionButton onClick={() => onAppendBlockToContainer(node.id)}>Add Block</ActionButton>
                <ActionButton onClick={() => onAppendGridContainerToContainer(node.id)} variant="contained">
                  Add Section
                </ActionButton>
                <ActionButton onClick={() => onAppendFlexContainerToContainer(node.id)}>Add Flex</ActionButton>
                <ActionButton color="error" onClick={onRemoveSelectedNode}>Delete</ActionButton>
              </>
            ) : null}
            <DragHandle
              setActivatorNodeRef={dragHandleProps.setActivatorNodeRef}
              attributes={dragHandleProps.attributes}
              listeners={dragHandleProps.listeners}
            />
          </Stack>
        </Stack>
      ) : null}
      <Box
        ref={setDropRef}
        sx={{
          ...bodyLayoutStyle,
          borderRadius: isRoot ? 0 : 2.5,
          backgroundColor: isRoot ? "transparent" : "rgba(248,250,252,0.94)",
          border: isRoot ? "none" : "1px solid rgba(15,23,42,0.08)",
          boxShadow: isRoot ? "none" : isSelected ? "0 0 0 4px rgba(37,99,235,0.08)" : "inset 0 0 0 1px rgba(255,255,255,0.6)",
          p: isRoot ? 0 : 2.5,
          outline: isOver ? "2px solid rgba(37,99,235,0.42)" : "none",
          outlineOffset: 0
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
          <SortableContext items={childIds} strategy={resolveStrategy(node, isRoot)}>
            <Box sx={buildContainerLayoutStyle(node, isRoot)}>
              {childIds.map((childId) => (
                <SortableCanvasNode
                  key={childId}
                  node={nodes[childId]}
                  nodes={nodes}
                  rootId={rootId}
                  parentMode={isRoot ? "root" : node.layoutMode}
                  isRootParent={isRoot}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={onSelectNode}
                  onAppendBlockToContainer={onAppendBlockToContainer}
                  onAppendGridContainerToContainer={onAppendGridContainerToContainer}
                  onAppendFlexContainerToContainer={onAppendFlexContainerToContainer}
                  onAddBlockBefore={onAddBlockBefore}
                  onAddBlockAfter={onAddBlockAfter}
                  onAddGridContainerBefore={onAddGridContainerBefore}
                  onAddGridContainerAfter={onAddGridContainerAfter}
                  onRemoveSelectedNode={onRemoveSelectedNode}
                />
              ))}
            </Box>
          </SortableContext>
        )}
      </Box>
      {!isRoot && isSelected && childIds.length > 0 ? (
        <ContainerFooterActions
          onAddBlock={() => onAppendBlockToContainer(node.id)}
          onAddGridContainer={() => onAppendGridContainerToContainer(node.id)}
          onAddFlexContainer={() => onAppendFlexContainerToContainer(node.id)}
        />
      ) : null}
    </Stack>
  );

  if (isRoot) {
    return content;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        ...buildPlacementStyle(node, parentMode, isRootParent),
        borderRadius: 4,
        borderColor: isSelected ? "primary.main" : "rgba(15,23,42,0.08)",
        backgroundColor: "rgba(255,255,255,0.98)",
        boxShadow: isSelected
          ? "0 0 0 4px rgba(37,99,235,0.08), 0 24px 56px rgba(15,23,42,0.12)"
          : "0 20px 48px rgba(15,23,42,0.08)",
        p: 2.5
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelectNode(node.id);
      }}
    >
      {content}
    </Paper>
  );
}

function SortableCanvasNode({
  node,
  nodes,
  rootId,
  parentMode,
  isRootParent,
  selectedNodeId,
  onSelectNode,
  onAppendBlockToContainer,
  onAppendGridContainerToContainer,
  onAppendFlexContainerToContainer,
  onAddBlockBefore,
  onAddBlockAfter,
  onAddGridContainerBefore,
  onAddGridContainerAfter,
  onRemoveSelectedNode
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

  if (node.kind === "container") {
    return (
      <Box
        ref={setNodeRef}
        sx={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.6 : 1
        }}
      >
        <SectionSurface
          node={node}
          nodes={nodes}
          rootId={rootId}
          parentMode={parentMode}
          isRoot={false}
          isRootParent={isRootParent}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onAppendBlockToContainer={onAppendBlockToContainer}
          onAppendGridContainerToContainer={onAppendGridContainerToContainer}
          onAppendFlexContainerToContainer={onAppendFlexContainerToContainer}
          onAddBlockBefore={onAddBlockBefore}
          onAddBlockAfter={onAddBlockAfter}
          onAddGridContainerBefore={onAddGridContainerBefore}
          onAddGridContainerAfter={onAddGridContainerAfter}
          onRemoveSelectedNode={onRemoveSelectedNode}
          dragHandleProps={{
            setActivatorNodeRef,
            attributes,
            listeners
          }}
        />
      </Box>
    );
  }

  return (
    <BlockNode
      node={node}
      parentMode={parentMode}
      isRootParent={isRootParent}
      selectedNodeId={selectedNodeId}
      onSelectNode={onSelectNode}
      onAddBlockBefore={onAddBlockBefore}
      onAddBlockAfter={onAddBlockAfter}
      onAddGridContainerBefore={onAddGridContainerBefore}
      onAddGridContainerAfter={onAddGridContainerAfter}
      onRemoveSelectedNode={onRemoveSelectedNode}
    />
  );
}

export function RootStageContent({
  document,
  selectedNodeId,
  onSelectNode,
  onAppendBlockToContainer,
  onAppendGridContainerToContainer,
  onAppendFlexContainerToContainer,
  onAddBlockBefore,
  onAddBlockAfter,
  onAddGridContainerBefore,
  onAddGridContainerAfter,
  onRemoveSelectedNode
}) {
  const rootNode = document?.nodes?.[document.rootId] ?? null;

  if (!rootNode) {
    return null;
  }

  return (
    <Box
      onClick={() => onSelectNode(rootNode.id)}
      sx={{ minHeight: 960 }}
    >
      <SectionSurface
        node={rootNode}
        nodes={document.nodes}
        rootId={rootNode.id}
        parentMode="root"
        isRoot
        isRootParent
        selectedNodeId={selectedNodeId}
        onSelectNode={onSelectNode}
        onAppendBlockToContainer={onAppendBlockToContainer}
        onAppendGridContainerToContainer={onAppendGridContainerToContainer}
        onAppendFlexContainerToContainer={onAppendFlexContainerToContainer}
        onAddBlockBefore={onAddBlockBefore}
        onAddBlockAfter={onAddBlockAfter}
        onAddGridContainerBefore={onAddGridContainerBefore}
        onAddGridContainerAfter={onAddGridContainerAfter}
        onRemoveSelectedNode={onRemoveSelectedNode}
        dragHandleProps={{
          setActivatorNodeRef: null,
          attributes: {},
          listeners: {}
        }}
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
