import { createHash } from "node:crypto";
import { getServiceAccountAccessToken } from "./remote-ops-service-account-auth-runtime.mjs";
import {
  collectGoogleJsonPages,
  requestGoogleEmpty,
  requestGoogleJson
} from "./remote-ops-live-google-runtime.mjs";
import {
  normalizeOptionalText,
  normalizeTargetConfig,
  stringifyCanonicalJson
} from "./remote-ops-shared-runtime.mjs";
import {
  buildCompareSummaryFromDiff,
  buildDiff,
  buildRunSummaryFromDiff,
  buildFirestoreProjectionMap,
  createProcedureMessage
} from "./remote-ops-simulated-target-runtime.mjs";

function hashContent(content) {
  return createHash("sha1").update(content).digest("hex");
}

function splitCollectionPath(collectionPath) {
  const normalized = normalizeOptionalText(collectionPath);
  if (!normalized) {
    throw new Error("Firestore collection path is required.");
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0 || segments.length % 2 === 0) {
    throw new Error(
      "Firestore collection path must point to a collection. Use an odd number of path segments, for example 'publishedPosts' or 'sites/main/posts'."
    );
  }
  return {
    normalizedPath: segments.join("/"),
    collectionId: segments.at(-1),
    parentSegments: segments.slice(0, -1)
  };
}

function encodeResourceName(resourceName) {
  return resourceName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildListCollectionUrl(projectId, collectionPath, pageToken = null) {
  const path = splitCollectionPath(collectionPath);
  const parentSegments = path.parentSegments.length > 0 ? `/${path.parentSegments.join("/")}` : "";
  const baseUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents${parentSegments}/${encodeURIComponent(path.collectionId)}?pageSize=200`;
  return pageToken ? `${baseUrl}&pageToken=${encodeURIComponent(pageToken)}` : baseUrl;
}

function buildDocumentName(projectId, collectionPath, documentId) {
  return `projects/${projectId}/databases/(default)/documents/${splitCollectionPath(collectionPath).normalizedPath}/${documentId}`;
}

function buildFirestoreCompareKey(collectionPath, documentId) {
  return `${splitCollectionPath(collectionPath).normalizedPath}/${documentId}.json`;
}

function extractDocumentIdFromCompareKey(compareKey, collectionPath) {
  const prefix = `${splitCollectionPath(collectionPath).normalizedPath}/`;
  if (!compareKey.startsWith(prefix) || !compareKey.endsWith(".json")) {
    throw new Error(`Cannot resolve Firestore document id from compare key '${compareKey}'.`);
  }
  return compareKey.slice(prefix.length, -5);
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(encodeFirestoreValue)
      }
    };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.entries(value).reduce((result, [key, entryValue]) => {
          result[key] = encodeFirestoreValue(entryValue);
          return result;
        }, {})
      }
    };
  }
  return { stringValue: String(value) };
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if ("nullValue" in value) {
    return null;
  }
  if ("booleanValue" in value) {
    return Boolean(value.booleanValue);
  }
  if ("integerValue" in value) {
    return Number.parseInt(value.integerValue, 10);
  }
  if ("doubleValue" in value) {
    return Number(value.doubleValue);
  }
  if ("stringValue" in value) {
    return String(value.stringValue);
  }
  if ("timestampValue" in value) {
    return String(value.timestampValue);
  }
  if ("arrayValue" in value) {
    const values = Array.isArray(value.arrayValue?.values) ? value.arrayValue.values : [];
    return values.map(decodeFirestoreValue);
  }
  if ("mapValue" in value) {
    const fields = value.mapValue?.fields ?? {};
    return Object.entries(fields).reduce((result, [key, fieldValue]) => {
      result[key] = decodeFirestoreValue(fieldValue);
      return result;
    }, {});
  }
  return null;
}

function buildDocumentEntry(collectionPath, documentId, documentData, documentName = null) {
  const content = Buffer.from(stringifyCanonicalJson(documentData), "utf8");
  return {
    relativePath: buildFirestoreCompareKey(collectionPath, documentId),
    documentId,
    documentName,
    content,
    hash: hashContent(content),
    sizeBytes: content.length,
    documentData
  };
}

async function collectRemoteFirestoreEntries(connectionProfile, targetProfile, accessToken) {
  const projectId = normalizeOptionalText(connectionProfile.projectId);
  const collectionPath =
    normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).firestoreCollectionPath;
  const documents = await collectGoogleJsonPages({
    accessToken,
    buildUrl(pageToken) {
      return buildListCollectionUrl(projectId, collectionPath, pageToken);
    },
    extractItems(payload) {
      return Array.isArray(payload?.documents) ? payload.documents : [];
    }
  });

  return documents.reduce((entries, document) => {
    const documentId = normalizeOptionalText(String(document?.name ?? "").split("/").at(-1));
    if (!documentId) {
      return entries;
    }
    const documentData = decodeFirestoreValue({
      mapValue: {
        fields: document?.fields ?? {}
      }
    });
    entries.set(
      buildFirestoreCompareKey(collectionPath, documentId),
      buildDocumentEntry(collectionPath, documentId, documentData, document?.name ?? null)
    );
    return entries;
  }, new Map());
}

async function replaceFirestoreDocument(projectId, collectionPath, documentId, documentData, accessToken) {
  const documentName = buildDocumentName(projectId, collectionPath, documentId);
  const deleteUrl = `https://firestore.googleapis.com/v1/${encodeResourceName(documentName)}`;
  try {
    await requestGoogleEmpty(deleteUrl, accessToken, { method: "DELETE" });
  } catch (error) {
    if (error?.statusCode !== 404) {
      throw error;
    }
  }
  await requestGoogleJson(deleteUrl, accessToken, {
    method: "PATCH",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      fields: Object.entries(documentData).reduce((result, [key, value]) => {
        result[key] = encodeFirestoreValue(value);
        return result;
      }, {})
    })
  });
}

