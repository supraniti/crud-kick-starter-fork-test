import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  resolveLocalStorageRoot,
  collectFileHashes,
  buildDiff,
  buildCompareSummaryFromDiff,
  buildRunSummaryFromDiff,
  createProcedureMessage
} from "./remote-ops-simulated-target-runtime.mjs";
import { getServiceAccountAccessToken } from "./remote-ops-service-account-auth-runtime.mjs";
import { collectGoogleJsonPages, requestGoogleBuffer, requestGoogleEmpty, requestGoogleUpload } from "./remote-ops-live-google-runtime.mjs";
import { normalizeOptionalText, normalizeTargetConfig } from "./remote-ops-shared-runtime.mjs";

function buildStorageTargetConfig(targetProfile) {
  return normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
}

function buildObjectName(prefix, relativePath) {
  return prefix ? `${prefix}/${relativePath}` : relativePath;
}

function buildRelativePath(objectName, prefix) {
  if (!prefix) {
    return objectName;
  }
  if (objectName === prefix) {
    return "";
  }
  const normalizedPrefix = `${prefix}/`;
  if (objectName.startsWith(normalizedPrefix)) {
    return objectName.slice(normalizedPrefix.length);
  }
  return objectName;
}

function encodeObjectName(objectName) {
  return encodeURIComponent(objectName);
}

