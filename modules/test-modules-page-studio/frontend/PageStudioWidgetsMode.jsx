import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import {
  createReferenceCollectionItem,
  fetchReferenceCollectionItems
} from "../../../frontend/src/api/reference.js";
import { LayoutBuilderCanvasShell } from "../../test-modules-layouts/frontend/LayoutBuilderCanvasShell.jsx";
import { LayoutBuilderComponentLibrary } from "../../test-modules-layouts/frontend/LayoutBuilderComponentLibrary.jsx";
import { LayoutBuilderWidgetInspector } from "../../test-modules-layouts/frontend/LayoutBuilderWidgetInspector.jsx";
import {
  clampViewportHeight,
  clampViewportWidth,
  clampZoomLevel,
  DEFAULT_ZOOM_LEVEL,
  VIEWPORT_PRESETS
} from "../../test-modules-layouts/frontend/layout-builder-viewport.js";
import {
  DEFAULT_WIDGET_COMPONENT_REGISTRY
} from "../../test-modules-layouts/shared/widget-component-schema.mjs";
import { buildWidgetContextScope } from "../../test-modules-pages/shared/page-widget-context.mjs";
import { resolvePageContextManifest } from "../../test-modules-pages/server/page-context-manifest-runtime.mjs";
import { summarizeWidgetInstance } from "../../test-modules-pages/shared/page-widget-compatibility.mjs";
import { PAGE_STUDIO_BREAKPOINT_LABELS } from "../shared/page-studio-breakpoints.mjs";
import { buildCustomWidgetCompositionFromStudioDocument } from "../shared/page-studio-custom-widget-composition.mjs";
import {
  buildCustomWidgetLibraryEntries,
  createComponentInstanceFromWidgetLibraryEntry
} from "../shared/page-studio-custom-widget-library.mjs";
import { resolvePageStudioContextContract } from "../shared/page-studio-queries.mjs";
import { buildPageStudioRuntimeLayoutContract } from "../shared/page-studio-layout-transform.mjs";
import {
  buildPageStudioScenarioWidgetSeed,
  pageStudioScenarioHasStarterWidgets
} from "../shared/page-studio-widget-seeds.mjs";
import { buildPageStudioCanvasFrameMetrics } from "./page-studio-canvas-frame.js";
import {
  buildPageStudioPreviewDescriptor,
  buildPageStudioPreviewModel,
  resolvePageStudioPreviewTheme
} from "./page-studio-preview-data.js";
import { PageStudioRuntimeCanvas } from "./PageStudioRuntimeCanvas.jsx";
import { getPageStudioPreviewBootstrapResources } from "./page-studio-preview-resources.js";
import { CUSTOM_WIDGETS_COLLECTION_ID } from "../server/page-studio-shared-runtime.mjs";

const MEDIA_ITEMS_COLLECTION_ID = "media-items";
const POSTS_COLLECTION_ID = "blog-posts";
const AUTHORS_COLLECTION_ID = "blog-authors";
const CATEGORIES_COLLECTION_ID = "blog-categories";
const TAGS_COLLECTION_ID = "blog-tags";
const RECENT_WIDGETS_STORAGE_KEY = "page-studio.recent-widgets.v1";

const CANVAS_FIT_WIDTH_OFFSET = 96;
const CANVAS_FIT_HEIGHT_OFFSET = 120;
const STUDIO_RAIL_WIDTH = 336;

