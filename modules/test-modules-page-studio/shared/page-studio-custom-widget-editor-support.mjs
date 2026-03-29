import {
  PAGE_STUDIO_BREAKPOINTS,
  PAGE_STUDIO_BREAKPOINT_INHERITANCE
} from "./page-studio-breakpoints.mjs";
import { createEmptyPageStudioDocument, normalizePageStudioDocument } from "./page-studio-document.mjs";
import { buildPageStudioQueryDefinition } from "./page-studio-queries.mjs";
import { normalizeCustomWidgetComposition } from "./page-studio-custom-widget-composition.mjs";

function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function createComponentInstance(componentKey, overrides = {}) {
  return {
    componentKey,
    variantKey: "default",
    content: overrides.content ?? {},
    props: overrides.props ?? {},
    actions: overrides.actions ?? []
  };
}

function createPostDetailInfra() {
  return {
    routePath: "/journal/:slug",
    queryParams: [
      {
        id: "slug",
        label: "Story slug",
        required: true,
        sampleValue: "first-cup-on-the-table"
      }
    ],
    queries: [
      buildPageStudioQueryDefinition("primary-post-by-param", {
        id: "primary-post",
        label: "Primary Post",
        paramId: "slug"
      }),
      buildPageStudioQueryDefinition("related-posts-by-category", {
        id: "related-category"
      })
    ],
    seoTags: [],
    clientKey: "mui-reader",
    themeKey: "global-default"
  };
}

function createCategoryDetailInfra() {
  return {
    routePath: "/category/:slug",
    queryParams: [
      {
        id: "slug",
        label: "Category slug",
        required: true,
        sampleValue: "home-corners"
      }
    ],
    queries: [
      buildPageStudioQueryDefinition("primary-category-by-param", {
        id: "primary-category",
        label: "Primary Category",
        paramId: "slug"
      }),
      buildPageStudioQueryDefinition("posts-by-category", {
        id: "category-posts",
        label: "Category Posts"
      })
    ],
    seoTags: [],
    clientKey: "mui-reader",
    themeKey: "global-default"
  };
}

function createRuntimeMetadata(overrides = {}) {
  const base = createEmptyPageStudioDocument().layout.runtimeLayoutMetadata;
  return {
    canvasMaxWidth: {
      ...base.canvasMaxWidth,
      ...(overrides.canvasMaxWidth ?? {})
    },
    gap: {
      ...base.gap,
      ...(overrides.gap ?? {})
    },
    padding: {
      ...base.padding,
      ...(overrides.padding ?? {})
    }
  };
}

function createEditorGrid(itemsByBreakpoint = {}, rowHeights = {}, columns = {}) {
  return Object.fromEntries(
    PAGE_STUDIO_BREAKPOINTS.map((breakpoint) => [
      breakpoint,
      {
        inherits: PAGE_STUDIO_BREAKPOINT_INHERITANCE[breakpoint],
        columns: Number.isFinite(Number(columns?.[breakpoint])) ? Number(columns[breakpoint]) : 12,
        rowHeight: Number.isFinite(Number(rowHeights?.[breakpoint])) ? Number(rowHeights[breakpoint]) : undefined,
        items: cloneJsonValue(itemsByBreakpoint?.[breakpoint] ?? [])
      }
    ])
  );
}

function buildBlankStarter(pageKind = "post-detail") {
  const isCategory = pageKind === "category-detail";
  return normalizePageStudioDocument({
    ...createEmptyPageStudioDocument(),
    title: "Untitled Custom Widget",
    mode: "layout",
    infra: isCategory ? createCategoryDetailInfra() : createPostDetailInfra(),
    layout: {
      scenarioKey: "custom-widget-blank",
      activeBreakpoint: "desktop",
      editorGrid: createEditorGrid(
        {
          desktop: [{ blockId: "B-0001", x: 0, y: 0, w: 12, h: 5, minW: 2, minH: 2 }],
          tablet: [{ blockId: "B-0001", x: 0, y: 0, w: 12, h: 5, minW: 2, minH: 2 }],
          mobile: [{ blockId: "B-0001", x: 0, y: 0, w: 12, h: 6, minW: 2, minH: 2 }]
        },
        {
          desktop: 32,
          tablet: 28,
          mobile: 24
        }
      ),
      runtimeLayoutMetadata: createRuntimeMetadata()
    },
    widgets: {
      blocks: [
        {
          id: "B-0001",
          tone: "#2563eb",
          summary: "Primary block",
          widgetKey: null,
          componentInstance: null,
          themeOverrideMode: "inherit"
        }
      ]
    },
    preview: {
      urlParams: {
        slug: isCategory ? "home-corners" : "first-cup-on-the-table"
      }
    }
  });
}

