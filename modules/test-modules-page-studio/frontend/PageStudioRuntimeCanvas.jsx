import { useMemo } from "react";
import { Alert, Box, Chip, Paper, Stack, ThemeProvider, Typography } from "@mui/material";
import { buildWidgetContextScope } from "../../test-modules-pages/shared/page-widget-context.mjs";
import { createPageStudioPreviewLibraries, PageStudioWidgetRenderer } from "./page-studio-widget-renderer.jsx";
import { createPageStudioMuiTheme, usePageStudioThemeStylesheet } from "./page-studio-theme-runtime.js";

function RuntimeBlock({
  item,
  block,
  onNavigate,
  context,
  libraries,
  renderBlockChrome = null
}) {
  return (
    <Box
      data-page-studio-block-id={item.blockId}
      sx={{
        gridColumn: `${item.colStart} / span ${item.colSpan}`,
        gridRow: `${item.rowStart} / span ${item.rowSpan}`,
        minWidth: 0,
        minHeight: 0,
        position: "relative",
        overflow: "hidden"
      }}
    >
      <Box sx={{ height: "100%", minHeight: 0, overflow: "auto" }}>
        {block?.componentInstance ? (
          <PageStudioWidgetRenderer
            widget={block.componentInstance}
            context={context}
            libraries={libraries}
            onNavigate={onNavigate}
          />
        ) : (
          <Paper variant="outlined" square sx={{ p: 2, minHeight: "100%", borderStyle: "dashed" }}>
            <Stack spacing={0.75}>
              <Chip size="small" label={block?.id ?? item.blockId} color="primary" variant="outlined" sx={{ alignSelf: "flex-start" }} />
              <Typography variant="subtitle2">{block?.summary ?? "Unassigned block"}</Typography>
              <Typography variant="body2" color="text.secondary">
                This block has no widget yet. Assign one in Widgets mode to make Preview and Live match.
              </Typography>
            </Stack>
          </Paper>
        )}
      </Box>
      {typeof renderBlockChrome === "function"
        ? renderBlockChrome({
            block,
            item
          })
        : null}
    </Box>
  );
}

export function PageStudioRuntimeCanvas({
  studioDocument,
  previewState,
  activeBreakpoint,
  runtimeBreakpoint,
  frameMetrics,
  viewport,
  onNavigate,
  renderBlockChrome = null,
  scaleRatio = 1
}) {
  const themeDocument = previewState?.themeDocument ?? {};
  usePageStudioThemeStylesheet(themeDocument);
  const muiTheme = useMemo(
    () => createPageStudioMuiTheme(themeDocument, activeBreakpoint, 1),
    [activeBreakpoint, themeDocument]
  );
  const context = useMemo(
    () => buildWidgetContextScope({ page: previewState.page, model: previewState.model }),
    [previewState.model, previewState.page]
  );
  const libraries = useMemo(
    () => createPageStudioPreviewLibraries(previewState.collections),
    [previewState.collections]
  );
  const blockById = useMemo(
    () => new Map(studioDocument.widgets.blocks.map((block) => [block.id, block])),
    [studioDocument.widgets.blocks]
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        data-page-studio-runtime-canvas="true"
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
              onNavigate={onNavigate}
              context={context}
              libraries={libraries}
              renderBlockChrome={renderBlockChrome}
            />
          ))}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
