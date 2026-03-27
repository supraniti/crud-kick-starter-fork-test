function parseTimestamp(value) {
  return Date.parse(value ?? "") || 0;
}

export function resolveLayoutDeploymentState(layout, pages = []) {
  if (!layout?.id) {
    return {
      label: "Unknown",
      tone: "default",
      detail: "Select a layout to inspect its sync posture."
    };
  }

  const linkedPages = (Array.isArray(pages) ? pages : []).filter((page) => page?.layoutId === layout.id);
  if (linkedPages.length === 0) {
    return {
      label: "Unused",
      tone: "default",
      detail: "No page templates use this layout yet."
    };
  }

  const publishedPages = linkedPages.filter((page) => page?.status === "published");
  if (publishedPages.length === 0) {
    return {
      label: "Local Only",
      tone: "default",
      detail: "Only draft pages use this layout right now."
    };
  }

  const layoutChangedOn = parseTimestamp(layout?.updatedOn ?? layout?.createdOn);
  const needsSync = publishedPages.some((page) => {
    if (page?.deploymentStatus === "stale" || page?.deploymentStatus === "missing") {
      return true;
    }
    const syncedOn = parseTimestamp(page?.deploymentSyncedOn ?? page?.deploymentLastRunOn);
    return syncedOn === 0 || layoutChangedOn > syncedOn;
  });

  if (needsSync) {
    return {
      label: "Needs Sync",
      tone: "warning",
      detail: "At least one published page using this layout still needs a fresh release."
    };
  }

  return {
    label: "Synced",
    tone: "success",
    detail: "Published pages using this layout are currently in sync."
  };
}
