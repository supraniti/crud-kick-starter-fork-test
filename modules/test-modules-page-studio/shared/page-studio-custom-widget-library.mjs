import {
  buildDefaultWidgetActions,
  DEFAULT_WIDGET_COMPONENT_REGISTRY
} from "../../test-modules-layouts/shared/widget-component-schema.mjs";

function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export function buildCustomWidgetLibraryEntries(customWidgets = []) {
  return (Array.isArray(customWidgets) ? customWidgets : [])
    .filter((item) => item?.templateInstance?.componentKey || item?.composition?.blocks?.length > 0)
    .map((item) => ({
      libraryKey: `custom:${item.id}`,
      customWidgetId: item.id,
      componentKey:
        item.templateMode === "composition"
          ? "custom-widget"
          : item.templateInstance.componentKey,
      templateInstance: cloneJsonValue(item.templateInstance),
      composition: cloneJsonValue(item.composition),
      templateMode: item.templateMode === "composition" ? "composition" : "template",
      displayName: normalizeText(item.title, "Custom Widget"),
      icon: normalizeText(item.iconKey, "view_quilt"),
      libraryCategory: normalizeText(item.categoryKey, "Custom"),
      group: "Custom",
      description: normalizeText(item.description, "Reusable custom widget"),
      useCase: normalizeText(
        item.summary,
        item.templateMode === "composition" ? "Reusable composed custom widget" : "Reusable widget template"
      ),
      complexity: "guided",
      keywords: [item.categoryKey, item.sourceComponentKey].filter(Boolean),
      originLabel: item.templateMode === "composition" ? "Custom Widget" : "Template",
      sourceLabel: item.templateMode === "composition" ? "composition" : "template",
      disabled: false,
      disabledReason: ""
    }));
}

function createComponentInstanceFromDescriptor(descriptor) {
  return {
    componentKey: descriptor.componentKey,
    variantKey: "default",
    content: cloneJsonValue(descriptor.defaultBindings ?? {}),
    props: cloneJsonValue(descriptor.defaultProps ?? {}),
    actions: buildDefaultWidgetActions(descriptor)
  };
}

export function createComponentInstanceFromWidgetLibraryEntry(entry) {
  if (entry?.templateMode === "composition" && entry?.customWidgetId) {
    return {
      componentKey: "custom-widget",
      variantKey: "default",
      content: {},
      props: {
        customWidgetId: {
          mode: "static",
          value: entry.customWidgetId
        },
        customWidgetLabel: {
          mode: "static",
          value: entry.displayName ?? "Custom Widget"
        }
      },
      actions: []
    };
  }

  if (entry?.templateInstance?.componentKey) {
    return cloneJsonValue(entry.templateInstance);
  }

  if (entry?.componentKey) {
    const descriptor = DEFAULT_WIDGET_COMPONENT_REGISTRY.get(entry.componentKey);
    if (descriptor) {
      return createComponentInstanceFromDescriptor(descriptor);
    }
  }

  return null;
}
