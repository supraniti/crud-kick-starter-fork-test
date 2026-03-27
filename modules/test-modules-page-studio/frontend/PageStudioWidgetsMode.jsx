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
import { BlockVisual } from "../../test-modules-layouts/frontend/LayoutBuilderCanvasPrimitives.jsx";
import { LayoutBuilderComponentLibrary } from "../../test-modules-layouts/frontend/LayoutBuilderComponentLibrary.jsx";
import { LayoutBuilderWidgetInspector } from "../../test-modules-layouts/frontend/LayoutBuilderWidgetInspector.jsx";
import {
  clampViewportHeight,
  clampViewportWidth,
  clampZoomLevel,
  DEFAULT_VIEWPORT,
  DEFAULT_ZOOM_LEVEL,
  VIEWPORT_PRESETS
} from "../../test-modules-layouts/frontend/layout-builder-viewport.js";
import { DEFAULT_WIDGET_COMPONENT_REGISTRY } from "../../test-modules-layouts/shared/widget-component-schema.mjs";
import { resolvePageContextManifest } from "../../test-modules-pages/server/page-context-manifest-runtime.mjs";
import { summarizeWidgetInstance } from "../../test-modules-pages/shared/page-widget-compatibility.mjs";
import { PAGE_STUDIO_BREAKPOINT_LABELS } from "../shared/page-studio-breakpoints.mjs";
import { buildPageStudioRuntimeLayoutContract } from "../shared/page-studio-layout-transform.mjs";
import {
  buildPageStudioScenarioWidgetSeed,
  pageStudioScenarioHasStarterWidgets
} from "../shared/page-studio-widget-seeds.mjs";

const MEDIA_ITEMS_COLLECTION_ID = "media-items";

const BREAKPOINT_VIEWPORT_PRESET_ID = Object.freeze({
  desktop: "desktop",
  tablet: "tablet",
  mobile: "mobile"
});

const CANVAS_FIT_WIDTH_OFFSET = 96;
const CANVAS_FIT_HEIGHT_OFFSET = 120;

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
  const presetId = BREAKPOINT_VIEWPORT_PRESET_ID[breakpoint] ?? "desktop";
  return VIEWPORT_PRESETS.find((entry) => entry.id === presetId) ?? DEFAULT_VIEWPORT;
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

function inferStudioContextContract(studioDocument) {
  const routePath = normalizeText(studioDocument?.infra?.routePath, "").toLowerCase();
  const sourceTypes = Array.isArray(studioDocument?.infra?.queries)
    ? studioDocument.infra.queries.map((entry) => normalizeText(entry?.sourceType, "").toLowerCase())
    : [];

  if (
    routePath.includes("/post") ||
    routePath.includes("/journal") ||
    sourceTypes.includes("blog-post")
  ) {
    return {
      pageKind: "post-detail",
      primarySourceType: "blog-post"
    };
  }

  if (
    routePath.includes("/category") ||
    sourceTypes.includes("blog-category")
  ) {
    return {
      pageKind: "category-detail",
      primarySourceType: "blog-category"
    };
  }

  return {
    pageKind: null,
    primarySourceType: null
  };
}

