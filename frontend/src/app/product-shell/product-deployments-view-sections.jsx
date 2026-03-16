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
        <Typography variant="h4">Release Pipeline Desk</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Coordinate local HTML generation and remote sync for pages, projections, media, and browser delivery.
        </Typography>
      </Stack>
    </Card>
  );
}

export function DeploymentSummaryCard({ label, value }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5">{value}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function resolveReadinessChipColor(item) {
  if (item.state === "ready") {
    return "success";
  }
  if (item.state === "blocked") {
    return "error";
  }
  if (item.state === "optional") {
    return "default";
  }
  return "warning";
}

function resolveReadinessChipLabel(item) {
  return `${item.label}: ${item.state}`;
}

export function DeploymentPipelineReadinessCard({ readiness, pipelineState, onRunPipeline }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Release Pipeline</Typography>
              <Typography variant="body2" color="text.secondary">
                Run local HTML generation, remote projection/media/html sync, and final browser-delivery validation as one bounded flow.
              </Typography>
            </Stack>
            <Button variant="contained" onClick={onRunPipeline} disabled={!readiness.canRun || pipelineState.processing}>
              {pipelineState.processing ? "Running Pipeline..." : "Run Release Pipeline"}
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {readiness.items.map((item) => (
              <Chip
                key={item.key}
                size="small"
                label={resolveReadinessChipLabel(item)}
                color={resolveReadinessChipColor(item)}
                variant={item.state === "ready" ? "filled" : "outlined"}
              />
            ))}
          </Stack>
          {readiness.items.some((item) => item.message && item.state !== "ready") ? (
            <Stack spacing={0.5}>
              {readiness.items
                .filter((item) => item.message && item.state !== "ready")
                .map((item) => (
                  <Typography key={item.key} variant="caption" color="text.secondary">
                    {item.label}: {item.message}
                  </Typography>
                ))}
            </Stack>
          ) : null}

          {pipelineState.currentLabel ? (
            <Alert severity="info">Running: {pipelineState.currentLabel}</Alert>
          ) : null}
          {pipelineState.errorMessage ? <Alert severity="error">{pipelineState.errorMessage}</Alert> : null}
          {pipelineState.successMessage ? <Alert severity="success">{pipelineState.successMessage}</Alert> : null}

          {pipelineState.steps.length > 0 ? (
            <Paper variant="outlined" sx={{ p: 1.25 }}>
              <Stack spacing={0.75}>
                <Typography variant="subtitle2">Pipeline Log</Typography>
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
              <Typography variant="subtitle1">Bundle Validation</Typography>
              <Typography variant="body2" color="text.secondary">
                Validate bundle coherence before saving or running the release pipeline.
              </Typography>
            </Stack>
            <Chip
              size="small"
              label={validation.state}
              color={validation.state === "ready" ? "success" : validation.state === "warning" ? "warning" : "error"}
            />
          </Stack>
          {!hasErrors && !hasWarnings ? (
            <Alert severity="success">Bundle bindings are coherent.</Alert>
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

export function DeploymentReleaseHistoryCard({ selectedBundle, runSummary, runs }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Bundle Release History</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedBundle?.title ?? "Select a deployment bundle to inspect its release history."}
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
          {!selectedBundle ? <Alert severity="info">Select a deployment bundle first.</Alert> : null}
          {selectedBundle && runs.length === 0 ? (
            <Alert severity="info">No release runs recorded for this bundle yet.</Alert>
          ) : null}
          {runs.slice(0, 5).map((run) => (
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
                  Steps: {run.successfulStepCount ?? 0} succeeded / {run.failedStepCount ?? 0} failed / {run.stepCount ?? 0} total
                </Typography>
                {Array.isArray(run.steps) && run.steps.length > 0 ? (
                  <Stack spacing={0.5}>
                    {run.steps.map((step) => (
                      <Typography key={`${run.id}:${step.key}`} variant="caption" color={step.status === "error" ? "error.main" : "text.secondary"}>
                        {step.label}: {step.status}
                        {step.message ? ` • ${step.message}` : ""}
                      </Typography>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DeploymentBrowseLinksCard({ selectedPage, bundleForecast, runtimePreviewState }) {
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

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Browse Links</Typography>
            <Typography variant="body2" color="text.secondary">
              Use these paths to confirm what the current release should expose locally and remotely.
            </Typography>
          </Stack>
          {!selectedPage ? (
            <Alert severity="info">Select a deployment bundle first.</Alert>
          ) : (
            <>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" label={`Local artifact ${browseState.localArtifactPath}`} variant="outlined" />
                <Chip size="small" label={`Public origin ${browseState.publicOrigin}`} variant="outlined" />
                {previewSourceLabel ? (
                  <Chip size="small" label={`Preview source ${previewSourceLabel}`} variant="outlined" />
                ) : null}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Example page URL: {browseState.publicUrl}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Media base: {browseState.publicMediaBaseUrl}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Page path or pattern: {browseState.pathLabel}
              </Typography>
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

export function DeploymentTargetCard({
  title,
  target,
  latestRun,
  onCompare,
  onExecute,
  onValidate,
  onOpen,
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
              Open Source Desk
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
  return (
    <Paper variant="outlined" sx={{ p: 1.5, width: { xs: "100%", xl: 320 }, flexShrink: 0 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Deployment Bundles</Typography>
          <Button variant="text" onClick={onOpenPages}>
            Open Pages
          </Button>
        </Stack>
        <List dense disablePadding>
          {workspace.bundles.map((bundle) => (
            <ListItemButton
              key={bundle.id}
              selected={workspace.selectedBundleId === bundle.id}
              onClick={() => workspace.setSelectedBundleId(bundle.id)}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemText
                primary={bundle.title}
                secondary={bundle.pageId ? `Page: ${bundle.pageId}` : "Bundle requires a published page"}
              />
            </ListItemButton>
          ))}
        </List>
        <Button variant="outlined" onClick={workspace.startNewBundle}>
          New Bundle
        </Button>
        {workspace.bundles.length === 0 ? (
          <Alert severity="info">No deployment bundles yet.</Alert>
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
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">
                {workspace.isCreatingNewBundle || !workspace.selectedBundleId
                  ? "Create Deployment Bundle"
                  : "Edit Deployment Bundle"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Release ownership is explicit here: one bundle binds the page, projections, media sync, remote HTML, and browser delivery.
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
            label="Bundle Title"
            value={workspace.bundleDraft.title}
            onChange={(event) => workspace.changeBundleField("title", event.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Published Page"
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
          <DeploymentTargetSelect
            label="Posts Projection Target"
            value={workspace.bundleDraft.postsProjectionTargetProfileId}
            onChange={(event) => workspace.changeBundleField("postsProjectionTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.postsProjectionTargets}
          />
          <DeploymentTargetSelect
            label="Categories Projection Target"
            value={workspace.bundleDraft.categoriesProjectionTargetProfileId}
            onChange={(event) => workspace.changeBundleField("categoriesProjectionTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.categoriesProjectionTargets}
          />
          <DeploymentTargetSelect
            label="Tags Projection Target"
            value={workspace.bundleDraft.tagsProjectionTargetProfileId}
            onChange={(event) => workspace.changeBundleField("tagsProjectionTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.tagsProjectionTargets}
          />
          <DeploymentTargetSelect
            label="Media Target"
            value={workspace.bundleDraft.mediaTargetProfileId}
            onChange={(event) => workspace.changeBundleField("mediaTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.mediaTargets}
          />
          <DeploymentTargetSelect
            label="HTML Deployment Target"
            value={workspace.bundleDraft.deploymentTargetProfileId}
            onChange={(event) => workspace.changeBundleField("deploymentTargetProfileId", event.target.value)}
            targets={workspace.availableTargetOptions.deploymentTargets}
          />
          <DeploymentTargetSelect
            label="Browser Delivery Target"
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
                : !workspace.isCreatingNewBundle && workspace.selectedBundleId
                  ? "Save Bundle"
                  : "Create Bundle"}
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
              <Typography variant="subtitle1">Local HTML Deployment</Typography>
              <Typography variant="body2" color="text.secondary">
                {workspace.selectedBundle?.title ?? "Select a deployment bundle"}
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
