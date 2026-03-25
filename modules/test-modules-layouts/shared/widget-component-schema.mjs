import { normalizeCanonicalBindingPath } from "../../test-modules-pages/shared/widget-binding-namespace.mjs";

const COMPONENT_WRAPPER_KIND_SET = new Set(["primitive", "composite"]);
const COMPONENT_OVERRIDE_POLICY_SET = new Set(["layout-only", "safe-page-overrides"]);
const COMPONENT_VALUE_KIND_SET = new Set([
  "text",
  "rich-text",
  "number",
  "boolean",
  "enum",
  "media",
  "route",
  "record",
  "collection"
]);
const COMPONENT_BINDING_MODE_SET = new Set(["static", "dynamic"]);
const COMPONENT_DYNAMIC_SOURCE_SET = new Set(["context", "library", "item"]);

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

function normalizeEnum(value, allowedValues, fallback) {
  return allowedValues.has(value) ? value : fallback;
}

function cloneJsonValue(value) {
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

export function normalizeWidgetBindingDescriptor(rawValue, fallbackValue = null) {
  if (!isPlainObject(rawValue)) {
    return {
      mode: "static",
      value: rawValue === undefined ? fallbackValue : cloneJsonValue(rawValue)
    };
  }

  const mode = normalizeEnum(rawValue.mode, COMPONENT_BINDING_MODE_SET, "static");
  if (mode === "static") {
    return {
      mode: "static",
      value: cloneJsonValue(Object.prototype.hasOwnProperty.call(rawValue, "value") ? rawValue.value : fallbackValue)
    };
  }

  const source = normalizeEnum(rawValue.source, COMPONENT_DYNAMIC_SOURCE_SET, "context");
  if (source === "context" || source === "item") {
    return {
      mode: "dynamic",
      source,
      path: normalizeCanonicalBindingPath(rawValue.path, source === "item" ? "context.item" : null),
      fallback: Object.prototype.hasOwnProperty.call(rawValue, "fallback")
        ? cloneJsonValue(rawValue.fallback)
        : null
    };
  }

  return {
    mode: "dynamic",
    source: "library",
    libraryKey: normalizeText(rawValue.libraryKey, "media"),
    itemId: normalizeOptionalText(rawValue.itemId),
    snapshot: isPlainObject(rawValue.snapshot) ? cloneJsonValue(rawValue.snapshot) : null,
    fallback: Object.prototype.hasOwnProperty.call(rawValue, "fallback")
      ? cloneJsonValue(rawValue.fallback)
      : null
  };
}

export function validateWidgetBindingDescriptor(rawValue) {
  const binding = normalizeWidgetBindingDescriptor(rawValue);
  const issues = [];

  if (binding.mode === "dynamic" && (binding.source === "context" || binding.source === "item") && !binding.path) {
    issues.push({
      code: "WIDGET_BINDING_PATH_REQUIRED",
      message: `Dynamic ${binding.source} binding requires a canonical path`
    });
  }
  if (binding.mode === "dynamic" && binding.source === "library" && !binding.itemId) {
    issues.push({
      code: "WIDGET_BINDING_LIBRARY_ITEM_REQUIRED",
      message: "Library binding requires an item id"
    });
  }

  return {
    binding,
    issues
  };
}

function normalizeBindingTree(rawValue) {
  if (looksLikeBindingDescriptor(rawValue) || !isPlainObject(rawValue) && !Array.isArray(rawValue)) {
    return normalizeWidgetBindingDescriptor(rawValue);
  }
  if (Array.isArray(rawValue)) {
    return rawValue.map((entry) => normalizeBindingTree(entry));
  }
  return Object.fromEntries(
    Object.entries(rawValue).map(([key, value]) => [key, normalizeBindingTree(value)])
  );
}

function validateBindingTree(rawValue, issues = [], pathPrefix = "") {
  if (looksLikeBindingDescriptor(rawValue) || !isPlainObject(rawValue) && !Array.isArray(rawValue)) {
    const validation = validateWidgetBindingDescriptor(rawValue);
    for (const issue of validation.issues) {
      issues.push({
        ...issue,
        path: pathPrefix || null
      });
    }
    return issues;
  }

  if (Array.isArray(rawValue)) {
    rawValue.forEach((entry, index) => validateBindingTree(entry, issues, `${pathPrefix}[${index}]`));
    return issues;
  }

  for (const [key, value] of Object.entries(rawValue)) {
    validateBindingTree(value, issues, pathPrefix ? `${pathPrefix}.${key}` : key);
  }
  return issues;
}

function normalizeComponentDefinitionMap(rawValue = {}, kind = "prop") {
  if (!isPlainObject(rawValue)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawValue).map(([fieldKey, descriptor]) => {
      const source = isPlainObject(descriptor) ? descriptor : {};
      return [
        fieldKey,
        {
          key: fieldKey,
          label: normalizeOptionalText(source.label) ?? fieldKey,
          kind,
          valueKind: normalizeEnum(source.valueKind, COMPONENT_VALUE_KIND_SET, "text"),
          required: source.required === true,
          defaultValue: Object.prototype.hasOwnProperty.call(source, "defaultValue")
            ? cloneJsonValue(source.defaultValue)
            : null,
          allowedSources: Array.isArray(source.allowedSources)
            ? [...new Set(source.allowedSources.filter((entry) => typeof entry === "string" && entry.trim().length > 0))]
            : kind === "content"
              ? ["static", "context"]
              : ["static"],
          options: Array.isArray(source.options)
            ? source.options.map((entry) => normalizeText(entry)).filter(Boolean)
            : [],
          pageOverrideable: source.pageOverrideable === true
        }
      ];
    })
  );
}

