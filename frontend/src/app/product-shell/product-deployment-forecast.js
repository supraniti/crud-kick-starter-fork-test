import { buildBrowserDeliveryDescriptor } from "../../../../modules/test-modules-remote-ops/shared/browser-delivery-support.mjs";

function normalizeText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function resolveModeLabel(page) {
  return page?.deploymentMode === "per-record" ? "Per-record template" : "Single page";
}

function resolveBundleTitle(selectedBundle) {
  return selectedBundle?.title ?? "No deployment bundle selected";
}

function resolvePageTitle(page) {
  return page?.title ?? "No published page selected";
}

function resolvePagePath(page) {
  return normalizeText(page?.pathPattern) || normalizeText(page?.path) || null;
}

function resolveExpectedOutputCount(page) {
  if (!page) {
    return 0;
  }
  return page.deploymentMode === "per-record"
    ? Math.max(Number(page.deploymentTargetCount ?? 0), 0)
    : 1;
}

function resolveDeliveryDescriptor({ browserTarget, deploymentTarget, mediaTarget, page }) {
  return buildBrowserDeliveryDescriptor({
    browserTarget,
    deploymentTarget,
    mediaTarget,
    pagePath: resolvePagePath(page),
    artifactRelativePath: page?.deploymentArtifactPath ?? null
  });
}

function createTargetTitles({ deploymentTarget, browserTarget }) {
  return {
    deploymentTargetTitle: deploymentTarget?.title ?? "Not configured",
    browserTargetTitle: browserTarget?.title ?? "Not configured"
  };
}

function resolvePublicValue(value) {
  return value ?? "Not resolved yet";
}

function createBundleSummary({ selectedBundle, page, pagePath, expectedOutputCount }) {
  return {
    bundleTitle: resolveBundleTitle(selectedBundle),
    pageTitle: resolvePageTitle(page),
    modeLabel: resolveModeLabel(page),
    expectedOutputCount,
    pathLabel: pagePath ?? "Not configured"
  };
}

function createDeliverySummary(deliveryDescriptor) {
  return {
    publicOrigin: resolvePublicValue(deliveryDescriptor.publicOrigin),
    publicUrl: resolvePublicValue(deliveryDescriptor.publicUrl),
    publicMediaBaseUrl: resolvePublicValue(
      deliveryDescriptor.publicMediaBaseUrl ?? deliveryDescriptor.temporaryMediaBaseUrl
    ),
    warnings: Array.isArray(deliveryDescriptor.warnings) ? deliveryDescriptor.warnings : []
  };
}

export function createDeploymentBundleForecast({
  selectedBundle,
  selectedPage,
  deploymentTargetState,
  browserTargetState,
  mediaTargetState
}) {
  const page = selectedPage && typeof selectedPage === "object" ? selectedPage : null;
  const deploymentTarget = deploymentTargetState?.target ?? null;
  const browserTarget = browserTargetState?.target ?? null;
  const mediaTarget = mediaTargetState?.target ?? null;
  const pagePath = resolvePagePath(page);
  const expectedOutputCount = resolveExpectedOutputCount(page);
  const deliveryDescriptor = resolveDeliveryDescriptor({
    browserTarget,
    deploymentTarget,
    mediaTarget,
    page
  });
  const targetTitles = createTargetTitles({ deploymentTarget, browserTarget });
  const bundleSummary = createBundleSummary({
    selectedBundle,
    page,
    pagePath,
    expectedOutputCount
  });
  const deliverySummary = createDeliverySummary(deliveryDescriptor);

  return {
    ...bundleSummary,
    ...deliverySummary,
    deploymentTargetTitle: targetTitles.deploymentTargetTitle,
    browserTargetTitle: targetTitles.browserTargetTitle
  };
}
