import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import "./page-studio-layout-mode.css";
import { LayoutBuilderCanvasShell } from "../../test-modules-layouts/frontend/LayoutBuilderCanvasShell.jsx";
import {
  clampViewportHeight,
  clampViewportWidth,
  clampZoomLevel,
  DEFAULT_VIEWPORT,
  DEFAULT_ZOOM_LEVEL,
  VIEWPORT_PRESETS
} from "../../test-modules-layouts/frontend/layout-builder-viewport.js";
import { PAGE_STUDIO_BREAKPOINT_LABELS } from "../shared/page-studio-breakpoints.mjs";
import { allocateNextBlockId } from "../shared/page-studio-block-ids.mjs";
import {
  buildPageStudioExplicitGridItems,
  createPageStudioDefaultGridItem,
  removePageStudioBlockFromEditorGrid,
  sortPageStudioGridItems
} from "../shared/page-studio-layout-editing.mjs";
import {
  buildPageStudioScenarioSeed,
  PAGE_STUDIO_LAYOUT_SCENARIOS
} from "../shared/page-studio-layout-scenarios.mjs";
import { buildPageStudioScenarioWidgetSeed } from "../shared/page-studio-widget-seeds.mjs";
import {
  buildPageStudioRuntimeLayoutContract,
  materializePageStudioBreakpoints
} from "../shared/page-studio-layout-transform.mjs";

const BREAKPOINT_VIEWPORT_PRESET_ID = Object.freeze({
  desktop: "desktop",
  tablet: "tablet",
  mobile: "mobile"
});

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