function normalizeActionDefinitions(rawValue = {}) {
  if (!isPlainObject(rawValue)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawValue).map(([actionKey, descriptor]) => {
      const source = isPlainObject(descriptor) ? descriptor : {};
      return [
        actionKey,
        {
          actionKey,
          label: normalizeOptionalText(source.label) ?? actionKey,
          description: normalizeOptionalText(source.description),
          targetKind: normalizeText(source.targetKind, "route"),
          supportsDynamicTarget: source.supportsDynamicTarget !== false
        }
      ];
    })
  );
}

export function normalizeWidgetComponentDescriptor(rawValue = {}) {
  const source = isPlainObject(rawValue) ? rawValue : {};
  return {
    componentKey: normalizeText(source.componentKey, "component"),
    displayName: normalizeOptionalText(source.displayName) ?? normalizeText(source.componentKey, "Component"),
    group: normalizeOptionalText(source.group) ?? "General",
    description: normalizeOptionalText(source.description),
    wrapperKind: normalizeEnum(source.wrapperKind, COMPONENT_WRAPPER_KIND_SET, "primitive"),
    supportedPageKinds: Array.isArray(source.supportedPageKinds)
      ? [...new Set(source.supportedPageKinds.map((entry) => normalizeText(entry)).filter(Boolean))]
      : [],
    supportedPrimarySourceTypes: Array.isArray(source.supportedPrimarySourceTypes)
      ? [...new Set(source.supportedPrimarySourceTypes.map((entry) => normalizeText(entry)).filter(Boolean))]
      : [],
    pageOverridePolicy: normalizeEnum(
      source.pageOverridePolicy,
      COMPONENT_OVERRIDE_POLICY_SET,
      "layout-only"
    ),
    contentBindings: normalizeComponentDefinitionMap(source.contentBindings, "content"),
    propDefinitions: normalizeComponentDefinitionMap(source.propDefinitions, "prop"),
    actionDefinitions: normalizeActionDefinitions(source.actionDefinitions),
    defaultBindings: normalizeBindingTree(source.defaultBindings ?? {}),
    defaultProps: normalizeBindingTree(source.defaultProps ?? {}),
    previewHints: isPlainObject(source.previewHints) ? cloneJsonValue(source.previewHints) : {}
  };
}

export function validateWidgetComponentDescriptor(rawValue = {}) {
  const descriptor = normalizeWidgetComponentDescriptor(rawValue);
  const issues = [];

  if (!descriptor.componentKey) {
    issues.push({
      code: "WIDGET_COMPONENT_KEY_REQUIRED",
      message: "Component descriptor requires a stable component key"
    });
  }

  validateBindingTree(descriptor.defaultBindings, issues, "defaultBindings");
  validateBindingTree(descriptor.defaultProps, issues, "defaultProps");

  return {
    descriptor,
    issues
  };
}

