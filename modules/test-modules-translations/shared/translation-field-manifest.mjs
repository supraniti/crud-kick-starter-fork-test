import { DEFAULT_WIDGET_COMPONENT_REGISTRY } from "../../test-modules-layouts/shared/widget-component-schema.mjs";
import {
  AUTHORS_COLLECTION_ID,
  CATEGORIES_COLLECTION_ID,
  LAYOUTS_COLLECTION_ID,
  PAGES_COLLECTION_ID,
  POSTS_COLLECTION_ID,
  TAGS_COLLECTION_ID
} from "../../test-modules-pages/server/distribution-shared-runtime.mjs";
import { normalizeOptionalText, readValueAtPath } from "./translation-entry.mjs";

const MEDIA_COLLECTION_ID = "media-items";

const FIXED_ENTITY_MANIFEST = Object.freeze({
  [POSTS_COLLECTION_ID]: Object.freeze({
    entityType: POSTS_COLLECTION_ID,
    entityLabel: "Posts",
    labelField: "title",
    defaultLocaleField: "locale",
    fields: Object.freeze([
      { fieldPath: "title", fieldLabel: "Title", valueKind: "text", affectsReader: true },
      { fieldPath: "subtitle", fieldLabel: "Subtitle", valueKind: "text", affectsReader: true },
      { fieldPath: "excerpt", fieldLabel: "Excerpt", valueKind: "rich-text", affectsReader: true },
      { fieldPath: "body", fieldLabel: "Body", valueKind: "rich-text", affectsReader: true },
      { fieldPath: "seoTitle", fieldLabel: "SEO Title", valueKind: "text", affectsReader: true },
      { fieldPath: "seoDescription", fieldLabel: "SEO Description", valueKind: "rich-text", affectsReader: true },
      { fieldPath: "ogTitle", fieldLabel: "OpenGraph Title", valueKind: "text", affectsReader: true },
      { fieldPath: "ogDescription", fieldLabel: "OpenGraph Description", valueKind: "rich-text", affectsReader: true }
    ])
  }),
  [AUTHORS_COLLECTION_ID]: Object.freeze({
    entityType: AUTHORS_COLLECTION_ID,
    entityLabel: "Authors",
    labelField: "displayName",
    defaultLocaleField: "locale",
    fields: Object.freeze([
      { fieldPath: "displayName", fieldLabel: "Display Name", valueKind: "text", affectsReader: true },
      { fieldPath: "legalName", fieldLabel: "Legal Name", valueKind: "text", affectsReader: false },
      { fieldPath: "bio", fieldLabel: "Bio", valueKind: "rich-text", affectsReader: true }
    ])
  }),
  [CATEGORIES_COLLECTION_ID]: Object.freeze({
    entityType: CATEGORIES_COLLECTION_ID,
    entityLabel: "Categories",
    labelField: "name",
    defaultLocaleField: "locale",
    fields: Object.freeze([
      { fieldPath: "name", fieldLabel: "Name", valueKind: "text", affectsReader: true },
      { fieldPath: "description", fieldLabel: "Description", valueKind: "rich-text", affectsReader: true }
    ])
  }),
  [TAGS_COLLECTION_ID]: Object.freeze({
    entityType: TAGS_COLLECTION_ID,
    entityLabel: "Tags",
    labelField: "name",
    defaultLocaleField: "locale",
    fields: Object.freeze([
      { fieldPath: "name", fieldLabel: "Name", valueKind: "text", affectsReader: true },
      { fieldPath: "description", fieldLabel: "Description", valueKind: "rich-text", affectsReader: true },
      { fieldPath: "seoTitle", fieldLabel: "SEO Title", valueKind: "text", affectsReader: true },
      { fieldPath: "seoDescription", fieldLabel: "SEO Description", valueKind: "rich-text", affectsReader: true }
    ])
  }),
  [PAGES_COLLECTION_ID]: Object.freeze({
    entityType: PAGES_COLLECTION_ID,
    entityLabel: "Pages",
    labelField: "title",
    defaultLocaleField: "locale",
    fields: Object.freeze([
      { fieldPath: "title", fieldLabel: "Title", valueKind: "text", affectsReader: true },
      { fieldPath: "summary", fieldLabel: "Summary", valueKind: "rich-text", affectsReader: false },
      { fieldPath: "seoTitle", fieldLabel: "SEO Title", valueKind: "text", affectsReader: true },
      { fieldPath: "seoDescription", fieldLabel: "SEO Description", valueKind: "rich-text", affectsReader: true },
      { fieldPath: "ogTitle", fieldLabel: "OpenGraph Title", valueKind: "text", affectsReader: true },
      { fieldPath: "ogDescription", fieldLabel: "OpenGraph Description", valueKind: "rich-text", affectsReader: true }
    ])
  }),
  [MEDIA_COLLECTION_ID]: Object.freeze({
    entityType: MEDIA_COLLECTION_ID,
    entityLabel: "Media",
    labelField: "displayName",
    defaultLocaleField: "locale",
    fields: Object.freeze([
      { fieldPath: "displayName", fieldLabel: "Display Name", valueKind: "text", affectsReader: false },
      { fieldPath: "altText", fieldLabel: "Alt Text", valueKind: "text", affectsReader: true },
      { fieldPath: "description", fieldLabel: "Description", valueKind: "rich-text", affectsReader: true }
    ])
  })
});

