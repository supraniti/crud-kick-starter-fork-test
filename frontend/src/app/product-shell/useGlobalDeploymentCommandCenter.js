import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchReferenceCollectionItems,
  readReferenceMissionJob,
  startReferenceMissionJob
} from "../../api/reference.js";
import { fetchDeskPages as fetchPagesDeskItems } from "../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js";
import { PAGE_DEPLOYMENT_BUNDLE_RELEASE_MISSION_ID } from "../../../../modules/test-modules-pages/shared/deployment-bundle-release-shared.mjs";
import {
  DEPLOYMENT_BUNDLES_COLLECTION_ID,
  sortDeploymentBundles
} from "./product-deployment-bundles.js";
import {
  DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID,
  sortDeploymentBundleRuns
} from "./product-deployment-run-history.js";
import { announceDeploymentSyncCompleted } from "./deployment-command-center-events.js";
import {
  buildBundleSyncState,
  clearPersistedDeploymentRun,
  loadPersistedDeploymentRun,
  persistDeploymentRun
} from "./deployment-command-center-support.js";
import { TARGETS_COLLECTION_ID } from "../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js";

const RUN_POLL_MS = 600;
const RUN_TIMEOUT_MS = 300_000;

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createLoadState() {
  return {
    loading: true,
    errorMessage: null,
    bundles: [],
    bundleRuns: [],
    pages: [],
    targets: []
  };
}

function createRunState() {
  return {
    open: false,
    processing: false,
    mode: "",
    activeBundleId: "",
    activeBundleTitle: "",
    activeJobId: "",
    totalCount: 0,
    completedCount: 0,
    progressPercent: 0,
    activeStepCount: 0,
    activeStepIndex: 0,
    activeStepLabel: "",
    errorMessage: null,
    guidance: "",
    successMessage: null,
    currentLabel: "",
    bundleResults: []
  };
}

function normalizeBundleResult(bundle, status, message, run = null) {
  return {
    bundleId: bundle?.id ?? "",
    title: bundle?.title ?? "Untitled bundle",
    status,
    message: message ?? "",
    run
  };
}

function buildGuidance(message) {
  const normalized = typeof message === "string" ? message : "";
  if (normalized.includes("Stored service-account key file is missing")) {
    return "Open Remotes and re-import the service-account key before syncing again.";
  }
  if (normalized.includes("not validated")) {
    return "Open Remotes or Domains and validate the missing target before syncing again.";
  }
  if (normalized.includes("not found")) {
    return "Open Deployments and check that the selected bundle and targets still exist.";
  }
  if (normalized.includes("must stay published")) {
    return "Open Pages and publish the missing page before syncing again.";
  }
  if (normalized.includes("release-ready")) {
    return "Open Deployments and fix the release bundle contract before syncing again.";
  }
  if (normalized.includes("browser")) {
    return "Open Domains or Deployments and inspect browser-delivery validation before retrying.";
  }
  return "Open Deployments for the full release diagnostics before retrying.";
}

async function loadCommandCenterState() {
  const [pages, bundlesPayload, runsPayload, targetsPayload] = await Promise.all([
    fetchPagesDeskItems().catch(async () => {
      const pagesPayload = await fetchReferenceCollectionItems({
        collectionId: "blog-pages",
        limit: 500
      });
      return toArray(pagesPayload?.items);
    }),
    fetchReferenceCollectionItems({ collectionId: DEPLOYMENT_BUNDLES_COLLECTION_ID, limit: 200 }),
    fetchReferenceCollectionItems({ collectionId: DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID, limit: 200 }),
    fetchReferenceCollectionItems({ collectionId: TARGETS_COLLECTION_ID, limit: 500 })
  ]);

  return {
    loading: false,
    errorMessage: null,
    pages,
    bundles: sortDeploymentBundles(toArray(bundlesPayload?.items)),
    bundleRuns: sortDeploymentBundleRuns(toArray(runsPayload?.items)),
    targets: toArray(targetsPayload?.items)
  };
}

function resolveRunnableBundles(bundles = []) {
  return bundles.filter((bundle) => typeof bundle?.id === "string" && bundle.id.length > 0);
}

function resolveStatusLabel(status) {
  if (status === "running") {
    return "Running release steps on server…";
  }
  if (status === "succeeded") {
    return "Finalizing bundle result…";
  }
  if (status === "failed") {
    return "Sync failed.";
  }
  if (status === "cancelled") {
    return "Sync stopped.";
  }
  return "Queued on server…";
}

