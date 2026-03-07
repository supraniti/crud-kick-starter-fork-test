import {
  listReferenceMissionJobs,
  startReferenceMissionJob
} from "../../../frontend/src/api/reference.js";

const MODULE_ID = "test-modules-media-manager";
const MEDIA_COMPRESSION_MISSION_ID = "media-library-image-compression";

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json();
  const acceptedStatuses = options.acceptStatuses ?? [];
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    throw new Error(payload?.error?.message ?? `Request failed (${response.status})`);
  }

  return payload;
}

function buildMediaRoute(itemId, suffix = "") {
  const tail = typeof suffix === "string" && suffix.length > 0 ? `/${suffix}` : "";
  return `/api/reference/modules/${MODULE_ID}/media-items/${itemId}${tail}`;
}

export function buildMediaContentUrl(itemId, versionToken = "") {
  const normalizedVersion =
    typeof versionToken === "string" && versionToken.length > 0
      ? `?v=${encodeURIComponent(versionToken)}`
      : "";
  return `${buildMediaRoute(itemId, "content")}${normalizedVersion}`;
}

export async function uploadMediaAsset(input = {}) {
  return requestJson(`/api/reference/modules/${MODULE_ID}/media-items/uploads`, {
    method: "POST",
    body: input,
    acceptStatuses: [400, 404, 409]
  });
}

export async function updateMediaAssetMetadata(itemId, patch = {}) {
  return requestJson(buildMediaRoute(itemId, "metadata"), {
    method: "PUT",
    body: patch,
    acceptStatuses: [400, 404, 409]
  });
}

export async function deleteMediaAsset(itemId) {
  return requestJson(buildMediaRoute(itemId), {
    method: "DELETE",
    acceptStatuses: [404, 409]
  });
}

export async function startMediaPresetJob(mediaItemId, preset) {
  return startReferenceMissionJob({
    missionId: MEDIA_COMPRESSION_MISSION_ID,
    payload: {
      mediaItemId,
      preset
    }
  });
}

export async function listMediaPresetJobs(mediaItemId) {
  const payload = await listReferenceMissionJobs();
  const jobs = Array.isArray(payload?.jobs)
    ? payload.jobs
    : Array.isArray(payload?.items)
      ? payload.items
      : [];
  return jobs.filter((job) => {
    if (job?.type !== `mission:${MEDIA_COMPRESSION_MISSION_ID}`) {
      return false;
    }
    if (job?.payload?.mediaItemId === mediaItemId) {
      return true;
    }
    return job?.result?.output?.sourceMediaId === mediaItemId;
  });
}

export { MEDIA_COMPRESSION_MISSION_ID, MODULE_ID };
