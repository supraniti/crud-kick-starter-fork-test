import { Box, Button, Chip, Divider, Stack, Typography } from "@mui/material";
import {
  createRulerMarks,
  detectViewportPreset,
  formatViewportLabel,
  formatZoomLabel,
  VIEWPORT_PRESETS
} from "./layout-builder-viewport.js";

const RULER_SIZE = 36;
const CANVAS_PADDING = 40;

function ViewportStepper({ label, value, onDecrease, onIncrease }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 48 }}>
        {label}
      </Typography>
      <Button size="small" variant="outlined" onClick={onDecrease} aria-label={`Decrease ${label.toLowerCase()}`}>
        -
      </Button>
      <Typography variant="body2" sx={{ minWidth: 56, textAlign: "center", fontWeight: 700 }}>
        {value}
      </Typography>
      <Button size="small" variant="outlined" onClick={onIncrease} aria-label={`Increase ${label.toLowerCase()}`}>
        +
      </Button>
    </Stack>
  );
}

function ZoomStepper({ zoomLevel, onZoomOut, onZoomIn }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Button size="small" variant="outlined" onClick={onZoomOut} aria-label="Zoom out">
        -
      </Button>
      <Chip size="small" label={formatZoomLabel(zoomLevel)} />
      <Button size="small" variant="outlined" onClick={onZoomIn} aria-label="Zoom in">
        +
      </Button>
    </Stack>
  );
}

