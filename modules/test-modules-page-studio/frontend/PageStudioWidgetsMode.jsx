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
import { fetchReferenceCollectionItems } from "../../../frontend/src/api/reference.js";
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
  buildDefaultWidgetActions,
  DEFAULT_WIDGET_COMPONENT_REGISTRY
} from "../../test-modules-layouts/shared/widget-component-schema.mjs";
import { buildWidgetContextScope } from "../../test-modules-pages/shared/page-widget-context.mjs";
import { resolvePageContextManifest } from "../../test-modules-pages/server/page-context-manifest-runtime.mjs";
import { summarizeWidgetInstance } from "../../test-modules-pages/shared/page-widget-compatibility.mjs";
import { PAGE_STUDIO_BREAKPOINT_LABELS } from "../shared/page-studio-breakpoints.mjs";
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

const MEDIA_ITEMS_COLLECTION_ID = "media-items";
const POSTS_COLLECTION_ID = "blog-posts";
const AUTHORS_COLLECTION_ID = "blog-authors";
const CATEGORIES_COLLECTION_ID = "blog-categories";
const TAGS_COLLECTION_ID = "blog-tags";

const CANVAS_FIT_WIDTH_OFFSET = 96;
const CANVAS_FIT_HEIGHT_OFFSET = 120;
const STUDIO_RAIL_WIDTH = 336;

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

function createInstanceFromDescriptor(descriptor) {
  return {
    componentKey: descriptor.componentKey,
    variantKey: "default",
    content: JSON.parse(JSON.stringify(descriptor.defaultBindings ?? {})),
    props: JSON.parse(JSON.stringify(descriptor.defaultProps ?? {})),
    actions: buildDefaultWidgetActions(descriptor)
  };
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
      themes: []
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
        const [posts, authors, categories, tags, mediaItems, themes] = await Promise.all([
          fetchReferenceCollectionItems({ collectionId: POSTS_COLLECTION_ID, limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: AUTHORS_COLLECTION_ID, limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: CATEGORIES_COLLECTION_ID, limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: TAGS_COLLECTION_ID, limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: MEDIA_ITEMS_COLLECTION_ID, limit: 500 }),
          fetchReferenceCollectionItems({ collectionId: "page-themes", limit: 500 })
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
            themes: Array.isArray(themes?.items) ? themes.items : []
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
            themes: []
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
  const [shellBounds, setShellBounds] = useState({ width: 0, height: 0 });
  const shellHostRef = useRef(null);

  const viewport = canvasState.viewport;
  const zoomLevel = canvasState.zoomLevel;
  const zoomMode = canvasState.zoomMode;
  const selectedBlock = blockById.get(selectedBlockId) ?? null;
  const configBlock = blockById.get(configBlockId) ?? null;
  const pickerBlock = blockById.get(pickerBlockId) ?? null;
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
        maxWidth="md"
      >
        <DialogTitle>
          {pickerBlock ? `Choose widget for ${pickerBlock.id}` : "Choose widget"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {availableComponents.length > 0 ? (
              <LayoutBuilderComponentLibrary
                components={availableComponents}
                selectedComponentKey={pickerBlock?.componentInstance?.componentKey ?? ""}
                onSelectComponent={(componentKey) => {
                  const descriptor = DEFAULT_WIDGET_COMPONENT_REGISTRY.get(componentKey);
                  if (!descriptor || !pickerBlock) {
                    return;
                  }
                  patchBlock(pickerBlock.id, (block) => ({
                    ...block,
                    widgetKey: descriptor.componentKey,
                    componentInstance: createInstanceFromDescriptor(descriptor)
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
    </Box>
  );
}




