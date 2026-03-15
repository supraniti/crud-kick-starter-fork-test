import {
  DEPLOYMENT_ARTIFACTS_COLLECTION_ID,
  isPagePublished,
  isPerRecordDeploymentMode,
  normalizeTrimmedText,
  toTimestamp
} from "./distribution-shared-runtime.mjs";
import { resolvePageDeploymentRootDir } from "./page-deployment-root.mjs";
import {
  buildArtifactBody,
  buildRecordVersionToken,
  deleteArtifactRecord,
  hashValue,
  listArtifactRecords,
  persistDeploymentMetadata,
  readPagesModuleSettings,
  removeArtifactIfPresent,
  resolveArtifactRelativePath,
  resolveKnownArtifactPath,
  upsertArtifactRecord,
  writeArtifactDocument
} from "./page-deployment-render-runtime.mjs";
import {
  createResolvedSourceEntry,
  evaluatePageDeploymentState,
  loadPerRecordDeploymentContext,
  mapDuplicateResolvedPaths
} from "./page-deployment-state-runtime.mjs";

async function clearPerRecordDeploymentArtifacts({
  pageSnapshot,
  collectionHandlerRegistry
}) {
  if (!pageSnapshot?.id) {
    return;
  }

  const artifactHandler = collectionHandlerRegistry.get(DEPLOYMENT_ARTIFACTS_COLLECTION_ID);
  const artifactRecords = await listArtifactRecords(artifactHandler, pageSnapshot.id);
  const deploymentRootDir = resolvePageDeploymentRootDir();

  for (const artifact of artifactRecords) {
    await removeArtifactIfPresent(deploymentRootDir, artifact.artifactRelativePath);
    await deleteArtifactRecord(artifactHandler, artifact);
  }
}

