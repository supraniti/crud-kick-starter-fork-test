function parseTimestamp(value) {
  return Date.parse(value ?? "") || 0;
}

function isSuccessfulRun(run) {
  const status = typeof run?.status === "string" ? run.status.toLowerCase() : "";
  return status === "success" || status === "succeeded" || status === "completed";
}

function normalizeItems(items) {
  return Array.isArray(items) ? items : [];
}

export function createTaxonomyPublicationState({ items = [], target = null, latestRun = null }) {
  const publicItems = normalizeItems(items).filter((item) => item?.visibility === "public");

  if (!target) {
    return {
      label: "No Remote",
      tone: "default",
      detail: "No Firestore projection target is configured for this taxonomy branch.",
      publicCount: publicItems.length
    };
  }

  if (target?.targetStatus !== "validated") {
    return {
      label: "Target Unvalidated",
      tone: "warning",
      detail: "Validate the Firestore projection target before relying on taxonomy publication state.",
      publicCount: publicItems.length
    };
  }

  if (publicItems.length === 0) {
    return {
      label: "Nothing To Publish",
      tone: "default",
      detail: "There are no public taxonomy records waiting for remote publication.",
      publicCount: 0
    };
  }

  if (latestRun?.procedureType !== "execute" || !isSuccessfulRun(latestRun)) {
    return {
      label: "Not Synced",
      tone: "warning",
      detail: "Public taxonomy records exist, but no successful projection sync has run yet.",
      publicCount: publicItems.length
    };
  }

  const syncTime = parseTimestamp(latestRun?.finishedOn ?? latestRun?.startedOn);
  const changedCount = publicItems.filter(
    (item) => parseTimestamp(item?.updatedOn ?? item?.createdOn) > syncTime
  ).length;
  if (changedCount > 0) {
    return {
      label: "Changed Locally",
      tone: "warning",
      detail: `${changedCount} public taxonomy record${changedCount === 1 ? "" : "s"} changed after the last successful sync.`,
      publicCount: publicItems.length
    };
  }

  return {
    label: "Synced",
    tone: "success",
    detail: "Public taxonomy records have not changed since the last successful sync.",
    publicCount: publicItems.length
  };
}
