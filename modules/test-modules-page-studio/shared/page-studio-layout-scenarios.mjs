import { createSerializedBlockId } from "./page-studio-block-ids.mjs";

const BLOCK_TONES = Object.freeze([
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#ea580c",
  "#be123c",
  "#15803d",
  "#0369a1",
  "#a16207"
]);

function createBlock(sequence, summary) {
  return {
    id: createSerializedBlockId(sequence + 1),
    tone: BLOCK_TONES[sequence % BLOCK_TONES.length],
    summary,
    widgetKey: null
  };
}

function mapBlocks(blockSummaries = []) {
  return blockSummaries.map((summary, index) => createBlock(index, summary));
}

export const PAGE_STUDIO_LAYOUT_SCENARIOS = Object.freeze([
  {
    key: "story-stack",
    label: "Story Stack",
    description: "Classic editorial story page with a wide hero, long body, and supporting follow-up rows.",
    blocks: mapBlocks([
      "Story hero",
      "Intro / dek",
      "Main body",
      "Pull quote",
      "Related strip"
    ]),
    editorGrid: {
      desktop: [
        { blockId: "B-0001", x: 0, y: 0, w: 12, h: 4 },
        { blockId: "B-0002", x: 0, y: 4, w: 12, h: 6 },
        { blockId: "B-0003", x: 0, y: 10, w: 8, h: 13 },
        { blockId: "B-0004", x: 8, y: 10, w: 4, h: 5 },
        { blockId: "B-0005", x: 0, y: 23, w: 12, h: 6 }
      ],
      mobile: [
        { blockId: "B-0001", x: 0, y: 0, w: 12, h: 5 },
        { blockId: "B-0002", x: 0, y: 5, w: 12, h: 5 },
        { blockId: "B-0003", x: 0, y: 10, w: 12, h: 16 },
        { blockId: "B-0004", x: 0, y: 26, w: 12, h: 5 },
        { blockId: "B-0005", x: 0, y: 31, w: 12, h: 8 }
      ]
    }
  },
  {
    key: "story-sidebar",
    label: "Story + Sidebar",
    description: "Article layout with a strong reading column and a dedicated sidebar rail.",
    blocks: mapBlocks([
      "Headline band",
      "Lead media",
      "Body column",
      "Sidebar rail",
      "More stories"
    ]),
    editorGrid: {
      desktop: [
        { blockId: "B-0001", x: 0, y: 0, w: 12, h: 2 },
        { blockId: "B-0002", x: 0, y: 2, w: 12, h: 4 },
        { blockId: "B-0003", x: 0, y: 6, w: 8, h: 7 },
        { blockId: "B-0004", x: 8, y: 6, w: 4, h: 7 },
        { blockId: "B-0005", x: 0, y: 13, w: 12, h: 3 }
      ],
      mobile: [
        { blockId: "B-0001", x: 0, y: 0, w: 12, h: 4 },
        { blockId: "B-0002", x: 0, y: 4, w: 12, h: 5 },
        { blockId: "B-0003", x: 0, y: 9, w: 12, h: 14 },
        { blockId: "B-0004", x: 0, y: 23, w: 12, h: 8 },
        { blockId: "B-0005", x: 0, y: 31, w: 12, h: 7 }
      ]
    }
  },
  {
    key: "category-grid",
    label: "Category Grid",
    description: "Listing page with a short hero, filter bar, card grid, and bottom subscription area.",
    blocks: mapBlocks([
      "Category hero",
      "Filter / intro rail",
      "Lead card",
      "Grid card A",
      "Grid card B",
      "Grid card C",
      "Subscription strip"
    ]),
    editorGrid: {
      desktop: [
        { blockId: "B-0001", x: 0, y: 0, w: 12, h: 2 },
        { blockId: "B-0002", x: 0, y: 2, w: 12, h: 2 },
        { blockId: "B-0003", x: 0, y: 4, w: 12, h: 4 },
        { blockId: "B-0004", x: 0, y: 8, w: 4, h: 3 },
        { blockId: "B-0005", x: 4, y: 8, w: 4, h: 3 },
        { blockId: "B-0006", x: 8, y: 8, w: 4, h: 3 },
        { blockId: "B-0007", x: 0, y: 11, w: 12, h: 2 }
      ],
      mobile: [
        { blockId: "B-0001", x: 0, y: 0, w: 12, h: 2 },
        { blockId: "B-0002", x: 0, y: 2, w: 12, h: 2 },
        { blockId: "B-0003", x: 0, y: 4, w: 12, h: 4 },
        { blockId: "B-0004", x: 0, y: 8, w: 12, h: 3 },
        { blockId: "B-0005", x: 0, y: 11, w: 12, h: 3 },
        { blockId: "B-0006", x: 0, y: 14, w: 12, h: 3 },
        { blockId: "B-0007", x: 0, y: 17, w: 12, h: 2 }
      ]
    }
  },
  {
    key: "feature-landing",
    label: "Feature Landing",
    description: "Promotional landing with a tall hero, highlight pair, feature cards, and a call-to-action footer.",
    blocks: mapBlocks([
      "Hero banner",
      "Highlight A",
      "Highlight B",
      "Feature card A",
      "Feature card B",
      "Feature card C",
      "CTA footer"
    ]),
    editorGrid: {
      desktop: [
        { blockId: "B-0001", x: 0, y: 0, w: 12, h: 4 },
        { blockId: "B-0002", x: 0, y: 4, w: 6, h: 3 },
        { blockId: "B-0003", x: 6, y: 4, w: 6, h: 3 },
        { blockId: "B-0004", x: 0, y: 7, w: 4, h: 3 },
        { blockId: "B-0005", x: 4, y: 7, w: 4, h: 3 },
        { blockId: "B-0006", x: 8, y: 7, w: 4, h: 3 },
        { blockId: "B-0007", x: 0, y: 10, w: 12, h: 2 }
      ],
      mobile: [
        { blockId: "B-0001", x: 0, y: 0, w: 12, h: 3 },
        { blockId: "B-0002", x: 0, y: 3, w: 12, h: 2 },
        { blockId: "B-0003", x: 0, y: 5, w: 12, h: 2 },
        { blockId: "B-0004", x: 0, y: 7, w: 12, h: 3 },
        { blockId: "B-0005", x: 0, y: 10, w: 12, h: 3 },
        { blockId: "B-0006", x: 0, y: 13, w: 12, h: 3 },
        { blockId: "B-0007", x: 0, y: 16, w: 12, h: 2 }
      ]
    }
  }
]);

