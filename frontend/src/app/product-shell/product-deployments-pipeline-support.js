import { useCallback, useState } from "react";
import { syncSelectedPageDeployment } from "../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js";
import {
  compareTarget as compareRemoteTarget,
  executeTarget as executeRemoteTarget,
  validateTarget as validateRemoteTarget
} from "../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js";

function createDefaultPipelineState() {
  return {
    processing: false,
    currentLabel: "",
    errorMessage: null,
    successMessage: null,
    steps: []
  };
}

function createPipelineStep(label, status, message = null) {
  return {
    id: `${label}:${status}:${Date.now()}:${Math.random().toString(16).slice(2, 8)}`,
    label,
    status,
    message
  };
}

async function runPipelineTask(setPipelineState, label, task) {
  setPipelineState((previous) => ({
    ...previous,
    currentLabel: label
  }));
  try {
    const payload = await task();
    setPipelineState((previous) => ({
      ...previous,
      currentLabel: "",
      steps: [...previous.steps, createPipelineStep(label, "success", payload?.message ?? null)]
    }));
    return payload;
  } catch (error) {
    const message = error?.message ?? "Pipeline step failed";
    setPipelineState((previous) => ({
      ...previous,
      processing: false,
      currentLabel: "",
      errorMessage: message,
      steps: [...previous.steps, createPipelineStep(label, "error", message)]
    }));
    throw error;
  }
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
  selectedPageId,
  pipelineReadiness,
  projectionTargetState,
  categoriesProjectionTargetState,
  tagsProjectionTargetState,
  mediaTargetState,
  deploymentTargetState,
  browserTargetState,
  reloadAll
}) {
  const [pipelineState, setPipelineState] = useState(createDefaultPipelineState);

  const runReleasePipeline = useCallback(async () => {
    if (!pipelineReadiness.canRun || !selectedPageId) {
      setPipelineState({
        processing: false,
        currentLabel: "",
        errorMessage:
          "Release pipeline requires a deployment bundle with a published page plus posts, categories, tags, media, and deployment targets.",
        successMessage: null,
        steps: []
      });
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
      await runPipelineTask(setPipelineState, "Sync local HTML", () =>
        syncSelectedPageDeployment({ pageId: selectedPageId })
      );
      await runPipelineTask(setPipelineState, "Compare posts projection", () =>
        compareRemoteTarget(projectionTargetState.target.id)
      );
      await runPipelineTask(setPipelineState, "Sync posts projection", () =>
        executeRemoteTarget(projectionTargetState.target.id)
      );
      await runPipelineTask(setPipelineState, "Compare categories projection", () =>
        compareRemoteTarget(categoriesProjectionTargetState.target.id)
      );
      await runPipelineTask(setPipelineState, "Sync categories projection", () =>
        executeRemoteTarget(categoriesProjectionTargetState.target.id)
      );
      await runPipelineTask(setPipelineState, "Compare tags projection", () =>
        compareRemoteTarget(tagsProjectionTargetState.target.id)
      );
      await runPipelineTask(setPipelineState, "Sync tags projection", () =>
        executeRemoteTarget(tagsProjectionTargetState.target.id)
      );
      await runPipelineTask(setPipelineState, "Compare media sync", () =>
        compareRemoteTarget(mediaTargetState.target.id)
      );
      await runPipelineTask(setPipelineState, "Sync media", () =>
        executeRemoteTarget(mediaTargetState.target.id)
      );
      await runPipelineTask(setPipelineState, "Compare HTML deployment", () =>
        compareRemoteTarget(deploymentTargetState.target.id)
      );
      await runPipelineTask(setPipelineState, "Sync HTML deployment", () =>
        executeRemoteTarget(deploymentTargetState.target.id)
      );
      if (browserTargetState.state === "ready") {
        await runPipelineTask(setPipelineState, "Validate browser delivery", () =>
          validateRemoteTarget(browserTargetState.target.id)
        );
      }
      await reloadAll();
      setPipelineState((previous) => ({
        ...previous,
        processing: false,
        currentLabel: "",
        errorMessage: null,
        successMessage: selectedBundle?.title
          ? `Release pipeline completed for '${selectedBundle.title}'`
          : "Release pipeline completed"
      }));
    } catch {
      await reloadAll();
    }
  }, [
    browserTargetState,
    categoriesProjectionTargetState,
    deploymentTargetState,
    mediaTargetState,
    pipelineReadiness.canRun,
    projectionTargetState,
    tagsProjectionTargetState,
    reloadAll,
    selectedBundle?.title,
    selectedPageId
  ]);

  return {
    pipelineState,
    runReleasePipeline
  };
}
