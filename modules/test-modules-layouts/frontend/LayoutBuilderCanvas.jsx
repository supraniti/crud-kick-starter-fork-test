import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useCallback, useState } from "react";
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
import { findParentContainerId } from "./layout-builder-model.js";

function buildSelectionLabels(document, selectedPathIds) {
  return selectedPathIds
    .map((nodeId) => document.nodes[nodeId]?.label)
    .filter(Boolean);
}

function StageHeader({ labels, onAddBlock, onAddGridContainer, onAddFlexContainer }) {
  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={1.5}
        alignItems={{ xs: "flex-start", lg: "center" }}
        justifyContent="space-between"
      >
        <Stack spacing={0.5}>
          <Typography variant="h5">Page Stage</Typography>
          <Typography variant="body2" color="text.secondary">
            Build from full-width containers first. Then place blocks or nested containers inside those containers.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button variant="contained" onClick={onAddGridContainer}>
            Add Container
          </Button>
          <Button variant="outlined" onClick={onAddBlock}>
            Add Block
          </Button>
          <Button variant="outlined" onClick={onAddFlexContainer}>
            Add Flex Container
          </Button>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {labels.map((label, index) => (
          <Chip key={`${index}-${label}`} size="small" variant="outlined" label={label} />
        ))}
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
  onAppendBlockToContainer,
  onAppendGridContainerToContainer,
  onAppendFlexContainerToContainer,
  onOpenNodeDialog,
  isMoveMode,
  moveModeLabel,
  onToggleMoveMode
}) {
  const rootNode = document?.nodes?.[document.rootId] ?? null;
  const selectionLabels = buildSelectionLabels(document, selectedPathIds);
  const [activeDragId, setActiveDragId] = useState(null);
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

  if (!rootNode) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        overflow: "auto",
        backgroundColor: "#dbe5ef",
        p: { xs: 1.5, lg: 2.5 }
      }}
    >
      <Stack spacing={2.5} sx={{ minHeight: "100%" }}>
        <StageHeader
          labels={selectionLabels}
          onAddBlock={() => onAppendBlockToContainer(rootNode.id)}
          onAddGridContainer={() => onAppendGridContainerToContainer(rootNode.id)}
          onAddFlexContainer={() => onAppendFlexContainerToContainer(rootNode.id)}
        />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            borderRadius: 4,
            border: "1px solid rgba(15,23,42,0.1)",
            background: "linear-gradient(180deg, rgba(244,247,250,1), rgba(226,232,240,0.95))",
            p: { xs: 1.5, lg: 3 }
          }}
        >
          {isMoveMode ? (
            <Alert
              severity="info"
              sx={{ mb: 2, alignItems: "center" }}
              action={
                <Button color="inherit" size="small" onClick={() => onToggleMoveMode?.(null)}>
                  Cancel Move
                </Button>
              }
            >
              Moving <strong>{moveModeLabel ?? "selected node"}</strong>. Choose a target slot on the canvas.
            </Alert>
          ) : null}
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
            <Box
              sx={{
                width: "100%",
                maxWidth: 1480,
                mx: "auto",
                minHeight: 1080,
                borderRadius: 4,
                border: "1px solid rgba(15,23,42,0.12)",
                backgroundColor: "rgba(255,255,255,0.96)",
                p: { xs: 2, lg: 4 },
                boxShadow: "0 30px 70px rgba(15,23,42,0.12)"
              }}
            >
              <RootStageContent
                document={document}
                selectedNodeId={selectedNodeId}
                selectedPathIds={selectedPathIds}
                onSelectNode={onSelectNode}
                onAppendBlockToContainer={onAppendBlockToContainer}
                onAppendGridContainerToContainer={onAppendGridContainerToContainer}
                onAppendFlexContainerToContainer={onAppendFlexContainerToContainer}
                onMoveSelectedNodeToTarget={onMoveSelectedNodeToTarget}
                onOpenNodeDialog={onOpenNodeDialog}
                onToggleMoveMode={onToggleMoveMode}
                showDropSlots={Boolean(activeDragId) || isMoveMode}
                isMoveMode={isMoveMode}
                moveSourceParentId={moveSourceParentId}
              />
            </Box>
            <DragOverlay>
              <DragPreview node={document.nodes?.[activeDragId] ?? null} />
            </DragOverlay>
          </DndContext>
        </Box>
      </Stack>
    </Paper>
  );
}
