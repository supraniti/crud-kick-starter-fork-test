import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { DragPreview, RootStageContent } from "./LayoutBuilderCanvasNodes.jsx";

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
            Build from full-width sections first. Then place blocks or nested containers inside those sections.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
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
  onAddBlockBefore,
  onAddBlockAfter,
  onAddGridContainerBefore,
  onAddGridContainerAfter,
  onAppendBlockToContainer,
  onAppendGridContainerToContainer,
  onAppendFlexContainerToContainer,
  onRemoveSelectedNode
}) {
  const rootNode = document?.nodes?.[document.rootId] ?? null;
  const selectionLabels = buildSelectionLabels(document, selectedPathIds);
  const [activeDragId, setActiveDragId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
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
