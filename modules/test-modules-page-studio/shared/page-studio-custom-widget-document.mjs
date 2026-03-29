import {
  buildCustomWidgetCompositionFromStudioDocument,
  normalizeCustomWidgetComposition
} from "./page-studio-custom-widget-composition.mjs";

function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeSlug(value, fallback = "custom-widget") {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseJsonObject(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function toTimestamp() {
  return new Date().toISOString();
}

function normalizeTemplateMode(value, fallback = "template") {
  return value === "composition" ? "composition" : fallback;
}

function buildTemplateSummary(template = {}) {
  const contentKeys = Object.keys(template?.content ?? {});
  const propKeys = Object.keys(template?.props ?? {});
  const actionCount = normalizeArray(template?.actions).length;
  return [
    contentKeys.length ? `${contentKeys.length} content fields` : null,
    propKeys.length ? `${propKeys.length} display props` : null,
    actionCount ? `${actionCount} actions` : null
  ]
    .filter(Boolean)
    .join(" · ");
}

function buildCompositionSummary(composition = null) {
  const blockCount = normalizeArray(composition?.blocks).filter((block) => block?.componentInstance).length;
  const bindingCount = normalizeArray(composition?.inputBindings).length;
  return [
    blockCount ? `${blockCount} nested widgets` : null,
    bindingCount ? `${bindingCount} context bindings` : null
  ]
    .filter(Boolean)
    .join(" · ");
}

function extractComposition(rawValue = null) {
  const inlineComposition =
    rawValue?.composition && typeof rawValue.composition === "object"
      ? rawValue.composition
      : null;
  const composedFromStudio = rawValue?.studioDocument
    ? buildCustomWidgetCompositionFromStudioDocument(rawValue.studioDocument)
    : null;
  const parsedJson = normalizeCustomWidgetComposition(parseJsonObject(rawValue?.compositionJson));
  return inlineComposition
    ? normalizeCustomWidgetComposition(inlineComposition)
    : composedFromStudio
      ? normalizeCustomWidgetComposition(composedFromStudio)
      : parsedJson;
}

export function normalizeCustomWidgetStatus(value, fallback = "draft") {
  return value === "ready" || value === "archived" ? value : fallback;
}

export function buildPreparedCustomWidgetValue(input = {}, currentItem = null) {
  const inputTemplateInstanceFromJson = parseJsonObject(input?.templateInstanceJson);
  const currentTemplateInstanceFromJson = parseJsonObject(currentItem?.templateInstanceJson);
  const templateInstance =
    input?.templateInstance && typeof input.templateInstance === "object"
      ? cloneJsonValue(input.templateInstance)
      : inputTemplateInstanceFromJson
        ? cloneJsonValue(inputTemplateInstanceFromJson)
        : currentItem?.templateInstance && typeof currentItem.templateInstance === "object"
          ? cloneJsonValue(currentItem.templateInstance)
          : currentTemplateInstanceFromJson
            ? cloneJsonValue(currentTemplateInstanceFromJson)
            : null;
  const composition =
    extractComposition(input) ??
    extractComposition(currentItem) ??
    null;
  const templateMode = normalizeTemplateMode(
    input?.templateMode ??
      currentItem?.templateMode ??
      (composition ? "composition" : "template"),
    composition ? "composition" : "template"
  );
  const title = normalizeText(input?.title ?? currentItem?.title, "");
  const timestamp = toTimestamp();
  const sourceComponentKey =
    normalizeOptionalText(input?.sourceComponentKey ?? currentItem?.sourceComponentKey) ??
    normalizeOptionalText(templateInstance?.componentKey) ??
    (templateMode === "composition" ? "custom-composition" : null);

  return {
    ...(currentItem ?? {}),
    title,
    widgetKey: normalizeSlug(input?.widgetKey ?? currentItem?.widgetKey ?? title, "custom-widget"),
    iconKey: normalizeText(input?.iconKey ?? currentItem?.iconKey, "view_quilt"),
    categoryKey: normalizeText(input?.categoryKey ?? currentItem?.categoryKey, "Custom"),
    description: normalizeOptionalText(input?.description ?? currentItem?.description),
    summary:
      normalizeOptionalText(input?.summary ?? currentItem?.summary) ??
      (templateMode === "composition"
        ? buildCompositionSummary(composition)
        : buildTemplateSummary(templateInstance)),
    status: normalizeCustomWidgetStatus(input?.status ?? currentItem?.status, "draft"),
    sourceComponentKey,
    templateMode,
    templateInstance,
    composition,
    documentVersion: 2,
    createdOn: currentItem?.createdOn ?? timestamp,
    updatedOn: timestamp,
    currentItemId: currentItem?.id ?? null
  };
}

export function buildPersistedCustomWidgetBody(preparedValue) {
  return {
    title: preparedValue.title,
    widgetKey: preparedValue.widgetKey,
    iconKey: preparedValue.iconKey,
    categoryKey: preparedValue.categoryKey,
    description: preparedValue.description,
    summary: preparedValue.summary,
    status: preparedValue.status,
    sourceComponentKey: preparedValue.sourceComponentKey,
    templateMode: preparedValue.templateMode,
    documentVersion: String(preparedValue.documentVersion ?? 2),
    templateInstanceJson: JSON.stringify(preparedValue.templateInstance ?? null),
    compositionJson: JSON.stringify(preparedValue.composition ?? null),
    createdOn: preparedValue.createdOn,
    updatedOn: preparedValue.updatedOn
  };
}

export function buildExposedCustomWidgetItem(item = null) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const templateInstance = parseJsonObject(item.templateInstanceJson);
  const composition = normalizeCustomWidgetComposition(parseJsonObject(item.compositionJson));
  const templateMode = normalizeTemplateMode(
    item.templateMode ?? (composition ? "composition" : "template"),
    composition ? "composition" : "template"
  );

  return {
    ...item,
    templateMode,
    documentVersion: Number.isFinite(Number(item.documentVersion)) ? Number(item.documentVersion) : 2,
    templateInstance,
    composition
  };
}
