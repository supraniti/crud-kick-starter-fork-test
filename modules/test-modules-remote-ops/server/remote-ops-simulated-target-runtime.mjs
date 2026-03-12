import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  PAGES_COLLECTION_ID,
  POSTS_COLLECTION_ID,
  normalizeTargetConfig,
  stringifyCanonicalJson
} from "./remote-ops-shared-runtime.mjs";
import {
  resolveDeploymentRoot,
  resolveMediaRoot,
  resolveSimulatedFirestoreRoot,
  resolveSimulatedStorageRoot
} from "./remote-ops-root.mjs";

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, {
    recursive: true
  });
}

function hashBuffer(buffer, algorithm = "sha1", encoding = "hex") {
  return createHash(algorithm).update(buffer).digest(encoding);
}

export async function collectFileHashes(rootPath, prefix = "", hashOptions = {}) {
  const algorithm = hashOptions.algorithm ?? "sha1";
  const encoding = hashOptions.encoding ?? "hex";
  const entries = new Map();
  if (!(await pathExists(rootPath))) {
    return entries;
  }

  const directoryEntries = await fs.readdir(rootPath, {
    withFileTypes: true
  });
  for (const entry of directoryEntries) {
    const nextRelativePath = prefix.length > 0 ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      const childEntries = await collectFileHashes(absolutePath, nextRelativePath, hashOptions);
      for (const [relativePath, metadata] of childEntries.entries()) {
        entries.set(relativePath, metadata);
      }
      continue;
    }
    const content = await fs.readFile(absolutePath);
    entries.set(nextRelativePath, {
      relativePath: nextRelativePath,
      absolutePath,
      sizeBytes: content.length,
      hash: hashBuffer(content, algorithm, encoding)
    });
  }
  return entries;
}

export function buildDiff(localEntries, remoteEntries) {
  const createKeys = [];
  const updateKeys = [];
  const deleteKeys = [];
  const sampleKeys = [];

  for (const [relativePath, localMetadata] of localEntries.entries()) {
    const remoteMetadata = remoteEntries.get(relativePath) ?? null;
    if (!remoteMetadata) {
      createKeys.push(relativePath);
      continue;
    }
    if (remoteMetadata.hash !== localMetadata.hash) {
      updateKeys.push(relativePath);
    }
  }

  for (const relativePath of remoteEntries.keys()) {
    if (!localEntries.has(relativePath)) {
      deleteKeys.push(relativePath);
    }
  }

  for (const key of [...createKeys, ...updateKeys, ...deleteKeys].slice(0, 8)) {
    sampleKeys.push(key);
  }

  return {
    createKeys,
    updateKeys,
    deleteKeys,
    sampleKeys,
    localOnlyCount: createKeys.length,
    remoteOnlyCount: deleteKeys.length,
    isClean: createKeys.length === 0 && updateKeys.length === 0 && deleteKeys.length === 0
  };
}

export function buildCompareSummaryFromDiff(diff, message) {
  return {
    state: diff.isClean ? "clean" : "drift",
    message,
    createCount: diff.createKeys.length,
    updateCount: diff.updateKeys.length,
    deleteCount: diff.deleteKeys.length,
    localOnlyCount: diff.localOnlyCount,
    remoteOnlyCount: diff.remoteOnlyCount,
    sampleKeys: diff.sampleKeys
  };
}

export function buildRunSummaryFromDiff(diff, warnings = [], restoredCount = 0) {
  return {
    createCount: diff.createKeys.length,
    updateCount: diff.updateKeys.length,
    deleteCount: diff.deleteKeys.length,
    restoredCount,
    sampleKeys: diff.sampleKeys,
    warnings
  };
}

export function createProcedureMessage(noun, diff) {
  if (diff.isClean) {
    return `${noun} is clean`;
  }
  return `${diff.createKeys.length} create, ${diff.updateKeys.length} update, ${diff.deleteKeys.length} delete`;
}

