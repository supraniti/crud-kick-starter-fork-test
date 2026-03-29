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
const COMPONENT_COMPLEXITY_SET = new Set(["basic", "guided", "advanced"]);

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

function normalizeStringArray(value = []) {
  return Array.isArray(value)
    ? [...new Set(value.map((entry) => normalizeText(entry)).filter(Boolean))]
    : [];
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
          pageOverrideable: source.pageOverrideable === true,
          editorSection: normalizeText(source.editorSection, kind === "content" ? "content" : "display"),
          themeKey: normalizeOptionalText(source.themeKey),
          supportsThemeInheritance: kind === "prop" ? source.supportsThemeInheritance !== false : false,
          helpText: normalizeOptionalText(source.helpText)
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

export function buildDefaultWidgetActions(descriptor = null) {
  const actionDefinitions =
    descriptor && typeof descriptor === "object" ? descriptor.actionDefinitions ?? {} : {};
  return Object.values(actionDefinitions).map((definition) => ({
    actionKey: definition.actionKey,
    kind: definition.targetKind === "event" ? "emit" : "navigate",
    targetKind: definition.targetKind,
    eventName: definition.targetKind === "event" ? `widget:${definition.actionKey}` : null
  }));
}

export function normalizeWidgetComponentDescriptor(rawValue = {}) {
  const source = isPlainObject(rawValue) ? rawValue : {};
  return {
    componentKey: normalizeText(source.componentKey, "component"),
    displayName: normalizeOptionalText(source.displayName) ?? normalizeText(source.componentKey, "Component"),
    group: normalizeOptionalText(source.group) ?? "General",
    icon: normalizeOptionalText(source.icon) ?? "widgets",
    libraryCategory: normalizeOptionalText(source.libraryCategory) ?? normalizeOptionalText(source.group) ?? "General",
    description: normalizeOptionalText(source.description),
    useCase: normalizeOptionalText(source.useCase) ?? normalizeOptionalText(source.description),
    complexity: normalizeEnum(source.complexity, COMPONENT_COMPLEXITY_SET, "basic"),
    keywords: normalizeStringArray(source.keywords),
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
    previewHints: isPlainObject(source.previewHints) ? cloneJsonValue(source.previewHints) : {},
    supportsCustomTemplate: source.supportsCustomTemplate !== false,
    hiddenInLibrary: source.hiddenInLibrary === true
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
    libraryCategory: "Text",
    icon: "title",
    description: "Single heading for a post title.",
    useCase: "Hero or section headline bound to the current post title.",
    complexity: "basic",
    keywords: ["headline", "title", "hero", "heading"],
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
        pageOverrideable: true,
        themeKey: "typography.heading",
        supportsThemeInheritance: true,
        helpText: "Choose the semantic heading level. Theme remains the default unless you pin this widget."
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
    libraryCategory: "Text",
    icon: "article",
    description: "Long-form content block for post body or excerpt.",
    useCase: "Article body, excerpt, or any multi-paragraph editorial copy.",
    complexity: "basic",
    keywords: ["body", "copy", "story", "article"],
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
    libraryCategory: "Media",
    icon: "image",
    description: "Single media display bound to library or page context.",
    useCase: "Featured image, inline story image, or promo visual.",
    complexity: "basic",
    keywords: ["photo", "media", "featured image"],
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
      fit: {
        valueKind: "enum",
        options: ["cover", "contain"],
        defaultValue: "cover",
        pageOverrideable: true,
        themeKey: "media.fit",
        supportsThemeInheritance: false,
        helpText: "Cover fills the frame. Contain preserves the whole image inside the frame."
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
      fit: {
        mode: "static",
        value: "cover"
      }
    }
  },
  {
    componentKey: "category-chips",
    displayName: "Category Chips",
    group: "Taxonomy",
    libraryCategory: "Taxonomy",
    icon: "sell",
    description: "Chip list of the current post categories.",
    useCase: "Compact topical labels above or below a story.",
    complexity: "guided",
    keywords: ["taxonomy", "chips", "labels", "categories"],
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
    actionDefinitions: {
      openCategory: {
        label: "Open Category",
        description: "Navigate to the clicked category record.",
        targetKind: "bound-record"
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
    libraryCategory: "People",
    icon: "badge",
    description: "Composite author summary card for the current post author.",
    useCase: "Sidebar author bio, byline profile, or contributor module.",
    complexity: "guided",
    keywords: ["author", "bio", "profile", "byline"],
    wrapperKind: "composite",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    actionDefinitions: {
      openAuthor: {
        label: "Open Author Page",
        description: "Navigate to the bound author page.",
        targetKind: "authorPage"
      }
    },
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
    libraryCategory: "Navigation",
    icon: "more_horiz",
    description: "Reader breadcrumb trail for the current post route.",
    useCase: "Small route trail above article or section content.",
    complexity: "basic",
    keywords: ["breadcrumbs", "trail", "navigation"],
    wrapperKind: "composite",
    supportedPageKinds: ["post-detail", "category-detail"],
    supportedPrimarySourceTypes: ["blog-post", "blog-category"],
    pageOverridePolicy: "layout-only",
    contentBindings: {},
    propDefinitions: {}
  },
  {
    componentKey: "post-navigation",
    displayName: "Previous / Next Navigation",
    group: "Navigation",
    libraryCategory: "Navigation",
    icon: "swap_horiz",
    description: "Adjacent story navigation for the current post route.",
    useCase: "End-of-article keep-reading navigation.",
    complexity: "guided",
    keywords: ["previous", "next", "adjacent", "navigation"],
    wrapperKind: "composite",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    pageOverridePolicy: "layout-only",
    actionDefinitions: {
      previous: {
        label: "Previous Story",
        description: "Navigate to the previous post for this page.",
        targetKind: "previousPost"
      },
      next: {
        label: "Next Story",
        description: "Navigate to the next post for this page.",
        targetKind: "nextPost"
      }
    },
    contentBindings: {},
    propDefinitions: {
      heading: {
        valueKind: "text",
        defaultValue: "Keep Reading",
        themeKey: "typography.sectionHeading",
        supportsThemeInheritance: true,
        helpText: "Section label shown above the adjacent story cards."
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
    libraryCategory: "Collection",
    icon: "view_stream",
    description: "Curated related story cards for the current post route.",
    useCase: "A related or more-like-this section under a story.",
    complexity: "guided",
    keywords: ["related", "collection", "story cards"],
    wrapperKind: "composite",
    supportedPageKinds: ["post-detail"],
    supportedPrimarySourceTypes: ["blog-post"],
    pageOverridePolicy: "safe-page-overrides",
    actionDefinitions: {
      openRecord: {
        label: "Open Related Story",
        description: "Navigate to the clicked related record.",
        targetKind: "bound-record"
      }
    },
    contentBindings: {},
    propDefinitions: {
      heading: {
        valueKind: "text",
        defaultValue: "Related Stories",
        pageOverrideable: true,
        themeKey: "typography.sectionHeading",
        supportsThemeInheritance: true
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
    libraryCategory: "Composite",
    icon: "tab",
    description: "Mixed static and dynamic tab headers and body content.",
    useCase: "Switch between overview panels, author context, or structured story extras.",
    complexity: "advanced",
    keywords: ["tabs", "switcher", "panels"],
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
  },
  {
    componentKey: "category-title",
    displayName: "Category Title",
    group: "Text",
    libraryCategory: "Text",
    icon: "format_size",
    description: "Heading for the current category page.",
    useCase: "Primary heading for a category or section page.",
    complexity: "basic",
    keywords: ["category", "title", "section heading"],
    wrapperKind: "primitive",
    supportedPageKinds: ["category-detail"],
    supportedPrimarySourceTypes: ["blog-category"],
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
        pageOverrideable: true,
        themeKey: "typography.heading",
        supportsThemeInheritance: true
      }
    },
    defaultBindings: {
      text: {
        mode: "dynamic",
        source: "context",
        path: "context.category.name"
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
    componentKey: "category-description",
    displayName: "Category Description",
    group: "Text",
    libraryCategory: "Text",
    icon: "subject",
    description: "Long-form category description.",
    useCase: "Intro or context block for a category page.",
    complexity: "basic",
    keywords: ["category", "description", "intro"],
    wrapperKind: "primitive",
    supportedPageKinds: ["category-detail"],
    supportedPrimarySourceTypes: ["blog-category"],
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
        path: "context.category.description"
      }
    }
  },
  {
    componentKey: "post-list",
    displayName: "Post List",
    group: "Collection",
    libraryCategory: "Collection",
    icon: "grid_view",
    description: "Grid of post cards from a bound post collection.",
    useCase: "Section listings, archive grids, and homepage content rails.",
    complexity: "guided",
    keywords: ["post list", "listing", "cards", "grid"],
    wrapperKind: "composite",
    supportedPageKinds: ["category-detail"],
    supportedPrimarySourceTypes: ["blog-category"],
    pageOverridePolicy: "safe-page-overrides",
    actionDefinitions: {
      openRecord: {
        label: "Open Story",
        description: "Navigate to the clicked story record.",
        targetKind: "bound-record"
      }
    },
    contentBindings: {
      items: {
        valueKind: "collection",
        required: true,
        allowedSources: ["context"]
      }
    },
    propDefinitions: {
      heading: {
        valueKind: "text",
        defaultValue: "Stories",
        pageOverrideable: true,
        themeKey: "typography.sectionHeading",
        supportsThemeInheritance: true
      },
      limit: {
        valueKind: "number",
        defaultValue: 6,
        pageOverrideable: true
      },
      variant: {
        valueKind: "enum",
        options: ["cards", "compact", "hero-list"],
        defaultValue: "cards",
        pageOverrideable: true,
        helpText: "Cards is balanced. Compact is list-heavy. Hero list leads with a larger first story."
      }
    },
    defaultBindings: {
      items: {
        mode: "dynamic",
        source: "context",
        path: "context.posts"
      }
    },
    defaultProps: {
      heading: {
        mode: "static",
        value: "Stories"
      },
      limit: {
        mode: "static",
        value: 6
      },
      variant: {
        mode: "static",
        value: "cards"
      }
    }
  },
  {
    componentKey: "section-heading",
    displayName: "Section Heading",
    group: "Text",
    libraryCategory: "Editorial",
    icon: "subtitles",
    description: "Compact section title with optional kicker and supporting copy.",
    useCase: "Homepage section titles, rail headings, and grouped content labels.",
    complexity: "basic",
    keywords: ["section", "heading", "kicker", "editorial"],
    wrapperKind: "primitive",
    pageOverridePolicy: "safe-page-overrides",
    contentBindings: {
      kicker: {
        valueKind: "text",
        required: false,
        allowedSources: ["static", "context"]
      },
      text: {
        valueKind: "text",
        required: true,
        allowedSources: ["static", "context"]
      },
      supportingText: {
        valueKind: "text",
        required: false,
        allowedSources: ["static", "context"]
      }
    },
    propDefinitions: {
      tag: {
        valueKind: "enum",
        options: ["h2", "h3", "h4"],
        defaultValue: "h2",
        pageOverrideable: true,
        themeKey: "typography.sectionHeading",
        supportsThemeInheritance: true
      }
    },
    defaultBindings: {
      kicker: {
        mode: "static",
        value: "Section"
      },
      text: {
        mode: "static",
        value: "Latest Stories"
      },
      supportingText: {
        mode: "static",
        value: ""
      }
    },
    defaultProps: {
      tag: {
        mode: "static",
        value: "h2"
      }
    }
  },
  {
    componentKey: "button-cta",
    displayName: "Button CTA",
    group: "Actions",
    libraryCategory: "Actions",
    icon: "smart_button",
    description: "Single call-to-action button with label and bounded behavior.",
    useCase: "See all links, subscribe actions, and promo calls to action.",
    complexity: "guided",
    keywords: ["button", "cta", "action", "navigate"],
    wrapperKind: "primitive",
    pageOverridePolicy: "safe-page-overrides",
    actionDefinitions: {
      primary: {
        label: "Primary Action",
        description: "Navigate or emit when the reader clicks the button.",
        targetKind: "route"
      }
    },
    contentBindings: {
      text: {
        valueKind: "text",
        required: true,
        allowedSources: ["static", "context"]
      }
    },
    propDefinitions: {
      variant: {
        valueKind: "enum",
        options: ["contained", "outlined", "text"],
        defaultValue: "contained",
        pageOverrideable: true,
        helpText: "Prefer contained for primary calls to action."
      },
      color: {
        valueKind: "enum",
        options: ["primary", "secondary", "inherit"],
        defaultValue: "primary",
        pageOverrideable: true,
        themeKey: "palette.primary",
        supportsThemeInheritance: true
      }
    },
    defaultBindings: {
      text: {
        mode: "static",
        value: "See all stories"
      }
    },
    defaultProps: {
      variant: {
        mode: "static",
        value: "contained"
      },
      color: {
        mode: "static",
        value: "primary"
      }
    }
  },
  {
    componentKey: "hero-story",
    displayName: "Hero Story",
    group: "Editorial",
    libraryCategory: "Editorial",
    icon: "newspaper",
    description: "Large lead story block with visual, eyebrow, headline, summary, and primary navigation.",
    useCase: "Top story areas, hero rails, and large lead cards on editorial landing pages.",
    complexity: "guided",
    keywords: ["hero", "lead story", "top story", "editorial"],
    wrapperKind: "composite",
    pageOverridePolicy: "safe-page-overrides",
    actionDefinitions: {
      openRecord: {
        label: "Open Story",
        description: "Navigate to the bound hero story record.",
        targetKind: "bound-record"
      }
    },
    contentBindings: {
      record: {
        valueKind: "record",
        required: true,
        allowedSources: ["context", "item"]
      }
    },
    propDefinitions: {
      showExcerpt: {
        valueKind: "boolean",
        defaultValue: true,
        pageOverrideable: true
      }
    },
    defaultBindings: {
      record: {
        mode: "dynamic",
        source: "context",
        path: "context.post"
      }
    },
    defaultProps: {
      showExcerpt: {
        mode: "static",
        value: true
      }
    }
  },
  {
    componentKey: "metadata-strip",
    displayName: "Metadata Strip",
    group: "Editorial",
    libraryCategory: "Editorial",
    icon: "view_headline",
    description: "Compact strip for author/byline and category labels.",
    useCase: "Above-headline context, teaser metadata, or subhead support.",
    complexity: "basic",
    keywords: ["metadata", "byline", "categories", "eyebrow"],
    wrapperKind: "composite",
    pageOverridePolicy: "safe-page-overrides",
    contentBindings: {
      author: {
        valueKind: "record",
        required: false,
        allowedSources: ["context"]
      },
      categories: {
        valueKind: "collection",
        required: false,
        allowedSources: ["context"]
      }
    },
    propDefinitions: {
      emphasizeCategories: {
        valueKind: "boolean",
        defaultValue: true,
        pageOverrideable: true
      }
    },
    defaultBindings: {
      author: {
        mode: "dynamic",
        source: "context",
        path: "context.author"
      },
      categories: {
        mode: "dynamic",
        source: "context",
        path: "context.categories"
      }
    },
    defaultProps: {
      emphasizeCategories: {
        mode: "static",
        value: true
      }
    }
  },
  {
    componentKey: "promo-panel",
    displayName: "Promo Panel",
    group: "Actions",
    libraryCategory: "Editorial",
    icon: "campaign",
    description: "Self-contained promo or newsletter block with copy and a primary action.",
    useCase: "Subscription callouts, newsletter signups, and campaign blocks.",
    complexity: "guided",
    keywords: ["promo", "newsletter", "campaign", "cta"],
    wrapperKind: "composite",
    pageOverridePolicy: "safe-page-overrides",
    actionDefinitions: {
      primary: {
        label: "Primary Action",
        description: "Navigate or emit from the promo block.",
        targetKind: "route"
      }
    },
    contentBindings: {
      kicker: {
        valueKind: "text",
        required: false,
        allowedSources: ["static", "context"]
      },
      title: {
        valueKind: "text",
        required: true,
        allowedSources: ["static", "context"]
      },
      body: {
        valueKind: "text",
        required: false,
        allowedSources: ["static", "context"]
      },
      ctaText: {
        valueKind: "text",
        required: true,
        allowedSources: ["static", "context"]
      }
    },
    propDefinitions: {
      tone: {
        valueKind: "enum",
        options: ["default", "soft", "strong"],
        defaultValue: "soft",
        pageOverrideable: true
      }
    },
    defaultBindings: {
      kicker: {
        mode: "static",
        value: "Subscriber note"
      },
      title: {
        mode: "static",
        value: "Stay close to the next story"
      },
      body: {
        mode: "static",
        value: "Use this block for newsletter, event, or campaign messaging."
      },
      ctaText: {
        mode: "static",
        value: "Learn more"
      }
    },
    defaultProps: {
      tone: {
        mode: "static",
        value: "soft"
      }
    }
  },
  {
    componentKey: "divider-rule",
    displayName: "Divider Rule",
    group: "Layout",
    libraryCategory: "Layout",
    icon: "horizontal_rule",
    description: "Simple section divider with optional label.",
    useCase: "Separate editorial sections without inventing fake content blocks.",
    complexity: "basic",
    keywords: ["divider", "rule", "separator"],
    wrapperKind: "primitive",
    pageOverridePolicy: "safe-page-overrides",
    contentBindings: {
      label: {
        valueKind: "text",
        required: false,
        allowedSources: ["static", "context"]
      }
    },
    propDefinitions: {
      thickness: {
        valueKind: "number",
        defaultValue: 1,
        pageOverrideable: true
      }
    },
    defaultBindings: {
      label: {
        mode: "static",
        value: ""
      }
    },
    defaultProps: {
      thickness: {
        mode: "static",
        value: 1
      }
    }
  },
  {
    componentKey: "story-card",
    displayName: "Story Card",
    group: "Editorial",
    libraryCategory: "Editorial",
    icon: "article",
    description: "Reusable teaser card for one story record with image, metadata, title, and summary.",
    useCase: "Homepage promos, section heroes, or secondary teaser cards.",
    complexity: "guided",
    keywords: ["teaser", "card", "story", "promo"],
    wrapperKind: "composite",
    pageOverridePolicy: "safe-page-overrides",
    actionDefinitions: {
      openRecord: {
        label: "Open Story",
        description: "Navigate to the bound story record.",
        targetKind: "bound-record"
      }
    },
    contentBindings: {
      record: {
        valueKind: "record",
        required: true,
        allowedSources: ["context"]
      }
    },
    propDefinitions: {
      emphasizeImage: {
        valueKind: "boolean",
        defaultValue: true,
        pageOverrideable: true
      }
    },
    defaultBindings: {
      record: {
        mode: "dynamic",
        source: "context",
        path: "context.post"
      }
    },
    defaultProps: {
      emphasizeImage: {
        mode: "static",
        value: true
      }
    }
  },
  {
    componentKey: "custom-widget",
    displayName: "Custom Widget",
    group: "Custom",
    libraryCategory: "Custom",
    icon: "view_quilt",
    description: "Reusable composed widget definition saved from Page Studio.",
    useCase: "Reference a saved custom widget document and render it through the shared MUI runtime.",
    complexity: "advanced",
    keywords: ["custom", "composed", "reusable"],
    wrapperKind: "composite",
    pageOverridePolicy: "safe-page-overrides",
    hiddenInLibrary: true,
    supportsCustomTemplate: false,
    propDefinitions: {
      customWidgetId: {
        valueKind: "text",
        required: true,
        defaultValue: "",
        pageOverrideable: false,
        editorSection: "overview",
        helpText: "Stable custom widget document id."
      },
      customWidgetLabel: {
        valueKind: "text",
        required: false,
        defaultValue: "",
        pageOverrideable: false,
        editorSection: "overview",
        helpText: "Display label for the selected custom widget."
      }
    },
    defaultBindings: {},
    defaultProps: {
      customWidgetId: {
        mode: "static",
        value: ""
      },
      customWidgetLabel: {
        mode: "static",
        value: ""
      }
    }
  }
];

const DEFAULT_WIDGET_COMPONENT_REGISTRY = buildWidgetComponentRegistry(DEFAULT_WIDGET_COMPONENT_DESCRIPTORS);

export {
  COMPONENT_BINDING_MODE_SET,
  COMPONENT_DYNAMIC_SOURCE_SET,
  COMPONENT_COMPLEXITY_SET,
  COMPONENT_OVERRIDE_POLICY_SET,
  COMPONENT_VALUE_KIND_SET,
  COMPONENT_WRAPPER_KIND_SET,
  DEFAULT_WIDGET_COMPONENT_DESCRIPTORS,
  DEFAULT_WIDGET_COMPONENT_REGISTRY
};
