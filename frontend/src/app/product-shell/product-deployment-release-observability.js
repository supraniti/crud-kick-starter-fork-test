function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function readTargetId(state) {
  return typeof state?.target?.id === "string" ? state.target.id : "";
}

function readConnectionId(state) {
  return typeof state?.connection?.id === "string"
    ? state.connection.id
    : typeof state?.target?.connectionProfileId === "string"
      ? state.target.connectionProfileId
      : "";
}

function resolveSharedConnection(states = []) {
  const connectionIds = [...new Set(states.map(readConnectionId).filter(Boolean))];
  if (connectionIds.length !== 1) {
    return {
      connectionId: "",
      state: connectionIds.length === 0 ? "missing" : "mixed",
      message:
        connectionIds.length === 0
          ? "Select validated remote targets to analyze compatibility and cost warnings."
          : "Selected bundle targets do not resolve to one shared remote connection."
    };
  }

  const matchingState = states.find((state) => readConnectionId(state) === connectionIds[0]);
  return {
    connectionId: connectionIds[0],
    state: "ready",
    message: matchingState?.connection?.profileName ?? connectionIds[0]
  };
}

function createFootprintItem(key, label, targetState) {
  const summary = targetState?.target?.compareSummary ?? {};
  return {
    key,
    label,
    targetTitle: targetState?.target?.title ?? "Not configured",
    status: summary.state ?? "unknown",
    createCount: Number(summary.createCount ?? 0),
    updateCount: Number(summary.updateCount ?? 0),
    deleteCount: Number(summary.deleteCount ?? 0),
    localOnlyCount: Number(summary.localOnlyCount ?? 0),
    remoteOnlyCount: Number(summary.remoteOnlyCount ?? 0),
    hasComparison:
      summary && typeof summary === "object" && typeof summary.state === "string" && summary.state !== "unknown"
  };
}

function collectRelevantBundleIds(selectedBundle) {
  const bundleIds = new Set();
  if (selectedBundle?.postsProjectionTargetProfileId || selectedBundle?.categoriesProjectionTargetProfileId || selectedBundle?.tagsProjectionTargetProfileId) {
    bundleIds.add("firestore-projection");
  }
  if (selectedBundle?.mediaTargetProfileId) {
    bundleIds.add("media-storage");
  }
  if (selectedBundle?.deploymentTargetProfileId) {
    bundleIds.add("deployment-storage");
  }
  if (selectedBundle?.browserDeliveryTargetProfileId) {
    bundleIds.add("browser-delivery");
  }
  return bundleIds;
}

function flattenCostWarnings(bundleReports = []) {
  return bundleReports.flatMap((bundle) =>
    toArray(bundle.costWarnings).map((warning) => ({
      id: `${bundle.id}:${warning.id ?? warning.message ?? "warning"}`,
      label: bundle.label,
      severity: warning.severity ?? "warning",
      message: warning.message ?? "Potential recurring cost."
    }))
  );
}

function summarizeProvisioning(bundleReports = []) {
  return bundleReports.reduce(
    (summary, bundle) => ({
      blockedBundles: summary.blockedBundles + (bundle.state === "blocked" ? 1 : 0),
      actionRequiredBundles: summary.actionRequiredBundles + (bundle.state === "action-required" ? 1 : 0),
      missingResources: summary.missingResources + toArray(bundle.missingResources).length,
      provisionableActions: summary.provisionableActions + toArray(bundle.provisionableActions).length
    }),
    {
      blockedBundles: 0,
      actionRequiredBundles: 0,
      missingResources: 0,
      provisionableActions: 0
    }
  );
}

function buildTargetStateList({
  projectionTargetState,
  categoriesProjectionTargetState,
  tagsProjectionTargetState,
  mediaTargetState,
  deploymentTargetState,
  browserTargetState
}) {
  return [
    projectionTargetState,
    categoriesProjectionTargetState,
    tagsProjectionTargetState,
    mediaTargetState,
    deploymentTargetState,
    browserTargetState
  ].filter((state) => readTargetId(state));
}

function resolveCompatibilityBundles(selectedBundle, sharedConnection, remoteOpsSupport) {
  const compatibilityReport =
    sharedConnection.state === "ready"
      ? remoteOpsSupport.getCompatibilityReportForConnection(sharedConnection.connectionId)
      : null;
  const relevantBundleIds = collectRelevantBundleIds(selectedBundle);
  return {
    report: compatibilityReport,
    bundles: toArray(compatibilityReport?.bundles).filter((bundle) => relevantBundleIds.has(bundle.id))
  };
}

function createAnalysisSummary(sharedConnection, selectedBundle, remoteOpsSupport) {
  const compatibility = resolveCompatibilityBundles(selectedBundle, sharedConnection, remoteOpsSupport);
  const provisioningSummary = summarizeProvisioning(compatibility.bundles);
  return {
    processing:
      remoteOpsSupport.compatibilityState.processing &&
      remoteOpsSupport.compatibilityState.connectionId === sharedConnection.connectionId,
    errorMessage: remoteOpsSupport.compatibilityState.errorMessage,
    report: compatibility.report,
    compatibleBundles: compatibility.bundles,
    costWarnings: flattenCostWarnings(compatibility.bundles),
    safeguardRuleCount: toArray(compatibility.report?.safeguardRules).length,
    ...provisioningSummary
  };
}

function createBrowserDeliverySummary(browserTargetState) {
  const config = browserTargetState?.target?.config ?? {};
  return {
    hostname: config.hostname ?? null,
    accessMode: config.accessMode ?? null,
    stackMode: config.stackMode ?? null,
    dnsMode: config.dnsMode ?? null
  };
}

function createFootprintSummary(selectedPage, browserTargetState, footprintItems) {
  return {
    htmlOutputs: Number(selectedPage?.deploymentTargetCount ?? 0),
    pageStatus: selectedPage?.deploymentStatus ?? "unknown",
    browserDelivery: createBrowserDeliverySummary(browserTargetState),
    compareItems: footprintItems
  };
}

function createFootprintItems({
  projectionTargetState,
  categoriesProjectionTargetState,
  tagsProjectionTargetState,
  mediaTargetState,
  deploymentTargetState
}) {
  return [
    createFootprintItem("posts-projection", "Posts projection", projectionTargetState),
    createFootprintItem("categories-projection", "Categories projection", categoriesProjectionTargetState),
    createFootprintItem("tags-projection", "Tags projection", tagsProjectionTargetState),
    createFootprintItem("media-sync", "Media sync", mediaTargetState),
    createFootprintItem("html-deployment", "HTML deployment", deploymentTargetState)
  ];
}

export function createDeploymentReleaseObservability({
  selectedBundle,
  selectedPage,
  projectionTargetState,
  categoriesProjectionTargetState,
  tagsProjectionTargetState,
  mediaTargetState,
  deploymentTargetState,
  browserTargetState,
  remoteOpsSupport
}) {
  const targetStates = buildTargetStateList({
    projectionTargetState,
    categoriesProjectionTargetState,
    tagsProjectionTargetState,
    mediaTargetState,
    deploymentTargetState,
    browserTargetState
  });
  const sharedConnection = resolveSharedConnection(targetStates);
  const footprintItems = createFootprintItems({
    projectionTargetState,
    categoriesProjectionTargetState,
    tagsProjectionTargetState,
    mediaTargetState,
    deploymentTargetState
  });

  return {
    connection: sharedConnection,
    analysis: createAnalysisSummary(sharedConnection, selectedBundle, remoteOpsSupport),
    footprint: createFootprintSummary(selectedPage, browserTargetState, footprintItems)
  };
}
