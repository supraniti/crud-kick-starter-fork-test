const PLACEHOLDER_DEFINITIONS = {
  hero: {
    id: "hero",
    label: "Hero Block",
    shortLabel: "Hero",
    description: "Feature headline, short deck, and media edge",
    minHeight: 260,
    emphasis: "strong"
  },
  text: {
    id: "text",
    label: "Text Block",
    shortLabel: "Text",
    description: "Support copy, notes, or a secondary editorial section",
    minHeight: 180,
    emphasis: "default"
  },
  image: {
    id: "image",
    label: "Image Block",
    shortLabel: "Image",
    description: "Editorial image slot with caption space",
    minHeight: 220,
    emphasis: "default"
  },
  feature: {
    id: "feature",
    label: "Feature Block",
    shortLabel: "Feature",
    description: "Feature card with title, summary, and affordance",
    minHeight: 220,
    emphasis: "strong"
  },
  cta: {
    id: "cta",
    label: "CTA Block",
    shortLabel: "CTA",
    description: "Prompt readers toward the next action",
    minHeight: 180,
    emphasis: "strong"
  },
  sidebar: {
    id: "sidebar",
    label: "Sidebar Block",
    shortLabel: "Sidebar",
    description: "Meta modules, lists, or supporting navigation",
    minHeight: 260,
    emphasis: "quiet"
  },
  content: {
    id: "content",
    label: "Content Block",
    shortLabel: "Content",
    description: "Article body, metadata rhythm, and editorial text flow",
    minHeight: 260,
    emphasis: "default"
  }
};

const STRUCTURE_PRESETS = {
  oneColumn: {
    id: "oneColumn",
    label: "1 Column",
    description: "One full-width content area",
    blueprint: {
      kind: "container",
      label: "One Column Section",
      layoutMode: "flex",
      props: {
        direction: "column",
        wrap: "nowrap",
        gap: 24,
        padding: 24,
        minHeight: 320
      },
      children: [
        {
          kind: "block",
          label: PLACEHOLDER_DEFINITIONS.content.label,
          props: {
            minHeight: PLACEHOLDER_DEFINITIONS.content.minHeight,
            emphasis: PLACEHOLDER_DEFINITIONS.content.emphasis,
            placeholderType: "content"
          },
          placement: {
            flex: { basis: "100%", grow: 0, shrink: 0 }
          }
        }
      ]
    }
  },
  twoColumns: {
    id: "twoColumns",
    label: "2 Columns",
    description: "Balanced two-column layout",
    blueprint: {
      kind: "container",
      label: "Two Column Row",
      layoutMode: "flex",
      props: {
        direction: "row",
        wrap: "nowrap",
        gap: 24,
        padding: 24,
        minHeight: 320
      },
      children: [
        {
          kind: "block",
          label: PLACEHOLDER_DEFINITIONS.content.label,
          props: {
            minHeight: 240,
            emphasis: "default",
            placeholderType: "content"
          },
          placement: {
            flex: { basis: "50%", grow: 0, shrink: 0 }
          }
        },
        {
          kind: "block",
          label: PLACEHOLDER_DEFINITIONS.feature.label,
          props: {
            minHeight: 240,
            emphasis: "strong",
            placeholderType: "feature"
          },
          placement: {
            flex: { basis: "50%", grow: 0, shrink: 0 }
          }
        }
      ]
    }
  },
  threeColumns: {
    id: "threeColumns",
    label: "3 Columns",
    description: "Balanced three-column row",
    blueprint: {
      kind: "container",
      label: "Three Column Row",
      layoutMode: "flex",
      props: {
        direction: "row",
        wrap: "nowrap",
        gap: 24,
        padding: 24,
        minHeight: 320
      },
      children: [
        {
          kind: "block",
          label: PLACEHOLDER_DEFINITIONS.feature.label,
          props: {
            minHeight: 220,
            emphasis: "strong",
            placeholderType: "feature"
          },
          placement: {
            flex: { basis: "33.333%", grow: 0, shrink: 0 }
          }
        },
        {
          kind: "block",
          label: PLACEHOLDER_DEFINITIONS.feature.label,
          props: {
            minHeight: 220,
            emphasis: "strong",
            placeholderType: "feature"
          },
          placement: {
            flex: { basis: "33.333%", grow: 0, shrink: 0 }
          }
        },
        {
          kind: "block",
          label: PLACEHOLDER_DEFINITIONS.feature.label,
          props: {
            minHeight: 220,
            emphasis: "strong",
            placeholderType: "feature"
          },
          placement: {
            flex: { basis: "33.333%", grow: 0, shrink: 0 }
          }
        }
      ]
    }
  },
  sidebarContent: {
    id: "sidebarContent",
    label: "Sidebar + Content",
    description: "25 / 75 split",
    blueprint: {
      kind: "container",
      label: "Sidebar Content Row",
      layoutMode: "flex",
      props: {
        direction: "row",
        wrap: "nowrap",
        gap: 24,
        padding: 24,
        minHeight: 340
      },
      children: [
        {
          kind: "block",
          label: PLACEHOLDER_DEFINITIONS.sidebar.label,
          props: {
            minHeight: 260,
            emphasis: "quiet",
            placeholderType: "sidebar"
          },
          placement: {
            flex: { basis: "25%", grow: 0, shrink: 0 }
          }
        },
        {
          kind: "block",
          label: PLACEHOLDER_DEFINITIONS.content.label,
          props: {
            minHeight: 260,
            emphasis: "default",
            placeholderType: "content"
          },
          placement: {
            flex: { basis: "75%", grow: 0, shrink: 0 }
          }
        }
      ]
    }
  },
  contentSidebar: {
    id: "contentSidebar",
    label: "Content + Sidebar",
    description: "75 / 25 split",
    blueprint: {
      kind: "container",
      label: "Content Sidebar Row",
      layoutMode: "flex",
      props: {
        direction: "row",
        wrap: "nowrap",
        gap: 24,
        padding: 24,
        minHeight: 340
      },
      children: [
        {
          kind: "block",
          label: PLACEHOLDER_DEFINITIONS.content.label,
          props: {
            minHeight: 260,
            emphasis: "default",
            placeholderType: "content"
          },
          placement: {
            flex: { basis: "75%", grow: 0, shrink: 0 }
          }
        },
        {
          kind: "block",
          label: PLACEHOLDER_DEFINITIONS.sidebar.label,
          props: {
            minHeight: 260,
            emphasis: "quiet",
            placeholderType: "sidebar"
          },
          placement: {
            flex: { basis: "25%", grow: 0, shrink: 0 }
          }
        }
      ]
    }
  }
};

