import { Box, Button, ButtonBase, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";

function CompactActionButton({ ariaLabel, title, onClick, children, active = false, tone = "default" }) {
  const backgroundColor = tone === "primary"
    ? "rgba(37,99,235,0.12)"
    : tone === "warning"
      ? "rgba(245,158,11,0.16)"
      : "rgba(255,255,255,0.96)";
  const color = tone === "warning" ? "warning.dark" : tone === "primary" ? "primary.main" : "text.secondary";

  return (
    <Tooltip title={title}>
      <ButtonBase
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        sx={{
          minWidth: 0,
          height: 28,
          px: 1,
          borderRadius: 999,
          border: active ? "1px solid rgba(245,158,11,0.42)" : "1px solid rgba(15,23,42,0.08)",
          backgroundColor,
          color,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          whiteSpace: "nowrap"
        }}
      >
        {children}
      </ButtonBase>
    </Tooltip>
  );
}

function SurfaceBadge({ label, tone = "default" }) {
  return (
    <Box
      sx={{
        maxWidth: 140,
        px: 1,
        py: 0.4,
        borderRadius: 999,
        border: "1px solid rgba(15,23,42,0.08)",
        backgroundColor: tone === "primary" ? "rgba(219,234,254,0.96)" : "rgba(255,255,255,0.96)",
        color: tone === "primary" ? "primary.dark" : "text.secondary",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }}
    >
      {label}
    </Box>
  );
}

function readSurfaceLabel(label, isContainer) {
  if (label === "Content Block") {
    return "Block";
  }
  if (label === "Page") {
    return "Page";
  }
  if (label === "Container" && isContainer) {
    return "Container";
  }
  return label;
}

export function NodeHeader({
  label,
  mode,
  isSelected,
  isContainer,
  isMoveMode,
  canMove,
  onOpenNodeDialog,
  onToggleMoveMode,
  onAddBlock,
  onAddGridContainer,
  onAddFlexContainer,
  dragHandleProps
}) {
  const [addAnchorElement, setAddAnchorElement] = useState(null);
  const surfaceLabel = readSurfaceLabel(label, isContainer);
  const addMenuOpen = Boolean(addAnchorElement);
  const labelTone = !isContainer || isSelected ? "primary" : "default";

  return (
    <Box
      sx={{
        position: "absolute",
        top: 10,
        left: 10,
        right: 10,
        zIndex: 6,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 1,
        pointerEvents: "none"
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ minWidth: 0 }}>
        <SurfaceBadge label={surfaceLabel} tone={labelTone} />
        {mode && isContainer ? <SurfaceBadge label={mode} tone="default" /> : null}
      </Stack>
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        useFlexGap
        flexWrap="wrap"
        className="node-toolbar"
        sx={{
          pointerEvents: isSelected ? "auto" : "none",
          opacity: isSelected ? 1 : 0,
          transition: "opacity 120ms ease"
        }}
      >
        {isSelected && isContainer ? (
          <>
            <CompactActionButton
              ariaLabel="Add to selected container"
              title="Add block or nested container"
              onClick={(event) => {
                event.stopPropagation();
                setAddAnchorElement(event.currentTarget);
              }}
              tone="primary"
            >
              +
            </CompactActionButton>
            <Menu
              anchorEl={addAnchorElement}
              open={addMenuOpen}
              onClose={() => setAddAnchorElement(null)}
            >
              <MenuItem onClick={() => {
                setAddAnchorElement(null);
                onAddBlock();
              }}>
                Add block
              </MenuItem>
              <MenuItem onClick={() => {
                setAddAnchorElement(null);
                onAddGridContainer();
              }}>
                Add container
              </MenuItem>
              <MenuItem onClick={() => {
                setAddAnchorElement(null);
                onAddFlexContainer();
              }}>
                Add flex container
              </MenuItem>
            </Menu>
          </>
        ) : null}
        {isSelected && canMove ? (
          <CompactActionButton
            ariaLabel={isMoveMode ? "Cancel move mode" : "Move selected node"}
            title={isMoveMode ? "Cancel move mode" : "Move selected node"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleMoveMode?.();
            }}
            tone={isMoveMode ? "warning" : "default"}
            active={isMoveMode}
          >
            {isMoveMode ? "done" : "move"}
          </CompactActionButton>
        ) : null}
        <CompactActionButton
          ariaLabel="Edit node"
          title="Edit node"
          onClick={(event) => {
            event.stopPropagation();
            onOpenNodeDialog?.();
          }}
          tone={isSelected ? "primary" : "default"}
        >
          edit
        </CompactActionButton>
        <DragHandle
          setActivatorNodeRef={dragHandleProps.setActivatorNodeRef}
          attributes={dragHandleProps.attributes}
          listeners={dragHandleProps.listeners}
        />
      </Stack>
    </Box>
  );
}

