import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  SpeedDial,
  SpeedDialAction,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import {
  clampViewportHeight,
  clampViewportWidth,
  clampZoomLevel,
  DEFAULT_VIEWPORT,
  DEFAULT_ZOOM_LEVEL,
  VIEWPORT_PRESETS
} from "../../test-modules-layouts/frontend/layout-builder-viewport.js";
import { PAGE_STUDIO_CLIENTS, resolvePageStudioClient } from "../shared/page-studio-clients.mjs";
import {
  PAGE_STUDIO_BREAKPOINT_LABELS,
  PAGE_STUDIO_BREAKPOINTS,
  normalizePageStudioBreakpoint
} from "../shared/page-studio-breakpoints.mjs";
import { buildPageStudioRuntimeLayoutContract } from "../shared/page-studio-layout-transform.mjs";
import {
  PAGE_STUDIO_MODE_LABELS,
  PAGE_STUDIO_MODES,
  normalizePageStudioMode
} from "../shared/page-studio-modes.mjs";
import {
  createEmptyPageStudioDocument,
  normalizePageStudioDocument
} from "../shared/page-studio-document.mjs";
import {
  buildPageStudioScenarioSeed,
  inferPageStudioLayoutScenarioKey
} from "../shared/page-studio-layout-scenarios.mjs";
import {
  buildPageStudioScenarioWidgetSeed,
  pageStudioScenarioHasStarterWidgets
} from "../shared/page-studio-widget-seeds.mjs";
import { PageStudioLayoutMode } from "./PageStudioLayoutMode.jsx";
import { PageStudioPreviewMode } from "./PageStudioPreviewMode.jsx";
import { PageStudioWidgetsMode } from "./PageStudioWidgetsMode.jsx";
import { usePageStudioPreviewResources } from "./page-studio-preview-resources.js";

const PAGE_STUDIO_STORAGE_KEY = "page-studio.document.v1";

function toPersistedStudioDocument(document) {
  const normalized = normalizePageStudioDocument(document);
  const { mode: _ignoredMode, ...persistedDocument } = normalized;
  return persistedDocument;
}

function buildViewportFromBreakpoint(breakpoint) {
  if (breakpoint === "mobile") {
    return VIEWPORT_PRESETS.find((entry) => entry.id === "mobile") ?? DEFAULT_VIEWPORT;
  }
  if (breakpoint === "tablet") {
    return VIEWPORT_PRESETS.find((entry) => entry.id === "tablet") ?? DEFAULT_VIEWPORT;
  }
  return VIEWPORT_PRESETS.find((entry) => entry.id === "desktop") ?? DEFAULT_VIEWPORT;
}

function createInitialCanvasState(breakpoint) {
  return {
    viewport: buildViewportFromBreakpoint(breakpoint),
    zoomLevel: DEFAULT_ZOOM_LEVEL,
    zoomMode: "auto"
  };
}

const MODE_DESCRIPTORS = Object.freeze({
  infra: {
    title: "Infra",
    summary: "Own the route, params, queries, SEO, client, and theme in one place."
  },
  layout: {
    title: "Layout",
    summary: "Build the responsive page structure with real scenario-based block layouts and per-breakpoint edits."
  },
  widgets: {
    title: "Widgets",
    summary: "One block, one widget, configured in-place with dynamic data and actions."
  },
  preview: {
    title: "Preview",
    summary: "Preview must become the same MUI runtime and behavior as live deployment."
  }
});

function createSeedBlocks() {
  return [
    { id: "B-0001", tone: "#0f766e", summary: "Hero block", widgetKey: null },
    { id: "B-0002", tone: "#7c3aed", summary: "Body block", widgetKey: null },
    { id: "B-0003", tone: "#ea580c", summary: "Support block", widgetKey: null }
  ];
}

function buildDefaultScenarioStudioDocument(document) {
  const seed = buildPageStudioScenarioSeed("story-stack");
  if (!seed) {
    return document;
  }
  return {
    ...document,
    widgets: {
      ...document.widgets,
      blocks: buildPageStudioScenarioWidgetSeed(seed.scenarioKey, seed.blocks)
    },
    layout: {
      ...document.layout,
      scenarioKey: seed.scenarioKey,
      activeBreakpoint: "desktop",
      editorGrid: {
        ...document.layout.editorGrid,
        desktop: {
          ...document.layout.editorGrid.desktop,
          items: seed.editorGrid.desktop
        },
        tablet: {
          ...document.layout.editorGrid.tablet,
          items: seed.editorGrid.tablet
        },
        mobile: {
          ...document.layout.editorGrid.mobile,
          items: seed.editorGrid.mobile
        }
      }
    }
  };
}