function createPersistedQueue(mode, bundles) {
  return {
    version: 1,
    status: "running",
    mode,
    queue: bundles.map((bundle) => ({
      id: bundle.id,
      title: bundle.title ?? "Untitled bundle"
    })),
    currentIndex: 0,
    activeJobId: "",
    currentLabel: "Queued on server…",
    bundleResults: [],
    errorMessage: null,
    guidance: "",
    successMessage: null
  };
}

function createRunStateFromPersisted(snapshot, overrides = {}) {
  const queue = toArray(snapshot?.queue);
  const currentIndex = Number(snapshot?.currentIndex ?? 0);
  const completedCount = Math.min(currentIndex, queue.length);
  const activeStepCount = Math.max(0, Number(snapshot?.activeStepCount ?? 0));
  const activeStepIndex = Math.max(0, Number(snapshot?.activeStepIndex ?? 0));
  const bundleProgress =
    queue.length > 0
      ? Math.min(
          1,
          (completedCount + (activeStepCount > 0 ? activeStepIndex / activeStepCount : 0)) / queue.length
        )
      : 0;
  return {
    open: true,
    processing: snapshot?.status === "running",
    mode: snapshot?.mode ?? "",
    activeBundleId: snapshot?.activeBundleId ?? "",
    activeBundleTitle: snapshot?.activeBundleTitle ?? "",
    activeJobId: snapshot?.activeJobId ?? "",
    totalCount: queue.length,
    completedCount,
    progressPercent: Math.round(bundleProgress * 100),
    activeStepCount,
    activeStepIndex,
    activeStepLabel: snapshot?.activeStepLabel ?? "",
    errorMessage: snapshot?.errorMessage ?? null,
    guidance: snapshot?.guidance ?? "",
    successMessage: snapshot?.successMessage ?? null,
    currentLabel: snapshot?.currentLabel ?? "",
    bundleResults: toArray(snapshot?.bundleResults),
    ...overrides
  };
}

function mergePersistedSnapshot(snapshot, patch) {
  return {
    ...snapshot,
    ...patch
  };
}

async function submitDeploymentBundleReleaseJob(bundleId) {
  const submitted = await startReferenceMissionJob({
    missionId: PAGE_DEPLOYMENT_BUNDLE_RELEASE_MISSION_ID,
    payload: {
      bundleId
    }
  });
  if (!submitted?.ok || !submitted?.job?.id) {
    throw new Error(submitted?.error?.message ?? "Failed to queue deployment bundle release");
  }
  return submitted.job.id;
}

async function waitForMissionJob(jobId, onStatus) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < RUN_TIMEOUT_MS) {
    const payload = await readReferenceMissionJob({ jobId });
    const job = payload?.job ?? null;
    const status = job?.status ?? "";
    onStatus?.({
      jobId,
      status,
      job
    });

    if (status === "succeeded") {
      return {
        ok: true,
        message: job?.result?.output?.message ?? "Sync completed.",
        run: job?.result?.output?.run ?? null,
        job
      };
    }
    if (status === "failed") {
      throw new Error(job?.error?.message ?? "Deployment bundle release mission failed");
    }
    if (status === "cancelled") {
      throw new Error("Deployment bundle release mission was cancelled");
    }

    await new Promise((resolve) => setTimeout(resolve, RUN_POLL_MS));
  }

  throw new Error("Timed out waiting for deployment bundle release mission");
}

function resolveLatestBundleRun(bundleRuns, bundleId, jobStartedAt = "") {
  const candidates = toArray(bundleRuns).filter((run) => run?.bundleId === bundleId);
  if (candidates.length === 0) {
    return null;
  }
  if (jobStartedAt) {
    const exact = candidates.find((run) => run?.startedOn === jobStartedAt);
    if (exact) {
      return exact;
    }
  }
  return candidates.sort((left, right) =>
    `${right?.startedOn ?? ""}`.localeCompare(`${left?.startedOn ?? ""}`)
  )[0] ?? null;
}

function extractRunStepProgress(run) {
  const steps = toArray(run?.steps);
  const stepCount = steps.length;
  const completedSteps = steps.filter((step) => step?.status === "success" || step?.status === "error").length;
  const nextPendingStep = steps.find((step) => step?.status === "pending") ?? null;
  const activeStepIndex = nextPendingStep ? Math.min(completedSteps + 1, stepCount) : stepCount;
  const activeStepLabel = nextPendingStep?.label ?? (stepCount > 0 ? "Finalizing release bundle…" : "");

  return {
    activeStepCount: stepCount,
    activeStepIndex,
    activeStepLabel
  };
}

