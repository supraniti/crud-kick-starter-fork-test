import { Alert, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useRef, useState } from "react";
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
import { DeskTabsCard } from "../../ui/DeskTabsCard.jsx";
import { DeskSplitLayout } from "../../ui/DeskSplitLayout.jsx";
import {
  importConnectionCredentialFile,
  validateConnection
} from "../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js";

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

function isMissingStoredKeyMessage(message) {
  return typeof message === "string" && message.includes("Stored service-account key file is missing");
}

function resolveMissingStoredKeyMessage(workspace) {
  const deliveryPayloadMessage =
    workspace.runtimePreviewState?.payload?.delivery?.temporaryAccess?.pageUrlMessage ?? "";
  return [
    workspace.pipelineState.errorMessage,
    workspace.runtimePreviewState.errorMessage,
    deliveryPayloadMessage
  ].find(isMissingStoredKeyMessage) ?? "";
}

function InlineKeyReimportControl({ connectionId, onImported }) {
  const inputRef = useRef(null);
  const [state, setState] = useState({
    processing: false,
    errorMessage: null,
    successMessage: null
  });

  async function handleFileSelection(event) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file || !connectionId) {
      return;
    }
    setState({
      processing: true,
      errorMessage: null,
      successMessage: null
    });
    try {
      const fileContent = await file.text();
      await importConnectionCredentialFile(connectionId, file.name, fileContent);
      await validateConnection(connectionId);
      await onImported?.();
      setState({
        processing: false,
        errorMessage: null,
        successMessage: "Key re-imported and connection validated."
      });
    } catch (error) {
      setState({
        processing: false,
        errorMessage: error?.message ?? "Failed to re-import the service-account key.",
        successMessage: null
      });
    }
  }

  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <Button
          variant="contained"
          size="small"
          disabled={!connectionId || state.processing}
          onClick={() => inputRef.current?.click()}
        >
          {state.processing ? "Re-importing..." : "Choose JSON Key File"}
        </Button>
        {state.processing ? <CircularProgress size={18} /> : null}
      </Stack>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          void handleFileSelection(event);
        }}
      />
      {state.errorMessage ? <Typography variant="body2" color="error.main">{state.errorMessage}</Typography> : null}
      {state.successMessage ? <Typography variant="body2" color="success.main">{state.successMessage}</Typography> : null}
    </Stack>
  );
}

function MissingStoredKeyGuidance({ connectionLabel, connectionId, onImported }) {
  return (
    <Alert severity="warning">
      <Stack spacing={1.25} sx={{ width: "100%", minWidth: 0 }}>
        <Typography variant="body2">
          Stored service-account key file is missing for {connectionLabel || "the selected remote"}.
          Re-import the same service-account JSON here before running the release pipeline.
        </Typography>
        <InlineKeyReimportControl connectionId={connectionId} onImported={onImported} />
      </Stack>
    </Alert>
  );
}

