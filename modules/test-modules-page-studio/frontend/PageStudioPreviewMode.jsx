import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Link,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Typography,
  createTheme
} from "@mui/material";
import { fetchReferenceCollectionItems } from "../../../frontend/src/api/reference.js";
import { LayoutBuilderCanvasShell } from "../../test-modules-layouts/frontend/LayoutBuilderCanvasShell.jsx";
import {
  clampViewportHeight,
  clampViewportWidth,
  clampZoomLevel,
  DEFAULT_ZOOM_LEVEL,
  VIEWPORT_PRESETS
} from "../../test-modules-layouts/frontend/layout-builder-viewport.js";
import { buildWidgetContextScope, resolveWidgetContextBindingValue } from "../../test-modules-pages/shared/page-widget-context.mjs";
import { DEFAULT_WIDGET_COMPONENT_REGISTRY } from "../../test-modules-layouts/shared/widget-component-schema.mjs";
import { buildPageStudioRuntimeLayoutContract } from "../shared/page-studio-layout-transform.mjs";
import { PAGE_STUDIO_BREAKPOINT_LABELS } from "../shared/page-studio-breakpoints.mjs";
import {
  buildPageStudioPreviewDescriptor,
  buildPageStudioPreviewModel,
  resolvePageStudioPreviewTheme
} from "./page-studio-preview-data.js";
import { buildPageStudioCanvasFrameMetrics } from "./page-studio-canvas-frame.js";
import { PageStudioRuntimeCanvas } from "./PageStudioRuntimeCanvas.jsx";
import { getPageStudioPreviewBootstrapResources } from "./page-studio-preview-resources.js";

const POSTS_COLLECTION_ID = "blog-posts";
const AUTHORS_COLLECTION_ID = "blog-authors";
const CATEGORIES_COLLECTION_ID = "blog-categories";
const TAGS_COLLECTION_ID = "blog-tags";
const MEDIA_ITEMS_COLLECTION_ID = "media-items";
const THEMES_COLLECTION_ID = "page-themes";
const CUSTOM_WIDGETS_COLLECTION_ID = "page-custom-widgets";

const CANVAS_FIT_WIDTH_OFFSET = 96;
const CANVAS_FIT_HEIGHT_OFFSET = 120;
const STUDIO_RAIL_WIDTH = 336;
const PREVIEW_COLLECTIONS_CACHE_TTL_MS = 15000;
const PREVIEW_CONTENT_CACHE_STORAGE_KEY = "page-studio.preview.content-cache.v1";
const PREVIEW_THEME_CACHE_STORAGE_KEY = "page-studio.preview.theme-cache.v1";
let previewContentCollectionsCache = null;
let previewContentCollectionsCachedAt = 0;
let previewContentCollectionsPromise = null;
let previewThemeCollectionsCache = null;
let previewThemeCollectionsCachedAt = 0;
let previewThemeCollectionsPromise = null;

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

function toArray(value) {
  return Array.isArray(value) ? value : [];
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

function resolveBindingTree(rawValue, context, libraries) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((entry) => resolveBindingTree(entry, context, libraries));
  }
  if (!rawValue || typeof rawValue !== "object") {
    return rawValue ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(rawValue, "mode")) {
    if (rawValue.mode === "static") {
      return rawValue.value ?? null;
    }
    if (rawValue.source === "context" || rawValue.source === "item") {
      const resolved = resolveWidgetContextBindingValue(rawValue.path, context);
      return resolved ?? rawValue.fallback ?? null;
    }
    if (rawValue.source === "library" && rawValue.libraryKey === "media") {
      return libraries.mediaById.get(rawValue.itemId) ?? rawValue.snapshot ?? rawValue.fallback ?? null;
    }
    return rawValue.fallback ?? null;
  }
  return Object.fromEntries(
    Object.entries(rawValue).map(([key, value]) => [key, resolveBindingTree(value, context, libraries)])
  );
}