async function writeRelativeFile(rootPath, relativePath, sourceAbsolutePath) {
  const destinationPath = path.join(rootPath, relativePath);
  await ensureDir(path.dirname(destinationPath));
  await fs.copyFile(sourceAbsolutePath, destinationPath);
}

async function removeRelativeFile(rootPath, relativePath) {
  const targetPath = path.join(rootPath, relativePath);
  if (await pathExists(targetPath)) {
    await fs.rm(targetPath, {
      force: true
    });
  }
}

async function buildPublishedPostProjectionMap(collectionHandlerRegistry, targetProfile) {
  const postsHandler = collectionHandlerRegistry.get(POSTS_COLLECTION_ID);
  const projectionMap = new Map();
  if (!postsHandler) {
    return projectionMap;
  }

  const payload = await postsHandler.list({
    limit: 5000,
    offset: 0
  });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const collectionPath =
    normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).firestoreCollectionPath
    ?? "content/posts";

  for (const item of items) {
    if (item?.status !== "published") {
      continue;
    }
    const documentId = typeof item.slug === "string" && item.slug.trim().length > 0 ? item.slug.trim() : item.id;
    const document = {
      id: item.id,
      slug: item.slug ?? null,
      title: item.title ?? null,
      excerpt: item.excerpt ?? null,
      status: item.status,
      publishedOn: item.publishedOn ?? null,
      updatedOn: item.updatedOn ?? null,
      pagePath: item.pagePath ?? null,
      seoTitle: item.seoTitle ?? null,
      seoDescription: item.seoDescription ?? null
    };
    const content = Buffer.from(stringifyCanonicalJson(document), "utf8");
    const relativePath = `${collectionPath}/${documentId}.json`;
    projectionMap.set(relativePath, {
      relativePath,
      absolutePath: null,
      sizeBytes: content.length,
      hash: hashBuffer(content),
      content,
      documentData: document
    });
  }
  return projectionMap;
}

async function buildPublishedPagesProjectionMap(collectionHandlerRegistry, targetProfile) {
  const pagesHandler = collectionHandlerRegistry.get(PAGES_COLLECTION_ID);
  const projectionMap = new Map();
  if (!pagesHandler) {
    return projectionMap;
  }

  const payload = await pagesHandler.list({
    limit: 5000,
    offset: 0
  });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const collectionPath =
    normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).firestoreCollectionPath
    ?? "content/pages";

  for (const item of items) {
    if (item?.status !== "published") {
      continue;
    }
    const documentId = typeof item.path === "string" && item.path.length > 1
      ? item.path.replace(/^\/+/, "").replace(/\//g, "-")
      : item.id;
    const document = {
      id: item.id,
      title: item.title ?? null,
      path: item.path ?? null,
      status: item.status,
      pageKind: item.pageKind ?? null,
      layoutKey: item.layoutKey ?? null,
      publishedOn: item.publishedOn ?? null,
      updatedOn: item.updatedOn ?? null
    };
    const content = Buffer.from(stringifyCanonicalJson(document), "utf8");
    const relativePath = `${collectionPath}/${documentId}.json`;
    projectionMap.set(relativePath, {
      relativePath,
      absolutePath: null,
      sizeBytes: content.length,
      hash: hashBuffer(content),
      content,
      documentData: document
    });
  }
  return projectionMap;
}

export async function buildFirestoreProjectionMap(collectionHandlerRegistry, targetProfile) {
  const projectionScope = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).projectionScope;
  if (projectionScope === "published-pages") {
    return buildPublishedPagesProjectionMap(collectionHandlerRegistry, targetProfile);
  }
  return buildPublishedPostProjectionMap(collectionHandlerRegistry, targetProfile);
}

export async function collectRemoteFirestoreEntries(targetProfile) {
  return collectFileHashes(resolveSimulatedFirestoreRoot(targetProfile.id));
}

