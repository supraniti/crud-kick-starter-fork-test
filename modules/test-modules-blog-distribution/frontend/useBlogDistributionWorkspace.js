import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../../frontend/src/api/reference.js";
import {
  buildDistributionSummary,
  buildReadinessIssues,
  matchesPostFilters,
  matchesRedirectFilters,
  sortPostsForQueue,
  sortRedirectRules
} from "./distribution-readiness.js";

const MODULE_ID = "test-modules-blog-distribution";
const AUTHORS_COLLECTION_ID = "blog-authors";
const POSTS_COLLECTION_ID = "blog-posts";
const REDIRECTS_COLLECTION_ID = "blog-redirect-rules";

const DEFAULT_POST_FILTERS = Object.freeze({
  search: "",
  status: "",
  readiness: ""
});
const DEFAULT_REDIRECT_FILTERS = Object.freeze({
  search: "",
  status: "",
  httpCode: "",
  targetPostId: ""
});
const EMPTY_REDIRECT_DRAFT = Object.freeze({
  sourcePath: "",
  targetPostId: "",
  targetUrl: "",
  httpCode: "301",
  status: "active",
  reason: ""
});

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createActionState() {
  return {
    saving: false,
    errorMessage: null,
    successMessage: null
  };
}

function createSupportState() {
  return {
    loading: false,
    errorMessage: null,
    posts: [],
    authors: []
  };
}

function normalizeRedirectDraft(rule = {}) {
  return {
    sourcePath: rule.sourcePath ?? "",
    targetPostId: rule.targetPostId ?? "",
    targetUrl: rule.targetUrl ?? "",
    httpCode: rule.httpCode ?? "301",
    status: rule.status ?? "active",
    reason: rule.reason ?? ""
  };
}

async function loadSupportData() {
  const [postsPayload, authorsPayload] = await Promise.all([
    fetchReferenceCollectionItems({
      collectionId: POSTS_COLLECTION_ID,
      limit: 200
    }),
    fetchReferenceCollectionItems({
      collectionId: AUTHORS_COLLECTION_ID,
      limit: 200
    })
  ]);

  return {
    posts: toArray(postsPayload?.items),
    authors: toArray(authorsPayload?.items)
  };
}

async function publishScheduledPost({ postId, updatedByAuthorId }) {
  const response = await fetch(`/api/reference/modules/${MODULE_ID}/posts/${postId}/publish-now`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      updatedByAuthorId
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Failed to publish scheduled post");
  }
  return payload;
}

function resolveActorOptions(authors) {
  return authors
    .filter((author) => author.status === "active")
    .filter((author) => author.role === "editor" || author.role === "managing-editor");
}

async function saveRedirectRule(selectedRedirectId, redirectDraft) {
  const payload = {
    sourcePath: redirectDraft.sourcePath,
    targetPostId: redirectDraft.targetPostId || null,
    targetUrl: redirectDraft.targetUrl || null,
    httpCode: redirectDraft.httpCode,
    status: redirectDraft.status,
    reason: redirectDraft.reason || null
  };

  return selectedRedirectId
    ? updateReferenceCollectionItem({
        collectionId: REDIRECTS_COLLECTION_ID,
        itemId: selectedRedirectId,
        item: payload
      })
    : createReferenceCollectionItem({
        collectionId: REDIRECTS_COLLECTION_ID,
        item: payload
      });
}

function useDistributionSupport() {
  const [supportState, setSupportState] = useState(createSupportState);

  const reloadSupportData = useCallback(async () => {
    setSupportState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));

    try {
      const nextState = await loadSupportData();
      setSupportState({
        loading: false,
        errorMessage: null,
        ...nextState
      });
    } catch (error) {
      setSupportState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load blog distribution data",
        posts: [],
        authors: []
      });
    }
  }, []);

  useEffect(() => {
    void reloadSupportData();
  }, [reloadSupportData]);

  const posts = useMemo(() => sortPostsForQueue(supportState.posts), [supportState.posts]);
  const readinessMap = useMemo(
    () => new Map(posts.map((post) => [post.id, buildReadinessIssues(post)])),
    [posts]
  );
  const actorOptions = useMemo(() => resolveActorOptions(supportState.authors), [supportState.authors]);
  const authorMap = useMemo(
    () => new Map(supportState.authors.map((author) => [author.id, author])),
    [supportState.authors]
  );

  return {
    supportState,
    reloadSupportData,
    posts,
    readinessMap,
    actorOptions,
    authorMap
  };
}

