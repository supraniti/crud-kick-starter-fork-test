import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useProductDeploymentsWorkspace } from "./useProductDeploymentsWorkspace.js";
import { DeploymentBundleForecastCard } from "./DeploymentBundleForecastCard.jsx";
import { DeploymentBundleRuntimePreviewCard } from "./DeploymentBundleRuntimePreviewCard.jsx";
import { DeploymentReleaseObservabilityCard } from "./DeploymentReleaseObservabilityCard.jsx";
import {
  DeploymentBundleEditorCard,
  DeploymentBundleValidationCard,
  DeploymentBrowseLinksCard,
  DeploymentBundlesSidebar,
  DeploymentPipelineReadinessCard,
  DeploymentReleaseHistoryCard,
  DeploymentRemoteHealthNotice,
  DeploymentsHero,
  DeploymentSummaryCard,
  DeploymentTargetCard,
  LocalHtmlDeploymentCard
} from "./product-deployments-view-sections.jsx";

function TargetSection({
  title,
  target,
  latestRun,
  onCompare,
  onExecute,
  onValidate,
  onOpen,
  bindingSourceLabel = null
}) {
  return (
    <DeploymentTargetCard
      title={title}
      target={target}
      latestRun={latestRun}
      onCompare={onCompare}
      onExecute={onExecute}
      onValidate={onValidate}
      onOpen={onOpen}
      bindingSourceLabel={bindingSourceLabel}
    />
  );
}

function SecondaryDeploymentSection({ title, description, collapsedLabel, expandedLabel, children }) {
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
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
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
      <DeploymentsHero />
      {workspace.errorMessage ? <Alert severity="error">{workspace.errorMessage}</Alert> : null}
      {workspace.localSyncState.errorMessage ? <Alert severity="error">{workspace.localSyncState.errorMessage}</Alert> : null}
      {workspace.localSyncState.successMessage ? <Alert severity="success">{workspace.localSyncState.successMessage}</Alert> : null}
      <DeploymentRemoteHealthNotice remoteHealth={workspace.remoteHealth} />
      <Alert severity="info">
        Normal flow: choose or create the release bundle, inspect the forecast and release readiness, run the pipeline, then review the release history. Use detailed target operations only when you need manual intervention.
      </Alert>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" } }}
      >
        <DeploymentSummaryCard label="Published Pages" value={workspace.summary.publishedPages} />
        <DeploymentSummaryCard label="Deployment Bundles" value={workspace.summary.bundleCount} />
        <DeploymentSummaryCard label="Synced Outputs" value={workspace.summary.syncedOutputs} />
        <DeploymentSummaryCard label="Stale Outputs" value={workspace.summary.staleOutputs} />
        <DeploymentSummaryCard label="Missing Outputs" value={workspace.summary.missingOutputs} />
        <DeploymentSummaryCard label="Completed Releases" value={workspace.summary.completedRuns} />
        <DeploymentSummaryCard label="Failed Releases" value={workspace.summary.failedRuns} />
      </Stack>

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <DeploymentBundlesSidebar workspace={workspace} onOpenPages={() => openRoute("test-modules-pages")} />

        <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
          <DeploymentPipelineReadinessCard
            readiness={workspace.pipelineReadiness}
            pipelineState={workspace.pipelineState}
            onRunPipeline={workspace.runReleasePipeline}
          />
          <DeploymentBundleForecastCard
            forecast={workspace.bundleForecast}
            selectedPage={workspace.selectedPage}
            runtimePreviewState={workspace.runtimePreviewState}
          />
          <DeploymentBundleRuntimePreviewCard runtimePreviewState={workspace.runtimePreviewState} />

          <DeploymentReleaseObservabilityCard
            observability={workspace.releaseObservability}
            onAnalyzeCompatibility={workspace.analyzeReleaseCompatibility}
          />

          <DeploymentReleaseHistoryCard
            selectedBundle={workspace.selectedBundle}
            runSummary={workspace.bundleRunSummary}
            runs={workspace.selectedBundleRuns}
          />

          <DeploymentBrowseLinksCard
            selectedPage={workspace.selectedPage}
            bundleForecast={workspace.bundleForecast}
            runtimePreviewState={workspace.runtimePreviewState}
          />

          <SecondaryDeploymentSection
            title="Bundle Setup"
            description="Use this when you are creating or changing which page, projections, media, and delivery targets belong to the release."
            collapsedLabel="Show Bundle Setup"
            expandedLabel="Hide Bundle Setup"
          >
            <Stack spacing={2}>
              <DeploymentBundleEditorCard workspace={workspace} />
              <DeploymentBundleValidationCard validation={workspace.bundleValidation} />
            </Stack>
          </SecondaryDeploymentSection>

          <SecondaryDeploymentSection
            title="Detailed Target Operations"
            description="Manual local sync and per-target compare/execute actions stay here for inspection and exception handling. The normal release path is the main pipeline above."
            collapsedLabel="Show Detailed Target Operations"
            expandedLabel="Hide Detailed Target Operations"
          >
            <Stack spacing={2}>
              <LocalHtmlDeploymentCard workspace={workspace} onOpenPages={() => openRoute("test-modules-pages")} />

              <TargetSection
                title="Posts Projection"
                target={workspace.projectionTarget}
                latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.projectionTarget?.id ?? "")}
                onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.projectionTarget?.id ?? "")}
                onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.projectionTarget?.id ?? "")}
                onOpen={() => openRoute("test-modules-content")}
              />

              <TargetSection
                title="Categories Projection"
                target={workspace.categoriesProjectionTarget}
                latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.categoriesProjectionTarget?.id ?? "")}
                onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.categoriesProjectionTarget?.id ?? "")}
                onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.categoriesProjectionTarget?.id ?? "")}
                onOpen={() => openRoute("test-modules-taxonomy")}
              />

              <TargetSection
                title="Tags Projection"
                target={workspace.tagsProjectionTarget}
                latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.tagsProjectionTarget?.id ?? "")}
                onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.tagsProjectionTarget?.id ?? "")}
                onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.tagsProjectionTarget?.id ?? "")}
                onOpen={() => openRoute("test-modules-taxonomy")}
              />

              <TargetSection
                title="Media Sync"
                target={workspace.mediaTarget}
                latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.mediaTarget?.id ?? "")}
                onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.mediaTarget?.id ?? "")}
                onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.mediaTarget?.id ?? "")}
                onOpen={() => openRoute("test-modules-media-manager")}
              />

              <TargetSection
                title="Remote HTML Deployment"
                target={workspace.deploymentTarget}
                latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.deploymentTarget?.id ?? "")}
                onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.deploymentTarget?.id ?? "")}
                onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.deploymentTarget?.id ?? "")}
                onOpen={() => openRoute("test-modules-pages")}
                bindingSourceLabel={workspace.deploymentBindingSourceLabel}
              />

              <TargetSection
                title="Browser Delivery"
                target={workspace.browserTarget}
                latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.browserTarget?.id ?? "")}
                onValidate={() => workspace.remoteOpsSupport.validateTarget(workspace.browserTarget?.id ?? "")}
                onOpen={openDomains}
                bindingSourceLabel={workspace.browserBindingSourceLabel}
              />
            </Stack>
          </SecondaryDeploymentSection>

          {workspace.loading ? <Alert severity="info">Loading deployment workspace...</Alert> : null}
        </Stack>
      </Stack>
    </Stack>
  );
}
