import { Alert, Box, Chip, Paper, Stack } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { DragPreview, RootStageContent } from "./LayoutBuilderCanvasNodes.jsx";
import { LayoutBuilderCanvasShell } from "./LayoutBuilderCanvasShell.jsx";
import {
  clampViewportHeight,
  clampViewportWidth,
  clampZoomLevel,
  DEFAULT_VIEWPORT,
  DEFAULT_ZOOM_LEVEL
} from "./layout-builder-viewport.js";
import { LayoutBuilderAddMenu } from "./LayoutBuilderAddMenu.jsx";
import {
  BLOCK_PLACEHOLDER_TYPES,
  STRUCTURAL_LAYOUT_PRESETS
} from "./layout-builder-palette.js";
import { findParentContainerId } from "./layout-builder-model.js";

function buildSelectionLabels(document, selectedPathIds) {
  return selectedPathIds
    .map((nodeId) => document.nodes[nodeId]?.label)
    .filter(Boolean);
}

function SelectionPathChips({ labels }) {
  if (!labels.length) {
    return null;
  }

  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
      {labels.map((label, index) => (
        <Chip key={`${index}-${label}`} size="small" variant="outlined" label={label} />
      ))}
    </Stack>
  );
}

function CanvasStatusStrip({
  isMoveMode,
  moveModeLabel,
  labels,
  onAddLayoutPreset,
  onAddBlockPreset
}) {
  return (
    <Stack spacing={1.25} sx={{ p: 1.5 }}>
      {isMoveMode ? (
        <Alert severity="info">
          Moving <strong>{moveModeLabel ?? "selected node"}</strong>. Choose a visible target on the canvas.
        </Alert>
      ) : null}
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
        <LayoutBuilderAddMenu
          ariaLabel="Add section to page"
          title="Add section to page"
          triggerLabel="Add Section"
          layoutPresets={STRUCTURAL_LAYOUT_PRESETS}
          blockTypes={BLOCK_PLACEHOLDER_TYPES}
          onAddLayoutPreset={onAddLayoutPreset}
          onAddBlockType={onAddBlockPreset}
        />
        <SelectionPathChips labels={labels} />
      </Stack>
    </Stack>
  );
}

export function LayoutBuilderCanvas({
  document,
  selectedNodeId,
  selectedPathIds,
  onSelectNode,
  onDragEnd,
  onMoveSelectedNodeToTarget,
  onAddBlockPreset,
  onAddLayoutPreset,
  onAppendBlockPresetToContainer,
  onAppendLayoutPresetToContainer,
  onOpenNodeDialog,
  onDuplicateNode,
  onRemoveNode,
  onResizeFlexPair,
  isMoveMode,
  moveModeLabel,
  onToggleMoveMode
}) {
  const rootNode = document?.nodes?.[document.rootId] ?? null;
  const selectionLabels = buildSelectionLabels(document, selectedPathIds);
  const [activeDragId, setActiveDragId] = useState(null);
  const [viewport, setViewport] = useState({
    width: DEFAULT_VIEWPORT.width,
    height: DEFAULT_VIEWPORT.height
  });
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);
  const moveSourceNodeId = activeDragId ?? (isMoveMode ? selectedNodeId : null);
  const moveSourceParentId = moveSourceNodeId ? findParentContainerId(document, moveSourceNodeId) : null;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );
  const collisionDetection = useCallback((args) => {
    const pointerMatches = pointerWithin(args);
    return pointerMatches.length > 0 ? pointerMatches : closestCorners(args);
  }, []);
  const viewportHeight = useMemo(
    () => Math.max(720, viewport.height - 96),
    [viewport.height]
  );

  if (!rootNode) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#d6dde6",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <CanvasStatusStrip
        isMoveMode={isMoveMode}
        moveModeLabel={moveModeLabel}
        labels={selectionLabels}
        onAddLayoutPreset={onAddLayoutPreset}
        onAddBlockPreset={onAddBlockPreset}
      />
      <LayoutBuilderCanvasShell
        viewport={viewport}
        zoomLevel={zoomLevel}
        onWidthStep={(delta) => setViewport((current) => ({
          ...current,
          width: clampViewportWidth(current.width + delta)
        }))}
        onHeightStep={(delta) => setViewport((current) => ({
          ...current,
          height: clampViewportHeight(current.height + delta)
        }))}
        onSelectPreset={(preset) => setViewport({
          width: preset.width,
          height: preset.height
        })}
        onZoomStep={(delta) => setZoomLevel((current) => clampZoomLevel(current + delta))}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={(event) => setActiveDragId(event.active?.id ?? null)}
          onDragCancel={() => setActiveDragId(null)}
          onDragEnd={(event) => {
            onDragEnd({
              activeId: event.active?.id,
              overId: event.over?.id
            });
            setActiveDragId(null);
          }}
        >
          <Box sx={{ px: 4, py: 4 }}>
            <RootStageContent
              document={document}
              selectedNodeId={selectedNodeId}
              selectedPathIds={selectedPathIds}
              onSelectNode={onSelectNode}
              onAppendBlockPresetToContainer={onAppendBlockPresetToContainer}
              onAppendLayoutPresetToContainer={onAppendLayoutPresetToContainer}
              onMoveSelectedNodeToTarget={onMoveSelectedNodeToTarget}
              onOpenNodeDialog={onOpenNodeDialog}
              onToggleMoveMode={onToggleMoveMode}
              onDuplicateNode={onDuplicateNode}
              onRemoveNode={onRemoveNode}
              onResizeFlexPair={onResizeFlexPair}
              showDropSlots={Boolean(activeDragId) || isMoveMode}
              isMoveMode={isMoveMode}
              moveSourceParentId={moveSourceParentId}
              pageContentWidth={1200}
              minimumStageHeight={viewportHeight}
            />
            <DragOverlay>
              <DragPreview node={document.nodes?.[activeDragId] ?? null} />
            </DragOverlay>
          </Box>
        </DndContext>
      </LayoutBuilderCanvasShell>
    </Paper>
  );
}