export function buildWidgetComponentRegistry(rawEntries = []) {
  const entries = Array.isArray(rawEntries) ? rawEntries : [];
  const registry = new Map();

  for (const entry of entries) {
    const validation = validateWidgetComponentDescriptor(entry);
    if (validation.issues.length > 0) {
      throw new Error(
        `Invalid widget component descriptor '${validation.descriptor.componentKey}': ${validation.issues
          .map((issue) => issue.code)
          .join(", ")}`
      );
    }
    if (registry.has(validation.descriptor.componentKey)) {
      throw new Error(`Duplicate widget component key '${validation.descriptor.componentKey}'`);
    }
    registry.set(validation.descriptor.componentKey, validation.descriptor);
  }

  return registry;
}

export function normalizeWidgetComponentInstance(rawValue = null) {
  if (!isPlainObject(rawValue)) {
    return null;
  }

  return {
    componentKey: normalizeText(rawValue.componentKey, ""),
    variantKey: normalizeOptionalText(rawValue.variantKey) ?? "default",
    content: normalizeBindingTree(rawValue.content ?? {}),
    props: normalizeBindingTree(rawValue.props ?? {}),
    actions: Array.isArray(rawValue.actions) ? cloneJsonValue(rawValue.actions) : []
  };
}

export function validateWidgetComponentInstance(rawValue = null) {
  const componentInstance = normalizeWidgetComponentInstance(rawValue);
  const issues = [];

  if (rawValue === null || rawValue === undefined) {
    return {
      componentInstance: null,
      issues
    };
  }

  if (!componentInstance || componentInstance.componentKey.length === 0) {
    issues.push({
      code: "WIDGET_COMPONENT_KEY_REQUIRED",
      message: "Block component instance requires a component key"
    });
    return {
      componentInstance,
      issues
    };
  }

  validateBindingTree(componentInstance.content, issues, "content");
  validateBindingTree(componentInstance.props, issues, "props");

  return {
    componentInstance,
    issues
  };
}

