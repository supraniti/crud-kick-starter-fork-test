import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReferenceCollectionItem,
  deleteReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../../frontend/src/api/reference.js";
import {
  addNodeToLayout,
  buildNodePath,
  buildLayoutMutationPayload,
  createContainerInsertionTarget,
  createSiblingInsertionTarget,
  createEmptyLayoutDraft,
  createLayoutDraftFromItem,
  findParentContainerId,
  moveNodeInLayout,
  removeNodeFromLayout,
  resolveCreationTarget,
  resolveMoveTarget,
  updateNodeInLayout
} from "./layout-builder-model.js";
import {
  duplicateNodeInLayout,
  insertBlueprintIntoLayout,
  resizeFlexPairInLayout
} from "./layout-builder-advanced-model.js";
import {
  createBlockPlaceholderConfig,
  createLayoutPresetBlueprint,
  getLayoutStarterPreset
} from "./layout-builder-palette.js";
import {
  useLayoutDeploymentImpact,
  useLayoutRouteSync
} from "./layouts-workspace-support.js";
import { createSelectionActions } from "./layouts-workspace-selection-actions.js";
import { resolvePageContextManifest } from "../../test-modules-pages/server/page-context-manifest-runtime.mjs";

const LAYOUTS_COLLECTION_ID = "page-layouts";
const PAGES_COLLECTION_ID = "blog-pages";
const MEDIA_ITEMS_COLLECTION_ID = "media-items";

function createActionState() {
  return {
    saving: false,
    deleting: false,
    errorMessage: null,
    successMessage: null
  };
}

async function loadSupportData() {
  const [layoutsPayload, pagesPayload, mediaPayload] = await Promise.all([
    fetchReferenceCollectionItems({
      collectionId: LAYOUTS_COLLECTION_ID,
      limit: 200
    }),
    fetchReferenceCollectionItems({
      collectionId: PAGES_COLLECTION_ID,
      limit: 500
    }),
    fetchReferenceCollectionItems({
      collectionId: MEDIA_ITEMS_COLLECTION_ID,
      limit: 500
    })
  ]);

  return {
    layouts: Array.isArray(layoutsPayload?.items) ? layoutsPayload.items : [],
    pages: Array.isArray(pagesPayload?.items) ? pagesPayload.items : [],
    media: Array.isArray(mediaPayload?.items) ? mediaPayload.items : []
  };
}

function useLayoutsSupportData() {
  const [supportState, setSupportState] = useState({
    loading: true,
    errorMessage: null,
    layouts: [],
    pages: [],
    media: []
  });

  const reload = useCallback(async () => {
    setSupportState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));
    try {
      const next = await loadSupportData();
      setSupportState({
        loading: false,
        errorMessage: null,
        ...next
      });
    } catch (error) {
      setSupportState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load layouts",
        layouts: [],
        pages: [],
        media: []
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    supportState,
    reload
  };
}

function useLayoutSelection(layouts) {
  const [selectedLayoutId, setSelectedLayoutId] = useState(null);
  const [isCreatingNewLayout, setIsCreatingNewLayout] = useState(false);
  const [draft, setDraft] = useState(createEmptyLayoutDraft);
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [actionState, setActionState] = useState(createActionState);

  useEffect(() => {
    if (isCreatingNewLayout) {
      return;
    }
    if (selectedLayoutId && layouts.some((item) => item.id === selectedLayoutId)) {
      return;
    }
    setSelectedLayoutId(layouts[0]?.id ?? null);
  }, [isCreatingNewLayout, layouts, selectedLayoutId]);

  useEffect(() => {
    if (isCreatingNewLayout) {
      return;
    }
    const selectedLayout = layouts.find((item) => item.id === selectedLayoutId) ?? null;
    if (!selectedLayout) {
      setDraft(createEmptyLayoutDraft());
      setSelectedNodeId("root");
      setIsMoveMode(false);
      return;
    }
    setDraft(createLayoutDraftFromItem(selectedLayout));
    setSelectedNodeId(selectedLayout.layoutDocument?.rootId ?? "root");
    setIsMoveMode(false);
    setActionState(createActionState());
  }, [isCreatingNewLayout, layouts, selectedLayoutId]);

  return {
    selectedLayoutId,
    isCreatingNewLayout,
    draft,
    selectedNodeId,
    isNodeDialogOpen,
    isMoveMode,
    actionState,
    setSelectedLayoutId,
    setIsCreatingNewLayout,
    setDraft,
    setSelectedNodeId,
    setIsNodeDialogOpen,
    setIsMoveMode,
    setActionState
  };
}