export function listSupportedTranslationEntityTypes() {
  return [...Object.keys(FIXED_ENTITY_MANIFEST), LAYOUTS_COLLECTION_ID];
}

export function resolveTranslationEntityManifest(entityType) {
  return FIXED_ENTITY_MANIFEST[entityType] ?? null;
}

export function resolveTranslationEntityLabel(entityType, entityRecord = null) {
  if (entityType === LAYOUTS_COLLECTION_ID) {
    return normalizeOptionalText(entityRecord?.title) ?? normalizeOptionalText(entityRecord?.layoutKey) ?? "Layout";
  }
  const manifest = resolveTranslationEntityManifest(entityType);
  if (!manifest) {
    return normalizeOptionalText(entityRecord?.title) ?? normalizeOptionalText(entityRecord?.name) ?? normalizeOptionalText(entityRecord?.id) ?? "Record";
  }
  return normalizeOptionalText(readValueAtPath(entityRecord, manifest.labelField)) ?? normalizeOptionalText(entityRecord?.id) ?? manifest.entityLabel;
}

export function resolveTranslationSourceLocale(entityType, entityRecord = null) {
  const manifest = resolveTranslationEntityManifest(entityType);
  const localeField = manifest?.defaultLocaleField ?? "locale";
  return normalizeOptionalText(readValueAtPath(entityRecord, localeField)) ?? "en-US";
}

function collectStaticBindingDescriptorUnits({ binding, fieldPath, fieldLabel, valueKind, sourceLocale, entityLabel, entityId, fields }) {
  if (!binding || typeof binding !== "object") {
    return;
  }
  if (binding.mode === "static" && typeof binding.value === "string" && binding.value.trim().length > 0) {
    fields.push({
      entityType: LAYOUTS_COLLECTION_ID,
      entityId,
      entityLabel,
      fieldPath,
      fieldLabel,
      valueKind,
      sourceValue: binding.value,
      sourceLocale,
      affectsReader: true
    });
  }
}

