import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDistributionSummary,
  buildReadinessIssues,
  matchesPageFilters,
  sortPagesForDesk,
  sortRedirectRules
} from "./distribution-readiness.js";
import { resolvePageContextManifest } from "../server/page-context-manifest-runtime.mjs";
import { resolvePageWidgetCompatibility } from "../shared/page-widget-compatibility.mjs";
import { normalizeLayoutDocument } from "../../test-modules-layouts/shared/layout-document.mjs";
import {
  createActionState,
  createDeploymentInstancesState,
  createDeliveryState,
  createEmptyDataSourceDraft,
  createEmptyPageDraft,
  createPageDraftFromItem,
  createSourceOptionsMap,
  resolveActorOptions,
  toOption
} from "./page-workspace-support.js";
import {
  fetchDeliveryPayload,
  fetchDeploymentInstances,
  fetchPagePreviewSources,
  persistPageMutation,
  publishSelectedPage,
  syncSelectedPageDeployment,
  useSupportData
} from "./blog-distribution-workspace-support.js";
import { useRedirectWorkspace } from "./blog-distribution-redirect-workspace.js";

const DEFAULT_PAGE_FILTERS = Object.freeze({
  search: "",
  status: "",
  pageKind: "",
  primarySourceType: "",
  readiness: ""
});

function createManifestPayloadForPage(page = {}) {
  const primarySourceType = page?.primarySourceType ?? "none";
  return {
    page: {
      pageKind: page?.pageKind ?? null,
      primarySourceType
    },
    application: {
      model:
        primarySourceType === "blog-post"
          ? { kind: "post-detail" }
          : primarySourceType === "blog-category"
            ? { kind: "category-detail" }
            : null
    }
  };
}

function resolveLayoutDocumentForCompatibility(layout = null) {
  if (!layout) {
    return null;
  }
  return normalizeLayoutDocument(layout.layoutDocument ?? layout.layoutDocumentJson ?? null);
}

function resolvePageWidgetCompatibilityState(page = {}, layoutById = new Map(), mediaItems = []) {
  const layout = page?.layoutId ? layoutById.get(page.layoutId) ?? null : null;
  if (!layout) {
    return {
      contractVersion: 1,
      summary: {
        totalBlocks: 0,
        widgetizedBlocks: 0,
        compatibleWidgets: 0,
        blockingIssueCount: 0,
        warningIssueCount: 0
      },
      widgetInventory: [],
      issues: [],
      blockingIssues: [],
      warningIssues: [],
      supported: true
    };
  }

  const pageContextManifest = resolvePageContextManifest(createManifestPayloadForPage(page)).manifest;
  return resolvePageWidgetCompatibility({
    layoutDocument: resolveLayoutDocumentForCompatibility(layout),
    pageContextManifest,
    pageKind: pageContextManifest?.pageKind ?? page?.pageKind ?? null,
    primarySourceType: pageContextManifest?.primarySourceType ?? page?.primarySourceType ?? null,
    mediaItems
  });
}

function mergeReadinessWithWidgetCompatibility(page = {}, widgetCompatibility = null) {
  const baseIssues = buildReadinessIssues(page);
  const widgetIssues = Array.isArray(widgetCompatibility?.issues)
    ? widgetCompatibility.issues.map((issue) => `Widget: ${issue.message}`)
    : [];
  return [...baseIssues, ...widgetIssues];
}

function usePageSelection(pages) {
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [isCreatingNewPage, setIsCreatingNewPage] = useState(false);
  const [pageDraft, setPageDraft] = useState(createEmptyPageDraft);

  useEffect(() => {
    if (isCreatingNewPage) {
      return;
    }
    if (pages.length === 0) {
      setSelectedPageId(null);
      setPageDraft(createEmptyPageDraft());
      return;
    }
    if (!selectedPageId || !pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(pages[0].id);
      return;
    }
    const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;
    if (selectedPage) {
      setPageDraft(createPageDraftFromItem(selectedPage));
    }
  }, [isCreatingNewPage, pages, selectedPageId]);

  return {
    selectedPageId,
    selectedPage: pages.find((page) => page.id === selectedPageId) ?? null,
    isCreatingNewPage,
    pageDraft,
    setSelectedPageId,
    setIsCreatingNewPage,
    setPageDraft
  };
}