function usePostSelection(posts) {
  const [selectedPostId, setSelectedPostId] = useState(null);

  useEffect(() => {
    if (posts.length === 0) {
      setSelectedPostId(null);
      return;
    }
    if (!selectedPostId || !posts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(posts[0].id);
    }
  }, [posts, selectedPostId]);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId]
  );

  return {
    selectedPostId,
    selectedPost,
    setSelectedPostId
  };
}

function usePostWorkspace({ posts, readinessMap, actorOptions, reloadSupportData }) {
  const selection = usePostSelection(posts);
  const [postFilters, setPostFilters] = useState(DEFAULT_POST_FILTERS);
  const [selectedActorId, setSelectedActorId] = useState("");
  const [postActionState, setPostActionState] = useState(createActionState);

  useEffect(() => {
    if (!selectedActorId && actorOptions[0]?.id) {
      setSelectedActorId(actorOptions[0].id);
      return;
    }
    if (selectedActorId && !actorOptions.some((author) => author.id === selectedActorId)) {
      setSelectedActorId(actorOptions[0]?.id ?? "");
    }
  }, [actorOptions, selectedActorId]);

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) =>
        matchesPostFilters(post, postFilters, readinessMap.get(post.id) ?? [])
      ),
    [postFilters, posts, readinessMap]
  );

  const publishSelectedPost = useCallback(async () => {
    if (!selection.selectedPost || !selectedActorId) {
      return;
    }

    setPostActionState({
      saving: true,
      errorMessage: null,
      successMessage: null
    });

    try {
      await publishScheduledPost({
        postId: selection.selectedPost.id,
        updatedByAuthorId: selectedActorId
      });
      await reloadSupportData();
      setPostActionState({
        saving: false,
        errorMessage: null,
        successMessage: "Scheduled post published"
      });
    } catch (error) {
      setPostActionState({
        saving: false,
        errorMessage: error?.message ?? "Failed to publish scheduled post",
        successMessage: null
      });
    }
  }, [reloadSupportData, selectedActorId, selection.selectedPost]);

  return {
    filteredPosts,
    postFilters,
    selectedActorId,
    postActionState,
    setPostFilters,
    setSelectedActorId,
    publishSelectedPost,
    ...selection
  };
}

function useRedirectFilters(redirects) {
  const [redirectFilters, setRedirectFilters] = useState(DEFAULT_REDIRECT_FILTERS);
  const filteredRedirects = useMemo(
    () => redirects.filter((rule) => matchesRedirectFilters(rule, redirectFilters)),
    [redirectFilters, redirects]
  );

  return {
    redirectFilters,
    filteredRedirects,
    setRedirectFilters
  };
}

function useRedirectEditorState(redirects) {
  const [selectedRedirectId, setSelectedRedirectId] = useState(null);
  const [redirectDraft, setRedirectDraft] = useState(EMPTY_REDIRECT_DRAFT);
  const [redirectActionState, setRedirectActionState] = useState(createActionState);

  useEffect(() => {
    if (redirects.length === 0 && selectedRedirectId) {
      setSelectedRedirectId(null);
      setRedirectDraft(EMPTY_REDIRECT_DRAFT);
      return;
    }
    if (!selectedRedirectId || !redirects.some((rule) => rule.id === selectedRedirectId)) {
      return;
    }
    const selectedRule = redirects.find((rule) => rule.id === selectedRedirectId) ?? null;
    if (selectedRule) {
      setRedirectDraft(normalizeRedirectDraft(selectedRule));
    }
  }, [redirects, selectedRedirectId]);

  const selectedRedirect = useMemo(
    () => redirects.find((rule) => rule.id === selectedRedirectId) ?? null,
    [redirects, selectedRedirectId]
  );

  const selectRedirect = useCallback(
    (ruleId) => {
      const rule = redirects.find((item) => item.id === ruleId) ?? null;
      setSelectedRedirectId(ruleId);
      setRedirectDraft(rule ? normalizeRedirectDraft(rule) : EMPTY_REDIRECT_DRAFT);
      setRedirectActionState(createActionState());
    },
    [redirects]
  );

  const startNewRedirect = useCallback(() => {
    setSelectedRedirectId(null);
    setRedirectDraft(EMPTY_REDIRECT_DRAFT);
    setRedirectActionState(createActionState());
  }, []);

  const changeRedirectField = useCallback((fieldId, value) => {
    setRedirectDraft((previous) => ({
      ...previous,
      [fieldId]: value
    }));
    setRedirectActionState((previous) => ({
      ...previous,
      errorMessage: null,
      successMessage: null
    }));
  }, []);

  return {
    selectedRedirectId,
    selectedRedirect,
    redirectDraft,
    redirectActionState,
    setSelectedRedirectId,
    setRedirectDraft,
    setRedirectActionState,
    selectRedirect,
    startNewRedirect,
    changeRedirectField
  };
}

