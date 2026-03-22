function createReadinessItem(key, label, state, required, message) {
  return {
    key,
    label,
    state,
    required,
    message
  };
}

function resolveBrowserReadinessState(browserTargetState) {
  if (browserTargetState.state === "missing") {
    return {
      state: "optional",
      message: "No browser-delivery target selected."
    };
  }
  return {
    state: browserTargetState.state === "ready" ? "ready" : "blocked",
    message: browserTargetState.message
  };
}

export function createDeploymentsSummary(publishedPages, bundles, bundleRuns) {
  return {
    bundleCount: bundles.length,
    publishedPages: publishedPages.length,
    syncedOutputs: publishedPages.reduce(
      (total, page) => total + Number(page?.deploymentSyncedCount ?? 0),
      0
    ),
    staleOutputs: publishedPages.reduce(
      (total, page) => total + Number(page?.deploymentStaleCount ?? 0),
      0
    ),
    missingOutputs: publishedPages.reduce(
      (total, page) => total + Number(page?.deploymentMissingCount ?? 0),
      0
    ),
    completedRuns: bundleRuns.filter((run) => run?.status === "completed").length,
    failedRuns: bundleRuns.filter((run) => run?.status === "failed").length
  };
}

export function createPipelineReadiness({
  selectedBundle,
  selectedPage,
  bundleValidation,
  projectionTargetState,
  categoriesProjectionTargetState,
  tagsProjectionTargetState,
  deploymentTargetState,
  mediaTargetState,
  browserTargetState
}) {
  const browserReadiness = resolveBrowserReadinessState(browserTargetState);
  const bundleContractState =
    bundleValidation.state === "ready" ? "ready" : bundleValidation.state === "warning" ? "ready" : "blocked";
  const bundleContractMessage =
    bundleValidation.state === "ready"
      ? "This release recipe is coherent."
      : bundleValidation.errorMessages[0] ?? bundleValidation.warnings[0] ?? "This release recipe needs attention.";

  const items = [
    createReadinessItem(
      "bundle",
      "Release bundle",
      selectedBundle ? "ready" : "missing",
      true,
      selectedBundle ? "Release bundle selected." : "Select or create a release bundle."
    ),
    createReadinessItem(
      "bundle-contract",
      "Release recipe",
      bundleContractState,
      true,
      bundleContractMessage
    ),
    createReadinessItem(
      "page",
      "Published page",
      selectedPage ? "ready" : "missing",
      true,
      selectedPage ? "Published page selected." : "Select a published page."
    ),
    createReadinessItem(
      "projection",
      "Posts projection",
      projectionTargetState.state === "ready" ? "ready" : projectionTargetState.state,
      true,
      projectionTargetState.message
    ),
    createReadinessItem(
      "categories-projection",
      "Categories projection",
      categoriesProjectionTargetState.state === "ready"
        ? "ready"
        : categoriesProjectionTargetState.state,
      true,
      categoriesProjectionTargetState.message
    ),
    createReadinessItem(
      "tags-projection",
      "Tags projection",
      tagsProjectionTargetState.state === "ready" ? "ready" : tagsProjectionTargetState.state,
      true,
      tagsProjectionTargetState.message
    ),
    createReadinessItem(
      "media",
      "Media sync",
      mediaTargetState.state === "ready" ? "ready" : mediaTargetState.state,
      true,
      mediaTargetState.message
    ),
    createReadinessItem(
      "deployment",
      "HTML deployment",
      deploymentTargetState.state === "ready" ? "ready" : deploymentTargetState.state,
      true,
      deploymentTargetState.message
    ),
    createReadinessItem(
      "browser",
      "Browser delivery",
      browserReadiness.state,
      false,
      browserReadiness.message
    )
  ];

  return {
    items,
    canRun: items.every(
      (item) =>
        item.state === "ready" ||
        (item.required !== true && item.state === "optional")
    )
  };
}

export function createBundleRunSummary(bundleRuns) {
  const runs = Array.isArray(bundleRuns) ? bundleRuns : [];
  return {
    totalRuns: runs.length,
    completedRuns: runs.filter((run) => run?.status === "completed").length,
    failedRuns: runs.filter((run) => run?.status === "failed").length,
    latestRun: runs[0] ?? null
  };
}
