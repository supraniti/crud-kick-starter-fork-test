import {
  Alert,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import {
  DATA_SOURCE_KIND_OPTIONS,
  DATA_SOURCE_SORT_KEY_OPTIONS,
  DATA_SOURCE_SOURCE_TYPE_OPTIONS,
  HERO_VARIANT_OPTIONS,
  PAGE_KIND_OPTIONS,
  PAGE_STATUS_OPTIONS,
  PRIMARY_SOURCE_TYPE_OPTIONS,
  SORT_DIRECTION_OPTIONS,
  TEMPLATE_KEY_OPTIONS,
  formatTimestamp,
  jsonPreview
} from "./blog-distribution-panel-support.js";

function PageActionBar({ page, workspace }) {
  const publishLabel = page?.status === "published" ? "Sync Published Page" : "Publish Page";

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="h6">Page Editor</Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={workspace.persistPage} disabled={workspace.pageActionState.saving}>
          {workspace.pageActionState.saving ? "Saving..." : workspace.selectedPageId ? "Save Page" : "Create Page"}
        </Button>
        <Button variant="outlined" onClick={workspace.startNewPage}>
          New Draft
        </Button>
        <Button
          variant="outlined"
          onClick={workspace.publishPage}
          disabled={!page || page.status === "archived" || workspace.pageActionState.saving}
        >
          {publishLabel}
        </Button>
      </Stack>
    </Stack>
  );
}

function PageAlerts({ workspace }) {
  return (
    <>
      {workspace.pageActionState.errorMessage ? <Alert severity="error">{workspace.pageActionState.errorMessage}</Alert> : null}
      {workspace.pageActionState.successMessage ? <Alert severity="success">{workspace.pageActionState.successMessage}</Alert> : null}
      {workspace.supportState.errorMessage ? <Alert severity="error">{workspace.supportState.errorMessage}</Alert> : null}
    </>
  );
}

function PageIdentitySection({ workspace }) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <TextField
        label="Page Title"
        value={workspace.pageDraft.title}
        onChange={(event) => workspace.changePageField("title", event.target.value)}
      />
      <TextField
        label="Path"
        value={workspace.pageDraft.path}
        onChange={(event) => workspace.changePageField("path", event.target.value)}
        placeholder="/stories/platform-health"
      />
      <TextField
        select
        label="Status"
        value={workspace.pageDraft.status}
        onChange={(event) => workspace.changePageField("status", event.target.value)}
        sx={{ minWidth: 180 }}
      >
        {PAGE_STATUS_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Scheduled On"
        value={workspace.pageDraft.scheduledOn}
        onChange={(event) => workspace.changePageField("scheduledOn", event.target.value)}
        placeholder="2026-03-09T12:00:00.000Z"
      />
    </Stack>
  );
}

function PageSourceSection({ workspace, sourceOptions }) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <TextField
        select
        label="Page Kind"
        value={workspace.pageDraft.pageKind}
        onChange={(event) => workspace.changePageField("pageKind", event.target.value)}
        sx={{ minWidth: 200 }}
      >
        {PAGE_KIND_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Primary Source Type"
        value={workspace.pageDraft.primarySourceType}
        onChange={(event) => workspace.changePageField("primarySourceType", event.target.value)}
        sx={{ minWidth: 220 }}
      >
        {PRIMARY_SOURCE_TYPE_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Primary Source"
        value={workspace.pageDraft.primarySourceItemId}
        onChange={(event) => workspace.changePageField("primarySourceItemId", event.target.value)}
        sx={{ minWidth: 240 }}
        disabled={workspace.pageDraft.primarySourceType === "none"}
      >
        <MenuItem value="">None</MenuItem>
        {sourceOptions.map((option) => (
          <MenuItem key={option.id} value={option.id}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

function PagePresentationSection({ workspace }) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <TextField
        label="Layout Key"
        value={workspace.pageDraft.layoutKey}
        onChange={(event) => workspace.changePageField("layoutKey", event.target.value)}
      />
      <TextField
        select
        label="Template"
        value={workspace.pageDraft.templateKey}
        onChange={(event) => workspace.changePageField("templateKey", event.target.value)}
        sx={{ minWidth: 200 }}
      >
        {TEMPLATE_KEY_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Hero Variant"
        value={workspace.pageDraft.heroVariant}
        onChange={(event) => workspace.changePageField("heroVariant", event.target.value)}
        sx={{ minWidth: 180 }}
      >
        {HERO_VARIANT_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Theme Key"
        value={workspace.pageDraft.themeKey}
        onChange={(event) => workspace.changePageField("themeKey", event.target.value)}
      />
    </Stack>
  );
}

function PageBindingSection({ workspace }) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <TextField
        label="Hero Binding"
        value={workspace.pageDraft.heroBinding}
        onChange={(event) => workspace.changePageField("heroBinding", event.target.value)}
      />
      <TextField
        label="Body Binding"
        value={workspace.pageDraft.bodyBinding}
        onChange={(event) => workspace.changePageField("bodyBinding", event.target.value)}
      />
      <TextField
        label="Supporting Binding"
        value={workspace.pageDraft.supportingBinding}
        onChange={(event) => workspace.changePageField("supportingBinding", event.target.value)}
      />
      <TextField
        label="Section Order"
        value={workspace.pageDraft.sectionOrderText}
        onChange={(event) => workspace.changePageField("sectionOrderText", event.target.value)}
        helperText="Comma separated: hero, body, supporting"
      />
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

function DataSourcesSection({ workspace }) {
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

function PageSeoSection({ workspace }) {
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

function PageReadinessSection({ page, readinessIssues, workspace }) {
  if (!page) {
    return null;
  }

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
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip size="small" label={page.status} />
        <Chip size="small" label={`Updated ${formatTimestamp(page.updatedOn)}`} variant="outlined" />
        {page.deploymentArtifactPath ? (
          <Chip
            size="small"
            label={`deployment/${page.deploymentArtifactPath}`}
            color="success"
            variant="outlined"
          />
        ) : null}
        {page.deploymentSyncedOn ? (
          <Chip
            size="small"
            label={`Deployed ${formatTimestamp(page.deploymentSyncedOn)}`}
            variant="outlined"
          />
        ) : null}
        {readinessIssues.map((issue) => (
          <Chip key={issue} size="small" label={issue} color="warning" />
        ))}
      </Stack>
    </Stack>
  );
}

export function ReadinessPanel({ workspace }) {
  const page = workspace.selectedPage;
  const readinessIssues = page ? workspace.readinessMap.get(page.id) ?? [] : [];
  const sourceOptions = workspace.sourceOptionsByType[workspace.pageDraft.primarySourceType] ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <PageActionBar page={page} workspace={workspace} />
        <PageAlerts workspace={workspace} />
        <PageIdentitySection workspace={workspace} />
        <Divider />
        <PageSourceSection workspace={workspace} sourceOptions={sourceOptions} />
        <PagePresentationSection workspace={workspace} />
        <PageBindingSection workspace={workspace} />
        <Divider />
        <DataSourcesSection workspace={workspace} />
        <Divider />
        <PageSeoSection workspace={workspace} />
        <Divider />
        <PageReadinessSection page={page} readinessIssues={readinessIssues} workspace={workspace} />
      </Stack>
    </Paper>
  );
}

export function DeliveryPreviewPanel({ workspace }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Delivery Payload Preview</Typography>
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
