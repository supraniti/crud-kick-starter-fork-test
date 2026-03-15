function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function countStepsByStatus(steps, status) {
  return (Array.isArray(steps) ? steps : []).filter((step) => step?.status === status).length;
}

export function createDeploymentBundleReleaseStepPlan(includeBrowserValidation = false) {
  const steps = [
    { key: "sync-local-html", label: "Sync local HTML" },
    { key: "compare-posts-projection", label: "Compare posts projection" },
    { key: "sync-posts-projection", label: "Sync posts projection" },
    { key: "compare-categories-projection", label: "Compare categories projection" },
    { key: "sync-categories-projection", label: "Sync categories projection" },
    { key: "compare-tags-projection", label: "Compare tags projection" },
    { key: "sync-tags-projection", label: "Sync tags projection" },
    { key: "compare-media", label: "Compare media sync" },
    { key: "sync-media", label: "Sync media" },
    { key: "compare-html-deployment", label: "Compare HTML deployment" },
    { key: "sync-html-deployment", label: "Sync HTML deployment" }
  ];

  if (includeBrowserValidation) {
    steps.push({ key: "validate-browser-delivery", label: "Validate browser delivery" });
  }

  return steps;
}

function createRunStep(step) {
  return {
    key: normalizeText(step?.key),
    label: normalizeText(step?.label),
    status: "pending",
    message: "",
    finishedOn: ""
  };
}

export function createDeploymentBundleRunCreatePayload({
  bundle,
  page,
  steps,
  startedOn,
  triggerMode = "manual-release-pipeline"
}) {
  return {
    title: `${normalizeText(bundle?.title)} release`,
    bundleId: normalizeText(bundle?.id),
    bundleTitle: normalizeText(bundle?.title),
    pageId: normalizeText(page?.id),
    pageTitle: normalizeText(page?.title),
    status: "running",
    triggerMode: normalizeText(triggerMode) || "manual-release-pipeline",
    startedOn,
    finishedOn: "",
    stepCount: steps.length,
    successfulStepCount: 0,
    failedStepCount: 0,
    summaryMessage: "",
    bundleSnapshot: {
      pageId: normalizeText(bundle?.pageId),
      postsProjectionTargetProfileId: normalizeText(bundle?.postsProjectionTargetProfileId),
      categoriesProjectionTargetProfileId: normalizeText(bundle?.categoriesProjectionTargetProfileId),
      tagsProjectionTargetProfileId: normalizeText(bundle?.tagsProjectionTargetProfileId),
      mediaTargetProfileId: normalizeText(bundle?.mediaTargetProfileId),
      deploymentTargetProfileId: normalizeText(bundle?.deploymentTargetProfileId),
      browserDeliveryTargetProfileId: normalizeText(bundle?.browserDeliveryTargetProfileId)
    },
    steps: steps.map(createRunStep)
  };
}

export function markDeploymentBundleRunStep(steps, stepKey, status, message, finishedOn) {
  return (Array.isArray(steps) ? steps : []).map((step) =>
    step?.key === stepKey
      ? {
          ...step,
          status,
          message: normalizeText(message),
          finishedOn
        }
      : step
  );
}

export function createDeploymentBundleRunUpdatePayload({
  previousRun,
  steps,
  status,
  summaryMessage,
  finishedOn = ""
}) {
  return {
    title: normalizeText(previousRun?.title),
    bundleId: normalizeText(previousRun?.bundleId),
    bundleTitle: normalizeText(previousRun?.bundleTitle),
    pageId: normalizeText(previousRun?.pageId),
    pageTitle: normalizeText(previousRun?.pageTitle),
    status,
    triggerMode: normalizeText(previousRun?.triggerMode) || "manual-release-pipeline",
    startedOn: normalizeText(previousRun?.startedOn),
    finishedOn,
    stepCount: steps.length,
    successfulStepCount: countStepsByStatus(steps, "success"),
    failedStepCount: countStepsByStatus(steps, "error"),
    summaryMessage: normalizeText(summaryMessage),
    bundleSnapshot:
      previousRun?.bundleSnapshot && typeof previousRun.bundleSnapshot === "object"
        ? previousRun.bundleSnapshot
        : {},
    steps
  };
}