async function writePublishedArtifact({
  handler,
  page,
  previousPage,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  const deploymentRootDir = resolvePageDeploymentRootDir();
  const artifactRelativePath = resolveArtifactRelativePath(page.path);
  const settings = await readPagesModuleSettings({
    resolveSettingsRepository,
    settingsDefinition,
    collectionHandlerRegistry,
    page
  });
  await writeArtifactDocument({
    page,
    artifactRelativePath,
    collectionHandlerRegistry,
    settings,
    resolveSettingsRepository,
    settingsDefinition
  });
  const previousArtifactPath = resolveKnownArtifactPath(previousPage);

  if (previousArtifactPath && previousArtifactPath !== artifactRelativePath) {
    await removeArtifactIfPresent(deploymentRootDir, previousArtifactPath);
  }

  await persistDeploymentMetadata(handler, page, artifactRelativePath);

  return {
    artifactRelativePath
  };
}

async function clearSinglePageDeploymentArtifact({ handler, page, previousPage }) {
  const deploymentRootDir = resolvePageDeploymentRootDir();
  const artifactPath =
    resolveKnownArtifactPath(page) ?? resolveKnownArtifactPath(previousPage);

  await removeArtifactIfPresent(deploymentRootDir, artifactPath);
  if (page) {
    await persistDeploymentMetadata(handler, page, null);
  }
}

async function syncPerRecordEntry({
  context,
  page,
  entry,
  existingArtifact,
  syncTimestamp,
  collectionHandlerRegistry
}) {
  const sourceVersionToken = buildRecordVersionToken(entry.sourceRecord);

  if (entry.errorMessage || context.duplicateResolvedPaths.has(entry.resolvedPath)) {
    const errorMessage =
      entry.errorMessage ??
      `Path pattern resolves multiple source records to '${entry.resolvedPath}'`;
    await upsertArtifactRecord(
      context.artifactHandler,
      buildArtifactBody({
        existingArtifact,
        page,
        sourceRecord: entry.sourceRecord,
        resolvedPath: entry.resolvedPath ?? `/${entry.sourceRecord.id}`,
        artifactRelativePath: entry.artifactRelativePath,
        status: "error",
        staleReasonSummary: errorMessage,
        pageVersionToken: context.pageVersionToken,
        sourceVersionToken,
        layoutVersionToken: context.layoutVersionToken,
        settingsVersionToken: context.settingsVersionToken,
        lastSyncedOn: existingArtifact?.lastSyncedOn ?? null,
        lastEvaluatedOn: syncTimestamp,
        lastErrorMessage: errorMessage
      }),
      existingArtifact
    );
    return;
  }

  try {
    const previousArtifactPath = normalizeTrimmedText(existingArtifact?.artifactRelativePath);
    if (previousArtifactPath && previousArtifactPath !== entry.artifactRelativePath) {
      await removeArtifactIfPresent(context.deploymentRootDir, previousArtifactPath);
    }

    const { payload, htmlDocument } = await writeArtifactDocument({
      page,
      sourceRecord: entry.sourceRecord,
      artifactRelativePath: entry.artifactRelativePath,
      collectionHandlerRegistry,
      settings: context.settings,
      resolveSettingsRepository: context.resolveSettingsRepository,
      settingsDefinition: context.settingsDefinition
    });

    await upsertArtifactRecord(
      context.artifactHandler,
      buildArtifactBody({
        existingArtifact,
        page,
        sourceRecord: entry.sourceRecord,
        resolvedPath: entry.resolvedPath,
        artifactRelativePath: entry.artifactRelativePath,
        status: "synced",
        staleReasonSummary: null,
        pageVersionToken: context.pageVersionToken,
        sourceVersionToken,
        layoutVersionToken: context.layoutVersionToken,
        settingsVersionToken: context.settingsVersionToken,
        payloadHash: hashValue(payload),
        htmlHash: hashValue(htmlDocument),
        lastSyncedOn: syncTimestamp,
        lastEvaluatedOn: syncTimestamp,
        lastErrorMessage: null
      }),
      existingArtifact
    );
  } catch (error) {
    await upsertArtifactRecord(
      context.artifactHandler,
      buildArtifactBody({
        existingArtifact,
        page,
        sourceRecord: entry.sourceRecord,
        resolvedPath: entry.resolvedPath,
        artifactRelativePath: entry.artifactRelativePath,
        status: "error",
        staleReasonSummary: error?.message ?? "Deployment sync failed",
        pageVersionToken: context.pageVersionToken,
        sourceVersionToken,
        layoutVersionToken: context.layoutVersionToken,
        settingsVersionToken: context.settingsVersionToken,
        lastSyncedOn: existingArtifact?.lastSyncedOn ?? null,
        lastEvaluatedOn: syncTimestamp,
        lastErrorMessage: error?.message ?? "Deployment sync failed"
      }),
      existingArtifact
    );
  }
}

async function removeUnsyncedArtifactRecords(context, syncedSourceItemIds) {
  for (const artifact of context.artifactRecords) {
    if (!syncedSourceItemIds.has(artifact.sourceItemId)) {
      await removeArtifactIfPresent(context.deploymentRootDir, artifact.artifactRelativePath);
      await deleteArtifactRecord(context.artifactHandler, artifact);
    }
  }
}

async function syncPerRecordPageDeployment({
  page,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  const context = await loadPerRecordDeploymentContext({
    page,
    collectionHandlerRegistry,
    resolveSettingsRepository,
    settingsDefinition
  });
  const syncTimestamp = toTimestamp();
  const entries = context.eligibleSourceRecords.map((record) =>
    createResolvedSourceEntry(page, record)
  );
  context.duplicateResolvedPaths = mapDuplicateResolvedPaths(entries);
  const artifactBySourceItemId = new Map(
    context.artifactRecords.map((artifact) => [artifact.sourceItemId, artifact])
  );
  const syncedSourceItemIds = new Set();

  for (const entry of entries) {
    syncedSourceItemIds.add(entry.sourceRecord.id);
    await syncPerRecordEntry({
      context,
      page,
      entry,
      existingArtifact: artifactBySourceItemId.get(entry.sourceRecord.id) ?? null,
      syncTimestamp,
      collectionHandlerRegistry
    });
  }

  await removeUnsyncedArtifactRecords(context, syncedSourceItemIds);

  return evaluatePageDeploymentState({
    page,
    collectionHandlerRegistry,
    resolveSettingsRepository,
    settingsDefinition
  });
}

export async function runExplicitPageDeploymentSync({
  handler,
  page,
  previousPage = null,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  if (!page || !isPagePublished(page.status)) {
    return {
      artifactRelativePath: null,
      page,
      instances: []
    };
  }

  if (isPerRecordDeploymentMode(page.deploymentMode)) {
    return syncPerRecordPageDeployment({
      page,
      collectionHandlerRegistry,
      resolveSettingsRepository,
      settingsDefinition
    });
  }

  const result = await writePublishedArtifact({
    handler,
    page,
    previousPage,
    collectionHandlerRegistry,
    resolveSettingsRepository,
    settingsDefinition
  });
  return {
    ...result,
    page,
    instances: []
  };
}

export async function syncPageDeploymentOutputs({
  handler,
  page,
  previousPage = null,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  const wasPerRecord = isPerRecordDeploymentMode(previousPage?.deploymentMode);
  const isPerRecord = isPerRecordDeploymentMode(page?.deploymentMode);

  if (!page) {
    if (wasPerRecord) {
      await clearPerRecordDeploymentArtifacts({
        pageSnapshot: previousPage,
        collectionHandlerRegistry
      });
      return {
        artifactRelativePath: null
      };
    }

    await clearSinglePageDeploymentArtifact({
      handler,
      page: null,
      previousPage
    });
    return {
      artifactRelativePath: null
    };
  }

  if (!isPagePublished(page.status)) {
    if (isPerRecord || wasPerRecord) {
      await clearPerRecordDeploymentArtifacts({
        pageSnapshot: page.id ? page : previousPage,
        collectionHandlerRegistry
      });
      return {
        artifactRelativePath: null
      };
    }

    await clearSinglePageDeploymentArtifact({
      handler,
      page,
      previousPage
    });
    return {
      artifactRelativePath: null
    };
  }

  if (isPerRecord) {
    if (!wasPerRecord && previousPage) {
      await clearSinglePageDeploymentArtifact({
        handler,
        page,
        previousPage
      });
    }
    return {
      artifactRelativePath: null
    };
  }

  if (wasPerRecord) {
    await clearPerRecordDeploymentArtifacts({
      pageSnapshot: previousPage,
      collectionHandlerRegistry
    });
  }

  return writePublishedArtifact({
    handler,
    page,
    previousPage,
    collectionHandlerRegistry,
    resolveSettingsRepository,
    settingsDefinition
  });
}

export async function listPageDeploymentInstances({
  page,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  const evaluation = await evaluatePageDeploymentState({
    page,
    collectionHandlerRegistry,
    resolveSettingsRepository,
    settingsDefinition
  });
  return evaluation.instances;
}

export async function mergeLivePageDeploymentState({
  page,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  if (!page || !isPerRecordDeploymentMode(page.deploymentMode) || !isPagePublished(page.status)) {
    return page;
  }

  const evaluation = await evaluatePageDeploymentState({
    page,
    collectionHandlerRegistry,
    resolveSettingsRepository,
    settingsDefinition
  });
  return evaluation.page;
}

export async function syncPageDeploymentArtifact({
  handler,
  page,
  previousPage,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  return syncPageDeploymentOutputs({
    handler,
    page,
    previousPage,
    collectionHandlerRegistry,
    resolveSettingsRepository,
    settingsDefinition
  });
}

export async function removeDeletedPageDeploymentArtifact(
  pageSnapshot,
  collectionHandlerRegistry = null
) {
  if (isPerRecordDeploymentMode(pageSnapshot?.deploymentMode) && collectionHandlerRegistry) {
    await clearPerRecordDeploymentArtifacts({
      pageSnapshot,
      collectionHandlerRegistry
    });
    return;
  }

  await clearSinglePageDeploymentArtifact({
    handler: null,
    page: null,
    previousPage: pageSnapshot
  });
}

export { evaluatePageDeploymentState } from "./page-deployment-state-runtime.mjs";
