import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../api/reference.js";
import {
  resolveSelectableTargets,
  resolveTargetBindingState
} from "./product-remote-health.js";
import {
  createBundleDraft,
  createBundleDraftFromItem,
  createBundleMutationPayload,
  DEPLOYMENT_BUNDLES_COLLECTION_ID,
  sortDeploymentBundles
} from "./product-deployment-bundles.js";
import {
  useLocalDeploymentSync,
  useReleasePipeline
} from "./product-deployments-pipeline-support.js";

const PAGES_COLLECTION_ID = "blog-pages";

function sortPages(pages = []) {
  return [...pages].sort((left, right) => `${left?.title ?? ""}`.localeCompare(`${right?.title ?? ""}`));
}

function createDefaultState() {
  return {
    loading: true,
    errorMessage: null,
    pages: [],
    bundles: []
  };
}

function createDefaultBundleActionState() {
  return {
    saving: false,
    errorMessage: null,
    successMessage: null
  };
}

function createStateFromLoad({ pagesPayload, bundlesPayload }) {
  return {
    loading: false,
    errorMessage: null,
    pages: sortPages(pagesPayload?.items ?? []),
    bundles: sortDeploymentBundles(bundlesPayload?.items ?? [])
  };
}

function createLoadFailureState(message) {
  return {
    loading: false,
    errorMessage: message,
    pages: [],
    bundles: []
  };
}

function useSelectedBundle(bundles, selectedBundleId, setSelectedBundleId, isCreatingNewBundle) {
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

function useDeploymentTargets(remoteOpsSupport, remoteHealth, selectedBundle) {
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

function createDeploymentsSummary(publishedPages, bundles) {
  return {
    bundleCount: bundles.length,
    publishedPages: publishedPages.length,
    syncedOutputs: publishedPages.reduce(
      (total, page) => total + Number(page?.deploymentSyncedCount ?? 0),
      0
    ),
    staleOutputs: publishedPages.reduce(
      (total, page) => total + Number(page?.deploymentStaleCount ?? 0),
      0
    ),
    missingOutputs: publishedPages.reduce(
      (total, page) => total + Number(page?.deploymentMissingCount ?? 0),
      0
    )
  };
}

function createReadinessItem(key, label, state, required, message) {
  return {
    key,
    label,
    state,
    required,
    message
  };
}

function resolveBrowserReadinessState(browserTargetState) {
  if (browserTargetState.state === "missing") {
    return {
      state: "optional",
      message: "No browser-delivery target selected."
    };
  }
  return {
    state: browserTargetState.state === "ready" ? "ready" : "blocked",
    message: browserTargetState.message
  };
}

function createPipelineReadiness({
  selectedBundle,
  selectedPage,
  projectionTargetState,
  categoriesProjectionTargetState,
  tagsProjectionTargetState,
  deploymentTargetState,
  mediaTargetState,
  browserTargetState
}) {
  const browserReadiness = resolveBrowserReadinessState(browserTargetState);
  const items = [
    createReadinessItem(
      "bundle",
      "Deployment bundle",
      selectedBundle ? "ready" : "missing",
      true,
      selectedBundle ? "Deployment bundle selected." : "Select or create a deployment bundle."
    ),
    createReadinessItem(
      "page",
      "Published page",
      selectedPage ? "ready" : "missing",
      true,
      selectedPage ? "Published page selected." : "Select a published page."
    ),
    createReadinessItem(
      "projection",
      "Posts projection",
      projectionTargetState.state === "ready" ? "ready" : projectionTargetState.state,
      true,
      projectionTargetState.message
    ),
    createReadinessItem(
      "categories-projection",
      "Categories projection",
      categoriesProjectionTargetState.state === "ready"
        ? "ready"
        : categoriesProjectionTargetState.state,
      true,
      categoriesProjectionTargetState.message
    ),
    createReadinessItem(
      "tags-projection",
      "Tags projection",
      tagsProjectionTargetState.state === "ready" ? "ready" : tagsProjectionTargetState.state,
      true,
      tagsProjectionTargetState.message
    ),
    createReadinessItem(
      "media",
      "Media sync",
      mediaTargetState.state === "ready" ? "ready" : mediaTargetState.state,
      true,
      mediaTargetState.message
    ),
    createReadinessItem(
      "deployment",
      "HTML deployment",
      deploymentTargetState.state === "ready" ? "ready" : deploymentTargetState.state,
      true,
      deploymentTargetState.message
    ),
    createReadinessItem(
      "browser",
      "Browser delivery",
      browserReadiness.state,
      false,
      browserReadiness.message
    )
  ];
  return {
    items,
    canRun: items.every(
      (item) =>
        item.state === "ready" ||
        (item.required !== true && item.state === "optional")
    )
  };
}

function useBundleEditor(bundles, reload) {
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
  }, [bundleDraft, reload, selectedBundleId]);

  return {
    selectedBundleId,
    selectedBundle,
    setSelectedBundleId: selectBundle,
    isCreatingNewBundle,
    bundleDraft,
    bundleActionState,
    startNewBundle,
    changeBundleField,
    saveBundle
  };
}

