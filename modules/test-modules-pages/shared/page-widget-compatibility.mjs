import {
  DEFAULT_WIDGET_COMPONENT_REGISTRY,
  validateWidgetBindingDescriptor
} from "../../test-modules-layouts/shared/widget-component-schema.mjs";
import { normalizeCanonicalBindingPath } from "./widget-binding-namespace.mjs";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeBindingDescriptor(value) {
  if (!isPlainObject(value)) {
    return false;
  }
  return ["mode", "source", "path", "value", "libraryKey", "itemId", "fallback"].some((key) =>
    Object.prototype.hasOwnProperty.call(value, key)
  );
}

function readBranchLabel(path, manifestByPath) {
  return manifestByPath.get(path)?.label ?? path.replace(/^context\./, "");
}

function normalizeWidgetPageKind(pageKind) {
  return pageKind === "content-detail" ? "post-detail" : pageKind;
}

function listBindableBranchOptions(pageContextManifest = null) {
  return toArray(pageContextManifest?.branches)
    .filter((branch) => branch?.bindable)
    .map((branch) => ({
      path: branch.path,
      label: branch.label ?? branch.path.replace(/^context\./, ""),
      kind: branch.kind,
      branchPath: branch.path
    }));
}

function looksLikeMediaPath(path) {
  return /Media(?:\[\])?(?:\.|$)/.test(path);
}

function flattenBindableFieldOptions(pageContextManifest = null) {
  return toArray(pageContextManifest?.branches)
    .filter((branch) => branch?.bindable)
    .flatMap((branch) => {
      const branchEntry = {
        path: branch.path,
        label: `${branch.label ?? branch.path.replace(/^context\./, "")} (${branch.kind})`,
        kind: branch.kind,
        branchPath: branch.path
      };
      const fieldEntries = toArray(branch.fields).map((fieldPath) => ({
        path: fieldPath,
        label: `${fieldPath.replace(/^context\./, "")}`,
        kind: "value",
        branchPath: branch.path
      }));
      return [branchEntry, ...fieldEntries];
    });
}

export function resolveBindableContextOptions(pageContextManifest = null, valueKind = "text") {
  const branchOptions = listBindableBranchOptions(pageContextManifest);
  const flatOptions = flattenBindableFieldOptions(pageContextManifest);
  const deduped = new Map();
  const pushOption = (option) => {
    if (!option?.path || deduped.has(option.path)) {
      return;
    }
    deduped.set(option.path, option);
  };

  if (valueKind === "record") {
    branchOptions.filter((option) => option.kind === "record").forEach(pushOption);
  } else if (valueKind === "collection") {
    branchOptions.filter((option) => option.kind === "collection").forEach(pushOption);
  } else if (valueKind === "media") {
    flatOptions.filter((option) => looksLikeMediaPath(option.path)).forEach(pushOption);
  } else {
    flatOptions.forEach(pushOption);
  }

  return [...deduped.values()];
}

function enumerateLayoutNodeWidgets(layoutDocument = null) {
  const nodes = layoutDocument?.nodes ?? {};
  return Object.values(nodes)
    .filter((node) => node?.kind === "block")
    .map((node) => ({
      nodeId: node.id,
      nodeLabel: toText(node.label, node.id),
      componentInstance: node.componentInstance ?? null
    }));
}

function enumerateBindingDescriptors(rawValue, entries = [], pathPrefix = "") {
  if (looksLikeBindingDescriptor(rawValue) || (!isPlainObject(rawValue) && !Array.isArray(rawValue))) {
    const validation = validateWidgetBindingDescriptor(rawValue);
    entries.push({
      path: pathPrefix || null,
      binding: validation.binding
    });
    return entries;
  }

  if (Array.isArray(rawValue)) {
    rawValue.forEach((entry, index) => {
      enumerateBindingDescriptors(entry, entries, `${pathPrefix}[${index}]`);
    });
    return entries;
  }

  Object.entries(rawValue).forEach(([key, value]) => {
    enumerateBindingDescriptors(value, entries, pathPrefix ? `${pathPrefix}.${key}` : key);
  });
  return entries;
}

function addIssue(target, severity, code, message, extra = {}) {
  target.push({
    severity,
    blocking: severity === "blocking",
    code,
    message,
    ...extra
  });
}

