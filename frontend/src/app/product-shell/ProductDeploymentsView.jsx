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
import { useProductDeploymentsWorkspace } from "./useProductDeploymentsWorkspace.js";

function Hero() {
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

function SummaryCard({ label, value }) {
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

function PipelineReadinessCard({ readiness, pipelineState, onRunPipeline }) {
  function resolveChipColor(item) {
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

  function resolveChipLabel(item) {
    return `${item.label}: ${item.state}`;
  }

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
                label={resolveChipLabel(item)}
                color={resolveChipColor(item)}
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

function TargetCard({
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

function RemoteHealthNotice({ remoteHealth }) {
  if (remoteHealth.hasValidatedConnection) {
    return <Alert severity="success">{remoteHealth.message}</Alert>;
  }
  return <Alert severity="warning">{remoteHealth.message}</Alert>;
}

export function ProductDeploymentsView({ navigate = null }) {
  const workspace = useProductDeploymentsWorkspace();

  function openRoute(moduleId) {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId }, { replace: false });
  }

  function openDomains() {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId: "domains" }, { replace: false });
  }

  return (
    <Stack spacing={2}>
      <Hero />
      {workspace.errorMessage ? <Alert severity="error">{workspace.errorMessage}</Alert> : null}
      {workspace.localSyncState.errorMessage ? <Alert severity="error">{workspace.localSyncState.errorMessage}</Alert> : null}
      {workspace.localSyncState.successMessage ? <Alert severity="success">{workspace.localSyncState.successMessage}</Alert> : null}
      <RemoteHealthNotice remoteHealth={workspace.remoteHealth} />

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" } }}
      >
        <SummaryCard label="Published Pages" value={workspace.summary.publishedPages} />
        <SummaryCard label="Deployment Bundles" value={workspace.summary.bundleCount} />
        <SummaryCard label="Synced Outputs" value={workspace.summary.syncedOutputs} />
        <SummaryCard label="Stale Outputs" value={workspace.summary.staleOutputs} />
        <SummaryCard label="Missing Outputs" value={workspace.summary.missingOutputs} />
      </Stack>

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Paper variant="outlined" sx={{ p: 1.5, width: { xs: "100%", xl: 320 }, flexShrink: 0 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Deployment Bundles</Typography>
              <Button variant="text" onClick={() => openRoute("test-modules-pages")}>
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

        <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
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
                <TextField
                  select
                  label="Posts Projection Target"
                  value={workspace.bundleDraft.postsProjectionTargetProfileId}
                  onChange={(event) =>
                    workspace.changeBundleField("postsProjectionTargetProfileId", event.target.value)
                  }
                  fullWidth
                >
                  {workspace.availableTargetOptions.postsProjectionTargets.map((target) => (
                    <MenuItem key={target.id} value={target.id}>
                      {target.optionLabel}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Categories Projection Target"
                  value={workspace.bundleDraft.categoriesProjectionTargetProfileId}
                  onChange={(event) =>
                    workspace.changeBundleField("categoriesProjectionTargetProfileId", event.target.value)
                  }
                  fullWidth
                >
                  {workspace.availableTargetOptions.categoriesProjectionTargets.map((target) => (
                    <MenuItem key={target.id} value={target.id}>
                      {target.optionLabel}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Tags Projection Target"
                  value={workspace.bundleDraft.tagsProjectionTargetProfileId}
                  onChange={(event) =>
                    workspace.changeBundleField("tagsProjectionTargetProfileId", event.target.value)
                  }
                  fullWidth
                >
                  {workspace.availableTargetOptions.tagsProjectionTargets.map((target) => (
                    <MenuItem key={target.id} value={target.id}>
                      {target.optionLabel}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Media Target"
                  value={workspace.bundleDraft.mediaTargetProfileId}
                  onChange={(event) =>
                    workspace.changeBundleField("mediaTargetProfileId", event.target.value)
                  }
                  fullWidth
                >
                  {workspace.availableTargetOptions.mediaTargets.map((target) => (
                    <MenuItem key={target.id} value={target.id}>
                      {target.optionLabel}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="HTML Deployment Target"
                  value={workspace.bundleDraft.deploymentTargetProfileId}
                  onChange={(event) =>
                    workspace.changeBundleField("deploymentTargetProfileId", event.target.value)
                  }
                  fullWidth
                >
                  {workspace.availableTargetOptions.deploymentTargets.map((target) => (
                    <MenuItem key={target.id} value={target.id}>
                      {target.optionLabel}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Browser Delivery Target"
                  value={workspace.bundleDraft.browserDeliveryTargetProfileId}
                  onChange={(event) =>
                    workspace.changeBundleField("browserDeliveryTargetProfileId", event.target.value)
                  }
                  fullWidth
                >
                  {workspace.availableTargetOptions.browserTargets.map((target) => (
                    <MenuItem key={target.id} value={target.id}>
                      {target.optionLabel}
                    </MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button
                    variant="contained"
                    onClick={workspace.saveBundle}
                    disabled={workspace.bundleActionState.saving}
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

          <PipelineReadinessCard
            readiness={workspace.pipelineReadiness}
            pipelineState={workspace.pipelineState}
            onRunPipeline={workspace.runReleasePipeline}
          />

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
                  <Button variant="text" onClick={() => openRoute("test-modules-pages")}>
                    Open Pages
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <TargetCard
            title="Posts Projection"
            target={workspace.projectionTarget}
            latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.projectionTarget?.id ?? "")}
            onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.projectionTarget?.id ?? "")}
            onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.projectionTarget?.id ?? "")}
            onOpen={() => openRoute("test-modules-content")}
          />

          <TargetCard
            title="Categories Projection"
            target={workspace.categoriesProjectionTarget}
            latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.categoriesProjectionTarget?.id ?? "")}
            onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.categoriesProjectionTarget?.id ?? "")}
            onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.categoriesProjectionTarget?.id ?? "")}
            onOpen={() => openRoute("test-modules-taxonomy")}
          />

          <TargetCard
            title="Tags Projection"
            target={workspace.tagsProjectionTarget}
            latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.tagsProjectionTarget?.id ?? "")}
            onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.tagsProjectionTarget?.id ?? "")}
            onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.tagsProjectionTarget?.id ?? "")}
            onOpen={() => openRoute("test-modules-taxonomy")}
          />

          <TargetCard
            title="Media Sync"
            target={workspace.mediaTarget}
            latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.mediaTarget?.id ?? "")}
            onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.mediaTarget?.id ?? "")}
            onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.mediaTarget?.id ?? "")}
            onOpen={() => openRoute("test-modules-media-manager")}
          />

          <TargetCard
            title="Remote HTML Deployment"
            target={workspace.deploymentTarget}
            latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.deploymentTarget?.id ?? "")}
            onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.deploymentTarget?.id ?? "")}
            onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.deploymentTarget?.id ?? "")}
            onOpen={() => openRoute("test-modules-pages")}
            bindingSourceLabel={workspace.deploymentBindingSourceLabel}
          />

          <TargetCard
            title="Browser Delivery"
            target={workspace.browserTarget}
            latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.browserTarget?.id ?? "")}
            onValidate={() => workspace.remoteOpsSupport.validateTarget(workspace.browserTarget?.id ?? "")}
            onOpen={openDomains}
            bindingSourceLabel={workspace.browserBindingSourceLabel}
          />

          {workspace.loading ? <Alert severity="info">Loading deployment workspace...</Alert> : null}
        </Stack>
      </Stack>
    </Stack>
  );
}