function useDeliveryPreview(selectedPageId, refreshToken, previewSourceItemId) {
  const [deliveryState, setDeliveryState] = useState(createDeliveryState);
  const latestPreviewKeyRef = useRef("");
  const previewKey = `${selectedPageId ?? ""}:${previewSourceItemId ?? ""}:${refreshToken}`;
  latestPreviewKeyRef.current = previewKey;

  useEffect(() => {
    async function run() {
      if (!selectedPageId) {
        if (latestPreviewKeyRef.current === previewKey) {
          setDeliveryState(createDeliveryState());
        }
        return;
      }

      if (latestPreviewKeyRef.current === previewKey) {
        setDeliveryState({
          loading: true,
          errorMessage: null,
          payload: null
        });
      }

      try {
        const payload = await fetchDeliveryPayload(selectedPageId, previewSourceItemId);
        if (latestPreviewKeyRef.current === previewKey) {
          setDeliveryState({
            loading: false,
            errorMessage: null,
            payload
          });
        }
      } catch (error) {
        if (latestPreviewKeyRef.current === previewKey) {
          setDeliveryState({
            loading: false,
            errorMessage: error?.message ?? "Failed to load delivery payload",
            payload: null
          });
        }
      }
    }

    void run();
  }, [previewKey, previewSourceItemId, selectedPageId]);

  return deliveryState;
}

function usePreviewSourceOptions(selectedPageId, refreshToken, enabled) {
  const [previewSourceState, setPreviewSourceState] = useState({
    loading: false,
    errorMessage: null,
    items: []
  });
  const previewKey = `${selectedPageId ?? ""}:${refreshToken}`;

  useEffect(() => {
    async function run() {
      if (!selectedPageId || !enabled) {
        setPreviewSourceState({
          loading: false,
          errorMessage: null,
          items: []
        });
        return;
      }

      setPreviewSourceState({
        loading: true,
        errorMessage: null,
        items: []
      });

      try {
        const items = await fetchPagePreviewSources(selectedPageId);
        setPreviewSourceState({
          loading: false,
          errorMessage: null,
          items
        });
      } catch (error) {
        setPreviewSourceState({
          loading: false,
          errorMessage: error?.message ?? "Failed to load preview sources",
          items: []
        });
      }
    }

    void run();
  }, [enabled, previewKey, selectedPageId]);

  return previewSourceState;
}

function useDeploymentInstances(selectedPageId, refreshToken, enabled) {
  const [deploymentInstancesState, setDeploymentInstancesState] = useState(
    createDeploymentInstancesState
  );
  const requestKey = `${selectedPageId ?? ""}:${refreshToken}`;

  useEffect(() => {
    async function run() {
      if (!selectedPageId || !enabled) {
        setDeploymentInstancesState(createDeploymentInstancesState());
        return;
      }

      setDeploymentInstancesState({
        loading: true,
        errorMessage: null,
        items: []
      });

      try {
        const items = await fetchDeploymentInstances(selectedPageId);
        setDeploymentInstancesState({
          loading: false,
          errorMessage: null,
          items
        });
      } catch (error) {
        setDeploymentInstancesState({
          loading: false,
          errorMessage: error?.message ?? "Failed to load deployment instances",
          items: []
        });
      }
    }

    void run();
  }, [enabled, requestKey, selectedPageId]);

  return deploymentInstancesState;
}

