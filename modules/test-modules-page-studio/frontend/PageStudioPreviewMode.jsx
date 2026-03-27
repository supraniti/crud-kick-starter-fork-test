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
  DEFAULT_VIEWPORT,
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

const POSTS_COLLECTION_ID = "blog-posts";
const AUTHORS_COLLECTION_ID = "blog-authors";
const CATEGORIES_COLLECTION_ID = "blog-categories";
const TAGS_COLLECTION_ID = "blog-tags";
const MEDIA_ITEMS_COLLECTION_ID = "media-items";
const THEMES_COLLECTION_ID = "page-themes";

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

function toArray(value) {
  return Array.isArray(value) ? value : [];
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

function TabsWidget({ tabs = [] }) {
  const [activeTab, setActiveTab] = useState(0);
  if (!tabs.length) {
    return <Alert severity="info">No tabs are configured for this block yet.</Alert>;
  }
  return (
    <Stack spacing={2}>
      <Tabs value={activeTab} onChange={(_event, value) => setActiveTab(value)} variant="scrollable">
        {tabs.map((tab, index) => (
          <Tab key={index} label={normalizeText(tab?.header, `Tab ${index + 1}`)} />
        ))}
      </Tabs>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="body1">
          {normalizeText(tabs[activeTab]?.body, "No tab content is available.")}
        </Typography>
      </Paper>
    </Stack>
  );
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

function WidgetRenderer({ widget, context, libraries, onPreviewNavigate }) {
  const descriptor = widget?.componentKey ? DEFAULT_WIDGET_COMPONENT_REGISTRY.get(widget.componentKey) ?? null : null;
  const content = resolveBindingTree(widget?.content ?? {}, context, libraries);
  const props = resolveBindingTree(widget?.props ?? {}, context, libraries);

  if (!descriptor) {
    return <Alert severity="warning">Unsupported widget.</Alert>;
  }

  if (widget.componentKey === "post-title") {
    const tag = normalizeText(props?.tag, "h1");
    return (
      <Box sx={{ minHeight: 0 }}>
        <Typography component={tag} variant={tag} sx={{ textWrap: "balance" }}>
          {normalizeText(content?.text, "Untitled story")}
        </Typography>
      </Box>
    );
  }

  if (widget.componentKey === "post-rich-text") {
    const paragraphs = renderParagraphs(content?.body ?? "");
    return (
      <Stack spacing={2}>
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => (
            <Typography key={index} variant="body1">
              {paragraph}
            </Typography>
          ))
        ) : (
          <Alert severity="info">No body content is available for this route.</Alert>
        )}
      </Stack>
    );
  }

  if (widget.componentKey === "media-image") {
    const media = content?.media;
    if (!media?.preferredUrl) {
      return <Alert severity="info">No media is available for this block.</Alert>;
    }
    return (
      <Box sx={{ height: "100%", minHeight: 0 }}>
        <Box
          component="img"
          src={media.preferredUrl}
          alt={normalizeText(media.altText, normalizeText(media.displayName, "Media"))}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: normalizeText(props?.fit, "cover"),
            border: "1px solid",
            borderColor: "divider",
            display: "block"
          }}
        />
      </Box>
    );
  }

  if (widget.componentKey === "category-chips") {
    const items = toArray(content?.items);
    return items.length > 0 ? (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignContent: "flex-start" }}>
        {items.map((item) => (
          <PreviewLink key={item.id ?? item.name} href={item.publicUrl ?? item.path} onPreviewNavigate={onPreviewNavigate}>
            <Chip label={normalizeText(item?.name, "Category")} clickable />
          </PreviewLink>
        ))}
      </Stack>
    ) : (
      <Alert severity="info">No categories are attached to this page yet.</Alert>
    );
  }

  if (widget.componentKey === "author-card") {
    const author = content?.author;
    if (!author) {
      return <Alert severity="info">No author is attached to this post yet.</Alert>;
    }
    return (
      <Card variant="outlined" sx={{ height: "100%" }}>
        <CardContent sx={{ height: "100%", overflow: "auto" }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar src={author.avatarMedia?.preferredUrl ?? undefined} alt={normalizeText(author.displayName, "Author")}>
              {normalizeText(author.displayName, "A").slice(0, 1)}
            </Avatar>
            <Stack spacing={0.75}>
              <PreviewLink href={author.publicUrl ?? author.path} onPreviewNavigate={onPreviewNavigate}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {normalizeText(author.displayName, "Author")}
                </Typography>
              </PreviewLink>
              {author.role ? <Typography variant="caption" color="text.secondary">{author.role}</Typography> : null}
              {author.bio ? <Typography variant="body2">{author.bio}</Typography> : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (widget.componentKey === "breadcrumbs") {
    const items = toArray(context.navigation?.breadcrumbs);
    return items.length > 0 ? (
      <Breadcrumbs>
        {items.map((item) => (
          <PreviewLink key={item.id ?? item.name} href={item.publicUrl ?? item.path} onPreviewNavigate={onPreviewNavigate}>
            <Typography variant="caption">{normalizeText(item?.name, "Category")}</Typography>
          </PreviewLink>
        ))}
      </Breadcrumbs>
    ) : (
      <Alert severity="info">No breadcrumb route is available for this page yet.</Alert>
    );
  }

  if (widget.componentKey === "post-navigation") {
    const heading = normalizeText(props?.heading, "Keep Reading");
    const items = [
      { label: "Previous Story", record: context.navigation?.previousPost },
      { label: "Next Story", record: context.navigation?.nextPost }
    ].filter((entry) => entry.record);
    return (
      <Stack spacing={2}>
        <Typography variant="h2">{heading}</Typography>
        {items.length > 0 ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {items.map((entry) => (
              <Card key={entry.label} variant="outlined" sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {entry.label}
                  </Typography>
                  <PreviewLink href={entry.record.publicUrl ?? entry.record.path} onPreviewNavigate={onPreviewNavigate}>
                    <Typography variant="h3" sx={{ mt: 0.75, mb: 1 }}>
                      {normalizeText(entry.record.title, "Untitled story")}
                    </Typography>
                  </PreviewLink>
                  {entry.record.excerpt ? <Typography variant="body2">{entry.record.excerpt}</Typography> : null}
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Alert severity="info">No adjacent stories are available for this route yet.</Alert>
        )}
      </Stack>
    );
  }

  if (widget.componentKey === "related-posts") {
    const heading = normalizeText(props?.heading, "Related Stories");
    const source = normalizeText(props?.source, "combined");
    const limit = Number(props?.limit);
    const maxItems = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 3;
    const related = context.related ?? {};
    let selectedItems = [];
    if (source === "moreFromAuthor") {
      selectedItems = toArray(related.moreFromAuthor);
    } else if (source === "byCategory") {
      selectedItems = toArray(related.byCategory);
    } else if (source === "byTag") {
      selectedItems = toArray(related.byTag);
    } else {
      selectedItems = uniqueById([
        ...toArray(related.moreFromAuthor),
        ...toArray(related.byCategory),
        ...toArray(related.byTag)
      ]);
    }
    selectedItems = selectedItems.slice(0, maxItems);
    return (
      <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
        <Typography variant="h2">{heading}</Typography>
        {selectedItems.length > 0 ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 2,
              overflow: "auto",
              pr: 0.5
            }}
          >
            {selectedItems.map((item) => (
              <Card key={item.id ?? item.title} variant="outlined" sx={{ height: "100%" }}>
                <CardContent sx={{ display: "grid", gap: 1.25 }}>
                  {item.featuredMedia?.preferredUrl ? (
                    <Box
                      component="img"
                      src={item.featuredMedia.preferredUrl}
                      alt={normalizeText(item.featuredMedia.altText, normalizeText(item.title, "Related story"))}
                      sx={{
                        width: "100%",
                        height: 120,
                        objectFit: "cover",
                        border: "1px solid",
                        borderColor: "divider"
                      }}
                    />
                  ) : null}
                  <PreviewLink href={item.publicUrl ?? item.path} onPreviewNavigate={onPreviewNavigate}>
                    <Typography variant="h3">{normalizeText(item.title, "Untitled story")}</Typography>
                  </PreviewLink>
                  {item.excerpt ? <Typography variant="body2">{item.excerpt}</Typography> : null}
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Alert severity="info">No related stories are available for this route yet.</Alert>
        )}
      </Stack>
    );
  }

  if (widget.componentKey === "tabs") {
    return <TabsWidget tabs={toArray(content?.tabs)} />;
  }

  return <Alert severity="warning">{descriptor.displayName} is not yet previewable.</Alert>;
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
          <WidgetRenderer
            widget={block.componentInstance}
            context={context}
            libraries={libraries}
            onPreviewNavigate={onPreviewNavigate}
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
    () => ({
      mediaById: new Map(toArray(previewState.collections.mediaItems).map((item) => [
        item.id,
        {
          ...item,
          preferredUrl:
            item.preferredUrl ??
            item.localContentUrl ??
            `/api/reference/modules/test-modules-media-manager/media-items/${encodeURIComponent(item.id)}/content`
        }
      ]))
    }),
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
            width: "100%",
            maxWidth: `${runtimeBreakpoint.canvasMaxWidth}px`,
            minHeight: `${viewport.height}px`,
            mx: "auto",
            display: "grid",
            gridTemplateColumns: `repeat(${runtimeBreakpoint.columns}, minmax(0, 1fr))`,
            gridAutoRows: `${runtimeBreakpoint.rowHeight}px`,
            gap: `${runtimeBreakpoint.gap * 8}px`,
            p: `${runtimeBreakpoint.padding * 8}px`,
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

export function PageStudioPreviewMode({ studioDocument, onPatchDocument }) {
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
  const [viewport, setViewport] = useState(() => buildViewportFromBreakpoint(activeBreakpoint));
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);
  const [zoomMode, setZoomMode] = useState("auto");
  const [shellBounds, setShellBounds] = useState({ width: 0, height: 0 });
  const shellHostRef = useRef(null);
  const pageViewportRef = useRef(null);
  const previewScrollLockRef = useRef(false);
  const [previewScrollPercent, setPreviewScrollPercent] = useState(0);
  const [dataState, setDataState] = useState({
    loading: true,
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
    let active = true;
    async function load() {
      try {
        const [posts, authors, categories, tags, mediaItems, themes] = await Promise.all([
          fetchCollection(POSTS_COLLECTION_ID),
          fetchCollection(AUTHORS_COLLECTION_ID),
          fetchCollection(CATEGORIES_COLLECTION_ID),
          fetchCollection(TAGS_COLLECTION_ID),
          fetchCollection(MEDIA_ITEMS_COLLECTION_ID),
          fetchCollection(THEMES_COLLECTION_ID)
        ]);
        if (!active) {
          return;
        }
        setDataState({
          loading: false,
          errorMessage: null,
          collections: { posts, authors, categories, tags, mediaItems, themes }
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setDataState((previous) => ({
          ...previous,
          loading: false,
          errorMessage: error?.message ?? "Failed to load preview data"
        }));
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setViewport(buildViewportFromBreakpoint(activeBreakpoint));
    setZoomMode("auto");
  }, [activeBreakpoint]);

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
  }, [viewport, dataState.loading]);

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
  const previewModelState = useMemo(
    () =>
      buildPageStudioPreviewModel({
        studioDocument,
        collections: dataState.collections,
        previewParams
      }),
    [dataState.collections, previewParams, studioDocument]
  );
  const themeDocument = useMemo(
    () => resolvePageStudioPreviewTheme(studioDocument, dataState.collections.themes),
    [dataState.collections.themes, studioDocument]
  );
  const effectiveZoomLevel =
    zoomMode === "auto"
      ? computeAutoFitZoomLevel({ viewport, shellBounds })
      : zoomLevel;
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
      collections: dataState.collections
    }),
    [dataState.collections, previewDescriptor, previewModelState.model, previewModelState.page, themeDocument]
  );

  const assignedWidgetCount = studioDocument.widgets.blocks.filter((block) => block.componentInstance).length;

  return (
    <Box
      sx={{
        minHeight: 0,
        flex: 1,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 320px" },
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
          pageViewportRef={pageViewportRef}
        >
          {previewModelState.ok && !dataState.loading ? (
            <PreviewRuntime
              studioDocument={studioDocument}
              previewState={previewState}
              activeBreakpoint={activeBreakpoint}
              runtimeBreakpoint={runtimeBreakpoint}
              viewport={viewport}
              onPreviewNavigate={handlePreviewNavigate}
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
                  {dataState.loading
                    ? "Loading preview datasets."
                    : previewModelState.issue ?? "Adjust the studio document until a previewable page contract exists."}
                </Typography>
              </Stack>
            </Paper>
          )}
        </LayoutBuilderCanvasShell>
      </Box>

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
            {dataState.loading ? <Alert severity="info">Loading preview datasets...</Alert> : null}
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
    </Box>
  );
}