function DragHandle({ setActivatorNodeRef, attributes, listeners }) {
  return (
    <Tooltip title="Drag to move">
      <ButtonBase
        ref={setActivatorNodeRef}
        aria-label="Drag node"
        onClick={(event) => event.stopPropagation()}
        sx={{
          height: 28,
          px: 1,
          borderRadius: 999,
          border: "1px solid rgba(15,23,42,0.08)",
          backgroundColor: "rgba(255,255,255,0.96)",
          color: "text.secondary",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase"
        }}
        {...attributes}
        {...listeners}
      >
        ::
      </ButtonBase>
    </Tooltip>
  );
}

export function DropSlot({ slotId, axis, showDropSlots, label, onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  const isVertical = axis === "vertical";
  const isInteractive = typeof onClick === "function";

  return (
    <ButtonBase
      ref={setNodeRef}
      component="div"
      onClick={onClick}
      aria-label={label}
      sx={{
        position: "absolute",
        zIndex: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: showDropSlots ? "auto" : "none",
        opacity: showDropSlots || isOver ? 1 : 0,
        transition: "opacity 120ms ease",
        cursor: isInteractive ? "pointer" : "default",
        backgroundColor: showDropSlots || isOver ? "rgba(37,99,235,0.05)" : "transparent",
        ...(isVertical
          ? {
              left: 10,
              right: 10,
              top: -26,
              height: 52
            }
          : {
              top: 10,
              bottom: 10,
              left: -26,
              width: 52
            })
      }}
    >
      <Box
        sx={{
          borderRadius: 999,
          backgroundColor: isOver ? "primary.main" : "rgba(37,99,235,0.22)",
          boxShadow: isOver ? "0 0 0 6px rgba(37,99,235,0.16)" : "none",
          transition: "all 120ms ease",
          ...(isVertical
            ? {
                width: "100%",
                height: isOver ? 10 : 6
              }
            : {
                width: isOver ? 10 : 6,
                height: "100%"
              })
        }}
      />
    </ButtonBase>
  );
}

export function ContainerEndSlot({ slotId, axis, showDropSlots, label, onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  const isInteractive = typeof onClick === "function";

  return (
    <ButtonBase
      ref={setNodeRef}
      component="div"
      onClick={onClick}
      aria-label={label}
      sx={{
        mt: axis === "vertical" ? 1.5 : 2,
        minHeight: axis === "vertical" ? 32 : 48,
        borderRadius: 999,
        border: showDropSlots || isOver ? "1px dashed rgba(37,99,235,0.28)" : "1px dashed transparent",
        backgroundColor: isOver ? "rgba(37,99,235,0.12)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 120ms ease",
        pointerEvents: showDropSlots ? "auto" : "none",
        opacity: showDropSlots || isOver ? 1 : 0,
        cursor: isInteractive ? "pointer" : "default",
        gridColumn: axis === "horizontal" ? "1 / -1" : undefined
      }}
    >
      <Box
        sx={{
          borderRadius: 999,
          backgroundColor: isOver ? "primary.main" : "rgba(37,99,235,0.22)",
          boxShadow: isOver ? "0 0 0 6px rgba(37,99,235,0.16)" : "none",
          transition: "all 120ms ease",
          width: axis === "vertical" ? "100%" : 6,
          height: axis === "vertical" ? (isOver ? 8 : 4) : "100%"
        }}
      />
    </ButtonBase>
  );
}

export function ContainerEmptyState({ isRoot, onAddBlock, onAddGridContainer, onAddFlexContainer }) {
  const isCompact = !isRoot;

  return (
    <Stack
      spacing={isRoot ? 2.25 : 1.25}
      alignItems="center"
      justifyContent="center"
      sx={{
        width: "100%",
        justifySelf: "stretch",
        gridColumn: "1 / -1",
        minHeight: isRoot ? 420 : 180,
        borderRadius: 3,
        border: "2px dashed rgba(15,23,42,0.12)",
        backgroundColor: "rgba(255,255,255,0.82)",
        px: isRoot ? 4 : 2.5,
        py: isRoot ? 5 : 3,
        textAlign: "center"
      }}
    >
      <Stack spacing={1} alignItems="center">
        <Typography variant={isRoot ? "overline" : "caption"} color="text.secondary">
          {isRoot ? "Empty Page" : "Empty Container"}
        </Typography>
        <Typography variant={isRoot ? "h5" : "subtitle1"} sx={{ maxWidth: isRoot ? 560 : 240 }}>
          {isRoot ? "Start with a full-width container" : "Choose the next item"}
        </Typography>
        {isRoot ? (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
            Containers define the major page structure. Add one first, then place blocks or nested containers inside it.
          </Typography>
        ) : null}
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} useFlexGap flexWrap="wrap">
        <Button
          variant="contained"
          size={isCompact ? "small" : "medium"}
          onClick={(event) => {
            event.stopPropagation();
            onAddGridContainer();
          }}
        >
          {isCompact ? "+ Container" : "Add Container"}
        </Button>
        <Button
          variant="outlined"
          size={isCompact ? "small" : "medium"}
          onClick={(event) => {
            event.stopPropagation();
            onAddBlock();
          }}
        >
          {isCompact ? "+ Block" : "Add Block"}
        </Button>
        <Button
          variant="outlined"
          size={isCompact ? "small" : "medium"}
          onClick={(event) => {
            event.stopPropagation();
            onAddFlexContainer();
          }}
        >
          {isCompact ? "+ Flex" : "Add Flex Container"}
        </Button>
      </Stack>
    </Stack>
  );
}

export function BlockVisual({ node, parentMode, isSelected }) {
  const useMeasuredMinHeight = parentMode !== "grid";

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        minWidth: 0,
        height: parentMode === "grid" ? "100%" : "auto",
        minHeight: useMeasuredMinHeight ? `${node.props?.minHeight ?? 160}px` : 0,
        borderRadius: 2.5,
        border: isSelected ? "1px solid rgba(37,99,235,0.28)" : "1px solid rgba(148,163,184,0.2)",
        background: isSelected
          ? "linear-gradient(180deg, rgba(239,246,255,1), rgba(219,234,254,0.92))"
          : "linear-gradient(180deg, rgba(255,255,255,1), rgba(241,245,249,0.9))",
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch",
        overflow: "hidden",
        boxShadow: isSelected
          ? "inset 0 0 0 1px rgba(255,255,255,0.6)"
          : "inset 0 0 0 1px rgba(255,255,255,0.4)",
        '&::before': {
          content: '""',
          position: "absolute",
          inset: 12,
          borderRadius: 2,
          border: isSelected ? "1px dashed rgba(37,99,235,0.2)" : "1px dashed rgba(15,23,42,0.12)"
        }
      }}
    >
      <Stack
        spacing={1.25}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          justifyContent: "center",
          px: { xs: 2, lg: 3 },
          py: { xs: 2, lg: 3 },
          opacity: isSelected ? 0.75 : 0.62
        }}
      >
        <Box
          sx={{
            width: "38%",
            maxWidth: 180,
            minWidth: 72,
            height: 12,
            borderRadius: 999,
            backgroundColor: isSelected ? "rgba(37,99,235,0.18)" : "rgba(148,163,184,0.22)"
          }}
        />
        <Box
          sx={{
            width: "100%",
            height: 8,
            borderRadius: 999,
            backgroundColor: isSelected ? "rgba(37,99,235,0.14)" : "rgba(148,163,184,0.16)"
          }}
        />
        <Box
          sx={{
            width: "78%",
            minWidth: 84,
            height: 8,
            borderRadius: 999,
            backgroundColor: isSelected ? "rgba(37,99,235,0.12)" : "rgba(148,163,184,0.14)"
          }}
        />
      </Stack>
    </Box>
  );
}