function useLayoutPersistence(selection, reload) {
  const {
    draft,
    selectedLayoutId,
    isCreatingNewLayout,
    setActionState,
    setIsCreatingNewLayout,
    setSelectedLayoutId,
    setDraft,
    setSelectedNodeId,
    setIsNodeDialogOpen
  } = selection;

  const persistLayout = useCallback(async () => {
    setActionState({
      saving: true,
      deleting: false,
      errorMessage: null,
      successMessage: null
    });
    try {
      const payload = buildLayoutMutationPayload(draft);
      const shouldUpdate = Boolean(selectedLayoutId) && !isCreatingNewLayout;
      const result = shouldUpdate
        ? await updateReferenceCollectionItem({
            collectionId: LAYOUTS_COLLECTION_ID,
            itemId: selectedLayoutId,
            item: payload
          })
        : await createReferenceCollectionItem({
            collectionId: LAYOUTS_COLLECTION_ID,
            item: payload
          });

      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to save layout");
      }

      await reload();
      if (result.item?.id) {
        setIsCreatingNewLayout(false);
        setSelectedLayoutId(result.item.id);
        setDraft(createLayoutDraftFromItem(result.item));
      }
      setIsNodeDialogOpen(false);
      setActionState({
        saving: false,
        deleting: false,
        errorMessage: null,
        successMessage: shouldUpdate ? "Layout updated" : "Layout created"
      });
    } catch (error) {
      setActionState({
        saving: false,
        deleting: false,
        errorMessage: error?.message ?? "Failed to save layout",
        successMessage: null
      });
    }
  }, [draft, isCreatingNewLayout, reload, selectedLayoutId, setActionState, setDraft, setIsCreatingNewLayout, setIsNodeDialogOpen, setSelectedLayoutId]);

  const deleteLayout = useCallback(async () => {
    if (!selectedLayoutId) {
      return;
    }
    setActionState({
      saving: false,
      deleting: true,
      errorMessage: null,
      successMessage: null
    });
    try {
      const result = await deleteReferenceCollectionItem({
        collectionId: LAYOUTS_COLLECTION_ID,
        itemId: selectedLayoutId
      });
      if (!result?.ok) {
        throw new Error(result?.error?.message ?? "Failed to delete layout");
      }
      await reload();
      setIsCreatingNewLayout(false);
      setSelectedNodeId("root");
      setIsNodeDialogOpen(false);
      setDraft(createEmptyLayoutDraft());
      setActionState({
        saving: false,
        deleting: false,
        errorMessage: null,
        successMessage: "Layout deleted"
      });
    } catch (error) {
      setActionState({
        saving: false,
        deleting: false,
        errorMessage: error?.message ?? "Failed to delete layout",
        successMessage: null
      });
    }
  }, [reload, selectedLayoutId, setActionState, setDraft, setIsCreatingNewLayout, setIsNodeDialogOpen, setSelectedNodeId]);

  return {
    persistLayout,
    deleteLayout
  };
}

function commitInsertedNode({
  document,
  target,
  kind,
  overrides,
  setDraftWithReset,
  setSelectedNodeId
}) {
  const next = addNodeToLayout(document, target, kind, overrides);
  setDraftWithReset((previous) => ({
    ...previous,
    layoutDocument: next.document
  }));
  setSelectedNodeId(next.selectedNodeId);
}

function hasMutableSelection(selectedNodeId, rootId) {
  return Boolean(selectedNodeId) && selectedNodeId !== rootId;
}

function applyLayoutPresetInsertion({ document, target, presetId, setDraftWithReset, setSelectedNodeId }) {
  const next = insertBlueprintIntoLayout(
    document,
    target,
    createLayoutPresetBlueprint(presetId)
  );
  setDraftWithReset((previous) => ({
    ...previous,
    layoutDocument: next.document
  }));
  setSelectedNodeId(next.selectedNodeId);
}