const DEFAULT_WIDGET_COMPONENT_DESCRIPTORS = [
  {
    componentKey: "post-title",
    displayName: "Post Title",
    group: "Text",
    description: "Single heading for a post title.",
    wrapperKind: "primitive",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    pageOverridePolicy: "safe-page-overrides",
    contentBindings: {
      text: {
        valueKind: "text",
        required: true,
        allowedSources: ["static", "context"]
      }
    },
    propDefinitions: {
      tag: {
        valueKind: "enum",
        options: ["h1", "h2", "h3"],
        defaultValue: "h1",
        pageOverrideable: true
      }
    },
    defaultBindings: {
      text: {
        mode: "dynamic",
        source: "context",
        path: "context.post.title"
      }
    },
    defaultProps: {
      tag: {
        mode: "static",
        value: "h1"
      }
    }
  },
  {
    componentKey: "post-rich-text",
    displayName: "Rich Text",
    group: "Text",
    description: "Long-form content block for post body or excerpt.",
    wrapperKind: "primitive",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    contentBindings: {
      body: {
        valueKind: "rich-text",
        required: true,
        allowedSources: ["static", "context"]
      }
    },
    defaultBindings: {
      body: {
        mode: "dynamic",
        source: "context",
        path: "context.post.body"
      }
    }
  },
  {
    componentKey: "media-image",
    displayName: "Image",
    group: "Media",
    description: "Single media display bound to library or page context.",
    wrapperKind: "primitive",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    pageOverridePolicy: "safe-page-overrides",
    contentBindings: {
      media: {
        valueKind: "media",
        required: true,
        allowedSources: ["library", "context"]
      }
    },
    propDefinitions: {
      aspect: {
        valueKind: "enum",
        options: ["auto", "16:9", "4:3", "1:1"],
        defaultValue: "auto",
        pageOverrideable: true
      }
    },
    defaultBindings: {
      media: {
        mode: "dynamic",
        source: "context",
        path: "context.post.featuredMedia"
      }
    },
    defaultProps: {
      aspect: {
        mode: "static",
        value: "auto"
      }
    }
  },
  {
    componentKey: "category-chips",
    displayName: "Category Chips",
    group: "Taxonomy",
    description: "Chip list of the current post categories.",
    wrapperKind: "composite",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    contentBindings: {
      items: {
        valueKind: "collection",
        required: true,
        allowedSources: ["context"]
      }
    },
    defaultBindings: {
      items: {
        mode: "dynamic",
        source: "context",
        path: "context.categories"
      }
    }
  },
  {
    componentKey: "author-card",
    displayName: "Author Card",
    group: "People",
    description: "Composite author summary card for the current post author.",
    wrapperKind: "composite",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    contentBindings: {
      author: {
        valueKind: "record",
        required: true,
        allowedSources: ["context"]
      }
    },
    defaultBindings: {
      author: {
        mode: "dynamic",
        source: "context",
        path: "context.author"
      }
    }
  },
  {
    componentKey: "breadcrumbs",
    displayName: "Breadcrumbs",
    group: "Navigation",
    description: "Reader breadcrumb trail for the current post route.",
    wrapperKind: "composite",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    pageOverridePolicy: "layout-only",
    contentBindings: {},
    propDefinitions: {}
  },
  {
    componentKey: "post-navigation",
    displayName: "Previous / Next Navigation",
    group: "Navigation",
    description: "Adjacent story navigation for the current post route.",
    wrapperKind: "composite",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    pageOverridePolicy: "layout-only",
    contentBindings: {},
    propDefinitions: {
      heading: {
        valueKind: "text",
        defaultValue: "Keep Reading"
      }
    },
    defaultProps: {
      heading: {
        mode: "static",
        value: "Keep Reading"
      }
    }
  },
  {
    componentKey: "related-posts",
    displayName: "Related Stories",
    group: "Navigation",
    description: "Curated related story cards for the current post route.",
    wrapperKind: "composite",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    pageOverridePolicy: "safe-page-overrides",
    contentBindings: {},
    propDefinitions: {
      heading: {
        valueKind: "text",
        defaultValue: "Related Stories",
        pageOverrideable: true
      },
      source: {
        valueKind: "enum",
        options: ["combined", "moreFromAuthor", "byCategory", "byTag"],
        defaultValue: "combined",
        pageOverrideable: true
      },
      limit: {
        valueKind: "number",
        defaultValue: 3,
        pageOverrideable: true
      }
    },
    defaultProps: {
      heading: {
        mode: "static",
        value: "Related Stories"
      },
      source: {
        mode: "static",
        value: "combined"
      },
      limit: {
        mode: "static",
        value: 3
      }
    }
  },
  {
    componentKey: "tabs",
    displayName: "Tabs",
    group: "Composite",
    description: "Mixed static and dynamic tab headers and body content.",
    wrapperKind: "composite",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    contentBindings: {
      tabs: {
        valueKind: "collection",
        required: true,
        allowedSources: ["static"]
      }
    },
    defaultBindings: {
      tabs: [
        {
          header: {
            mode: "static",
            value: "Overview"
          },
          body: {
            mode: "dynamic",
            source: "context",
            path: "context.post.excerpt"
          }
        },
        {
          header: {
            mode: "static",
            value: "Author"
          },
          body: {
            mode: "dynamic",
            source: "context",
            path: "context.author.bio"
          }
        }
      ]
    }
  }
];

const DEFAULT_WIDGET_COMPONENT_REGISTRY = buildWidgetComponentRegistry(DEFAULT_WIDGET_COMPONENT_DESCRIPTORS);

export {
  COMPONENT_BINDING_MODE_SET,
  COMPONENT_DYNAMIC_SOURCE_SET,
  COMPONENT_OVERRIDE_POLICY_SET,
  COMPONENT_VALUE_KIND_SET,
  COMPONENT_WRAPPER_KIND_SET,
  DEFAULT_WIDGET_COMPONENT_DESCRIPTORS,
  DEFAULT_WIDGET_COMPONENT_REGISTRY
};
