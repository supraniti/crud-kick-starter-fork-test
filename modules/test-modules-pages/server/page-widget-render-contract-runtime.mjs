import {
  DEFAULT_WIDGET_COMPONENT_REGISTRY
} from "../../test-modules-layouts/shared/widget-component-schema.mjs";
import { normalizeLayoutDocument } from "../../test-modules-layouts/shared/layout-document.mjs";
import { resolvePageWidgetCompatibility } from "../shared/page-widget-compatibility.mjs";
import { attachPageContextManifest } from "./page-context-manifest-runtime.mjs";

const MEDIA_ITEMS_COLLECTION_ID = "media-items";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeBindingDescriptor(value) {
  if (!isPlainObject(value)) {
    return false;
  }
  return ["mode", "source", "path", "value", "libraryKey", "itemId", "fallback", "snapshot"].some(
    (key) => Object.prototype.hasOwnProperty.call(value, key)
  );
}

function mergeBindingTrees(defaultValue, overrideValue) {
  if (overrideValue === undefined) {
    return cloneJsonValue(defaultValue);
  }
  if (defaultValue === undefined) {
    return cloneJsonValue(overrideValue);
  }
  if (looksLikeBindingDescriptor(defaultValue) || looksLikeBindingDescriptor(overrideValue)) {
    return cloneJsonValue(overrideValue);
  }
  if (Array.isArray(defaultValue) || Array.isArray(overrideValue)) {
    return cloneJsonValue(overrideValue);
  }
  if (isPlainObject(defaultValue) && isPlainObject(overrideValue)) {
    return Object.fromEntries(
      [...new Set([...Object.keys(defaultValue), ...Object.keys(overrideValue)])].map((key) => [
        key,
        mergeBindingTrees(defaultValue[key], overrideValue[key])
      ])
    );
  }
  return cloneJsonValue(overrideValue);
}

function enumerateBindingDescriptors(rawValue, entries = []) {
  if (looksLikeBindingDescriptor(rawValue) || (!isPlainObject(rawValue) && !Array.isArray(rawValue))) {
    if (looksLikeBindingDescriptor(rawValue)) {
      entries.push(rawValue);
    }
    return entries;
  }
  if (Array.isArray(rawValue)) {
    rawValue.forEach((entry) => enumerateBindingDescriptors(entry, entries));
    return entries;
  }
  Object.values(rawValue).forEach((entry) => enumerateBindingDescriptors(entry, entries));
  return entries;
}

function buildMediaPreferredUrl(media = {}, delivery = {}) {
  if (media?.preferredUrl || media?.publicUrl || media?.temporaryUrl || media?.localContentUrl) {
    return media.preferredUrl ?? media.publicUrl ?? media.temporaryUrl ?? media.localContentUrl ?? null;
  }
  const relativePath = normalizeOptionalText(media?.relativePath);
  const publicMediaBaseUrl = normalizeOptionalText(delivery?.publicMediaBaseUrl);
  if (relativePath && publicMediaBaseUrl) {
    return `${publicMediaBaseUrl.replace(/\/+$/g, "")}/${relativePath.replace(/^\/+/, "")}`;
  }
  return null;
}

function buildMediaSummary(media = null, delivery = {}) {
  if (!media || typeof media !== "object") {
    return null;
  }
  return {
    id: media.id ?? null,
    displayName: media.displayName ?? media.altText ?? media.id ?? "Media",
    altText: media.altText ?? media.displayName ?? "",
    description: media.description ?? "",
    preferredUrl: buildMediaPreferredUrl(media, delivery),
    width: media.width ?? null,
    height: media.height ?? null
  };
}

function collectLibraryMediaBindingMetadata(layoutDocument = null) {
  const metadataByItemId = new Map();
  const nodes = layoutDocument?.nodes ?? {};

  Object.values(nodes).forEach((node) => {
    if (node?.kind !== "block" || !node.componentInstance) {
      return;
    }
    const descriptors = [
      ...enumerateBindingDescriptors(node.componentInstance.content),
      ...enumerateBindingDescriptors(node.componentInstance.props)
    ];
    descriptors.forEach((descriptor) => {
      if (
        descriptor?.mode === "dynamic" &&
        descriptor.source === "library" &&
        descriptor.libraryKey === "media" &&
        descriptor.itemId
      ) {
        metadataByItemId.set(descriptor.itemId, {
          itemId: descriptor.itemId,
          snapshot: cloneJsonValue(descriptor.snapshot ?? null)
        });
      }
    });
  });

  return metadataByItemId;
}

