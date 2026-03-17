const PLACEHOLDER_DEFINITIONS = {
  hero: {
    id: "hero",
    label: "Hero Block",
    shortLabel: "Hero",
    description: "Hero placeholder",
    minHeight: 260,
    emphasis: "strong"
  },
  text: {
    id: "text",
    label: "Text Block",
    shortLabel: "Text",
    description: "Text placeholder",
    minHeight: 180,
    emphasis: "default"
  },
  image: {
    id: "image",
    label: "Image Block",
    shortLabel: "Image",
    description: "Image placeholder",
    minHeight: 220,
    emphasis: "default"
  },
  feature: {
    id: "feature",
    label: "Feature Block",
    shortLabel: "Feature",
    description: "Feature placeholder",
    minHeight: 220,
    emphasis: "strong"
  },
  cta: {
    id: "cta",
    label: "CTA Block",
    shortLabel: "CTA",
    description: "Call to action placeholder",
    minHeight: 180,
    emphasis: "strong"
  },
  sidebar: {
    id: "sidebar",
    label: "Sidebar Block",
    shortLabel: "Sidebar",
    description: "Sidebar placeholder",
    minHeight: 260,
    emphasis: "quiet"
  },
  content: {
    id: "content",
    label: "Content Block",
    shortLabel: "Content",
    description: "Content placeholder",
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

export const BLOCK_PLACEHOLDER_TYPES = Object.values(PLACEHOLDER_DEFINITIONS);
export const STRUCTURAL_LAYOUT_PRESETS = Object.values(STRUCTURE_PRESETS);

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
