import { describe, expect, test } from "vitest";
import { allocateNextBlockId, createSerializedBlockId } from "../../../../modules/test-modules-page-studio/shared/page-studio-block-ids.mjs";
import {
  buildPageStudioScenarioSeed,
  inferPageStudioLayoutScenarioKey
} from "../../../../modules/test-modules-page-studio/shared/page-studio-layout-scenarios.mjs";
import {
  buildPageStudioRuntimeLayoutContract,
  materializePageStudioBreakpoints
} from "../../../../modules/test-modules-page-studio/shared/page-studio-layout-transform.mjs";

describe("page studio layout transform contract", () => {
  test("allocates serialized block ids without renumbering older blocks", () => {
    expect(createSerializedBlockId(1)).toBe("B-0001");
    expect(allocateNextBlockId([{ id: "B-0001" }, { id: "B-0004" }])).toBe("B-0005");
  });

  test("materializes inherited breakpoint placements from nearest parent breakpoint", () => {
    const materialized = materializePageStudioBreakpoints({
      desktop: {
        columns: 12,
        rowHeight: 32,
        items: [
          { blockId: "B-0001", x: 0, y: 0, w: 12, h: 3 },
          { blockId: "B-0002", x: 0, y: 3, w: 6, h: 2 }
        ]
      },
      tablet: {
        inherits: "desktop",
        columns: 12,
        rowHeight: 28,
        items: [{ blockId: "B-0002", x: 0, y: 4, w: 12, h: 2 }]
      },
      mobile: {
        inherits: "tablet",
        columns: 12,
        rowHeight: 24,
        items: []
      }
    });

    expect(materialized.tablet.items).toEqual([
      expect.objectContaining({ blockId: "B-0001", x: 0, y: 0, w: 12, h: 3 }),
      expect.objectContaining({ blockId: "B-0002", x: 0, y: 4, w: 12, h: 2 })
    ]);
    expect(materialized.mobile.items).toEqual(materialized.tablet.items);
  });

  test("builds deployment-safe runtime contract without editor coordinates", () => {
    const contract = buildPageStudioRuntimeLayoutContract({
      editorGrid: {
        desktop: {
          columns: 12,
          rowHeight: 32,
          items: [{ blockId: "B-0003", x: 2, y: 5, w: 4, h: 3 }]
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
      }
    });

    expect(contract.breakpoints.desktop.items).toEqual([
      {
        blockId: "B-0003",
        colStart: 3,
        colSpan: 4,
        rowStart: 6,
        rowSpan: 3
      }
    ]);
    expect(contract.breakpoints.desktop.items[0].x).toBeUndefined();
    expect(contract.breakpoints.desktop.items[0].y).toBeUndefined();
  });

  test("provides real-life scenario seeds with stable block ids and mobile overrides", () => {
    const seed = buildPageStudioScenarioSeed("story-sidebar");

    expect(seed.scenarioKey).toBe("story-sidebar");
    expect(seed.blocks.map((block) => block.id)).toEqual([
      "B-0001",
      "B-0002",
      "B-0003",
      "B-0004",
      "B-0005"
    ]);
    expect(seed.editorGrid.desktop).toHaveLength(5);
    expect(seed.editorGrid.mobile).toHaveLength(5);
    expect(seed.blocks[3].summary).toBe("Sidebar rail");
  });

  test("infers the saved scenario from block summaries when older drafts predate scenario persistence", () => {
    const seed = buildPageStudioScenarioSeed("feature-landing");

    expect(inferPageStudioLayoutScenarioKey(seed.blocks)).toBe("feature-landing");
  });
});
