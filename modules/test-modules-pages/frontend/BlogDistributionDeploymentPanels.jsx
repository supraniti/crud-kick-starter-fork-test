import {
  Alert,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { formatTimestamp, jsonPreview } from "./blog-distribution-panel-support.js";

export function DeliveryPreviewPanel({ workspace }) {
  const isPerRecordMode = workspace.pageDraft.deploymentMode === "per-record";

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Delivery Payload Preview</Typography>
        {isPerRecordMode ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              label="Preview Source Post"
              value={workspace.pageDraft.previewSourceItemId}
              onChange={(event) => workspace.changePreviewSourceItemId(event.target.value)}
              sx={{ minWidth: 280 }}
              disabled={workspace.previewSourceState.loading || workspace.previewSourceState.items.length === 0}
              helperText={
                workspace.previewSourceState.items.length > 0
                  ? "Preview which concrete post this template resolves against."
                  : "Save the template and publish at least one post to preview concrete instances."
              }
            >
              {workspace.previewSourceState.items.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.label} - {item.path}
                </MenuItem>
              ))}
            </TextField>
            {workspace.previewSourceState.errorMessage ? (
              <Alert severity="error" sx={{ alignItems: "center" }}>
                {workspace.previewSourceState.errorMessage}
              </Alert>
            ) : null}
          </Stack>
        ) : null}
        {workspace.deliveryState.loading ? <Typography color="text.secondary">Resolving delivery payload...</Typography> : null}
        {workspace.deliveryState.errorMessage ? <Alert severity="error">{workspace.deliveryState.errorMessage}</Alert> : null}
        <TextField
          label="Resolved Page JSON"
          multiline
          minRows={18}
          value={jsonPreview(workspace.deliveryState.payload)}
          InputProps={{ readOnly: true }}
        />
      </Stack>
    </Paper>
  );
}

export function DeploymentInstancesPanel({ workspace }) {
  const page = workspace.selectedPage;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Deployment Instances</Typography>
        {!page ? (
          <Alert severity="info">Select a page to inspect its deployment outputs.</Alert>
        ) : null}
        {page && page.deploymentMode !== "per-record" ? (
          <Alert severity="info">Single-page records deploy one artifact directly and do not expose per-record instances.</Alert>
        ) : null}
        {page && page.deploymentMode === "per-record" && workspace.deploymentInstancesState.loading ? (
          <Typography color="text.secondary">Loading deployment instances...</Typography>
        ) : null}
        {workspace.deploymentInstancesState.errorMessage ? (
          <Alert severity="error">{workspace.deploymentInstancesState.errorMessage}</Alert>
        ) : null}
        {page && page.deploymentMode === "per-record" && !workspace.deploymentInstancesState.loading && workspace.deploymentInstancesState.items.length === 0 ? (
          <Alert severity="info">No deployment instances are tracked yet for this template.</Alert>
        ) : null}
        <Stack spacing={1.5}>
          {workspace.deploymentInstancesState.items.map((item) => (
            <Paper key={`${item.sourceItemId}:${item.resolvedPath}`} variant="outlined" sx={{ p: 1.5 }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                  <Typography variant="subtitle2">{item.sourceLabel}</Typography>
                  <Chip size="small" label={item.status} variant="outlined" />
                  {item.lastSyncedOn ? (
                    <Chip size="small" label={`Synced ${formatTimestamp(item.lastSyncedOn)}`} variant="outlined" />
                  ) : null}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {item.resolvedPath}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.artifactRelativePath ? `deployment/${item.artifactRelativePath}` : "Artifact path not resolved"}
                </Typography>
                {item.staleReasonSummary ? (
                  <Alert severity={item.status === "error" ? "error" : item.status === "missing" ? "warning" : "info"}>
                    {item.staleReasonSummary}
                  </Alert>
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