function ViewportToolbar({ viewport, zoomLevel, onWidthStep, onHeightStep, onSelectPreset, onZoomStep }) {
  const activePreset = detectViewportPreset(viewport);

  return (
    <Stack spacing={1.25} sx={{ minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={1.25}
        alignItems={{ xs: "flex-start", lg: "center" }}
        justifyContent="space-between"
        sx={{ minWidth: 0 }}
      >
        <Stack spacing={0.35}>
          <Typography variant="h6">Canvas Workspace</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatViewportLabel(viewport)}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ minWidth: 0 }}>
          <ViewportStepper
            label="Width"
            value={viewport.width}
            onDecrease={() => onWidthStep(-40)}
            onIncrease={() => onWidthStep(40)}
          />
          <ViewportStepper
            label="Height"
            value={viewport.height}
            onDecrease={() => onHeightStep(-40)}
            onIncrease={() => onHeightStep(40)}
          />
          <ZoomStepper
            zoomLevel={zoomLevel}
            onZoomOut={() => onZoomStep(-10)}
            onZoomIn={() => onZoomStep(10)}
          />
        </Stack>
      </Stack>
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
        {VIEWPORT_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            size="small"
            variant={activePreset?.id === preset.id ? "contained" : "outlined"}
            onClick={() => onSelectPreset(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}

function HorizontalRuler({ width, scaleRatio }) {
  const marks = createRulerMarks(width);

  return (
    <Box
      sx={{
        position: "relative",
        height: RULER_SIZE,
        borderBottom: "1px solid rgba(148,163,184,0.35)",
        backgroundColor: "rgba(226,232,240,0.78)",
        overflow: "hidden"
      }}
    >
      {marks.map((mark) => (
        <Box
          key={`h-${mark.value}`}
          sx={{
            position: "absolute",
            left: `${mark.value * scaleRatio}px`,
            top: 0,
            bottom: 0,
            width: 0,
            borderLeft: "1px solid rgba(100,116,139,0.45)"
          }}
        >
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              top: 6,
              left: 6,
              color: "text.secondary",
              fontSize: "0.68rem"
            }}
          >
            {mark.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function VerticalRuler({ height, scaleRatio }) {
  const marks = createRulerMarks(height);

  return (
    <Box
      sx={{
        position: "relative",
        width: RULER_SIZE,
        borderRight: "1px solid rgba(148,163,184,0.35)",
        backgroundColor: "rgba(226,232,240,0.78)",
        overflow: "hidden"
      }}
    >
      {marks.map((mark) => (
        <Box
          key={`v-${mark.value}`}
          sx={{
            position: "absolute",
            top: `${mark.value * scaleRatio}px`,
            left: 0,
            right: 0,
            height: 0,
            borderTop: "1px solid rgba(100,116,139,0.45)"
          }}
        >
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              top: 4,
              left: 4,
              color: "text.secondary",
              fontSize: "0.68rem"
            }}
          >
            {mark.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function CanvasCorner() {
  return (
    <Box
      sx={{
        width: RULER_SIZE,
        height: RULER_SIZE,
        borderRight: "1px solid rgba(148,163,184,0.35)",
        borderBottom: "1px solid rgba(148,163,184,0.35)",
        backgroundColor: "rgba(203,213,225,0.92)"
      }}
    />
  );
}

function PageBoundaryLabel({ viewport }) {
  return (
    <Chip
      size="small"
      label={`Page ${viewport.width} x ${viewport.height}`}
      sx={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 2,
        backgroundColor: "rgba(15,23,42,0.82)",
        color: "common.white"
      }}
    />
  );
}

function PageChrome({ viewport, zoomLevel, children }) {
  const scaleRatio = zoomLevel / 100;
  const scaledWidth = Math.round(viewport.width * scaleRatio);
  const scaledHeight = Math.round(viewport.height * scaleRatio);

  return (
    <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, width: "100%", maxWidth: "100%", overflow: "auto" }}>
      <Box
        sx={{
          width: "fit-content",
          minWidth: "100%",
          minHeight: scaledHeight + RULER_SIZE + CANVAS_PADDING * 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          p: `${CANVAS_PADDING}px`
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `${RULER_SIZE}px ${scaledWidth}px`,
            gridTemplateRows: `${RULER_SIZE}px ${scaledHeight}px`,
            boxShadow: "0 24px 48px rgba(15,23,42,0.18)",
            borderRadius: 4,
            overflow: "hidden"
          }}
        >
          <CanvasCorner />
          <HorizontalRuler width={viewport.width} scaleRatio={scaleRatio} />
          <VerticalRuler height={viewport.height} scaleRatio={scaleRatio} />
          <Box
            sx={{
              position: "relative",
              width: scaledWidth,
              height: scaledHeight,
              backgroundColor: "#7c8793",
              backgroundImage: [
                "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
                "linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
                "linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)"
              ].join(", "),
              backgroundSize: [
                `${8 * scaleRatio}px ${8 * scaleRatio}px`,
                `${8 * scaleRatio}px ${8 * scaleRatio}px`,
                `${80 * scaleRatio}px ${80 * scaleRatio}px`,
                `${80 * scaleRatio}px ${80 * scaleRatio}px`
              ].join(", "),
              overflow: "hidden"
            }}
          >
            <PageBoundaryLabel viewport={viewport} />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                transform: `scale(${scaleRatio})`,
                transformOrigin: "top left"
              }}
            >
              <Box
                sx={{
                  width: viewport.width,
                  height: viewport.height,
                  backgroundColor: "#ffffff",
                  overflow: "auto"
                }}
              >
                {children}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function LayoutBuilderCanvasShell({
  viewport,
  zoomLevel,
  onWidthStep,
  onHeightStep,
  onSelectPreset,
  onZoomStep,
  children
}) {
  return (
    <Stack spacing={1.5} sx={{ minHeight: 0, minWidth: 0, width: "100%", maxWidth: "100%", height: "100%", overflow: "hidden" }}>
      <ViewportToolbar
        viewport={viewport}
        zoomLevel={zoomLevel}
        onWidthStep={onWidthStep}
        onHeightStep={onHeightStep}
        onSelectPreset={onSelectPreset}
        onZoomStep={onZoomStep}
      />
      <Divider />
      <PageChrome viewport={viewport} zoomLevel={zoomLevel}>
        {children}
      </PageChrome>
    </Stack>
  );
}
