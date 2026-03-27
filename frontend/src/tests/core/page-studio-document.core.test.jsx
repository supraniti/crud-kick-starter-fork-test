import { describe, expect, test } from "vitest";
import {
  createEmptyPageStudioDocument,
  normalizePageStudioDocument
} from "../../../../modules/test-modules-page-studio/shared/page-studio-document.mjs";

describe("page studio document", () => {
  test("normalizes widget component instances and derives widget keys", () => {
    const normalized = normalizePageStudioDocument({
      widgets: {
        blocks: [
          {
            id: "B-0001",
            summary: "Hero",
            componentInstance: {
              componentKey: "post-title",
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
              }
            }
          }
        ]
      }
    });

    expect(normalized.widgets.blocks).toHaveLength(1);
    expect(normalized.widgets.blocks[0]).toMatchObject({
      id: "B-0001",
      widgetKey: "post-title",
      themeOverrideMode: "inherit",
      componentInstance: {
        componentKey: "post-title"
      }
    });
  });

  test("creates empty studio document with widget-ready defaults", () => {
    const document = createEmptyPageStudioDocument();

    expect(document.infra.clientKey).toBeTruthy();
    expect(document.layout.activeBreakpoint).toBe("desktop");
    expect(document.widgets.blocks).toEqual([]);
    expect(document.preview.urlParams).toEqual({
      slug: "first-cup-on-the-table"
    });
  });
});
