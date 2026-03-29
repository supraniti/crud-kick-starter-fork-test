import { describe, expect, test } from "vitest";
import {
  buildExposedCustomWidgetItem,
  buildPersistedCustomWidgetBody,
  buildPreparedCustomWidgetValue
} from "../../../modules/test-modules-page-studio/shared/page-studio-custom-widget-document.mjs";
import { createEmptyPageStudioDocument } from "../../../modules/test-modules-page-studio/shared/page-studio-document.mjs";

function createStoryStudioDocument() {
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
      themeOverrideMode: "inherit",
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

describe("page studio custom widget document", () => {
  test("builds persisted composition documents from a studio draft", () => {
    const preparedValue = buildPreparedCustomWidgetValue({
      title: "Lead Story Hero",
      widgetKey: "lead-story-hero",
      templateMode: "composition",
      studioDocument: createStoryStudioDocument()
    });

    expect(preparedValue.templateMode).toBe("composition");
    expect(preparedValue.composition.blocks).toHaveLength(1);
    expect(preparedValue.composition.runtimeLayoutContract.breakpoints.desktop.items).toHaveLength(1);
    expect(preparedValue.composition.inputBindings).toContain("context.post.title");

    const persistedBody = buildPersistedCustomWidgetBody(preparedValue);
    expect(JSON.parse(persistedBody.compositionJson)).toMatchObject({
      contractVersion: 1
    });

    const exposed = buildExposedCustomWidgetItem({
      id: "pagecust-900",
      ...persistedBody
    });
    expect(exposed.templateMode).toBe("composition");
    expect(exposed.composition.blocks[0].componentInstance.componentKey).toBe("post-title");
  });

  test("hydrates legacy template instances from templateInstanceJson", () => {
    const preparedValue = buildPreparedCustomWidgetValue({
      title: "Legacy Template",
      templateInstanceJson: JSON.stringify({
        componentKey: "post-title",
        content: {
          text: {
            mode: "dynamic",
            source: "context",
            path: "context.post.title"
          }
        },
        props: {},
        actions: []
      })
    });

    expect(preparedValue.templateMode).toBe("template");
    expect(preparedValue.templateInstance).toMatchObject({
      componentKey: "post-title"
    });
  });
});