function createBlockTone(sequence) {
  return BLOCK_TONES[sequence % BLOCK_TONES.length];
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

function buildSelectedGeometryLabel(selectedItem = null) {
  if (!selectedItem) {
    return null;
  }
  return `${selectedItem.w} cols x ${selectedItem.h} rows at ${selectedItem.x},${selectedItem.y}`;
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

function buildScenarioDocumentPatch(previous, scenarioKey) {
  const seed = buildPageStudioScenarioSeed(scenarioKey);
  if (!seed) {
    return previous;
  }

  return {
    ...previous,
    widgets: {
      ...previous.widgets,
      blocks: buildPageStudioScenarioWidgetSeed(seed.scenarioKey, seed.blocks)
    },
    layout: {
      ...previous.layout,
      scenarioKey: seed.scenarioKey,
      activeBreakpoint: "desktop",
      editorGrid: {
        ...previous.layout.editorGrid,
        desktop: {
          ...previous.layout.editorGrid.desktop,
          items: seed.editorGrid.desktop
        },
        tablet: {
          ...previous.layout.editorGrid.tablet,
          items: seed.editorGrid.tablet
        },
        mobile: {
          ...previous.layout.editorGrid.mobile,
          items: seed.editorGrid.mobile
        }
      }
    }
  };
}

function toGridWidgetMarkup(block = {}, item = {}, breakpointLabel = "") {
  const tone = normalizeText(block.tone, "#2563eb");
  const summary = normalizeText(block.summary, "Unassigned block");
  const geometry = `${item.w} x ${item.h} at ${item.x},${item.y}`;
  return `
    <div class="page-studio-grid-item-shell" data-block-id="${block.id}" style="background-image: linear-gradient(180deg, ${tone}1a, rgba(255,255,255,0.94)); border-color: ${tone};">
      <div>
        <div class="page-studio-grid-item-kicker">${breakpointLabel}</div>
        <div class="page-studio-grid-item-id">${block.id}</div>
        <div class="page-studio-grid-item-meta">${summary}</div>
      </div>
      <div class="page-studio-grid-item-meta">${geometry}</div>
    </div>
  `;
}

function extractGridItems(grid) {
  return sortPageStudioGridItems(
    (grid?.engine?.nodes ?? []).map((node) => ({
      blockId: normalizeText(node.id ?? node.el?.getAttribute("gs-id"), ""),
      x: node.x ?? 0,
      y: node.y ?? 0,
      w: node.w ?? 12,
      h: node.h ?? 3,
      minW: node.minW ?? 1,
      minH: node.minH ?? 1
    }))
  );
}

function syncGridWidgets({ grid, visibleItems, blocksById, breakpointLabel }) {
  const gridElement = grid.el;
  grid.batchUpdate();
  grid.removeAll(false, false);
  gridElement.replaceChildren();
  visibleItems.forEach((item) => {
    const block = blocksById.get(item.blockId) ?? {
      id: item.blockId,
      tone: "#2563eb",
      summary: "Block"
    };
    const widgetElement = grid.addWidget({
      id: item.blockId,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH,
      content: ""
    });
    const contentElement = widgetElement.querySelector(".grid-stack-item-content");
    if (contentElement) {
      contentElement.innerHTML = toGridWidgetMarkup(block, item, breakpointLabel);
    }
  });
  grid.batchUpdate(false);
}

function SelectedBlockSummary({ selectedBlockId, selectedGeometryLabel, runtimeItemCount }) {
  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
      <Chip size="small" color={selectedBlockId ? "primary" : "default"} label={selectedBlockId ? `Selected ${selectedBlockId}` : "No block selected"} />
      {selectedGeometryLabel ? <Chip size="small" variant="outlined" label={selectedGeometryLabel} /> : null}
      <Chip size="small" variant="outlined" label={`${runtimeItemCount} runtime blocks`} />
    </Stack>
  );
}

export function PageStudioLayoutMode({ studioDocument, onPatchDocument }) {
  const activeBreakpoint = studioDocument.layout.activeBreakpoint;
  const materializedBreakpoints = useMemo(
    () => materializePageStudioBreakpoints(studioDocument.layout.editorGrid),
    [studioDocument.layout.editorGrid]
  );
  const runtimeLayoutContract = useMemo(
    () =>
      buildPageStudioRuntimeLayoutContract({
        editorGrid: studioDocument.layout.editorGrid,
        runtimeLayoutMetadata: studioDocument.layout.runtimeLayoutMetadata
      }),
    [studioDocument.layout.editorGrid, studioDocument.layout.runtimeLayoutMetadata]
  );
  const visibleItems = materializedBreakpoints[activeBreakpoint]?.items ?? [];
  const blocksById = useMemo(
    () => new Map(studioDocument.widgets.blocks.map((block) => [block.id, block])),
    [studioDocument.widgets.blocks]
  );
  const [selectedBlockId, setSelectedBlockId] = useState(visibleItems[0]?.blockId ?? null);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState(
    studioDocument.layout.scenarioKey || PAGE_STUDIO_LAYOUT_SCENARIOS[0]?.key || "story-stack"
  );
  const [viewport, setViewport] = useState(() => buildViewportFromBreakpoint(activeBreakpoint));
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);
  const [zoomMode, setZoomMode] = useState("auto");
  const [shellBounds, setShellBounds] = useState({ width: 0, height: 0 });
  const shellHostRef = useRef(null);
  const gridRootRef = useRef(null);
  const gridRef = useRef(null);
  const syncingGridRef = useRef(false);
  const interactionInProgressRef = useRef(false);
  const visibleItemsSignature = useMemo(() => JSON.stringify(visibleItems), [visibleItems]);
  const selectedItem = visibleItems.find((item) => item.blockId === selectedBlockId) ?? null;
  const selectedBlock = studioDocument.widgets.blocks.find((block) => block.id === selectedBlockId) ?? null;
  const runtimeBreakpoint = runtimeLayoutContract.breakpoints[activeBreakpoint];
  const effectiveZoomLevel = zoomMode === "auto"
    ? computeAutoFitZoomLevel({ viewport, shellBounds })
    : zoomLevel;
  const zoomLabel = zoomMode === "auto"
    ? `Zoom ${effectiveZoomLevel}% · Fit`
    : `Zoom ${effectiveZoomLevel}%`;
  const selectedScenario =
    PAGE_STUDIO_LAYOUT_SCENARIOS.find((scenario) => scenario.key === selectedScenarioKey) ??
    PAGE_STUDIO_LAYOUT_SCENARIOS[0] ??
    null;

  useEffect(() => {
    setSelectedScenarioKey(
      studioDocument.layout.scenarioKey || PAGE_STUDIO_LAYOUT_SCENARIOS[0]?.key || "story-stack"
    );
  }, [studioDocument.layout.scenarioKey]);

  const handleCommitVisibleItems = useCallback(
    (nextVisibleItems) => {
      onPatchDocument((previous) => {
        const explicitItems = buildPageStudioExplicitGridItems({
          breakpoint: previous.layout.activeBreakpoint,
          visibleItems: nextVisibleItems,
          editorGrid: previous.layout.editorGrid
        });
        return {
          ...previous,
          layout: {
            ...previous.layout,
            editorGrid: {
              ...previous.layout.editorGrid,
              [previous.layout.activeBreakpoint]: {
                ...previous.layout.editorGrid[previous.layout.activeBreakpoint],
                items: explicitItems
              }
            }
          }
        };
      });
    },
    [onPatchDocument]
  );

  const handleAddBlock = useCallback(() => {
    onPatchDocument((previous) => {
      const nextBlockId = allocateNextBlockId(previous.widgets.blocks);
      const nextBlock = {
        id: nextBlockId,
        tone: createBlockTone(previous.widgets.blocks.length),
        summary: `Block ${nextBlockId}`,
        widgetKey: null,
        componentInstance: null,
        themeOverrideMode: "inherit"
      };
      const nextDesktopItems = sortPageStudioGridItems([
        ...previous.layout.editorGrid.desktop.items,
        createPageStudioDefaultGridItem({
          blockId: nextBlockId,
          existingItems: materializePageStudioBreakpoints(previous.layout.editorGrid).desktop.items
        })
      ]);
      return {
        ...previous,
        widgets: {
          ...previous.widgets,
          blocks: [...previous.widgets.blocks, nextBlock]
        },
        layout: {
          ...previous.layout,
          editorGrid: {
            ...previous.layout.editorGrid,
            desktop: {
              ...previous.layout.editorGrid.desktop,
              items: nextDesktopItems
            }
          }
        }
      };
    });
  }, [onPatchDocument]);

  const handleApplyScenario = useCallback(
    (scenarioKey) => {
      onPatchDocument((previous) => buildScenarioDocumentPatch(previous, scenarioKey));
      const scenarioSeed = buildPageStudioScenarioSeed(scenarioKey);
      setSelectedBlockId(scenarioSeed?.blocks[0]?.id ?? null);
    },
    [onPatchDocument]
  );

  const handleRemoveSelectedBlock = useCallback(() => {
    if (!selectedBlockId) {
      return;
    }
    onPatchDocument((previous) => ({
      ...previous,
      widgets: {
        ...previous.widgets,
        blocks: previous.widgets.blocks.filter((block) => block.id !== selectedBlockId)
      },
      layout: {
        ...previous.layout,
        editorGrid: removePageStudioBlockFromEditorGrid(previous.layout.editorGrid, selectedBlockId)
      }
    }));
    setSelectedBlockId(null);
  }, [onPatchDocument, selectedBlockId]);

  const handleResetCurrentBreakpoint = useCallback(() => {
    if (activeBreakpoint === "desktop") {
      return;
    }
    onPatchDocument((previous) => ({
      ...previous,
      layout: {
        ...previous.layout,
        editorGrid: {
          ...previous.layout.editorGrid,
          [activeBreakpoint]: {
            ...previous.layout.editorGrid[activeBreakpoint],
            items: []
          }
        }
      }
    }));
  }, [activeBreakpoint, onPatchDocument]);

  const handleRenameSelectedBlock = useCallback(
    (summary) => {
      if (!selectedBlockId) {
        return;
      }
      onPatchDocument((previous) => ({
        ...previous,
        widgets: {
          ...previous.widgets,
          blocks: previous.widgets.blocks.map((block) =>
            block.id === selectedBlockId ? { ...block, summary } : block
          )
        }
      }));
    },
    [onPatchDocument, selectedBlockId]
  );

  useEffect(() => {
    setViewport(buildViewportFromBreakpoint(activeBreakpoint));
    setZoomMode("auto");
  }, [activeBreakpoint]);

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
    if (!selectedBlockId || !visibleItems.some((item) => item.blockId === selectedBlockId)) {
      setSelectedBlockId(visibleItems[0]?.blockId ?? null);
    }
  }, [selectedBlockId, visibleItems]);

  useEffect(() => {
    if (!gridRootRef.current) {
      return undefined;
    }

    if (gridRootRef.current.gridstack) {
      const existingGridElement = gridRootRef.current;
      gridRootRef.current.gridstack.destroy(false);
      existingGridElement.replaceChildren();
    }

    const grid = GridStack.init(
      {
        animate: true,
        column: 12,
        float: false,
        margin: 12,
        cellHeight: studioDocument.layout.editorGrid[activeBreakpoint].rowHeight,
        disableOneColumnMode: true
      },
      gridRootRef.current
    );
    gridRef.current = grid;

    const handleClick = (event) => {
      const itemElement = event.target.closest(".grid-stack-item");
      if (!itemElement) {
        return;
      }
      setSelectedBlockId(normalizeText(itemElement.getAttribute("gs-id"), null));
    };

    const handleInteractionStart = () => {
      interactionInProgressRef.current = true;
    };

    const handleInteractionStop = () => {
      interactionInProgressRef.current = false;
      handleCommitVisibleItems(extractGridItems(grid));
    };

    grid.el.addEventListener("click", handleClick);
    grid.on("dragstart", handleInteractionStart);
    grid.on("resizestart", handleInteractionStart);
    grid.on("dragstop", handleInteractionStop);
    grid.on("resizestop", handleInteractionStop);

    return () => {
      const gridElement = grid.el;
      grid.off("dragstart");
      grid.off("resizestart");
      grid.off("dragstop");
      grid.off("resizestop");
      gridElement?.removeEventListener("click", handleClick);
      grid.destroy(false);
      gridElement?.replaceChildren();
      gridRef.current = null;
    };
  }, [activeBreakpoint, handleCommitVisibleItems, studioDocument.layout.editorGrid[activeBreakpoint].rowHeight]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || interactionInProgressRef.current) {
      return;
    }

    syncingGridRef.current = true;
    grid.cellHeight(studioDocument.layout.editorGrid[activeBreakpoint].rowHeight);
    syncGridWidgets({
      grid,
      visibleItems,
      blocksById,
      breakpointLabel: PAGE_STUDIO_BREAKPOINT_LABELS[activeBreakpoint]
    });
    syncingGridRef.current = false;
  }, [
    activeBreakpoint,
    blocksById,
    studioDocument.layout.editorGrid,
    visibleItems,
    visibleItemsSignature
  ]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }
    const itemElements = grid.el.querySelectorAll(".page-studio-grid-item-shell");
    itemElements.forEach((element) => {
      const blockId = element.getAttribute("data-block-id");
      element.classList.toggle("is-selected", blockId === selectedBlockId);
    });
  }, [selectedBlockId]);

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
        >
          <Box sx={{ height: "100%", minHeight: "100%", bgcolor: "#f8fafc", p: 1.25 }}>
            <Box
              ref={gridRootRef}
              className="grid-stack page-studio-grid-stack"
              sx={{
                minHeight: `${Math.max(480, viewport.height - 24)}px`,
                backgroundColor: "rgba(255,255,255,0.96)",
                borderRadius: 0
              }}
            />
          </Box>
        </LayoutBuilderCanvasShell>
      </Box>
      <Paper variant="outlined" square sx={{ p: 1, minHeight: 0, overflow: "auto" }}>
        <Stack spacing={1}>
          <RailSection
            title="Layout Controls"
            description="Pick a breakpoint, move blocks on the canvas, and keep overrides scoped to the active screen size."
          >
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
            <SelectedBlockSummary
              selectedBlockId={selectedBlockId}
              selectedGeometryLabel={buildSelectedGeometryLabel(selectedItem)}
              runtimeItemCount={runtimeBreakpoint.items.length}
            />
            <TextField
              label="Selected Block Label"
              size="small"
              value={selectedBlock?.summary ?? ""}
              onChange={(event) => handleRenameSelectedBlock(event.target.value)}
              disabled={!selectedBlock}
            />
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              <Button size="small" variant="contained" onClick={handleAddBlock}>
                Add Block
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={activeBreakpoint === "desktop"}
                onClick={handleResetCurrentBreakpoint}
              >
                Reset {PAGE_STUDIO_BREAKPOINT_LABELS[activeBreakpoint]}
              </Button>
              <Button size="small" variant="outlined" color="warning" disabled={!selectedBlockId} onClick={handleRemoveSelectedBlock}>
                Remove Selected
              </Button>
            </Stack>
          </RailSection>

          <RailSection
            title={selectedScenario?.label ?? "Scenario"}
            description={selectedScenario?.description ?? ""}
          >
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
              {PAGE_STUDIO_LAYOUT_SCENARIOS.map((scenario) => (
                <Chip
                  key={scenario.key}
                  size="small"
                  clickable
                  color={scenario.key === selectedScenarioKey ? "primary" : "default"}
                  variant={scenario.key === selectedScenarioKey ? "filled" : "outlined"}
                  label={scenario.label}
                  onClick={() => setSelectedScenarioKey(scenario.key)}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
              {selectedScenario?.blocks.map((block) => (
                <Chip key={block.id} size="small" variant="outlined" label={block.summary} />
              )) ?? null}
            </Stack>
            <Button size="small" variant="contained" onClick={() => handleApplyScenario(selectedScenario.key)}>
              Apply Scenario
            </Button>
          </RailSection>

          <RailSection
            title="Runtime Geometry"
            description="This is the MUI-side layout contract the builder is targeting."
          >
            <Stack direction="row" spacing={0.75}>
              <TextField
                label="Canvas"
                size="small"
                type="number"
                value={studioDocument.layout.runtimeLayoutMetadata.canvasMaxWidth[activeBreakpoint]}
                onChange={(event) =>
                  onPatchDocument((previous) => ({
                    ...previous,
                    layout: {
                      ...previous.layout,
                      runtimeLayoutMetadata: {
                        ...previous.layout.runtimeLayoutMetadata,
                        canvasMaxWidth: {
                          ...previous.layout.runtimeLayoutMetadata.canvasMaxWidth,
                          [activeBreakpoint]: Number(event.target.value) || runtimeBreakpoint.canvasMaxWidth
                        }
                      }
                    }
                  }))
                }
              />
              <TextField
                label="Gap"
                size="small"
                type="number"
                value={studioDocument.layout.runtimeLayoutMetadata.gap[activeBreakpoint]}
                onChange={(event) =>
                  onPatchDocument((previous) => ({
                    ...previous,
                    layout: {
                      ...previous.layout,
                      runtimeLayoutMetadata: {
                        ...previous.layout.runtimeLayoutMetadata,
                        gap: {
                          ...previous.layout.runtimeLayoutMetadata.gap,
                          [activeBreakpoint]: Number(event.target.value) || runtimeBreakpoint.gap
                        }
                      }
                    }
                  }))
                }
              />
            </Stack>
            <Stack direction="row" spacing={0.75}>
              <TextField
                label="Padding"
                size="small"
                type="number"
                value={studioDocument.layout.runtimeLayoutMetadata.padding[activeBreakpoint]}
                onChange={(event) =>
                  onPatchDocument((previous) => ({
                    ...previous,
                    layout: {
                      ...previous.layout,
                      runtimeLayoutMetadata: {
                        ...previous.layout.runtimeLayoutMetadata,
                        padding: {
                          ...previous.layout.runtimeLayoutMetadata.padding,
                          [activeBreakpoint]: Number(event.target.value) || runtimeBreakpoint.padding
                        }
                      }
                    }
                  }))
                }
              />
              <TextField
                label="Row Height"
                size="small"
                type="number"
                value={studioDocument.layout.editorGrid[activeBreakpoint].rowHeight}
                onChange={(event) =>
                  onPatchDocument((previous) => ({
                    ...previous,
                    layout: {
                      ...previous.layout,
                      editorGrid: {
                        ...previous.layout.editorGrid,
                        [activeBreakpoint]: {
                          ...previous.layout.editorGrid[activeBreakpoint],
                          rowHeight: Number(event.target.value) || previous.layout.editorGrid[activeBreakpoint].rowHeight
                        }
                      }
                    }
                  }))
                }
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Switch breakpoint, adjust there, and only that breakpoint keeps the override.
            </Typography>
          </RailSection>
        </Stack>
      </Paper>
    </Box>
  );
}
