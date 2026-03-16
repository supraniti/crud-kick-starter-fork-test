import { createSign } from "node:crypto";
import {
  readServiceAccountCredentialFromPath
} from "./remote-ops-service-account-auth-runtime.mjs";
import { normalizeOptionalText } from "./remote-ops-shared-runtime.mjs";

function encodeObjectName(objectName = "") {
  return String(objectName)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildCanonicalResource(bucketName, objectName) {
  const normalizedBucketName = normalizeOptionalText(bucketName);
  const normalizedObjectName = normalizeOptionalText(objectName);
  if (!normalizedBucketName || !normalizedObjectName) {
    return null;
  }
  return `/${normalizedBucketName}/${normalizedObjectName}`;
}

function signString(privateKey, value) {
  const signer = createSign("RSA-SHA256");
  signer.update(value);
  signer.end();
  return signer.sign(privateKey).toString("base64");
}

function buildExpiryTimestamp(expiresInSeconds = 3600) {
  const normalizedSeconds = Number.isFinite(expiresInSeconds)
    ? Math.max(60, Math.min(7 * 24 * 60 * 60, Math.floor(expiresInSeconds)))
    : 3600;
  return Math.floor(Date.now() / 1000) + normalizedSeconds;
}

export async function buildSignedStorageObjectGetUrl({
  connectionProfile,
  bucketName,
  objectName,
  expiresInSeconds = 3600
}) {
  const canonicalResource = buildCanonicalResource(bucketName, objectName);
  if (!canonicalResource) {
    return null;
  }

  const credentialState = await readServiceAccountCredentialFromPath(
    connectionProfile?.credentialPathHint
  );
  const expires = buildExpiryTimestamp(expiresInSeconds);
  const stringToSign = ["GET", "", "", String(expires), canonicalResource].join("\n");
  const signature = signString(credentialState.credential.privateKey, stringToSign);
  const encodedBucketName = encodeURIComponent(normalizeOptionalText(bucketName));
  const encodedObjectName = encodeObjectName(objectName);

  return (
    `https://storage.googleapis.com/${encodedBucketName}/${encodedObjectName}` +
    `?GoogleAccessId=${encodeURIComponent(credentialState.credential.clientEmail)}` +
    `&Expires=${expires}` +
    `&Signature=${encodeURIComponent(signature)}`
  );
}

export async function resolveSignedStorageObjectGetUrlState(options) {
  try {
    return {
      available: true,
      url: await buildSignedStorageObjectGetUrl(options),
      errorMessage: null
    };
  } catch (error) {
    return {
      available: false,
      url: null,
      errorMessage: error?.message ?? "Failed to build a signed Google Cloud Storage object URL."
    };
  }
}

export async function tryBuildSignedStorageObjectGetUrl(options) {
  const state = await resolveSignedStorageObjectGetUrlState(options);
  return state.url;
}