export function ProductDeploymentsView({ navigate = null }) {
  const [section, setSection] = useState("release");
  const workspace = useProductDeploymentsWorkspace();
  const missingStoredKeyMessage = resolveMissingStoredKeyMessage(workspace);
  const selectedConnectionLabel =
    workspace.releaseObservability.connection.message || workspace.releaseObservability.connection.connectionId;
  const selectedConnectionId = workspace.releaseObservability.connection.connectionId || "";

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
      {missingStoredKeyMessage ? (
        <MissingStoredKeyGuidance
          connectionLabel={selectedConnectionLabel}
          connectionId={selectedConnectionId}
          onImported={workspace.reload}
        />
      ) : null}
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

      <DeskSplitLayout
        sidebar={<DeploymentBundlesSidebar workspace={workspace} onOpenPages={() => openRoute("pages")} />}
        main={
          <>
            <DeskTabsCard
              value={section}
              onChange={setSection}
              tabs={[
                { value: "release", label: "Release" },
                { value: "inspect", label: "Inspect Output" },
                { value: "history", label: "History" },
                { value: "advanced", label: "Advanced" }
              ]}
            />

            {section === "release" ? (
              <Stack spacing={2}>
                <DeploymentPipelineReadinessCard
                  readiness={workspace.pipelineReadiness}
                  pipelineState={workspace.pipelineState}
                  onRunPipeline={workspace.runReleasePipeline}
                />
                <DeploymentBundleForecastCard
                  forecast={workspace.bundleForecast}
                  selectedPage={workspace.selectedPage}
                  runtimePreviewState={workspace.runtimePreviewState}
                  suppressMissingStoredKeyWarning={Boolean(missingStoredKeyMessage)}
                />
                <DeploymentBrowseLinksCard
                  selectedPage={workspace.selectedPage}
                  bundleForecast={workspace.bundleForecast}
                  runtimePreviewState={workspace.runtimePreviewState}
                  suppressMissingStoredKeyWarning={Boolean(missingStoredKeyMessage)}
                />
              </Stack>
            ) : null}

            {section === "inspect" ? (
              <Stack spacing={2}>
                <DeploymentBundleRuntimePreviewCard runtimePreviewState={workspace.runtimePreviewState} />
                <DeploymentReleaseObservabilityCard
                  observability={workspace.releaseObservability}
                  onAnalyzeCompatibility={workspace.analyzeReleaseCompatibility}
                />
              </Stack>
            ) : null}

            {section === "history" ? (
              <DeploymentReleaseHistoryCard
                selectedBundle={workspace.selectedBundle}
                runSummary={workspace.bundleRunSummary}
                runs={workspace.selectedBundleRuns}
              />
            ) : null}

            {section === "advanced" ? (
              <Stack spacing={2}>
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
                    <LocalHtmlDeploymentCard workspace={workspace} onOpenPages={() => openRoute("pages")} />

                    <TargetSection
                      title="Posts Projection"
                      target={workspace.projectionTarget}
                      latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.projectionTarget?.id ?? "")}
                      onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.projectionTarget?.id ?? "")}
                      onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.projectionTarget?.id ?? "")}
                      onOpen={() => openRoute("posts")}
                    />

                    <TargetSection
                      title="Categories Projection"
                      target={workspace.categoriesProjectionTarget}
                      latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.categoriesProjectionTarget?.id ?? "")}
                      onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.categoriesProjectionTarget?.id ?? "")}
                      onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.categoriesProjectionTarget?.id ?? "")}
                      onOpen={() => openRoute("taxonomies")}
                    />

                    <TargetSection
                      title="Tags Projection"
                      target={workspace.tagsProjectionTarget}
                      latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.tagsProjectionTarget?.id ?? "")}
                      onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.tagsProjectionTarget?.id ?? "")}
                      onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.tagsProjectionTarget?.id ?? "")}
                      onOpen={() => openRoute("taxonomies")}
                    />

                    <TargetSection
                      title="Media Sync"
                      target={workspace.mediaTarget}
                      latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.mediaTarget?.id ?? "")}
                      onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.mediaTarget?.id ?? "")}
                      onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.mediaTarget?.id ?? "")}
                      onOpen={() => openRoute("media")}
                    />

                    <TargetSection
                      title="Remote HTML Deployment"
                      target={workspace.deploymentTarget}
                      latestRun={workspace.remoteOpsSupport.getLatestRunForTarget(workspace.deploymentTarget?.id ?? "")}
                      onCompare={() => workspace.remoteOpsSupport.compareTarget(workspace.deploymentTarget?.id ?? "")}
                      onExecute={() => workspace.remoteOpsSupport.executeTarget(workspace.deploymentTarget?.id ?? "")}
                      onOpen={() => openRoute("pages")}
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
              </Stack>
            ) : null}

            {workspace.loading ? <Alert severity="info">Loading deployment workspace...</Alert> : null}
          </>
        }
      />
    </Stack>
  );
}
