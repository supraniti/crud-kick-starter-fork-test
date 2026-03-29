import { PAGE_STUDIO_CLIENTS, resolvePageStudioClient } from "./page-studio-clients.mjs";
import {
  buildPageStudioQueryDefinition,
  normalizePageStudioQueryDefinition
} from "./page-studio-queries.mjs";
import {
  PAGE_STUDIO_BREAKPOINTS,
  PAGE_STUDIO_DEFAULT_EDITOR_GRID,
  PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT,
  normalizePageStudioBreakpoint
} from "./page-studio-breakpoints.mjs";
import { normalizePageStudioMode } from "./page-studio-modes.mjs";
import { normalizeWidgetComponentInstance } from "../../test-modules-layouts/shared/widget-component-schema.mjs";
import { normalizeWidgetBindingDescriptor } from "../../test-modules-layouts/shared/widget-component-schema.mjs";

function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeQueryParamDefinition(entry = {}) {
  return {
    id: normalizeText(entry?.id, ""),
    label: normalizeText(entry?.label, "Param"),
    required: entry?.required === true,
    sampleValue: normalizeText(entry?.sampleValue, "")
  };
}

function normalizeSeoTagDefinition(entry = {}) {
  return {
    key: normalizeText(entry?.key, ""),
    label: normalizeText(entry?.label, "Tag"),
    valueBinding: normalizeWidgetBindingDescriptor(
      entry?.valueBinding ?? {
        mode: "static",
        value: normalizeText(entry?.value, "")
      },
      ""
    )
  };
}

function normalizeWidgetBlock(entry = {}) {
  const componentInstance = normalizeWidgetComponentInstance(entry?.componentInstance ?? null);
  return {
    id: normalizeText(entry?.id, ""),
    tone: normalizeText(entry?.tone, "#2563eb"),
    summary: normalizeText(entry?.summary, "Block"),
    widgetKey: normalizeText(entry?.widgetKey, "") || componentInstance?.componentKey || null,
    componentInstance,
    themeOverrideMode:
      normalizeText(entry?.themeOverrideMode, "inherit") === "pinned"
        ? "pinned"
        : "inherit"
  };
}

function normalizeGridItem(entry = {}) {
  return {
    blockId: normalizeText(entry?.blockId, ""),
    x: normalizeNumber(entry?.x, 0),
    y: normalizeNumber(entry?.y, 0),
    w: normalizeNumber(entry?.w, 12),
    h: normalizeNumber(entry?.h, 3),
    minW: normalizeNumber(entry?.minW, 1),
    minH: normalizeNumber(entry?.minH, 1)
  };
}

function normalizeEditorGridBreakpoint(source = {}, breakpoint) {
  const defaults = PAGE_STUDIO_DEFAULT_EDITOR_GRID[breakpoint];
  return {
    inherits:
      breakpoint === "desktop"
        ? null
        : normalizePageStudioBreakpoint(source?.inherits, PAGE_STUDIO_BREAKPOINTS[PAGE_STUDIO_BREAKPOINTS.indexOf(breakpoint) - 1]),
    columns: normalizeNumber(source?.columns, defaults.columns),
    rowHeight: normalizeNumber(source?.rowHeight, defaults.rowHeight),
    items: toArray(source?.items).map((entry) => normalizeGridItem(entry)).filter((entry) => entry.blockId.length > 0)
  };
}

function normalizeRuntimeLayoutScalarMap(source = {}, defaults = {}) {
  return Object.fromEntries(
    PAGE_STUDIO_BREAKPOINTS.map((breakpoint) => [
      breakpoint,
      normalizeNumber(source?.[breakpoint], defaults[breakpoint])
    ])
  );
}