async function deleteFirestoreDocument(projectId, collectionPath, compareKey, accessToken) {
  const documentId = extractDocumentIdFromCompareKey(compareKey, collectionPath);
  const documentName = buildDocumentName(projectId, collectionPath, documentId);
  await requestGoogleEmpty(
    `https://firestore.googleapis.com/v1/${encodeResourceName(documentName)}`,
    accessToken,
    {
      method: "DELETE"
    }
  );
}

export async function compareLiveFirestoreTarget({ targetProfile, connectionProfile, collectionHandlerRegistry }) {
  const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
  const localEntries = await buildFirestoreProjectionMap(collectionHandlerRegistry, targetProfile);
  const remoteEntries = await collectRemoteFirestoreEntries(connectionProfile, targetProfile, accessToken);
  const diff = buildDiff(localEntries, remoteEntries);
  return {
    summary: buildCompareSummaryFromDiff(diff, createProcedureMessage("Firestore projection", diff)),
    diff,
    localEntries,
    remoteEntries,
    message: createProcedureMessage("Firestore projection", diff)
  };
}

export async function executeLiveFirestoreTarget({
  targetProfile,
  connectionProfile,
  collectionHandlerRegistry
}) {
  const compareResult = await compareLiveFirestoreTarget({
    targetProfile,
    connectionProfile,
    collectionHandlerRegistry
  });
  if (compareResult.diff.isClean) {
    return {
      summary: compareResult.summary,
      runSummary: buildRunSummaryFromDiff(compareResult.diff),
      message: "Firestore projection already matches local state"
    };
  }
  const { accessToken } = await getServiceAccountAccessToken(connectionProfile);
  const projectId = normalizeOptionalText(connectionProfile.projectId);
  const collectionPath =
    normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).firestoreCollectionPath;

  for (const compareKey of [...compareResult.diff.createKeys, ...compareResult.diff.updateKeys]) {
    const entry = compareResult.localEntries.get(compareKey);
    if (!entry?.documentData) {
      continue;
    }
    await replaceFirestoreDocument(
      projectId,
      collectionPath,
      extractDocumentIdFromCompareKey(compareKey, collectionPath),
      entry.documentData,
      accessToken
    );
  }

  if (targetProfile.policy?.allowDeletes) {
    for (const compareKey of compareResult.diff.deleteKeys) {
      await deleteFirestoreDocument(projectId, collectionPath, compareKey, accessToken);
    }
  }

  const postCompare = await compareLiveFirestoreTarget({
    targetProfile,
    connectionProfile,
    collectionHandlerRegistry
  });
  return {
    summary: postCompare.summary,
    runSummary: buildRunSummaryFromDiff(compareResult.diff),
    message: postCompare.summary.state === "clean" ? "Firestore projection synced" : "Firestore projection synced with remaining drift"
  };
}

export { splitCollectionPath as validateFirestoreCollectionPath };