function selectExistingPage({ pages, selection, setPageActionState }, pageId) {
  const nextPage = pages.find((page) => page.id === pageId) ?? null;
  selection.setIsCreatingNewPage(false);
  selection.setSelectedPageId(pageId);
  selection.setPageDraft(nextPage ? createPageDraftFromItem(nextPage) : createEmptyPageDraft());
  setPageActionState(createActionState());
}

function startNewPageDraft(selection, setPageActionState) {
  selection.setIsCreatingNewPage(true);
  selection.setSelectedPageId(null);
  selection.setPageDraft(createEmptyPageDraft());
  setPageActionState(createActionState());
}

function changePageDraftField({ fieldId, value, layoutById, setPageDraftField }) {
  if (fieldId === "deploymentMode") {
    setPageDraftField((previous) => {
      const nextDeploymentMode = value;
      const nextSourceSelectionMode =
        nextDeploymentMode === "per-record"
          ? "all-records"
          : previous.primarySourceType === "none"
            ? "none"
            : previous.sourceSelectionMode === "none" || previous.sourceSelectionMode === "all-records"
              ? "specific-record"
              : previous.sourceSelectionMode;
      return {
        ...previous,
        deploymentMode: nextDeploymentMode,
        pageKind:
          nextDeploymentMode === "per-record" && previous.pageKind === "standalone"
            ? "content-detail"
            : previous.pageKind,
        sourceSelectionMode: nextSourceSelectionMode,
        primarySourceItemId: nextSourceSelectionMode === "all-records" ? "" : previous.primarySourceItemId
      };
    });
    return;
  }

  if (fieldId === "primarySourceType") {
    setPageDraftField((previous) => {
      const nextPrimarySourceType = value;
      const nextSourceSelectionMode =
        nextPrimarySourceType === "none"
          ? "none"
          : previous.deploymentMode === "per-record"
            ? "all-records"
            : previous.sourceSelectionMode === "none"
              ? "specific-record"
              : previous.sourceSelectionMode;
      return {
        ...previous,
        primarySourceType: nextPrimarySourceType,
        sourceSelectionMode: nextSourceSelectionMode,
        primarySourceItemId:
          nextPrimarySourceType === "none" || nextSourceSelectionMode === "all-records"
            ? ""
            : previous.primarySourceItemId
      };
    });
    return;
  }

  if (fieldId === "sourceSelectionMode") {
    setPageDraftField((previous) => ({
      ...previous,
      sourceSelectionMode: value,
      primarySourceItemId: value === "all-records" || value === "none" ? "" : previous.primarySourceItemId
    }));
    return;
  }

  if (fieldId === "layoutId") {
    const selectedLayout = layoutById.get(value) ?? null;
    setPageDraftField((previous) => ({
      ...previous,
      layoutId: value,
      layoutKey: selectedLayout?.layoutKey ?? previous.layoutKey
    }));
    return;
  }

  setPageDraftField((previous) => ({
    ...previous,
    [fieldId]: value
  }));
}

function usePersistPageAction({
  selection,
  reloadSupportData,
  setPageActionState,
  setDeliveryRefreshToken
}) {
  return useCallback(async () => {
    setPageActionState({
      saving: true,
      syncingDeployment: false,
      errorMessage: null,
      successMessage: null
    });
    try {
      const targetPageId = selection.isCreatingNewPage ? null : selection.selectedPageId;
      const result = await persistPageMutation({
        pageId: targetPageId,
        draft: selection.pageDraft
      });
      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to save page");
      }
      const savedPage = result.item ?? null;
      await reloadSupportData();
      if (savedPage?.id) {
        selection.setIsCreatingNewPage(false);
        selection.setSelectedPageId(savedPage.id);
        selection.setPageDraft(createPageDraftFromItem(savedPage));
      }
      setDeliveryRefreshToken((previous) => previous + 1);
      setPageActionState({
        saving: false,
        syncingDeployment: false,
        errorMessage: null,
        successMessage: targetPageId ? "Page updated" : "Page created"
      });
    } catch (error) {
      setPageActionState({
        saving: false,
        syncingDeployment: false,
        errorMessage: error?.message ?? "Failed to save page",
        successMessage: null
      });
    }
  }, [reloadSupportData, selection, setDeliveryRefreshToken, setPageActionState]);
}