async function resolveLibraryMediaSummaries(itemMetadataById = new Map(), mediaResolver = null, delivery = {}) {
  const mediaById = {};

  for (const [itemId, metadata] of itemMetadataById.entries()) {
    let summary = buildMediaSummary(metadata?.snapshot ?? null, delivery);
    if (!summary && typeof mediaResolver === "function") {
      const resolved = await mediaResolver(itemId);
      summary = buildMediaSummary(resolved, delivery);
    }
    if (summary) {
      mediaById[itemId] = summary;
    }
  }

  return mediaById;
}

function buildCompiledWidget(instance = null, descriptor = null) {
  if (!instance || !descriptor) {
    return null;
  }

  return {
    componentKey: descriptor.componentKey,
    displayName: descriptor.displayName,
    group: descriptor.group,
    wrapperKind: descriptor.wrapperKind,
    pageOverridePolicy: descriptor.pageOverridePolicy,
    previewHints: cloneJsonValue(descriptor.previewHints ?? {}),
    content: mergeBindingTrees(descriptor.defaultBindings ?? {}, instance.content ?? {}),
    props: mergeBindingTrees(descriptor.defaultProps ?? {}, instance.props ?? {}),
    actions: cloneJsonValue(instance.actions ?? [])
  };
}

function buildCompiledNodes(layoutDocument = null, registry = DEFAULT_WIDGET_COMPONENT_REGISTRY) {
  const nodes = layoutDocument?.nodes ?? {};
  return Object.fromEntries(
    Object.entries(nodes).map(([nodeId, node]) => {
      const descriptor = node?.componentInstance?.componentKey
        ? registry.get(node.componentInstance.componentKey) ?? null
        : null;
      return [
        nodeId,
        {
          id: node.id,
          kind: node.kind,
          label: node.label,
          layoutMode: node.kind === "container" ? node.layoutMode : null,
          props: cloneJsonValue(node.props ?? {}),
          placement: cloneJsonValue(node.placement ?? {}),
          children: node.kind === "container" ? toArray(node.children) : [],
          widget: node.kind === "block"
            ? buildCompiledWidget(node.componentInstance ?? null, descriptor)
            : null
        }
      ];
    })
  );
}

function buildWidgetCompatibilityError(compatibility = null) {
  const blockingIssues = toArray(compatibility?.blockingIssues);
  const message =
    blockingIssues.length === 1
      ? blockingIssues[0].message
      : `${blockingIssues.length} widget compatibility issues block preview or publish.`;
  const error = new Error(`[page-widget] ${message}`);
  error.code = "PAGE_WIDGET_COMPATIBILITY_FAILED";
  error.statusCode = 409;
  error.conflicts = blockingIssues.map((issue) => ({
    code: issue.code,
    fieldId: "layoutId",
    message: issue.message
  }));
  return error;
}

export async function buildPageWidgetRenderState({
  page = null,
  model = null,
  layoutDocument = null,
  pageContextManifest = null,
  primarySourceType = null,
  pageKind = null,
  delivery = {},
  mediaResolver = null,
  registry = DEFAULT_WIDGET_COMPONENT_REGISTRY,
  enforceCompatibility = false
} = {}) {
  const normalizedLayoutDocument = normalizeLayoutDocument(layoutDocument);
  const libraryMediaMetadataById = collectLibraryMediaBindingMetadata(normalizedLayoutDocument);
  const libraryMediaById = await resolveLibraryMediaSummaries(
    libraryMediaMetadataById,
    mediaResolver,
    delivery
  );
  const compatibility = resolvePageWidgetCompatibility({
    layoutDocument: normalizedLayoutDocument,
    pageContextManifest,
    pageKind,
    primarySourceType,
    mediaItems: Object.values(libraryMediaById),
    registry
  });

  if (
    enforceCompatibility &&
    compatibility.summary.widgetizedBlocks > 0 &&
    compatibility.blockingIssues.length > 0
  ) {
    throw buildWidgetCompatibilityError(compatibility);
  }

  return {
    compatibility,
    widgetRenderContract: {
      contractVersion: 1,
      enabled:
        compatibility.summary.widgetizedBlocks > 0 &&
        compatibility.blockingIssues.length === 0,
      rootId: normalizedLayoutDocument.rootId,
      pageKind: pageKind ?? null,
      primarySourceType: primarySourceType ?? null,
      summary: compatibility.summary,
      page: {
        id: page?.id ?? null,
        path: page?.path ?? null,
        title: page?.title ?? null
      },
      nodes: buildCompiledNodes(normalizedLayoutDocument, registry),
      libraries: {
        mediaById: libraryMediaById
      },
      modelKind: model?.kind ?? "generic-page"
    }
  };
}

