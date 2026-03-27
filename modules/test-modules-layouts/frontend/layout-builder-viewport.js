export const VIEWPORT_PRESETS = [
  {
    id: "desktop",
    label: "Desktop 1440",
    width: 1440,
    height: 900
  },
  {
    id: "laptop",
    label: "Laptop 1280",
    width: 1280,
    height: 840
  },
  {
    id: "tablet",
    label: "Tablet 768",
    width: 768,
    height: 1024
  },
  {
    id: "mobile",
    label: "Mobile 390",
    width: 390,
    height: 844
  }
];

export const DEFAULT_VIEWPORT = VIEWPORT_PRESETS[0];
export const DEFAULT_ZOOM_LEVEL = 100;

export function clampViewportWidth(value) {
  return Math.max(320, Math.min(1920, Math.round(Number(value) || DEFAULT_VIEWPORT.width)));
}

export function clampViewportHeight(value) {
  return Math.max(480, Math.min(2200, Math.round(Number(value) || DEFAULT_VIEWPORT.height)));
}

export function clampZoomLevel(value) {
  return Math.max(20, Math.min(150, Math.round(Number(value) || DEFAULT_ZOOM_LEVEL)));
}

export function formatViewportLabel(viewport) {
  return `Viewport: ${viewport.width} x ${viewport.height} px`;
}

export function formatZoomLabel(zoomLevel) {
  return `Zoom ${zoomLevel}%`;
}

export function createRulerMarks(length, step = 100) {
  const total = Math.max(1, Math.floor(length / step));
  return Array.from({ length: total + 1 }, (_, index) => ({
    value: index * step,
    index
  }));
}

export function detectViewportPreset(viewport) {
  return VIEWPORT_PRESETS.find(
    (preset) => preset.width === viewport.width && preset.height === viewport.height
  ) ?? null;
}
