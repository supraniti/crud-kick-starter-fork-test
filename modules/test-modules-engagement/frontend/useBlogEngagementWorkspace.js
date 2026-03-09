import { useCallback, useEffect, useMemo, useState } from "react";
import { updateReferenceCollectionItem } from "../../../frontend/src/api/reference.js";

const COMMENTS_COLLECTION_ID = "blog-comments";
const DEFAULT_FILTERS = Object.freeze({
  search: "",
  status: "",
  postId: "",
  moderatorId: ""
});

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function optionItems(referenceOptions, collectionId) {
  return Array.isArray(referenceOptions?.[collectionId]?.items)
    ? referenceOptions[collectionId].items
    : [];
}

function createActionState() {
  return {
    saving: false,
    errorMessage: null,
    successMessage: null
  };
}

function buildSummary(comments) {
  return {
    total: comments.length,
    pending: comments.filter((comment) => comment.status === "pending").length,
    approved: comments.filter((comment) => comment.status === "approved").length,
    flagged: comments.filter((comment) => comment.status === "rejected" || comment.status === "spam").length
  };
}

function matchesSearch(comment, search) {
  const normalizedSearch = search.trim().toLowerCase();
  if (normalizedSearch.length === 0) {
    return true;
  }

  return [comment.authorDisplayName, comment.authorEmail, comment.body]
    .filter((value) => typeof value === "string")
    .some((value) => value.toLowerCase().includes(normalizedSearch));
}

function matchesFilters(comment, filters) {
  if (!matchesSearch(comment, filters.search)) {
    return false;
  }
  if (filters.status && comment.status !== filters.status) {
    return false;
  }
  if (filters.postId && comment.postId !== filters.postId) {
    return false;
  }
  if (filters.moderatorId && comment.approvedByAuthorId !== filters.moderatorId) {
    return false;
  }
  return true;
}

function sortByCreatedOn(left, right) {
  return String(right.createdOn ?? "").localeCompare(String(left.createdOn ?? ""));
}

function useCommentSelection(collectionsDomain) {
  const [selectedCommentId, setSelectedCommentId] = useState(null);

  useEffect(() => {
    if (collectionsDomain.activeCollectionId !== COMMENTS_COLLECTION_ID) {
      collectionsDomain.handleSelectCollection(COMMENTS_COLLECTION_ID);
    }
  }, [collectionsDomain.activeCollectionId, collectionsDomain.handleSelectCollection]);

  const comments = useMemo(
    () => toArray(collectionsDomain.collectionItemsState.items).slice().sort(sortByCreatedOn),
    [collectionsDomain.collectionItemsState.items]
  );

  useEffect(() => {
    if (comments.length === 0) {
      setSelectedCommentId(null);
      return;
    }
    if (!selectedCommentId || !comments.some((comment) => comment.id === selectedCommentId)) {
      setSelectedCommentId(comments[0].id);
    }
  }, [comments, selectedCommentId]);

  const selectedComment = useMemo(
    () => comments.find((comment) => comment.id === selectedCommentId) ?? null,
    [comments, selectedCommentId]
  );

  return {
    comments,
    selectedCommentId,
    selectedComment,
    setSelectedCommentId
  };
}

function buildCommentIndex(comments) {
  return new Map(comments.map((comment) => [comment.id, comment]));
}

function resolveThreadRootId(comment, commentIndex) {
  let cursor = comment;
  let iterations = 0;
  while (cursor?.parentCommentId && iterations < commentIndex.size) {
    const parent = commentIndex.get(cursor.parentCommentId);
    if (!parent) {
      break;
    }
    cursor = parent;
    iterations += 1;
  }
  return cursor?.id ?? comment?.id ?? null;
}

function buildThreadItems(comments, selectedCommentId) {
  const commentIndex = buildCommentIndex(comments);
  const selectedComment = commentIndex.get(selectedCommentId) ?? null;
  if (!selectedComment) {
    return [];
  }

  const threadRootId = resolveThreadRootId(selectedComment, commentIndex);
  return comments
    .filter((comment) => resolveThreadRootId(comment, commentIndex) === threadRootId)
    .slice()
    .sort((left, right) => String(left.createdOn ?? "").localeCompare(String(right.createdOn ?? "")));
}

function useModerationActions({
  collectionsDomain,
  comments,
  selectedComment,
  selectedCommentId,
  moderatorId,
  moderationReason,
  setActionState
}) {
  const selectComment = useCallback((commentId) => {
    setActionState(createActionState());
    return commentId;
  }, [setActionState]);

  const runModerationAction = useCallback(
    async (status) => {
      if (!selectedCommentId || !selectedComment) {
        return;
      }

      setActionState({
        saving: true,
        errorMessage: null,
        successMessage: null
      });

      try {
        const result = await updateReferenceCollectionItem({
          collectionId: COMMENTS_COLLECTION_ID,
          itemId: selectedCommentId,
          item: {
            status,
            moderationReason: moderationReason || null,
            approvedByAuthorId: moderatorId || selectedComment.approvedByAuthorId || null
          }
        });
        if (!result?.ok) {
          setActionState({
            saving: false,
            errorMessage: result?.error?.message ?? "Failed to update comment",
            successMessage: null
          });
          return;
        }

        collectionsDomain.reloadCollectionItems();
        setActionState({
          saving: false,
          errorMessage: null,
          successMessage: `Comment marked ${status}`
        });
      } catch (error) {
        setActionState({
          saving: false,
          errorMessage: error?.message ?? "Failed to update comment",
          successMessage: null
        });
      }
    },
    [collectionsDomain, moderationReason, moderatorId, selectedComment, selectedCommentId, setActionState]
  );

  return {
    selectComment: (commentId) => selectComment(commentId) && commentId,
    runModerationAction,
    threadItems: buildThreadItems(comments, selectedCommentId)
  };
}

export function useBlogEngagementWorkspace({ collectionsDomain }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [moderationReason, setModerationReason] = useState("");
  const [selectedModeratorId, setSelectedModeratorId] = useState("");
  const [actionState, setActionState] = useState(createActionState);
  const selection = useCommentSelection(collectionsDomain);
  const referenceOptions = collectionsDomain.referenceOptionsState ?? {};
  const authorOptions = optionItems(referenceOptions, "blog-authors");
  const postOptions = optionItems(referenceOptions, "blog-posts");

  useEffect(() => {
    if (!selectedModeratorId && authorOptions[0]?.id) {
      setSelectedModeratorId(authorOptions[0].id);
    }
  }, [authorOptions, selectedModeratorId]);

  const filteredComments = useMemo(
    () => selection.comments.filter((comment) => matchesFilters(comment, filters)),
    [filters, selection.comments]
  );

  const actions = useModerationActions({
    collectionsDomain,
    comments: selection.comments,
    selectedComment: selection.selectedComment,
    selectedCommentId: selection.selectedCommentId,
    moderatorId: selectedModeratorId,
    moderationReason,
    setActionState
  });

  return {
    comments: selection.comments,
    selectedCommentId: selection.selectedCommentId,
    selectedComment: selection.selectedComment,
    filteredComments,
    summary: buildSummary(selection.comments),
    filters,
    setFilters,
    moderationReason,
    setModerationReason,
    selectedModeratorId,
    setSelectedModeratorId,
    actionState,
    referenceOptions,
    authorOptions,
    postOptions,
    threadItems: actions.threadItems,
    selectComment: selection.setSelectedCommentId,
    runModerationAction: actions.runModerationAction
  };
}