function buildInsertionActions({
  draft,
  selectedNodeId,
  insertNode,
  insertRelativeToSelection,
  appendIntoContainer,
  setDraftWithReset,
  setSelectedNodeId
}) {
  const createTarget = resolveCreationTarget(draft.layoutDocument, selectedNodeId ?? draft.layoutDocument.rootId);

  return {
    insertBlockAt: (target) => insertNode(target, "block"),
    insertContainerAt: (target, layoutMode) => insertNode(target, "container", { layoutMode }),
    insertBlockPresetAt: (target, placeholderType) => insertNode(
      target,
      "block",
      createBlockPlaceholderConfig(placeholderType)
    ),
    insertLayoutPresetAt: (target, presetId) => applyLayoutPresetInsertion({
      document: draft.layoutDocument,
      target,
      presetId,
      setDraftWithReset,
      setSelectedNodeId
    }),
    addBlock: () => insertNode(createTarget, "block"),
    addBlockPreset: (placeholderType) => insertNode(
      createTarget,
      "block",
      createBlockPlaceholderConfig(placeholderType)
    ),
    addContainer: (layoutMode) => insertNode(createTarget, "container", { layoutMode }),
    addLayoutPreset: (presetId) => applyLayoutPresetInsertion({
      document: draft.layoutDocument,
      target: createTarget,
      presetId,
      setDraftWithReset,
      setSelectedNodeId
    }),
    addBlockBeforeSelected: () => insertRelativeToSelection("before", "block"),
    addBlockAfterSelected: () => insertRelativeToSelection("after", "block"),
    addContainerBeforeSelected: (layoutMode) => insertRelativeToSelection("before", "container", { layoutMode }),
    addContainerAfterSelected: (layoutMode) => insertRelativeToSelection("after", "container", { layoutMode }),
    appendBlockToContainer: (containerId) => appendIntoContainer(containerId, "block"),
    appendBlockPresetToContainer: (containerId, placeholderType) => appendIntoContainer(
      containerId,
      "block",
      createBlockPlaceholderConfig(placeholderType)
    ),
    appendContainerToContainer: (containerId, layoutMode) => appendIntoContainer(containerId, "container", { layoutMode }),
    appendLayoutPresetToContainer: (containerId, presetId) => applyLayoutPresetInsertion({
      document: draft.layoutDocument,
      target: createContainerInsertionTarget(draft.layoutDocument, containerId, null),
      presetId,
      setDraftWithReset,
      setSelectedNodeId
    })
  };
}

function buildMutationActions({
  draft,
  selectedNodeId,
  setDraftWithReset,
  setSelectedNodeId,
  setIsNodeDialogOpen,
  setIsMoveMode
}) {
  return {
    removeSelectedNode: () => {
      if (!hasMutableSelection(selectedNodeId, draft.layoutDocument.rootId)) {
        return;
      }
      setDraftWithReset((previous) => ({
        ...previous,
        layoutDocument: removeNodeFromLayout(previous.layoutDocument, selectedNodeId)
      }));
      setIsMoveMode(false);
      setIsNodeDialogOpen(false);
      setSelectedNodeId(draft.layoutDocument.rootId);
    },
    updateNode: (nodeId, updater) => {
      setDraftWithReset((previous) => ({
        ...previous,
        layoutDocument: updateNodeInLayout(previous.layoutDocument, nodeId, updater)
      }));
    },
    handleDragEnd: ({ activeId, overId }) => {
      if (!activeId || !overId || activeId === overId) {
        return;
      }
      const target = resolveMoveTarget(draft.layoutDocument, activeId, overId);
      if (!target) {
        return;
      }
      setDraftWithReset((previous) => ({
        ...previous,
        layoutDocument: moveNodeInLayout(previous.layoutDocument, activeId, target.containerId, target.index)
      }));
    },
    moveSelectedNodeTo: (target) => {
      if (!hasMutableSelection(selectedNodeId, draft.layoutDocument.rootId) || !target) {
        return;
      }
      setDraftWithReset((previous) => ({
        ...previous,
        layoutDocument: moveNodeInLayout(previous.layoutDocument, selectedNodeId, target.containerId, target.index)
      }));
      setIsMoveMode(false);
    },
    duplicateSelectedNode: () => {
      if (!hasMutableSelection(selectedNodeId, draft.layoutDocument.rootId)) {
        return;
      }
      const next = duplicateNodeInLayout(draft.layoutDocument, selectedNodeId);
      setDraftWithReset((previous) => ({
        ...previous,
        layoutDocument: next.document
      }));
      setSelectedNodeId(next.selectedNodeId);
    },
    resizeFlexPair: (parentId, nodeId, nextSiblingId, nextPercent) => {
      setDraftWithReset((previous) => ({
        ...previous,
        layoutDocument: resizeFlexPairInLayout(
          previous.layoutDocument,
          parentId,
          nodeId,
          nextSiblingId,
          nextPercent
        )
      }));
    },
    openNodeDialog: (nodeId = selectedNodeId) => {
      if (nodeId) {
        setSelectedNodeId(nodeId);
      }
      setIsNodeDialogOpen(true);
    },
    closeNodeDialog: () => setIsNodeDialogOpen(false),
    setMoveMode: (nextValue) => setIsMoveMode(Boolean(nextValue))
  };
}

