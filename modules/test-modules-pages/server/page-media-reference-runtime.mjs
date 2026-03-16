import { buildSignedStorageObjectGetUrl } from "../../test-modules-remote-ops/server/remote-ops-gcs-signed-url-runtime.mjs";

const MEDIA_ITEMS_COLLECTION_ID = "media-items";
const MEDIA_ID_FIELD_PATTERN = /MediaId$/;
const MEDIA_IDS_FIELD_PATTERN = /MediaIds$/;

function normalizeText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function trimSlashes(value) {
  return String(value ?? "").replace(/^\/+|\/+$/g, "");
}

function encodeRelativePath(relativePath = "") {
  return String(relativePath)
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function joinUrl(baseUrl, relativePath) {
  const normalizedBaseUrl = normalizeText(baseUrl);
  const normalizedRelativePath = trimSlashes(relativePath);
  if (!normalizedBaseUrl || !normalizedRelativePath) {
    return null;
  }
  return `${normalizedBaseUrl.replace(/\/+$/g, "")}/${encodeRelativePath(normalizedRelativePath)}`;
}

function createLocalContentUrl(mediaItemId) {
  return mediaItemId
    ? `/api/reference/modules/test-modules-media-manager/media-items/${encodeURIComponent(mediaItemId)}/content`
    : null;
}

function buildBaseMediaDescriptor(mediaItem = {}) {
  return {
    id: mediaItem.id,
    displayName: mediaItem.displayName ?? mediaItem.id,
    mimeType: mediaItem.mimeType ?? null,
    altText: mediaItem.altText ?? null,
    description: mediaItem.description ?? null,
    width: mediaItem.width ?? null,
    height: mediaItem.height ?? null,
    category: mediaItem.category ?? null,
    operationPreset: mediaItem.operationPreset ?? null,
    status: mediaItem.status ?? null,
    relativePath: mediaItem.relativePath ?? null,
    storageKey: mediaItem.storageKey ?? null,
    isDerived: mediaItem.isDerived === true,
    sourceMediaId: mediaItem.sourceMediaId ?? null
  };
}

function createMediaDescriptor(mediaItem = {}, delivery = {}, signedTemporaryUrl = null) {
  const publicUrl = joinUrl(delivery?.publicMediaBaseUrl, mediaItem.relativePath);
  const temporaryUrl = signedTemporaryUrl ?? joinUrl(delivery?.temporaryMediaBaseUrl, mediaItem.relativePath);
  const localContentUrl = createLocalContentUrl(mediaItem.id);
  return {
    ...buildBaseMediaDescriptor(mediaItem),
    publicUrl,
    temporaryUrl,
    localContentUrl,
    preferredUrl: publicUrl ?? temporaryUrl ?? localContentUrl
  };
}

function readMediaIdsFromField(fieldKey, fieldValue, mediaIds) {
  if (MEDIA_ID_FIELD_PATTERN.test(fieldKey)) {
    const mediaId = normalizeText(fieldValue);
    if (mediaId) {
      mediaIds.add(mediaId);
    }
    return;
  }

  if (MEDIA_IDS_FIELD_PATTERN.test(fieldKey)) {
    for (const mediaId of toArray(fieldValue)) {
      const normalizedMediaId = normalizeText(mediaId);
      if (normalizedMediaId) {
        mediaIds.add(normalizedMediaId);
      }
    }
  }
}

function collectMediaIds(value, mediaIds) {
  if (!value || typeof value !== "object") {
    return mediaIds;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectMediaIds(entry, mediaIds);
    }
    return mediaIds;
  }

  for (const [fieldKey, fieldValue] of Object.entries(value)) {
    readMediaIdsFromField(fieldKey, fieldValue, mediaIds);
    if (fieldValue && typeof fieldValue === "object") {
      collectMediaIds(fieldValue, mediaIds);
    }
  }
  return mediaIds;
}

function resolveRelatedMediaFieldKey(fieldKey) {
  if (MEDIA_IDS_FIELD_PATTERN.test(fieldKey)) {
    return fieldKey.replace(/Ids$/, "");
  }
  if (MEDIA_ID_FIELD_PATTERN.test(fieldKey)) {
    return fieldKey.replace(/Id$/, "");
  }
  return null;
}

function enrichObjectWithMedia(source = {}, mediaById = {}) {
  const target = {};
  for (const [fieldKey, fieldValue] of Object.entries(source)) {
    target[fieldKey] = enrichMediaReferences(fieldValue, mediaById);
    const relatedFieldKey = resolveRelatedMediaFieldKey(fieldKey);
    if (!relatedFieldKey) {
      continue;
    }

    if (MEDIA_ID_FIELD_PATTERN.test(fieldKey)) {
      const mediaId = normalizeText(fieldValue);
      if (mediaId && mediaById[mediaId]) {
        target[relatedFieldKey] = mediaById[mediaId];
      }
      continue;
    }

    target[relatedFieldKey] = toArray(fieldValue)
      .map((mediaId) => mediaById[mediaId] ?? null)
      .filter(Boolean);
  }
  return target;
}