function usePublishPageAction({
  selection,
  reloadSupportData,
  selectedActorId,
  effectiveSelectedPage,
  effectiveSelectedPageId,
  setPageActionState,
  setDeliveryRefreshToken
}) {
  return useCallback(async () => {
    if (!selection.selectedPageId) {
      return;
    }
    setPageActionState({
      saving: true,
      syncingDeployment: false,
      errorMessage: null,
      successMessage: null
    });
    try {
      await publishSelectedPage({
        pageId: effectiveSelectedPageId,
        updatedByAuthorId: selectedActorId
      });
      await reloadSupportData();
      setDeliveryRefreshToken((previous) => previous + 1);
      setPageActionState({
        saving: false,
        syncingDeployment: false,
        errorMessage: null,
        successMessage:
          effectiveSelectedPage?.deploymentMode === "per-record"
            ? "Template published. Deployment state is now tracked separately."
            : effectiveSelectedPage?.status === "published"
              ? "Published page synced to deployment"
              : "Page published and deployed"
      });
    } catch (error) {
      setPageActionState({
        saving: false,
        syncingDeployment: false,
        errorMessage: error?.message ?? "Failed to publish page",
        successMessage: null
      });
    }
  }, [
    effectiveSelectedPage,
    effectiveSelectedPageId,
    reloadSupportData,
    selectedActorId,
    selection.selectedPageId,
    setDeliveryRefreshToken,
    setPageActionState
  ]);
}

function useSyncDeploymentAction({
  selection,
  reloadSupportData,
  setPageActionState,
  setDeliveryRefreshToken
}) {
  return useCallback(async () => {
    if (!selection.selectedPageId) {
      return;
    }
    setPageActionState({
      saving: false,
      syncingDeployment: true,
      errorMessage: null,
      successMessage: null
    });
    try {
      const result = await syncSelectedPageDeployment({
        pageId: selection.selectedPageId
      });
      await reloadSupportData();
      setDeliveryRefreshToken((previous) => previous + 1);
      const syncedCount = Number(result?.item?.deploymentSyncedCount ?? 0);
      setPageActionState({
        saving: false,
        syncingDeployment: false,
        errorMessage: null,
        successMessage: `Deployment synced for ${syncedCount} output${syncedCount === 1 ? "" : "s"}`
      });
    } catch (error) {
      setPageActionState({
        saving: false,
        syncingDeployment: false,
        errorMessage: error?.message ?? "Failed to sync deployment",
        successMessage: null
      });
    }
  }, [reloadSupportData, selection.selectedPageId, setDeliveryRefreshToken, setPageActionState]);
}