function useLayoutDocumentActions(selection) {
  const {
    draft,
    selectedNodeId,
    setDraft,
    setSelectedNodeId,
    setIsNodeDialogOpen,
    setIsMoveMode,
    setActionState
  } = selection;

  const setDraftWithReset = useCallback((updater) => {
    setDraft(updater);
    setActionState(createActionState());
  }, [setActionState, setDraft]);

  const insertNode = useCallback((target, kind, overrides) => {
    commitInsertedNode({
      document: draft.layoutDocument,
      target,
      kind,
      overrides,
      setDraftWithReset,
      setSelectedNodeId
    });
  }, [draft.layoutDocument, setDraftWithReset, setSelectedNodeId]);

  const insertRelativeToSelection = useCallback((position, kind, overrides) => {
    if (!hasMutableSelection(selectedNodeId, draft.layoutDocument.rootId)) {
      return;
    }
    insertNode(
      createSiblingInsertionTarget(draft.layoutDocument, selectedNodeId, position),
      kind,
      overrides
    );
  }, [draft.layoutDocument, insertNode, selectedNodeId]);

  const appendIntoContainer = useCallback((containerId, kind, overrides) => {
    insertNode(
      createContainerInsertionTarget(draft.layoutDocument, containerId, null),
      kind,
      overrides
    );
  }, [draft.layoutDocument, insertNode]);

  return {
    changeLayoutField: (fieldId, value) => {
      setDraftWithReset((previous) => ({
        ...previous,
        [fieldId]: value
      }));
    },
    selectNode: setSelectedNodeId,
    ...buildInsertionActions({
      draft,
      selectedNodeId,
      insertNode,
      insertRelativeToSelection,
      appendIntoContainer,
      setDraftWithReset,
      setSelectedNodeId
    }),
    ...buildMutationActions({
      draft,
      selectedNodeId,
      setDraftWithReset,
      setSelectedNodeId,
      setIsNodeDialogOpen,
      setIsMoveMode
    })
  };
}

function buildStarterDraft(starterId) {
  const preset = getLayoutStarterPreset(starterId);
  let draft = {
    ...createEmptyLayoutDraft(),
    title: preset.label,
    layoutKey: preset.layoutKey,
    summary: preset.summary
  };

  for (const sectionId of preset.sections ?? []) {
    const insertion = insertBlueprintIntoLayout(
      draft.layoutDocument,
      createContainerInsertionTarget(draft.layoutDocument, draft.layoutDocument.rootId, null),
      createLayoutPresetBlueprint(sectionId)
    );
    draft = {
      ...draft,
      layoutDocument: insertion.document
    };
  }

  return draft;
}

function useSelectedNodeState(selection) {
  const selectedNode = selection.draft.layoutDocument?.nodes?.[selection.selectedNodeId] ?? null;
  const selectedParentNode = useMemo(() => {
    const parentId = findParentContainerId(selection.draft.layoutDocument, selection.selectedNodeId);
    if (!parentId) {
      return null;
    }
    return selection.draft.layoutDocument.nodes[parentId] ?? null;
  }, [selection.draft.layoutDocument, selection.selectedNodeId]);
  const selectedSiblingIndex = useMemo(() => {
    if (!selectedParentNode || !selectedNode) {
      return -1;
    }
    return selectedParentNode.children.indexOf(selectedNode.id);
  }, [selectedNode, selectedParentNode]);
  const selectedPathIds = useMemo(
    () => buildNodePath(selection.draft.layoutDocument, selection.selectedNodeId),
    [selection.draft.layoutDocument, selection.selectedNodeId]
  );

  return {
    selectedNode,
    selectedParentNode,
    selectedSiblingIndex,
    selectedPathIds
  };
}