function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function RailSection({ title, description = null, children }) {
  return (
    <Paper variant="outlined" square sx={{ p: 1 }}>
      <Stack spacing={0.75}>
        <Stack spacing={0.2}>
          <Typography variant="subtitle2">{title}</Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          ) : null}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function slugifyWidgetKey(value, fallback = "custom-widget") {
  const normalized = normalizeText(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function readPersistedRecentWidgets() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const rawValue = window.localStorage.getItem(RECENT_WIDGETS_STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function persistRecentWidgets(entries = []) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(RECENT_WIDGETS_STORAGE_KEY, JSON.stringify(entries.slice(0, 8)));
}

function buildViewportFromBreakpoint(breakpoint) {
  if (breakpoint === "mobile") {
    return VIEWPORT_PRESETS.find((entry) => entry.id === "mobile") ?? null;
  }
  if (breakpoint === "tablet") {
    return VIEWPORT_PRESETS.find((entry) => entry.id === "tablet") ?? null;
  }
  return VIEWPORT_PRESETS.find((entry) => entry.id === "desktop") ?? null;
}

function mapViewportPresetToBreakpoint(preset = null) {
  if (!preset?.id) {
    return null;
  }
  if (preset.id === "mobile") {
    return "mobile";
  }
  if (preset.id === "tablet") {
    return "tablet";
  }
  return "desktop";
}

function computeAutoFitZoomLevel({ viewport, shellBounds }) {
  if (!viewport || !shellBounds?.width || !shellBounds?.height) {
    return DEFAULT_ZOOM_LEVEL;
  }

  const availableWidth = Math.max(240, shellBounds.width - CANVAS_FIT_WIDTH_OFFSET);
  const availableHeight = Math.max(240, shellBounds.height - CANVAS_FIT_HEIGHT_OFFSET);
  const widthRatio = availableWidth / viewport.width;
  const heightRatio = availableHeight / viewport.height;
  const fitRatio = Math.min(widthRatio, heightRatio, 1);

  return clampZoomLevel(Math.floor(fitRatio * 100));
}

function createStudioContextPayload(studioDocument) {
  const inferred = resolvePageStudioContextContract(studioDocument);
  const pathPattern = normalizeText(studioDocument?.infra?.routePath, "/untitled");
  return {
    page: {
      id: "page-studio-preview",
      title: normalizeText(studioDocument?.title, "Page Studio Preview"),
      pathPattern,
      path: pathPattern,
      pageKind: inferred.pageKind,
      primarySourceType: inferred.primarySourceType
    },
    application: {
      model: inferred.pageKind ? { kind: inferred.pageKind } : { kind: "generic-page" }
    }
  };
}

function readAvailableComponents(pageContextManifest = null) {
  const pageKind = pageContextManifest?.pageKind ?? "post-detail";
  const primarySourceType = pageContextManifest?.primarySourceType ?? "blog-post";
  return [...DEFAULT_WIDGET_COMPONENT_REGISTRY.values()].filter((descriptor) => {
    if (descriptor.hiddenInLibrary === true) {
      return false;
    }
    const pageKindAllowed =
      !Array.isArray(descriptor.supportedPageKinds) || descriptor.supportedPageKinds.length === 0
        ? true
        : descriptor.supportedPageKinds.includes(pageKind);
    const sourceAllowed =
      !Array.isArray(descriptor.supportedPrimarySourceTypes) || descriptor.supportedPrimarySourceTypes.length === 0
        ? true
        : descriptor.supportedPrimarySourceTypes.includes(primarySourceType);
    return pageKindAllowed && sourceAllowed;
  });
}

function inferPlaceholderType(block = {}) {
  const text = `${block.id} ${block.summary}`.toLowerCase();
  if (text.includes("hero")) {
    return "hero";
  }
  if (text.includes("sidebar")) {
    return "sidebar";
  }
  if (text.includes("image") || text.includes("media")) {
    return "image";
  }
  if (text.includes("cta")) {
    return "cta";
  }
  if (text.includes("feature")) {
    return "feature";
  }
  if (text.includes("text") || text.includes("body")) {
    return "text";
  }
  return "content";
}

function createPreviewNode(block = {}) {
  return {
    id: block.id,
    label: block.summary || block.id,
    kind: "block",
    componentInstance: block.componentInstance ?? null,
    props: {
      placeholderType: inferPlaceholderType(block),
      minHeight: 140
    }
  };
}

function useMediaLibraryOptions() {
  const [state, setState] = useState({
    loading: true,
    errorMessage: null,
    items: []
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await fetchReferenceCollectionItems({
          collectionId: MEDIA_ITEMS_COLLECTION_ID,
          limit: 500
        });
        if (!active) {
          return;
        }
        setState({
          loading: false,
          errorMessage: null,
          items: Array.isArray(payload?.items) ? payload.items : []
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setState({
          loading: false,
          errorMessage: error?.message ?? "Failed to load media library",
          items: []
        });
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return state;
}

function useCustomWidgetsLibrary() {
  const [state, setState] = useState({
    loading: true,
    errorMessage: null,
    items: []
  });

  const loadRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await fetchReferenceCollectionItems({
          collectionId: CUSTOM_WIDGETS_COLLECTION_ID,
          limit: 500
        });
        if (!active) {
          return;
        }
        setState({
          loading: false,
          errorMessage: null,
          items: Array.isArray(payload?.items) ? payload.items : []
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setState({
          loading: false,
          errorMessage: error?.message ?? "Failed to load custom widgets",
          items: []
        });
      }
    }

    loadRef.current = load;
    void load();
    return () => {
      active = false;
    };
  }, []);

  return {
    ...state,
    reload: async () => {
      if (typeof loadRef.current === "function") {
        await loadRef.current();
      }
    }
  };
}

function useWidgetRuntimePreviewCollections(enabled = true) {
  const [state, setState] = useState({
    contentLoading: enabled,
    themeLoading: true,
    errorMessage: null,
    collections: {
      posts: [],
      authors: [],
      categories: [],
      tags: [],
      mediaItems: [],
      themes: [],
      customWidgets: []
    }
  });

  useEffect(() => {
    if (!enabled) {
      setState((previous) => ({
        ...previous,
        contentLoading: false,
        themeLoading: false
      }));
      return undefined;
    }
    let active = true;

    async function load() {
      try {
        const [posts, authors, categories, tags, mediaItems, themes, customWidgets] = await Promise.all([
          fetchReferenceCollectionItems({ collectionId: POSTS_COLLECTION_ID, limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: AUTHORS_COLLECTION_ID, limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: CATEGORIES_COLLECTION_ID, limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: TAGS_COLLECTION_ID, limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: MEDIA_ITEMS_COLLECTION_ID, limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: "page-themes", limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: CUSTOM_WIDGETS_COLLECTION_ID, limit: 500 })
        ]);
        if (!active) {
          return;
        }
        setState({
          contentLoading: false,
          themeLoading: false,
          errorMessage: null,
          collections: {
            posts: Array.isArray(posts?.items) ? posts.items : [],
            authors: Array.isArray(authors?.items) ? authors.items : [],
            categories: Array.isArray(categories?.items) ? categories.items : [],
            tags: Array.isArray(tags?.items) ? tags.items : [],
            mediaItems: Array.isArray(mediaItems?.items) ? mediaItems.items : [],
            themes: Array.isArray(themes?.items) ? themes.items : [],
            customWidgets: Array.isArray(customWidgets?.items) ? customWidgets.items : []
          }
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setState({
          contentLoading: false,
          themeLoading: false,
          errorMessage: error?.message ?? "Failed to load widget preview data",
          collections: {
            posts: [],
            authors: [],
            categories: [],
            tags: [],
            mediaItems: [],
            themes: [],
            customWidgets: []
          }
        });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [enabled]);

  return state;
}

function buildBuiltInWidgetLibraryEntries(components = [], recentWidgetKeys = []) {
  const suggestedKeys = new Set([
    "post-title",
    "media-image",
    "post-rich-text",
    "story-card",
    "hero-story",
    "section-heading",
    "metadata-strip",
    "post-list",
    "promo-panel",
    "divider-rule",
    "button-cta",
    "author-card",
    "related-posts",
    "post-navigation"
  ]);

  const builtInEntries = components.map((descriptor) => ({
    libraryKey: descriptor.componentKey,
    componentKey: descriptor.componentKey,
    displayName: descriptor.displayName,
    icon: descriptor.icon ?? "widgets",
    libraryCategory: descriptor.libraryCategory ?? descriptor.group ?? "General",
    group: descriptor.group ?? "General",
    description: descriptor.description ?? "Reusable page widget",
    useCase: descriptor.useCase ?? descriptor.description ?? "Reusable page widget",
    complexity: descriptor.complexity ?? "basic",
    keywords: descriptor.keywords ?? [],
    originLabel: "Built-in",
    sourceLabel: descriptor.wrapperKind ?? "primitive",
    disabled: false,
    disabledReason: ""
  }));

  return {
    suggested: builtInEntries.filter((entry) => suggestedKeys.has(entry.componentKey)).slice(0, 6),
    builtIn: builtInEntries,
    recent: builtInEntries.filter((entry) => recentWidgetKeys.includes(entry.libraryKey))
  };
}

export function PageStudioWidgetsMode({
  studioDocument,
  onPatchDocument,
  canvasState,
  onPatchCanvasState,
  selectedBlockId,
  onSelectBlockId,
  railOpen = false,
  previewResources = null
}) {
  const supportState = useMediaLibraryOptions();
  const customWidgetsState = useCustomWidgetsLibrary();
  const localWidgetPreviewState = useWidgetRuntimePreviewCollections(!previewResources);
  const widgetPreviewState = previewResources ?? localWidgetPreviewState;
  const previewBootstrap = useMemo(() => getPageStudioPreviewBootstrapResources(studioDocument), [studioDocument]);
  const effectiveCollections = widgetPreviewState.contentLoading && previewBootstrap.contentReady
    ? {
        ...widgetPreviewState.collections,
        ...previewBootstrap.collections
      }
    : widgetPreviewState.collections;
  const effectiveContentLoading = widgetPreviewState.contentLoading && !previewBootstrap.contentReady;
  const pageContextResolution = useMemo(
    () => resolvePageContextManifest(createStudioContextPayload(studioDocument)),
    [studioDocument]
  );
  const pageContextManifest = pageContextResolution.manifest ?? null;
  const pageContextIssues = Array.isArray(pageContextResolution.issues) ? pageContextResolution.issues : [];
  const availableComponents = useMemo(
    () => readAvailableComponents(pageContextManifest),
    [pageContextManifest]
  );
  const [recentWidgetKeys, setRecentWidgetKeys] = useState(() => readPersistedRecentWidgets());
  const runtimeLayoutContract = useMemo(
    () =>
      buildPageStudioRuntimeLayoutContract({
        editorGrid: studioDocument.layout.editorGrid,
        runtimeLayoutMetadata: studioDocument.layout.runtimeLayoutMetadata
      }),
    [studioDocument.layout.editorGrid, studioDocument.layout.runtimeLayoutMetadata]
  );
  const activeBreakpoint = studioDocument.layout.activeBreakpoint;
  const runtimeBreakpoint = runtimeLayoutContract.breakpoints[activeBreakpoint];
  const blockById = useMemo(
    () => new Map(studioDocument.widgets.blocks.map((block) => [block.id, block])),
    [studioDocument.widgets.blocks]
  );
  const renderedItems = runtimeBreakpoint.items.filter((item) => blockById.has(item.blockId));
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [pickerBlockId, setPickerBlockId] = useState(null);
  const [configBlockId, setConfigBlockId] = useState(null);
  const [saveCustomWidgetState, setSaveCustomWidgetState] = useState({
    saving: false,
    error: false,
    message: ""
  });
  const [customWidgetDraft, setCustomWidgetDraft] = useState(null);
  const [shellBounds, setShellBounds] = useState({ width: 0, height: 0 });
  const shellHostRef = useRef(null);

  const viewport = canvasState.viewport;
  const zoomLevel = canvasState.zoomLevel;
  const zoomMode = canvasState.zoomMode;
  const selectedBlock = blockById.get(selectedBlockId) ?? null;
  const configBlock = blockById.get(configBlockId) ?? null;
  const pickerBlock = blockById.get(pickerBlockId) ?? null;
  const builtInLibrary = useMemo(
    () => buildBuiltInWidgetLibraryEntries(availableComponents, recentWidgetKeys),
    [availableComponents, recentWidgetKeys]
  );
  const customLibraryEntries = useMemo(
    () => buildCustomWidgetLibraryEntries(customWidgetsState.items),
    [customWidgetsState.items]
  );
  const customWidgetEntries = useMemo(
    () => customLibraryEntries.filter((entry) => entry.templateMode === "composition"),
    [customLibraryEntries]
  );
  const customTemplateEntries = useMemo(
    () => customLibraryEntries.filter((entry) => entry.templateMode !== "composition"),
    [customLibraryEntries]
  );
  const pickerSections = useMemo(() => {
    const sections = [];
    if (builtInLibrary.suggested.length > 0) {
      sections.push({
        id: "suggested",
        label: "Suggested For This Page",
        entries: builtInLibrary.suggested
      });
    }
    if (builtInLibrary.recent.length > 0) {
      sections.push({
        id: "recent",
        label: "Recently Used",
        entries: builtInLibrary.recent
      });
    }
    if (customWidgetEntries.length > 0) {
      sections.push({
        id: "custom-widgets",
        label: "Custom Widgets",
        entries: customWidgetEntries
      });
    }
    if (customTemplateEntries.length > 0) {
      sections.push({
        id: "custom-templates",
        label: "Widget Templates",
        entries: customTemplateEntries
      });
    }
    sections.push({
      id: "builtin",
      label: "Built-in Widgets",
      entries: builtInLibrary.builtIn
    });
    return sections;
  }, [builtInLibrary, customTemplateEntries, customWidgetEntries]);
  const effectiveZoomLevel =
    zoomMode === "auto"
      ? computeAutoFitZoomLevel({ viewport, shellBounds })
      : zoomLevel;
  const zoomLabel =
    zoomMode === "auto"
      ? `Zoom ${effectiveZoomLevel}% · Fit`
      : `Zoom ${effectiveZoomLevel}%`;
  const frameMetrics = useMemo(
    () =>
      buildPageStudioCanvasFrameMetrics({
        viewport,
        runtimeBreakpoint,
        scaleRatio: 1
      }),
    [runtimeBreakpoint, viewport]
  );
  const previewParams = studioDocument.preview?.urlParams ?? {};
  const previewDescriptor = useMemo(
    () => buildPageStudioPreviewDescriptor(studioDocument, previewParams),
    [previewParams, studioDocument]
  );
  const fallbackPreviewModelState = useMemo(
    () =>
      buildPageStudioPreviewModel({
        studioDocument,
        collections: effectiveCollections,
        previewParams
      }),
    [effectiveCollections, previewParams, studioDocument.infra, studioDocument.preview]
  );
  const previewModelState =
    widgetPreviewState.page || widgetPreviewState.model || previewBootstrap.page || previewBootstrap.model
      ? {
          ok: Boolean(
            (widgetPreviewState.page ?? previewBootstrap.page) &&
            (widgetPreviewState.model ?? previewBootstrap.model)
          ),
          issue: widgetPreviewState.issue ?? previewBootstrap.issue ?? null,
          page: widgetPreviewState.page ?? previewBootstrap.page ?? previewDescriptor,
          model: widgetPreviewState.model ?? previewBootstrap.model ?? null,
          sourceRecordId: widgetPreviewState.sourceRecordId ?? previewBootstrap.sourceRecordId ?? null
        }
      : fallbackPreviewModelState;
  const fallbackThemeDocument = useMemo(
    () => resolvePageStudioPreviewTheme(studioDocument, effectiveCollections.themes),
    [effectiveCollections.themes, studioDocument]
  );
  const themeDocument = widgetPreviewState.themeDocument ?? previewBootstrap.themeDocument ?? fallbackThemeDocument;

  useEffect(() => {
    if (!selectedBlockId || !renderedItems.some((item) => item.blockId === selectedBlockId)) {
      onSelectBlockId(renderedItems[0]?.blockId ?? null);
    }
  }, [onSelectBlockId, renderedItems, selectedBlockId]);

  useEffect(() => {
    const shellHost = shellHostRef.current;
    if (!shellHost || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setShellBounds({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(shellHost);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    persistRecentWidgets(recentWidgetKeys);
  }, [recentWidgetKeys]);

  function patchBlock(blockId, updater) {
    onPatchDocument((previous) => ({
      ...previous,
      widgets: {
        ...previous.widgets,
        blocks: previous.widgets.blocks.map((block) => {
          if (block.id !== blockId) {
            return block;
          }
          const nextBlock = typeof updater === "function" ? updater(block) : { ...block, ...updater };
          return {
            ...nextBlock,
            widgetKey: nextBlock.componentInstance?.componentKey ?? nextBlock.widgetKey ?? null
          };
        })
      }
    }));
  }

  function rememberWidget(entry) {
    const nextKey = normalizeText(entry?.libraryKey);
    if (!nextKey) {
      return;
    }
    setRecentWidgetKeys((previous) => [nextKey, ...previous.filter((entryKey) => entryKey !== nextKey)].slice(0, 8));
  }

  function handleSaveAsCustomWidget(instance, descriptor) {
    if (!instance?.componentKey || !descriptor?.componentKey) {
      return;
    }
    const title = `${descriptor.displayName} Template`;
    setSaveCustomWidgetState({
      saving: false,
      error: false,
      message: ""
    });
    setCustomWidgetDraft({
      templateMode: "template",
      title,
      widgetKey: `${slugifyWidgetKey(descriptor.componentKey)}-${Date.now()}`,
      iconKey: descriptor.icon ?? "view_quilt",
      categoryKey: descriptor.libraryCategory ?? descriptor.group ?? "Custom",
      description: descriptor.useCase ?? descriptor.description ?? "Reusable widget template",
      summary: `Built from ${descriptor.displayName}`,
      status: "ready",
      sourceComponentKey: descriptor.componentKey,
      descriptor,
      templateInstance: cloneJsonValue(instance)
    });
  }

  function handleSaveCanvasAsCustomWidget() {
    const composition = buildCustomWidgetCompositionFromStudioDocument(studioDocument);
    const widgetCount = composition?.blocks?.filter((block) => block?.componentInstance).length ?? 0;
    setSaveCustomWidgetState({
      saving: false,
      error: false,
      message: ""
    });
    setCustomWidgetDraft({
      templateMode: "composition",
      title: `${normalizeText(studioDocument?.title, "Studio Page")} Widget`,
      widgetKey: `${slugifyWidgetKey(studioDocument?.title ?? "custom-widget")}-${Date.now()}`,
      iconKey: "dashboard_customize",
      categoryKey: "Custom",
      description: "Reusable composed widget built from the current Page Studio canvas.",
      summary: widgetCount > 0 ? `${widgetCount} nested widgets` : "Custom widget composition",
      status: "ready",
      sourceComponentKey: "custom-composition",
      descriptor: {
        displayName: "Custom Widget Composition",
        libraryCategory: "Custom",
        complexity: "advanced",
        useCase: "Built from the current Page Studio layout, widget, and preview configuration."
      },
      composition,
      templateInstance: null
    });
  }

  async function submitCustomWidgetSave() {
    if (
      !customWidgetDraft?.templateInstance?.componentKey &&
      !(Array.isArray(customWidgetDraft?.composition?.blocks) && customWidgetDraft.composition.blocks.length > 0)
    ) {
      return;
    }
    setSaveCustomWidgetState({
      saving: true,
      error: false,
      message: ""
    });
    try {
      const result = await createReferenceCollectionItem({
        collectionId: CUSTOM_WIDGETS_COLLECTION_ID,
        item: {
          title: normalizeText(customWidgetDraft.title, "Custom Widget"),
          widgetKey: slugifyWidgetKey(customWidgetDraft.widgetKey),
          iconKey: normalizeText(customWidgetDraft.iconKey, "view_quilt"),
          categoryKey: normalizeText(customWidgetDraft.categoryKey, "Custom"),
          description: normalizeText(customWidgetDraft.description, "Reusable custom widget"),
          summary: normalizeText(customWidgetDraft.summary, "Custom widget template"),
          status: customWidgetDraft.status === "archived" ? "archived" : "ready",
          sourceComponentKey: normalizeText(
            customWidgetDraft.sourceComponentKey,
            customWidgetDraft.templateInstance?.componentKey ?? "custom-composition"
          ),
          templateMode: customWidgetDraft.templateMode === "composition" ? "composition" : "template",
          templateInstance: customWidgetDraft.templateInstance,
          composition: customWidgetDraft.composition ?? null
        }
      });
      if (result?.ok !== true) {
        throw new Error(result?.error?.message ?? "Failed to save custom widget");
      }
      await customWidgetsState.reload?.();
      if (result?.item?.id) {
        rememberWidget({ libraryKey: `custom:${result.item.id}` });
      }
      setSaveCustomWidgetState({
        saving: false,
        error: false,
        message:
          customWidgetDraft.templateMode === "composition"
            ? `Saved '${result?.item?.title ?? customWidgetDraft.title}' to Custom Widgets.`
            : `Saved '${result?.item?.title ?? customWidgetDraft.title}' to Widget Templates.`
      });
      setCustomWidgetDraft(null);
    } catch (error) {
      setSaveCustomWidgetState({
        saving: false,
        error: true,
        message: error?.message ?? "Failed to save custom widget"
      });
    }
  }

  function applyScenarioWidgets() {
    onPatchDocument((previous) => ({
      ...previous,
      widgets: {
        ...previous.widgets,
        blocks: buildPageStudioScenarioWidgetSeed(previous.layout.scenarioKey, previous.widgets.blocks)
      }
    }));
  }

  const widgetBindingManifestNote =
    pageContextManifest?.pageKind && pageContextManifest?.primarySourceType
      ? `Bindings come only from declared page-owned context for ${pageContextManifest.primarySourceType}.`
      : "Choose a primary query in Infra first so widgets can bind to canonical page-owned context.";
  const canApplyRecommendedWidgets = pageStudioScenarioHasStarterWidgets(studioDocument.layout.scenarioKey);
  const blocksWithAssignedWidgets = studioDocument.widgets.blocks.filter((block) => block.componentInstance).length;

  return (
    <Box
      sx={{
        minHeight: 0,
        flex: 1,
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: railOpen ? `minmax(0,1fr) ${STUDIO_RAIL_WIDTH}px` : "minmax(0,1fr)"
        },
        gap: 1,
        alignItems: "stretch"
      }}
    >
      <Box
        ref={shellHostRef}
        sx={{
          minHeight: 0,
          minWidth: 0,
          height: "100%",
          display: "flex",
          overflow: "hidden"
        }}
      >
        <LayoutBuilderCanvasShell
          viewport={viewport}
          displayViewport={viewport}
          zoomLevel={effectiveZoomLevel}
          contentZoom
          zoomLabel={zoomLabel}
          fitZoomActive={zoomMode === "auto"}
          onFitZoom={() => onPatchCanvasState((previous) => ({ ...previous, zoomMode: "auto" }))}
          onWidthStep={(delta) =>
            onPatchCanvasState((previous) => ({
              ...previous,
              viewport: {
                ...previous.viewport,
                width: clampViewportWidth(previous.viewport.width + delta)
              }
            }))
          }
          onHeightStep={(delta) =>
            onPatchCanvasState((previous) => ({
              ...previous,
              viewport: {
                ...previous.viewport,
                height: clampViewportHeight(previous.viewport.height + delta)
              }
            }))
          }
          onSelectPreset={(preset) => {
            const nextBreakpoint = mapViewportPresetToBreakpoint(preset);
            if (nextBreakpoint) {
              onPatchDocument((previous) => ({
                ...previous,
                layout: {
                  ...previous.layout,
                  activeBreakpoint: nextBreakpoint
                }
              }));
            }
            onPatchCanvasState((previous) => ({
              ...previous,
              viewport: { width: preset.width, height: preset.height },
              zoomMode: "auto"
            }));
          }}
          onZoomStep={(delta) => {
            onPatchCanvasState((previous) => ({
              ...previous,
              zoomMode: "manual",
              zoomLevel: clampZoomLevel((previous.zoomMode === "auto" ? effectiveZoomLevel : previous.zoomLevel) + delta)
            }));
          }}
        >
          {previewModelState.ok && !effectiveContentLoading ? (
            <PageStudioRuntimeCanvas
              studioDocument={studioDocument}
              previewState={{
                page: previewModelState.page,
                model: previewModelState.model,
                themeDocument,
                collections: effectiveCollections
              }}
              activeBreakpoint={activeBreakpoint}
              runtimeBreakpoint={runtimeBreakpoint}
              frameMetrics={frameMetrics}
              viewport={viewport}
              onNavigate={null}
              scaleRatio={1}
              renderBlockChrome={({ block, item }) => {
                const widgetSummary = summarizeWidgetInstance(block?.componentInstance ?? null, DEFAULT_WIDGET_COMPONENT_REGISTRY);
                const hovered = hoveredBlockId === item.blockId;
                const selected = selectedBlockId === item.blockId;
                return (
                  <Box
                    onMouseEnter={() => {
                      setHoveredBlockId(item.blockId);
                      onSelectBlockId(item.blockId);
                    }}
                    onMouseLeave={() => setHoveredBlockId((current) => (current === item.blockId ? null : current))}
                    onClick={() => {
                      if (block?.componentInstance) {
                        onSelectBlockId(item.blockId);
                        setConfigBlockId(item.blockId);
                        return;
                      }
                      onSelectBlockId(item.blockId);
                      setPickerBlockId(item.blockId);
                    }}
                    sx={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 2,
                      cursor: "pointer",
                      outline: selected ? "2px solid rgba(37,99,235,0.9)" : hovered ? "1px solid rgba(37,99,235,0.4)" : "1px solid rgba(15,23,42,0.08)",
                      outlineOffset: "-1px",
                      transition: "outline-color 160ms ease",
                      backgroundColor: hovered || selected ? "rgba(255,255,255,0.02)" : "transparent"
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        opacity: hovered || selected ? 1 : 0,
                        transition: "opacity 160ms ease"
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.75}
                        useFlexGap
                        flexWrap="wrap"
                        sx={{ position: "absolute", top: 8, left: 8, right: 8 }}
                      >
                        <Chip size="small" color="primary" label={block?.id ?? item.blockId} />
                        <Chip size="small" variant="outlined" label={block?.summary || "Block"} />
                        <Chip size="small" variant="outlined" label={block?.componentInstance ? widgetSummary.displayName : "No widget"} />
                      </Stack>
                      <Stack direction="row" spacing={0.75} useFlexGap sx={{ position: "absolute", right: 8, bottom: 8 }}>
                        <Button
                          size="small"
                          variant={block?.componentInstance ? "outlined" : "contained"}
                          sx={{ pointerEvents: "auto" }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectBlockId(item.blockId);
                            setPickerBlockId(item.blockId);
                          }}
                        >
                          {block?.componentInstance ? "Replace" : "Choose"}
                        </Button>
                        {block?.componentInstance ? (
                          <Button
                            size="small"
                            variant="contained"
                            sx={{ pointerEvents: "auto" }}
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectBlockId(item.blockId);
                              setConfigBlockId(item.blockId);
                            }}
                          >
                            Configure
                          </Button>
                        ) : null}
                      </Stack>
                    </Box>
                  </Box>
                );
              }}
            />
          ) : (
            <Paper
              variant="outlined"
              square
              sx={{
                minHeight: `${Math.max(480, viewport.height)}px`,
                display: "grid",
                placeItems: "center",
                p: 3
              }}
            >
              <Stack spacing={1.25} alignItems="center" textAlign="center">
                <Typography variant="h6">Widgets not ready</Typography>
                <Typography variant="body2" color="text.secondary">
                  {widgetPreviewState.contentLoading
                    ? "Loading widget preview data…"
                    : previewModelState.issue ?? "Adjust the studio document until a previewable widget context exists."}
                </Typography>
              </Stack>
            </Paper>
          )}
        </LayoutBuilderCanvasShell>
      </Box>

      {railOpen ? (
      <Paper variant="outlined" square sx={{ p: 1, minHeight: 0, overflow: "auto" }}>
        <Stack spacing={1}>
          <RailSection
            title="Widget State"
            description="One block, one widget. Use starter packs for common page shapes, then refine block by block."
          >
            <Chip size="small" color="primary" label={`${blocksWithAssignedWidgets}/${renderedItems.length} widgets assigned`} />
            <TextField
              select
              label="Breakpoint"
              size="small"
              value={activeBreakpoint}
              onChange={(event) => {
                const nextBreakpoint = event.target.value;
                const nextPreset = buildViewportFromBreakpoint(nextBreakpoint);
                onPatchDocument((previous) => ({
                  ...previous,
                  layout: {
                    ...previous.layout,
                    activeBreakpoint: nextBreakpoint
                  }
                }));
                if (nextPreset) {
                  onPatchCanvasState((previous) => ({
                    ...previous,
                    viewport: { width: nextPreset.width, height: nextPreset.height },
                    zoomMode: "auto"
                  }));
                }
              }}
            >
              {Object.entries(PAGE_STUDIO_BREAKPOINT_LABELS).map(([breakpoint, label]) => (
                <MenuItem key={breakpoint} value={breakpoint}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            {canApplyRecommendedWidgets ? (
              <Button size="small" variant="contained" onClick={applyScenarioWidgets}>
                Apply Recommended Widgets
              </Button>
            ) : null}
            <Button size="small" variant="outlined" onClick={handleSaveCanvasAsCustomWidget}>
              Save Canvas As Custom Widget
            </Button>
            <Alert severity={pageContextIssues.length > 0 ? "warning" : "info"}>
              {pageContextIssues.length > 0
                ? pageContextIssues.map((issue) => issue.message).join(" ")
                : widgetBindingManifestNote}
            </Alert>
          </RailSection>

          <RailSection title="Blocks" description="Select a block from the page or from this list.">
            <Stack spacing={0.5}>
              {renderedItems.map((item) => {
                const block = blockById.get(item.blockId);
                if (!block) {
                  return null;
                }
                const summary = summarizeWidgetInstance(block.componentInstance ?? null, DEFAULT_WIDGET_COMPONENT_REGISTRY);
                return (
                  <Button
                    key={item.blockId}
                    size="small"
                    variant={selectedBlockId === item.blockId ? "contained" : "outlined"}
                    onClick={() => onSelectBlockId(item.blockId)}
                    sx={{ justifyContent: "space-between" }}
                  >
                    <span>{block.summary || block.id}</span>
                    <span>{block.componentInstance ? summary.displayName : "Empty"}</span>
                  </Button>
                );
              })}
            </Stack>
          </RailSection>

          <RailSection title="Selected Block" description={selectedBlock?.summary ?? "Pick a block to configure it."}>
            <TextField
              label="Selected Block"
              size="small"
              value={selectedBlock?.summary ?? ""}
              InputProps={{ readOnly: true }}
            />
            <Chip
              size="small"
              label={
                selectedBlock?.componentInstance
                  ? summarizeWidgetInstance(selectedBlock.componentInstance, DEFAULT_WIDGET_COMPONENT_REGISTRY).displayName
                  : "No widget selected"
              }
            />
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              <Button size="small" variant="contained" disabled={!selectedBlock} onClick={() => setPickerBlockId(selectedBlock?.id ?? null)}>
                {selectedBlock?.componentInstance ? "Replace Widget" : "Choose Widget"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!selectedBlock?.componentInstance}
                onClick={() => setConfigBlockId(selectedBlock?.id ?? null)}
              >
                Configure
              </Button>
            </Stack>
            {supportState.loading ? <Chip size="small" variant="outlined" label="Loading media library..." /> : null}
            {supportState.errorMessage ? <Chip size="small" color="warning" label="Media library unavailable" /> : null}
            {widgetPreviewState.loading ? <Chip size="small" variant="outlined" label="Loading widget preview..." /> : null}
            {widgetPreviewState.errorMessage ? <Chip size="small" color="warning" label="Widget preview unavailable" /> : null}
          </RailSection>
        </Stack>
      </Paper>
      ) : null}

      <Dialog
        open={Boolean(pickerBlock)}
        onClose={() => setPickerBlockId(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {pickerBlock ? `Choose widget for ${pickerBlock.id}` : "Choose widget"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {availableComponents.length > 0 ? (
              <LayoutBuilderComponentLibrary
                sections={pickerSections}
                selectedLibraryKey={
                  pickerBlock?.componentInstance?.componentKey === "custom-widget" &&
                  pickerBlock?.componentInstance?.props?.customWidgetId?.mode === "static"
                    ? `custom:${pickerBlock.componentInstance.props.customWidgetId.value}`
                    : pickerBlock?.componentInstance?.componentKey ?? ""
                }
                onSelectComponent={(entry) => {
                  if (!pickerBlock) {
                    return;
                  }
                  const nextInstance = createComponentInstanceFromWidgetLibraryEntry(entry);
                  if (!nextInstance) {
                    return;
                  }
                  rememberWidget(entry);
                  patchBlock(pickerBlock.id, (block) => ({
                    ...block,
                    widgetKey: nextInstance.componentKey,
                    componentInstance: nextInstance
                  }));
                  setPickerBlockId(null);
                  setConfigBlockId(pickerBlock.id);
                }}
              />
            ) : (
              <Alert severity="warning">
                No widgets are currently compatible with this page context. The current widget library is still post-detail first.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickerBlockId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(configBlock)}
        onClose={() => setConfigBlockId(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {configBlock ? `Configure ${configBlock.id}` : "Configure widget"}
        </DialogTitle>
        <DialogContent dividers>
          {configBlock ? (
            <Stack spacing={2}>
              <Paper variant="outlined" square sx={{ p: 1.25 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap flexWrap="wrap" alignItems={{ md: "center" }}>
                  <Chip size="small" color="primary" label={configBlock.id} />
                  <Chip size="small" variant="outlined" label={configBlock.summary || "Block"} />
                  <TextField
                    select
                    size="small"
                    label="Theme override mode"
                    value={configBlock.themeOverrideMode ?? "inherit"}
                    onChange={(event) =>
                      patchBlock(configBlock.id, {
                        themeOverrideMode: event.target.value
                      })
                    }
                    sx={{ minWidth: 220 }}
                  >
                    <MenuItem value="inherit">Inherit theme-driven props</MenuItem>
                    <MenuItem value="pinned">Pin explicit props</MenuItem>
                  </TextField>
                  <Typography variant="caption" color="text.secondary">
                    Selected theme: {studioDocument.infra.themeKey || "global-default"}. Use inherit when the active theme should influence typography and spacing.
                  </Typography>
                </Stack>
              </Paper>
              <LayoutBuilderWidgetInspector
                node={createPreviewNode(configBlock)}
                pageContextManifest={pageContextManifest}
                widgetBindingManifestNote={widgetBindingManifestNote}
                mediaItems={supportState.items}
                translationTarget={null}
                showAssignmentLibrary={false}
                onSaveAsCustomWidget={handleSaveAsCustomWidget}
                saveCustomWidgetState={saveCustomWidgetState}
                saveAsCustomWidgetLabel="Save As Widget Template"
                onChangeComponentInstance={(nextInstance) =>
                  patchBlock(configBlock.id, {
                    widgetKey: nextInstance?.componentKey ?? null,
                    componentInstance: nextInstance ?? null
                  })
                }
              />
            </Stack>
          ) : null}
        </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfigBlockId(null)}>Close</Button>
      </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(customWidgetDraft)}
        onClose={() => {
          if (!saveCustomWidgetState.saving) {
            setCustomWidgetDraft(null);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {customWidgetDraft?.templateMode === "composition"
            ? "Save Custom Widget"
            : "Save Widget Template"}
        </DialogTitle>
        <DialogContent dividers>
          {customWidgetDraft ? (
            <Stack spacing={1.5}>
              <Alert severity="info">
                {customWidgetDraft.templateMode === "composition"
                  ? (
                    <>
                      Save the current canvas as a reusable composed widget. It will appear in the chooser under{" "}
                      <strong>Custom Widgets</strong> and render through the shared MUI runtime.
                    </>
                  )
                  : (
                    <>
                      Save the current widget configuration as a reusable library entry. It will appear in the chooser under{" "}
                      <strong>Widget Templates</strong>.
                    </>
                  )}
              </Alert>
              <TextField
                size="small"
                label="Title"
                value={customWidgetDraft.title}
                onChange={(event) =>
                  setCustomWidgetDraft((previous) => ({
                    ...previous,
                    title: event.target.value
                  }))
                }
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                <TextField
                  size="small"
                  label="Widget Key"
                  value={customWidgetDraft.widgetKey}
                  onChange={(event) =>
                    setCustomWidgetDraft((previous) => ({
                      ...previous,
                      widgetKey: slugifyWidgetKey(event.target.value)
                    }))
                  }
                  helperText="Stable database key for this reusable widget."
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Icon"
                  value={customWidgetDraft.iconKey}
                  onChange={(event) =>
                    setCustomWidgetDraft((previous) => ({
                      ...previous,
                      iconKey: event.target.value
                    }))
                  }
                  sx={{ minWidth: { md: 180 } }}
                />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                <TextField
                  size="small"
                  label="Category"
                  value={customWidgetDraft.categoryKey}
                  onChange={(event) =>
                    setCustomWidgetDraft((previous) => ({
                      ...previous,
                      categoryKey: event.target.value
                    }))
                  }
                  fullWidth
                />
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={customWidgetDraft.status}
                  onChange={(event) =>
                    setCustomWidgetDraft((previous) => ({
                      ...previous,
                      status: event.target.value
                    }))
                  }
                  sx={{ minWidth: { md: 180 } }}
                >
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </TextField>
              </Stack>
              <TextField
                size="small"
                label="Description"
                value={customWidgetDraft.description}
                onChange={(event) =>
                  setCustomWidgetDraft((previous) => ({
                    ...previous,
                    description: event.target.value
                  }))
                }
                multiline
                minRows={2}
              />
              <TextField
                size="small"
                label="Summary"
                value={customWidgetDraft.summary}
                onChange={(event) =>
                  setCustomWidgetDraft((previous) => ({
                    ...previous,
                    summary: event.target.value
                  }))
                }
                helperText="Short explanation shown in the widget library."
              />
              <Paper variant="outlined" square sx={{ p: 1.25 }}>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2">Template source</Typography>
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    <Chip size="small" color="primary" label={customWidgetDraft.descriptor.displayName} />
                    <Chip size="small" variant="outlined" label={customWidgetDraft.descriptor.libraryCategory ?? "Custom"} />
                    <Chip size="small" variant="outlined" label={customWidgetDraft.descriptor.complexity ?? "guided"} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={customWidgetDraft.templateMode === "composition" ? "Composition" : "Template"}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {customWidgetDraft.descriptor.useCase ??
                      customWidgetDraft.descriptor.description ??
                      "Reusable widget template"}
                  </Typography>
                </Stack>
              </Paper>
              {saveCustomWidgetState.message && saveCustomWidgetState.error ? (
                <Alert severity="warning">{saveCustomWidgetState.message}</Alert>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCustomWidgetDraft(null)}
            disabled={saveCustomWidgetState.saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitCustomWidgetSave}
            disabled={saveCustomWidgetState.saving || !customWidgetDraft?.title || !customWidgetDraft?.widgetKey}
          >
            {saveCustomWidgetState.saving
              ? "Saving..."
              : customWidgetDraft?.templateMode === "composition"
                ? "Save Custom Widget"
                : "Save Widget Template"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}