function resolveRequiredDefinitionIssues({
  instanceTree = {},
  definitionMap = {},
  issueTarget,
  issuePrefix,
  nodeId,
  componentKey
}) {
  Object.entries(definitionMap).forEach(([fieldKey, fieldDefinition]) => {
    if (!fieldDefinition?.required) {
      return;
    }
    const fieldValue = instanceTree?.[fieldKey];
    if (fieldValue === undefined || fieldValue === null) {
      addIssue(
        issueTarget,
        "blocking",
        "WIDGET_REQUIRED_FIELD_MISSING",
        `Required ${issuePrefix} '${fieldDefinition.label ?? fieldKey}' is not configured.`,
        { nodeId, componentKey, fieldKey }
      );
      return;
    }
    if (fieldValue?.mode === "static") {
      const staticValue = fieldValue.value;
      if (staticValue === null || staticValue === undefined || staticValue === "") {
        addIssue(
          issueTarget,
          "blocking",
          "WIDGET_REQUIRED_STATIC_VALUE_MISSING",
          `Required ${issuePrefix} '${fieldDefinition.label ?? fieldKey}' is empty.`,
          { nodeId, componentKey, fieldKey }
        );
      }
    }
  });
}

function buildBindablePathSet(pageContextManifest = null) {
  return new Set(resolveBindableContextOptions(pageContextManifest).map((entry) => entry.path));
}

function buildManifestBranchMap(pageContextManifest = null) {
  return new Map(
    toArray(pageContextManifest?.branches)
      .filter((branch) => branch?.path)
      .map((branch) => [branch.path, branch])
  );
}

function resolveBindingIssues({
  entries = [],
  pageContextManifest,
  mediaById,
  nodeId,
  componentKey
}) {
  const issues = [];
  const bindablePathSet = buildBindablePathSet(pageContextManifest);
  const branchByPath = buildManifestBranchMap(pageContextManifest);

  entries.forEach((entry) => {
    const binding = entry.binding;
    if (!binding || binding.mode !== "dynamic") {
      return;
    }
    if ((binding.source === "context" || binding.source === "item") && !bindablePathSet.has(binding.path)) {
      addIssue(
        issues,
        "blocking",
        "WIDGET_BINDING_PATH_UNSUPPORTED",
        `Binding '${binding.path}' is not available in the page context contract.`,
        {
          nodeId,
          componentKey,
          bindingPath: binding.path,
          bindingField: entry.path
        }
      );
      return;
    }
    if (binding.source === "library") {
      if (binding.libraryKey === "media" && !mediaById.has(binding.itemId)) {
        addIssue(
          issues,
          "blocking",
          "WIDGET_LIBRARY_ITEM_NOT_FOUND",
          `Media library item '${binding.itemId}' is no longer available.`,
          {
            nodeId,
            componentKey,
            bindingField: entry.path
          }
        );
      }
      return;
    }

    const exactBranch = branchByPath.get(binding.path);
    if (exactBranch && exactBranch.bindable === false) {
      addIssue(
        issues,
        "blocking",
        "WIDGET_BINDING_BRANCH_NOT_BINDABLE",
        `Binding '${readBranchLabel(binding.path, branchByPath)}' is visible for transparency only and cannot drive widgets yet.`,
        {
          nodeId,
          componentKey,
          bindingPath: binding.path,
          bindingField: entry.path
        }
      );
    }
  });

  return issues;
}

export function summarizeWidgetInstance(componentInstance = null, registry = DEFAULT_WIDGET_COMPONENT_REGISTRY) {
  if (!componentInstance?.componentKey) {
    return {
      displayName: "No widget assigned",
      detail: "Select a widget to turn this block into authored page output."
    };
  }
  const descriptor = registry.get(componentInstance.componentKey);
  if (!descriptor) {
    return {
      displayName: componentInstance.componentKey,
      detail: "This widget is no longer registered."
    };
  }

  const contentEntries = enumerateBindingDescriptors(componentInstance.content)
    .filter((entry) => entry.binding?.mode === "dynamic")
    .map((entry) => entry.binding.path || `${entry.binding.source}:${entry.binding.itemId ?? "value"}`);

  return {
    displayName: descriptor.displayName,
    detail:
      contentEntries.length > 0
        ? contentEntries.slice(0, 2).join(" • ")
        : descriptor.description ?? "Static widget configuration"
  };
}