function createManifestPayloadForPage(page = {}) {
  const primarySourceType = page?.primarySourceType ?? "none";
  return {
    page: {
      pageKind: page?.pageKind ?? null,
      primarySourceType
    },
    application: {
      model:
        primarySourceType === "blog-post"
          ? { kind: "post-detail" }
          : primarySourceType === "blog-category"
            ? { kind: "category-detail" }
            : null
    }
  };
}

async function listMediaItems(collectionHandlerRegistry) {
  const mediaHandler = collectionHandlerRegistry?.get?.(MEDIA_ITEMS_COLLECTION_ID);
  if (!mediaHandler || typeof mediaHandler.list !== "function") {
    return [];
  }
  const payload = await mediaHandler.list({
    limit: 5000,
    offset: 0
  });
  return toArray(payload?.items);
}

export async function resolvePageWidgetCompatibilityForPageDefinition({
  page = null,
  layoutDocument = null,
  collectionHandlerRegistry = null,
  registry = DEFAULT_WIDGET_COMPONENT_REGISTRY
} = {}) {
  const manifestAwarePayload = attachPageContextManifest(createManifestPayloadForPage(page ?? {}));
  const mediaItems = await listMediaItems(collectionHandlerRegistry);
  return resolvePageWidgetCompatibility({
    layoutDocument: normalizeLayoutDocument(layoutDocument),
    pageContextManifest: manifestAwarePayload?.pageContextManifest ?? null,
    pageKind:
      manifestAwarePayload?.pageContextManifest?.pageKind ??
      page?.pageKind ??
      null,
    primarySourceType:
      manifestAwarePayload?.pageContextManifest?.primarySourceType ??
      page?.primarySourceType ??
      null,
    mediaItems,
    registry
  });
}

export async function attachPageWidgetRenderContract(payload = {}, options = {}) {
  const manifestAwarePayload = attachPageContextManifest(payload);
  const collectionHandlerRegistry = options.collectionHandlerRegistry;
  const mediaHandler = collectionHandlerRegistry?.get?.(MEDIA_ITEMS_COLLECTION_ID);
  const state = await buildPageWidgetRenderState({
    page: manifestAwarePayload?.page ?? null,
    model: manifestAwarePayload?.application?.model ?? null,
    layoutDocument: manifestAwarePayload?.renderModel?.layoutDocument ?? null,
    pageContextManifest: manifestAwarePayload?.pageContextManifest ?? null,
    primarySourceType:
      manifestAwarePayload?.pageContextManifest?.primarySourceType ??
      manifestAwarePayload?.page?.primarySourceType ??
      null,
    pageKind:
      manifestAwarePayload?.pageContextManifest?.pageKind ??
      manifestAwarePayload?.page?.pageKind ??
      null,
    delivery: manifestAwarePayload?.delivery ?? {},
    mediaResolver:
      mediaHandler && typeof mediaHandler.findById === "function"
        ? async (itemId) => mediaHandler.findById(itemId)
        : null,
    enforceCompatibility: options.enforceCompatibility === true
  });

  return {
    ...manifestAwarePayload,
    application: {
      ...(manifestAwarePayload?.application && typeof manifestAwarePayload.application === "object"
        ? manifestAwarePayload.application
        : {}),
      layout: {
        ...(manifestAwarePayload?.application?.layout &&
        typeof manifestAwarePayload.application.layout === "object"
          ? manifestAwarePayload.application.layout
          : {}),
        widgetRenderContract: state.widgetRenderContract
      }
    },
    pageWidgetCompatibility: state.compatibility
  };
}
