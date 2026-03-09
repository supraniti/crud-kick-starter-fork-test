const pendingRevisionMetaByPostId = new Map();

function queueNextRevisionMeta(postId, meta = {}) {
  if (typeof postId !== "string" || postId.length === 0) {
    return;
  }

  pendingRevisionMetaByPostId.set(postId, {
    ...meta
  });
}

function consumeNextRevisionMeta(postId) {
  if (typeof postId !== "string" || postId.length === 0) {
    return null;
  }

  const meta = pendingRevisionMetaByPostId.get(postId) ?? null;
  pendingRevisionMetaByPostId.delete(postId);
  return meta;
}

function clearQueuedRevisionMeta(postId) {
  if (typeof postId !== "string" || postId.length === 0) {
    return;
  }

  pendingRevisionMetaByPostId.delete(postId);
}

export {
  clearQueuedRevisionMeta,
  consumeNextRevisionMeta,
  queueNextRevisionMeta
};
