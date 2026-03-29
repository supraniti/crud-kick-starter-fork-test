import { describe, expect, test } from "vitest";
import { resolvePageContextManifest } from "../../../modules/test-modules-pages/server/page-context-manifest-runtime.mjs";
import {
  buildPageWidgetRenderState,
  resolvePageWidgetCompatibilityForPageDefinition
} from "../../../modules/test-modules-pages/server/page-widget-render-contract-runtime.mjs";
import {
  buildPersistedCustomWidgetBody,
  buildPreparedCustomWidgetValue
} from "../../../modules/test-modules-page-studio/shared/page-studio-custom-widget-document.mjs";
import { createEmptyPageStudioDocument } from "../../../modules/test-modules-page-studio/shared/page-studio-document.mjs";

function createCompositionStudioDocument() {
  const document = createEmptyPageStudioDocument();
  document.title = "Lead Story Hero";
  document.layout.editorGrid.desktop.items = [
    {
      blockId: "B-0001",
      x: 0,
      y: 0,
      w: 12,
      h: 4,
      minW: 1,
      minH: 1
    }
  ];
  document.widgets.blocks = [
    {
      id: "B-0001",
      summary: "Hero",
      widgetKey: "post-title",
      componentInstance: {
        componentKey: "post-title",
        variantKey: "default",
        content: {
          text: {
            mode: "dynamic",
            source: "context",
            path: "context.post.title"
          }
        },
        props: {
          tag: {
            mode: "static",
            value: "h1"
          }
        },
        actions: []
      }
    }
  ];
  return document;
}

function createPageContextManifest() {
  const resolution = resolvePageContextManifest({
    page: {
      id: "blogpage-900",
      title: "Journal Story",
      pageKind: "post-detail",
      primarySourceType: "blog-post",
      path: "/journal/:slug"
    },
    application: {
      model: {
        kind: "post-detail"
      }
    }
  });
  return resolution.manifest;
}

describe("page widget render contract custom widgets", () => {
  test("inlines referenced custom widget definitions into the render contract", async () => {
    const preparedCustomWidget = buildPreparedCustomWidgetValue({
      title: "Lead Story Hero",
      widgetKey: "lead-story-hero",
      templateMode: "composition",
      studioDocument: createCompositionStudioDocument()
    });
    const persistedCustomWidget = {
      id: "pagecust-hero",
      ...buildPersistedCustomWidgetBody(preparedCustomWidget)
    };

    const layoutDocument = {
      rootId: "root",
      nodes: {
        root: {
          id: "root",
          kind: "container",
          label: "Root",
          layoutMode: "grid",
          children: ["hero-block"]
        },
        "hero-block": {
          id: "hero-block",
          kind: "block",
          label: "Hero Block",
          componentInstance: {
            componentKey: "custom-widget",
            variantKey: "default",
            content: {},
            props: {
              customWidgetId: {
                mode: "static",
                value: "pagecust-hero"
              },
              customWidgetLabel: {
                mode: "static",
                value: "Lead Story Hero"
              }
            },
            actions: []
          }
        }
      }
    };

    const state = await buildPageWidgetRenderState({
      page: {
        id: "blogpage-900",
        title: "Journal Story",
        pageKind: "post-detail",
        primarySourceType: "blog-post",
        path: "/journal/:slug"
      },
      model: { kind: "post-detail" },
      layoutDocument,
      pageContextManifest: createPageContextManifest(),
      primarySourceType: "blog-post",
      pageKind: "post-detail",
      collectionHandlerRegistry: {
        get(collectionId) {
          if (collectionId === "page-custom-widgets") {
            return {
              async list() {
                return {
                  items: [persistedCustomWidget]
                };
              }
            };
          }
          return null;
        }
      }
    });

    expect(state.compatibility.blockingIssues).toHaveLength(0);
    expect(state.widgetRenderContract.libraries.customWidgetsById["pagecust-hero"]).toMatchObject({
      title: "Lead Story Hero",
      templateMode: "composition"
    });
    expect(
      state.widgetRenderContract.libraries.customWidgetsById["pagecust-hero"].composition.blocks[0].componentInstance
        .componentKey
    ).toBe("post-title");
  });

  test("treats referenced custom widgets as compatible during page-definition validation", async () => {
    const preparedCustomWidget = buildPreparedCustomWidgetValue({
      title: "Lead Story Hero",
      widgetKey: "lead-story-hero",
      templateMode: "composition",
      studioDocument: createCompositionStudioDocument()
    });
    const persistedCustomWidget = {
      id: "pagecust-hero",
      ...buildPersistedCustomWidgetBody(preparedCustomWidget)
    };

    const layoutDocument = {
      rootId: "root",
      nodes: {
        root: {
          id: "root",
          kind: "container",
          label: "Root",
          layoutMode: "grid",
          children: ["hero-block"]
        },
        "hero-block": {
          id: "hero-block",
          kind: "block",
          label: "Hero Block",
          componentInstance: {
            componentKey: "custom-widget",
            variantKey: "default",
            content: {},
            props: {
              customWidgetId: {
                mode: "static",
                value: "pagecust-hero"
              },
              customWidgetLabel: {
                mode: "static",
                value: "Lead Story Hero"
              }
            },
            actions: []
          }
        }
      }
    };

    const compatibility = await resolvePageWidgetCompatibilityForPageDefinition({
      page: {
        id: "blogpage-900",
        title: "Journal Story",
        pageKind: "post-detail",
        primarySourceType: "blog-post",
        path: "/journal/:slug",
        status: "published"
      },
      layoutDocument,
      collectionHandlerRegistry: {
        get(collectionId) {
          if (collectionId === "page-custom-widgets") {
            return {
              async list() {
                return {
                  items: [persistedCustomWidget]
                };
              }
            };
          }
          return null;
        }
      }
    });

    expect(compatibility.blockingIssues).toHaveLength(0);
  });
});
