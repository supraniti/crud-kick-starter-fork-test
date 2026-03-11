import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../../frontend/src/api/reference.js";
import {
  buildPostMutationPayload,
  computeHealth,
  createEmptyDraft,
  normalizeDraftFromSources
} from "./publication-support.js";
import { useContentDeploymentAwareness } from "./blog-content-deployment-awareness.js";

const MODULE_ID = "test-modules-content";
const POSTS_COLLECTION_ID = "blog-posts";
const REVISIONS_COLLECTION_ID = "blog-post-revisions";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createSaveState() {
  return {
    saving: false,
    errorMessage: null,
    successMessage: null
  };
}

function createRevisionState() {
  return {
    loading: false,
    errorMessage: null,
    items: [],
    selectedRevisionId: null
  };
}

function resetSaveMessages(setSaveState) {
  setSaveState((previous) => ({
    ...previous,
    errorMessage: null,
    successMessage: null
  }));
}

function setSavePending(setSaveState) {
  setSaveState({
    saving: true,
    errorMessage: null,
    successMessage: null
  });
}

function setSaveFailure(setSaveState, fallbackMessage, error) {
  setSaveState({
    saving: false,
    errorMessage: error?.message ?? fallbackMessage,
    successMessage: null
  });
}

function setSaveSuccess(setSaveState, message) {
  setSaveState({
    saving: false,
    errorMessage: null,
    successMessage: message
  });
}

async function restorePostRevision({ postId, revisionId, updatedByAuthorId, changeSummary }) {
  const response = await fetch(`/api/reference/modules/${MODULE_ID}/posts/${postId}/restore-revision`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      revisionId,
      updatedByAuthorId,
      changeSummary
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to restore revision");
  }
  return payload;
}

function toggleListValue(values, nextValue) {
  const items = toArray(values);
  return items.includes(nextValue)
    ? items.filter((item) => item !== nextValue)
    : [...items, nextValue];
}

function buildSummary(posts) {
  return {
    total: posts.length,
    drafts: posts.filter((post) => post.status === "draft").length,
    scheduled: posts.filter((post) => post.status === "scheduled").length,
    published: posts.filter((post) => post.status === "published").length
  };
}

function syncSelectedPost({
  isCreatingNew,
  pendingPostId,
  posts,
  selectedPostId,
  setSelectedPostId,
  setPendingPostId,
  setDraft
}) {
  if (posts.length === 0) {
    setPendingPostId(null);
    setSelectedPostId(null);
    setDraft(createEmptyDraft());
    return;
  }

  if (pendingPostId) {
    const pendingPost = posts.find((post) => post.id === pendingPostId) ?? null;
    if (!pendingPost) {
      return;
    }

    setPendingPostId(null);
    setSelectedPostId(pendingPost.id);
    setDraft(normalizeDraftFromSources(pendingPost));
    return;
  }

  if (isCreatingNew) {
    return;
  }

  if (!selectedPostId || !posts.some((post) => post.id === selectedPostId)) {
    setSelectedPostId(posts[0].id);
    return;
  }

  const nextSelectedPost = posts.find((post) => post.id === selectedPostId) ?? null;
  if (nextSelectedPost) {
    setDraft(normalizeDraftFromSources(nextSelectedPost));
  }
}

function usePostSelection(collectionsDomain) {
  const [pendingPostId, setPendingPostId] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [draft, setDraft] = useState(createEmptyDraft);

  useEffect(() => {
    if (collectionsDomain.activeCollectionId !== POSTS_COLLECTION_ID) {
      collectionsDomain.handleSelectCollection(POSTS_COLLECTION_ID);
    }
  }, [collectionsDomain.activeCollectionId, collectionsDomain.handleSelectCollection]);

  const posts = useMemo(
    () => toArray(collectionsDomain.collectionItemsState.items),
    [collectionsDomain.collectionItemsState.items]
  );
  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId]
  );

  useEffect(() => {
    syncSelectedPost({
      isCreatingNew,
      pendingPostId,
      posts,
      selectedPostId,
      setSelectedPostId,
      setPendingPostId,
      setDraft
    });
  }, [isCreatingNew, pendingPostId, posts, selectedPostId]);

  return {
    isCreatingNew,
    pendingPostId,
    posts,
    selectedPostId,
    selectedPost,
    draft,
    setIsCreatingNew,
    setPendingPostId,
    setSelectedPostId,
    setDraft
  };
}

function sortRevisions(items) {
  return toArray(items).sort(
    (left, right) => (right?.revisionNumber ?? 0) - (left?.revisionNumber ?? 0)
  );
}

