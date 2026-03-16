function parseTimestamp(value) {
  return Date.parse(value ?? "") || 0;
}

function isSuccessfulRun(run) {
  const status = typeof run?.status === "string" ? run.status.toLowerCase() : "";
  return status === "success" || status === "succeeded" || status === "completed";
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

function createState(label, tone, detail, impactedTemplateCount = 0) {
  return {
    label,
    tone,
    detail,
    impactedTemplateCount
  };
}

export function resolvePostDeploymentState(post, pages = []) {
  if (!post) {
    return createState("Unknown", "default", "No post is selected.");
  }

  if (post.status !== "published") {
    return createState(
      "Local Only",
      "default",
      "This post is not published yet, so no deployed page output is expected."
    );
  }

  const impactedTemplates = (Array.isArray(pages) ? pages : []).filter((page) =>
    matchesPostTemplate(page, post)
  );
  if (impactedTemplates.length === 0) {
    return createState(
      "No Page",
      "warning",
      "This published post is not currently covered by any published page template."
    );
  }

  const missingCount = impactedTemplates.filter((page) => page.deploymentStatus === "missing").length;
  if (missingCount > 0) {
    return createState(
      "Missing Outputs",
      "warning",
      "At least one impacted page template is missing deployed HTML for this post.",
      impactedTemplates.length
    );
  }

  const staleCount = impactedTemplates.filter((page) => page.deploymentStatus === "stale").length;
  if (staleCount > 0) {
    return createState(
      "Needs Deployment",
      "warning",
      "At least one impacted page template is stale and should be redeployed.",
      impactedTemplates.length
    );
  }

  const cleanCount = impactedTemplates.filter((page) => page.deploymentStatus === "clean").length;
  if (cleanCount > 0) {
    return createState(
      "Deployed",
      "success",
      "All impacted published page templates are currently deployed for this post.",
      impactedTemplates.length
    );
  }

  return createState(
    "Pending",
    "default",
    "A page template depends on this post, but deployment state is not resolved yet.",
    impactedTemplates.length
  );
}

export function createContentDeploymentSummary(posts = [], pages = []) {
  const publishedPosts = (Array.isArray(posts) ? posts : []).filter((post) => post?.status === "published");
  const states = publishedPosts.map((post) => resolvePostDeploymentState(post, pages));

  return {
    publishedCount: publishedPosts.length,
    deployedCount: states.filter((state) => state.label === "Deployed").length,
    needsDeploymentCount: states.filter(
      (state) => state.label === "Needs Deployment" || state.label === "Missing Outputs"
    ).length,
    noPageCount: states.filter((state) => state.label === "No Page").length
  };
}

export function createContentProjectionState({ posts = [], target = null, latestRun = null }) {
  const publishedPosts = (Array.isArray(posts) ? posts : []).filter((post) => post?.status === "published");

  if (!target) {
    return createState(
      "No Remote",
      "default",
      "No Firestore projection target is configured for published posts."
    );
  }

  if (target?.targetStatus !== "validated") {
    return createState(
      "Target Unvalidated",
      "warning",
      "Validate the Firestore projection target before relying on remote publication state."
    );
  }

  if (publishedPosts.length === 0) {
    return createState(
      "Nothing To Publish",
      "default",
      "There are no published posts waiting for remote projection."
    );
  }

  if (latestRun?.procedureType !== "execute" || !isSuccessfulRun(latestRun)) {
    return createState(
      "Not Synced",
      "warning",
      "Published posts exist, but no successful Firestore sync has run yet."
    );
  }

  const syncTime = parseTimestamp(latestRun?.finishedOn ?? latestRun?.startedOn);
  const changedCount = publishedPosts.filter(
    (post) => parseTimestamp(post?.updatedOn ?? post?.createdOn) > syncTime
  ).length;
  if (changedCount > 0) {
    return createState(
      "Changed Locally",
      "warning",
      `${changedCount} published post${changedCount === 1 ? "" : "s"} changed after the last successful Firestore sync.`
    );
  }

  return createState(
    "Synced",
    "success",
    "Published posts have not changed since the last successful Firestore sync."
  );
}
