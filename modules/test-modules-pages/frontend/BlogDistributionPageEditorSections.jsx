import {
  Alert,
  Button,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { useState } from "react";
import {
  DEPLOYMENT_MODE_OPTIONS,
  PAGE_KIND_OPTIONS,
  PAGE_STATUS_OPTIONS,
  PRIMARY_SOURCE_TYPE_OPTIONS,
  resolvePerRecordPathPlaceholder,
  resolveSourceTypeLabels,
  SOURCE_SELECTION_MODE_OPTIONS
} from "./blog-distribution-panel-support.js";
import {
  PageBindingSection,
  PagePresentationSection
} from "./BlogDistributionPagePresentationSections.jsx";
import {
  PageTypeSection,
  SecondarySection
} from "./BlogDistributionPageFlowSections.jsx";
import {
  DataSourcesSection,
  PageReadinessSection,
  PageRemoteBindingsSection,
  PageSeoSection
} from "./BlogDistributionPageAdvancedSections.jsx";

function PageActionBar({ page, workspace }) {
  const isPerRecordMode = workspace.pageDraft.deploymentMode === "per-record";
  const publishLabel = isPerRecordMode
    ? (page?.status === "published" ? "Publish Template State" : "Publish Template")
    : (page?.status === "published" ? "Sync Published Page" : "Publish Page");

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
  const perRecordTemplatePathPlaceholder =
    workspace.pageDraft.primarySourceType === "blog-category" ? "/category" : "/posts";
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <TextField
        label="Page Title"
        value={workspace.pageDraft.title}
        onChange={(event) => workspace.changePageField("title", event.target.value)}
      />
      <TextField
        select
        label="Deployment Mode"
        value={workspace.pageDraft.deploymentMode}
        onChange={(event) => workspace.changePageField("deploymentMode", event.target.value)}
        sx={{ minWidth: 200 }}
      >
        {DEPLOYMENT_MODE_OPTIONS.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={workspace.pageDraft.deploymentMode === "per-record" ? "Template Path" : "Path"}
        value={workspace.pageDraft.path}
        onChange={(event) => workspace.changePageField("path", event.target.value)}
        placeholder={
          workspace.pageDraft.deploymentMode === "per-record"
            ? perRecordTemplatePathPlaceholder
            : "/stories/platform-health"
        }
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
  const isPerRecordMode = workspace.pageDraft.deploymentMode === "per-record";
  const sourceLabels = resolveSourceTypeLabels(workspace.pageDraft.primarySourceType);
  return (
    <Stack spacing={2}>
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
        label="Source Selection"
        value={workspace.pageDraft.sourceSelectionMode}
        onChange={(event) => workspace.changePageField("sourceSelectionMode", event.target.value)}
        sx={{ minWidth: 220 }}
        disabled={workspace.pageDraft.primarySourceType === "none" || isPerRecordMode}
      >
        {SOURCE_SELECTION_MODE_OPTIONS.map((option) => (
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
        disabled={workspace.pageDraft.primarySourceType === "none" || workspace.pageDraft.sourceSelectionMode !== "specific-record"}
      >
        <MenuItem value="">None</MenuItem>
        {sourceOptions.map((option) => (
          <MenuItem key={option.id} value={option.id}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      </Stack>
      {isPerRecordMode ? (
        <TextField
          label="Path Pattern"
          value={workspace.pageDraft.pathPattern}
          onChange={(event) => workspace.changePageField("pathPattern", event.target.value)}
          placeholder={resolvePerRecordPathPlaceholder(workspace.pageDraft.primarySourceType)}
          helperText={`Use bounded tokens like {slug} or {id} to generate one output path per ${sourceLabels.singular.toLowerCase()}.`}
        />
      ) : null}
    </Stack>
  );
}

export function ReadinessPanel({ workspace }) {
  const [section, setSection] = useState("basics");
  const page = workspace.selectedPage;
  const readinessIssues = page ? workspace.readinessMap.get(page.id) ?? [] : [];
  const sourceOptions = workspace.sourceOptionsByType[workspace.pageDraft.primarySourceType] ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <PageActionBar page={page} workspace={workspace} />
        <PageAlerts workspace={workspace} />
        <Paper variant="outlined" sx={{ px: 2 }}>
          <Tabs value={section} onChange={(_, nextValue) => setSection(nextValue)}>
            <Tab value="basics" label="Basics" />
            <Tab value="presentation" label="Layout And SEO" />
            <Tab value="readiness" label="Readiness" />
            <Tab value="advanced" label="Advanced" />
          </Tabs>
        </Paper>
        {section === "basics" ? (
          <Stack spacing={2}>
            <PageTypeSection workspace={workspace} />
            <PageIdentitySection workspace={workspace} />
            <PageSourceSection workspace={workspace} sourceOptions={sourceOptions} />
          </Stack>
        ) : null}
        {section === "presentation" ? (
          <Stack spacing={2}>
            <PagePresentationSection workspace={workspace} />
            <PageSeoSection workspace={workspace} />
          </Stack>
        ) : null}
        {section === "readiness" ? (
          <Stack spacing={2}>
            <Divider />
            <PageReadinessSection page={page} readinessIssues={readinessIssues} workspace={workspace} />
          </Stack>
        ) : null}
        {section === "advanced" ? (
          <Stack spacing={2}>
            <SecondarySection
              title="Advanced Source Controls"
              description="Use this only when the default page-type presets are not enough."
              expandedLabel="Hide Advanced Source Controls"
              collapsedLabel="Show Advanced Source Controls"
            >
              <Stack spacing={2}>
                <PageBindingSection workspace={workspace} />
                <DataSourcesSection workspace={workspace} />
              </Stack>
            </SecondarySection>
            <SecondarySection
              title="Remote Overrides"
              description="Page-owned overrides are optional. In the normal flow, the page uses the Pages defaults that were set during setup."
              expandedLabel="Hide Remote Overrides"
              collapsedLabel="Show Remote Overrides"
            >
              <PageRemoteBindingsSection workspace={workspace} />
            </SecondarySection>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