function useRevisionTimeline(selectedPostId) {
  const [revisionState, setRevisionState] = useState(createRevisionState);

  const loadRevisions = useCallback(async (postId) => {
    if (typeof postId !== "string" || postId.length === 0) {
      setRevisionState(createRevisionState());
      return;
    }

    setRevisionState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));

    try {
      const payload = await fetchReferenceCollectionItems({
        collectionId: REVISIONS_COLLECTION_ID,
        postId,
        limit: 200
      });
      const items = sortRevisions(payload?.items);
      setRevisionState({
        loading: false,
        errorMessage: null,
        items,
        selectedRevisionId: items[0]?.id ?? null
      });
    } catch (error) {
      setRevisionState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load revisions",
        items: [],
        selectedRevisionId: null
      });
    }
  }, []);

  useEffect(() => {
    void loadRevisions(selectedPostId);
  }, [loadRevisions, selectedPostId]);

  const selectedRevision = useMemo(
    () => revisionState.items.find((item) => item.id === revisionState.selectedRevisionId) ?? null,
    [revisionState.items, revisionState.selectedRevisionId]
  );

  const selectRevision = useCallback((revisionId) => {
    setRevisionState((previous) => ({
      ...previous,
      selectedRevisionId: revisionId
    }));
  }, []);

  return {
    revisionState,
    selectedRevision,
    loadRevisions,
    selectRevision,
    setRevisionState
  };
}

async function savePost({
  isCreatingNew,
  mutationDraft,
  selectedPost,
  selectedPostId,
  collectionsDomain,
  loadRevisions,
  setDraft,
  setIsCreatingNew,
  setPendingPostId,
  reloadDeploymentAwareness,
  setSelectedPostId,
  setSaveState
}) {
  setSavePending(setSaveState);
  const payload = buildPostMutationPayload(mutationDraft, selectedPost);

  try {
    const result = selectedPostId
      ? await updateReferenceCollectionItem({
          collectionId: POSTS_COLLECTION_ID,
          itemId: selectedPostId,
          item: payload
        })
      : await createReferenceCollectionItem({
          collectionId: POSTS_COLLECTION_ID,
          item: payload
        });

    if (!result?.ok) {
      setSaveFailure(setSaveState, "Failed to save post", result?.error);
      return { ok: false };
    }

    const savedItem = result.item ?? null;
    if (savedItem?.id) {
      if (isCreatingNew) {
        setIsCreatingNew(false);
        setPendingPostId(savedItem.id);
      } else {
        setPendingPostId(null);
      }
      setSelectedPostId(savedItem.id);
      setDraft(normalizeDraftFromSources(savedItem));
      void loadRevisions(savedItem.id);
    }

    collectionsDomain.reloadCollectionItems();
    await reloadDeploymentAwareness();
    setSaveSuccess(setSaveState, selectedPostId ? "Post updated" : "Post created");
    return {
      ok: true,
      item: savedItem
    };
  } catch (error) {
    setSaveFailure(setSaveState, "Failed to save post", error);
    return { ok: false };
  }
}

async function restoreRevision({
  collectionsDomain,
  draft,
  loadRevisions,
  postId,
  reloadDeploymentAwareness,
  revisionId,
  setDraft,
  setSaveState
}) {
  setSavePending(setSaveState);

  try {
    const result = await restorePostRevision({
      postId,
      revisionId,
      updatedByAuthorId: draft.updatedByAuthorId,
      changeSummary: `Rollback to revision ${revisionId}`
    });
    collectionsDomain.reloadCollectionItems();
    if (result?.item) {
      setDraft(normalizeDraftFromSources(result.item));
    }
    await loadRevisions(postId);
    await reloadDeploymentAwareness();
    setSaveSuccess(setSaveState, "Revision restored");
  } catch (error) {
    setSaveFailure(setSaveState, "Failed to restore revision", error);
  }
}

function useDraftActions({
  setDraft,
  setIsCreatingNew,
  setPendingPostId,
  setRevisionState,
  setSaveState,
  setSelectedPostId
}) {
  const selectPost = useCallback(
    (postId, posts) => {
      const nextPost = posts.find((post) => post.id === postId) ?? null;
      setIsCreatingNew(false);
      setPendingPostId(null);
      setSelectedPostId(postId);
      setDraft(nextPost ? normalizeDraftFromSources(nextPost) : createEmptyDraft());
      setSaveState(createSaveState());
    },
    [setDraft, setIsCreatingNew, setPendingPostId, setSaveState, setSelectedPostId]
  );

  const startNew = useCallback(() => {
    setIsCreatingNew(true);
    setPendingPostId(null);
    setSelectedPostId(null);
    setDraft((previous) => ({
      ...createEmptyDraft(),
      primaryAuthorId: previous.primaryAuthorId,
      createdByAuthorId: previous.createdByAuthorId,
      updatedByAuthorId: previous.updatedByAuthorId
    }));
    setRevisionState(createRevisionState());
    setSaveState(createSaveState());
  }, [
    setDraft,
    setIsCreatingNew,
    setPendingPostId,
    setRevisionState,
    setSaveState,
    setSelectedPostId
  ]);

  const changeField = useCallback(
    (fieldId, value) => {
      setDraft((previous) => ({
        ...previous,
        [fieldId]: value
      }));
      resetSaveMessages(setSaveState);
    },
    [setDraft, setSaveState]
  );

  const toggleFieldValue = useCallback(
    (fieldId, value) => {
      setDraft((previous) => ({
        ...previous,
        [fieldId]: toggleListValue(previous[fieldId], value)
      }));
      resetSaveMessages(setSaveState);
    },
    [setDraft, setSaveState]
  );

  return {
    selectPost,
    startNew,
    changeField,
    toggleFieldValue
  };
}