function enrichMediaReferences(value, mediaById = {}) {
  if (!value || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => enrichMediaReferences(entry, mediaById));
  }
  return enrichObjectWithMedia(value, mediaById);
}

async function readMediaItemsById(collectionHandlerRegistry, mediaIds = []) {
  const handler = collectionHandlerRegistry?.get?.(MEDIA_ITEMS_COLLECTION_ID);
  if (!handler || typeof handler.findById !== "function") {
    return [];
  }

  const items = await Promise.all(mediaIds.map((mediaId) => handler.findById(mediaId)));
  return items.filter(Boolean);
}

async function readReferencedMediaItems(payload = {}, collectionHandlerRegistry) {
  const mediaIds = [...collectMediaIds({
    head: payload?.head,
    data: payload?.data
  }, new Set())];
  if (mediaIds.length === 0) {
    return [];
  }
  return readMediaItemsById(collectionHandlerRegistry, mediaIds);
}

async function buildSignedTemporaryMediaUrls(items = [], delivery = {}, browserDeliveryState = null) {
  if (
    delivery?.accessMode !== "gcp-temporary" ||
    !browserDeliveryState?.connectionProfile?.credentialPathHint ||
    !browserDeliveryState?.mediaTarget?.config?.bucketName
  ) {
    return {};
  }

  const bucketName = browserDeliveryState.mediaTarget.config.bucketName;
  const prefix = String(browserDeliveryState.mediaTarget.config.prefix ?? "").replace(/^\/+|\/+$/g, "");
  const signedEntries = await Promise.all(
    items.map(async (item) => {
      if (!item?.relativePath) {
        return [item?.id ?? "", null];
      }
      const objectName = prefix ? `${prefix}/${item.relativePath}` : item.relativePath;
      const signedUrl = await buildSignedStorageObjectGetUrl({
        connectionProfile: browserDeliveryState.connectionProfile,
        bucketName,
        objectName
      });
      return [item.id, signedUrl];
    })
  );
  return Object.fromEntries(signedEntries.filter(([mediaId, value]) => mediaId && value));
}

async function buildMediaRegistry(items = [], delivery = {}, browserDeliveryState = null) {
  const signedTemporaryUrls = await buildSignedTemporaryMediaUrls(
    items,
    delivery,
    browserDeliveryState
  );
  const descriptors = items.map((item) =>
    createMediaDescriptor(item, delivery, signedTemporaryUrls[item.id] ?? null)
  );
  return {
    items: descriptors,
    byId: Object.fromEntries(descriptors.map((item) => [item.id, item])),
    referencedIds: descriptors.map((item) => item.id),
    publicBaseUrl: delivery?.publicMediaBaseUrl ?? null,
    temporaryBaseUrl: delivery?.temporaryMediaBaseUrl ?? null
  };
}

function attachOpenGraphMedia(payload = {}, mediaRegistry = null) {
  const openGraph = payload?.head?.openGraph;
  const openGraphMediaId = normalizeText(openGraph?.imageMediaId);
  const openGraphMedia = openGraphMediaId ? mediaRegistry?.byId?.[openGraphMediaId] ?? null : null;
  if (!openGraphMedia) {
    return payload;
  }

  return {
    ...payload,
    head: {
      ...(payload?.head && typeof payload.head === "object" ? payload.head : {}),
      openGraph: {
        ...(openGraph && typeof openGraph === "object" ? openGraph : {}),
        image: openGraphMedia,
        imageUrl: openGraphMedia.preferredUrl
      }
    }
  };
}

function createMediaAwarePayload(payload = {}, mediaRegistry = null) {
  return {
    ...payload,
    data: enrichMediaReferences(payload?.data, mediaRegistry?.byId ?? {}),
    media: mediaRegistry
  };
}

export async function attachResolvedMediaReferences(
  payload = {},
  collectionHandlerRegistry,
  browserDeliveryState = null
) {
  const mediaItems = await readReferencedMediaItems(payload, collectionHandlerRegistry);
  if (mediaItems.length === 0) {
    return payload;
  }

  const mediaRegistry = await buildMediaRegistry(
    mediaItems,
    payload?.delivery,
    browserDeliveryState
  );
  return attachOpenGraphMedia(createMediaAwarePayload(payload, mediaRegistry), mediaRegistry);
}
