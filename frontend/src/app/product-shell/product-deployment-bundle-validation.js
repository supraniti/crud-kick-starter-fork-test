import { resolveTargetBindingState } from "./product-remote-health.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createDiagnostic(severity, message) {
  return {
    severity,
    message
  };
}

function isPublishedPage(page) {
  return page?.status === "published";
}

function findPublishedPage(pages, pageId) {
  return (Array.isArray(pages) ? pages : []).find((page) => page?.id === pageId && isPublishedPage(page)) ?? null;
}

function validateTargetSelection({
  label,
  targetId,
  targets,
  connectionById,
  expectedKind,
  expectedProjectionScope = ""
}) {
  const binding = resolveTargetBindingState(targetId, targets, connectionById);
  const diagnostics = [];

  if (binding.state !== "ready") {
    diagnostics.push(
      createDiagnostic(
        "error",
        `${label} is not release-ready. ${binding.message}`
      )
    );
    return {
      binding,
      diagnostics
    };
  }

  if (binding.target?.targetKind !== expectedKind) {
    diagnostics.push(
      createDiagnostic("error", `${label} must use a ${expectedKind} target.`)
    );
  }

  if (
    expectedProjectionScope &&
    normalizeText(binding.target?.config?.projectionScope) !== expectedProjectionScope
  ) {
    diagnostics.push(
      createDiagnostic(
        "error",
        `${label} must use projection scope '${expectedProjectionScope}'.`
      )
    );
  }

  return {
    binding,
    diagnostics
  };
}

function collectUniqueConnectionIds(bindings) {
  return Array.from(
    new Set(
      bindings
        .map((binding) => normalizeText(binding?.target?.connectionProfileId))
        .filter(Boolean)
    )
  );
}

function validateBrowserLinkage(browserBinding, deploymentBinding, mediaBinding) {
  const diagnostics = [];
  if (browserBinding.state !== "ready") {
    return diagnostics;
  }

  const browserConfig = browserBinding.target?.config ?? {};
  const linkedDeploymentId = normalizeText(browserConfig.deploymentTargetProfileId);
  const linkedMediaId = normalizeText(browserConfig.mediaTargetProfileId);
  const selectedDeploymentId = normalizeText(deploymentBinding.target?.id);
  const selectedMediaId = normalizeText(mediaBinding.target?.id);

  if (linkedDeploymentId && linkedDeploymentId !== selectedDeploymentId) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "Browser delivery target points at a different HTML deployment target than the selected bundle."
      )
    );
  }

  if (linkedMediaId && linkedMediaId !== selectedMediaId) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "Browser delivery target points at a different media target than the selected bundle."
      )
    );
  }

  if (!linkedDeploymentId) {
    diagnostics.push(
      createDiagnostic(
        "warning",
        "Browser delivery target does not declare its linked HTML deployment target."
      )
    );
  }

  if (!linkedMediaId) {
    diagnostics.push(
      createDiagnostic(
        "warning",
        "Browser delivery target does not declare its linked media target."
      )
    );
  }

  return diagnostics;
}

function summarizeDiagnostics(diagnostics) {
  if (diagnostics.some((entry) => entry.severity === "error")) {
    return "blocked";
  }
  if (diagnostics.length > 0) {
    return "warning";
  }
  return "ready";
}

export function validateDeploymentBundleDraft({
  draft,
  publishedPages,
  targets,
  connectionById
}) {
  const diagnostics = [];
  const pageId = normalizeText(draft?.pageId);
  const title = normalizeText(draft?.title);

  if (title.length < 3) {
    diagnostics.push(createDiagnostic("error", "Bundle title must be at least 3 characters."));
  }

  const page = findPublishedPage(publishedPages, pageId);
  if (!page) {
    diagnostics.push(
      createDiagnostic("error", "Bundle must point to a published page.")
    );
  }

  const postsProjection = validateTargetSelection({
    label: "Posts projection target",
    targetId: normalizeText(draft?.postsProjectionTargetProfileId),
    targets,
    connectionById,
    expectedKind: "firestore-projection",
    expectedProjectionScope: "published-blog-posts"
  });
  const categoriesProjection = validateTargetSelection({
    label: "Categories projection target",
    targetId: normalizeText(draft?.categoriesProjectionTargetProfileId),
    targets,
    connectionById,
    expectedKind: "firestore-projection",
    expectedProjectionScope: "public-blog-categories"
  });
  const tagsProjection = validateTargetSelection({
    label: "Tags projection target",
    targetId: normalizeText(draft?.tagsProjectionTargetProfileId),
    targets,
    connectionById,
    expectedKind: "firestore-projection",
    expectedProjectionScope: "public-blog-tags"
  });
  const mediaTarget = validateTargetSelection({
    label: "Media target",
    targetId: normalizeText(draft?.mediaTargetProfileId),
    targets,
    connectionById,
    expectedKind: "media-storage"
  });
  const deploymentTarget = validateTargetSelection({
    label: "HTML deployment target",
    targetId: normalizeText(draft?.deploymentTargetProfileId),
    targets,
    connectionById,
    expectedKind: "deployment-storage"
  });
  const browserTarget = validateTargetSelection({
    label: "Browser delivery target",
    targetId: normalizeText(draft?.browserDeliveryTargetProfileId),
    targets,
    connectionById,
    expectedKind: "browser-delivery"
  });

  diagnostics.push(...postsProjection.diagnostics);
  diagnostics.push(...categoriesProjection.diagnostics);
  diagnostics.push(...tagsProjection.diagnostics);
  diagnostics.push(...mediaTarget.diagnostics);
  diagnostics.push(...deploymentTarget.diagnostics);
  diagnostics.push(...browserTarget.diagnostics);
  diagnostics.push(
    ...validateBrowserLinkage(
      browserTarget.binding,
      deploymentTarget.binding,
      mediaTarget.binding
    )
  );

  const selectedConnections = collectUniqueConnectionIds([
    postsProjection.binding,
    categoriesProjection.binding,
    tagsProjection.binding,
    mediaTarget.binding,
    deploymentTarget.binding,
    browserTarget.binding
  ]);
  if (selectedConnections.length > 1) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "Bundle targets must share one validated remote connection."
      )
    );
  }

  return {
    page,
    diagnostics,
    state: summarizeDiagnostics(diagnostics),
    canSave: diagnostics.every((entry) => entry.severity !== "error"),
    errorMessages: diagnostics
      .filter((entry) => entry.severity === "error")
      .map((entry) => entry.message),
    warnings: diagnostics
      .filter((entry) => entry.severity === "warning")
      .map((entry) => entry.message)
  };
}
