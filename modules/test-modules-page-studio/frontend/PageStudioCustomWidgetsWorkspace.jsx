import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
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
  deleteReferenceCollectionItem,
  fetchReferenceCollectionItems,
  updateReferenceCollectionItem
} from "../../../frontend/src/api/reference.js";
import {
  clampViewportHeight,
  clampViewportWidth,
  clampZoomLevel,
  DEFAULT_VIEWPORT,
  DEFAULT_ZOOM_LEVEL,
  VIEWPORT_PRESETS
} from "../../test-modules-layouts/frontend/layout-builder-viewport.js";
import { buildCustomWidgetCompositionFromStudioDocument } from "../shared/page-studio-custom-widget-composition.mjs";
import {
  buildCustomWidgetStudioDraft,
  buildStudioDocumentFromCustomWidget,
  CUSTOM_WIDGET_CONTEXT_PRESETS,
  CUSTOM_WIDGET_STARTER_PRESETS
} from "../shared/page-studio-custom-widget-editor-support.mjs";
import { normalizePageStudioMode, PAGE_STUDIO_MODE_LABELS } from "../shared/page-studio-modes.mjs";
import { PageStudioLayoutMode } from "./PageStudioLayoutMode.jsx";
import { PageStudioPreviewMode } from "./PageStudioPreviewMode.jsx";
import { usePageStudioPreviewResources } from "./page-studio-preview-resources.js";
import { PageStudioWidgetsMode } from "./PageStudioWidgetsMode.jsx";

const CUSTOM_WIDGETS_COLLECTION_ID = "page-custom-widgets";

function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function slugify(value, fallback = "custom-widget") {
  const normalized = normalizeText(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
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

function createInitialCanvasState(breakpoint = "desktop") {
  return {
    viewport: buildViewportFromBreakpoint(breakpoint),
    zoomLevel: DEFAULT_ZOOM_LEVEL,
    zoomMode: "auto"
  };
}

function createWidgetMetadataFromItem(item = null) {
  return {
    id: item?.id ?? null,
    title: normalizeText(item?.title, "Untitled Custom Widget"),
    widgetKey: normalizeText(item?.widgetKey, slugify(item?.title, "custom-widget")),
    iconKey: normalizeText(item?.iconKey, "view_quilt"),
    categoryKey: normalizeText(item?.categoryKey, "Custom"),
    description: normalizeText(item?.description, ""),
    summary: normalizeText(item?.summary, ""),
    status: item?.status === "archived" ? "archived" : "ready"
  };
}

function createWidgetPayload(metadata, studioDocument) {
  const composition = buildCustomWidgetCompositionFromStudioDocument(studioDocument);
  const widgetCount = Array.isArray(composition?.blocks)
    ? composition.blocks.filter((block) => block?.componentInstance).length
    : 0;
  return {
    title: normalizeText(metadata?.title, "Untitled Custom Widget"),
    widgetKey: slugify(metadata?.widgetKey || metadata?.title, "custom-widget"),
    iconKey: normalizeText(metadata?.iconKey, "view_quilt"),
    categoryKey: normalizeText(metadata?.categoryKey, "Custom"),
    description: normalizeText(metadata?.description, "Reusable custom widget"),
    summary:
      normalizeText(metadata?.summary, "") ||
      (widgetCount > 0 ? `${widgetCount} nested widgets` : "Reusable custom widget composition"),
    status: metadata?.status === "archived" ? "archived" : "ready",
    sourceComponentKey: "custom-composition",
    templateMode: "composition",
    templateInstance: null,
    composition
  };
}

function CustomWidgetTile({ item, onEdit, onDuplicate }) {
  return (
    <Card variant="outlined" square sx={{ height: "100%" }}>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
            <Chip size="small" color="primary" label={item.title} />
            <Chip size="small" variant="outlined" label={item.status === "archived" ? "Archived" : "Ready"} />
            <Chip size="small" variant="outlined" label={item.categoryKey || "Custom"} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {item.summary || item.description || "Reusable custom widget composition"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Key: {item.widgetKey}
          </Typography>
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 1.5 }}>
        <Button size="small" variant="contained" onClick={() => onEdit(item.id)}>
          Edit
        </Button>
        <Button size="small" variant="outlined" onClick={() => onDuplicate(item)}>
          Duplicate
        </Button>
      </CardActions>
    </Card>
  );
}

function StarterTile({ preset, onChoose }) {
  return (
    <Card variant="outlined" square sx={{ height: "100%" }}>
      <CardContent>
        <Stack spacing={1}>
          <Chip size="small" color="primary" label={preset.title} sx={{ width: "fit-content" }} />
          <Typography variant="body2" color="text.secondary">
            {preset.description}
          </Typography>
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 1.5 }}>
        <Button size="small" variant="contained" onClick={() => onChoose(preset.key)}>
          Start From This
        </Button>
      </CardActions>
    </Card>
  );
}

