function createInstance(componentKey, content = {}, props = {}) {
  return {
    componentKey,
    variantKey: "default",
    content,
    props,
    actions: []
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

  const assignmentsByScenario = {
    "story-stack": storyStackAssignments,
    "story-sidebar": storySidebarAssignments
  };

  return mapBlocksWithSeed(blocks, assignmentsByScenario[scenarioKey] ?? {});
}

export function pageStudioScenarioHasStarterWidgets(scenarioKey = "") {
  return scenarioKey === "story-stack" || scenarioKey === "story-sidebar";
}
