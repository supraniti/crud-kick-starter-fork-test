import { normalizeWidgetComponentInstance } from "../../test-modules-layouts/shared/widget-component-schema.mjs";
import { buildPageStudioRuntimeLayoutContract } from "./page-studio-layout-transform.mjs";
import { normalizePageStudioDocument } from "./page-studio-document.mjs";
import { resolvePageStudioContextContract } from "./page-studio-queries.mjs";

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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeBindingDescriptor(value) {
  if (!isPlainObject(value)) {
    return false;
  }
  return ["mode", "source", "path", "value", "libraryKey", "itemId", "fallback", "snapshot"].some((key) =>
    Object.prototype.hasOwnProperty.call(value, key)
  );
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

function collectInputBindingsFromBlocks(blocks = []) {
  const bindings = new Set();
  toArray(blocks).forEach((block) => {
    const instance = block?.componentInstance ?? null;
    if (!instance) {
      return;
    }
    [
      ...enumerateBindingDescriptors(instance.content),
      ...enumerateBindingDescriptors(instance.props)
    ].forEach((binding) => {
      if (
        binding?.mode === "dynamic" &&
        (binding.source === "context" || binding.source === "item") &&
        typeof binding.path === "string" &&
        binding.path.trim().length > 0
      ) {
        bindings.add(binding.path.trim());
      }
    });
  });
  return [...bindings];
}

function normalizeRuntimeBreakpoint(rawValue = {}) {
  const source = isPlainObject(rawValue) ? rawValue : {};
  return {
    columns: Number.isFinite(Number(source.columns)) ? Number(source.columns) : 12,
    rowHeight: Number.isFinite(Number(source.rowHeight)) ? Number(source.rowHeight) : 32,
    canvasMaxWidth: Number.isFinite(Number(source.canvasMaxWidth)) ? Number(source.canvasMaxWidth) : 1280,
    gap: Number.isFinite(Number(source.gap)) ? Number(source.gap) : 24,
    padding: Number.isFinite(Number(source.padding)) ? Number(source.padding) : 24,
    items: toArray(source.items)
      .map((item) => ({
        blockId: normalizeText(item?.blockId, ""),
        colStart: Number.isFinite(Number(item?.colStart)) ? Number(item.colStart) : 1,
        colSpan: Number.isFinite(Number(item?.colSpan)) ? Number(item.colSpan) : 12,
        rowStart: Number.isFinite(Number(item?.rowStart)) ? Number(item.rowStart) : 1,
        rowSpan: Number.isFinite(Number(item?.rowSpan)) ? Number(item.rowSpan) : 3
      }))
      .filter((item) => item.blockId)
  };
}

export function normalizeCustomWidgetComposition(rawValue = null) {
  if (!isPlainObject(rawValue)) {
    return null;
  }

  return {
    contractVersion: Number.isFinite(Number(rawValue.contractVersion))
      ? Number(rawValue.contractVersion)
      : 1,
    source: {
      title: normalizeOptionalText(rawValue?.source?.title),
      scenarioKey: normalizeOptionalText(rawValue?.source?.scenarioKey),
      pageKind: normalizeOptionalText(rawValue?.source?.pageKind),
      primarySourceType: normalizeOptionalText(rawValue?.source?.primarySourceType),
      routePath: normalizeOptionalText(rawValue?.source?.routePath)
    },
    runtimeLayoutContract: {
      contractVersion: 1,
      breakpoints: {
        desktop: normalizeRuntimeBreakpoint(rawValue?.runtimeLayoutContract?.breakpoints?.desktop),
        tablet: normalizeRuntimeBreakpoint(rawValue?.runtimeLayoutContract?.breakpoints?.tablet),
        mobile: normalizeRuntimeBreakpoint(rawValue?.runtimeLayoutContract?.breakpoints?.mobile)
      }
    },
    blocks: toArray(rawValue.blocks)
      .map((block) => ({
        id: normalizeText(block?.id, ""),
        summary: normalizeText(block?.summary, "Block"),
        widgetKey: normalizeOptionalText(block?.widgetKey),
        themeOverrideMode:
          normalizeText(block?.themeOverrideMode, "inherit") === "pinned" ? "pinned" : "inherit",
        componentInstance: normalizeWidgetComponentInstance(block?.componentInstance ?? null)
      }))
      .filter((block) => block.id),
    inputBindings: toArray(rawValue.inputBindings)
      .map((entry) => normalizeText(entry, ""))
      .filter(Boolean)
  };
}

export function buildCustomWidgetCompositionFromStudioDocument(studioDocument) {
  const normalized = normalizePageStudioDocument(studioDocument);
  const inferred = resolvePageStudioContextContract(normalized);
  const blocks = toArray(normalized?.widgets?.blocks).map((block) => ({
    id: normalizeText(block?.id, ""),
    summary: normalizeText(block?.summary, "Block"),
    widgetKey: normalizeOptionalText(block?.widgetKey),
    themeOverrideMode:
      normalizeText(block?.themeOverrideMode, "inherit") === "pinned" ? "pinned" : "inherit",
    componentInstance: normalizeWidgetComponentInstance(block?.componentInstance ?? null)
  }));

  return normalizeCustomWidgetComposition({
    contractVersion: 1,
    source: {
      title: normalizeOptionalText(normalized?.title),
      scenarioKey: normalizeOptionalText(normalized?.layout?.scenarioKey),
      pageKind: normalizeOptionalText(inferred?.pageKind),
      primarySourceType: normalizeOptionalText(inferred?.primarySourceType),
      routePath: normalizeOptionalText(normalized?.infra?.routePath)
    },
    runtimeLayoutContract: cloneJsonValue(
      buildPageStudioRuntimeLayoutContract({
        editorGrid: normalized?.layout?.editorGrid,
        runtimeLayoutMetadata: normalized?.layout?.runtimeLayoutMetadata
      })
    ),
    blocks,
    inputBindings: collectInputBindingsFromBlocks(blocks)
  });
}