function EditorToolbar({
  metadata,
  onPatchMetadata,
  onSave,
  onSaveAsNew,
  onDelete,
  saving = false,
  deleting = false,
  saveMessage = "",
  saveError = false,
  onBack,
  onOpenPages = null,
  mode,
  onChangeMode,
  sidePanelOpen,
  onToggleSidePanel
}) {
  return (
    <Paper square variant="outlined" sx={{ borderBottom: 1, borderColor: "divider", p: 1 }}>
      <Stack spacing={1}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                CUSTOM WIDGET STUDIO
              </Typography>
              <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                {metadata.title || "Untitled Custom Widget"}
              </Typography>
              <Chip size="small" color="primary" label={PAGE_STUDIO_MODE_LABELS[mode]} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Reusable composition authoring backed directly by the custom widget collection.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {typeof onOpenPages === "function" ? (
              <Button size="small" variant="outlined" onClick={onOpenPages}>
                Page Studio
              </Button>
            ) : null}
            <Button size="small" variant="outlined" onClick={onBack}>
              Back To Library
            </Button>
            <Button size="small" variant="outlined" onClick={onToggleSidePanel}>
              {sidePanelOpen ? "Hide Panel" : "Show Panel"}
            </Button>
            <Button size="small" variant="outlined" onClick={onSaveAsNew} disabled={saving || deleting}>
              Save As New
            </Button>
            <Button size="small" variant="contained" onClick={onSave} disabled={saving || deleting}>
              {saving ? "Saving..." : "Save"}
            </Button>
            {metadata.id ? (
              <Button size="small" color="error" variant="text" onClick={onDelete} disabled={saving || deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            ) : null}
          </Stack>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField
            size="small"
            label="Title"
            value={metadata.title}
            onChange={(event) => onPatchMetadata({ title: event.target.value })}
            fullWidth
          />
          <TextField
            size="small"
            label="Widget Key"
            value={metadata.widgetKey}
            onChange={(event) => onPatchMetadata({ widgetKey: slugify(event.target.value) })}
            fullWidth
          />
          <TextField
            size="small"
            label="Category"
            value={metadata.categoryKey}
            onChange={(event) => onPatchMetadata({ categoryKey: event.target.value })}
            sx={{ minWidth: { md: 200 } }}
          />
          <TextField
            size="small"
            label="Icon"
            value={metadata.iconKey}
            onChange={(event) => onPatchMetadata({ iconKey: event.target.value })}
            sx={{ minWidth: { md: 180 } }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={metadata.status}
            onChange={(event) => onPatchMetadata({ status: event.target.value })}
            sx={{ minWidth: { md: 160 } }}
          >
            <MenuItem value="ready">Ready</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </TextField>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField
            size="small"
            label="Description"
            value={metadata.description}
            onChange={(event) => onPatchMetadata({ description: event.target.value })}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            size="small"
            label="Summary"
            value={metadata.summary}
            onChange={(event) => onPatchMetadata({ summary: event.target.value })}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
        {saveMessage ? <Alert severity={saveError ? "warning" : "success"}>{saveMessage}</Alert> : null}
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {["layout", "widgets", "preview"].map((entry) => (
            <Button
              key={entry}
              size="small"
              variant={mode === entry ? "contained" : "outlined"}
              onClick={() => onChangeMode(entry)}
            >
              {PAGE_STUDIO_MODE_LABELS[entry]}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

function useCustomWidgetItems() {
  const [state, setState] = useState({
    loading: true,
    errorMessage: "",
    items: []
  });
  const reloadRef = useRef(async () => {});

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
          errorMessage: "",
          items: Array.isArray(payload?.items) ? payload.items.filter((item) => item?.templateMode === "composition") : []
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

    reloadRef.current = load;
    void load();
    return () => {
      active = false;
    };
  }, []);

  return {
    ...state,
    reload: async () => {
      await reloadRef.current?.();
    }
  };
}

function createDuplicateMetadata(item) {
  return {
    ...createWidgetMetadataFromItem(item),
    id: null,
    title: `${normalizeText(item?.title, "Custom Widget")} Copy`,
    widgetKey: `${slugify(item?.widgetKey || item?.title, "custom-widget")}-copy`
  };
}

export function PageStudioCustomWidgetsWorkspace({
  route = {},
  onPatchRouteState = null,
  onOpenPages = null
}) {
  const itemsState = useCustomWidgetItems();
  const [mode, setMode] = useState(() => normalizePageStudioMode(route?.studioMode, "layout"));
  const [activeWidgetId, setActiveWidgetId] = useState(() => normalizeText(route?.customWidgetId, ""));
  const [studioDocument, setStudioDocument] = useState(() => buildCustomWidgetStudioDraft());
  const [metadata, setMetadata] = useState(() => createWidgetMetadataFromItem(null));
  const [canvasState, setCanvasState] = useState(() => createInitialCanvasState("desktop"));
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createPresetKey, setCreatePresetKey] = useState(CUSTOM_WIDGET_STARTER_PRESETS[0]?.key ?? "blank-composition");
  const [createContextKey, setCreateContextKey] = useState(CUSTOM_WIDGET_CONTEXT_PRESETS[0]?.key ?? "post-detail");
  const [saveState, setSaveState] = useState({
    saving: false,
    deleting: false,
    error: false,
    message: ""
  });
  const previewResources = usePageStudioPreviewResources(studioDocument, { eager: true });
  const activeItem = useMemo(
    () => itemsState.items.find((item) => item.id === activeWidgetId) ?? null,
    [activeWidgetId, itemsState.items]
  );
  const loadedRef = useRef("");

  const updateRouteState = useCallback(
    (patch = {}) => {
      if (typeof onPatchRouteState === "function") {
        onPatchRouteState(patch);
      }
    },
    [onPatchRouteState]
  );

  useEffect(() => {
    const routeMode = normalizePageStudioMode(route?.studioMode, "layout");
    if (routeMode === "infra") {
      return;
    }
    setMode(routeMode);
  }, [route?.studioMode]);

  useEffect(() => {
    const routeWidgetId = normalizeText(route?.customWidgetId, "");
    setActiveWidgetId(routeWidgetId);
  }, [route?.customWidgetId]);

  useEffect(() => {
    if (!activeItem) {
      return;
    }
    const loadSignature = `${activeItem.id}:${activeItem.updatedOn ?? ""}`;
    if (loadedRef.current === loadSignature) {
      return;
    }
    loadedRef.current = loadSignature;
    const nextDocument = buildStudioDocumentFromCustomWidget(activeItem);
    setStudioDocument(nextDocument);
    setMetadata(createWidgetMetadataFromItem(activeItem));
    setCanvasState(createInitialCanvasState(nextDocument.layout?.activeBreakpoint ?? "desktop"));
    setSelectedBlockId(nextDocument.widgets?.blocks?.[0]?.id ?? null);
  }, [activeItem]);

  const patchStudioDocument = useCallback((updater) => {
    setStudioDocument((previous) => {
      const nextValue = typeof updater === "function" ? updater(previous) : updater;
      return nextValue;
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

  useEffect(() => {
    const blocks = Array.isArray(studioDocument?.widgets?.blocks) ? studioDocument.widgets.blocks : [];
    if (!selectedBlockId || !blocks.some((block) => block.id === selectedBlockId)) {
      setSelectedBlockId(blocks[0]?.id ?? null);
    }
  }, [selectedBlockId, studioDocument]);

  function openStarterDialog() {
    setCreateDialogOpen(true);
  }

  function startFromPreset(starterKey = "blank-composition", contextPresetKey = "post-detail") {
    const nextDocument = buildCustomWidgetStudioDraft({
      starterKey,
      contextPresetKey
    });
    const nextTitle =
      starterKey === "media-title-cta"
        ? "Media Title CTA Widget"
        : "Untitled Custom Widget";
    loadedRef.current = "";
    setActiveWidgetId("");
    setMetadata({
      id: null,
      title: nextTitle,
      widgetKey: slugify(nextTitle),
      iconKey: "view_quilt",
      categoryKey: "Custom",
      description:
        starterKey === "media-title-cta"
          ? "Reusable editorial promo composition with image, title, and button."
          : "Reusable custom widget composition.",
      summary:
        starterKey === "media-title-cta"
          ? "3 nested widgets"
          : "Blank reusable widget composition",
      status: "ready"
    });
    setStudioDocument(nextDocument);
    setCanvasState(createInitialCanvasState(nextDocument.layout?.activeBreakpoint ?? "desktop"));
    setSelectedBlockId(nextDocument.widgets?.blocks?.[0]?.id ?? null);
    setMode("layout");
    setSaveState({
      saving: false,
      deleting: false,
      error: false,
      message: ""
    });
    updateRouteState({
      studioMode: "layout",
      customWidgetId: null
    });
  }

  function openExistingWidget(itemId) {
    setActiveWidgetId(itemId);
    setMode("layout");
    updateRouteState({
      studioMode: "layout",
      customWidgetId: itemId
    });
  }

  function handleDuplicate(item) {
    const nextDocument = buildStudioDocumentFromCustomWidget(item);
    loadedRef.current = "";
    setActiveWidgetId("");
    setMetadata(createDuplicateMetadata(item));
    setStudioDocument(nextDocument);
    setCanvasState(createInitialCanvasState(nextDocument.layout?.activeBreakpoint ?? "desktop"));
    setSelectedBlockId(nextDocument.widgets?.blocks?.[0]?.id ?? null);
    setMode("layout");
    setSaveState({
      saving: false,
      deleting: false,
      error: false,
      message: ""
    });
    updateRouteState({
      studioMode: "layout",
      customWidgetId: null
    });
  }

  async function handleSave({ forceCreate = false } = {}) {
    setSaveState({
      saving: true,
      deleting: false,
      error: false,
      message: ""
    });
    try {
      const payload = createWidgetPayload(metadata, studioDocument);
      let result = null;
      if (!forceCreate && metadata.id) {
        result = await updateReferenceCollectionItem({
          collectionId: CUSTOM_WIDGETS_COLLECTION_ID,
          itemId: metadata.id,
          item: payload
        });
      } else {
        result = await createReferenceCollectionItem({
          collectionId: CUSTOM_WIDGETS_COLLECTION_ID,
          item: payload
        });
      }
      if (result?.ok !== true || !result?.item) {
        throw new Error(result?.error?.message ?? "Failed to save custom widget");
      }
      await itemsState.reload();
      const savedItem = result.item;
      loadedRef.current = "";
      setActiveWidgetId(savedItem.id);
      setMetadata(createWidgetMetadataFromItem(savedItem));
      setStudioDocument(buildStudioDocumentFromCustomWidget(savedItem));
      setSaveState({
        saving: false,
        deleting: false,
        error: false,
        message: `Saved '${savedItem.title}'.`
      });
      updateRouteState({
        studioMode: mode,
        customWidgetId: savedItem.id
      });
    } catch (error) {
      setSaveState({
        saving: false,
        deleting: false,
        error: true,
        message: error?.message ?? "Failed to save custom widget"
      });
    }
  }

  async function handleDelete() {
    if (!metadata.id) {
      return;
    }
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(`Delete custom widget '${metadata.title}'?`);
    if (!confirmed) {
      return;
    }
    setSaveState({
      saving: false,
      deleting: true,
      error: false,
      message: ""
    });
    try {
      const result = await deleteReferenceCollectionItem({
        collectionId: CUSTOM_WIDGETS_COLLECTION_ID,
        itemId: metadata.id
      });
      if (result?.ok !== true) {
        throw new Error(result?.error?.message ?? "Failed to delete custom widget");
      }
      await itemsState.reload();
      loadedRef.current = "";
      setActiveWidgetId("");
      setMetadata(createWidgetMetadataFromItem(null));
      setStudioDocument(buildCustomWidgetStudioDraft());
      setCanvasState(createInitialCanvasState("desktop"));
      setSelectedBlockId(null);
      setSaveState({
        saving: false,
        deleting: false,
        error: false,
        message: "Custom widget deleted."
      });
      updateRouteState({
        studioMode: "layout",
        customWidgetId: null
      });
    } catch (error) {
      setSaveState({
        saving: false,
        deleting: false,
        error: true,
        message: error?.message ?? "Failed to delete custom widget"
      });
    }
  }

  const inEditor = Boolean(activeWidgetId) || Boolean(metadata?.title && metadata.title !== "Untitled Custom Widget");
  const effectiveMode = normalizePageStudioMode(mode, "layout") === "infra" ? "layout" : normalizePageStudioMode(mode, "layout");

  function renderEditorSurface() {
    if (effectiveMode === "layout") {
      return (
        <PageStudioLayoutMode
          studioDocument={studioDocument}
          onPatchDocument={patchStudioDocument}
          active
          canvasState={canvasState}
          onPatchCanvasState={patchCanvasState}
          selectedBlockId={selectedBlockId}
          onSelectBlockId={setSelectedBlockId}
          railOpen={sidePanelOpen}
        />
      );
    }
    if (effectiveMode === "widgets") {
      return (
        <PageStudioWidgetsMode
          studioDocument={studioDocument}
          onPatchDocument={patchStudioDocument}
          active
          canvasState={canvasState}
          onPatchCanvasState={patchCanvasState}
          selectedBlockId={selectedBlockId}
          onSelectBlockId={setSelectedBlockId}
          railOpen={sidePanelOpen}
          previewResources={previewResources}
        />
      );
    }
    return (
      <PageStudioPreviewMode
        studioDocument={studioDocument}
        onPatchDocument={patchStudioDocument}
        active
        canvasState={canvasState}
        onPatchCanvasState={patchCanvasState}
        railOpen={sidePanelOpen}
        previewResources={previewResources}
      />
    );
  }

  if (!inEditor) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: "grey.100" }}>
        <Paper square variant="outlined" sx={{ borderBottom: 1, borderColor: "divider", p: 1.25 }}>
          <Stack spacing={1}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={1} justifyContent="space-between" alignItems={{ lg: "center" }}>
              <Stack spacing={0.35}>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                  <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                    CUSTOM WIDGET STUDIO
                  </Typography>
                  <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                    Reusable compositions
                  </Typography>
                  <Chip size="small" color="primary" label={`${itemsState.items.length} saved`} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Create reusable composed widgets directly, save them to the database, and reuse them from Page Studio and Layouts.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {typeof onOpenPages === "function" ? (
                  <Button size="small" variant="outlined" onClick={onOpenPages}>
                    Page Studio
                  </Button>
                ) : null}
                <Button size="small" variant="contained" onClick={openStarterDialog}>
                  New Custom Widget
                </Button>
              </Stack>
            </Stack>
            {saveState.message ? <Alert severity={saveState.error ? "warning" : "success"}>{saveState.message}</Alert> : null}
            {itemsState.errorMessage ? <Alert severity="warning">{itemsState.errorMessage}</Alert> : null}
          </Stack>
        </Paper>
        <Box sx={{ p: 1.25, display: "grid", gap: 1.25 }}>
          <Paper variant="outlined" square sx={{ p: 1.25 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Start from a preset</Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))"
                  }
                }}
              >
                {CUSTOM_WIDGET_STARTER_PRESETS.map((preset) => (
                  <StarterTile key={preset.key} preset={preset} onChoose={(starterKey) => {
                    setCreatePresetKey(starterKey);
                    setCreateDialogOpen(true);
                  }} />
                ))}
              </Box>
            </Stack>
          </Paper>
          <Paper variant="outlined" square sx={{ p: 1.25 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Saved custom widgets</Typography>
              {itemsState.loading ? (
                <Typography variant="body2" color="text.secondary">
                  Loading custom widgets…
                </Typography>
              ) : itemsState.items.length > 0 ? (
                <Box
                  sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                      xl: "repeat(3, minmax(0, 1fr))"
                    }
                  }}
                >
                  {itemsState.items.map((item) => (
                    <CustomWidgetTile
                      key={item.id}
                      item={item}
                      onEdit={openExistingWidget}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </Box>
              ) : (
                <Alert severity="info">No composed custom widgets are saved yet.</Alert>
              )}
            </Stack>
          </Paper>
        </Box>
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>New Custom Widget</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <TextField
                select
                size="small"
                label="Starter"
                value={createPresetKey}
                onChange={(event) => setCreatePresetKey(event.target.value)}
              >
                {CUSTOM_WIDGET_STARTER_PRESETS.map((preset) => (
                  <MenuItem key={preset.key} value={preset.key}>
                    {preset.title}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Context preset"
                value={createContextKey}
                onChange={(event) => setCreateContextKey(event.target.value)}
              >
                {CUSTOM_WIDGET_CONTEXT_PRESETS.map((preset) => (
                  <MenuItem key={preset.key} value={preset.key}>
                    {preset.title}
                  </MenuItem>
                ))}
              </TextField>
              <Alert severity="info">
                The chosen context preset controls which `context.*` bindings are available in Widgets and Preview.
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                setCreateDialogOpen(false);
                startFromPreset(createPresetKey, createContextKey);
              }}
            >
              Start Editing
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", height: "100dvh", display: "flex", flexDirection: "column", bgcolor: "grey.100", overflow: "hidden" }}>
      <EditorToolbar
        metadata={metadata}
        onPatchMetadata={(patch) => setMetadata((previous) => ({ ...previous, ...patch }))}
        onSave={() => void handleSave()}
        onSaveAsNew={() => void handleSave({ forceCreate: true })}
        onDelete={() => void handleDelete()}
        saving={saveState.saving}
        deleting={saveState.deleting}
        saveMessage={saveState.message}
        saveError={saveState.error}
        onBack={() => {
          setActiveWidgetId("");
          setMetadata(createWidgetMetadataFromItem(null));
          setStudioDocument(buildCustomWidgetStudioDraft());
          setSelectedBlockId(null);
          setMode("layout");
          updateRouteState({
            studioMode: "layout",
            customWidgetId: null
          });
        }}
        mode={effectiveMode}
        onOpenPages={onOpenPages}
        onChangeMode={(nextMode) => {
          const normalized = normalizePageStudioMode(nextMode, "layout");
          setMode(normalized === "infra" ? "layout" : normalized);
          updateRouteState({
            studioMode: normalized === "infra" ? "layout" : normalized,
            customWidgetId: metadata.id ?? null
          });
        }}
        sidePanelOpen={sidePanelOpen}
        onToggleSidePanel={() => setSidePanelOpen((current) => !current)}
      />
      <Paper
        variant="outlined"
        square
        sx={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          borderRadius: 0,
          background: "linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)"
        }}
      >
        <Box sx={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          {renderEditorSurface()}
        </Box>
      </Paper>
    </Box>
  );
}
