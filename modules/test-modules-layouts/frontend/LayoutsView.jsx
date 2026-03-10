import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { LayoutBuilderCanvas } from "./LayoutBuilderCanvas.jsx";
import { LayoutBuilderInspector } from "./LayoutBuilderInspector.jsx";
import { LayoutBuilderLeftRail } from "./LayoutBuilderLeftRail.jsx";
import { LayoutBuilderNodeDialog } from "./LayoutBuilderNodeDialog.jsx";
import { useLayoutsWorkspace } from "./useLayoutsWorkspace.js";
import { findParentContainerId } from "./layout-builder-model.js";

function BuilderHeader({ activeModuleLabel, workspace }) {
  const title = workspace.isCreatingNewLayout
    ? "New layout"
    : workspace.selectedLayout?.title ?? "Layout Builder";
  const modeLabel = workspace.selectedNode?.kind === "container"
    ? workspace.selectedNode.layoutMode
    : workspace.selectedNode
      ? "block"
      : "page";

  return (
    <Paper
      square
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        px: 2.5,
        py: 1.75,
        backgroundColor: "background.paper"
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", lg: "center" }}
          justifyContent="space-between"
        >
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary">
              {activeModuleLabel}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="h5">{title}</Typography>
              <Chip size="small" label={workspace.isCreatingNewLayout ? "new" : workspace.draft.status} />
              <Chip size="small" variant="outlined" label={`Selected: ${modeLabel}`} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Build layouts on a dedicated page stage. Containers should read as real containers that hold space, not admin cards.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="outlined" onClick={workspace.startNewLayout}>
              New Layout
            </Button>
            <Button variant="contained" onClick={workspace.persistLayout} disabled={workspace.actionState.saving}>
              {workspace.actionState.saving ? "Saving..." : workspace.selectedLayoutId && !workspace.isCreatingNewLayout ? "Save Layout" : "Create Layout"}
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={workspace.deleteLayout}
              disabled={!workspace.selectedLayoutId || workspace.isCreatingNewLayout || workspace.actionState.deleting}
            >
              {workspace.actionState.deleting ? "Deleting..." : "Delete Layout"}
            </Button>
          </Stack>
        </Stack>
        {workspace.actionState.errorMessage ? <Alert severity="error">{workspace.actionState.errorMessage}</Alert> : null}
        {workspace.actionState.successMessage ? <Alert severity="success">{workspace.actionState.successMessage}</Alert> : null}
      </Stack>
    </Paper>
  );
}

export function LayoutsView({ activeModuleLabel }) {
  const workspace = useLayoutsWorkspace();
  const parentNode = workspace.selectedNodeId
    ? workspace.draft.layoutDocument.nodes[
        findParentContainerId(workspace.draft.layoutDocument, workspace.selectedNodeId) ?? ""
      ] ?? null
    : null;

  return (
    <Box
      sx={{
        minHeight: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#e7edf4"
      }}
    >
      <BuilderHeader activeModuleLabel={activeModuleLabel} workspace={workspace} />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gap: 2,
          p: 2,
          gridTemplateAreas: {
            xs: `"rail" "canvas" "inspector"`,
            lg: `"rail canvas" "rail inspector"`,
            xl: `"rail canvas inspector"`
          },
          gridTemplateColumns: {
            xs: "1fr",
            lg: "220px minmax(0, 1fr)",
            xl: "220px minmax(0, 1fr) 320px"
          }
        }}
      >
        <Box sx={{ minHeight: 0, gridArea: "rail" }}>
          <LayoutBuilderLeftRail workspace={workspace} />
        </Box>
        <Box sx={{ minHeight: 0, gridArea: "canvas" }}>
          <LayoutBuilderCanvas
            document={workspace.draft.layoutDocument}
            selectedNodeId={workspace.selectedNodeId}
            selectedPathIds={workspace.selectedPathIds}
            onSelectNode={workspace.selectNode}
            onDragEnd={workspace.handleDragEnd}
            onMoveSelectedNodeToTarget={workspace.moveSelectedNodeTo}
            onAppendBlockToContainer={workspace.appendBlockToContainer}
            onAppendGridContainerToContainer={(containerId) => workspace.appendContainerToContainer(containerId, "grid")}
            onAppendFlexContainerToContainer={(containerId) => workspace.appendContainerToContainer(containerId, "flex")}
            onOpenNodeDialog={workspace.openNodeDialog}
            isMoveMode={workspace.isMoveMode}
            moveModeLabel={workspace.selectedNode?.label}
            onToggleMoveMode={(nodeId) => {
              if (nodeId) {
                workspace.selectNode(nodeId);
              }
              if (nodeId && (!workspace.isMoveMode || workspace.selectedNodeId !== nodeId)) {
                workspace.setMoveMode(true);
                return;
              }
              workspace.setMoveMode(!workspace.isMoveMode);
            }}
          />
        </Box>
        <Box sx={{ minHeight: 0, gridArea: "inspector" }}>
          <LayoutBuilderInspector
            draft={workspace.draft}
            selectedNode={workspace.selectedNode}
            selectedPathIds={workspace.selectedPathIds}
            isExisting={Boolean(workspace.selectedLayoutId) && !workspace.isCreatingNewLayout}
            isMoveMode={workspace.isMoveMode}
            isSelectedNodeMovable={workspace.isSelectedNodeMovable}
            canMoveSelectedBackward={workspace.canMoveSelectedBackward}
            canMoveSelectedForward={workspace.canMoveSelectedForward}
            onChangeField={workspace.changeLayoutField}
            onOpenNodeDialog={() => workspace.openNodeDialog(workspace.selectedNodeId)}
            onStartMoveMode={() => workspace.setMoveMode(true)}
            onCancelMoveMode={() => workspace.setMoveMode(false)}
            onMoveSelectedBackward={workspace.moveSelectedBackward}
            onMoveSelectedForward={workspace.moveSelectedForward}
            onMoveSelectedToStart={workspace.moveSelectedToStart}
            onMoveSelectedToEnd={workspace.moveSelectedToEnd}
          />
        </Box>
      </Box>
      <LayoutBuilderNodeDialog
        open={workspace.isNodeDialogOpen}
        draft={workspace.draft}
        selectedNode={workspace.selectedNode}
        selectedPathIds={workspace.selectedPathIds}
        parentNode={parentNode}
        onClose={workspace.closeNodeDialog}
        onUpdateNode={(patch) => workspace.updateNode(workspace.selectedNodeId, patch)}
        onRemoveNode={workspace.removeSelectedNode}
      />
    </Box>
  );
}
