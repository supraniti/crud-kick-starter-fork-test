import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../api/reference.js";
import {
  fetchDeskPages as fetchPagesDeskItems,
  fetchDeliveryPayload as fetchPageDeliveryPayload,
  fetchPagePreviewSources as fetchPagePreviewSourceItems
} from "../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js";
import {
  createBundleDraft,
  createBundleDraftFromItem,
  createBundleMutationPayload,
  DEPLOYMENT_BUNDLES_COLLECTION_ID,
  sortDeploymentBundles
} from "./product-deployment-bundles.js";
import { validateDeploymentBundleDraft } from "./product-deployment-bundle-validation.js";
import {
  DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID,
  sortDeploymentBundleRuns
} from "./product-deployment-run-history.js";
import {
  useLocalDeploymentSync,
  useReleasePipeline
} from "./product-deployments-pipeline-support.js";
import {
  createDefaultBundleActionState,
  createDefaultWorkspaceState,
  createWorkspaceLoadFailureState,
  createWorkspaceStateFromLoad,
  useBundleAvailableTargetOptions,
  useDeploymentsSummary,
  useDeploymentTargets,
  usePipelineReadiness,
  useSelectedBundle,
  useSelectedBundleRuns
} from "./product-deployments-workspace-helpers.js";

const PAGES_COLLECTION_ID = "blog-pages";

function createRuntimePreviewState() {
  return {
    loading: false,
    errorMessage: null,
    payload: null,
    previewSource: null
  };
}

function isPerRecordPage(page) {
  return page?.deploymentMode === "per-record";
}

function resolveSinglePagePreviewSourceId(page) {
  const itemId = page?.primarySource?.itemId;
  return typeof itemId === "string" ? itemId : "";
}

async function loadRuntimePreview(selectedPage) {
  if (!selectedPage?.id) {
    return createRuntimePreviewState();
  }

  if (!isPerRecordPage(selectedPage)) {
    const payload = await fetchPageDeliveryPayload(selectedPage.id, resolveSinglePagePreviewSourceId(selectedPage));
    return {
      loading: false,
      errorMessage: null,
      payload,
      previewSource: null
    };
  }

  const previewSources = await fetchPagePreviewSourceItems(selectedPage.id);
  const previewSource = Array.isArray(previewSources) ? previewSources[0] ?? null : null;
  const payload = await fetchPageDeliveryPayload(selectedPage.id, previewSource?.id ?? "");
  return {
    loading: false,
    errorMessage: null,
    payload,
    previewSource
  };
}

function useBundleEditor(bundles, reload, publishedPages, targets, connectionById) {
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [isCreatingNewBundle, setIsCreatingNewBundle] = useState(false);
  const [bundleDraft, setBundleDraft] = useState(createBundleDraft);
  const [bundleActionState, setBundleActionState] = useState(createDefaultBundleActionState);
  const selectedBundle = useSelectedBundle(
    bundles,
    selectedBundleId,
    setSelectedBundleId,
    isCreatingNewBundle
  );

  useEffect(() => {
    if (isCreatingNewBundle) {
      setBundleDraft(createBundleDraft());
      return;
    }
    setBundleDraft(createBundleDraftFromItem(selectedBundle));
  }, [isCreatingNewBundle, selectedBundle]);

  const bundleValidation = useMemo(
    () =>
      validateDeploymentBundleDraft({
        draft: bundleDraft,
        publishedPages,
        targets,
        connectionById
      }),
    [bundleDraft, connectionById, publishedPages, targets]
  );

  const startNewBundle = useCallback(() => {
    setIsCreatingNewBundle(true);
    setSelectedBundleId("");
    setBundleDraft(createBundleDraft());
    setBundleActionState(createDefaultBundleActionState());
  }, []);

  const selectBundle = useCallback((bundleId) => {
    setIsCreatingNewBundle(false);
    setSelectedBundleId(bundleId);
    setBundleActionState(createDefaultBundleActionState());
  }, []);

  const changeBundleField = useCallback((fieldId, value) => {
    setBundleDraft((previous) => ({
      ...previous,
      [fieldId]: value
    }));
  }, []);

  const saveBundle = useCallback(async () => {
    if (!bundleValidation.canSave) {
      setBundleActionState({
        saving: false,
        errorMessage: bundleValidation.errorMessages[0] ?? "Deployment bundle is not valid yet.",
        successMessage: null
      });
      return;
    }

    setBundleActionState({
      saving: true,
      errorMessage: null,
      successMessage: null
    });
    try {
      const payload = createBundleMutationPayload(bundleDraft);
      const response = selectedBundleId
        ? await updateReferenceCollectionItem({
            collectionId: DEPLOYMENT_BUNDLES_COLLECTION_ID,
            itemId: selectedBundleId,
            item: payload
          })
        : await createReferenceCollectionItem({
            collectionId: DEPLOYMENT_BUNDLES_COLLECTION_ID,
            item: payload
          });
      if (!response?.ok) {
        throw new Error(response?.error?.message ?? "Failed to save deployment bundle");
      }
      await reload();
      setIsCreatingNewBundle(false);
      setSelectedBundleId(response.item?.id ?? "");
      setBundleActionState({
        saving: false,
        errorMessage: null,
        successMessage: selectedBundleId ? "Deployment bundle saved" : "Deployment bundle created"
      });
    } catch (error) {
      setBundleActionState({
        saving: false,
        errorMessage: error?.message ?? "Failed to save deployment bundle",
        successMessage: null
      });
    }
  }, [bundleDraft, bundleValidation.canSave, bundleValidation.errorMessages, reload, selectedBundleId]);

  return {
    selectedBundleId,
    selectedBundle,
    setSelectedBundleId: selectBundle,
    isCreatingNewBundle,
    bundleDraft,
    bundleActionState,
    bundleValidation,
    startNewBundle,
    changeBundleField,
    saveBundle
  };
}

