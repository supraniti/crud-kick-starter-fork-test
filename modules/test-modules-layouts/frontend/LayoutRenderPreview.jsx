import { Box, Chip, Stack, TextField, Typography } from "@mui/material";
import {
  createContainerPreviewStyle,
  createLayoutPreviewMarkup,
  createNodePlacementStyle
} from "./layout-render-preview-model.js";

function PreviewBlock({ node, parentNode }) {
  return (
    <Box
      sx={{
        ...createNodePlacementStyle(node, parentNode),
        borderRadius: "18px",
        border: "1px solid rgba(37, 99, 235, 0.18)",
        background: "linear-gradient(180deg, rgba(239,246,255,0.96), rgba(219,234,254,0.96))",
        minHeight: "120px",
        p: 2,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)"
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="subtitle2">{node.label}</Typography>
          <Chip size="small" label="block" />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Placeholder for rendered block content.
        </Typography>
      </Stack>
    </Box>
  );
}

function PreviewContainer({ document, nodeId, depth = 0, parentNode = null, isRoot = false }) {
  const node = document?.nodes?.[nodeId];
  if (!node || node.kind !== "container") {
    return null;
  }

  return (
    <Box
      sx={{
        ...createNodePlacementStyle(node, parentNode),
        ...createContainerPreviewStyle(node, isRoot),
        p: isRoot ? 0 : undefined
      }}
    >
      <Box
        sx={{
          p: isRoot ? 3 : 2,
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          background: isRoot ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.54)",
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px"
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant={isRoot ? "subtitle1" : "subtitle2"}>{node.label}</Typography>
          <Chip size="small" variant="outlined" label={isRoot ? "root" : "container"} />
          <Chip size="small" color="primary" label={node.layoutMode} />
          <Typography variant="caption" color="text.secondary">
            depth {depth}
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ ...createContainerPreviewStyle(node, false), border: "none", borderRadius: 0, minHeight: "0px" }}>
        {(node.children ?? []).map((childId) => {
          const childNode = document.nodes?.[childId];
          if (!childNode) {
            return null;
          }
          return childNode.kind === "container" ? (
            <PreviewContainer
              key={childId}
              document={document}
              nodeId={childId}
              depth={depth + 1}
              parentNode={node}
            />
          ) : (
            <PreviewBlock key={childId} node={childNode} parentNode={node} />
          );
        })}
      </Box>
    </Box>
  );
}

export function LayoutRenderPreview({ document }) {
  const markup = createLayoutPreviewMarkup(document);

  return (
    <Stack spacing={2}>
      <Box
        data-testid="layout-render-preview"
        sx={{
          borderRadius: 4,
          border: "1px solid rgba(15, 23, 42, 0.12)",
          background: "linear-gradient(180deg, rgba(221, 231, 243, 0.92), rgba(239, 244, 249, 0.98))",
          p: 2
        }}
      >
        <PreviewContainer document={document} nodeId={document?.rootId} isRoot />
      </Box>
      <TextField
        label="Structure Markup"
        multiline
        minRows={12}
        value={markup}
        InputProps={{ readOnly: true }}
      />
    </Stack>
  );
}