function createMuiTheme(themeDocument, breakpoint) {
  const typographyModel = themeDocument?.typographyModel?.[breakpoint] ?? themeDocument?.typographyModel?.desktop ?? {};
  const spacingModel = themeDocument?.spacingModel?.[breakpoint] ?? themeDocument?.spacingModel?.desktop ?? {};
  const colorModel = themeDocument?.colorModel ?? {};
  return createTheme({
    palette: {
      mode: colorModel.background && colorModel.background.toLowerCase() === "#0b1120" ? "dark" : "light",
      primary: { main: colorModel.primary ?? "#8a4b22" },
      secondary: { main: colorModel.secondary ?? "#325c74" },
      background: {
        default: colorModel.background ?? "#f6efe3",
        paper: colorModel.surface ?? "#fffaf2"
      },
      text: {
        primary: colorModel.ink ?? "#1f1720",
        secondary: colorModel.muted ?? "#625a5d"
      }
    },
    shape: {
      borderRadius: Number(spacingModel.radius ?? 24)
    },
    spacing: Number(spacingModel.blockGap ?? 16) / 4,
    typography: {
      fontFamily: themeDocument?.resolved?.fonts?.bodyFamily ?? "'Source Serif 4', serif",
      h1: {
        fontFamily: themeDocument?.resolved?.fonts?.headingFamily ?? "'Fraunces', serif",
        fontSize: typographyModel.h1?.fontSize,
        lineHeight: typographyModel.h1?.lineHeight,
        fontWeight: typographyModel.h1?.fontWeight,
        letterSpacing: typographyModel.h1?.letterSpacing
      },
      h2: {
        fontFamily: themeDocument?.resolved?.fonts?.headingFamily ?? "'Fraunces', serif",
        fontSize: typographyModel.h2?.fontSize,
        lineHeight: typographyModel.h2?.lineHeight,
        fontWeight: typographyModel.h2?.fontWeight,
        letterSpacing: typographyModel.h2?.letterSpacing
      },
      h3: {
        fontFamily: themeDocument?.resolved?.fonts?.headingFamily ?? "'Fraunces', serif",
        fontSize: typographyModel.h3?.fontSize,
        lineHeight: typographyModel.h3?.lineHeight,
        fontWeight: typographyModel.h3?.fontWeight,
        letterSpacing: typographyModel.h3?.letterSpacing
      },
      body1: {
        fontSize: typographyModel.body?.fontSize,
        lineHeight: typographyModel.body?.lineHeight,
        fontWeight: typographyModel.body?.fontWeight
      },
      caption: {
        fontSize: typographyModel.caption?.fontSize,
        lineHeight: typographyModel.caption?.lineHeight,
        fontWeight: typographyModel.caption?.fontWeight
      }
    }
  });
}

function useThemeStylesheet(themeDocument) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const styleId = "page-studio-preview-fonts";
    let styleNode = document.getElementById(styleId);
    if (!styleNode) {
      styleNode = document.createElement("style");
      styleNode.id = styleId;
      document.head.appendChild(styleNode);
    }
    styleNode.textContent = toArray(themeDocument?.resolved?.stylesheetUrls)
      .map((url) => `@import url('${url}');`)
      .join("\n");
  }, [themeDocument]);
}

function PreviewLink({ href, onPreviewNavigate, children }) {
  if (!href) {
    return <>{children}</>;
  }
  return (
    <Link
      href={href}
      underline="hover"
      color="inherit"
      onClick={(event) => {
        event.preventDefault();
        onPreviewNavigate?.(href);
      }}
      sx={{ cursor: "pointer" }}
    >
      {children}
    </Link>
  );
}

