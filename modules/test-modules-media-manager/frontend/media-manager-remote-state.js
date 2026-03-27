import { buildBrowserDeliveryDescriptor } from "../../test-modules-remote-ops/shared/browser-delivery-support.mjs";

function parseTimestamp(value) {
  return Date.parse(value ?? "") || 0;
}

function isSuccessfulRemoteRunStatus(status) {
  return status === "success" || status === "succeeded" || status === "completed";
}

function encodePathSegments(value) {
  return String(value ?? "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function sortMediaItemsForDisplay(items = [], sortMode = "recent") {
  const list = Array.isArray(items) ? [...items] : [];
  const compareName = (left, right) =>
    `${left?.displayName ?? ""}`.localeCompare(`${right?.displayName ?? ""}`);
  const compareUpdated = (left, right) =>
    parseTimestamp(right?.updatedOn ?? right?.createdOn) - parseTimestamp(left?.updatedOn ?? left?.createdOn);

  if (sortMode === "oldest") {
    return list.sort((left, right) => -compareUpdated(left, right) || compareName(left, right));
  }
  if (sortMode === "name-asc") {
    return list.sort((left, right) => compareName(left, right) || compareUpdated(left, right));
  }
  if (sortMode === "name-desc") {
    return list.sort((left, right) => -compareName(left, right) || compareUpdated(left, right));
  }
  if (sortMode === "category") {
    return list.sort((left, right) => {
      const categoryOrder = `${left?.category ?? ""}`.localeCompare(`${right?.category ?? ""}`);
      return categoryOrder || compareName(left, right) || compareUpdated(left, right);
    });
  }
  return list.sort((left, right) => compareUpdated(left, right) || compareName(left, right));
}

export function resolveLinkedBrowserDeliveryTarget(targets = [], mediaTarget = null) {
  if (!mediaTarget?.id || !mediaTarget?.connectionProfileId) {
    return null;
  }
  const candidates = (Array.isArray(targets) ? targets : []).filter(
    (target) =>
      target?.targetKind === "browser-delivery" &&
      target?.connectionProfileId === mediaTarget.connectionProfileId &&
      target?.config?.mediaTargetProfileId === mediaTarget.id
  );
  return (
    candidates.find((target) => target?.productBindingKey === "browser-delivery") ??
    candidates[0] ??
    null
  );
}

export function buildMediaArtifactUrls({
  item,
  mediaTarget = null,
  browserTarget = null,
  deploymentTarget = null,
  localUrl = ""
}) {
  const relativePath = typeof item?.relativePath === "string" ? item.relativePath.trim() : "";
  const descriptor = buildBrowserDeliveryDescriptor({
    browserTarget,
    deploymentTarget,
    mediaTarget,
    pagePath: "/posts/example-post",
    artifactRelativePath: "posts/example-post/index.html"
  });
  const encodedRelativePath = encodePathSegments(relativePath);

  return {
    remoteObjectKey:
      mediaTarget?.config?.prefix && relativePath
        ? `${mediaTarget.config.prefix.replace(/^\/+|\/+$/g, "")}/${relativePath}`
        : relativePath || null,
    localUrl: localUrl || null,
    temporaryRemoteUrl:
      descriptor.temporaryMediaBaseUrl && encodedRelativePath
        ? `${descriptor.temporaryMediaBaseUrl}/${encodedRelativePath}`
        : null,
    publicMediaUrl:
      descriptor.publicMediaBaseUrl && encodedRelativePath
        ? `${descriptor.publicMediaBaseUrl}/${encodedRelativePath}`
        : null
  };
}

export function resolveMediaRemoteSyncState({ item, mediaTarget = null, runs = [] }) {
  if (!mediaTarget) {
    return {
      state: "no-remote",
      label: "No Remote",
      tone: "default",
      detail: "No remote media target is configured."
    };
  }
  if (mediaTarget?.targetStatus !== "validated") {
    return {
      state: "target-unvalidated",
      label: "No Remote",
      tone: "warning",
      detail: "Validate the linked media target before relying on remote sync state."
    };
  }

  const targetRuns = (Array.isArray(runs) ? runs : []).filter((run) => run?.targetProfileId === mediaTarget.id);
  const lastExecuteRun = [...targetRuns]
    .filter((run) => run?.procedureType === "execute" && isSuccessfulRemoteRunStatus(run?.status))
    .sort((left, right) => parseTimestamp(right?.finishedOn ?? right?.startedOn) - parseTimestamp(left?.finishedOn ?? left?.startedOn))[0];

  if (!lastExecuteRun) {
    return {
      state: "not-synced",
      label: "Needs Sync",
      tone: "warning",
      detail: "This item has not been covered by a successful remote sync yet."
    };
  }

  const itemTime = parseTimestamp(item?.updatedOn ?? item?.createdOn);
  const syncTime = parseTimestamp(lastExecuteRun?.finishedOn ?? lastExecuteRun?.startedOn);
  if (itemTime > syncTime) {
    return {
      state: "changed-locally",
      label: "Needs Sync",
      tone: "warning",
      detail: "The item changed after the last successful remote sync."
    };
  }

  return {
    state: "synced",
    label: "Synced",
    tone: "success",
    detail: "The item has not changed since the last successful remote sync."
  };
}

export function summarizeRemoteOnlyArtifacts(mediaTarget = null) {
  const compareSummary = mediaTarget?.compareSummary ?? {};
  return {
    remoteOnlyCount: Number(compareSummary.remoteOnlyCount ?? 0),
    sampleKeys: Array.isArray(compareSummary.sampleKeys) ? compareSummary.sampleKeys.filter(Boolean) : []
  };
}

export function summarizeMediaSyncStates({ items = [], mediaTarget = null, runs = [] }) {
  const summary = {
    total: 0,
    synced: 0,
    changedLocally: 0,
    notSynced: 0,
    noRemote: 0,
    targetUnvalidated: 0
  };

  for (const item of Array.isArray(items) ? items : []) {
    summary.total += 1;
    const state = resolveMediaRemoteSyncState({
      item,
      mediaTarget,
      runs
    });
    if (state.state === "synced") {
      summary.synced += 1;
      continue;
    }
    if (state.state === "changed-locally") {
      summary.changedLocally += 1;
      continue;
    }
    if (state.state === "not-synced") {
      summary.notSynced += 1;
      continue;
    }
    if (state.state === "target-unvalidated") {
      summary.targetUnvalidated += 1;
      continue;
    }
    summary.noRemote += 1;
  }

  return summary;
}
