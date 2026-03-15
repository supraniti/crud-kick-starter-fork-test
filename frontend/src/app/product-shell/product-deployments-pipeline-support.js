import { useCallback, useState } from "react";
import {
  runDeploymentBundleRelease,
  syncSelectedPageDeployment
} from "../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js";

function createDefaultPipelineState() {
  return {
    processing: false,
    currentLabel: "",
    errorMessage: null,
    successMessage: null,
    steps: []
  };
}

function createPipelineBlockedState() {
  return {
    processing: false,
    currentLabel: "",
    errorMessage:
      "Release pipeline requires a deployment bundle with a published page plus posts, categories, tags, media, and deployment targets.",
    successMessage: null,
    steps: []
  };
}

function normalizePipelineSteps(steps) {
  return (Array.isArray(steps) ? steps : []).map((step, index) => ({
    id: `${step?.key ?? step?.label ?? "step"}:${index}`,
    label: step?.label ?? step?.key ?? `Step ${index + 1}`,
    status: step?.status === "error" ? "error" : step?.status === "success" ? "success" : step?.status,
    message: step?.message ?? null
  }));
}

async function executeReleasePipeline({ selectedBundle, reloadAll, setPipelineState }) {
  const payload = await runDeploymentBundleRelease({
    bundleId: selectedBundle.id
  });
  await reloadAll();
  setPipelineState({
    processing: false,
    currentLabel: "",
    errorMessage: null,
    successMessage: payload?.message ?? "Release pipeline completed",
    steps: normalizePipelineSteps(payload?.run?.steps)
  });
}

export function useLocalDeploymentSync(reload, selectedPageId) {
  const [localSyncState, setLocalSyncState] = useState({
    processing: false,
    errorMessage: null,
    successMessage: null
  });

  const syncSelectedPage = useCallback(async () => {
    if (!selectedPageId) {
      return;
    }
    setLocalSyncState({
      processing: true,
      errorMessage: null,
      successMessage: null
    });
    try {
      const payload = await syncSelectedPageDeployment({ pageId: selectedPageId });
      await reload();
      setLocalSyncState({
        processing: false,
        errorMessage: null,
        successMessage: payload?.message ?? "Local deployment synced"
      });
    } catch (error) {
      setLocalSyncState({
        processing: false,
        errorMessage: error?.message ?? "Failed to sync local deployment",
        successMessage: null
      });
    }
  }, [reload, selectedPageId]);

  return {
    localSyncState,
    syncSelectedPage
  };
}

export function useReleasePipeline({
  selectedBundle,
  selectedPage,
  pipelineReadiness,
  reloadAll
}) {
  const [pipelineState, setPipelineState] = useState(createDefaultPipelineState);

  const runReleasePipeline = useCallback(async () => {
    if (!pipelineReadiness.canRun || !selectedPage?.id) {
      setPipelineState(createPipelineBlockedState());
      return;
    }

    setPipelineState({
      processing: true,
      currentLabel: "",
      errorMessage: null,
      successMessage: null,
      steps: []
    });

    try {
      await executeReleasePipeline({
        setPipelineState,
        selectedBundle,
        reloadAll
      });
    } catch (error) {
      await reloadAll();
      setPipelineState((previous) => ({
        ...previous,
        processing: false,
        currentLabel: "",
        errorMessage: error?.message ?? previous.errorMessage ?? "Release pipeline failed",
        successMessage: null
      }));
    }
  }, [
    pipelineReadiness.canRun,
    reloadAll,
    selectedBundle,
    selectedPage
  ]);

  return {
    pipelineState,
    runReleasePipeline
  };
}
