import { useEffect, useMemo } from "react";
import {
  resolveSelectableTargets,
  resolveTargetBindingState
} from "./product-remote-health.js";
import {
  createBundleRunSummary,
  createDeploymentsSummary,
  createPipelineReadiness
} from "./product-deployments-metrics.js";
import { createDeploymentBundleForecast } from "./product-deployment-forecast.js";

export function sortPages(pages = []) {
  return [...pages].sort((left, right) => `${left?.title ?? ""}`.localeCompare(`${right?.title ?? ""}`));
}

export function createDefaultWorkspaceState(sortBundles, sortRuns) {
  return {
    loading: true,
    errorMessage: null,
    pages: [],
    bundles: sortBundles([]),
    bundleRuns: sortRuns([])
  };
}

export function createDefaultBundleActionState() {
  return {
    saving: false,
    errorMessage: null,
    successMessage: null
  };
}

export function createWorkspaceStateFromLoad({ pagesPayload, bundlesPayload, runsPayload, sortBundles, sortRuns }) {
  return {
    loading: false,
    errorMessage: null,
    pages: sortPages(pagesPayload?.items ?? []),
    bundles: sortBundles(bundlesPayload?.items ?? []),
    bundleRuns: sortRuns(runsPayload?.items ?? [])
  };
}

export function createWorkspaceLoadFailureState(message) {
  return {
    loading: false,
    errorMessage: message,
    pages: [],
    bundles: [],
    bundleRuns: []
  };
}

export function useSelectedBundle(bundles, selectedBundleId, setSelectedBundleId, isCreatingNewBundle) {
  useEffect(() => {
    if (isCreatingNewBundle) {
      return;
    }
    if (bundles.length === 0) {
      if (selectedBundleId) {
        setSelectedBundleId("");
      }
      return;
    }
    if (bundles.some((bundle) => bundle.id === selectedBundleId)) {
      return;
    }
    setSelectedBundleId(bundles[0].id);
  }, [bundles, isCreatingNewBundle, selectedBundleId, setSelectedBundleId]);

  return useMemo(
    () => bundles.find((bundle) => bundle.id === selectedBundleId) ?? null,
    [bundles, selectedBundleId]
  );
}

function resolveBundleTargetId(selectedBundle, fieldId) {
  const value = selectedBundle?.[fieldId];
  return typeof value === "string" ? value : "";
}

function selectProjectionTargets(targets, projectionScope, selectedTargetId, connectionById) {
  return resolveSelectableTargets(
    (Array.isArray(targets) ? targets : []).filter(
      (target) =>
        target?.targetKind === "firestore-projection" &&
        target?.config?.projectionScope === projectionScope
    ),
    selectedTargetId,
    connectionById,
    targets
  );
}

function selectTargetsByKind(targets, targetKind, selectedTargetId, connectionById) {
  return resolveSelectableTargets(
    (Array.isArray(targets) ? targets : []).filter((target) => target?.targetKind === targetKind),
    selectedTargetId,
    connectionById,
    targets
  );
}

export function useDeploymentTargets(remoteOpsSupport, remoteHealth, selectedBundle) {
  const allTargets = remoteOpsSupport.supportState.targets;
  return {
    projectionTargetState: resolveTargetBindingState(
      resolveBundleTargetId(selectedBundle, "postsProjectionTargetProfileId"),
      allTargets,
      remoteHealth.connectionById
    ),
    categoriesProjectionTargetState: resolveTargetBindingState(
      resolveBundleTargetId(selectedBundle, "categoriesProjectionTargetProfileId"),
      allTargets,
      remoteHealth.connectionById
    ),
    tagsProjectionTargetState: resolveTargetBindingState(
      resolveBundleTargetId(selectedBundle, "tagsProjectionTargetProfileId"),
      allTargets,
      remoteHealth.connectionById
    ),
    deploymentTargetState: resolveTargetBindingState(
      resolveBundleTargetId(selectedBundle, "deploymentTargetProfileId"),
      allTargets,
      remoteHealth.connectionById
    ),
    browserTargetState: resolveTargetBindingState(
      resolveBundleTargetId(selectedBundle, "browserDeliveryTargetProfileId"),
      allTargets,
      remoteHealth.connectionById
    ),
    mediaTargetState: resolveTargetBindingState(
      resolveBundleTargetId(selectedBundle, "mediaTargetProfileId"),
      allTargets,
      remoteHealth.connectionById
    ),
    deploymentBindingSourceLabel: selectedBundle ? "Deployment bundle" : null,
    browserBindingSourceLabel: selectedBundle ? "Deployment bundle" : null
  };
}

