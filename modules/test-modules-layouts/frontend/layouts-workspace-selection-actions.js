import {
  createContainerInsertionTarget,
  createEmptyLayoutDraft,
  createSiblingInsertionTarget
} from "./layout-builder-model.js";

export function createSelectionActions({
  selection,
  selectedNode,
  selectedParentNode,
  selectedSiblingIndex,
  documentActions,
  createActionState
}) {
  return {
    isSelectedNodeMovable: Boolean(selectedNode && selectedNode.id !== selection.draft.layoutDocument.rootId),
    canMoveSelectedBackward: Boolean(selectedParentNode && selectedSiblingIndex > 0),
    canMoveSelectedForward: Boolean(
      selectedParentNode
      && selectedSiblingIndex >= 0
      && selectedSiblingIndex < selectedParentNode.children.length - 1
    ),
    moveSelectedBackward: () => {
      if (!selectedNode || !selectedParentNode || selectedSiblingIndex <= 0) {
        return;
      }
      const previousSiblingId = selectedParentNode.children[selectedSiblingIndex - 1];
      documentActions.moveSelectedNodeTo(
        createSiblingInsertionTarget(selection.draft.layoutDocument, previousSiblingId, "before")
      );
    },
    moveSelectedForward: () => {
      if (
        !selectedNode
        || !selectedParentNode
        || selectedSiblingIndex < 0
        || selectedSiblingIndex >= selectedParentNode.children.length - 1
      ) {
        return;
      }
      const nextSiblingId = selectedParentNode.children[selectedSiblingIndex + 1];
      documentActions.moveSelectedNodeTo(
        createSiblingInsertionTarget(selection.draft.layoutDocument, nextSiblingId, "after")
      );
    },
    moveSelectedToStart: () => {
      if (!selectedNode || !selectedParentNode) {
        return;
      }
      documentActions.moveSelectedNodeTo(
        createContainerInsertionTarget(selection.draft.layoutDocument, selectedParentNode.id, 0)
      );
    },
    moveSelectedToEnd: () => {
      if (!selectedNode || !selectedParentNode) {
        return;
      }
      documentActions.moveSelectedNodeTo(
        createContainerInsertionTarget(selection.draft.layoutDocument, selectedParentNode.id, null)
      );
    },
    selectLayout: (layoutId) => {
      selection.setIsCreatingNewLayout(false);
      selection.setSelectedLayoutId(layoutId);
      selection.setIsNodeDialogOpen(false);
      selection.setIsMoveMode(false);
    },
    startNewLayout: () => {
      selection.setIsCreatingNewLayout(true);
      selection.setSelectedLayoutId(null);
      selection.setSelectedNodeId("root");
      selection.setIsNodeDialogOpen(false);
      selection.setIsMoveMode(false);
      selection.setDraft(createEmptyLayoutDraft());
      selection.setActionState(createActionState());
    }
  };
}
