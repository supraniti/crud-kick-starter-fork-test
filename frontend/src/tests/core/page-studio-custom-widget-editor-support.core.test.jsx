import { describe, expect, test } from "vitest";
import { buildCustomWidgetCompositionFromStudioDocument } from "../../../../modules/test-modules-page-studio/shared/page-studio-custom-widget-composition.mjs";
import {
  buildCustomWidgetStudioDraft,
  buildStudioDocumentFromCustomWidget
} from "../../../../modules/test-modules-page-studio/shared/page-studio-custom-widget-editor-support.mjs";

describe("page studio custom widget editor support", () => {
  test("builds a media-title-cta starter for post detail context", () => {
    const studioDocument = buildCustomWidgetStudioDraft({
      starterKey: "media-title-cta",
      contextPresetKey: "post-detail"
    });

    expect(studioDocument.infra.routePath).toBe("/journal/:slug");
    expect(studioDocument.widgets.blocks.map((block) => block.widgetKey)).toEqual([
      "media-image",
      "post-title",
      "button-cta"
    ]);
    expect(studioDocument.preview.urlParams.slug).toBe("first-cup-on-the-table");
  });

  test("round-trips a saved custom widget composition back into an editable studio document", () => {
    const originalStudioDocument = buildCustomWidgetStudioDraft({
      starterKey: "media-title-cta",
      contextPresetKey: "category-detail"
    });
    const composition = buildCustomWidgetCompositionFromStudioDocument(originalStudioDocument);
    const rehydratedStudioDocument = buildStudioDocumentFromCustomWidget({
      id: "pagecust-777",
      title: "Category Promo Widget",
      composition
    });

    expect(rehydratedStudioDocument.title).toBe("Category Promo Widget");
    expect(rehydratedStudioDocument.infra.routePath).toBe("/category/:slug");
    expect(rehydratedStudioDocument.widgets.blocks).toHaveLength(3);
    expect(rehydratedStudioDocument.widgets.blocks.map((block) => block.widgetKey)).toEqual([
      "media-image",
      "category-title",
      "button-cta"
    ]);
    expect(rehydratedStudioDocument.layout.editorGrid.desktop.items).toHaveLength(3);
  });
});