export function useBundleAvailableTargetOptions(remoteOpsSupport, remoteHealth, bundleDraft) {
  return useMemo(
    () => ({
      postsProjectionTargets: selectProjectionTargets(
        remoteOpsSupport.supportState.targets,
        "published-blog-posts",
        bundleDraft.postsProjectionTargetProfileId,
        remoteHealth.connectionById
      ),
      categoriesProjectionTargets: selectProjectionTargets(
        remoteOpsSupport.supportState.targets,
        "public-blog-categories",
        bundleDraft.categoriesProjectionTargetProfileId,
        remoteHealth.connectionById
      ),
      tagsProjectionTargets: selectProjectionTargets(
        remoteOpsSupport.supportState.targets,
        "public-blog-tags",
        bundleDraft.tagsProjectionTargetProfileId,
        remoteHealth.connectionById
      ),
      mediaTargets: selectTargetsByKind(
        remoteOpsSupport.supportState.targets,
        "media-storage",
        bundleDraft.mediaTargetProfileId,
        remoteHealth.connectionById
      ),
      deploymentTargets: selectTargetsByKind(
        remoteOpsSupport.supportState.targets,
        "deployment-storage",
        bundleDraft.deploymentTargetProfileId,
        remoteHealth.connectionById
      ),
      browserTargets: selectTargetsByKind(
        remoteOpsSupport.supportState.targets,
        "browser-delivery",
        bundleDraft.browserDeliveryTargetProfileId,
        remoteHealth.connectionById
      )
    }),
    [
      bundleDraft.browserDeliveryTargetProfileId,
      bundleDraft.categoriesProjectionTargetProfileId,
      bundleDraft.deploymentTargetProfileId,
      bundleDraft.mediaTargetProfileId,
      bundleDraft.postsProjectionTargetProfileId,
      bundleDraft.tagsProjectionTargetProfileId,
      remoteHealth.connectionById,
      remoteOpsSupport.supportState.targets
    ]
  );
}

export function useSelectedBundleRuns(bundleRuns, bundleId) {
  const selectedRuns = useMemo(
    () => (Array.isArray(bundleRuns) ? bundleRuns.filter((run) => run?.bundleId === bundleId) : []),
    [bundleId, bundleRuns]
  );
  const summary = useMemo(() => createBundleRunSummary(selectedRuns), [selectedRuns]);
  return {
    selectedRuns,
    summary
  };
}

export function useDeploymentsSummary(publishedPages, bundles, bundleRuns) {
  return useMemo(
    () => createDeploymentsSummary(publishedPages, bundles, bundleRuns),
    [publishedPages, bundles, bundleRuns]
  );
}

export function usePipelineReadiness(bundleEditor, selectedPage, targetStates) {
  return useMemo(
    () =>
      createPipelineReadiness({
        selectedBundle: bundleEditor.selectedBundle,
        selectedPage,
        bundleValidation: bundleEditor.bundleValidation,
        projectionTargetState: targetStates.projectionTargetState,
        categoriesProjectionTargetState: targetStates.categoriesProjectionTargetState,
        tagsProjectionTargetState: targetStates.tagsProjectionTargetState,
        deploymentTargetState: targetStates.deploymentTargetState,
        mediaTargetState: targetStates.mediaTargetState,
        browserTargetState: targetStates.browserTargetState
      }),
    [
      bundleEditor.bundleValidation,
      bundleEditor.selectedBundle,
      selectedPage,
      targetStates.browserTargetState,
      targetStates.categoriesProjectionTargetState,
      targetStates.deploymentTargetState,
      targetStates.mediaTargetState,
      targetStates.projectionTargetState,
      targetStates.tagsProjectionTargetState
    ]
  );
}

export function useDeploymentBundleForecast(selectedBundle, selectedPage, targetStates) {
  return useMemo(
    () =>
      createDeploymentBundleForecast({
        selectedBundle,
        selectedPage,
        deploymentTargetState: targetStates.deploymentTargetState,
        browserTargetState: targetStates.browserTargetState,
        mediaTargetState: targetStates.mediaTargetState
      }),
    [
      selectedBundle,
      selectedPage,
      targetStates.browserTargetState,
      targetStates.deploymentTargetState,
      targetStates.mediaTargetState
    ]
  );
}
