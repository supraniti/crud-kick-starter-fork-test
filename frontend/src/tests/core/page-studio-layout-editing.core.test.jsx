import { describe, expect, test } from "vitest";
import {
  buildPageStudioExplicitGridItems,
  createPageStudioDefaultGridItem,
  removePageStudioBlockFromEditorGrid
} from "../../../../modules/test-modules-page-studio/shared/page-studio-layout-editing.mjs";

describe("page studio layout editing helpers", () => {
  test("stores only changed items for inherited breakpoints", () => {
    const explicitTabletItems = buildPageStudioExplicitGridItems({
      breakpoint: "tablet",
      editorGrid: {
        desktop: {
          columns: 12,
          rowHeight: 32,
          items: [
            { blockId: "B-0001", x: 0, y: 0, w: 12, h: 3 },
            { blockId: "B-0002", x: 0, y: 3, w: 12, h: 3 }
          ]
        },
        tablet: {
          inherits: "desktop",
          columns: 12,
          rowHeight: 28,
          items: []
        },
        mobile: {
          inherits: "tablet",
          columns: 12,
          rowHeight: 24,
          items: []
        }
      },
      visibleItems: [
        { blockId: "B-0001", x: 0, y: 0, w: 12, h: 3, minW: 1, minH: 1 },
        { blockId: "B-0002", x: 0, y: 6, w: 12, h: 3, minW: 1, minH: 1 }
      ]
    });

    expect(explicitTabletItems).toEqual([
      { blockId: "B-0002", x: 0, y: 6, w: 12, h: 3, minW: 1, minH: 1 }
    ]);
  });

  test("creates the next block at the first free row after existing items", () => {
    expect(
      createPageStudioDefaultGridItem({
        blockId: "B-0003",
        existingItems: [
          { blockId: "B-0001", x: 0, y: 0, w: 12, h: 3 },
          { blockId: "B-0002", x: 0, y: 3, w: 6, h: 2 }
        ]
      })
    ).toEqual({
      blockId: "B-0003",
      x: 0,
      y: 5,
      w: 12,
      h: 3,
      minW: 1,
      minH: 1
    });
  });

  test("removes a block from every breakpoint definition", () => {
    const nextEditorGrid = removePageStudioBlockFromEditorGrid(
      {
        desktop: {
          columns: 12,
          rowHeight: 32,
          items: [
            { blockId: "B-0001", x: 0, y: 0, w: 12, h: 3 },
            { blockId: "B-0002", x: 0, y: 3, w: 12, h: 3 }
          ]
        },
        tablet: {
          inherits: "desktop",
          columns: 12,
          rowHeight: 28,
          items: [{ blockId: "B-0002", x: 0, y: 4, w: 12, h: 3 }]
        },
        mobile: {
          inherits: "tablet",
          columns: 12,
          rowHeight: 24,
          items: []
        }
      },
      "B-0002"
    );

    expect(nextEditorGrid.desktop.items).toEqual([
      { blockId: "B-0001", x: 0, y: 0, w: 12, h: 3, minW: 1, minH: 1 }
    ]);
    expect(nextEditorGrid.tablet.items).toEqual([]);
  });
});