function renderParagraphs(text) {
  return normalizeText(text, "")
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function uniqueById(items = []) {
  const seen = new Set();
  return toArray(items).filter((item) => {
    const itemId = item?.id ?? null;
    if (!itemId || seen.has(itemId)) {
      return false;
    }
    seen.add(itemId);
    return true;
  });
}

function RuntimeBlock({ item, block, context, libraries, onPreviewNavigate }) {
  return (
    <Box
      sx={{
        gridColumn: `${item.colStart} / span ${item.colSpan}`,
        gridRow: `${item.rowStart} / span ${item.rowSpan}`,
        minWidth: 0,
        minHeight: 0
      }}
    >
      <Box sx={{ height: "100%", minHeight: 0, overflow: "auto" }}>
        {block?.componentInstance ? (
          <PageStudioWidgetRenderer
            widget={block.componentInstance}
            context={context}
            libraries={libraries}
            onNavigate={onPreviewNavigate}
          />
        ) : (
          <Paper variant="outlined" sx={{ p: 2, minHeight: "100%", borderStyle: "dashed" }}>
            <Stack spacing={0.75}>
              <Chip size="small" label={block?.id ?? item.blockId} color="primary" variant="outlined" sx={{ alignSelf: "flex-start" }} />
              <Typography variant="subtitle2">{normalizeText(block?.summary, "Unassigned block")}</Typography>
              <Typography variant="body2" color="text.secondary">
                This block has no widget yet. Assign one in Widgets mode to make Preview and Live match.
              </Typography>
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

function PreviewRuntime({
  studioDocument,
  previewState,
  activeBreakpoint,
  runtimeBreakpoint,
  frameMetrics,
  viewport,
  onPreviewNavigate
}) {
  const themeDocument = previewState.themeDocument;
  useThemeStylesheet(themeDocument);
  const muiTheme = useMemo(
    () => createMuiTheme(themeDocument, activeBreakpoint),
    [themeDocument, activeBreakpoint]
  );
  const context = useMemo(
    () => buildWidgetContextScope({ page: previewState.page, model: previewState.model }),
    [previewState.page, previewState.model]
  );
  const libraries = useMemo(
    () => createPageStudioPreviewLibraries(previewState.collections),
    [previewState.collections.mediaItems]
  );
  const blockById = useMemo(
    () => new Map(studioDocument.widgets.blocks.map((block) => [block.id, block])),
    [studioDocument.widgets.blocks]
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        sx={{
          backgroundColor: "background.default",
          color: "text.primary",
          minHeight: `${viewport.height}px`
        }}
      >
        <Box
          sx={{
            width: `${frameMetrics.canvasWidth}px`,
            minHeight: `${viewport.height}px`,
            mx: "auto",
            display: "grid",
            gridTemplateColumns: `repeat(${runtimeBreakpoint.columns}, minmax(0, 1fr))`,
            gridAutoRows: `${frameMetrics.rowHeightPx}px`,
            gap: `${frameMetrics.gapPx}px`,
            p: `${frameMetrics.paddingPx}px`,
            alignContent: "start",
            boxSizing: "border-box"
          }}
        >
          {runtimeBreakpoint.items.map((item) => (
            <RuntimeBlock
              key={`${activeBreakpoint}-${item.blockId}`}
              item={item}
              block={blockById.get(item.blockId) ?? null}
              context={context}
              libraries={libraries}
              onPreviewNavigate={onPreviewNavigate}
            />
          ))}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

async function fetchCollection(collectionId) {
  const payload = await fetchReferenceCollectionItems({
    collectionId,
    limit: 500
  });
  return toArray(payload?.items);
}

function readStoredPreviewCache(storageKey) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (Date.now() - Number(parsed.cachedAt ?? 0) >= PREVIEW_COLLECTIONS_CACHE_TTL_MS) {
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

function writeStoredPreviewCache(storageKey, value) {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }
  try {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        cachedAt: Date.now(),
        value
      })
    );
  } catch {
    // ignore session storage pressure
  }
}

async function loadPreviewContentCollections() {
  if (!previewContentCollectionsCache) {
    const stored = readStoredPreviewCache(PREVIEW_CONTENT_CACHE_STORAGE_KEY);
    if (stored) {
      previewContentCollectionsCache = stored;
      previewContentCollectionsCachedAt = Date.now();
    }
  }
  if (
    previewContentCollectionsCache &&
    Date.now() - previewContentCollectionsCachedAt < PREVIEW_COLLECTIONS_CACHE_TTL_MS
  ) {
    return previewContentCollectionsCache;
  }
  if (!previewContentCollectionsPromise) {
    previewContentCollectionsPromise = Promise.all([
      fetchCollection(POSTS_COLLECTION_ID),
      fetchCollection(AUTHORS_COLLECTION_ID),
      fetchCollection(CATEGORIES_COLLECTION_ID),
      fetchCollection(TAGS_COLLECTION_ID),
      fetchCollection(MEDIA_ITEMS_COLLECTION_ID),
      fetchCollection(CUSTOM_WIDGETS_COLLECTION_ID)
    ])
      .then(([posts, authors, categories, tags, mediaItems, customWidgets]) => {
        previewContentCollectionsCache = {
          posts,
          authors,
          categories,
          tags,
          mediaItems,
          customWidgets
        };
        previewContentCollectionsCachedAt = Date.now();
        writeStoredPreviewCache(PREVIEW_CONTENT_CACHE_STORAGE_KEY, previewContentCollectionsCache);
        return previewContentCollectionsCache;
      })
      .finally(() => {
        previewContentCollectionsPromise = null;
      });
  }
  return previewContentCollectionsPromise;
}

async function loadPreviewThemeCollections() {
  if (!previewThemeCollectionsCache) {
    const stored = readStoredPreviewCache(PREVIEW_THEME_CACHE_STORAGE_KEY);
    if (stored) {
      previewThemeCollectionsCache = stored;
      previewThemeCollectionsCachedAt = Date.now();
    }
  }
  if (
    previewThemeCollectionsCache &&
    Date.now() - previewThemeCollectionsCachedAt < PREVIEW_COLLECTIONS_CACHE_TTL_MS
  ) {
    return previewThemeCollectionsCache;
  }
  if (!previewThemeCollectionsPromise) {
    previewThemeCollectionsPromise = fetchCollection(THEMES_COLLECTION_ID)
      .then((themes) => {
        previewThemeCollectionsCache = themes;
        previewThemeCollectionsCachedAt = Date.now();
        writeStoredPreviewCache(PREVIEW_THEME_CACHE_STORAGE_KEY, previewThemeCollectionsCache);
        return previewThemeCollectionsCache;
      })
      .finally(() => {
        previewThemeCollectionsPromise = null;
      });
  }
  return previewThemeCollectionsPromise;
}

export function PageStudioPreviewMode({
  studioDocument,
  onPatchDocument,
  canvasState,
  onPatchCanvasState,
  railOpen = false,
  previewResources = null
}) {
  const activeBreakpoint = studioDocument.layout.activeBreakpoint;
  const runtimeLayoutContract = useMemo(
    () =>
      buildPageStudioRuntimeLayoutContract({
        editorGrid: studioDocument.layout.editorGrid,
        runtimeLayoutMetadata: studioDocument.layout.runtimeLayoutMetadata
      }),
    [studioDocument.layout.editorGrid, studioDocument.layout.runtimeLayoutMetadata]
  );
  const runtimeBreakpoint = runtimeLayoutContract.breakpoints[activeBreakpoint];
  const [shellBounds, setShellBounds] = useState({ width: 0, height: 0 });
  const shellHostRef = useRef(null);
  const viewport = canvasState.viewport;
  const zoomLevel = canvasState.zoomLevel;
  const zoomMode = canvasState.zoomMode;
  const pageViewportRef = useRef(null);
  const previewScrollLockRef = useRef(false);
  const [previewScrollPercent, setPreviewScrollPercent] = useState(0);
  const [localDataState, setLocalDataState] = useState({
    contentLoading: true,
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
  const dataState = previewResources ?? localDataState;
  const previewBootstrap = useMemo(
    () => getPageStudioPreviewBootstrapResources(studioDocument),
    [studioDocument]
  );
  const effectiveCollections = dataState.contentLoading && previewBootstrap.contentReady
    ? {
        ...dataState.collections,
        ...previewBootstrap.collections
      }
    : dataState.collections;
  const effectiveContentLoading = dataState.contentLoading && !previewBootstrap.contentReady;

  useEffect(() => {
    if (previewResources) {
      return undefined;
    }
    let active = true;
    const storedContentCollections = previewContentCollectionsCache ?? readStoredPreviewCache(PREVIEW_CONTENT_CACHE_STORAGE_KEY);
    const storedThemeCollections = previewThemeCollectionsCache ?? readStoredPreviewCache(PREVIEW_THEME_CACHE_STORAGE_KEY);
    if (storedContentCollections && !previewContentCollectionsCache) {
      previewContentCollectionsCache = storedContentCollections;
      previewContentCollectionsCachedAt = Date.now();
    }
    if (storedThemeCollections && !previewThemeCollectionsCache) {
      previewThemeCollectionsCache = storedThemeCollections;
      previewThemeCollectionsCachedAt = Date.now();
    }
    if (
      previewContentCollectionsCache &&
      Date.now() - previewContentCollectionsCachedAt < PREVIEW_COLLECTIONS_CACHE_TTL_MS
    ) {
      setLocalDataState({
        contentLoading: false,
        themeLoading: !(
          previewThemeCollectionsCache &&
          Date.now() - previewThemeCollectionsCachedAt < PREVIEW_COLLECTIONS_CACHE_TTL_MS
        ),
        errorMessage: null,
        collections: {
          ...previewContentCollectionsCache,
          themes:
            previewThemeCollectionsCache &&
            Date.now() - previewThemeCollectionsCachedAt < PREVIEW_COLLECTIONS_CACHE_TTL_MS
              ? previewThemeCollectionsCache
              : []
        }
      });
    }
    if (
      previewThemeCollectionsCache &&
      Date.now() - previewThemeCollectionsCachedAt < PREVIEW_COLLECTIONS_CACHE_TTL_MS
    ) {
      setLocalDataState((previous) => ({
        ...previous,
        themeLoading: false,
        collections: {
          ...previous.collections,
          themes: previewThemeCollectionsCache
        }
      }));
    }
    async function load() {
      try {
        const collections = await loadPreviewContentCollections();
        if (active) {
          setLocalDataState((previous) => ({
            ...previous,
            contentLoading: false,
            errorMessage: null,
            collections: {
              ...previous.collections,
              ...collections
            }
          }));
        }
      } catch (error) {
        if (!active) {
          return;
        }
        setLocalDataState((previous) => ({
          ...previous,
          contentLoading: false,
          errorMessage: error?.message ?? "Failed to load preview data"
        }));
      }
    }
    async function loadThemes() {
      try {
        const themes = await loadPreviewThemeCollections();
        if (active) {
          setLocalDataState((previous) => ({
            ...previous,
            themeLoading: false,
            collections: {
              ...previous.collections,
              themes
            }
          }));
        }
      } catch {
        if (active) {
          setLocalDataState((previous) => ({
            ...previous,
            themeLoading: false
          }));
        }
      }
    }
    void load();
    void loadThemes();
    return () => {
      active = false;
    };
  }, [previewResources]);

  useEffect(() => {
    const pageViewport = pageViewportRef.current;
    if (!pageViewport) {
      return undefined;
    }
    function handleScroll() {
      if (previewScrollLockRef.current) {
        return;
      }
      const maxScroll = Math.max(0, pageViewport.scrollHeight - pageViewport.clientHeight);
      const nextPercent = maxScroll > 0 ? Math.round((pageViewport.scrollTop / maxScroll) * 100) : 0;
      setPreviewScrollPercent(nextPercent);
    }
    handleScroll();
    pageViewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => pageViewport.removeEventListener("scroll", handleScroll);
  }, [viewport, dataState.contentLoading]);

  useEffect(() => {
    const pageViewport = pageViewportRef.current;
    if (!pageViewport) {
      return;
    }
    previewScrollLockRef.current = true;
    pageViewport.scrollTop = 0;
    setPreviewScrollPercent(0);
    requestAnimationFrame(() => {
      previewScrollLockRef.current = false;
    });
  }, [activeBreakpoint, studioDocument.preview?.urlParams?.slug]);

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

  const previewParams = studioDocument.preview?.urlParams ?? {};
  const previewDescriptor = useMemo(
    () => buildPageStudioPreviewDescriptor(studioDocument, previewParams),
    [studioDocument, previewParams]
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
    dataState.page || dataState.model
      ? {
          ok: Boolean(dataState.page && dataState.model),
          issue: dataState.issue ?? null,
          page: dataState.page ?? previewDescriptor,
          model: dataState.model ?? null,
          sourceRecordId: dataState.sourceRecordId ?? null
        }
      : fallbackPreviewModelState;
  const fallbackThemeDocument = useMemo(
    () => resolvePageStudioPreviewTheme(studioDocument, effectiveCollections.themes),
    [effectiveCollections.themes, studioDocument]
  );
  const themeDocument = dataState.themeDocument ?? fallbackThemeDocument;
  const effectiveZoomLevel =
    zoomMode === "auto"
      ? computeAutoFitZoomLevel({ viewport, shellBounds })
      : zoomLevel;
  const frameMetrics = useMemo(
    () =>
      buildPageStudioCanvasFrameMetrics({
        viewport,
        runtimeBreakpoint,
        scaleRatio: 1
      }),
    [runtimeBreakpoint, viewport]
  );
  const zoomLabel =
    zoomMode === "auto"
      ? `Zoom ${effectiveZoomLevel}% · Fit`
      : `Zoom ${effectiveZoomLevel}%`;

  function patchPreviewParam(paramId, value) {
    onPatchDocument((previous) => ({
      ...previous,
      preview: {
        ...previous.preview,
        urlParams: {
          ...(previous.preview?.urlParams ?? {}),
          [paramId]: value
        }
      }
    }));
  }

  function handlePreviewNavigate(href) {
    const normalizedHref = normalizeText(href, "");
    if (!normalizedHref) {
      return;
    }
    const postMatch = normalizedHref.match(/\/(?:post|journal)\/([^/?#]+)/);
    if (postMatch?.[1]) {
      patchPreviewParam("slug", decodeURIComponent(postMatch[1]));
    }
  }

  function handlePreviewScrollChange(nextPercent) {
    const pageViewport = pageViewportRef.current;
    if (!pageViewport) {
      return;
    }
    previewScrollLockRef.current = true;
    setPreviewScrollPercent(nextPercent);
    const maxScroll = Math.max(0, pageViewport.scrollHeight - pageViewport.clientHeight);
    pageViewport.scrollTop = Math.round((maxScroll * nextPercent) / 100);
    requestAnimationFrame(() => {
      previewScrollLockRef.current = false;
    });
  }

  const previewState = useMemo(
    () => ({
      page: previewModelState.page ?? previewDescriptor,
      model: previewModelState.model ?? null,
      themeDocument,
      collections: effectiveCollections
    }),
    [effectiveCollections, previewDescriptor, previewModelState.model, previewModelState.page, themeDocument]
  );

  const assignedWidgetCount = studioDocument.widgets.blocks.filter((block) => block.componentInstance).length;

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
          pageViewportRef={pageViewportRef}
        >
          {previewModelState.ok && !effectiveContentLoading ? (
            <PageStudioRuntimeCanvas
              studioDocument={studioDocument}
              previewState={previewState}
              activeBreakpoint={activeBreakpoint}
              runtimeBreakpoint={runtimeBreakpoint}
              frameMetrics={frameMetrics}
              viewport={viewport}
              onNavigate={handlePreviewNavigate}
              scaleRatio={1}
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
                <Typography variant="h6">Preview not ready</Typography>
                <Typography variant="body2" color="text.secondary">
                  {effectiveContentLoading
                    ? "Loading preview content…"
                    : previewModelState.issue ?? "Adjust the studio document until a previewable page contract exists."}
                </Typography>
              </Stack>
            </Paper>
          )}
        </LayoutBuilderCanvasShell>
      </Box>

      {railOpen ? (
      <Paper variant="outlined" square sx={{ p: 1, minHeight: 0, overflow: "auto" }}>
        <Stack spacing={1}>
          <RailSection title="Preview Route" description="This is the exact route and page family the preview is simulating.">
            <Chip size="small" color="primary" label={previewDescriptor.pageKind ?? "generic-page"} />
            <TextField label="Path" size="small" value={previewDescriptor.path} InputProps={{ readOnly: true }} />
            <Chip size="small" variant="outlined" label={`Theme ${themeDocument.themeKey}`} />
            <Chip size="small" variant="outlined" label={`${assignedWidgetCount} widgets assigned`} />
          </RailSection>

          <RailSection title="Preview Inputs" description="Change route params and inspect different outcomes on the same page contract.">
            <TextField
              select
              label="Screen Size"
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
            {toArray(studioDocument.infra?.queryParams).map((param) => (
              <TextField
                key={param.id}
                label={param.label || param.id}
                size="small"
                value={previewParams[param.id] ?? ""}
                onChange={(event) => patchPreviewParam(param.id, event.target.value)}
              />
            ))}
          </RailSection>

          <RailSection title="Preview Status">
            {dataState.errorMessage ? <Alert severity="error">{dataState.errorMessage}</Alert> : null}
            {!dataState.errorMessage && previewModelState.issue ? <Alert severity="warning">{previewModelState.issue}</Alert> : null}
            {effectiveContentLoading ? <Alert severity="info">Loading preview content…</Alert> : null}
            {!effectiveContentLoading && dataState.themeLoading ? (
              <Alert severity="info">Applying theme settings…</Alert>
            ) : null}
            <Stack spacing={0.2}>
              <Typography variant="caption" color="text.secondary">
                Page scroll
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <Button size="small" variant="text" onClick={() => handlePreviewScrollChange(0)}>
                  Top
                </Button>
                <Button size="small" variant="text" onClick={() => handlePreviewScrollChange(50)}>
                  Mid
                </Button>
                <Button size="small" variant="text" onClick={() => handlePreviewScrollChange(100)}>
                  Bottom
                </Button>
              </Stack>
              <Slider
                size="small"
                value={previewScrollPercent}
                min={0}
                max={100}
                step={5}
                onChange={(_event, value) => handlePreviewScrollChange(Array.isArray(value) ? value[0] : value)}
                aria-label="Preview page scroll"
              />
            </Stack>
          </RailSection>
        </Stack>
      </Paper>
      ) : null}
    </Box>
  );
}