export function useDeploymentWorkspaceLoad() {
  const [state, setState] = useState(() =>
    createDefaultWorkspaceState(sortDeploymentBundles, sortDeploymentBundleRuns)
  );

  const reload = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));
    try {
      const pagesPromise = fetchPagesDeskItems()
        .then((items) => ({ items }))
        .catch(() => fetchReferenceCollectionItems({ collectionId: PAGES_COLLECTION_ID, limit: 200 }));

      const [pagesPayload, bundlesPayload, runsPayload] = await Promise.all([
        pagesPromise,
        fetchReferenceCollectionItems({ collectionId: DEPLOYMENT_BUNDLES_COLLECTION_ID, limit: 200 }),
        fetchReferenceCollectionItems({ collectionId: DEPLOYMENT_BUNDLE_RUNS_COLLECTION_ID, limit: 200 })
      ]);

      setState(
        createWorkspaceStateFromLoad({
          pagesPayload,
          bundlesPayload,
          runsPayload,
          sortBundles: sortDeploymentBundles,
          sortRuns: sortDeploymentBundleRuns
        })
      );
    } catch (error) {
      setState(createWorkspaceLoadFailureState(error?.message ?? "Failed to load deployment workspace"));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    state,
    reload
  };
}

export function useDeploymentRuntimePreview(selectedPage) {
  const [state, setState] = useState(createRuntimePreviewState);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!selectedPage?.id) {
        setState(createRuntimePreviewState());
        return;
      }

      setState({
        loading: true,
        errorMessage: null,
        payload: null,
        previewSource: null
      });

      try {
        const nextState = await loadRuntimePreview(selectedPage);
        if (!active) {
          return;
        }
        setState(nextState);
      } catch (error) {
        if (!active) {
          return;
        }
        setState({
          loading: false,
          errorMessage: error?.message ?? "Failed to load runtime preview",
          payload: null,
          previewSource: null
        });
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [selectedPage?.deploymentMode, selectedPage?.id, selectedPage?.primarySource?.itemId]);

  return state;
}

export function useDeploymentBundleState(state, reload, remoteOpsSupport, remoteHealth) {
  const publishedPages = useMemo(
    () => state.pages.filter((page) => page?.status === "published"),
    [state.pages]
  );
  const bundleEditor = useBundleEditor(
    state.bundles,
    reload,
    publishedPages,
    remoteOpsSupport.supportState.targets,
    remoteHealth.connectionById
  );
  const availableTargetOptions = useBundleAvailableTargetOptions(
    remoteOpsSupport,
    remoteHealth,
    bundleEditor.bundleDraft
  );
  const selectedPage = useMemo(
    () => publishedPages.find((page) => page.id === bundleEditor.selectedBundle?.pageId) ?? null,
    [bundleEditor.selectedBundle?.pageId, publishedPages]
  );
  const targetStates = useDeploymentTargets(remoteOpsSupport, remoteHealth, bundleEditor.selectedBundle);
  const {
    projectionTargetState,
    categoriesProjectionTargetState,
    tagsProjectionTargetState,
    deploymentTargetState,
    browserTargetState,
    mediaTargetState,
    deploymentBindingSourceLabel,
    browserBindingSourceLabel
  } = targetStates;
  const { selectedRuns: selectedBundleRuns, summary: bundleRunSummary } = useSelectedBundleRuns(
    state.bundleRuns,
    bundleEditor.selectedBundle?.id ?? ""
  );
  const summary = useDeploymentsSummary(publishedPages, state.bundles, state.bundleRuns);
  const pipelineReadiness = usePipelineReadiness(bundleEditor, selectedPage, targetStates);

  return {
    publishedPages,
    bundleEditor,
    selectedPage,
    selectedBundleRuns,
    bundleRunSummary,
    projectionTargetState,
    categoriesProjectionTargetState,
    tagsProjectionTargetState,
    deploymentTargetState,
    browserTargetState,
    mediaTargetState,
    deploymentBindingSourceLabel,
    browserBindingSourceLabel,
    summary,
    pipelineReadiness,
    availableTargetOptions
  };
}

export function useDeploymentExecution({
  reload,
  remoteOpsSupport,
  bundleEditor,
  selectedPage,
  selectedBundleRuns,
  pipelineReadiness,
  projectionTargetState,
  categoriesProjectionTargetState,
  tagsProjectionTargetState,
  mediaTargetState,
  deploymentTargetState,
  browserTargetState
}) {
  const reloadAll = useCallback(async () => {
    await Promise.all([reload(), remoteOpsSupport.reload()]);
  }, [reload, remoteOpsSupport.reload]);
  const { localSyncState, syncSelectedPage } = useLocalDeploymentSync(reload, selectedPage?.id ?? "");
  const { pipelineState, runReleasePipeline } = useReleasePipeline({
    selectedBundle: bundleEditor.selectedBundle,
    selectedPage,
    selectedBundleRuns,
    pipelineReadiness,
    projectionTargetState,
    categoriesProjectionTargetState,
    tagsProjectionTargetState,
    mediaTargetState,
    deploymentTargetState,
    browserTargetState,
    reloadAll
  });

  return {
    localSyncState,
    syncSelectedPage,
    pipelineState,
    runReleasePipeline
  };
}
