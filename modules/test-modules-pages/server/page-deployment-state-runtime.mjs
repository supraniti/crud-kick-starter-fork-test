import {
  DEPLOYMENT_ARTIFACTS_COLLECTION_ID,
  LAYOUTS_COLLECTION_ID,
  isPagePublished,
  isPerRecordDeploymentMode,
  normalizePagePath,
  normalizeTrimmedText
} from "./distribution-shared-runtime.mjs";
import { buildResolvedPagePath, listEligiblePrimarySourceRecords } from "./page-delivery-runtime.mjs";
import { resolvePageDeploymentRootDir } from "./page-deployment-root.mjs";
import {
  artifactExists,
  buildLayoutVersionToken,
  buildPageVersionToken,
  buildRecordVersionToken,
  buildSettingsVersionToken,
  listArtifactRecords,
  pickLatestTimestamp,
  readSourceLabel,
  resolveArtifactRelativePath
} from "./page-deployment-render-runtime.mjs";
import { readPagesModuleSettings } from "./page-settings-runtime.mjs";

function createResolvedSourceEntry(page, sourceRecord) {
  try {
    const resolvedPath = buildResolvedPagePath(page, sourceRecord);
    return {
      sourceRecord,
      resolvedPath,
      artifactRelativePath: resolveArtifactRelativePath(resolvedPath),
      errorMessage: null
    };
  } catch (error) {
    return {
      sourceRecord,
      resolvedPath: null,
      artifactRelativePath: null,
      errorMessage: error?.message ?? "Failed to resolve artifact path"
    };
  }
}

function mapDuplicateResolvedPaths(entries) {
  const pathCounts = new Map();
  for (const entry of entries) {
    if (!entry.resolvedPath) {
      continue;
    }
    pathCounts.set(entry.resolvedPath, (pathCounts.get(entry.resolvedPath) ?? 0) + 1);
  }

  return new Set(
    [...pathCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([resolvedPath]) => resolvedPath)
  );
}

function buildEvaluatedArtifact({
  page,
  sourceRecord,
  existingArtifact = null,
  resolvedPath,
  artifactRelativePath,
  status,
  staleReasonSummary = null,
  pageVersionToken,
  sourceVersionToken,
  layoutVersionToken,
  settingsVersionToken,
  lastErrorMessage = null
}) {
  return {
    id: existingArtifact?.id ?? null,
    pageId: page.id,
    sourceType: page.primarySourceType,
    sourceItemId: sourceRecord.id,
    sourceLabel: readSourceLabel(sourceRecord),
    resolvedPath: normalizePagePath(resolvedPath),
    artifactRelativePath:
      normalizeTrimmedText(existingArtifact?.artifactRelativePath) ??
      normalizeTrimmedText(artifactRelativePath),
    status,
    staleReasonSummary: normalizeTrimmedText(staleReasonSummary),
    pageVersionToken,
    sourceVersionToken,
    layoutVersionToken,
    settingsVersionToken,
    payloadHash: normalizeTrimmedText(existingArtifact?.payloadHash),
    htmlHash: normalizeTrimmedText(existingArtifact?.htmlHash),
    lastSyncedOn: normalizeTrimmedText(existingArtifact?.lastSyncedOn),
    lastEvaluatedOn: normalizeTrimmedText(existingArtifact?.lastEvaluatedOn),
    lastErrorMessage: normalizeTrimmedText(lastErrorMessage ?? existingArtifact?.lastErrorMessage)
  };
}

function buildOrphanedArtifact(page, artifact) {
  return {
    id: artifact.id,
    pageId: page.id,
    sourceType: artifact.sourceType ?? page.primarySourceType,
    sourceItemId: artifact.sourceItemId,
    sourceLabel: artifact.sourceLabel ?? artifact.sourceItemId,
    resolvedPath: normalizePagePath(artifact.resolvedPath),
    artifactRelativePath: normalizeTrimmedText(artifact.artifactRelativePath),
    status: "orphaned",
    staleReasonSummary:
      normalizeTrimmedText(artifact.staleReasonSummary) ??
      "Source record is no longer eligible for this template",
    pageVersionToken: normalizeTrimmedText(artifact.pageVersionToken),
    sourceVersionToken: normalizeTrimmedText(artifact.sourceVersionToken),
    layoutVersionToken: normalizeTrimmedText(artifact.layoutVersionToken),
    settingsVersionToken: normalizeTrimmedText(artifact.settingsVersionToken),
    payloadHash: normalizeTrimmedText(artifact.payloadHash),
    htmlHash: normalizeTrimmedText(artifact.htmlHash),
    lastSyncedOn: normalizeTrimmedText(artifact.lastSyncedOn),
    lastEvaluatedOn: normalizeTrimmedText(artifact.lastEvaluatedOn),
    lastErrorMessage: normalizeTrimmedText(artifact.lastErrorMessage)
  };
}

