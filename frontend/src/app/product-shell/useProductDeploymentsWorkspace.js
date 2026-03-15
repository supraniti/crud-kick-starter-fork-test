import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchReferenceCollectionItems,
  readReferenceModuleSettings
} from "../../api/reference.js";
import { useEmbeddedRemoteOpsSupport } from "../../../../modules/test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";
import { syncSelectedPageDeployment } from "../../../../modules/test-modules-pages/frontend/blog-distribution-workspace-support.js";
import {
  compareTarget as compareRemoteTarget,
  executeTarget as executeRemoteTarget,
  validateTarget as validateRemoteTarget
} from "../../../../modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js";
import {
  createProductRemoteHealth,
  resolveTargetBindingState
} from "./product-remote-health.js";

const PAGES_COLLECTION_ID = "blog-pages";

async function readModuleSettingsValues(moduleId) {
  const payload = await readReferenceModuleSettings({ moduleId });
  if (!payload?.ok) {
    throw new Error(payload?.error?.message ?? `Failed to read settings for '${moduleId}'`);
  }
  return payload?.settings?.values ?? {};
}

function sortPages(pages = []) {
  return [...pages].sort((left, right) => `${left?.title ?? ""}`.localeCompare(`${right?.title ?? ""}`));
}

function createDefaultState() {
  return {
    loading: true,
    errorMessage: null,
    pages: [],
    settings: {
      posts: {},
      taxonomies: {},
      pages: {},
      media: {}
    }
  };
}

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

function createStateFromLoad({ pagesPayload, postsSettings, taxonomySettings, pagesSettings, mediaSettings }) {
  return {
    loading: false,
    errorMessage: null,
    pages: sortPages(pagesPayload?.items ?? []),
    settings: {
      posts: postsSettings,
      taxonomies: taxonomySettings,
      pages: pagesSettings,
      media: mediaSettings
    }
  };
}

function createLoadFailureState(message) {
  return {
    loading: false,
    errorMessage: message,
    pages: [],
    settings: {
      posts: {},
      taxonomies: {},
      pages: {},
      media: {}
    }
  };
}

function useSelectedPublishedPage(publishedPages, selectedPageId, setSelectedPageId) {
  useEffect(() => {
    if (publishedPages.length === 0) {
      if (selectedPageId) {
        setSelectedPageId("");
      }
      return;
    }
    if (publishedPages.some((page) => page.id === selectedPageId)) {
      return;
    }
    setSelectedPageId(publishedPages[0].id);
  }, [publishedPages, selectedPageId, setSelectedPageId]);

  return useMemo(
    () => publishedPages.find((page) => page.id === selectedPageId) ?? null,
    [publishedPages, selectedPageId]
  );
}

function useDeploymentTargets(remoteOpsSupport, settings, remoteHealth) {
  const allTargets = remoteOpsSupport.supportState.targets;
  return {
    projectionTargetState: resolveTargetBindingState(
      settings.posts?.remoteProjectionTargetProfileId ?? "",
      allTargets,
      remoteHealth.connectionById
    ),
    categoriesProjectionTargetState: resolveTargetBindingState(
      settings.taxonomies?.remoteCategoriesProjectionTargetProfileId ?? "",
      allTargets,
      remoteHealth.connectionById
    ),
    tagsProjectionTargetState: resolveTargetBindingState(
      settings.taxonomies?.remoteTagsProjectionTargetProfileId ?? "",
      allTargets,
      remoteHealth.connectionById
    ),
    deploymentTargetState: resolveTargetBindingState(
      settings.pages?.remoteDeploymentTargetProfileId ?? "",
      allTargets,
      remoteHealth.connectionById
    ),
    browserTargetState: resolveTargetBindingState(
      settings.pages?.remoteBrowserDeliveryTargetProfileId ?? "",
      allTargets,
      remoteHealth.connectionById
    ),
    mediaTargetState: resolveTargetBindingState(
      settings.media?.remoteMediaTargetProfileId ?? "",
      allTargets,
      remoteHealth.connectionById
    )
  };
}

function createPublishedPagesSummary(publishedPages) {
  return {
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

function useLocalDeploymentSync(reload, selectedPageId) {
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

function useReleasePipeline({
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
          "Release pipeline requires a published page plus posts, categories, tags, media, and deployment targets.",
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
        successMessage: "Release pipeline completed"
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
    selectedPageId
  ]);

  return {
    pipelineState,
    runReleasePipeline
  };
}

export function useProductDeploymentsWorkspace() {
  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const [state, setState] = useState(createDefaultState);
  const [selectedPageId, setSelectedPageId] = useState("");
  const remoteHealth = useMemo(
    () => createProductRemoteHealth(remoteOpsSupport.supportState),
    [remoteOpsSupport.supportState]
  );

  const reload = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));
    try {
      const [pagesPayload, postsSettings, taxonomySettings, pagesSettings, mediaSettings] = await Promise.all([
        fetchReferenceCollectionItems({ collectionId: PAGES_COLLECTION_ID, limit: 200 }),
        readModuleSettingsValues("test-modules-content"),
        readModuleSettingsValues("test-modules-taxonomy"),
        readModuleSettingsValues("test-modules-pages"),
        readModuleSettingsValues("test-modules-media-manager")
      ]);

      setState(createStateFromLoad({
        pagesPayload,
        postsSettings,
        taxonomySettings,
        pagesSettings,
        mediaSettings
      }));
    } catch (error) {
      setState(createLoadFailureState(error?.message ?? "Failed to load deployment workspace"));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const publishedPages = useMemo(
    () => state.pages.filter((page) => page?.status === "published"),
    [state.pages]
  );
  const selectedPage = useSelectedPublishedPage(publishedPages, selectedPageId, setSelectedPageId);
  const {
    projectionTargetState,
    categoriesProjectionTargetState,
    tagsProjectionTargetState,
    deploymentTargetState,
    browserTargetState,
    mediaTargetState
  } = useDeploymentTargets(
    remoteOpsSupport,
    state.settings,
    remoteHealth
  );
  const summary = useMemo(() => createPublishedPagesSummary(publishedPages), [publishedPages]);
  const pipelineReadiness = useMemo(
    () =>
      createPipelineReadiness({
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
      selectedPage,
      tagsProjectionTargetState
    ]
  );
  const reloadAll = useCallback(async () => {
    await Promise.all([reload(), remoteOpsSupport.reload()]);
  }, [reload, remoteOpsSupport.reload]);
  const { localSyncState, syncSelectedPage } = useLocalDeploymentSync(reload, selectedPageId);
  const { pipelineState, runReleasePipeline } = useReleasePipeline({
    selectedPageId,
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
    loading: state.loading,
    errorMessage: state.errorMessage,
    publishedPages,
    selectedPageId,
    selectedPage,
    setSelectedPageId,
    localSyncState,
    pipelineState,
    pipelineReadiness,
    remoteHealth,
    summary,
    projectionTarget: projectionTargetState.target,
    categoriesProjectionTarget: categoriesProjectionTargetState.target,
    tagsProjectionTarget: tagsProjectionTargetState.target,
    deploymentTarget: deploymentTargetState.target,
    browserTarget: browserTargetState.target,
    mediaTarget: mediaTargetState.target,
    projectionTargetState,
    categoriesProjectionTargetState,
    tagsProjectionTargetState,
    deploymentTargetState,
    browserTargetState,
    mediaTargetState,
    remoteOpsSupport,
    syncSelectedPage,
    runReleasePipeline,
    reload
  };
}
