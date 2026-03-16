import { Alert, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useState } from "react";

function SecondarySection({ title, description, expandedLabel, collapsedLabel, children }) {
  const [open, setOpen] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">{title}</Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Stack>
          <Button variant="outlined" onClick={() => setOpen((previous) => !previous)}>
            {open ? expandedLabel : collapsedLabel}
          </Button>
        </Stack>
        {open ? children : null}
      </Stack>
    </Paper>
  );
}

function applyPagePreset(workspace, presetId) {
  if (presetId === "standalone") {
    workspace.changePageField("pageKind", "standalone");
    workspace.changePageField("deploymentMode", "single-page");
    workspace.changePageField("primarySourceType", "none");
    workspace.changePageField("sourceSelectionMode", "none");
    workspace.changePageField("path", "/stories/platform-health");
    workspace.changePageField("pathPattern", "");
    return;
  }

  if (presetId === "post-detail-template") {
    workspace.changePageField("pageKind", "content-detail");
    workspace.changePageField("deploymentMode", "per-record");
    workspace.changePageField("primarySourceType", "blog-post");
    workspace.changePageField("sourceSelectionMode", "all-records");
    workspace.changePageField("path", "/posts");
    workspace.changePageField("pathPattern", "/posts/{slug}");
    return;
  }

  if (presetId === "category-detail-template") {
    workspace.changePageField("pageKind", "content-detail");
    workspace.changePageField("deploymentMode", "per-record");
    workspace.changePageField("primarySourceType", "blog-category");
    workspace.changePageField("sourceSelectionMode", "all-records");
    workspace.changePageField("path", "/category");
    workspace.changePageField("pathPattern", "/category/{slug}");
  }
}

function resolvePagePresetId(pageDraft) {
  if (pageDraft.primarySourceType === "none") {
    return "standalone";
  }
  if (pageDraft.deploymentMode === "per-record" && pageDraft.primarySourceType === "blog-post") {
    return "post-detail-template";
  }
  if (
    pageDraft.deploymentMode === "per-record"
    && pageDraft.primarySourceType === "blog-category"
  ) {
    return "category-detail-template";
  }
  return "custom";
}

function PageTypeCard({ active = false, description, label, onSelect }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderColor: active ? "primary.main" : "divider",
        backgroundColor: active ? "rgba(37,99,235,0.06)" : "background.paper"
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2">{label}</Typography>
          {active ? <Chip size="small" color="primary" label="Selected" /> : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        <Stack direction="row" justifyContent="flex-start">
          <Button variant={active ? "contained" : "outlined"} onClick={onSelect}>
            {active ? "Using This Page Type" : "Use This Page Type"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function PageTypeSection({ workspace }) {
  const presetId = resolvePagePresetId(workspace.pageDraft);
  const isCustom = presetId === "custom";

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle1">Page Type</Typography>
        <Typography variant="body2" color="text.secondary">
          Start from the page you want to publish, then adjust details only if this page needs something unusual.
        </Typography>
      </Stack>
      <Stack
        spacing={1.5}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" } }}
      >
        <PageTypeCard
          active={presetId === "standalone"}
          label="Standalone Page"
          description="One page, one output path, with no primary record source."
          onSelect={() => applyPagePreset(workspace, "standalone")}
        />
        <PageTypeCard
          active={presetId === "post-detail-template"}
          label="Post Detail Template"
          description="One reusable page template that generates one HTML file per published post."
          onSelect={() => applyPagePreset(workspace, "post-detail-template")}
        />
        <PageTypeCard
          active={presetId === "category-detail-template"}
          label="Category Detail Template"
          description="One reusable page template that generates one HTML file per category."
          onSelect={() => applyPagePreset(workspace, "category-detail-template")}
        />
      </Stack>
      {isCustom ? (
        <Alert severity="info">
          This page uses a custom source/deployment combination. The advanced source controls below remain available for that case.
        </Alert>
      ) : null}
    </Stack>
  );
}

export { PageTypeSection, SecondarySection };