function collectTabsUnits(instance, node, sourceLocale, entityLabel, entityId, fields) {
  const tabs = Array.isArray(instance?.content?.tabs) ? instance.content.tabs : [];
  tabs.forEach((tab, index) => {
    collectStaticBindingDescriptorUnits({
      binding: tab?.header,
      fieldPath: `layoutDocument.nodes.${node.id}.componentInstance.content.tabs[${index}].header`,
      fieldLabel: `${node.label || "Tabs"} Header ${index + 1}`,
      valueKind: "text",
      sourceLocale,
      entityLabel,
      entityId,
      fields
    });
    collectStaticBindingDescriptorUnits({
      binding: tab?.body,
      fieldPath: `layoutDocument.nodes.${node.id}.componentInstance.content.tabs[${index}].body`,
      fieldLabel: `${node.label || "Tabs"} Body ${index + 1}`,
      valueKind: "rich-text",
      sourceLocale,
      entityLabel,
      entityId,
      fields
    });
  });
}

function collectComponentDefinitionUnits(definitions, bindingTree, node, sourceLocale, entityLabel, entityId, fields, groupKey) {
  Object.entries(definitions ?? {}).forEach(([fieldKey, definition]) => {
    if (!["text", "rich-text"].includes(definition?.valueKind)) {
      return;
    }
    const binding = bindingTree?.[fieldKey] ?? null;
    collectStaticBindingDescriptorUnits({
      binding,
      fieldPath: `layoutDocument.nodes.${node.id}.componentInstance.${groupKey}.${fieldKey}`,
      fieldLabel: `${node.label || "Widget"} ${definition.label ?? fieldKey}`,
      valueKind: definition.valueKind,
      sourceLocale,
      entityLabel,
      entityId,
      fields
    });
  });
}

export function collectLayoutWidgetTranslationFields(layoutRecord = null) {
  if (!layoutRecord || typeof layoutRecord !== "object") {
    return [];
  }
  const layoutDocument = layoutRecord.layoutDocument ?? null;
  const nodes = layoutDocument?.nodes ?? {};
  const entityLabel = resolveTranslationEntityLabel(LAYOUTS_COLLECTION_ID, layoutRecord);
  const sourceLocale = resolveTranslationSourceLocale(LAYOUTS_COLLECTION_ID, layoutRecord);
  const entityId = layoutRecord.id ?? null;
  const fields = [];

  Object.values(nodes).forEach((node) => {
    if (!node || node.kind !== "block" || !node.componentInstance?.componentKey) {
      return;
    }
    const descriptor = DEFAULT_WIDGET_COMPONENT_REGISTRY.get(node.componentInstance.componentKey) ?? null;
    if (!descriptor) {
      return;
    }
    if (descriptor.componentKey === "tabs") {
      collectTabsUnits(node.componentInstance, node, sourceLocale, entityLabel, entityId, fields);
      return;
    }
    collectComponentDefinitionUnits(descriptor.contentBindings, node.componentInstance.content, node, sourceLocale, entityLabel, entityId, fields, "content");
    collectComponentDefinitionUnits(descriptor.propDefinitions, node.componentInstance.props, node, sourceLocale, entityLabel, entityId, fields, "props");
  });

  return fields;
}

export function collectTranslatableFieldsForEntity(entityType, entityRecord = null) {
  if (entityType === LAYOUTS_COLLECTION_ID) {
    return collectLayoutWidgetTranslationFields(entityRecord);
  }
  const manifest = resolveTranslationEntityManifest(entityType);
  if (!manifest || !entityRecord || typeof entityRecord !== "object") {
    return [];
  }
  return manifest.fields
    .map((field) => {
      const sourceValue = readValueAtPath(entityRecord, field.fieldPath);
      if (typeof sourceValue !== "string" || sourceValue.trim().length === 0) {
        return null;
      }
      return {
        entityType,
        entityId: entityRecord.id ?? null,
        fieldPath: field.fieldPath,
        fieldLabel: field.fieldLabel,
        valueKind: field.valueKind,
        sourceValue,
        sourceLocale: resolveTranslationSourceLocale(entityType, entityRecord),
        entityLabel: resolveTranslationEntityLabel(entityType, entityRecord),
        affectsReader: field.affectsReader === true
      };
    })
    .filter(Boolean);
}