export function useGlobalDeploymentCommandCenter() {
  const [state, setState] = useState(createLoadState);
  const [runState, setRunState] = useState(createRunState);
  const executionRef = useRef(false);

  const reload = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));
    try {
      const nextState = await loadCommandCenterState();
      setState(nextState);
      return nextState;
    } catch (error) {
      setState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load deployment command center.",
        bundles: [],
        bundleRuns: [],
        pages: [],
        targets: []
      });
      return null;
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const bundleSyncState = useMemo(
    () =>
      buildBundleSyncState({
        bundles: state.bundles,
        pages: state.pages,
        targets: state.targets
      }),
    [state.bundles, state.pages, state.targets]
  );

  const bundleOptions = useMemo(
    () =>
      resolveRunnableBundles(state.bundles).map((bundle) => ({
        ...bundle,
        syncState: bundleSyncState.byBundleId.get(bundle.id) ?? {
          canRun: true,
          needsSync: true,
          label: "Check state",
          detail: "Sync state is still loading."
        }
      })),
    [bundleSyncState.byBundleId, state.bundles]
  );

  const finalizeRun = useCallback(
    async (snapshot, success) => {
      await reload();
      if (success) {
        announceDeploymentSyncCompleted({
          mode: snapshot.mode,
          bundleIds: snapshot.queue.map((bundle) => bundle.id)
        });
      }
    },
    [reload]
  );

  const executePersistedQueue = useCallback(
    async (snapshotInput) => {
      if (executionRef.current) {
        return;
      }
      executionRef.current = true;
      let snapshot = snapshotInput;

      try {
        while (snapshot.status === "running" && snapshot.currentIndex < snapshot.queue.length) {
          const bundle = snapshot.queue[snapshot.currentIndex];
          let jobStartedAt = "";

          if (!snapshot.activeJobId) {
            const jobId = await submitDeploymentBundleReleaseJob(bundle.id);
            snapshot = mergePersistedSnapshot(snapshot, {
              activeJobId: jobId,
              activeBundleId: bundle.id,
              activeBundleTitle: bundle.title,
              currentLabel: "Queued on server…",
              activeStepCount: 0,
              activeStepIndex: 0,
              activeStepLabel: ""
            });
            persistDeploymentRun(snapshot);
            setRunState(createRunStateFromPersisted(snapshot));
          }

          const payload = await waitForMissionJob(snapshot.activeJobId, async ({ status, job }) => {
            const currentLabel = resolveStatusLabel(status);
            if (!jobStartedAt && typeof job?.createdAt === "string" && job.createdAt.length > 0) {
              jobStartedAt = job.createdAt;
            }
            let stepProgressPatch = {
              activeStepCount: snapshot.activeStepCount ?? 0,
              activeStepIndex: snapshot.activeStepIndex ?? 0,
              activeStepLabel: snapshot.activeStepLabel ?? ""
            };
            try {
              const runsPayload = await fetchReferenceCollectionItems({
                collectionId: DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID,
                limit: 200
              });
              const latestRun = resolveLatestBundleRun(runsPayload?.items, bundle.id, jobStartedAt);
              if (latestRun) {
                stepProgressPatch = extractRunStepProgress(latestRun);
              }
            } catch {
              // Keep mission polling resilient even if run-history refresh fails.
            }
            snapshot = mergePersistedSnapshot(snapshot, {
              currentLabel,
              ...stepProgressPatch
            });
            persistDeploymentRun(snapshot);
            setRunState((previous) => ({
              ...previous,
              processing: true,
              currentLabel,
              activeJobId: snapshot.activeJobId,
              activeBundleId: bundle.id,
              activeBundleTitle: bundle.title,
              activeStepCount: stepProgressPatch.activeStepCount,
              activeStepIndex: stepProgressPatch.activeStepIndex,
              activeStepLabel: stepProgressPatch.activeStepLabel
            }));
          });

          const bundleResults = [
            ...toArray(snapshot.bundleResults),
            normalizeBundleResult(bundle, "success", payload?.message ?? "Sync completed.", payload?.run ?? null)
          ];
          snapshot = mergePersistedSnapshot(snapshot, {
            currentIndex: snapshot.currentIndex + 1,
            activeJobId: "",
            activeBundleId: "",
            activeBundleTitle: "",
            activeStepCount: 0,
            activeStepIndex: 0,
            activeStepLabel: "",
            currentLabel:
              snapshot.currentIndex + 1 < snapshot.queue.length
                ? "Queued on server…"
                : "All selected bundles finished.",
            bundleResults
          });
          persistDeploymentRun(snapshot);
          setRunState(createRunStateFromPersisted(snapshot));
        }

        snapshot = mergePersistedSnapshot(snapshot, {
          status: "completed",
          successMessage:
            snapshot.mode === "all"
              ? "All deployment bundles are now in sync with local state."
              : `${snapshot.queue[0]?.title ?? "Bundle"} synced successfully.`,
          currentLabel: "Sync finished."
        });
        persistDeploymentRun(snapshot);
        await finalizeRun(snapshot, true);
        clearPersistedDeploymentRun();
        setRunState(
          createRunStateFromPersisted(snapshot, {
            processing: false,
            progressPercent: 100,
            completedCount: snapshot.queue.length
          })
        );
      } catch (error) {
        const activeBundle = snapshot.queue[snapshot.currentIndex] ?? {
          id: snapshot.activeBundleId,
          title: snapshot.activeBundleTitle
        };
        const errorMessage = error?.message ?? "Deployment sync failed.";
        const failedSnapshot = mergePersistedSnapshot(snapshot, {
          status: "failed",
          errorMessage,
          guidance: buildGuidance(errorMessage),
          currentLabel: "Sync stopped.",
          bundleResults: [
            ...toArray(snapshot.bundleResults),
            normalizeBundleResult(activeBundle, "error", errorMessage)
          ]
        });
        persistDeploymentRun(failedSnapshot);
        await finalizeRun(failedSnapshot, false);
        clearPersistedDeploymentRun();
        setRunState(
          createRunStateFromPersisted(failedSnapshot, {
            processing: false
          })
        );
      } finally {
        executionRef.current = false;
      }
    },
    [finalizeRun]
  );

  useEffect(() => {
    const persisted = loadPersistedDeploymentRun();
    if (!persisted || persisted.status !== "running") {
      return;
    }
    setRunState(createRunStateFromPersisted(persisted));
    void executePersistedQueue(persisted);
  }, [executePersistedQueue]);

  const showMessageState = useCallback((patch) => {
    clearPersistedDeploymentRun();
    setRunState({
      open: true,
      processing: false,
      mode: patch.mode ?? "",
      activeBundleId: "",
      activeBundleTitle: "",
          activeJobId: "",
          totalCount: patch.totalCount ?? 0,
          completedCount: patch.completedCount ?? 0,
          progressPercent: patch.progressPercent ?? 0,
          activeStepCount: patch.activeStepCount ?? 0,
          activeStepIndex: patch.activeStepIndex ?? 0,
          activeStepLabel: patch.activeStepLabel ?? "",
          errorMessage: patch.errorMessage ?? null,
      guidance: patch.guidance ?? "",
      successMessage: patch.successMessage ?? null,
      currentLabel: patch.currentLabel ?? "",
      bundleResults: toArray(patch.bundleResults)
    });
  }, []);

  const runBundles = useCallback(
    async (mode, bundlesToRun) => {
      const runnableBundles = resolveRunnableBundles(bundlesToRun).filter(
        (bundle) => bundle?.syncState?.canRun && bundle?.syncState?.needsSync
      );

      if (runnableBundles.length === 0) {
        const hasDisabledCurrent =
          resolveRunnableBundles(bundlesToRun).some(
            (bundle) => bundle?.syncState?.needsSync === false && bundle?.syncState?.canRun === false
          ) || bundleOptions.every((bundle) => bundle.syncState?.label === "Current");
        showMessageState({
          mode,
          successMessage: hasDisabledCurrent
            ? "Everything already matches deployed state."
            : null,
          errorMessage: hasDisabledCurrent ? null : "No deployment bundles are available yet.",
          guidance: hasDisabledCurrent ? "" : "Open Deployments and create at least one release bundle.",
          currentLabel: hasDisabledCurrent ? "Nothing to sync." : "",
          bundleResults: []
        });
        return;
      }

      const snapshot = createPersistedQueue(mode, runnableBundles);
      persistDeploymentRun(snapshot);
      setRunState(createRunStateFromPersisted(snapshot));
      void executePersistedQueue(snapshot);
    },
    [bundleOptions, executePersistedQueue, showMessageState]
  );

  const runSyncAll = useCallback(async () => {
    await runBundles("all", bundleOptions);
  }, [bundleOptions, runBundles]);

  const runSyncBundle = useCallback(
    async (bundleId) => {
      const bundle = bundleOptions.find((item) => item.id === bundleId) ?? null;
      await runBundles("bundle", bundle ? [bundle] : []);
    },
    [bundleOptions, runBundles]
  );

  const closeRunState = useCallback(() => {
    setRunState((previous) => ({
      ...previous,
      open: false
    }));
  }, []);

  const openRunState = useCallback(() => {
    setRunState((previous) => ({
      ...previous,
      open: true
    }));
  }, []);

  return {
    state,
    bundleOptions,
    bundleSyncState,
    runState,
    reload,
    closeRunState,
    openRunState,
    runSyncAll,
    runSyncBundle
  };
}