function createStudioContextPayload(studioDocument) {
  const inferred = inferStudioContextContract(studioDocument);
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
    actions: []
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

function WidgetBlockFrame({
  block,
  layoutItem,
  selected,
  hovered,
  onHover,
  onLeave,
  onChooseWidget,
  onConfigureWidget
}) {
  const widgetSummary = summarizeWidgetInstance(block.componentInstance ?? null, DEFAULT_WIDGET_COMPONENT_REGISTRY);

  return (
    <Box
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={() => {
        if (block.componentInstance) {
          onConfigureWidget();
          return;
        }
        onChooseWidget();
      }}
      sx={{
        gridColumn: `${layoutItem.colStart} / span ${layoutItem.colSpan}`,
        gridRow: `${layoutItem.rowStart} / span ${layoutItem.rowSpan}`,
        minWidth: 0,
        minHeight: 0,
        position: "relative",
        cursor: "pointer"
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
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
          <Chip size="small" color="primary" label={block.id} />
          <Chip size="small" variant="outlined" label={block.summary || "Block"} />
          <Chip size="small" variant="outlined" label={block.componentInstance ? widgetSummary.displayName : "No widget"} />
        </Stack>
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          sx={{ position: "absolute", right: 8, bottom: 8 }}
        >
          <Button
            size="small"
            variant={block.componentInstance ? "outlined" : "contained"}
            sx={{ pointerEvents: "auto" }}
            onClick={(event) => {
              event.stopPropagation();
              onChooseWidget();
            }}
          >
            {block.componentInstance ? "Replace" : "Choose"}
          </Button>
          {block.componentInstance ? (
            <Button
              size="small"
              variant="contained"
              sx={{ pointerEvents: "auto" }}
              onClick={(event) => {
                event.stopPropagation();
                onConfigureWidget();
              }}
            >
              Configure
            </Button>
          ) : null}
        </Stack>
      </Box>
      <BlockVisual node={createPreviewNode(block)} parentMode="grid" isSelected={selected || hovered} />
    </Box>
  );
}

export function PageStudioWidgetsMode({ studioDocument, onPatchDocument }) {
  const supportState = useMediaLibraryOptions();
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
  const [selectedBlockId, setSelectedBlockId] = useState(renderedItems[0]?.blockId ?? null);
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [pickerBlockId, setPickerBlockId] = useState(null);
  const [configBlockId, setConfigBlockId] = useState(null);
  const [viewport, setViewport] = useState(() => buildViewportFromBreakpoint(activeBreakpoint));
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);
  const [zoomMode, setZoomMode] = useState("auto");
  const [shellBounds, setShellBounds] = useState({ width: 0, height: 0 });
  const shellHostRef = useRef(null);

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

  useEffect(() => {
    setViewport(buildViewportFromBreakpoint(activeBreakpoint));
    setZoomMode("auto");
  }, [activeBreakpoint]);

  useEffect(() => {
    if (!selectedBlockId || !renderedItems.some((item) => item.blockId === selectedBlockId)) {
      setSelectedBlockId(renderedItems[0]?.blockId ?? null);
    }
  }, [renderedItems, selectedBlockId]);

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

  const widgetBindingManifestNote = pageContextManifest?.pageKind === "post-detail"
    ? `Bindings come only from declared page-owned context for ${pageContextManifest.primarySourceType}.`
    : "Dynamic bindings are only fully authored for post-detail routes in this slice.";
  const canApplyRecommendedWidgets = pageStudioScenarioHasStarterWidgets(studioDocument.layout.scenarioKey);
  const blocksWithAssignedWidgets = studioDocument.widgets.blocks.filter((block) => block.componentInstance).length;

  return (
    <Box
      sx={{
        minHeight: 0,
        flex: 1,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 340px" },
        gap: 1,
        alignItems: "stretch"
      }}
    >
      <Box ref={shellHostRef} sx={{ minHeight: 0, minWidth: 0 }}>
        <LayoutBuilderCanvasShell
          viewport={viewport}
          zoomLevel={effectiveZoomLevel}
          zoomLabel={zoomLabel}
          fitZoomActive={zoomMode === "auto"}
          onFitZoom={() => setZoomMode("auto")}
          onWidthStep={(delta) =>
            setViewport((current) => ({
              ...current,
              width: clampViewportWidth(current.width + delta)
            }))
          }
          onHeightStep={(delta) =>
            setViewport((current) => ({
              ...current,
              height: clampViewportHeight(current.height + delta)
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
            setViewport({ width: preset.width, height: preset.height });
            setZoomMode("auto");
          }}
          onZoomStep={(delta) => {
            setZoomMode("manual");
            setZoomLevel((current) =>
              clampZoomLevel((zoomMode === "auto" ? effectiveZoomLevel : current) + delta)
            );
          }}
        >
          <Box sx={{ height: "100%", minHeight: "100%", bgcolor: "#f8fafc", p: 1.25 }}>
            <Box
              sx={{
                minHeight: `${Math.max(480, viewport.height - 24)}px`,
                backgroundColor: "rgba(255,255,255,0.96)",
                display: "grid",
                gridTemplateColumns: `repeat(${runtimeBreakpoint.columns}, minmax(0, 1fr))`,
                gridAutoRows: `${runtimeBreakpoint.rowHeight}px`,
                gap: `${runtimeBreakpoint.gap * 8}px`,
                p: `${runtimeBreakpoint.padding * 8}px`,
                alignContent: "start"
              }}
            >
              {renderedItems.map((item) => {
                const block = blockById.get(item.blockId);
                if (!block) {
                  return null;
                }
                return (
                  <WidgetBlockFrame
                    key={`${activeBreakpoint}-${item.blockId}`}
                    block={block}
                    layoutItem={item}
                    selected={selectedBlockId === item.blockId}
                    hovered={hoveredBlockId === item.blockId}
                    onHover={() => {
                      setHoveredBlockId(item.blockId);
                      setSelectedBlockId(item.blockId);
                    }}
                    onLeave={() => setHoveredBlockId((current) => (current === item.blockId ? null : current))}
                    onChooseWidget={() => {
                      setSelectedBlockId(item.blockId);
                      setPickerBlockId(item.blockId);
                    }}
                    onConfigureWidget={() => {
                      setSelectedBlockId(item.blockId);
                      setConfigBlockId(item.blockId);
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        </LayoutBuilderCanvasShell>
      </Box>

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
              onChange={(event) =>
                onPatchDocument((previous) => ({
                  ...previous,
                  layout: {
                    ...previous.layout,
                    activeBreakpoint: event.target.value
                  }
                }))
              }
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
                    onClick={() => setSelectedBlockId(item.blockId)}
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
          </RailSection>
        </Stack>
      </Paper>

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
