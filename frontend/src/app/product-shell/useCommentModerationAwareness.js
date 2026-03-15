import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchReferenceCollectionItems } from "../../api/reference.js";

const POSTS_COLLECTION_ID = "blog-posts";

const REMOTE_COMMENT_CONTRACT = Object.freeze({
  dataset: "post-comments",
  query: "comments.byPost",
  action: "comments.submit",
  getPath: "/api/reference/collections/blog-comments/items",
  postPath: "/api/reference/collections/blog-comments/items"
});

function createState() {
  return {
    loading: false,
    errorMessage: null,
    items: []
  };
}

function normalizeItems(payload) {
  return Array.isArray(payload?.items) ? payload.items : [];
}

function isCommentEnabled(post) {
  return post?.allowComments !== false && post?.commentPolicy !== "closed";
}

function isPublished(post) {
  return post?.status === "published";
}

function buildPostSummary(posts) {
  const publishedPosts = posts.filter(isPublished);
  return {
    totalPosts: posts.length,
    publishedPosts: publishedPosts.length,
    publishedCommentEnabledPosts: publishedPosts.filter(isCommentEnabled).length,
    publishedClosedPosts: publishedPosts.filter((post) => !isCommentEnabled(post)).length
  };
}

export function useCommentModerationAwareness({ selectedComment }) {
  const [state, setState] = useState(createState);

  const reload = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));
    try {
      const payload = await fetchReferenceCollectionItems({
        collectionId: POSTS_COLLECTION_ID,
        limit: 200
      });
      setState({
        loading: false,
        errorMessage: payload?.ok === false ? payload?.error?.message ?? "Failed to load posts" : null,
        items: payload?.ok === false ? [] : normalizeItems(payload)
      });
    } catch (error) {
      setState({
        loading: false,
        errorMessage: error?.message ?? "Failed to load posts",
        items: []
      });
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const postById = useMemo(() => new Map(state.items.map((item) => [item.id, item])), [state.items]);
  const selectedPost = useMemo(
    () => (selectedComment?.postId ? postById.get(selectedComment.postId) ?? null : null),
    [postById, selectedComment?.postId]
  );

  return {
    state,
    postSummary: buildPostSummary(state.items),
    selectedPost,
    remoteContract: REMOTE_COMMENT_CONTRACT,
    reload
  };
}