function usePageWorkspace({ pages, layouts, mediaItems, reloadSupportData, selectedActorId }) {
  const selection = usePageSelection(pages);
  const [pageFilters, setPageFilters] = useState(DEFAULT_PAGE_FILTERS);
  const [pageActionState, setPageActionState] = useState(createActionState);
  const [deliveryRefreshToken, setDeliveryRefreshToken] = useState(0);
  const effectiveSelectedPageId = selection.isCreatingNewPage ? null : selection.selectedPageId;
  const effectiveSelectedPage =
    selection.isCreatingNewPage
      ? null
      : pages.find((page) => page.id === selection.selectedPageId) ?? null;
  const layoutById = useMemo(() => new Map(layouts.map((layout) => [layout.id, layout])), [layouts]);
  const widgetCompatibilityByPageId = useMemo(
    () =>
      new Map(
        pages.map((page) => [
          page.id,
          resolvePageWidgetCompatibilityState(page, layoutById, mediaItems)
        ])
      ),
    [layoutById, mediaItems, pages]
  );
  const readinessMap = useMemo(
    () =>
      new Map(
        pages.map((page) => [
          page.id,
          mergeReadinessWithWidgetCompatibility(page, widgetCompatibilityByPageId.get(page.id))
        ])
      ),
    [pages, widgetCompatibilityByPageId]
  );
  const filteredPages = useMemo(() => pages.filter((page) => matchesPageFilters(page, pageFilters, readinessMap.get(page.id) ?? [])), [pageFilters, pages, readinessMap]);
  const setPageDraftField = useCallback((updater) => {
    selection.setPageDraft(updater);
    setPageActionState(createActionState());
  }, [selection]);
  const changePreviewSourceItemId = useCallback((value) => {
    setPageDraftField((previous) => ({
      ...previous,
      previewSourceItemId: value
    }));
  }, [setPageDraftField]);
  const persistPage = usePersistPageAction({
    selection,
    reloadSupportData,
    setPageActionState,
    setDeliveryRefreshToken
  });
  const publishPage = usePublishPageAction({
    selection,
    reloadSupportData,
    selectedActorId,
    effectiveSelectedPage,
    effectiveSelectedPageId,
    setPageActionState,
    setDeliveryRefreshToken
  });
  const syncDeployment = useSyncDeploymentAction({
    selection,
    reloadSupportData,
    setPageActionState,
    setDeliveryRefreshToken
  });
  const selectPage = useCallback((pageId) => {
    selectExistingPage({ pages, selection, setPageActionState }, pageId);
  }, [
    pages,
    selection,
    setPageActionState
  ]);
  const startNewPage = useCallback(() => {
    startNewPageDraft(selection, setPageActionState);
  }, [selection, setPageActionState]);

  return {
    ...selection,
    pages,
    selectedPageId: effectiveSelectedPageId,
    selectedPage: effectiveSelectedPage,
    readinessMap,
    widgetCompatibilityByPageId,
    deliveryRefreshToken,
    filteredPages,
    pageFilters,
    pageActionState,
    setPageFilters,
    selectPage,
    startNewPage,
    changePageField: (fieldId, value) => changePageDraftField({ fieldId, value, layoutById, setPageDraftField }),
    changeDataSourceField: (index, fieldId, value) => {
      setPageDraftField((previous) => ({
        ...previous,
        dataSources: previous.dataSources.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [fieldId]: value } : entry
        )
      }));
    },
    addDataSource: () => {
      setPageDraftField((previous) => ({
        ...previous,
        dataSources: [...previous.dataSources, createEmptyDataSourceDraft(previous.dataSources.length)]
      }));
    },
    removeDataSource: (index) => {
      setPageDraftField((previous) => ({
        ...previous,
        dataSources: previous.dataSources.filter((_, entryIndex) => entryIndex !== index)
      }));
    },
    changePreviewSourceItemId,
    persistPage,
    publishPage,
    syncDeployment
  };
}

