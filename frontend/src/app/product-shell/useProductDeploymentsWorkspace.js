import { useCallback, useMemo } from "react";
import { useEmbeddedRemoteOpsSupport } from "../../../../modules/test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";
import { createProductRemoteHealth } from "./product-remote-health.js";
import { createDeploymentReleaseObservability } from "./product-deployment-release-observability.js";
import { useDeploymentBundleForecast } from "./product-deployments-workspace-helpers.js";
import {
  useDeploymentBundleState,
  useDeploymentExecution,
  useDeploymentRuntimePreview,
  useDeploymentWorkspaceLoad
} from "./product-deployments-workspace-support.js";

export function useProductDeploymentsWorkspace() {
  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const { state, reload } = useDeploymentWorkspaceLoad();
  const remoteHealth = useMemo(
    () => createProductRemoteHealth(remoteOpsSupport.supportState),
    [remoteOpsSupport.supportState]
  );
  const bundleState = useDeploymentBundleState(state, reload, remoteOpsSupport, remoteHealth);
  const executionState = useDeploymentExecution({
    reload,
    remoteOpsSupport,
    bundleEditor: bundleState.bundleEditor,
    selectedPage: bundleState.selectedPage,
    pipelineReadiness: bundleState.pipelineReadiness,
    projectionTargetState: bundleState.projectionTargetState,
    categoriesProjectionTargetState: bundleState.categoriesProjectionTargetState,
    tagsProjectionTargetState: bundleState.tagsProjectionTargetState,
    mediaTargetState: bundleState.mediaTargetState,
    deploymentTargetState: bundleState.deploymentTargetState,
    browserTargetState: bundleState.browserTargetState
  });
  const releaseObservability = useMemo(
    () =>
      createDeploymentReleaseObservability({
        selectedBundle: bundleState.bundleEditor.selectedBundle,
        selectedPage: bundleState.selectedPage,
        projectionTargetState: bundleState.projectionTargetState,
        categoriesProjectionTargetState: bundleState.categoriesProjectionTargetState,
        tagsProjectionTargetState: bundleState.tagsProjectionTargetState,
        mediaTargetState: bundleState.mediaTargetState,
        deploymentTargetState: bundleState.deploymentTargetState,
        browserTargetState: bundleState.browserTargetState,
        remoteOpsSupport
      }),
    [
      bundleState.browserTargetState,
      bundleState.bundleEditor.selectedBundle,
      bundleState.categoriesProjectionTargetState,
      bundleState.deploymentTargetState,
      bundleState.mediaTargetState,
      bundleState.projectionTargetState,
      bundleState.selectedPage,
      bundleState.tagsProjectionTargetState,
      remoteOpsSupport
    ]
  );
  const bundleForecast = useDeploymentBundleForecast(
    bundleState.bundleEditor.selectedBundle,
    bundleState.selectedPage,
    {
      deploymentTargetState: bundleState.deploymentTargetState,
      browserTargetState: bundleState.browserTargetState,
      mediaTargetState: bundleState.mediaTargetState
    }
  );
  const runtimePreviewState = useDeploymentRuntimePreview(bundleState.selectedPage);
  const reloadWorkspace = useCallback(async () => {
    await Promise.all([reload(), remoteOpsSupport.reload()]);
  }, [reload, remoteOpsSupport]);
  const analyzeReleaseCompatibility = useCallback(async () => {
    const connectionId = releaseObservability.connection.connectionId;
    if (!connectionId) {
      return null;
    }
    return remoteOpsSupport.analyzeConnection(connectionId);
  }, [releaseObservability.connection.connectionId, remoteOpsSupport]);

  return {
    loading: state.loading,
    errorMessage: state.errorMessage,
    bundles: state.bundles,
    publishedPages: bundleState.publishedPages,
    selectedBundleId: bundleState.bundleEditor.selectedBundleId,
    selectedBundle: bundleState.bundleEditor.selectedBundle,
    setSelectedBundleId: bundleState.bundleEditor.setSelectedBundleId,
    isCreatingNewBundle: bundleState.bundleEditor.isCreatingNewBundle,
    bundleDraft: bundleState.bundleEditor.bundleDraft,
    bundleActionState: bundleState.bundleEditor.bundleActionState,
    bundleValidation: bundleState.bundleEditor.bundleValidation,
    startNewBundle: bundleState.bundleEditor.startNewBundle,
    changeBundleField: bundleState.bundleEditor.changeBundleField,
    saveBundle: bundleState.bundleEditor.saveBundle,
    selectedPage: bundleState.selectedPage,
    selectedBundleRuns: bundleState.selectedBundleRuns,
    bundleRunSummary: bundleState.bundleRunSummary,
    bundleForecast,
    runtimePreviewState,
    releaseObservability,
    localSyncState: executionState.localSyncState,
    pipelineState: executionState.pipelineState,
    pipelineReadiness: bundleState.pipelineReadiness,
    remoteHealth,
    summary: bundleState.summary,
    projectionTarget: bundleState.projectionTargetState.target,
    categoriesProjectionTarget: bundleState.categoriesProjectionTargetState.target,
    tagsProjectionTarget: bundleState.tagsProjectionTargetState.target,
    deploymentTarget: bundleState.deploymentTargetState.target,
    browserTarget: bundleState.browserTargetState.target,
    mediaTarget: bundleState.mediaTargetState.target,
    projectionTargetState: bundleState.projectionTargetState,
    categoriesProjectionTargetState: bundleState.categoriesProjectionTargetState,
    tagsProjectionTargetState: bundleState.tagsProjectionTargetState,
    deploymentTargetState: bundleState.deploymentTargetState,
    browserTargetState: bundleState.browserTargetState,
    mediaTargetState: bundleState.mediaTargetState,
    deploymentBindingSourceLabel: bundleState.deploymentBindingSourceLabel,
    browserBindingSourceLabel: bundleState.browserBindingSourceLabel,
    availablePages: bundleState.publishedPages,
    availableTargetOptions: bundleState.availableTargetOptions,
    remoteOpsSupport,
    syncSelectedPage: executionState.syncSelectedPage,
    runReleasePipeline: executionState.runReleasePipeline,
    analyzeReleaseCompatibility,
    reload: reloadWorkspace
  };
}