export function resolvePageWidgetCompatibility({
  layoutDocument = null,
  pageContextManifest = null,
  pageKind = null,
  primarySourceType = null,
  mediaItems = [],
  registry = DEFAULT_WIDGET_COMPONENT_REGISTRY
} = {}) {
  const normalizedPageKind = normalizeWidgetPageKind(pageKind);
  const mediaById = new Map(toArray(mediaItems).map((item) => [item.id, item]));
  const inventory = enumerateLayoutNodeWidgets(layoutDocument).map((entry) => {
    const componentInstance = entry.componentInstance;
    const descriptor = componentInstance?.componentKey ? registry.get(componentInstance.componentKey) ?? null : null;
    const issues = [];

    if (!componentInstance) {
      return {
        ...entry,
        descriptor: null,
        issues,
        isCompatible: true
      };
    }

    if (!descriptor) {
      addIssue(
        issues,
        "blocking",
        "WIDGET_DESCRIPTOR_NOT_FOUND",
        `Widget '${componentInstance.componentKey}' is not registered.`,
        { nodeId: entry.nodeId, componentKey: componentInstance.componentKey }
      );
    } else {
      if (
        toArray(descriptor.supportedPageKinds).length > 0 &&
        !descriptor.supportedPageKinds.includes(normalizedPageKind)
      ) {
        addIssue(
          issues,
          "blocking",
          "WIDGET_PAGE_KIND_UNSUPPORTED",
          `${descriptor.displayName} only supports ${descriptor.supportedPageKinds.join(", ")} pages.`,
          { nodeId: entry.nodeId, componentKey: descriptor.componentKey }
        );
      }
      if (
        toArray(descriptor.supportedPrimarySourceTypes).length > 0 &&
        !descriptor.supportedPrimarySourceTypes.includes(primarySourceType)
      ) {
        addIssue(
          issues,
          "blocking",
          "WIDGET_PRIMARY_SOURCE_UNSUPPORTED",
          `${descriptor.displayName} only supports ${descriptor.supportedPrimarySourceTypes.join(", ")} sources.`,
          { nodeId: entry.nodeId, componentKey: descriptor.componentKey }
        );
      }

      resolveRequiredDefinitionIssues({
        instanceTree: componentInstance.content,
        definitionMap: descriptor.contentBindings,
        issueTarget: issues,
        issuePrefix: "content field",
        nodeId: entry.nodeId,
        componentKey: descriptor.componentKey
      });
      resolveRequiredDefinitionIssues({
        instanceTree: componentInstance.props,
        definitionMap: descriptor.propDefinitions,
        issueTarget: issues,
        issuePrefix: "prop",
        nodeId: entry.nodeId,
        componentKey: descriptor.componentKey
      });

      issues.push(
        ...resolveBindingIssues({
          entries: [
            ...enumerateBindingDescriptors(componentInstance.content, [], "content"),
            ...enumerateBindingDescriptors(componentInstance.props, [], "props")
          ],
          pageContextManifest,
          mediaById,
          nodeId: entry.nodeId,
          componentKey: descriptor.componentKey
        })
      );
    }

    return {
      ...entry,
      descriptor: descriptor ? cloneJsonValue(descriptor) : null,
      issues,
      isCompatible: issues.length === 0
    };
  });

  const allIssues = inventory.flatMap((entry) =>
    entry.issues.map((issue) => ({
      ...issue,
      nodeLabel: entry.nodeLabel
    }))
  );
  const blockingIssues = allIssues.filter((issue) => issue.blocking);
  const warningIssues = allIssues.filter((issue) => !issue.blocking);

  return {
    contractVersion: 1,
    summary: {
      totalBlocks: inventory.length,
      widgetizedBlocks: inventory.filter((entry) => entry.componentInstance).length,
      compatibleWidgets: inventory.filter((entry) => entry.componentInstance && entry.isCompatible).length,
      blockingIssueCount: blockingIssues.length,
      warningIssueCount: warningIssues.length
    },
    widgetInventory: inventory,
    issues: allIssues,
    blockingIssues,
    warningIssues,
    supported: blockingIssues.length === 0
  };
}