function useLayoutsWorkspaceInternal({ navigate = null, route = {} } = {}) {
  const { supportState, reload } = useLayoutsSupportData();
  const layouts = useMemo(
    () => [...supportState.layouts].sort((left, right) => String(left.title ?? "").localeCompare(String(right.title ?? ""))),
    [supportState.layouts]
  );
  const usageCountByLayoutId = useMemo(() => {
    const next = new Map();
    for (const page of supportState.pages) {
      if (page.layoutId) {
        next.set(page.layoutId, (next.get(page.layoutId) ?? 0) + 1);
      }
    }
    return next;
  }, [supportState.pages]);
  const selection = useLayoutSelection(layouts);
  const selectedLayout = layouts.find((item) => item.id === selection.selectedLayoutId) ?? null;
  const {
    selectedNode,
    selectedParentNode,
    selectedSiblingIndex,
    selectedPathIds
  } = useSelectedNodeState(selection);
  const persistence = useLayoutPersistence(selection, reload);
  const documentActions = useLayoutDocumentActions(selection);
  useLayoutRouteSync({
    layouts,
    navigate,
    route,
    selection
  });
  const { selectedLayoutDeploymentImpact, returnRoute, returnToCallingRoute } =
    useLayoutDeploymentImpact({
      selectedLayout,
      pages: supportState.pages,
      navigate,
      route
    });
  const bindingPreviewPage = useMemo(() => {
    if (returnRoute?.returnPageId) {
      return supportState.pages.find((page) => page.id === returnRoute.returnPageId) ?? null;
    }
    if (selectedLayout?.id) {
      const linkedPage = supportState.pages.find((page) => page.layoutId === selectedLayout.id);
      if (linkedPage) {
        return linkedPage;
      }
    }
    return supportState.pages.find((page) => page.primarySourceType === "blog-post") ?? null;
  }, [returnRoute?.returnPageId, selectedLayout?.id, supportState.pages]);
  const widgetBindingManifest = useMemo(() => {
    const pageSummary = bindingPreviewPage ?? {
      pageKind: "content-detail",
      primarySourceType: "blog-post"
    };
    return resolvePageContextManifest({
      page: {
        pageKind: pageSummary.pageKind ?? "content-detail",
        primarySourceType: pageSummary.primarySourceType ?? "blog-post"
      },
      application: {
        model:
          pageSummary.primarySourceType === "blog-post"
            ? { kind: "post-detail" }
            : pageSummary.primarySourceType === "blog-category"
              ? { kind: "category-detail" }
              : null
      }
    }).manifest;
  }, [bindingPreviewPage]);
  const widgetBindingManifestNote = bindingPreviewPage
    ? `Binding preview follows '${bindingPreviewPage.title ?? bindingPreviewPage.id}'.`
    : "Binding preview is using the default post-detail context contract.";
  const selectionActions = createSelectionActions({
    selection,
    selectedNode,
    selectedParentNode,
    selectedSiblingIndex,
    documentActions,
    createActionState
  });

  const startNewLayoutFromStarter = useCallback((starterId) => {
    selection.setIsCreatingNewLayout(true);
    selection.setSelectedLayoutId(null);
    selection.setDraft(buildStarterDraft(starterId));
    selection.setSelectedNodeId("root");
    selection.setIsNodeDialogOpen(false);
    selection.setIsMoveMode(false);
    selection.setActionState(createActionState());
  }, [
    selection
  ]);

  const openPageTemplate = useCallback((pageId) => {
    if (typeof navigate !== "function" || !pageId) {
      return;
    }
    navigate(
      {
        moduleId: "test-modules-pages",
        pageId
      },
      { replace: false }
    );
  }, [navigate]);

  return {
    supportState,
    layouts,
    usageCountByLayoutId,
    selectedLayoutDeploymentImpact,
    returnRoute,
    returnToCallingRoute,
    mediaItems: supportState.media,
    widgetBindingManifest,
    widgetBindingManifestNote,
    selectedLayout,
    selectedNode,
    selectedPathIds,
    ...selection,
    ...persistence,
    ...documentActions,
    ...selectionActions,
    selectedParentNode,
    startNewLayoutFromStarter,
    openPageTemplate
  };
}

export function useLayoutsWorkspace(options) {
  return useLayoutsWorkspaceInternal(options);
}