function isLegacySeedStudioShape(document) {
  const summaries = document.widgets.blocks.map((block) => block.summary);
  const legacySummaries = ["Hero block", "Body block", "Support block"];
  return (
    document.widgets.blocks.length > 0 &&
    summaries.every(
      (summary) =>
        legacySummaries.includes(summary) ||
        (typeof summary === "string" && summary.startsWith("Block B-"))
    )
  );
}

function hasDefaultStoryStackWidgetAssignments(blocks = []) {
  const expected = ["post-title", "media-image", "post-rich-text", "author-card", "related-posts"];
  if (!Array.isArray(blocks) || blocks.length !== expected.length) {
    return false;
  }
  return blocks.every((block, index) => block?.widgetKey === expected[index]);
}

function allScenarioBlocksAreWidgetless(blocks = []) {
  return Array.isArray(blocks) && blocks.length > 0 && blocks.every((block) => !block?.componentInstance && !block?.widgetKey);
}

function looksLikeOutdatedDefaultStoryStack(document) {
  if (document.layout.scenarioKey !== "story-stack") {
    return false;
  }
  if (!hasDefaultStoryStackWidgetAssignments(document.widgets.blocks)) {
    return false;
  }
  const desktopItems = document.layout.editorGrid.desktop.items ?? [];
  const mobileItems = document.layout.editorGrid.mobile.items ?? [];
  const heroDesktop = desktopItems.find((item) => item.blockId === "B-0001");
  const mediaDesktop = desktopItems.find((item) => item.blockId === "B-0002");
  const bodyMobile = mobileItems.find((item) => item.blockId === "B-0003");
  return (
    (heroDesktop?.h ?? 0) <= 3 &&
    (mediaDesktop?.h ?? 0) <= 2 &&
    (bodyMobile?.h ?? 0) <= 6
  );
}

function readPersistedStudioDocument() {
  if (typeof window === "undefined" || !window.localStorage) {
    return createEmptyPageStudioDocument();
  }

  const stored = window.localStorage.getItem(PAGE_STUDIO_STORAGE_KEY);
  if (!stored) {
    return createEmptyPageStudioDocument();
  }

  try {
    return normalizePageStudioDocument(JSON.parse(stored));
  } catch {
    return createEmptyPageStudioDocument();
  }
}

function ensureSeedStudioShape(document) {
  const normalized = normalizePageStudioDocument(document);
  const defaultDocument = createEmptyPageStudioDocument();
  const inferredScenarioKey = inferPageStudioLayoutScenarioKey(normalized.widgets.blocks);
  if (inferredScenarioKey && normalized.layout.scenarioKey !== inferredScenarioKey) {
    normalized.layout.scenarioKey = inferredScenarioKey;
  }
  const looksLikeLegacyInfra =
    normalized.infra.routePath.startsWith("/untitled") ||
    (normalized.infra.queries.length === 0 &&
      normalized.infra.seoTags.length === 0 &&
      normalized.infra.queryParams.length === 1 &&
      normalized.infra.queryParams[0]?.id === "param1");
  if (looksLikeLegacyInfra) {
    normalized.infra = defaultDocument.infra;
  }
  if (
    (!normalized.preview?.urlParams || Object.keys(normalized.preview.urlParams).length === 0) &&
    defaultDocument.preview?.urlParams
  ) {
    normalized.preview = {
      ...normalized.preview,
      urlParams: defaultDocument.preview.urlParams
    };
  }
  if (normalized.widgets.blocks.length === 0 || isLegacySeedStudioShape(normalized)) {
    return buildDefaultScenarioStudioDocument(normalized);
  }
  if (normalized.layout.editorGrid.desktop.items.length === 0) {
    return buildDefaultScenarioStudioDocument(normalized);
  }
  if (looksLikeOutdatedDefaultStoryStack(normalized)) {
    return buildDefaultScenarioStudioDocument(normalized);
  }
  if (
    pageStudioScenarioHasStarterWidgets(normalized.layout.scenarioKey) &&
    allScenarioBlocksAreWidgetless(normalized.widgets.blocks)
  ) {
    return {
      ...normalized,
      widgets: {
        ...normalized.widgets,
        blocks: buildPageStudioScenarioWidgetSeed(normalized.layout.scenarioKey, normalized.widgets.blocks)
      }
    };
  }
  return normalized;
}

