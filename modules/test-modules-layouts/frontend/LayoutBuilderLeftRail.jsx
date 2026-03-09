import {
  Button,
  Chip,
  Divider,
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

function buildInsertContext(selectedNode) {
  if (!selectedNode) {
    return {
      title: "Page Stage",
      description: "Start by adding a full-width section. Use blocks directly only when you really want a top-level block."
    };
  }

  if (selectedNode.kind === "container") {
    return {
      title: selectedNode.label,
      description: "Add blocks or nested containers into the selected container."
    };
  }

  return {
    title: selectedNode.label,
    description: "Add before or after the selected block, or switch to Layers for precise selection."
  };
}

function LayoutsPanel({ workspace }) {
  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle1">Layouts</Typography>
        <Typography variant="body2" color="text.secondary">
          Select an existing layout or create a fresh one from the top bar.
        </Typography>
      </Stack>
      <List dense disablePadding sx={{ maxHeight: 280, overflow: "auto" }}>
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

function InsertPanel({ workspace }) {
  const insertContext = buildInsertContext(workspace.selectedNode);
  const blockSelected = workspace.selectedNode?.kind === "block";

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle1">Insert</Typography>
        <Typography variant="body2" color="text.secondary">
          {insertContext.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {insertContext.description}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        <Button variant="contained" onClick={() => workspace.addContainer("grid")}>
          Add Section
        </Button>
        <Button variant="outlined" onClick={workspace.addBlock}>
          Add Block
        </Button>
        <Button variant="outlined" onClick={() => workspace.addContainer("flex")}>
          Add Flex Container
        </Button>
      </Stack>
      {blockSelected ? (
        <>
          <Divider />
          <Stack spacing={1}>
            <Typography variant="subtitle2">Around Selected Block</Typography>
            <Stack spacing={1}>
              <Button variant="text" onClick={workspace.addBlockBeforeSelected}>
                Add Block Before
              </Button>
              <Button variant="text" onClick={workspace.addBlockAfterSelected}>
                Add Block After
              </Button>
              <Button variant="text" onClick={() => workspace.addContainerBeforeSelected("grid")}>
                Add Section Before
              </Button>
              <Button variant="text" onClick={() => workspace.addContainerAfterSelected("grid")}>
                Add Section After
              </Button>
            </Stack>
          </Stack>
        </>
      ) : null}
    </Stack>
  );
}

function LayerNode({ document, nodeId, depth, selectedNodeId, onSelectNode }) {
  const node = document.nodes[nodeId];
  if (!node) {
    return null;
  }

  return (
    <Stack spacing={0.5}>
      <ListItemButton
        selected={selectedNodeId === node.id}
        onClick={() => onSelectNode(node.id)}
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
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
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
          Use the hierarchy when the canvas selection is ambiguous.
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
          selectedNodeId={workspace.selectedNodeId}
          onSelectNode={workspace.selectNode}
        />
      </List>
    </Stack>
  );
}

export function LayoutBuilderLeftRail({ workspace }) {
  const [tabValue, setTabValue] = useState("layouts");

  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
    >
      <Tabs
        value={tabValue}
        onChange={(_event, nextValue) => setTabValue(nextValue)}
        variant="fullWidth"
      >
        <Tab value="layouts" label="Layouts" />
        <Tab value="insert" label="Insert" />
        <Tab value="layers" label="Layers" />
      </Tabs>
      <BoxContent>
        {tabValue === "layouts" ? <LayoutsPanel workspace={workspace} /> : null}
        {tabValue === "insert" ? <InsertPanel workspace={workspace} /> : null}
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
