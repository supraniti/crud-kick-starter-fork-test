function parseTimestamp(value) {
  return Date.parse(value ?? "") || 0;
}

function isSuccessfulRun(run) {
  const status = typeof run?.status === "string" ? run.status.toLowerCase() : "";
  return status === "success" || status === "succeeded" || status === "completed";
}

export function resolveTranslationDeploymentState(row, latestRun, target) {
  if (!row) {
    return {
      label: "Unknown",
      tone: "default",
      detail: "No translation row is selected."
    };
  }

  if (!row.translatedValue) {
    return {
      label: "Local Only",
      tone: "default",
      detail: "No translated value exists for this locale yet."
    };
  }

  if (!target) {
    return {
      label: "No Remote",
      tone: "warning",
      detail: "No translations projection target is configured."
    };
  }

  if (!isSuccessfulRun(latestRun) || latestRun?.procedureType !== "execute") {
    return {
      label: "Needs Sync",
      tone: "warning",
      detail: "The locale overlay has not been synced remotely yet."
    };
  }

  const syncedOn = parseTimestamp(latestRun?.finishedOn ?? latestRun?.startedOn);
  const rowChangedOn = parseTimestamp(row?.updatedOn);
  if (row.status === "stale" || rowChangedOn > syncedOn) {
    return {
      label: "Needs Sync",
      tone: "warning",
      detail: "The translated value changed after the last successful remote sync."
    };
  }

  return {
    label: "Synced",
    tone: "success",
    detail: "The translated value is included in the current remote overlay."
  };
}