function ModeCard({ title, body, chips = [] }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {body}
        </Typography>
        {chips.length > 0 ? (
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {chips.map((chip) => (
              <Chip key={chip} label={chip} variant="outlined" />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function InfraEditor({ studioDocument, onPatchDocument }) {
  const queryParams = studioDocument.infra.queryParams;
  const seoTags = studioDocument.infra.seoTags;
  const queries = studioDocument.infra.queries;

  const updateInfra = useCallback(
    (patch) => {
      onPatchDocument((previous) => ({
        ...previous,
        infra: {
          ...previous.infra,
          ...patch
        }
      }));
    },
    [onPatchDocument]
  );

  const updateQueryParam = useCallback(
    (index, field, value) => {
      updateInfra({
        queryParams: queryParams.map((entry, entryIndex) =>
          entryIndex === index
            ? {
                ...entry,
                [field]: value
              }
            : entry
        )
      });
    },
    [queryParams, updateInfra]
  );

  const updateSeoTag = useCallback(
    (index, field, value) => {
      updateInfra({
        seoTags: seoTags.map((entry, entryIndex) =>
          entryIndex === index
            ? {
                ...entry,
                [field]: value
              }
            : entry
        )
      });
    },
    [seoTags, updateInfra]
  );

  return (
    <>
      <ModeCard
        title="Route / Params"
        body="Define the public route pattern first. Query params declared here are the only params later queries and preview can rely on."
        chips={["slug", "query params", "route contract"]}
      />
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={1.25}>
          <TextField
            label="Studio Title"
            size="small"
            value={studioDocument.title}
            onChange={(event) => onPatchDocument((previous) => ({ ...previous, title: event.target.value }))}
          />
          <TextField
            label="Route Path"
            size="small"
            value={studioDocument.infra.routePath}
            onChange={(event) => updateInfra({ routePath: event.target.value })}
            helperText="Use route patterns such as /journal/:slug or /category/:slug."
          />
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {queryParams.map((entry, index) => (
              <Paper key={`param-${index}`} variant="outlined" sx={{ p: 1, minWidth: 260 }}>
                <Stack spacing={1}>
                  <TextField
                    label="Param Id"
                    size="small"
                    value={entry.id}
                    onChange={(event) => updateQueryParam(index, "id", event.target.value)}
                  />
                  <TextField
                    label="Label"
                    size="small"
                    value={entry.label}
                    onChange={(event) => updateQueryParam(index, "label", event.target.value)}
                  />
                  <TextField
                    label="Sample Value"
                    size="small"
                    value={entry.sampleValue}
                    onChange={(event) => updateQueryParam(index, "sampleValue", event.target.value)}
                  />
                </Stack>
              </Paper>
            ))}
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                updateInfra({
                  queryParams: [
                    ...queryParams,
                    {
                      id: `param${queryParams.length + 1}`,
                      label: `Param ${queryParams.length + 1}`,
                      required: false,
                      sampleValue: ""
                    }
                  ]
                })
              }
            >
              Add URL Param
            </Button>
          </Stack>
        </Stack>
      </Paper>
      <ModeCard
        title="Data"
        body="The dedicated query popup still comes in a later pass. For now the studio document already carries the declared query list and the page context dependency line."
        chips={["page-owned queries", "context manifest", "deferred data"]}
      />
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={1}>
          {queries.length > 0 ? (
            queries.map((entry, index) => (
              <Chip
                key={`query-${index}`}
                label={`${entry.label || entry.id || "Query"}${entry.summary ? ` - ${entry.summary}` : ""}`}
                variant="outlined"
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No page-owned queries configured yet. The next pass will replace this with the query chooser popup required by the intent.
            </Typography>
          )}
        </Stack>
      </Paper>
      <ModeCard
        title="SEO"
        body="SEO tags can later bind to query result fields. This slice starts the authored tag list so the Infra contract is real and persistent."
        chips={["predefined tags", "custom tags", "dynamic bindings"]}
      />
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={1}>
          {seoTags.map((entry, index) => (
            <Stack key={`seo-${index}`} direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                label="Tag Key"
                size="small"
                value={entry.key}
                onChange={(event) => updateSeoTag(index, "key", event.target.value)}
              />
              <TextField
                label="Label"
                size="small"
                value={entry.label}
                onChange={(event) => updateSeoTag(index, "label", event.target.value)}
              />
              <TextField
                label="Value"
                size="small"
                fullWidth
                value={entry.value}
                onChange={(event) => updateSeoTag(index, "value", event.target.value)}
              />
            </Stack>
          ))}
          <Button
            size="small"
            variant="outlined"
            onClick={() =>
              updateInfra({
                seoTags: [
                  ...seoTags,
                  {
                    key: `tag-${seoTags.length + 1}`,
                    label: `SEO Tag ${seoTags.length + 1}`,
                    value: ""
                  }
                ]
              })
            }
          >
            Add SEO Tag
          </Button>
        </Stack>
      </Paper>
      <ModeCard
        title="Client / Theme"
        body={`Selected client foundation: ${resolvePageStudioClient(studioDocument.infra.clientKey).label}`}
        chips={PAGE_STUDIO_CLIENTS.map((entry) => entry.label)}
      />
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={1.25}>
          <TextField
            select
            label="Client"
            size="small"
            value={studioDocument.infra.clientKey}
            onChange={(event) => updateInfra({ clientKey: event.target.value })}
          >
            {PAGE_STUDIO_CLIENTS.map((entry) => (
              <MenuItem key={entry.key} value={entry.key}>
                {entry.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Theme Key"
            size="small"
            value={studioDocument.infra.themeKey}
            onChange={(event) => updateInfra({ themeKey: event.target.value })}
            helperText="This remains a key for now. A real theme picker lands in a later pass."
          />
        </Stack>
      </Paper>
    </>
  );
}

function LayoutModeSummary({ studioDocument, onPatchDocument }) {
  const runtimeLayoutContract = useMemo(
    () =>
      buildPageStudioRuntimeLayoutContract({
        editorGrid: studioDocument.layout.editorGrid,
        runtimeLayoutMetadata: studioDocument.layout.runtimeLayoutMetadata
      }),
    [studioDocument.layout.editorGrid, studioDocument.layout.runtimeLayoutMetadata]
  );

  return (
    <>
      <ModeCard
        title="Gridstack Transformation Planning"
        body="This mode is still non-destructive, but it now reads the same breakpoint metadata and transform contract that future geometry editing will use."
        chips={["serialized blocks", "breakpoint overrides", "editor-only classes"]}
      />
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={1.25}>
          <TextField
            select
            label="Active Breakpoint"
            size="small"
            value={studioDocument.layout.activeBreakpoint}
            onChange={(event) =>
              onPatchDocument((previous) => ({
                ...previous,
                layout: {
                  ...previous.layout,
                  activeBreakpoint: normalizePageStudioBreakpoint(event.target.value, "desktop")
                }
              }))
            }
          >
            {PAGE_STUDIO_BREAKPOINTS.map((breakpoint) => (
              <MenuItem key={breakpoint} value={breakpoint}>
                {PAGE_STUDIO_BREAKPOINT_LABELS[breakpoint]}
              </MenuItem>
            ))}
          </TextField>
          {PAGE_STUDIO_BREAKPOINTS.map((breakpoint) => {
            const editorGrid = studioDocument.layout.editorGrid[breakpoint];
            const runtimeGrid = runtimeLayoutContract.breakpoints[breakpoint];
            return (
              <Paper key={breakpoint} variant="outlined" sx={{ p: 1 }}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2">{PAGE_STUDIO_BREAKPOINT_LABELS[breakpoint]}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Editor grid: {editorGrid.columns} columns, row height {editorGrid.rowHeight}, explicit blocks {editorGrid.items.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Runtime grid: col contract {runtimeGrid.columns}, gap {runtimeGrid.gap}, padding {runtimeGrid.padding}, materialized blocks {runtimeGrid.items.length}
                  </Typography>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Paper>
    </>
  );
}

function BuilderCanvas({
  studioDocument,
  mode,
  canvasState,
  onPatchCanvasState,
  selectedBlockId,
  onSelectBlockId,
  railOpen,
  onPatchDocument,
  previewResources
}) {
  const modeDescriptor = MODE_DESCRIPTORS[mode];
  const usesDedicatedStageSurface = mode === "layout" || mode === "widgets" || mode === "preview";

  function renderSurface(activeMode) {
    if (activeMode === "layout") {
      return (
        <PageStudioLayoutMode
          studioDocument={studioDocument}
          onPatchDocument={onPatchDocument}
          active={mode === "layout"}
          canvasState={canvasState}
          onPatchCanvasState={onPatchCanvasState}
          selectedBlockId={selectedBlockId}
          onSelectBlockId={onSelectBlockId}
          railOpen={railOpen}
        />
      );
    }

    if (activeMode === "widgets") {
      return (
        <PageStudioWidgetsMode
          studioDocument={studioDocument}
          onPatchDocument={onPatchDocument}
          active={mode === "widgets"}
          canvasState={canvasState}
          onPatchCanvasState={onPatchCanvasState}
          selectedBlockId={selectedBlockId}
          onSelectBlockId={onSelectBlockId}
          railOpen={railOpen}
          previewResources={previewResources}
        />
      );
    }

    if (activeMode === "preview") {
      return (
        <PageStudioPreviewMode
          studioDocument={studioDocument}
          onPatchDocument={onPatchDocument}
          active={mode === "preview"}
          canvasState={canvasState}
          onPatchCanvasState={onPatchCanvasState}
          railOpen={railOpen}
          previewResources={previewResources}
        />
      );
    }

    const blocks = studioDocument.widgets.blocks.length > 0
      ? studioDocument.widgets.blocks
      : createSeedBlocks();

    return (
      <>
        <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Box sx={{ position: "absolute", top: 0, left: 48, right: 0, height: 28, borderBottom: 1, borderColor: "divider", bgcolor: "rgba(255,255,255,0.7)" }} />
          <Box sx={{ position: "absolute", top: 28, left: 0, bottom: 0, width: 48, borderRight: 1, borderColor: "divider", bgcolor: "rgba(255,255,255,0.7)" }} />
        </Box>
        <Stack
          sx={{
            position: "relative",
            minHeight: "100%",
            height: "auto",
            overflow: "auto",
            p: 3.5,
            pt: 5,
            pl: 6.5
          }}
          spacing={2}
        >
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Chip label={modeDescriptor.title} color="primary" />
            <Chip label="Canvas-first builder" variant="outlined" />
            <Chip label="Decoupled module foundation" variant="outlined" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {modeDescriptor.summary}
          </Typography>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1.5}
            sx={{ minHeight: 0, flex: 1 }}
          >
            <Stack spacing={1.5} sx={{ flex: 1.2, minWidth: 0 }}>
              {activeMode === "infra" ? (
                <InfraEditor studioDocument={studioDocument} onPatchDocument={onPatchDocument} />
              ) : null}
              {activeMode === "layout" ? (
                <LayoutModeSummary studioDocument={studioDocument} onPatchDocument={onPatchDocument} />
              ) : null}
              {activeMode === "preview" ? (
                <ModeCard
                  title="Preview Equals Live"
                  body="This mode exists to prove that the chosen client and widget wrappers produce the same result as deployment for the same route, params, and data."
                  chips={["mui runtime", "url param testing", "preview = live"]}
                />
              ) : null}
            </Stack>
            <Paper variant="outlined" square sx={{ flex: 1, p: 1.5, bgcolor: "common.white" }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">Block Seeds</Typography>
                <Typography variant="body2" color="text.secondary">
                  These are placeholder block identities only. Real Gridstack geometry and widget assignment come in later passes.
                </Typography>
                <Stack spacing={1}>
                  {blocks.map((block) => (
                    <Paper
                      key={block.id}
                      variant="outlined"
                      square
                      sx={{
                        p: 1.25,
                        borderColor: block.tone,
                        backgroundColor: `${block.tone}14`
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Stack spacing={0.25}>
                          <Typography variant="subtitle2">{block.id}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {block.summary}
                          </Typography>
                        </Stack>
                        <Chip label={block.widgetKey ? block.widgetKey : "No widget yet"} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </>
    );
  }

  return (
    <Paper
      variant="outlined"
      square
      sx={{
        position: "relative",
        flex: 1,
        height: "100%",
        minHeight: 0,
        overflow: usesDedicatedStageSurface ? "hidden" : "auto",
        borderRadius: 0,
        background:
          "linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)"
      }}
    >
      <Box
        sx={
          usesDedicatedStageSurface
            ? { position: "absolute", inset: 0, overflow: "hidden" }
            : { position: "relative", minHeight: "100%", overflow: "auto" }
        }
      >
        {renderSurface(mode)}
      </Box>
    </Paper>
  );
}

export function PageStudioView({ route = {}, navigate = null, activeModuleLabel = "Page Studio" }) {
  const [fabOpen, setFabOpen] = useState(false);
  const [studioDocument, setStudioDocument] = useState(() => {
    const persisted = readPersistedStudioDocument();
    const normalized = ensureSeedStudioShape(persisted);
    normalized.mode = normalizePageStudioMode(route?.studioMode, normalized.mode);
    return normalized;
  });
  const routeModeRef = useRef(normalizePageStudioMode(route?.studioMode, studioDocument.mode));
  const activeMode = normalizePageStudioMode(studioDocument.mode, routeModeRef.current);
  const activeModeDescriptor = MODE_DESCRIPTORS[activeMode];
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [canvasState, setCanvasState] = useState(() =>
    createInitialCanvasState(studioDocument.layout.activeBreakpoint)
  );
  const [selectedBlockId, setSelectedBlockId] = useState(
    () => studioDocument.widgets.blocks[0]?.id ?? null
  );
  const previewResources = usePageStudioPreviewResources(studioDocument, { eager: true });
  const widgetsAssigned = studioDocument.widgets.blocks.filter((block) => block.componentInstance).length;
  const supportsSidePanel = activeMode === "layout" || activeMode === "widgets" || activeMode === "preview";


  useEffect(() => {
    if (!selectedBlockId || !studioDocument.widgets.blocks.some((block) => block.id === selectedBlockId)) {
      setSelectedBlockId(studioDocument.widgets.blocks[0]?.id ?? null);
    }
  }, [selectedBlockId, studioDocument.widgets.blocks]);

  useEffect(() => {
    const externalRouteMode = normalizePageStudioMode(route?.studioMode, null);
    if (!externalRouteMode || externalRouteMode === routeModeRef.current) {
      return;
    }
    routeModeRef.current = externalRouteMode;
    setStudioDocument((previous) => {
      if (previous.mode === externalRouteMode) {
        return previous;
      }
      return normalizePageStudioDocument({
        ...previous,
        mode: externalRouteMode
      });
    });
  }, [route?.studioMode]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    const serialized = JSON.stringify(toPersistedStudioDocument(studioDocument));
    if (window.localStorage.getItem(PAGE_STUDIO_STORAGE_KEY) !== serialized) {
      window.localStorage.setItem(PAGE_STUDIO_STORAGE_KEY, serialized);
    }
  }, [studioDocument]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    function handleStorage(event) {
      if (event.key !== PAGE_STUDIO_STORAGE_KEY || !event.newValue) {
        return;
      }
      try {
        const parsed = ensureSeedStudioShape(JSON.parse(event.newValue));
        setStudioDocument((previous) =>
          normalizePageStudioDocument({
            ...parsed,
            mode: previous.mode
          })
        );
      } catch {
        // ignore cross-tab storage noise
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const patchStudioDocument = useCallback((updater) => {
    setStudioDocument((previous) => {
      const nextValue = typeof updater === "function" ? updater(previous) : updater;
      return ensureSeedStudioShape(nextValue);
    });
  }, []);

  const patchCanvasState = useCallback((updater) => {
    setCanvasState((previous) => {
      const nextValue =
        typeof updater === "function"
          ? updater(previous)
          : {
              ...previous,
              ...updater
            };
      return {
        viewport: {
          width: clampViewportWidth(nextValue.viewport?.width ?? previous.viewport.width),
          height: clampViewportHeight(nextValue.viewport?.height ?? previous.viewport.height)
        },
        zoomLevel: clampZoomLevel(nextValue.zoomLevel ?? previous.zoomLevel),
        zoomMode: nextValue.zoomMode === "manual" ? "manual" : "auto"
      };
    });
  }, []);

  const handleChangeMode = useCallback(
    (mode) => {
      const nextMode = normalizePageStudioMode(mode, activeMode);
      patchStudioDocument((previous) => ({
        ...previous,
        mode: nextMode
      }));
      routeModeRef.current = nextMode;

      if (typeof window !== "undefined") {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("studioMode", nextMode);
        window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}`);
      }
    },
    [activeMode, patchStudioDocument]
  );

  const handleOpenLegacyRoute = useCallback(
    (moduleId) => {
      if (typeof navigate === "function") {
        navigate({ moduleId }, { replace: false });
        return;
      }

      if (typeof window !== "undefined") {
        window.location.assign(`/app/${moduleId}`);
      }
    },
    [navigate]
  );

  const handleResetStudioDraft = useCallback(() => {
    const nextDocument = ensureSeedStudioShape({
      ...createEmptyPageStudioDocument(),
      mode: activeMode
    });
    patchStudioDocument(nextDocument);
  }, [activeMode, patchStudioDocument]);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "grey.100",
        overflow: "hidden"
      }}
    >
      <Paper
        square
        sx={{ borderBottom: 1, borderColor: "divider", px: 1.5, py: 0.75, position: "sticky", top: 0, zIndex: 3 }}
      >
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1} justifyContent="space-between" alignItems={{ lg: "center" }}>
          <Stack spacing={0.45}>
            <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                PAGE STUDIO
              </Typography>
              <Typography variant="h6" sx={{ lineHeight: 1.15 }}>{activeModuleLabel}</Typography>
              <Chip size="small" label={`Mode ${PAGE_STUDIO_MODE_LABELS[activeMode]}`} color="primary" />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {activeModeDescriptor.summary}
            </Typography>
            <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
              <Chip size="small" variant="outlined" label={studioDocument.infra.routePath || "/untitled"} />
              <Chip size="small" variant="outlined" label={`Breakpoint ${PAGE_STUDIO_BREAKPOINT_LABELS[studioDocument.layout.activeBreakpoint]}`} />
              <Chip size="small" variant="outlined" label={`Scenario ${studioDocument.layout.scenarioKey || "custom"}`} />
              <Chip size="small" variant="outlined" label={`${widgetsAssigned}/${studioDocument.widgets.blocks.length} widgets`} />
              <Chip size="small" variant="outlined" label={resolvePageStudioClient(studioDocument.infra.clientKey).label} />
            </Stack>
          </Stack>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
            <Button size="small" variant="outlined" onClick={() => handleOpenLegacyRoute("test-modules-pages")}>
              Legacy Pages
            </Button>
            <Button size="small" variant="outlined" onClick={() => handleOpenLegacyRoute("test-modules-layouts")}>
              Legacy Layouts
            </Button>
            {supportsSidePanel ? (
              <Button size="small" variant="outlined" onClick={() => setSidePanelOpen((current) => !current)}>
                {sidePanelOpen ? "Hide Panel" : "Show Panel"}
              </Button>
            ) : null}
            <Button size="small" variant="text" color="inherit" onClick={handleResetStudioDraft}>
              Reset Draft
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ flex: 1, minHeight: 0, p: 1, position: "relative", display: "flex" }}>
        <BuilderCanvas
          studioDocument={studioDocument}
          mode={activeMode}
          canvasState={canvasState}
          onPatchCanvasState={patchCanvasState}
          selectedBlockId={selectedBlockId}
          onSelectBlockId={setSelectedBlockId}
          railOpen={sidePanelOpen}
          onPatchDocument={patchStudioDocument}
          previewResources={previewResources}
        />
        <SpeedDial
          ariaLabel="Page studio mode switcher"
          icon="◆"
          open={fabOpen}
          onOpen={() => setFabOpen(true)}
          onClose={() => setFabOpen(false)}
          sx={{ position: "absolute", right: 24, bottom: 24 }}
        >
          {PAGE_STUDIO_MODES.map((mode) => (
            <SpeedDialAction
              key={mode}
              icon={PAGE_STUDIO_MODE_LABELS[mode].slice(0, 1)}
              tooltipTitle={PAGE_STUDIO_MODE_LABELS[mode]}
              tooltipOpen
              onClick={() => {
                setFabOpen(false);
                handleChangeMode(mode);
              }}
            />
          ))}
        </SpeedDial>
      </Box>
    </Box>
  );
}