function buildMediaTitleCtaStarter(pageKind = "post-detail") {
  const isCategory = pageKind === "category-detail";
  return normalizePageStudioDocument({
    ...createEmptyPageStudioDocument(),
    title: "Media Title CTA Widget",
    mode: "layout",
    infra: isCategory ? createCategoryDetailInfra() : createPostDetailInfra(),
    layout: {
      scenarioKey: "custom-widget-media-title-cta",
      activeBreakpoint: "desktop",
      editorGrid: createEditorGrid(
        {
          desktop: [
            { blockId: "B-0001", x: 0, y: 0, w: 12, h: 8, minW: 3, minH: 3 },
            { blockId: "B-0002", x: 0, y: 8, w: 12, h: 3, minW: 3, minH: 2 },
            { blockId: "B-0003", x: 0, y: 11, w: 12, h: 3, minW: 3, minH: 2 }
          ],
          tablet: [
            { blockId: "B-0001", x: 0, y: 0, w: 12, h: 7, minW: 3, minH: 3 },
            { blockId: "B-0002", x: 0, y: 7, w: 12, h: 3, minW: 3, minH: 2 },
            { blockId: "B-0003", x: 0, y: 10, w: 12, h: 3, minW: 3, minH: 2 }
          ],
          mobile: [
            { blockId: "B-0001", x: 0, y: 0, w: 12, h: 7, minW: 3, minH: 3 },
            { blockId: "B-0002", x: 0, y: 7, w: 12, h: 4, minW: 3, minH: 2 },
            { blockId: "B-0003", x: 0, y: 11, w: 12, h: 3, minW: 3, minH: 2 }
          ]
        },
        {
          desktop: 32,
          tablet: 28,
          mobile: 24
        }
      ),
      runtimeLayoutMetadata: createRuntimeMetadata()
    },
    widgets: {
      blocks: [
        {
          id: "B-0001",
          tone: "#2563eb",
          summary: "Lead media",
          widgetKey: "media-image",
          componentInstance: createComponentInstance("media-image"),
          themeOverrideMode: "inherit"
        },
        {
          id: "B-0002",
          tone: "#3b82f6",
          summary: "Headline",
          widgetKey: isCategory ? "category-title" : "post-title",
          componentInstance: createComponentInstance(isCategory ? "category-title" : "post-title"),
          themeOverrideMode: "inherit"
        },
        {
          id: "B-0003",
          tone: "#1d4ed8",
          summary: "Call to action",
          widgetKey: "button-cta",
          componentInstance: createComponentInstance("button-cta"),
          themeOverrideMode: "inherit"
        }
      ]
    },
    preview: {
      urlParams: {
        slug: isCategory ? "home-corners" : "first-cup-on-the-table"
      }
    }
  });
}

export const CUSTOM_WIDGET_STARTER_PRESETS = Object.freeze([
  {
    key: "blank-composition",
    title: "Blank Composition",
    description: "Start from one empty block and build the structure yourself."
  },
  {
    key: "media-title-cta",
    title: "Media · Title · CTA",
    description: "Start from a common editorial promo widget with image, title, and button."
  }
]);

export const CUSTOM_WIDGET_CONTEXT_PRESETS = Object.freeze([
  {
    key: "post-detail",
    title: "Post Detail",
    description: "Bind against post context such as title, body, featured media, and related posts."
  },
  {
    key: "category-detail",
    title: "Category Detail",
    description: "Bind against category context such as category title, description, and post listings."
  }
]);

export function buildCustomWidgetStudioDraft({
  starterKey = "blank-composition",
  contextPresetKey = "post-detail"
} = {}) {
  if (starterKey === "media-title-cta") {
    return buildMediaTitleCtaStarter(contextPresetKey);
  }
  return buildBlankStarter(contextPresetKey);
}

function buildInfraFromCompositionSource(source = {}) {
  if (source?.pageKind === "category-detail" || source?.primarySourceType === "blog-category") {
    return createCategoryDetailInfra();
  }
  return createPostDetailInfra();
}

