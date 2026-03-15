import { useCallback, useState } from "react";
import {
  createReferenceCollectionItem,
  updateReferenceCollectionItem
} from "../../api/reference.js";
import { syncSelectedPageDeployment } from "../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js";
import {
  compareTarget as compareRemoteTarget,
  executeTarget as executeRemoteTarget,
  validateTarget as validateRemoteTarget
} from "../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js";
import {
  createBundleRunCreatePayload,
  createBundleRunUpdatePayload,
  createReleaseStepPlan,
  DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID,
  markRunStep
} from "./product-deployment-run-history.js";

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

async function persistRunUpdate(runRecord, steps, status, summaryMessage, finishedOn = "") {
  if (!runRecord?.id) {
    return runRecord;
  }
  const payload = createBundleRunUpdatePayload({
    previousRun: runRecord,
    steps,
    status,
    summaryMessage,
    finishedOn
  });
  const response = await updateReferenceCollectionItem({
    collectionId: DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID,
    itemId: runRecord.id,
    item: payload
  });
  return response?.ok && response.item ? response.item : { ...runRecord, ...payload };
}

function createReleaseTasks({
  selectedPage,
  projectionTargetState,
  categoriesProjectionTargetState,
  tagsProjectionTargetState,
  mediaTargetState,
  deploymentTargetState,
  browserTargetState
}) {
  const tasks = [
    {
      key: "sync-local-html",
      label: "Sync local HTML",
      run: () => syncSelectedPageDeployment({ pageId: selectedPage.id })
    },
    {
      key: "compare-posts-projection",
      label: "Compare posts projection",
      run: () => compareRemoteTarget(projectionTargetState.target.id)
    },
    {
      key: "sync-posts-projection",
      label: "Sync posts projection",
      run: () => executeRemoteTarget(projectionTargetState.target.id)
    },
    {
      key: "compare-categories-projection",
      label: "Compare categories projection",
      run: () => compareRemoteTarget(categoriesProjectionTargetState.target.id)
    },
    {
      key: "sync-categories-projection",
      label: "Sync categories projection",
      run: () => executeRemoteTarget(categoriesProjectionTargetState.target.id)
    },
    {
      key: "compare-tags-projection",
      label: "Compare tags projection",
      run: () => compareRemoteTarget(tagsProjectionTargetState.target.id)
    },
    {
      key: "sync-tags-projection",
      label: "Sync tags projection",
      run: () => executeRemoteTarget(tagsProjectionTargetState.target.id)
    },
    {
      key: "compare-media",
      label: "Compare media sync",
      run: () => compareRemoteTarget(mediaTargetState.target.id)
    },
    {
      key: "sync-media",
      label: "Sync media",
      run: () => executeRemoteTarget(mediaTargetState.target.id)
    },
    {
      key: "compare-html-deployment",
      label: "Compare HTML deployment",
      run: () => compareRemoteTarget(deploymentTargetState.target.id)
    },
    {
      key: "sync-html-deployment",
      label: "Sync HTML deployment",
      run: () => executeRemoteTarget(deploymentTargetState.target.id)
    }
  ];

  if (browserTargetState.state === "ready") {
    tasks.push({
      key: "validate-browser-delivery",
      label: "Validate browser delivery",
      run: () => validateRemoteTarget(browserTargetState.target.id)
    });
  }

  return tasks;
}

async function createRunRecord(selectedBundle, selectedPage, tasks) {
  const response = await createReferenceCollectionItem({
    collectionId: DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID,
    item: createBundleRunCreatePayload({
      bundle: selectedBundle,
      page: selectedPage,
      steps: createReleaseStepPlan(tasks.some((task) => task.key === "validate-browser-delivery")),
      startedOn: new Date().toISOString()
    })
  });
  if (!response?.ok || !response.item?.id) {
    throw new Error(response?.error?.message ?? "Failed to create deployment bundle run");
  }
  return response.item;
}

function createPersistedStepRunner(setPipelineState, initialRunRecord) {
  let runRecord = initialRunRecord;
  let persistedSteps = runRecord.steps ?? [];

  return {
    async run(task) {
      try {
        const payload = await runPipelineTask(setPipelineState, task.label, task.run);
        persistedSteps = markRunStep(
          persistedSteps,
          task.key,
          "success",
          payload?.message ?? "",
          new Date().toISOString()
        );
        runRecord = await persistRunUpdate(
          runRecord,
          persistedSteps,
          "running",
          "Release pipeline in progress"
        );
      } catch (error) {
        persistedSteps = markRunStep(
          persistedSteps,
          task.key,
          "error",
          error?.message ?? "Pipeline step failed",
          new Date().toISOString()
        );
        runRecord = await persistRunUpdate(
          runRecord,
          persistedSteps,
          "failed",
          error?.message ?? "Release pipeline failed",
          new Date().toISOString()
        );
        throw error;
      }
    },
    async complete(summaryMessage) {
      runRecord = await persistRunUpdate(
        runRecord,
        persistedSteps,
        "completed",
        summaryMessage,
        new Date().toISOString()
      );
      return runRecord;
    }
  };
}

async function executeReleasePipeline({
  setPipelineState,
  selectedBundle,
  selectedPage,
  projectionTargetState,
  categoriesProjectionTargetState,
  tagsProjectionTargetState,
  mediaTargetState,
  deploymentTargetState,
  browserTargetState,
  reloadAll
}) {
  const successMessage = selectedBundle?.title
    ? `Release pipeline completed for '${selectedBundle.title}'`
    : "Release pipeline completed";
  const tasks = createReleaseTasks({
    selectedPage,
    projectionTargetState,
    categoriesProjectionTargetState,
    tagsProjectionTargetState,
    mediaTargetState,
    deploymentTargetState,
    browserTargetState
  });

  const runRecord = await createRunRecord(selectedBundle, selectedPage, tasks);
  const persistedRunner = createPersistedStepRunner(setPipelineState, runRecord);

  for (const task of tasks) {
    await persistedRunner.run(task);
  }

  await persistedRunner.complete(successMessage);
  await reloadAll();
  setPipelineState((previous) => ({
    ...previous,
    processing: false,
    currentLabel: "",
    errorMessage: null,
    successMessage
  }));
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
        selectedPage,
        projectionTargetState,
        categoriesProjectionTargetState,
        tagsProjectionTargetState,
        mediaTargetState,
        deploymentTargetState,
        browserTargetState,
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
    browserTargetState,
    categoriesProjectionTargetState,
    deploymentTargetState,
    mediaTargetState,
    pipelineReadiness.canRun,
    projectionTargetState,
    reloadAll,
    selectedBundle,
    selectedPage,
    tagsProjectionTargetState
  ]);

  return {
    pipelineState,
    runReleasePipeline
  };
}
