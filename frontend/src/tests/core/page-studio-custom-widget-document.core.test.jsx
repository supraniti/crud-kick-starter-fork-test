import { describe, expect, test } from "vitest";
import { buildPreparedCustomWidgetValue } from "../../../../modules/test-modules-page-studio/shared/page-studio-custom-widget-document.mjs";

describe("page studio custom widget document", () => {
  test("hydrates template instance from persisted templateInstanceJson", () => {
    const preparedValue = buildPreparedCustomWidgetValue({
      title: "Button CTA Template",
      widgetKey: "button-cta-template",
      templateInstanceJson: JSON.stringify({
        componentKey: "button-cta",
        content: {
          text: {
            mode: "static",
            value: "See all stories"
          }
        }
      })
    });

    expect(preparedValue.templateInstance).toMatchObject({
      componentKey: "button-cta",
      content: {
        text: {
          mode: "static",
          value: "See all stories"
        }
      }
    });
  });
});