export function useDeploymentWorkspaceLoad() {
  const [state, setState] = useState(createDefaultState);

  const reload = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));
    try {
      const [pagesPayload, bundlesPayload] = await Promise.all([
        fetchReferenceCollectionItems({ collectionId: PAGES_COLLECTION_ID, limit: 200 }),
        fetchReferenceCollectionItems({ collectionId: DEPLOYMENT_BUNDLES_COLLECTION_ID, limit: 200 })
      ]);

      setState(createStateFromLoad({ pagesPayload, bundlesPayload }));
    } catch (error) {
      setState(createLoadFailureState(error?.message ?? "Failed to load deployment workspace"));
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

export function useDeploymentBundleState(state, reload, remoteOpsSupport, remoteHealth) {
  const publishedPages = useMemo(
    () => state.pages.filter((page) => page?.status === "published"),
    [state.pages]
  );
  const bundleEditor = useBundleEditor(state.bundles, reload);
  const availableTargetOptions = useMemo(
    () => ({
      postsProjectionTargets: selectProjectionTargets(
        remoteOpsSupport.supportState.targets,
        "published-blog-posts",
        bundleEditor.bundleDraft.postsProjectionTargetProfileId,
        remoteHealth.connectionById
      ),
      categoriesProjectionTargets: selectProjectionTargets(
        remoteOpsSupport.supportState.targets,
        "public-blog-categories",
        bundleEditor.bundleDraft.categoriesProjectionTargetProfileId,
        remoteHealth.connectionById
      ),
      tagsProjectionTargets: selectProjectionTargets(
        remoteOpsSupport.supportState.targets,
        "public-blog-tags",
        bundleEditor.bundleDraft.tagsProjectionTargetProfileId,
        remoteHealth.connectionById
      ),
      mediaTargets: selectTargetsByKind(
        remoteOpsSupport.supportState.targets,
        "media-storage",
        bundleEditor.bundleDraft.mediaTargetProfileId,
        remoteHealth.connectionById
      ),
      deploymentTargets: selectTargetsByKind(
        remoteOpsSupport.supportState.targets,
        "deployment-storage",
        bundleEditor.bundleDraft.deploymentTargetProfileId,
        remoteHealth.connectionById
      ),
      browserTargets: selectTargetsByKind(
        remoteOpsSupport.supportState.targets,
        "browser-delivery",
        bundleEditor.bundleDraft.browserDeliveryTargetProfileId,
        remoteHealth.connectionById
      )
    }),
    [
      bundleEditor.bundleDraft.browserDeliveryTargetProfileId,
      bundleEditor.bundleDraft.categoriesProjectionTargetProfileId,
      bundleEditor.bundleDraft.deploymentTargetProfileId,
      bundleEditor.bundleDraft.mediaTargetProfileId,
      bundleEditor.bundleDraft.postsProjectionTargetProfileId,
      bundleEditor.bundleDraft.tagsProjectionTargetProfileId,
      remoteHealth.connectionById,
      remoteOpsSupport.supportState.targets
    ]
  );
  const selectedPage = useMemo(
    () => publishedPages.find((page) => page.id === bundleEditor.selectedBundle?.pageId) ?? null,
    [bundleEditor.selectedBundle?.pageId, publishedPages]
  );
  const {
    projectionTargetState,
    categoriesProjectionTargetState,
    tagsProjectionTargetState,
    deploymentTargetState,
    browserTargetState,
    mediaTargetState,
    deploymentBindingSourceLabel,
    browserBindingSourceLabel
  } = useDeploymentTargets(remoteOpsSupport, remoteHealth, bundleEditor.selectedBundle);
  const summary = useMemo(
    () => createDeploymentsSummary(publishedPages, state.bundles),
    [publishedPages, state.bundles]
  );
  const pipelineReadiness = useMemo(
    () =>
      createPipelineReadiness({
        selectedBundle: bundleEditor.selectedBundle,
        selectedPage,
        projectionTargetState,
        categoriesProjectionTargetState,
        tagsProjectionTargetState,
        deploymentTargetState,
        mediaTargetState,
        browserTargetState
      }),
    [
      browserTargetState,
      categoriesProjectionTargetState,
      deploymentTargetState,
      mediaTargetState,
      projectionTargetState,
      bundleEditor.selectedBundle,
      selectedPage,
      tagsProjectionTargetState
    ]
  );

  return {
    publishedPages,
    bundleEditor,
    selectedPage,
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
    selectedPageId: selectedPage?.id ?? "",
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