function useRedirectMutations({
  collectionsDomain,
  selectedRedirectId,
  selectedRedirect,
  redirectDraft,
  setSelectedRedirectId,
  setRedirectDraft,
  setRedirectActionState
}) {
  const persistRedirect = useCallback(async () => {
    setRedirectActionState({
      saving: true,
      errorMessage: null,
      successMessage: null
    });

    try {
      const result = await saveRedirectRule(selectedRedirectId, redirectDraft);
      if (!result?.ok) {
        setRedirectActionState({
          saving: false,
          errorMessage: result?.error?.message ?? "Failed to save redirect rule",
          successMessage: null
        });
        return;
      }

      collectionsDomain.reloadCollectionItems();
      if (result.item?.id) {
        setSelectedRedirectId(result.item.id);
        setRedirectDraft(normalizeRedirectDraft(result.item));
      }
      setRedirectActionState({
        saving: false,
        errorMessage: null,
        successMessage: selectedRedirectId ? "Redirect updated" : "Redirect created"
      });
    } catch (error) {
      setRedirectActionState({
        saving: false,
        errorMessage: error?.message ?? "Failed to save redirect rule",
        successMessage: null
      });
    }
  }, [
    collectionsDomain,
    redirectDraft,
    selectedRedirectId,
    setRedirectActionState,
    setRedirectDraft,
    setSelectedRedirectId
  ]);

  const disableSelectedRedirect = useCallback(async () => {
    if (!selectedRedirect) {
      return;
    }

    setRedirectActionState({
      saving: true,
      errorMessage: null,
      successMessage: null
    });

    try {
      const result = await updateReferenceCollectionItem({
        collectionId: REDIRECTS_COLLECTION_ID,
        itemId: selectedRedirect.id,
        item: {
          status: "disabled"
        }
      });
      if (!result?.ok) {
        setRedirectActionState({
          saving: false,
          errorMessage: result?.error?.message ?? "Failed to disable redirect rule",
          successMessage: null
        });
        return;
      }

      collectionsDomain.reloadCollectionItems();
      setRedirectActionState({
        saving: false,
        errorMessage: null,
        successMessage: "Redirect disabled"
      });
    } catch (error) {
      setRedirectActionState({
        saving: false,
        errorMessage: error?.message ?? "Failed to disable redirect rule",
        successMessage: null
      });
    }
  }, [collectionsDomain, selectedRedirect, setRedirectActionState]);

  return {
    persistRedirect,
    disableSelectedRedirect
  };
}

function useRedirectWorkspace({ collectionsDomain }) {
  const redirects = useMemo(
    () => sortRedirectRules(toArray(collectionsDomain.collectionItemsState.items)),
    [collectionsDomain.collectionItemsState.items]
  );
  const filters = useRedirectFilters(redirects);
  const editor = useRedirectEditorState(redirects);
  const mutations = useRedirectMutations({
    collectionsDomain,
    selectedRedirectId: editor.selectedRedirectId,
    selectedRedirect: editor.selectedRedirect,
    redirectDraft: editor.redirectDraft,
    setSelectedRedirectId: editor.setSelectedRedirectId,
    setRedirectDraft: editor.setRedirectDraft,
    setRedirectActionState: editor.setRedirectActionState
  });

  useEffect(() => {
    if (collectionsDomain.activeCollectionId !== REDIRECTS_COLLECTION_ID) {
      collectionsDomain.handleSelectCollection(REDIRECTS_COLLECTION_ID);
    }
  }, [collectionsDomain.activeCollectionId, collectionsDomain.handleSelectCollection]);

  return {
    redirects,
    ...filters,
    ...editor,
    ...mutations
  };
}

export function useBlogDistributionWorkspace({ collectionsDomain }) {
  const support = useDistributionSupport();
  const postWorkspace = usePostWorkspace({
    posts: support.posts,
    readinessMap: support.readinessMap,
    actorOptions: support.actorOptions,
    reloadSupportData: support.reloadSupportData
  });
  const redirectWorkspace = useRedirectWorkspace({
    collectionsDomain
  });

  return {
    ...support,
    ...postWorkspace,
    ...redirectWorkspace,
    summary: buildDistributionSummary({
      posts: support.posts,
      redirects: redirectWorkspace.redirects,
      readinessMap: support.readinessMap
    })
  };
}
