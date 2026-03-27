function parseTimestamp(value) {
  return Date.parse(value ?? "") || 0;
}

function isSuccessfulRun(run) {
  const status = typeof run?.status === "string" ? run.status.toLowerCase() : "";
  return status === "success" || status === "succeeded" || status === "completed";
}

export function resolveTaxonomyDeploymentState(item, latestRun, target) {
  if (!item) {
    return {
      label: "Unknown",
      tone: "default"
    };
  }

  if (item.visibility === "internal") {
    return {
      label: "Local Only",
      tone: "default"
    };
  }

  if (!target) {
    return {
      label: "No Remote",
      tone: "warning"
    };
  }

  if (!isSuccessfulRun(latestRun) || latestRun?.procedureType !== "execute") {
    return {
      label: "Needs Sync",
      tone: "warning"
    };
  }

  const syncedOn = parseTimestamp(latestRun?.finishedOn ?? latestRun?.startedOn);
  const changedOn = parseTimestamp(item?.updatedOn ?? item?.createdOn);
  if (changedOn > syncedOn) {
    return {
      label: "Needs Sync",
      tone: "warning"
    };
  }

  return {
    label: "Synced",
    tone: "success"
  };
}
