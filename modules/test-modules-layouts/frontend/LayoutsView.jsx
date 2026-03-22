import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { useMemo, useState } from "react";
import { LayoutBuilderCanvas } from "./LayoutBuilderCanvas.jsx";
import { LayoutBuilderInspector } from "./LayoutBuilderInspector.jsx";
import { LayoutBuilderLeftRail } from "./LayoutBuilderLeftRail.jsx";
import { LayoutBuilderNodeDialog } from "./LayoutBuilderNodeDialog.jsx";
import { useLayoutsWorkspace } from "./useLayoutsWorkspace.js";
import { findParentContainerId } from "./layout-builder-model.js";

function BuilderHeader({ activeModuleLabel, workspace, activeSupportTab, onToggleSupportTab }) {
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
              {workspace.returnRoute ? <Chip size="small" color="info" variant="outlined" label="Opened from page" /> : null}
              {workspace.selectedLayoutDeploymentImpact.totalTemplates > 0 ? (
                <Chip
                  size="small"
                  color={
                    workspace.selectedLayoutDeploymentImpact.staleTemplates > 0
                    || workspace.selectedLayoutDeploymentImpact.missingTemplates > 0
                      ? "warning"
                      : "success"
                  }
                  variant="outlined"
                  label={`${workspace.selectedLayoutDeploymentImpact.totalTemplates} page template${
                    workspace.selectedLayoutDeploymentImpact.totalTemplates === 1 ? "" : "s"
                  }`}
                />
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Shape reusable page structure on the canvas. Start from a page frame, then open library, layers, or details only when you need them.
            </Typography>
            {workspace.returnRoute ? (
              <Alert severity="info">
                You opened Layouts from a page. Save here, then return to continue shaping that page with the updated structure.
              </Alert>
            ) : null}
            {workspace.selectedLayoutDeploymentImpact.totalTemplates > 0 ? (
              <Alert
                severity={
                  workspace.selectedLayoutDeploymentImpact.staleTemplates > 0
                  || workspace.selectedLayoutDeploymentImpact.missingTemplates > 0
                    ? "warning"
                    : "info"
                }
              >
                {workspace.selectedLayoutDeploymentImpact.publishedTemplates} published page template
                {workspace.selectedLayoutDeploymentImpact.publishedTemplates === 1 ? "" : "s"} reference this layout.
                {" "}
                {workspace.selectedLayoutDeploymentImpact.cleanTemplates} clean,{" "}
                {workspace.selectedLayoutDeploymentImpact.staleTemplates} stale,{" "}
                {workspace.selectedLayoutDeploymentImpact.missingTemplates} missing.
              </Alert>
            ) : null}
          </Stack>
          <Stack spacing={1.25} alignItems={{ xs: "stretch", lg: "flex-end" }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <SupportToggleButton
                label="Library"
                active={activeSupportTab === "layouts"}
                onClick={() => onToggleSupportTab("layouts")}
              />
              <SupportToggleButton
                label="Layers"
                active={activeSupportTab === "layers"}
                onClick={() => onToggleSupportTab("layers")}
              />
              <SupportToggleButton
                label="Details"
                active={activeSupportTab === "details"}
                onClick={() => onToggleSupportTab("details")}
              />
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {workspace.returnRoute ? (
                <Button variant="outlined" onClick={workspace.returnToCallingRoute}>
                  Return To Page
                </Button>
              ) : null}
              <Button variant="outlined" onClick={workspace.startNewLayout}>
                Blank Layout
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
        </Stack>
        {workspace.actionState.errorMessage ? <Alert severity="error">{workspace.actionState.errorMessage}</Alert> : null}
        {workspace.actionState.successMessage ? <Alert severity="success">{workspace.actionState.successMessage}</Alert> : null}
      </Stack>
    </Paper>
  );
}

function SupportToggleButton({ label, active, onClick }) {
  return (
    <Button
      size="small"
      variant={active ? "contained" : "outlined"}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function SupportDock({ activeSupportTab, workspace, mode = "overlay" }) {
  if (!activeSupportTab) {
    return null;
  }

  if (activeSupportTab !== "details") {
    return mode === "overlay" ? (
      <Paper
        variant="outlined"
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          bottom: 16,
          width: { xs: "calc(100% - 32px)", lg: 360 },
          maxWidth: "100%",
          zIndex: 10,
          overflow: "hidden",
          borderRadius: 4,
          boxShadow: "0 24px 48px rgba(15,23,42,0.18)"
        }}
      >
        <LayoutBuilderLeftRail workspace={workspace} tabValue={activeSupportTab} />
      </Paper>
    ) : (
      <Box sx={{ minWidth: 0, minHeight: 0, height: "100%" }}>
        <LayoutBuilderLeftRail workspace={workspace} tabValue={activeSupportTab} />
      </Box>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={
        mode === "overlay"
          ? {
              position: "absolute",
              top: 16,
              right: 16,
              bottom: 16,
              width: { xs: "calc(100% - 32px)", lg: 360 },
              maxWidth: "100%",
              zIndex: 10,
              overflow: "hidden",
              borderRadius: 4,
              boxShadow: "0 24px 48px rgba(15,23,42,0.18)"
            }
          : {
              height: "100%",
              minHeight: 0,
              minWidth: 0,
              overflow: "hidden",
              borderRadius: 4
            }
      }
    >
      <Box sx={{ height: "100%", p: 2, overflow: "auto" }}>
        <LayoutBuilderInspector
          draft={workspace.draft}
          selectedLayout={workspace.selectedLayout}
          selectedNode={workspace.selectedNode}
          selectedPathIds={workspace.selectedPathIds}
          isExisting={Boolean(workspace.selectedLayoutId) && !workspace.isCreatingNewLayout}
          isMoveMode={workspace.isMoveMode}
          isSelectedNodeMovable={workspace.isSelectedNodeMovable}
          canMoveSelectedBackward={workspace.canMoveSelectedBackward}
          canMoveSelectedForward={workspace.canMoveSelectedForward}
          deploymentImpact={workspace.selectedLayoutDeploymentImpact}
          onChangeField={workspace.changeLayoutField}
          onOpenNodeDialog={() => workspace.openNodeDialog(workspace.selectedNodeId)}
          onStartMoveMode={() => workspace.setMoveMode(true)}
          onCancelMoveMode={() => workspace.setMoveMode(false)}
          onMoveSelectedBackward={workspace.moveSelectedBackward}
          onMoveSelectedForward={workspace.moveSelectedForward}
          onMoveSelectedToStart={workspace.moveSelectedToStart}
          onMoveSelectedToEnd={workspace.moveSelectedToEnd}
          onOpenPage={workspace.openPageTemplate}
        />
      </Box>
    </Paper>
  );
}

export function LayoutsView({ activeModuleLabel, navigate = null, route = {} }) {
  const theme = useTheme();
  const isDesktopDock = useMediaQuery(theme.breakpoints.up("lg"));
  const baseWorkspace = useLayoutsWorkspace({
    navigate,
    route
  });
  const [activeSupportTab, setActiveSupportTab] = useState(
    baseWorkspace.isCreatingNewLayout ? "details" : "layouts"
  );

  const workspace = useMemo(() => ({
    ...baseWorkspace,
    startNewLayout: () => {
      setActiveSupportTab("details");
      baseWorkspace.startNewLayout();
    },
    selectLayout: (layoutId) => {
      setActiveSupportTab("layouts");
      baseWorkspace.selectLayout(layoutId);
    },
    openNodeDialog: (nodeId) => {
      setActiveSupportTab("details");
      baseWorkspace.openNodeDialog(nodeId);
    }
  }), [baseWorkspace]);
  const parentNode = workspace.selectedNodeId
    ? workspace.draft.layoutDocument.nodes[
        findParentContainerId(workspace.draft.layoutDocument, workspace.selectedNodeId) ?? ""
      ] ?? null
    : null;

  return (
    <Box
      sx={{
        minHeight: "100%",
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#dbe3eb",
        overflow: "hidden"
      }}
    >
      <BuilderHeader
        activeModuleLabel={activeModuleLabel}
        workspace={workspace}
        activeSupportTab={activeSupportTab}
        onToggleSupportTab={(nextTab) => setActiveSupportTab((current) => current === nextTab ? null : nextTab)}
      />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          p: 2,
          overflow: "hidden",
          display: { xs: "block", lg: "grid" },
          gridTemplateColumns: {
            lg: activeSupportTab ? "minmax(0, 1fr) 360px" : "minmax(0, 1fr)"
          },
          gap: 2
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            minHeight: 0,
            position: "relative",
            overflow: "hidden"
          }}
        >
          <LayoutBuilderCanvas
            document={workspace.draft.layoutDocument}
            selectedNodeId={workspace.selectedNodeId}
            selectedPathIds={workspace.selectedPathIds}
            onSelectNode={workspace.selectNode}
            onDragEnd={workspace.handleDragEnd}
            onMoveSelectedNodeToTarget={workspace.moveSelectedNodeTo}
            onAddBlockPreset={workspace.addBlockPreset}
            onAddLayoutPreset={workspace.addLayoutPreset}
            onAppendBlockPresetToContainer={workspace.appendBlockPresetToContainer}
            onAppendLayoutPresetToContainer={workspace.appendLayoutPresetToContainer}
            onOpenNodeDialog={workspace.openNodeDialog}
            onDuplicateNode={workspace.duplicateSelectedNode}
            onRemoveNode={workspace.removeSelectedNode}
            onResizeFlexPair={workspace.resizeFlexPair}
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
          {!isDesktopDock ? (
            <SupportDock activeSupportTab={activeSupportTab} workspace={workspace} mode="overlay" />
          ) : null}
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
        {activeSupportTab && isDesktopDock ? (
          <Box
            sx={{
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden"
            }}
          >
            <SupportDock activeSupportTab={activeSupportTab} workspace={workspace} mode="docked" />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