const STARTER_LAYOUT_PRESETS = {
  articleStory: {
    id: "articleStory",
    label: "Article Story",
    layoutKey: "article-story",
    summary: "Hero opening, main article body, and a supporting call to action.",
    description: "A familiar article frame with a hero lead, long-form content, and a closing prompt.",
    sections: ["oneColumn", "contentSidebar", "oneColumn"]
  },
  categoryLanding: {
    id: "categoryLanding",
    label: "Category Landing",
    layoutKey: "category-landing",
    summary: "Intro hero, featured cards, and a browsable content grid.",
    description: "A landing page shape for categories, topics, or collections.",
    sections: ["oneColumn", "threeColumns", "twoColumns"]
  },
  featureLaunch: {
    id: "featureLaunch",
    label: "Feature Launch",
    layoutKey: "feature-launch",
    summary: "Hero-led page with strong feature callouts and reader action.",
    description: "A richer publication frame for launches, campaigns, or tentpole stories.",
    sections: ["oneColumn", "twoColumns", "oneColumn"]
  },
  mobileStory: {
    id: "mobileStory",
    label: "Mobile Story",
    layoutKey: "mobile-story",
    summary: "Compact single-column reading flow tuned for narrow screens.",
    description: "A restrained reading frame that still leaves room for supporting modules.",
    sections: ["oneColumn", "oneColumn", "oneColumn"]
  }
};

export const BLOCK_PLACEHOLDER_TYPES = Object.values(PLACEHOLDER_DEFINITIONS);
export const STRUCTURAL_LAYOUT_PRESETS = Object.values(STRUCTURE_PRESETS);
export const LAYOUT_STARTER_PRESETS = Object.values(STARTER_LAYOUT_PRESETS);

export function getBlockPlaceholderDefinition(type) {
  return PLACEHOLDER_DEFINITIONS[type] ?? PLACEHOLDER_DEFINITIONS.content;
}

export function createBlockPlaceholderConfig(type) {
  const definition = getBlockPlaceholderDefinition(type);
  return {
    label: definition.label,
    props: {
      minHeight: definition.minHeight,
      emphasis: definition.emphasis,
      placeholderType: definition.id
    }
  };
}

export function createLayoutPresetBlueprint(presetId) {
  const preset = STRUCTURE_PRESETS[presetId] ?? STRUCTURE_PRESETS.oneColumn;
  return JSON.parse(JSON.stringify(preset.blueprint));
}

export function getLayoutStarterPreset(starterId) {
  const preset = STARTER_LAYOUT_PRESETS[starterId] ?? STARTER_LAYOUT_PRESETS.articleStory;
  return JSON.parse(JSON.stringify(preset));
}