function useWorkspaceActions({
  collectionsDomain,
  draft,
  isCreatingNew,
  loadRevisions,
  reloadDeploymentAwareness,
  selectedPost,
  selectedPostId,
  setDraft,
  setIsCreatingNew,
  setPendingPostId,
  setRevisionState,
  setSaveState,
  setSelectedPostId
}) {
  const draftActions = useDraftActions({
    setDraft,
    setIsCreatingNew,
    setPendingPostId,
    setRevisionState,
    setSaveState,
    setSelectedPostId
  });

  const persistPost = useCallback(
    async (nextDraft) =>
      savePost({
        isCreatingNew,
        mutationDraft: nextDraft ?? draft,
        selectedPost,
        selectedPostId,
        collectionsDomain,
        loadRevisions,
        reloadDeploymentAwareness,
        setDraft,
        setIsCreatingNew,
        setPendingPostId,
        setSelectedPostId,
        setSaveState
      }),
    [
      collectionsDomain,
      draft,
      isCreatingNew,
      loadRevisions,
      reloadDeploymentAwareness,
      selectedPost,
      selectedPostId,
      setDraft,
      setIsCreatingNew,
      setPendingPostId,
      setSaveState,
      setSelectedPostId
    ]
  );

  const runLifecycleAction = useCallback(
    async (status) => {
      if (!selectedPostId) {
        return;
      }
      await persistPost({
        ...draft,
        status
      });
    },
    [draft, persistPost, selectedPostId]
  );

  const restoreSelectedRevision = useCallback(
    async (revisionId) => {
      if (!selectedPostId) {
        return;
      }
      await restoreRevision({
        collectionsDomain,
        draft,
        loadRevisions,
        postId: selectedPostId,
        reloadDeploymentAwareness,
        revisionId,
        setDraft,
        setSaveState
      });
    },
    [collectionsDomain, draft, loadRevisions, reloadDeploymentAwareness, selectedPostId, setDraft, setSaveState]
  );

  return {
    ...draftActions,
    persistPost,
    runLifecycleAction,
    restoreRevision: restoreSelectedRevision
  };
}

export function useBlogContentWorkspace({ collectionsDomain }) {
  const [saveState, setSaveState] = useState(createSaveState);
  const selection = usePostSelection(collectionsDomain);
  const deploymentAwareness = useContentDeploymentAwareness({
    selectedPost: selection.selectedPost
  });
  const revisions = useRevisionTimeline(selection.selectedPostId);
  const summary = useMemo(() => buildSummary(selection.posts), [selection.posts]);
  const postHealthMap = useMemo(
    () => new Map(selection.posts.map((post) => [post.id, computeHealth(post)])),
    [selection.posts]
  );
  const actions = useWorkspaceActions({
    collectionsDomain,
    draft: selection.draft,
    isCreatingNew: selection.isCreatingNew,
    loadRevisions: revisions.loadRevisions,
    reloadDeploymentAwareness: deploymentAwareness.reload,
    selectedPost: selection.selectedPost,
    selectedPostId: selection.selectedPostId,
    setDraft: selection.setDraft,
    setIsCreatingNew: selection.setIsCreatingNew,
    setPendingPostId: selection.setPendingPostId,
    setRevisionState: revisions.setRevisionState,
    setSaveState,
    setSelectedPostId: selection.setSelectedPostId
  });
  const selectPost = useCallback(
    (postId) => actions.selectPost(postId, selection.posts),
    [actions.selectPost, selection.posts]
  );

  return {
    posts: selection.posts,
    selectedPostId: selection.selectedPostId,
    selectedPost: selection.selectedPost,
    draft: selection.draft,
    saveState,
    revisionState: revisions.revisionState,
    selectedRevision: revisions.selectedRevision,
    summary,
    referenceOptions: collectionsDomain.referenceOptionsState ?? {},
    deploymentAwareness,
    postHealthMap,
    selectPost,
    startNew: actions.startNew,
    changeField: actions.changeField,
    toggleFieldValue: actions.toggleFieldValue,
    persistPost: actions.persistPost,
    runLifecycleAction: actions.runLifecycleAction,
    restoreRevision: actions.restoreRevision,
    selectRevision: revisions.selectRevision
  };
}
