import {
  buildDefaultWidgetActions,
  DEFAULT_WIDGET_COMPONENT_REGISTRY
} from "../../test-modules-layouts/shared/widget-component-schema.mjs";

function createInstance(componentKey, content = {}, props = {}) {
  const descriptor = DEFAULT_WIDGET_COMPONENT_REGISTRY.get(componentKey) ?? null;
  return {
    componentKey,
    variantKey: "default",
    content,
    props,
    actions: buildDefaultWidgetActions(descriptor)
  };
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function mapBlocksWithSeed(blocks = [], assignments = {}) {
  return blocks.map((block) => {
    const assignment = assignments[block.id] ?? null;
    if (!assignment) {
      return {
        ...block,
        widgetKey: null,
        componentInstance: null,
        themeOverrideMode: "inherit"
      };
    }
    return {
      ...block,
      widgetKey: assignment.componentKey,
      componentInstance: cloneJsonValue(assignment),
      themeOverrideMode: "inherit"
    };
  });
}

export function buildPageStudioScenarioWidgetSeed(scenarioKey = "", blocks = []) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return [];
  }

  const storyStackAssignments = {
    "B-0001": createInstance("post-title", {
      text: {
        mode: "dynamic",
        source: "context",
        path: "context.post.title"
      }
    }, {
      tag: {
        mode: "static",
        value: "h1"
      }
    }),
    "B-0002": createInstance("media-image", {
      media: {
        mode: "dynamic",
        source: "context",
        path: "context.post.featuredMedia"
      }
    }, {
      fit: {
        mode: "static",
        value: "cover"
      }
    }),
    "B-0003": createInstance("post-rich-text", {
      body: {
        mode: "dynamic",
        source: "context",
        path: "context.post.body"
      }
    }),
    "B-0004": createInstance("author-card", {
      author: {
        mode: "dynamic",
        source: "context",
        path: "context.author"
      }
    }),
    "B-0005": createInstance("related-posts", {}, {
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
    })
  };

  const storySidebarAssignments = {
    "B-0001": storyStackAssignments["B-0001"],
    "B-0002": storyStackAssignments["B-0002"],
    "B-0003": storyStackAssignments["B-0003"],
    "B-0004": createInstance("author-card", {
      author: {
        mode: "dynamic",
        source: "context",
        path: "context.author"
      }
    }),
    "B-0005": createInstance("post-navigation", {}, {
      heading: {
        mode: "static",
        value: "Read Next"
      }
    })
  };

  const categoryGridAssignments = {
    "B-0001": createInstance("category-title", {
      text: {
        mode: "dynamic",
        source: "context",
        path: "context.category.name"
      }
    }, {
      tag: {
        mode: "static",
        value: "h1"
      }
    }),
    "B-0002": createInstance("category-description", {
      body: {
        mode: "dynamic",
        source: "context",
        path: "context.category.description"
      }
    }),
    "B-0003": createInstance("post-list", {
      items: {
        mode: "dynamic",
        source: "context",
        path: "context.posts"
      }
    }, {
      heading: {
        mode: "static",
        value: "Latest Stories"
      },
      limit: {
        mode: "static",
        value: 6
      }
    }),
    "B-0004": createInstance("post-list", {
      items: {
        mode: "dynamic",
        source: "context",
        path: "context.posts"
      }
    }, {
      heading: {
        mode: "static",
        value: "More Stories"
      },
      limit: {
        mode: "static",
        value: 2
      }
    }),
    "B-0005": createInstance("post-list", {
      items: {
        mode: "dynamic",
        source: "context",
        path: "context.posts"
      }
    }, {
      heading: {
        mode: "static",
        value: "More Stories"
      },
      limit: {
        mode: "static",
        value: 2
      }
    }),
    "B-0006": createInstance("post-list", {
      items: {
        mode: "dynamic",
        source: "context",
        path: "context.posts"
      }
    }, {
      heading: {
        mode: "static",
        value: "More Stories"
      },
      limit: {
        mode: "static",
        value: 2
      }
    }),
    "B-0007": createInstance("breadcrumbs")
  };

  const assignmentsByScenario = {
    "story-stack": storyStackAssignments,
    "story-sidebar": storySidebarAssignments,
    "category-grid": categoryGridAssignments
  };

  return mapBlocksWithSeed(blocks, assignmentsByScenario[scenarioKey] ?? {});
}

export function pageStudioScenarioHasStarterWidgets(scenarioKey = "") {
  return scenarioKey === "story-stack" || scenarioKey === "story-sidebar" || scenarioKey === "category-grid";
}
