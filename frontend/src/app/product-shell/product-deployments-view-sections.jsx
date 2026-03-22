import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { resolveDeploymentBrowseState } from "./product-deployment-browse-state.js";

export function DeploymentsHero() {
  return (
    <Card variant="outlined" sx={{ p: 2, background: "linear-gradient(135deg, #4c1d95 0%, #1d4ed8 100%)", color: "common.white" }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
          Deployments
        </Typography>
        <Typography variant="h4">Release Room</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Choose the bundle, understand what will change, run one release, and open what went live.
        </Typography>
      </Stack>
    </Card>
  );
}

function resolvePageFamilyLabel(page) {
  if (!page) {
    return "Release needs a page";
  }
  if (page.deploymentMode === "per-record" && page.primarySourceType === "blog-post") {
    return "Post pages";
  }
  if (page.deploymentMode === "per-record" && page.primarySourceType === "blog-category") {
    return "Category pages";
  }
  if (page.deploymentMode === "per-record" && page.primarySourceType === "blog-tag") {
    return "Tag pages";
  }
  if (page.deploymentMode === "per-record") {
    return "Record pages";
  }
  return "Single page";
}

function resolveOutputCount(page) {
  if (!page) {
    return 0;
  }
  return page.deploymentMode === "per-record"
    ? Math.max(Number(page.deploymentTargetCount ?? 0), 0)
    : 1;
}

function resolveOutputLabel(page) {
  const count = resolveOutputCount(page);
  return `${count} output${count === 1 ? "" : "s"}`;
}

function describeReleaseMission(page) {
  if (!page) {
    return "Choose the page family this release should publish.";
  }
  const family = resolvePageFamilyLabel(page);
  return `Publishes ${family.charAt(0).toLowerCase()}${family.slice(1)}.`;
}

function resolveBundlePosture(page) {
  if (!page) {
    return {
      label: "Needs setup",
      color: "warning",
      summary: "This release is missing its page definition."
    };
  }
  if (page.deploymentStatus === "clean") {
    return {
      label: "Current",
      color: "success",
      summary: "Everything for this release currently looks live."
    };
  }
  if (page.deploymentStatus === "stale") {
    return {
      label: "Needs release",
      color: "warning",
      summary: `${resolveOutputLabel(page)} need refresh before visitors see the latest version.`
    };
  }
  if (page.deploymentStatus === "missing") {
    return {
      label: "Not live yet",
      color: "warning",
      summary: "This release has no current output yet."
    };
  }
  return {
    label: "Attention needed",
    color: "error",
    summary: "This release needs inspection before it should be run again."
  };
}

function resolvePathSummary(page) {
  return page?.pathPattern || page?.path || "Path not defined";
}

function describeReleaseAction(selectedPage) {
  if (!selectedPage) {
    return "Choose a release bundle to see what this action will do.";
  }
  return `This action refreshes ${resolveOutputLabel(selectedPage)} for ${resolvePageFamilyLabel(selectedPage).toLowerCase()}, keeps the bound data and media in sync, and then checks the public result.`;
}

export function DeploymentPipelineReadinessCard({
  readiness,
  pipelineState,
  selectedBundle,
  selectedPage,
  runSummary,
  onRunPipeline
}) {
  const blockingItems = readiness.items.filter(
    (item) => item.state !== "ready" && !(item.required !== true && item.state === "optional")
  );
  const readyCount = readiness.items.filter((item) => item.state === "ready").length;
  const latestRun = runSummary?.latestRun ?? null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Release This Bundle</Typography>
              <Typography variant="body2" color="text.secondary">
                {describeReleaseAction(selectedPage)}
              </Typography>
            </Stack>
            <Button variant="contained" onClick={onRunPipeline} disabled={!readiness.canRun || pipelineState.processing}>
              {pipelineState.processing ? "Releasing..." : "Release This Bundle"}
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {selectedBundle ? <Chip size="small" label={`Bundle ${selectedBundle.title}`} variant="outlined" /> : null}
            {selectedPage ? <Chip size="small" label={`Page ${selectedPage.title}`} variant="outlined" /> : null}
            <Chip size="small" label={`${readyCount}/${readiness.items.length} checks ready`} color={blockingItems.length === 0 ? "success" : "warning"} />
            {latestRun ? (
              <Chip
                size="small"
                label={`Last release ${latestRun.status} ${latestRun.finishedOn ?? latestRun.startedOn ?? ""}`.trim()}
                color={latestRun.status === "completed" ? "success" : latestRun.status === "failed" ? "error" : "warning"}
                variant="outlined"
              />
            ) : null}
          </Stack>

          {!selectedBundle ? <Alert severity="info">Choose a release bundle to define the release.</Alert> : null}
          {selectedBundle && blockingItems.length === 0 ? (
            <Alert severity="success">Everything needed for this release is ready.</Alert>
          ) : null}
          {blockingItems.length > 0 ? (
            <Alert severity={blockingItems.some((item) => item.state === "blocked") ? "error" : "warning"}>
              <Stack spacing={0.5}>
                {blockingItems.map((item) => (
                  <Typography key={item.key} variant="body2">
                    {item.label}: {item.message}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}

          {pipelineState.currentLabel ? (
            <Alert severity="info">Running: {pipelineState.currentLabel}</Alert>
          ) : null}
          {pipelineState.errorMessage ? <Alert severity="error">{pipelineState.errorMessage}</Alert> : null}
          {pipelineState.successMessage ? <Alert severity="success">{pipelineState.successMessage}</Alert> : null}

          {pipelineState.steps.length > 0 ? (
            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Stack spacing={0.75}>
                <Typography variant="subtitle2">Release Progress</Typography>
                {pipelineState.steps.map((step) => (
                  <Stack key={step.id} direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                    <Typography variant="body2">{step.label}</Typography>
                    <Typography variant="caption" color={step.status === "error" ? "error.main" : "text.secondary"}>
                      {step.status}
                      {step.message ? ` • ${step.message}` : ""}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function summarizeIncludedReleaseWork(selectedBundle) {
  if (!selectedBundle) {
    return [];
  }

  const items = [];
  if (selectedBundle.postsProjectionTargetProfileId) {
    items.push("Posts data");
  }
  if (selectedBundle.categoriesProjectionTargetProfileId) {
    items.push("Categories data");
  }
  if (selectedBundle.tagsProjectionTargetProfileId) {
    items.push("Tags data");
  }
  if (selectedBundle.mediaTargetProfileId) {
    items.push("Media files");
  }
  if (selectedBundle.deploymentTargetProfileId) {
    items.push("Page HTML");
  }
  if (selectedBundle.browserDeliveryTargetProfileId) {
    items.push("Public delivery");
  }
  return items;
}

function formatChangeSentence(item) {
  if (!item?.hasComparison) {
    return "Change counts are not loaded yet for this area.";
  }
  if (
    Number(item.createCount ?? 0) === 0 &&
    Number(item.updateCount ?? 0) === 0 &&
    Number(item.deleteCount ?? 0) === 0 &&
    Number(item.localOnlyCount ?? 0) === 0 &&
    Number(item.remoteOnlyCount ?? 0) === 0
  ) {
    return "This area is already current.";
  }

  return [
    Number(item.createCount ?? 0) > 0 ? `${item.createCount} create` : null,
    Number(item.updateCount ?? 0) > 0 ? `${item.updateCount} update` : null,
    Number(item.deleteCount ?? 0) > 0 ? `${item.deleteCount} delete` : null,
    Number(item.localOnlyCount ?? 0) > 0 ? `${item.localOnlyCount} local only` : null,
    Number(item.remoteOnlyCount ?? 0) > 0 ? `${item.remoteOnlyCount} remote only` : null
  ].filter(Boolean).join(" • ");
}

function createReleaseChangeRows(selectedBundle, selectedPage, observability) {
  if (!selectedBundle) {
    return [];
  }

  const rows = [];
  const expectedOutputCount = Number(selectedPage?.deploymentTargetCount ?? 0);
  const staleCount = Number(selectedPage?.deploymentStaleCount ?? 0);
  const missingCount = Number(selectedPage?.deploymentMissingCount ?? 0);

  rows.push({
    key: "page-html",
    label: "Page HTML",
    status: selectedPage?.deploymentStatus ?? "unknown",
    changed: staleCount > 0 || missingCount > 0,
    summary:
      staleCount > 0 || missingCount > 0
        ? `${expectedOutputCount || staleCount + missingCount || 1} output${expectedOutputCount === 1 ? "" : "s"} need refresh.`
        : `${expectedOutputCount || 1} output${expectedOutputCount === 1 ? "" : "s"} already match the current page.`
  });

  const compareItemMap = new Map((observability?.footprint?.compareItems ?? []).map((item) => [item.key, item]));

  function pushRow(key, label) {
    const item = compareItemMap.get(key);
    const summary = formatChangeSentence(item);
    rows.push({
      key,
      label,
      status: item?.status ?? "unknown",
      changed: Boolean(item?.hasComparison) && summary !== "This area is already current.",
      summary
    });
  }

  if (selectedBundle.postsProjectionTargetProfileId) {
    pushRow("posts-projection", "Posts data");
  }
  if (selectedBundle.categoriesProjectionTargetProfileId) {
    pushRow("categories-projection", "Categories data");
  }
  if (selectedBundle.tagsProjectionTargetProfileId) {
    pushRow("tags-projection", "Tags data");
  }
  if (selectedBundle.mediaTargetProfileId) {
    pushRow("media-sync", "Media files");
  }

  return rows;
}

export function DeploymentReleaseChangesCard({ selectedBundle, selectedPage, observability, runSummary }) {
  const rows = createReleaseChangeRows(selectedBundle, selectedPage, observability);
  const unknownRows = rows.filter((row) => row.summary === "Change counts are not loaded yet for this area.").length;
  const changedRows = rows.filter((row) => row.changed).length;
  const latestRun = runSummary?.latestRun ?? null;

  let summaryMessage = "Choose a release bundle to see what will refresh.";
  let summarySeverity = "info";

  if (selectedBundle) {
    if (changedRows === 0 && unknownRows === 0) {
      summaryMessage = "This looks like a rerun. Page output and bound data are already current.";
      summarySeverity = "success";
    } else if (changedRows > 0) {
      summaryMessage = `This release will refresh ${changedRows} area${changedRows === 1 ? "" : "s"} before it is live again.`;
      summarySeverity = "warning";
    } else {
      summaryMessage = "Some target areas still need compare results before you can see exact change counts.";
      summarySeverity = "info";
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">What Will Refresh</Typography>
            <Typography variant="body2" color="text.secondary">
              Answer the main question before release: is this just a confidence rerun, or will visitors actually see something change?
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {selectedPage ? (
              <Chip
                size="small"
                label={`${Number(selectedPage.deploymentTargetCount ?? 0)} output${Number(selectedPage.deploymentTargetCount ?? 0) === 1 ? "" : "s"}`}
                variant="outlined"
              />
            ) : null}
            {selectedBundle ? (
              <Chip
                size="small"
                label={`${changedRows} area${changedRows === 1 ? "" : "s"} changing`}
                color={changedRows > 0 ? "warning" : "success"}
              />
            ) : null}
            {latestRun ? (
              <Chip
                size="small"
                label={`Last finished ${latestRun.finishedOn ?? latestRun.startedOn ?? "recently"}`}
                variant="outlined"
              />
            ) : null}
          </Stack>

          <Alert severity={summarySeverity}>{summaryMessage}</Alert>

          {selectedBundle ? (
            <Stack spacing={1}>
              {rows.map((row) => (
                <Paper key={row.key} variant="outlined" sx={{ p: 1.25 }}>
                  <Stack spacing={0.5}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
                      <Typography variant="subtitle2">{row.label}</Typography>
                      <Chip
                        size="small"
                        label={row.status}
                        color={row.changed ? "warning" : row.status === "clean" ? "success" : "default"}
                        variant={row.changed ? "filled" : "outlined"}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {row.summary}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DeploymentReleaseShapeCard({
  selectedBundle,
  forecast,
  selectedPage,
  runtimePreviewState,
  suppressMissingStoredKeyWarning = false
}) {
  const browseState = resolveDeploymentBrowseState({
    selectedPage,
    bundleForecast: forecast,
    runtimePreviewState
  });
  const includedItems = summarizeIncludedReleaseWork(selectedBundle);
  const previewSourceLabel =
    runtimePreviewState?.previewSource?.title
    ?? runtimePreviewState?.previewSource?.label
    ?? runtimePreviewState?.previewSource?.name
    ?? runtimePreviewState?.previewSource?.id
    ?? "";

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Release Shape</Typography>
            <Typography variant="body2" color="text.secondary">
              Start here: what this release is for, what it carries with it, and which live page you should inspect when it finishes.
            </Typography>
          </Stack>
          {!selectedBundle ? (
            <Alert severity="info">Choose a release bundle to see the release shape.</Alert>
          ) : (
            <>
              <Alert severity="info">{describeReleaseMission(selectedPage)}</Alert>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" label={forecast.modeLabel} variant="outlined" />
                <Chip
                  size="small"
                  label={`${forecast.expectedOutputCount} expected output${forecast.expectedOutputCount === 1 ? "" : "s"}`}
                  color={forecast.expectedOutputCount > 0 ? "success" : "warning"}
                />
                {previewSourceLabel ? <Chip size="small" label={`Example ${previewSourceLabel}`} variant="outlined" /> : null}
              </Stack>

              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">This release includes</Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {includedItems.map((item) => (
                      <Chip key={item} size="small" label={item} variant="outlined" />
                    ))}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Page: {forecast.pageTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Public pattern: {browseState.pathLabel}
                  </Typography>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">Expected outcome</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Local artifact: {browseState.localArtifactPath}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Example live URL: {browseState.publicUrl || "Not resolved yet"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Public origin: {browseState.publicOrigin}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Media base: {browseState.publicMediaBaseUrl}
                  </Typography>
                </Stack>
              </Paper>

              {browseState.publicUrlUnavailableMessage && !suppressMissingStoredKeyWarning ? (
                <Alert severity="warning">{browseState.publicUrlUnavailableMessage}</Alert>
              ) : null}

              {forecast.warnings.length > 0 ? (
                <Stack spacing={1}>
                  {forecast.warnings.map((warning) => (
                    <Alert key={warning} severity="warning">
                      {warning}
                    </Alert>
                  ))}
                </Stack>
              ) : null}

              {browseState.publicUrl !== "Not resolved yet" ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button
                    component="a"
                    href={browseState.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    size="small"
                  >
                    Open Example URL
                  </Button>
                  {browseState.publicOrigin !== "Not resolved yet" ? (
                    <Button
                      component="a"
                      href={browseState.publicOrigin}
                      target="_blank"
                      rel="noreferrer"
                      variant="text"
                      size="small"
                    >
                      Open Public Origin
                    </Button>
                  ) : null}
                </Stack>
              ) : null}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DeploymentBundleValidationCard({ validation }) {
  if (!validation) {
    return null;
  }

  const hasErrors = validation.errorMessages.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Release Recipe Check</Typography>
              <Typography variant="body2" color="text.secondary">
                Confirm that this release recipe points at a coherent page, data, media, and public delivery combination.
              </Typography>
            </Stack>
            <Chip
              size="small"
              label={validation.state}
              color={validation.state === "ready" ? "success" : validation.state === "warning" ? "warning" : "error"}
            />
          </Stack>
          {!hasErrors && !hasWarnings ? (
            <Alert severity="success">This release recipe is coherent.</Alert>
          ) : null}
          {hasErrors ? (
            <Alert severity="error">
              <Stack spacing={0.5}>
                {validation.errorMessages.map((message) => (
                  <Typography key={message} variant="body2">
                    {message}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}
          {hasWarnings ? (
            <Alert severity="warning">
              <Stack spacing={0.5}>
                {validation.warnings.map((message) => (
                  <Typography key={message} variant="body2">
                    {message}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function findLatestRunByStatus(runs, status) {
  return (Array.isArray(runs) ? runs : []).find((run) => run?.status === status) ?? null;
}

function resolveFailureNextAction(run) {
  const message = `${run?.summaryMessage ?? ""} ${run?.title ?? ""}`.toLowerCase();
  if (message.includes("service-account") || message.includes("credential") || message.includes("connection")) {
    return "Next stop: open Remotes and repair the selected connection before trying again.";
  }
  if (message.includes("domain") || message.includes("browser delivery") || message.includes("dns") || message.includes("hostname")) {
    return "Next stop: open Domains and check the public delivery setup.";
  }
  if (message.includes("media")) {
    return "Next stop: open Media or Recovery Tools and compare the media library.";
  }
  if (message.includes("page") || message.includes("html")) {
    return "Next stop: open Pages or Recovery Tools and inspect the HTML output.";
  }
  return "Next stop: use Recovery Tools only if the main release path still cannot complete.";
}

function createHistoryDecisionSummary(selectedPage, latestSuccessfulRun, latestFailedRun) {
  if (!selectedPage) {
    return {
      severity: "info",
      message: "Choose a release bundle to understand the recent release posture."
    };
  }

  const latestFailureIsNewer =
    latestFailedRun &&
    (!latestSuccessfulRun || `${latestFailedRun.startedOn ?? ""}` > `${latestSuccessfulRun.startedOn ?? ""}`);

  if (latestFailureIsNewer) {
    return {
      severity: "error",
      message: "The most recent attempt failed. Review the failed release before running this bundle again."
    };
  }
  if (selectedPage.deploymentStatus === "stale" || selectedPage.deploymentStatus === "missing") {
    return {
      severity: "warning",
      message: "The current page state still needs a new release even though an older successful release exists."
    };
  }
  if (latestSuccessfulRun) {
    return {
      severity: "success",
      message: "The last successful release still matches the current page state."
    };
  }
  return {
    severity: "info",
    message: "No successful release is recorded yet for this bundle."
  };
}

function ReleaseHistorySummaryCard({ title, run, emptyLabel, extra, browseState }) {
  if (!run) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={0.75}>
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {emptyLabel}
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
      <Stack spacing={0.75}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Typography variant="subtitle2">{title}</Typography>
          <Chip
            size="small"
            label={run.status}
            color={run.status === "completed" ? "success" : run.status === "failed" ? "error" : "warning"}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Started {run.startedOn}
          {run.finishedOn ? ` • Finished ${run.finishedOn}` : ""}
        </Typography>
        {run.summaryMessage ? <Typography variant="body2">{run.summaryMessage}</Typography> : null}
        {extra ? (
          <Typography variant="body2" color="text.secondary">
            {extra}
          </Typography>
        ) : null}
        {run.status === "completed" && browseState?.publicUrl && browseState.publicUrl !== "Not resolved yet" ? (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              component="a"
              href={browseState.publicUrl}
              target="_blank"
              rel="noreferrer"
              variant="outlined"
              size="small"
            >
              Open Current Live Result
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function DeploymentReleaseHistoryCard({
  selectedBundle,
  selectedPage,
  bundleForecast,
  runtimePreviewState,
  runSummary,
  runs
}) {
  const latestRun = runSummary?.latestRun ?? null;
  const latestSuccessfulRun = findLatestRunByStatus(runs, "completed");
  const latestFailedRun = findLatestRunByStatus(runs, "failed");
  const decisionSummary = createHistoryDecisionSummary(selectedPage, latestSuccessfulRun, latestFailedRun);
  const browseState = resolveDeploymentBrowseState({
    selectedPage,
    bundleForecast,
    runtimePreviewState
  });
  const olderRuns = (Array.isArray(runs) ? runs : []).filter(
    (run) => run?.id !== latestSuccessfulRun?.id && run?.id !== latestFailedRun?.id && run?.id !== latestRun?.id
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Recent Releases</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedBundle?.title ?? "Select a release bundle to inspect what went live last time."}
              </Typography>
            </Stack>
            {selectedBundle ? (
              <Chip
                size="small"
                variant="outlined"
                label={`${runSummary.totalRuns} runs • ${runSummary.completedRuns} completed • ${runSummary.failedRuns} failed`}
              />
            ) : null}
          </Stack>
          {!selectedBundle ? <Alert severity="info">Select a release bundle first.</Alert> : null}
          {selectedBundle && runs.length === 0 ? (
            <Alert severity="info">No release runs recorded for this bundle yet.</Alert>
          ) : null}
          {selectedBundle ? <Alert severity={decisionSummary.severity}>{decisionSummary.message}</Alert> : null}

          {selectedBundle ? (
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
              <ReleaseHistorySummaryCard
                title="Last Successful Release"
                run={latestSuccessfulRun}
                emptyLabel="No successful release is recorded yet."
                extra={
                  latestSuccessfulRun
                    ? "Use this as the last known good release for this bundle."
                    : ""
                }
                browseState={browseState}
              />
              <ReleaseHistorySummaryCard
                title="Last Failed Attempt"
                run={latestFailedRun}
                emptyLabel="No failed release is recorded for this bundle."
                extra={latestFailedRun ? resolveFailureNextAction(latestFailedRun) : ""}
                browseState={null}
              />
            </Stack>
          ) : null}

          {olderRuns.length > 0 ? <Typography variant="subtitle2">Earlier Activity</Typography> : null}
          {olderRuns.slice(0, 4).map((run) => (
            <Paper key={run.id} variant="outlined" sx={{ p: 1.25 }}>
              <Stack spacing={0.75}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
                  <Stack spacing={0.25}>
                    <Typography variant="subtitle2">{run.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Started {run.startedOn}
                      {run.finishedOn ? ` • Finished ${run.finishedOn}` : ""}
                    </Typography>
                  </Stack>
                  <Chip
                    size="small"
                    label={run.status}
                    color={run.status === "completed" ? "success" : run.status === "failed" ? "error" : "warning"}
                  />
                </Stack>
                {run.summaryMessage ? (
                  <Typography variant="body2" color="text.secondary">
                    {run.summaryMessage}
                  </Typography>
                ) : null}
                <Typography variant="caption" color="text.secondary">
                  {run.successfulStepCount ?? 0} succeeded • {run.failedStepCount ?? 0} failed • {run.stepCount ?? 0} total steps
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DeploymentBrowseLinksCard({
  selectedPage,
  bundleForecast,
  runtimePreviewState,
  suppressMissingStoredKeyWarning = false
}) {
  const browseState = resolveDeploymentBrowseState({
    selectedPage,
    bundleForecast,
    runtimePreviewState
  });
  const previewSourceLabel =
    runtimePreviewState?.previewSource?.title
    ?? runtimePreviewState?.previewSource?.label
    ?? runtimePreviewState?.previewSource?.name
    ?? runtimePreviewState?.previewSource?.id
    ?? "";
  const mediaUrls = (runtimePreviewState?.payload?.media?.items ?? [])
    .map((item) => item?.preferredUrl || item?.publicUrl || item?.temporaryUrl || "")
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Visible Result</Typography>
            <Typography variant="body2" color="text.secondary">
              Start with the user-facing outcome: what page should open, what path it owns, and what media appears on the example.
            </Typography>
          </Stack>
          {!selectedPage ? (
            <Alert severity="info">Select a release bundle first.</Alert>
          ) : (
            <>
              <Alert severity="info">
                {previewSourceLabel
                  ? `Open the example for ${previewSourceLabel} to inspect the visible result of this release.`
                  : "Use the example live link to inspect the visible result of this release."}
              </Alert>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" label={resolvePageFamilyLabel(selectedPage)} variant="outlined" />
                <Chip size="small" label={resolveOutputLabel(selectedPage)} variant="outlined" />
                {previewSourceLabel ? (
                  <Chip size="small" label={`Example ${previewSourceLabel}`} variant="outlined" />
                ) : null}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Local artifact: {browseState.localArtifactPath}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Example live URL: {browseState.publicUrl || "Not resolved yet"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Public pattern: {browseState.pathLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Public origin: {browseState.publicOrigin}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Media base: {browseState.publicMediaBaseUrl}
              </Typography>
              {browseState.publicUrlUnavailableMessage && !suppressMissingStoredKeyWarning ? (
                <Alert
                  severity="warning"
                >
                  {browseState.publicUrlUnavailableMessage}
                </Alert>
              ) : null}
              {browseState.publicUrl !== "Not resolved yet" ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button
                    component="a"
                    href={browseState.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    size="small"
                  >
                    Open Example URL
                  </Button>
                  {browseState.publicOrigin !== "Not resolved yet" ? (
                    <Button
                      component="a"
                      href={browseState.publicOrigin}
                      target="_blank"
                      rel="noreferrer"
                      variant="text"
                      size="small"
                    >
                      Open Public Origin
                    </Button>
                  ) : null}
                </Stack>
              ) : null}
              <Stack spacing={0.75}>
                <Typography variant="subtitle2">Media On This Example</Typography>
                {mediaUrls.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No media links were resolved for the current example.
                  </Typography>
                ) : (
                  mediaUrls.map((url) => (
                    <Typography key={url} variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                      {url}
                    </Typography>
                  ))
                )}
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DeploymentTargetCard({
  title,
  description = "",
  target,
  latestRun,
  onCompare,
  onExecute,
  onValidate,
  onOpen,
  openLabel = "Open Related Desk",
  executingLabel = "Execute Sync",
  bindingSourceLabel = null
}) {
  const canCompare = Boolean(target) && typeof onCompare === "function";
  const canExecute = Boolean(target) && typeof onExecute === "function";
  const canValidate = Boolean(target) && typeof onValidate === "function";

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">{title}</Typography>
              {description ? (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              ) : null}
              <Typography variant="body2" color="text.secondary">
                {target?.title ?? "No target configured"}
              </Typography>
              {bindingSourceLabel ? (
                <Typography variant="caption" color="text.secondary">
                  Binding source: {bindingSourceLabel}
                </Typography>
              ) : null}
            </Stack>
            {target?.targetStatus ? <Chip size="small" label={target.targetStatus} /> : null}
          </Stack>
          {latestRun ? (
            <Typography variant="caption" color="text.secondary">
              Latest run: {latestRun.title} • {latestRun.status}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {canValidate ? (
              <Button variant="outlined" onClick={onValidate}>
                Validate
              </Button>
            ) : null}
            {canCompare ? (
              <Button variant="outlined" onClick={onCompare}>
                Compare
              </Button>
            ) : null}
            {canExecute ? (
              <Button variant="contained" onClick={onExecute}>
                {executingLabel}
              </Button>
            ) : null}
            <Button variant="text" onClick={onOpen}>
              {openLabel}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DeploymentRemoteHealthNotice({ remoteHealth }) {
  if (remoteHealth.hasValidatedConnection) {
    return <Alert severity="success">{remoteHealth.message}</Alert>;
  }
  return <Alert severity="warning">{remoteHealth.message}</Alert>;
}

export function DeploymentBundlesSidebar({ workspace, onOpenPages }) {
  const pageById = new Map((workspace.availablePages ?? []).map((page) => [page.id, page]));
  const bundleRows = workspace.bundles.map((bundle) => {
    const page = pageById.get(bundle.pageId);
    const posture = resolveBundlePosture(page);

    return {
      id: bundle.id,
      title: bundle.title,
      page,
      posture
    };
  });

  return (
    <Paper variant="outlined" sx={{ p: 1.5, width: { xs: "100%", xl: 320 }, flexShrink: 0 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row", xl: "column" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center", xl: "stretch" }}>
          <Stack spacing={0.5}>
            <Typography variant="h6">Release Bundles</Typography>
            <Typography variant="body2" color="text.secondary">
              Each bundle is one repeatable release for a page family.
            </Typography>
          </Stack>
          <Button variant="text" onClick={onOpenPages}>
            Open Pages
          </Button>
        </Stack>
        {workspace.bundles.length > 0 ? (
          <Alert severity="info">
            Choose the bundle that matches the page family you want to refresh right now.
          </Alert>
        ) : null}
        <List dense disablePadding>
          {bundleRows.map((bundle) => (
            <ListItemButton
              key={bundle.id}
              selected={workspace.selectedBundleId === bundle.id}
              onClick={() => workspace.setSelectedBundleId(bundle.id)}
              sx={{ borderRadius: 1, mb: 0.75, alignItems: "flex-start", border: "1px solid", borderColor: "divider" }}
            >
              <ListItemText
                primary={bundle.title}
                secondaryTypographyProps={{ component: "div" }}
                secondary={(
                  <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <Chip
                        size="small"
                        label={bundle.posture.label}
                        color={bundle.posture.color}
                        variant={workspace.selectedBundleId === bundle.id ? "filled" : "outlined"}
                      />
                      <Chip
                        size="small"
                        label={bundle.page ? resolveOutputLabel(bundle.page) : "Page needed"}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {bundle.page ? describeReleaseMission(bundle.page) : "Pick the page this release should own."}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {bundle.page ? `Page: ${bundle.page.title}` : "Page: not chosen yet"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {bundle.page ? `Path pattern: ${resolvePathSummary(bundle.page)}` : "Path pattern not defined yet"}
                    </Typography>
                  </Stack>
                )}
              />
            </ListItemButton>
          ))}
        </List>
        <Button variant="outlined" onClick={workspace.startNewBundle}>
          New Bundle
        </Button>
        {workspace.bundles.length === 0 ? (
          <Alert severity="info">No release bundles yet.</Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}

function DeploymentTargetSelect({ label, value, onChange, targets }) {
  return (
    <TextField select label={label} value={value} onChange={onChange} fullWidth>
      {targets.map((target) => (
        <MenuItem key={target.id} value={target.id}>
          {target.optionLabel}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function DeploymentBundleEditorCard({ workspace }) {
  const isCreating = workspace.isCreatingNewBundle || !workspace.selectedBundleId;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">
                {isCreating ? "Create Release Recipe" : "Edit Release Recipe"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Define what this release owns: the page family, the content refreshes, the media refresh, and the public delivery destination.
              </Typography>
            </Stack>
          </Stack>
          {workspace.bundleActionState.errorMessage ? (
            <Alert severity="error">{workspace.bundleActionState.errorMessage}</Alert>
          ) : null}
          {workspace.bundleActionState.successMessage ? (
            <Alert severity="success">{workspace.bundleActionState.successMessage}</Alert>
          ) : null}
          <TextField
            label="Release Name"
            value={workspace.bundleDraft.title}
            onChange={(event) => workspace.changeBundleField("title", event.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Page This Release Owns"
            value={workspace.bundleDraft.pageId}
            onChange={(event) => workspace.changeBundleField("pageId", event.target.value)}
            fullWidth
          >
            {workspace.availablePages.map((page) => (
              <MenuItem key={page.id} value={page.id}>
                {page.title}
              </MenuItem>
            ))}
          </TextField>
          <Alert severity="info">
            The page defines the public pattern. The targets below define which data, media, and public delivery are refreshed when this release runs.
          </Alert>
          <DeploymentTargetSelect
            label="Posts Data Refresh"
            value={workspace.bundleDraft.postsProjectionTargetProfileId}
            onChange={(event) => workspace.changeBundleField("postsProjectionTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.postsProjectionTargets}
          />
          <DeploymentTargetSelect
            label="Categories Data Refresh"
            value={workspace.bundleDraft.categoriesProjectionTargetProfileId}
            onChange={(event) => workspace.changeBundleField("categoriesProjectionTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.categoriesProjectionTargets}
          />
          <DeploymentTargetSelect
            label="Tags Data Refresh"
            value={workspace.bundleDraft.tagsProjectionTargetProfileId}
            onChange={(event) => workspace.changeBundleField("tagsProjectionTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.tagsProjectionTargets}
          />
          <DeploymentTargetSelect
            label="Media Library Refresh"
            value={workspace.bundleDraft.mediaTargetProfileId}
            onChange={(event) => workspace.changeBundleField("mediaTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.mediaTargets}
          />
          <DeploymentTargetSelect
            label="Public HTML Target"
            value={workspace.bundleDraft.deploymentTargetProfileId}
            onChange={(event) => workspace.changeBundleField("deploymentTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.deploymentTargets}
          />
          <DeploymentTargetSelect
            label="Public Delivery"
            value={workspace.bundleDraft.browserDeliveryTargetProfileId}
            onChange={(event) => workspace.changeBundleField("browserDeliveryTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.browserTargets}
          />
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="contained"
              onClick={workspace.saveBundle}
              disabled={workspace.bundleActionState.saving || !workspace.bundleValidation.canSave}
            >
              {workspace.bundleActionState.saving
                ? "Saving..."
                : isCreating
                  ? "Create Recipe"
                  : "Save Recipe"}
            </Button>
            <Button variant="text" onClick={workspace.startNewBundle}>
              Reset
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function LocalHtmlDeploymentCard({ workspace, onOpenPages }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Local Page Output</Typography>
              <Typography variant="body2" color="text.secondary">
                Use this when you need to rebuild the local page files before or after a release.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {workspace.selectedBundle?.title ?? "Select a release bundle"}
              </Typography>
            </Stack>
            {workspace.selectedPage?.deploymentStatus ? (
              <Chip size="small" label={workspace.selectedPage.deploymentStatus} />
            ) : null}
          </Stack>
          {workspace.selectedPage ? (
            <Typography variant="body2" color="text.secondary">
              Outputs: {workspace.selectedPage.deploymentSyncedCount ?? 0} synced / {workspace.selectedPage.deploymentStaleCount ?? 0} stale / {workspace.selectedPage.deploymentMissingCount ?? 0} missing
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="contained"
              onClick={workspace.syncSelectedPage}
              disabled={!workspace.selectedPage?.id || workspace.localSyncState.processing}
            >
              {workspace.localSyncState.processing ? "Syncing..." : "Sync Local HTML"}
            </Button>
            <Button variant="text" onClick={onOpenPages}>
              Open Pages
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
