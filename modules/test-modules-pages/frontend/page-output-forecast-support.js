function normalizeText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function joinOriginPath(origin, path) {
  const safeOrigin = normalizeText(origin).replace(/\/+$/g, "");
  const safePath = normalizeText(path);
  if (!safeOrigin || !safePath) {
    return null;
  }
  return safePath.startsWith("/") ? `${safeOrigin}${safePath}` : `${safeOrigin}/${safePath}`;
}

function sampleDeploymentPaths({ page, previewSourceItems, deploymentInstances }) {
  const previewPaths = (Array.isArray(previewSourceItems) ? previewSourceItems : [])
    .map((item) => normalizeText(item?.path))
    .filter(Boolean);
  if (previewPaths.length > 0) {
    return previewPaths;
  }

  const instancePaths = (Array.isArray(deploymentInstances) ? deploymentInstances : [])
    .map((item) => normalizeText(item?.resolvedPath))
    .filter(Boolean);
  if (instancePaths.length > 0) {
    return instancePaths;
  }

  const singlePath = normalizeText(page?.path);
  return singlePath ? [singlePath] : [];
}

function resolveExpectedOutputCount({ isPerRecord, page, samplePaths, previewSourceItems }) {
  if (!isPerRecord) {
    return page?.id || normalizeText(page?.path) ? 1 : 0;
  }
  return Math.max(
    samplePaths.length,
    Number(page?.deploymentTargetCount ?? 0),
    Array.isArray(previewSourceItems) ? previewSourceItems.length : 0
  );
}

function resolveSamplePublicUrls(delivery, samplePaths) {
  const publicOrigin = normalizeText(delivery?.publicOrigin);
  if (publicOrigin && samplePaths.length > 0) {
    return samplePaths.map((path) => joinOriginPath(publicOrigin, path)).filter(Boolean);
  }
  const publicUrl = normalizeText(delivery?.publicUrl);
  return publicUrl ? [publicUrl] : [];
}

function resolveSeoPreview({ head, page }) {
  return {
    canonicalUrl: normalizeText(head?.canonicalUrl) || normalizeText(page?.canonicalUrl) || "Not resolved yet",
    seoTitle:
      normalizeText(head?.title)
      || normalizeText(page?.seoTitle)
      || normalizeText(page?.title)
      || "Not set",
    seoDescription: normalizeText(head?.description) || normalizeText(page?.seoDescription) || "Not set"
  };
}

function createPageContext(page, deliveryPayload) {
  return {
    page: page && typeof page === "object" ? page : {},
    delivery: deliveryPayload?.delivery ?? {},
    head: deliveryPayload?.head ?? {}
  };
}

function createPathSummary(samplePaths, samplePublicUrls) {
  return {
    samplePaths: samplePaths.slice(0, 5),
    extraPathCount: Math.max(samplePaths.length - 5, 0),
    samplePublicUrls: samplePublicUrls.slice(0, 3),
    extraPublicUrlCount: Math.max(samplePublicUrls.length - 3, 0)
  };
}

function createPageSummary(page, isPerRecord, expectedOutputCount) {
  return {
    expectedOutputCount,
    modeLabel: isPerRecord ? "Per-record template" : "Single page",
    pathLabel: normalizeText(page.pathPattern) || normalizeText(page.path) || "Not configured"
  };
}

function createDeliverySummary(delivery, seoPreview) {
  return {
    canonicalUrl: seoPreview.canonicalUrl,
    seoTitle: seoPreview.seoTitle,
    seoDescription: seoPreview.seoDescription,
    publicOrigin: normalizeText(delivery.publicOrigin) || "Not resolved yet"
  };
}

export function createPageOutputForecast({
  page,
  previewSourceItems,
  deploymentInstances,
  deliveryPayload
}) {
  const context = createPageContext(page, deliveryPayload);
  const currentPage = context.page;
  const delivery = context.delivery;
  const isPerRecord = currentPage.deploymentMode === "per-record";
  const samplePaths = sampleDeploymentPaths({
    page: currentPage,
    previewSourceItems,
    deploymentInstances
  });
  const expectedOutputCount = resolveExpectedOutputCount({
    isPerRecord,
    page: currentPage,
    samplePaths,
    previewSourceItems
  });
  const samplePublicUrls = resolveSamplePublicUrls(delivery, samplePaths);
  const seoPreview = resolveSeoPreview({ head: context.head, page: currentPage });
  const pageSummary = createPageSummary(currentPage, isPerRecord, expectedOutputCount);
  const deliverySummary = createDeliverySummary(delivery, seoPreview);
  const pathSummary = createPathSummary(samplePaths, samplePublicUrls);

  return {
    ...pageSummary,
    ...deliverySummary,
    ...pathSummary
  };
}
