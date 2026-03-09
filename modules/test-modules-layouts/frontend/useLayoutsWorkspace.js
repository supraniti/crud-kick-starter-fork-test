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
  resolveCreationTarget,
  moveNodeInLayout,
  removeNodeFromLayout,
  resolveInsertionTarget,
  updateNodeInLayout
} from "./layout-builder-model.js";

const LAYOUTS_COLLECTION_ID = "page-layouts";
const PAGES_COLLECTION_ID = "blog-pages";

function createActionState() {
  return {
    saving: false,
    deleting: false,
    errorMessage: null,
    successMessage: null
  };
}

async function loadSupportData() {
  const [layoutsPayload, pagesPayload] = await Promise.all([
    fetchReferenceCollectionItems({
      collectionId: LAYOUTS_COLLECTION_ID,
      limit: 200
    }),
    fetchReferenceCollectionItems({
      collectionId: PAGES_COLLECTION_ID,
      limit: 500
    })
  ]);

  return {
    layouts: Array.isArray(layoutsPayload?.items) ? layoutsPayload.items : [],
    pages: Array.isArray(pagesPayload?.items) ? pagesPayload.items : []
  };
}

function useLayoutsSupportData() {
  const [supportState, setSupportState] = useState({
    loading: true,
    errorMessage: null,
    layouts: [],
    pages: []
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
        pages: []
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
      setDraft(createEmptyLayoutDraft());
      setSelectedNodeId("root");
      return;
    }
    const selectedLayout = layouts.find((item) => item.id === selectedLayoutId) ?? null;
    if (!selectedLayout) {
      setDraft(createEmptyLayoutDraft());
      setSelectedNodeId("root");
      return;
    }
    setDraft(createLayoutDraftFromItem(selectedLayout));
    setSelectedNodeId(selectedLayout.layoutDocument?.rootId ?? "root");
    setActionState(createActionState());
  }, [isCreatingNewLayout, layouts, selectedLayoutId]);

  return {
    selectedLayoutId,
    isCreatingNewLayout,
    draft,
    selectedNodeId,
    actionState,
    setSelectedLayoutId,
    setIsCreatingNewLayout,
    setDraft,
    setSelectedNodeId,
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
    setSelectedNodeId
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
  }, [draft, isCreatingNewLayout, reload, selectedLayoutId, setActionState, setDraft, setIsCreatingNewLayout, setSelectedLayoutId]);

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
  }, [reload, selectedLayoutId, setActionState, setDraft, setIsCreatingNewLayout, setSelectedNodeId]);

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

function useLayoutDocumentActions(selection) {
  const { draft, selectedNodeId, setDraft, setSelectedNodeId, setActionState } = selection;

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
    insertBlockAt: (target) => insertNode(target, "block"),
    insertContainerAt: (target, layoutMode) => insertNode(target, "container", { layoutMode }),
    addBlock: () => insertNode(
      resolveCreationTarget(draft.layoutDocument, selectedNodeId ?? draft.layoutDocument.rootId),
      "block"
    ),
    addContainer: (layoutMode) => insertNode(
      resolveCreationTarget(draft.layoutDocument, selectedNodeId ?? draft.layoutDocument.rootId),
      "container",
      { layoutMode }
    ),
    removeSelectedNode: () => {
      if (!hasMutableSelection(selectedNodeId, draft.layoutDocument.rootId)) {
        return;
      }
      setDraftWithReset((previous) => ({
        ...previous,
        layoutDocument: removeNodeFromLayout(previous.layoutDocument, selectedNodeId)
      }));
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
      const target = resolveInsertionTarget(draft.layoutDocument, overId);
      setDraftWithReset((previous) => ({
        ...previous,
        layoutDocument: moveNodeInLayout(previous.layoutDocument, activeId, target.containerId, target.index)
      }));
    },
    addBlockBeforeSelected: () => insertRelativeToSelection("before", "block"),
    addBlockAfterSelected: () => insertRelativeToSelection("after", "block"),
    addContainerBeforeSelected: (layoutMode) => insertRelativeToSelection("before", "container", { layoutMode }),
    addContainerAfterSelected: (layoutMode) => insertRelativeToSelection("after", "container", { layoutMode }),
    appendBlockToContainer: (containerId) => appendIntoContainer(containerId, "block"),
    appendContainerToContainer: (containerId, layoutMode) => appendIntoContainer(containerId, "container", { layoutMode })
  };
}

export function useLayoutsWorkspace() {
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
  const selectedNode = selection.draft.layoutDocument?.nodes?.[selection.selectedNodeId] ?? null;
  const selectedPathIds = useMemo(
    () => buildNodePath(selection.draft.layoutDocument, selection.selectedNodeId),
    [selection.draft.layoutDocument, selection.selectedNodeId]
  );
  const persistence = useLayoutPersistence(selection, reload);
  const documentActions = useLayoutDocumentActions(selection);

  return {
    supportState,
    layouts,
    usageCountByLayoutId,
    selectedLayout,
    selectedNode,
    selectedPathIds,
    ...selection,
    ...persistence,
    ...documentActions,
    selectLayout: (layoutId) => {
      selection.setIsCreatingNewLayout(false);
      selection.setSelectedLayoutId(layoutId);
    },
    startNewLayout: () => {
      selection.setIsCreatingNewLayout(true);
      selection.setSelectedLayoutId(null);
      selection.setSelectedNodeId("root");
      selection.setDraft(createEmptyLayoutDraft());
      selection.setActionState(createActionState());
    }
  };
}