function resolveStorageObjectContentType(relativePath) {
  const normalizedPath = normalizeOptionalText(relativePath)?.toLowerCase() ?? "";
  if (normalizedPath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (normalizedPath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (normalizedPath.endsWith(".js") || normalizedPath.endsWith(".mjs")) {
    return "text/javascript; charset=utf-8";
  }
  if (normalizedPath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (normalizedPath.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (normalizedPath.endsWith(".png")) {
    return "image/png";
  }
  if (normalizedPath.endsWith(".jpg") || normalizedPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalizedPath.endsWith(".webp")) {
    return "image/webp";
  }
  if (normalizedPath.endsWith(".gif")) {
    return "image/gif";
  }
  if (normalizedPath.endsWith(".txt")) {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
}

function buildStorageCompareHash(hash, contentType) {
  return `${normalizeOptionalText(hash) ?? ""}:${normalizeOptionalText(contentType) ?? ""}`;
}

async function collectRemoteStorageEntries(targetProfile, accessToken) {
  const config = buildStorageTargetConfig(targetProfile);
  const prefix = normalizeOptionalText(config.prefix);
  const bucketName = normalizeOptionalText(config.bucketName);
  const objects = await collectGoogleJsonPages({
    accessToken,
    buildUrl(pageToken) {
      const prefixQuery = prefix ? `&prefix=${encodeURIComponent(`${prefix}/`)}` : "";
      const pageTokenQuery = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
      return `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/o?maxResults=1000${prefixQuery}${pageTokenQuery}`;
    },
    extractItems(payload) {
      return Array.isArray(payload?.items) ? payload.items : [];
    }
  });

  return objects.reduce((entries, object) => {
    const objectName = normalizeOptionalText(object?.name);
    if (!objectName) {
      return entries;
    }
    const relativePath = buildRelativePath(objectName, prefix);
    if (!relativePath) {
      return entries;
    }
    entries.set(relativePath, {
      relativePath,
      objectName,
      sizeBytes: Number.parseInt(object?.size ?? "0", 10),
      hash: normalizeOptionalText(object?.md5Hash) ?? normalizeOptionalText(object?.etag) ?? normalizeOptionalText(object?.generation),
      contentType: normalizeOptionalText(object?.contentType) ?? "application/octet-stream",
      compareHash: buildStorageCompareHash(
        normalizeOptionalText(object?.md5Hash) ?? normalizeOptionalText(object?.etag) ?? normalizeOptionalText(object?.generation),
        normalizeOptionalText(object?.contentType) ?? "application/octet-stream"
      )
    });
    return entries;
  }, new Map());
}

async function uploadStorageEntry(bucketName, objectName, absolutePath, accessToken, contentType) {
  const content = await fs.readFile(absolutePath);
  const uploadUrl =
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}` +
    `/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
  await requestGoogleUpload(uploadUrl, accessToken, content, contentType);
}

async function downloadStorageEntry(bucketName, objectName, accessToken) {
  return requestGoogleBuffer(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/o/${encodeObjectName(objectName)}?alt=media`,
    accessToken
  );
}

async function writeLocalFile(rootPath, relativePath, content) {
  const absolutePath = path.join(rootPath, ...relativePath.split("/"));
  await ensureDir(path.dirname(absolutePath));
  await fs.writeFile(absolutePath, content);
}

export async function compareLiveStorageTarget({ targetProfile, connectionProfile }) {
  const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
  const config = buildStorageTargetConfig(targetProfile);
  const collectedLocalEntries = await collectFileHashes(
    resolveLocalStorageRoot(targetProfile),
    "",
    { algorithm: "md5", encoding: "base64" }
  );
  const localEntries = new Map(
    [...collectedLocalEntries.entries()].map(([relativePath, entry]) => {
      const contentType = resolveStorageObjectContentType(relativePath);
      return [
        relativePath,
        {
          ...entry,
          contentType,
          compareHash: buildStorageCompareHash(entry.hash, contentType)
        }
      ];
    })
  );
  const remoteEntries = await collectRemoteStorageEntries(targetProfile, accessToken);
  const diff = buildDiff(
    new Map(
      [...localEntries.entries()].map(([relativePath, entry]) => [
        relativePath,
        {
          ...entry,
          hash: entry.compareHash ?? entry.hash
        }
      ])
    ),
    new Map(
      [...remoteEntries.entries()].map(([relativePath, entry]) => [
        relativePath,
        {
          ...entry,
          hash: entry.compareHash ?? entry.hash
        }
      ])
    )
  );
  const noun = targetProfile.targetKind === "deployment-storage" ? "Deployment target" : "Media target";
  return {
    summary: buildCompareSummaryFromDiff(diff, createProcedureMessage(noun, diff)),
    diff,
    localEntries,
    remoteEntries,
    message: createProcedureMessage(noun, diff)
  };
}

export async function executeLiveStorageTarget({ targetProfile, connectionProfile }) {
  const compareResult = await compareLiveStorageTarget({ targetProfile, connectionProfile });
  const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
  const config = buildStorageTargetConfig(targetProfile);
  const bucketName = normalizeOptionalText(config.bucketName);
  const prefix = normalizeOptionalText(config.prefix);

  for (const compareKey of [...compareResult.diff.createKeys, ...compareResult.diff.updateKeys]) {
    const entry = compareResult.localEntries.get(compareKey);
    if (!entry?.absolutePath) {
      continue;
    }
    await uploadStorageEntry(
      bucketName,
      buildObjectName(prefix, compareKey),
      entry.absolutePath,
      accessToken,
      entry.contentType
    );
  }

  if (targetProfile.policy?.allowDeletes) {
    for (const compareKey of compareResult.diff.deleteKeys) {
      await requestGoogleEmpty(
        `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/o/${encodeObjectName(buildObjectName(prefix, compareKey))}`,
        accessToken,
        { method: "DELETE" }
      );
    }
  }

  const postCompare = await compareLiveStorageTarget({ targetProfile, connectionProfile });
  const noun = targetProfile.targetKind === "deployment-storage" ? "Deployment target" : "Media target";
  return {
    summary: postCompare.summary,
    runSummary: buildRunSummaryFromDiff(compareResult.diff),
    message: postCompare.summary.state === "clean" ? `${noun} synced` : `${noun} synced with remaining drift`
  };
}

export async function restoreLiveStorageTarget({ targetProfile, connectionProfile }) {
  const compareResult = await compareLiveStorageTarget({ targetProfile, connectionProfile });
  const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
  const config = buildStorageTargetConfig(targetProfile);
  const bucketName = normalizeOptionalText(config.bucketName);
  const prefix = normalizeOptionalText(config.prefix);
  const restoreKey = compareResult.diff.deleteKeys[0] ?? compareResult.diff.updateKeys[0] ?? null;

  if (!restoreKey) {
    return {
      status: "warning",
      message: "No remote item is available to restore",
      runSummary: buildRunSummaryFromDiff(compareResult.diff, ["No remote item is available to restore"], 0)
    };
  }

  const content = await downloadStorageEntry(bucketName, buildObjectName(prefix, restoreKey), accessToken);
  await writeLocalFile(resolveLocalStorageRoot(targetProfile), restoreKey, content);

  return {
    status: "succeeded",
    message: `Restored '${restoreKey}' from remote storage`,
    runSummary: buildRunSummaryFromDiff(compareResult.diff, [], 1),
    restoredKey: restoreKey
  };
}