function buildLiveDeploymentSummary(page, instances) {
  const targetInstances = instances.filter((item) => item.status !== "orphaned");
  const syncedCount = targetInstances.filter((item) => item.status === "synced").length;
  const missingCount = targetInstances.filter((item) => item.status === "missing").length;
  const staleCount =
    targetInstances.filter((item) => item.status === "stale").length +
    instances.filter((item) => item.status === "orphaned").length;
  const errorCount = targetInstances.filter((item) => item.status === "error").length;

  return {
    ...page,
    deploymentArtifactPath: null,
    deploymentStatus:
      errorCount > 0
        ? "error"
        : missingCount > 0
          ? "missing"
          : staleCount > 0
            ? "stale"
            : "clean",
    deploymentTargetCount: targetInstances.length,
    deploymentSyncedCount: syncedCount,
    deploymentStaleCount: staleCount,
    deploymentMissingCount: missingCount,
    deploymentSyncedOn: pickLatestTimestamp(instances.map((item) => item.lastSyncedOn)),
    deploymentLastRunOn: pickLatestTimestamp(
      instances.flatMap((item) => [item.lastEvaluatedOn, item.lastSyncedOn])
    )
  };
}

async function loadPerRecordDeploymentContext({
  page,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  const artifactHandler = collectionHandlerRegistry.get(DEPLOYMENT_ARTIFACTS_COLLECTION_ID);
  const layoutsHandler = collectionHandlerRegistry.get(LAYOUTS_COLLECTION_ID);
  const layout = page.layoutId && layoutsHandler && typeof layoutsHandler.findById === "function"
    ? await layoutsHandler.findById(page.layoutId)
    : null;
  const settings = await readPagesModuleSettings({
    resolveSettingsRepository,
    settingsDefinition,
    collectionHandlerRegistry
  });
  const artifactRecords = await listArtifactRecords(artifactHandler, page.id);

  return {
    artifactHandler,
    artifactRecords,
    deploymentRootDir: resolvePageDeploymentRootDir(),
    eligibleSourceRecords: await listEligiblePrimarySourceRecords(collectionHandlerRegistry, page),
    layoutVersionToken: buildLayoutVersionToken(page, layout),
    pageVersionToken: buildPageVersionToken(page),
    settings,
    settingsVersionToken: buildSettingsVersionToken(settings)
  };
}

function buildEntryErrorArtifact({
  page,
  entry,
  existingArtifact,
  pageVersionToken,
  sourceVersionToken,
  layoutVersionToken,
  settingsVersionToken,
  errorMessage
}) {
  return buildEvaluatedArtifact({
    page,
    sourceRecord: entry.sourceRecord,
    existingArtifact,
    resolvedPath: entry.resolvedPath ?? `/${entry.sourceRecord.id}`,
    artifactRelativePath: entry.artifactRelativePath,
    status: "error",
    staleReasonSummary: errorMessage,
    pageVersionToken,
    sourceVersionToken,
    layoutVersionToken,
    settingsVersionToken,
    lastErrorMessage: errorMessage
  });
}

function buildMissingArtifactState({
  page,
  entry,
  existingArtifact,
  pageVersionToken,
  sourceVersionToken,
  layoutVersionToken,
  settingsVersionToken,
  message
}) {
  return buildEvaluatedArtifact({
    page,
    sourceRecord: entry.sourceRecord,
    existingArtifact,
    resolvedPath: entry.resolvedPath,
    artifactRelativePath: entry.artifactRelativePath,
    status: "missing",
    staleReasonSummary: message,
    pageVersionToken,
    sourceVersionToken,
    layoutVersionToken,
    settingsVersionToken
  });
}

function collectArtifactDriftReasons({
  entry,
  existingArtifact,
  pageVersionToken,
  sourceVersionToken,
  layoutVersionToken,
  settingsVersionToken
}) {
  const staleReasons = [];
  const storedArtifactPath = normalizeTrimmedText(existingArtifact.artifactRelativePath);

  if (normalizePagePath(existingArtifact.resolvedPath) !== entry.resolvedPath) {
    staleReasons.push("Resolved path changed");
  }
  if (storedArtifactPath !== entry.artifactRelativePath) {
    staleReasons.push("Artifact path changed");
  }
  if (normalizeTrimmedText(existingArtifact.pageVersionToken) !== pageVersionToken) {
    staleReasons.push("Page template changed");
  }
  if (normalizeTrimmedText(existingArtifact.sourceVersionToken) !== sourceVersionToken) {
    staleReasons.push("Source record changed");
  }
  if (normalizeTrimmedText(existingArtifact.layoutVersionToken) !== normalizeTrimmedText(layoutVersionToken)) {
    staleReasons.push("Layout configuration changed");
  }
  if (normalizeTrimmedText(existingArtifact.settingsVersionToken) !== normalizeTrimmedText(settingsVersionToken)) {
    staleReasons.push("Pages module settings changed");
  }

  return staleReasons;
}

function buildEvaluatedFromDrift({
  page,
  entry,
  existingArtifact,
  staleReasons,
  pageVersionToken,
  sourceVersionToken,
  layoutVersionToken,
  settingsVersionToken
}) {
  if (staleReasons.length === 0) {
    const status =
      existingArtifact.status === "error" && normalizeTrimmedText(existingArtifact.lastErrorMessage)
        ? "error"
        : "synced";
    return buildEvaluatedArtifact({
      page,
      sourceRecord: entry.sourceRecord,
      existingArtifact,
      resolvedPath: entry.resolvedPath,
      artifactRelativePath: entry.artifactRelativePath,
      status,
      staleReasonSummary: status === "error" ? existingArtifact.lastErrorMessage : null,
      pageVersionToken,
      sourceVersionToken,
      layoutVersionToken,
      settingsVersionToken
    });
  }

  return buildEvaluatedArtifact({
    page,
    sourceRecord: entry.sourceRecord,
    existingArtifact,
    resolvedPath: entry.resolvedPath,
    artifactRelativePath: entry.artifactRelativePath,
    status: "stale",
    staleReasonSummary: staleReasons.join("; "),
    pageVersionToken,
    sourceVersionToken,
    layoutVersionToken,
    settingsVersionToken
  });
}

async function evaluateResolvedSourceEntry({
  page,
  entry,
  duplicateResolvedPaths,
  existingArtifact,
  pageVersionToken,
  layoutVersionToken,
  settingsVersionToken,
  deploymentRootDir
}) {
  const sourceVersionToken = buildRecordVersionToken(entry.sourceRecord);
  const hasDuplicatePath =
    Boolean(entry.resolvedPath) && duplicateResolvedPaths.has(entry.resolvedPath);

  if (entry.errorMessage) {
    return buildEntryErrorArtifact({
      page,
      entry,
      existingArtifact,
      pageVersionToken,
      sourceVersionToken,
      layoutVersionToken,
      settingsVersionToken,
      errorMessage: entry.errorMessage
    });
  }

  if (hasDuplicatePath) {
    const duplicatePathMessage = `Path pattern resolves multiple source records to '${entry.resolvedPath}'`;
    return buildEntryErrorArtifact({
      page,
      entry,
      existingArtifact,
      pageVersionToken,
      sourceVersionToken,
      layoutVersionToken,
      settingsVersionToken,
      errorMessage: duplicatePathMessage
    });
  }

  if (!existingArtifact) {
    return buildMissingArtifactState({
      page,
      entry,
      existingArtifact: null,
      pageVersionToken,
      sourceVersionToken,
      layoutVersionToken,
      settingsVersionToken,
      message: "No deployed artifact exists for this source record"
    });
  }

  const storedArtifactPath = normalizeTrimmedText(existingArtifact.artifactRelativePath);
  const storedFileExists = await artifactExists(deploymentRootDir, storedArtifactPath);
  if (!storedFileExists) {
    return buildMissingArtifactState({
      page,
      entry,
      existingArtifact,
      pageVersionToken,
      sourceVersionToken,
      layoutVersionToken,
      settingsVersionToken,
      message: "Generated HTML file is missing from deployment output"
    });
  }

  return buildEvaluatedFromDrift({
    page,
    entry,
    existingArtifact,
    staleReasons: collectArtifactDriftReasons({
      entry,
      existingArtifact,
      pageVersionToken,
      sourceVersionToken,
      layoutVersionToken,
      settingsVersionToken
    }),
    pageVersionToken,
    sourceVersionToken,
    layoutVersionToken,
    settingsVersionToken
  });
}

export async function evaluatePageDeploymentState({
  page,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  if (!page || !isPerRecordDeploymentMode(page.deploymentMode) || !isPagePublished(page.status)) {
    return {
      page,
      instances: []
    };
  }

  const context = await loadPerRecordDeploymentContext({
    page,
    collectionHandlerRegistry,
    resolveSettingsRepository,
    settingsDefinition
  });
  const entries = context.eligibleSourceRecords.map((record) =>
    createResolvedSourceEntry(page, record)
  );
  const duplicateResolvedPaths = mapDuplicateResolvedPaths(entries);
  const artifactBySourceItemId = new Map(
    context.artifactRecords.map((artifact) => [artifact.sourceItemId, artifact])
  );
  const matchedSourceItemIds = new Set();
  const instances = [];

  for (const entry of entries) {
    matchedSourceItemIds.add(entry.sourceRecord.id);
    instances.push(
      await evaluateResolvedSourceEntry({
        page,
        entry,
        duplicateResolvedPaths,
        existingArtifact: artifactBySourceItemId.get(entry.sourceRecord.id) ?? null,
        pageVersionToken: context.pageVersionToken,
        layoutVersionToken: context.layoutVersionToken,
        settingsVersionToken: context.settingsVersionToken,
        deploymentRootDir: context.deploymentRootDir
      })
    );
  }

  for (const artifact of context.artifactRecords) {
    if (!matchedSourceItemIds.has(artifact.sourceItemId)) {
      instances.push(buildOrphanedArtifact(page, artifact));
    }
  }

  return {
    page: buildLiveDeploymentSummary(page, instances),
    instances: [...instances].sort((left, right) =>
      String(left.resolvedPath ?? "").localeCompare(String(right.resolvedPath ?? ""))
    )
  };
}

export {
  createResolvedSourceEntry,
  loadPerRecordDeploymentContext,
  mapDuplicateResolvedPaths
};
