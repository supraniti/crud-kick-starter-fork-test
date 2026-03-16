import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import {
  DATA_SOURCE_KIND_OPTIONS,
  DATA_SOURCE_SORT_KEY_OPTIONS,
  DATA_SOURCE_SOURCE_TYPE_OPTIONS,
  SORT_DIRECTION_OPTIONS,
  formatTimestamp
} from "./blog-distribution-panel-support.js";

export function PageRemoteBindingsSection({ workspace }) {
  const safeDeploymentTargetId = workspace.remoteDeploymentTargets.some(
    (target) => target.id === workspace.pageDraft.remoteDeploymentTargetProfileId
  )
    ? workspace.pageDraft.remoteDeploymentTargetProfileId
    : "";
  const safeBrowserTargetId = workspace.remoteBrowserTargets.some(
    (target) => target.id === workspace.pageDraft.remoteBrowserDeliveryTargetProfileId
  )
    ? workspace.pageDraft.remoteBrowserDeliveryTargetProfileId
    : "";

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">Remote Bindings</Typography>
      <Alert severity="info">
        Page-owned remote bindings override the Pages module defaults. Leave them empty to keep
        using the module-level targets.
      </Alert>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          select
          label="Remote Deployment Target Override"
          value={safeDeploymentTargetId}
          onChange={(event) =>
            workspace.changePageField("remoteDeploymentTargetProfileId", event.target.value)
          }
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="">Use Pages module default</MenuItem>
          {workspace.remoteDeploymentTargets.map((target) => (
            <MenuItem key={target.id} value={target.id}>
              {target.title}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Browser Delivery Target Override"
          value={safeBrowserTargetId}
          onChange={(event) =>
            workspace.changePageField("remoteBrowserDeliveryTargetProfileId", event.target.value)
          }
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="">Use Pages module default</MenuItem>
          {workspace.remoteBrowserTargets.map((target) => (
            <MenuItem key={target.id} value={target.id}>
              {target.title}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Stack>
  );
}

function DataSourceEditor({ entry, index, workspace }) {
  const sourceOptions = workspace.sourceOptionsByType[entry.sourceType] ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">Data Source {index + 1}</Typography>
          <Button variant="outlined" color="warning" onClick={() => workspace.removeDataSource(index)}>
            Remove
          </Button>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Key"
            value={entry.key}
            onChange={(event) => workspace.changeDataSourceField(index, "key", event.target.value)}
            sx={{ minWidth: 160 }}
          />
          <TextField
            select
            label="Kind"
            value={entry.kind}
            onChange={(event) => workspace.changeDataSourceField(index, "kind", event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {DATA_SOURCE_KIND_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Source Type"
            value={entry.sourceType}
            onChange={(event) => workspace.changeDataSourceField(index, "sourceType", event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {DATA_SOURCE_SOURCE_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Bind As"
            value={entry.bindAs}
            onChange={(event) => workspace.changeDataSourceField(index, "bindAs", event.target.value)}
            sx={{ minWidth: 160 }}
          />
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Source Item"
            value={entry.itemId}
            onChange={(event) => workspace.changeDataSourceField(index, "itemId", event.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="">None</MenuItem>
            {sourceOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Limit"
            type="number"
            value={entry.limit}
            onChange={(event) => workspace.changeDataSourceField(index, "limit", event.target.value)}
            sx={{ minWidth: 140 }}
          />
          <TextField
            select
            label="Sort Key"
            value={entry.sortKey}
            onChange={(event) => workspace.changeDataSourceField(index, "sortKey", event.target.value)}
            sx={{ minWidth: 180 }}
          >
            {DATA_SOURCE_SORT_KEY_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Direction"
            value={entry.sortDirection}
            onChange={(event) => workspace.changeDataSourceField(index, "sortDirection", event.target.value)}
            sx={{ minWidth: 160 }}
          >
            {SORT_DIRECTION_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function DataSourcesSection({ workspace }) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">Data Sources</Typography>
        <Button variant="outlined" onClick={workspace.addDataSource}>
          Add Data Source
        </Button>
      </Stack>
      {workspace.pageDraft.dataSources.length === 0 ? (
        <Alert severity="info">No additional data sources configured.</Alert>
      ) : (
        workspace.pageDraft.dataSources.map((entry, index) => (
          <DataSourceEditor key={`${entry.key}-${index}`} entry={entry} index={index} workspace={workspace} />
        ))
      )}
    </Stack>
  );
}

export function PageSeoSection({ workspace }) {
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">SEO + Delivery</Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          label="Canonical URL"
          value={workspace.pageDraft.canonicalUrl}
          onChange={(event) => workspace.changePageField("canonicalUrl", event.target.value)}
        />
        <TextField
          label="SEO Title"
          value={workspace.pageDraft.seoTitle}
          onChange={(event) => workspace.changePageField("seoTitle", event.target.value)}
        />
        <TextField
          select
          label="OpenGraph Image"
          value={workspace.pageDraft.ogImageMediaId}
          onChange={(event) => workspace.changePageField("ogImageMediaId", event.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">None</MenuItem>
          {workspace.mediaOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <TextField
        label="SEO Description"
        value={workspace.pageDraft.seoDescription}
        onChange={(event) => workspace.changePageField("seoDescription", event.target.value)}
        multiline
        minRows={3}
      />
      <TextField
        label="OpenGraph Title"
        value={workspace.pageDraft.ogTitle}
        onChange={(event) => workspace.changePageField("ogTitle", event.target.value)}
      />
      <TextField
        label="OpenGraph Description"
        value={workspace.pageDraft.ogDescription}
        onChange={(event) => workspace.changePageField("ogDescription", event.target.value)}
        multiline
        minRows={3}
      />
      <TextField
        label="Runtime Script URLs"
        value={workspace.pageDraft.runtimeScriptUrlsText}
        onChange={(event) => workspace.changePageField("runtimeScriptUrlsText", event.target.value)}
        multiline
        minRows={4}
        helperText="One script URL per line. These scripts are injected into published HTML in order."
      />
    </Stack>
  );
}

export function PageReadinessSection({ page, readinessIssues, workspace }) {
  if (!page) {
    return null;
  }

  const showSyncAction = page.status === "published";
  const isPerRecordMode = page.deploymentMode === "per-record";
  const deploymentTone =
    page.deploymentStatus === "clean"
      ? "success"
      : page.deploymentStatus === "error"
        ? "error"
        : "warning";

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Current Readiness</Typography>
      <TextField
        select
        label="Publishing Actor"
        value={workspace.selectedActorId}
        onChange={(event) => workspace.setSelectedActorId(event.target.value)}
        sx={{ maxWidth: 320 }}
      >
        {workspace.actorOptions.map((author) => (
          <MenuItem key={author.id} value={author.id}>
            {author.label}
          </MenuItem>
        ))}
      </TextField>
      {showSyncAction ? (
        <Alert severity={deploymentTone}>
          {isPerRecordMode
            ? `Template is ${page.status}. Deployment is currently ${page.deploymentStatus}.`
            : `Page is ${page.status}. Deployment is currently ${page.deploymentStatus}.`}
        </Alert>
      ) : null}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Typography component="span" variant="body2">
          <strong>Status:</strong> {page.status}
        </Typography>
        <Typography component="span" variant="body2">
          <strong>Deployment:</strong> {page.deploymentStatus ?? "missing"}
        </Typography>
        <Typography component="span" variant="body2">
          <strong>Synced:</strong> {page.deploymentSyncedCount ?? 0}/{page.deploymentTargetCount ?? 0}
        </Typography>
        {(page.deploymentMissingCount ?? 0) > 0 ? (
          <Typography component="span" variant="body2" color="warning.main">
            <strong>Missing:</strong> {page.deploymentMissingCount}
          </Typography>
        ) : null}
        {(page.deploymentStaleCount ?? 0) > 0 ? (
          <Typography component="span" variant="body2" color="warning.main">
            <strong>Stale:</strong> {page.deploymentStaleCount}
          </Typography>
        ) : null}
        <Typography component="span" variant="body2">
          <strong>Updated:</strong> {formatTimestamp(page.updatedOn)}
        </Typography>
        {page.deploymentArtifactPath ? (
          <Typography component="span" variant="body2" color="success.main">
            <strong>Artifact:</strong> deployment/{page.deploymentArtifactPath}
          </Typography>
        ) : null}
        {page.deploymentSyncedOn ? (
          <Typography component="span" variant="body2">
            <strong>Deployed:</strong> {formatTimestamp(page.deploymentSyncedOn)}
          </Typography>
        ) : null}
        {page.deploymentLastRunOn ? (
          <Typography component="span" variant="body2">
            <strong>Last run:</strong> {formatTimestamp(page.deploymentLastRunOn)}
          </Typography>
        ) : null}
        {readinessIssues.map((issue) => (
          <Typography key={issue} component="span" variant="body2" color="warning.main">
            {issue}
          </Typography>
        ))}
      </Stack>
      {showSyncAction ? (
        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={workspace.syncDeployment}
            disabled={workspace.pageActionState.syncingDeployment}
          >
            {workspace.pageActionState.syncingDeployment ? "Syncing Deployment..." : "Sync Deployment"}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