export function createEmptyPageStudioDocument() {
  return {
    title: "Story Studio Page",
    mode: "infra",
    infra: {
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
        buildPageStudioQueryDefinition("related-posts-by-author", {
          id: "related-author"
        }),
        buildPageStudioQueryDefinition("related-posts-by-category", {
          id: "related-category"
        }),
        buildPageStudioQueryDefinition("related-posts-by-tag", {
          id: "related-tag"
        })
      ],
      seoTags: [
        {
          key: "title",
          label: "SEO Title",
          valueBinding: {
            mode: "dynamic",
            source: "context",
            path: "context.post.title"
          }
        },
        {
          key: "description",
          label: "SEO Description",
          valueBinding: {
            mode: "dynamic",
            source: "context",
            path: "context.post.excerpt"
          }
        }
      ],
      clientKey: PAGE_STUDIO_CLIENTS[2].key,
      themeKey: "global-default"
    },
    layout: {
      scenarioKey: "story-stack",
      activeBreakpoint: "desktop",
      editorGrid: {
        desktop: {
          inherits: null,
          columns: PAGE_STUDIO_DEFAULT_EDITOR_GRID.desktop.columns,
          rowHeight: PAGE_STUDIO_DEFAULT_EDITOR_GRID.desktop.rowHeight,
          items: []
        },
        tablet: {
          inherits: "desktop",
          columns: PAGE_STUDIO_DEFAULT_EDITOR_GRID.tablet.columns,
          rowHeight: PAGE_STUDIO_DEFAULT_EDITOR_GRID.tablet.rowHeight,
          items: []
        },
        mobile: {
          inherits: "tablet",
          columns: PAGE_STUDIO_DEFAULT_EDITOR_GRID.mobile.columns,
          rowHeight: PAGE_STUDIO_DEFAULT_EDITOR_GRID.mobile.rowHeight,
          items: []
        }
      },
      runtimeLayoutMetadata: {
        canvasMaxWidth: cloneJsonValue(PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.canvasMaxWidth),
        gap: cloneJsonValue(PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.gap),
        padding: cloneJsonValue(PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.padding)
      }
    },
    widgets: {
      blocks: []
    },
    preview: {
      urlParams: {
        slug: "first-cup-on-the-table"
      }
    }
  };
}

export function normalizePageStudioDocument(value) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : createEmptyPageStudioDocument();
  const normalizedClient = resolvePageStudioClient(source?.infra?.clientKey);

  return {
    title: normalizeText(source.title, "Untitled Studio Page"),
    mode: normalizePageStudioMode(source.mode, "infra"),
    infra: {
      routePath: normalizeText(source?.infra?.routePath, "/untitled"),
      queryParams: toArray(source?.infra?.queryParams).map((entry) => normalizeQueryParamDefinition(entry)),
      queries: toArray(source?.infra?.queries).map((entry, index) => normalizePageStudioQueryDefinition(entry, index)),
      seoTags: toArray(source?.infra?.seoTags).map((entry) => normalizeSeoTagDefinition(entry)),
      clientKey: normalizedClient.key,
      themeKey: normalizeText(source?.infra?.themeKey, "global-default")
    },
    layout: {
      scenarioKey: normalizeText(source?.layout?.scenarioKey, "story-stack"),
      activeBreakpoint: normalizePageStudioBreakpoint(source?.layout?.activeBreakpoint, "desktop"),
      editorGrid: {
        desktop: normalizeEditorGridBreakpoint(source?.layout?.editorGrid?.desktop, "desktop"),
        tablet: normalizeEditorGridBreakpoint(source?.layout?.editorGrid?.tablet, "tablet"),
        mobile: normalizeEditorGridBreakpoint(source?.layout?.editorGrid?.mobile, "mobile")
      },
      runtimeLayoutMetadata: {
        canvasMaxWidth: normalizeRuntimeLayoutScalarMap(
          source?.layout?.runtimeLayoutMetadata?.canvasMaxWidth,
          PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.canvasMaxWidth
        ),
        gap: normalizeRuntimeLayoutScalarMap(
          source?.layout?.runtimeLayoutMetadata?.gap,
          PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.gap
        ),
        padding: normalizeRuntimeLayoutScalarMap(
          source?.layout?.runtimeLayoutMetadata?.padding,
          PAGE_STUDIO_DEFAULT_RUNTIME_LAYOUT.padding
        )
      }
    },
    widgets: {
      blocks: toArray(source?.widgets?.blocks).map((entry) => normalizeWidgetBlock(entry)).filter((entry) => entry.id.length > 0)
    },
    preview: {
      urlParams: cloneJsonValue(source?.preview?.urlParams ?? {})
    }
  };
}