export function useBlogDistributionWorkspace() {
  const support = useSupportData();
  const [selectedActorId, setSelectedActorId] = useState("");
  const pages = useMemo(() => sortPagesForDesk(support.supportState.pages), [support.supportState.pages]);
  const redirects = useMemo(
    () => sortRedirectRules(support.supportState.redirects),
    [support.supportState.redirects]
  );
  const actorOptions = useMemo(
    () => resolveActorOptions(support.supportState.authors),
    [support.supportState.authors]
  );
  const themeOptions = useMemo(
    () =>
      support.supportState.themes.map((item) => ({
        id: item.id,
        themeKey: item.themeKey,
        label: item.title ?? item.themeKey ?? item.id,
        isGlobalDefault: item.isGlobalDefault === true
      })),
    [support.supportState.themes]
  );
  const defaultGlobalTheme = useMemo(
    () => support.supportState.themes.find((item) => item.isGlobalDefault === true) ?? null,
    [support.supportState.themes]
  );

  useEffect(() => {
    if (!selectedActorId && actorOptions[0]?.id) {
      setSelectedActorId(actorOptions[0].id);
      return;
    }
    if (selectedActorId && !actorOptions.some((author) => author.id === selectedActorId)) {
      setSelectedActorId(actorOptions[0]?.id ?? "");
    }
  }, [actorOptions, selectedActorId]);

  const pageWorkspace = usePageWorkspace({
    pages,
    layouts: support.supportState.layouts,
    mediaItems: support.supportState.media,
    reloadSupportData: support.reloadSupportData,
    selectedActorId
  });
  const previewSourceState = usePreviewSourceOptions(
    pageWorkspace.selectedPageId,
    pageWorkspace.deliveryRefreshToken,
    pageWorkspace.pageDraft.deploymentMode === "per-record"
  );
  useEffect(() => {
    if (!pageWorkspace.selectedPageId || pageWorkspace.pageDraft.deploymentMode !== "per-record") {
      return;
    }

    const availableIds = previewSourceState.items.map((item) => item.id);
    const currentPreviewSourceItemId = pageWorkspace.pageDraft.previewSourceItemId;
    if (availableIds.length === 0) {
      if (currentPreviewSourceItemId) {
        pageWorkspace.changePreviewSourceItemId("");
      }
      return;
    }

    if (!currentPreviewSourceItemId || !availableIds.includes(currentPreviewSourceItemId)) {
      pageWorkspace.changePreviewSourceItemId(availableIds[0]);
    }
  }, [
    pageWorkspace.changePreviewSourceItemId,
    pageWorkspace.pageDraft.deploymentMode,
    pageWorkspace.pageDraft.previewSourceItemId,
    pageWorkspace.selectedPageId,
    previewSourceState.items
  ]);
  const redirectWorkspace = useRedirectWorkspace({
    redirects,
    reloadSupportData: support.reloadSupportData
  });
  const deploymentInstancesState = useDeploymentInstances(
    pageWorkspace.selectedPageId,
    pageWorkspace.deliveryRefreshToken,
    pageWorkspace.selectedPage?.deploymentMode === "per-record"
  );
  const deliveryState = useDeliveryPreview(
    pageWorkspace.selectedPageId,
    pageWorkspace.deliveryRefreshToken,
    pageWorkspace.pageDraft.previewSourceItemId
  );
  const draftWidgetCompatibility = useMemo(
    () =>
      resolvePageWidgetCompatibilityState(
        pageWorkspace.pageDraft,
        new Map(support.supportState.layouts.map((layout) => [layout.id, layout])),
        support.supportState.media
      ),
    [pageWorkspace.pageDraft, support.supportState.layouts, support.supportState.media]
  );
  const readinessMap = useMemo(
    () =>
      new Map(
        pages.map((page) => [
          page.id,
          mergeReadinessWithWidgetCompatibility(
            page,
            pageWorkspace.widgetCompatibilityByPageId.get(page.id)
          )
        ])
      ),
    [pageWorkspace.widgetCompatibilityByPageId, pages]
  );

  return {
    supportState: support.supportState,
    reloadSupportData: support.reloadSupportData,
    summary: buildDistributionSummary({ pages, redirects, readinessMap }),
    readinessMap,
    pageById: new Map(pages.map((page) => [page.id, page])),
    sourceOptionsByType: createSourceOptionsMap({
      posts: support.supportState.posts,
      authors: support.supportState.authors,
      categories: support.supportState.categories,
      tags: support.supportState.tags
    }),
    layoutOptions: support.supportState.layouts.map(toOption),
    themeOptions,
    defaultGlobalTheme,
    mediaOptions: support.supportState.media.map(toOption),
    actorOptions,
    selectedActorId,
    setSelectedActorId,
    deliveryState,
    deploymentInstancesState,
    previewSourceState,
    draftWidgetCompatibility,
    ...pageWorkspace,
    ...redirectWorkspace
  };
}