export function findPageStudioLayoutScenario(scenarioKey = "") {
  return PAGE_STUDIO_LAYOUT_SCENARIOS.find((scenario) => scenario.key === scenarioKey) ?? null;
}

export function buildPageStudioScenarioSeed(scenarioKey = "") {
  const scenario =
    findPageStudioLayoutScenario(scenarioKey) ?? PAGE_STUDIO_LAYOUT_SCENARIOS[0] ?? null;
  if (!scenario) {
    return null;
  }

  return {
    scenarioKey: scenario.key,
    blocks: scenario.blocks.map((block) => ({
      ...block
    })),
    editorGrid: {
      desktop: scenario.editorGrid.desktop.map((item) => ({ ...item })),
      tablet: [],
      mobile: scenario.editorGrid.mobile.map((item) => ({ ...item }))
    }
  };
}

export function inferPageStudioLayoutScenarioKey(blocks = []) {
  const blockSummaries = Array.isArray(blocks)
    ? blocks.map((block) => (typeof block?.summary === "string" ? block.summary.trim() : ""))
    : [];

  if (blockSummaries.length === 0) {
    return "";
  }

  for (const scenario of PAGE_STUDIO_LAYOUT_SCENARIOS) {
    const scenarioSummaries = scenario.blocks.map((block) => block.summary);
    if (
      scenarioSummaries.length === blockSummaries.length &&
      scenarioSummaries.every((summary, index) => summary === blockSummaries[index])
    ) {
      return scenario.key;
    }
  }

  return "";
}
