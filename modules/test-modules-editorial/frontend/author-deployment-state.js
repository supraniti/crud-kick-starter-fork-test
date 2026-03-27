function parseTimestamp(value) {
  return Date.parse(value ?? "") || 0;
}

function matchesPostTemplate(page, post) {
  if (!page || !post || page.primarySourceType !== "blog-post" || page.status !== "published") {
    return false;
  }

  if (page.deploymentMode === "per-record" && page.sourceSelectionMode === "all-records") {
    return post.status === "published";
  }

  return page.primarySource?.itemId === post.id;
}

function createState(label, tone, detail) {
  return {
    label,
    tone,
    detail
  };
}

export function resolveAuthorDeploymentState(author, posts = [], pages = []) {
  if (!author?.id) {
    return createState("Unknown", "default", "No author is selected.");
  }

  const publishedPosts = (Array.isArray(posts) ? posts : []).filter(
    (post) => post?.primaryAuthorId === author.id && post?.status === "published"
  );
  if (publishedPosts.length === 0) {
    return createState(
      "Local Only",
      "default",
      "This author is not attached to any published post yet."
    );
  }

  const impactedTemplates = (Array.isArray(pages) ? pages : []).filter((page) =>
    publishedPosts.some((post) => matchesPostTemplate(page, post))
  );
  if (impactedTemplates.length === 0) {
    return createState(
      "No Page",
      "warning",
      "Published posts exist for this author, but no published page template is covering them."
    );
  }

  const missingCount = impactedTemplates.filter((page) => page?.deploymentStatus === "missing").length;
  if (missingCount > 0) {
    return createState(
      "Missing Outputs",
      "warning",
      "A published page using this author is still missing deployed HTML."
    );
  }

  const staleCount = impactedTemplates.filter((page) => page?.deploymentStatus === "stale").length;
  if (staleCount > 0) {
    return createState(
      "Needs Sync",
      "warning",
      "At least one deployed page using this author needs a fresh release."
    );
  }

  const authorChangedOn = parseTimestamp(author?.updatedOn ?? author?.createdOn);
  const needsResyncFromAuthor = impactedTemplates.some((page) => {
    const syncedOn = parseTimestamp(page?.deploymentSyncedOn ?? page?.deploymentLastRunOn);
    return syncedOn === 0 || authorChangedOn > syncedOn;
  });
  if (needsResyncFromAuthor) {
    return createState(
      "Needs Sync",
      "warning",
      "This author changed after the last successful page release."
    );
  }

  return createState(
    "Synced",
    "success",
    "Published pages using this author are currently in sync."
  );
}