function buildEditorGridFromComposition(composition = null) {
  const normalized = normalizeCustomWidgetComposition(composition);
  const breakpoints = normalized?.runtimeLayoutContract?.breakpoints ?? {};
  return Object.fromEntries(
    PAGE_STUDIO_BREAKPOINTS.map((breakpoint) => {
      const runtimeBreakpoint = breakpoints?.[breakpoint] ?? {};
      return [
        breakpoint,
        {
          inherits: PAGE_STUDIO_BREAKPOINT_INHERITANCE[breakpoint],
          columns: Number.isFinite(Number(runtimeBreakpoint.columns)) ? Number(runtimeBreakpoint.columns) : 12,
          rowHeight: Number.isFinite(Number(runtimeBreakpoint.rowHeight)) ? Number(runtimeBreakpoint.rowHeight) : 32,
          items: Array.isArray(runtimeBreakpoint.items)
            ? runtimeBreakpoint.items.map((item) => ({
                blockId: item.blockId,
                x: Math.max(0, Number(item.colStart ?? 1) - 1),
                y: Math.max(0, Number(item.rowStart ?? 1) - 1),
                w: Number.isFinite(Number(item.colSpan)) ? Number(item.colSpan) : 12,
                h: Number.isFinite(Number(item.rowSpan)) ? Number(item.rowSpan) : 3,
                minW: 1,
                minH: 1
              }))
            : []
        }
      ];
    })
  );
}

function buildRuntimeMetadataFromComposition(composition = null) {
  const normalized = normalizeCustomWidgetComposition(composition);
  const base = createEmptyPageStudioDocument().layout.runtimeLayoutMetadata;
  const desktop = normalized?.runtimeLayoutContract?.breakpoints?.desktop ?? {};
  const tablet = normalized?.runtimeLayoutContract?.breakpoints?.tablet ?? {};
  const mobile = normalized?.runtimeLayoutContract?.breakpoints?.mobile ?? {};
  return {
    canvasMaxWidth: {
      ...base.canvasMaxWidth,
      desktop: Number.isFinite(Number(desktop.canvasMaxWidth)) ? Number(desktop.canvasMaxWidth) : base.canvasMaxWidth.desktop,
      tablet: Number.isFinite(Number(tablet.canvasMaxWidth)) ? Number(tablet.canvasMaxWidth) : base.canvasMaxWidth.tablet,
      mobile: Number.isFinite(Number(mobile.canvasMaxWidth)) ? Number(mobile.canvasMaxWidth) : base.canvasMaxWidth.mobile
    },
    gap: {
      ...base.gap,
      desktop: Number.isFinite(Number(desktop.gap)) ? Number(desktop.gap) : base.gap.desktop,
      tablet: Number.isFinite(Number(tablet.gap)) ? Number(tablet.gap) : base.gap.tablet,
      mobile: Number.isFinite(Number(mobile.gap)) ? Number(mobile.gap) : base.gap.mobile
    },
    padding: {
      ...base.padding,
      desktop: Number.isFinite(Number(desktop.padding)) ? Number(desktop.padding) : base.padding.desktop,
      tablet: Number.isFinite(Number(tablet.padding)) ? Number(tablet.padding) : base.padding.tablet,
      mobile: Number.isFinite(Number(mobile.padding)) ? Number(mobile.padding) : base.padding.mobile
    }
  };
}

export function buildStudioDocumentFromCustomWidget(item = null) {
  const composition = normalizeCustomWidgetComposition(item?.composition);
  if (!composition) {
    return buildCustomWidgetStudioDraft();
  }

  return normalizePageStudioDocument({
    ...createEmptyPageStudioDocument(),
    title: normalizeText(item?.title, "Custom Widget"),
    mode: "layout",
    infra: buildInfraFromCompositionSource(composition.source),
    layout: {
      scenarioKey: normalizeText(composition?.source?.scenarioKey, "custom-widget"),
      activeBreakpoint: "desktop",
      editorGrid: buildEditorGridFromComposition(composition),
      runtimeLayoutMetadata: buildRuntimeMetadataFromComposition(composition)
    },
    widgets: {
      blocks: cloneJsonValue(composition.blocks ?? [])
    },
    preview: {
      urlParams: {
        slug:
          composition?.source?.pageKind === "category-detail"
            ? "home-corners"
            : "first-cup-on-the-table"
      }
    }
  });
}
