import { normalizeTargetConfig } from "../../test-modules-remote-ops/server/remote-ops-shared-runtime.mjs";
import {
  REMOTE_CONNECTIONS_COLLECTION_ID,
  REMOTE_TARGETS_COLLECTION_ID,
  normalizeOptionalText
} from "./distribution-shared-runtime.mjs";

const CONTENT_MODULE_ID = "test-modules-content";
const TAXONOMY_MODULE_ID = "test-modules-taxonomy";

function readPrimaryRecord(payload = {}) {
  const record = payload?.data?.primary?.record;
  return record && typeof record === "object" ? record : null;
}

function resolveProjectionSettingsDescriptor(primarySourceType) {
  if (primarySourceType === "blog-post") {
    return {
      moduleId: CONTENT_MODULE_ID,
      fieldId: "remoteProjectionTargetProfileId",
      bindingKey: "posts-projection"
    };
  }
  if (primarySourceType === "blog-category") {
    return {
      moduleId: TAXONOMY_MODULE_ID,
      fieldId: "remoteCategoriesProjectionTargetProfileId",
      bindingKey: "categories-projection"
    };
  }
  if (primarySourceType === "blog-tag") {
    return {
      moduleId: TAXONOMY_MODULE_ID,
      fieldId: "remoteTagsProjectionTargetProfileId",
      bindingKey: "tags-projection"
    };
  }
  return null;
}

async function readRawModuleSettings(resolveSettingsRepository, moduleId) {
  const repository =
    typeof resolveSettingsRepository === "function" ? resolveSettingsRepository(moduleId) : null;
  if (!repository || typeof repository.readState !== "function") {
    return {};
  }
  try {
    const state = await repository.readState();
    if (state?.[moduleId] && typeof state[moduleId] === "object") {
      return state[moduleId];
    }
    return state && typeof state === "object" && !Array.isArray(state) ? state : {};
  } catch {
    return {};
  }
}

function resolveRemoteTargetsHandler(collectionHandlerRegistry) {
  return collectionHandlerRegistry?.get?.(REMOTE_TARGETS_COLLECTION_ID) ?? null;
}

function resolveRemoteConnectionsHandler(collectionHandlerRegistry) {
  return collectionHandlerRegistry?.get?.(REMOTE_CONNECTIONS_COLLECTION_ID) ?? null;
}

async function resolveBindingFromTarget(collectionHandlerRegistry, targetProfile = null) {
  if (!targetProfile) {
    return null;
  }
  const connectionProfile = await resolveRemoteConnectionsHandler(collectionHandlerRegistry)?.findById?.(
    targetProfile.connectionProfileId
  );
  if (!connectionProfile) {
    return null;
  }
  return {
    targetProfile,
    connectionProfile
  };
}

async function resolveBindingFromModuleSettings({
  collectionHandlerRegistry,
  resolveSettingsRepository,
  descriptor
}) {
  const settings = await readRawModuleSettings(resolveSettingsRepository, descriptor.moduleId);
  const targetProfileId = normalizeOptionalText(settings?.[descriptor.fieldId]);
  if (!targetProfileId) {
    return null;
  }
  const targetProfile = await resolveRemoteTargetsHandler(collectionHandlerRegistry)?.findById?.(targetProfileId);
  return resolveBindingFromTarget(collectionHandlerRegistry, targetProfile);
}

async function resolveBindingFromProductTargets(collectionHandlerRegistry, descriptor) {
  const listedTargetsPayload = await resolveRemoteTargetsHandler(collectionHandlerRegistry)?.list?.({
    limit: 500,
    offset: 0
  });
  const listedTargets = Array.isArray(listedTargetsPayload?.items) ? listedTargetsPayload.items : [];
  const fallbackTarget = listedTargets.find(
    (target) =>
      normalizeOptionalText(target?.productBindingKey) === descriptor.bindingKey &&
      target?.targetKind === "firestore-projection"
  );
  return resolveBindingFromTarget(collectionHandlerRegistry, fallbackTarget);
}

async function resolveProjectionBinding({
  collectionHandlerRegistry,
  resolveSettingsRepository,
  payload
}) {
  const descriptor = resolveProjectionSettingsDescriptor(payload?.page?.primarySourceType ?? "none");
  if (!descriptor) {
    return null;
  }
  return (
    (await resolveBindingFromModuleSettings({
      collectionHandlerRegistry,
      resolveSettingsRepository,
      descriptor
    })) ??
    (await resolveBindingFromProductTargets(collectionHandlerRegistry, descriptor))
  );
}

function resolveProjectionDocumentId(primaryRecord = null) {
  return normalizeOptionalText(primaryRecord?.slug) ?? normalizeOptionalText(primaryRecord?.id);
}

export function buildFirestoreDocumentUrl(projectId, collectionPath, documentId) {
  return [
    "https://firestore.googleapis.com/v1/projects",
    encodeURIComponent(projectId),
    "databases",
    "(default)",
    "documents",
    ...String(collectionPath)
      .split("/")
      .map((segment) => encodeURIComponent(segment)),
    encodeURIComponent(documentId)
  ].join("/");
}

export async function resolvePublishedFirestoreDescriptor({
  collectionHandlerRegistry,
  resolveSettingsRepository,
  payload
}) {
  const primaryRecord = readPrimaryRecord(payload);
  if (!primaryRecord) {
    return null;
  }

  const projectionBinding = await resolveProjectionBinding({
    collectionHandlerRegistry,
    resolveSettingsRepository,
    payload
  });
  if (!projectionBinding) {
    return null;
  }

  const targetConfig = normalizeTargetConfig(
    projectionBinding.targetProfile.config,
    projectionBinding.targetProfile.targetKind
  );
  const collectionPath = normalizeOptionalText(targetConfig.firestoreCollectionPath);
  const projectId = normalizeOptionalText(projectionBinding.connectionProfile.projectId);
  const documentId = resolveProjectionDocumentId(primaryRecord);
  if (!collectionPath || !projectId || !documentId) {
    return null;
  }

  return {
    targetProfileId: projectionBinding.targetProfile.id ?? null,
    connectionProfileId: projectionBinding.connectionProfile.id ?? null,
    projectId,
    collectionPath,
    documentId,
    documentUrl: buildFirestoreDocumentUrl(projectId, collectionPath, documentId)
  };
}
