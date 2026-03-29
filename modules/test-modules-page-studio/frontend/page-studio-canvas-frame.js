function normalizeInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const normalized = Math.trunc(numeric);
  return Math.max(min, Math.min(max, normalized));
}

export function buildPageStudioCanvasFrameMetrics({
  viewport,
  runtimeBreakpoint,
  scaleRatio = 1
} = {}) {
  const pageWidth = normalizeInteger(viewport?.width, 1280, { min: 320, max: 4000 });
  const pageHeight = normalizeInteger(viewport?.height, 720, { min: 320, max: 4000 });
  const safeScaleRatio = Number.isFinite(scaleRatio) && scaleRatio > 0 ? scaleRatio : 1;
  const canvasMaxWidth = normalizeInteger(
    (runtimeBreakpoint?.canvasMaxWidth ?? pageWidth) * safeScaleRatio,
    pageWidth,
    { min: 240, max: 4000 }
  );
  const gapPx = normalizeInteger((runtimeBreakpoint?.gap ?? 3) * 8 * safeScaleRatio, 24, {
    min: 4,
    max: 320
  });
  const paddingPx = normalizeInteger((runtimeBreakpoint?.padding ?? 3) * 8 * safeScaleRatio, 24, {
    min: 8,
    max: 320
  });
  const rowHeightPx = normalizeInteger((runtimeBreakpoint?.rowHeight ?? 32) * safeScaleRatio, 32, {
    min: 12,
    max: 480
  });
  const canvasWidth = Math.min(pageWidth, canvasMaxWidth);
  const innerWidth = Math.max(160, canvasWidth - paddingPx * 2);
  const innerHeight = Math.max(240, pageHeight - paddingPx * 2);

  return {
    pageWidth,
    pageHeight,
    canvasWidth,
    innerWidth,
    innerHeight,
    gapPx,
    paddingPx,
    rowHeightPx
  };
}