export async function collectRemoteStorageEntries(targetProfile) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const rootPath = config.prefix
    ? path.join(resolveSimulatedStorageRoot(targetProfile.id), config.prefix)
    : resolveSimulatedStorageRoot(targetProfile.id);
  return collectFileHashes(rootPath);
}

export function resolveLocalStorageRoot(targetProfile) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  if (config.localRootHint === "media") {
    return resolveMediaRoot();
  }
  return resolveDeploymentRoot();
}

export async function copyFirestoreProjectionEntries(targetProfile, localEntries, diff, allowDeletes) {
  const remoteRoot = resolveSimulatedFirestoreRoot(targetProfile.id);
  await ensureDir(remoteRoot);
  for (const relativePath of [...diff.createKeys, ...diff.updateKeys]) {
    const entry = localEntries.get(relativePath);
    if (!entry) {
      continue;
    }
    const destinationPath = path.join(remoteRoot, relativePath);
    await ensureDir(path.dirname(destinationPath));
    await fs.writeFile(destinationPath, entry.content);
  }
  if (allowDeletes) {
    for (const relativePath of diff.deleteKeys) {
      await removeRelativeFile(remoteRoot, relativePath);
    }
  }
}

export async function copyStorageEntries(targetProfile, localEntries, diff, allowDeletes) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const remoteRoot = config.prefix
    ? path.join(resolveSimulatedStorageRoot(targetProfile.id), config.prefix)
    : resolveSimulatedStorageRoot(targetProfile.id);
  await ensureDir(remoteRoot);
  for (const relativePath of [...diff.createKeys, ...diff.updateKeys]) {
    const entry = localEntries.get(relativePath);
    if (!entry?.absolutePath) {
      continue;
    }
    await writeRelativeFile(remoteRoot, relativePath, entry.absolutePath);
  }
  if (allowDeletes) {
    for (const relativePath of diff.deleteKeys) {
      await removeRelativeFile(remoteRoot, relativePath);
    }
  }
}

export async function restoreStorageTarget(targetProfile) {
  const localEntries = await collectFileHashes(resolveLocalStorageRoot(targetProfile));
  const remoteEntries = await collectRemoteStorageEntries(targetProfile);
  const diff = buildDiff(localEntries, remoteEntries);
  const restoreKey = diff.deleteKeys[0] ?? null;
  if (!restoreKey) {
    return {
      status: "warning",
      message: "No remote-only item is available to restore",
      runSummary: buildRunSummaryFromDiff(diff, ["No remote-only item is available to restore"], 0)
    };
  }

  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const remoteRoot = config.prefix
    ? path.join(resolveSimulatedStorageRoot(targetProfile.id), config.prefix)
    : resolveSimulatedStorageRoot(targetProfile.id);
  const localRoot = resolveLocalStorageRoot(targetProfile);
  const sourceAbsolutePath = path.join(remoteRoot, restoreKey);
  await writeRelativeFile(localRoot, restoreKey, sourceAbsolutePath);

  return {
    status: "succeeded",
    message: `Restored '${restoreKey}' to local ${targetProfile.targetKind === "media-storage" ? "media" : "deployment"}`,
    runSummary: buildRunSummaryFromDiff(diff, [], 1),
    restoredKey: restoreKey
  };
}

export async function seedSimulatedRemoteExtraFile(targetProfile, timestampLabel) {
  const config = normalizeTargetConfig(targetProfile.config, targetProfile.targetKind);
  const remoteRoot = config.prefix
    ? path.join(resolveSimulatedStorageRoot(targetProfile.id), config.prefix)
    : resolveSimulatedStorageRoot(targetProfile.id);
  const relativePath = targetProfile.targetKind === "media-storage"
    ? "simulated/orphan-media.txt"
    : "simulated/orphan-page/index.html";
  const destinationPath = path.join(remoteRoot, relativePath);
  await ensureDir(path.dirname(destinationPath));
  await fs.writeFile(destinationPath, `seeded ${timestampLabel}\n`, "utf8");
  return relativePath;
}
