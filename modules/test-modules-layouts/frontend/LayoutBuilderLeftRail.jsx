import {
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import { useMemo, useState } from "react";

function LayoutsPanel({ workspace }) {
  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle1">Layouts</Typography>
        <Typography variant="body2" color="text.secondary">
          Select an existing layout or create a fresh one from the top bar.
        </Typography>
      </Stack>
      <List dense disablePadding sx={{ maxHeight: 320, overflow: "auto" }}>
        {workspace.layouts.map((layout) => (
          <ListItemButton
            key={layout.id}
            selected={!workspace.isCreatingNewLayout && workspace.selectedLayoutId === layout.id}
            onClick={() => workspace.selectLayout(layout.id)}
            alignItems="flex-start"
            sx={{ borderRadius: 1, mb: 0.75 }}
          >
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {layout.title}
                  </Typography>
                  <Chip size="small" label={layout.status} />
                </Stack>
              }
              secondary={`${layout.layoutKey} • ${workspace.usageCountByLayoutId.get(layout.id) ?? 0} pages`}
            />
          </ListItemButton>
        ))}
      </List>
    </Stack>
  );
}

function LayerNode({ document, nodeId, depth, workspace }) {
  const node = document.nodes[nodeId];
  if (!node) {
    return null;
  }
  const isSelected = workspace.selectedNodeId === node.id;

  return (
    <Stack spacing={0.5}>
      <ListItemButton
        selected={isSelected}
        onClick={() => workspace.selectNode(node.id)}
        sx={{
          borderRadius: 1,
          pl: 1 + depth * 2,
          mb: 0.5
        }}
      >
        <ListItemText
          primary={
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {node.label}
              </Typography>
              <Chip size="small" variant="outlined" label={node.kind} />
              {node.kind === "container" ? (
                <Chip size="small" variant="outlined" color="primary" label={node.layoutMode} />
              ) : null}
            </Stack>
          }
        />
      </ListItemButton>
      {node.kind === "container" && node.children.length > 0 ? (
        <Stack spacing={0.25}>
          {node.children.map((childId) => (
            <LayerNode
              key={childId}
              document={document}
              nodeId={childId}
              depth={depth + 1}
              workspace={workspace}
            />
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

function LayersPanel({ workspace }) {
  const selectedPathLabels = useMemo(
    () => workspace.selectedPathIds
      .map((nodeId) => workspace.draft.layoutDocument.nodes[nodeId]?.label)
      .filter(Boolean),
    [workspace.draft.layoutDocument.nodes, workspace.selectedPathIds]
  );

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle1">Layers</Typography>
        <Typography variant="body2" color="text.secondary">
          Use hierarchy view when the on-canvas selection is ambiguous.
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {selectedPathLabels.map((label, index) => (
          <Chip key={`${index}-${label}`} size="small" label={label} />
        ))}
      </Stack>
      <List dense disablePadding sx={{ overflow: "auto", maxHeight: 420 }}>
        <LayerNode
          document={workspace.draft.layoutDocument}
          nodeId={workspace.draft.layoutDocument.rootId}
          depth={0}
          workspace={workspace}
        />
      </List>
    </Stack>
  );
}

export function LayoutBuilderLeftRail({ workspace, tabValue: controlledTabValue = null, onTabChange = null }) {
  const [uncontrolledTabValue, setUncontrolledTabValue] = useState("layouts");
  const tabValue = controlledTabValue ?? uncontrolledTabValue;
  const setTabValue = onTabChange ?? setUncontrolledTabValue;

  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 3
      }}
    >
      <Tabs
        value={tabValue}
        onChange={(_event, nextValue) => setTabValue(nextValue)}
        variant="fullWidth"
      >
        <Tab value="layouts" label="Layouts" />
        <Tab value="layers" label="Layers" />
      </Tabs>
      <BoxContent>
        {tabValue === "layouts" ? <LayoutsPanel workspace={workspace} /> : null}
        {tabValue === "layers" ? <LayersPanel workspace={workspace} /> : null}
      </BoxContent>
    </Paper>
  );
}

function BoxContent({ children }) {
  return (
    <Stack spacing={2} sx={{ p: 2, overflow: "auto", minHeight: 0, flex: 1 }}>
      {children}
    </Stack>
  );
}
