import {
  createDefaultTargetPolicy,
  normalizeOptionalText,
  normalizeTargetConfig,
  normalizeTargetPolicy,
  toTimestamp
} from "./remote-ops-shared-runtime.mjs";
import { errorPayload } from "./remote-ops-route-runtime.mjs";

const CONTENT_MODULE_ID = "test-modules-content";
const PAGES_MODULE_ID = "test-modules-pages";
const MEDIA_MODULE_ID = "test-modules-media-manager";
const TAXONOMY_MODULE_ID = "test-modules-taxonomy";

const PRODUCT_BINDING_SPECS = Object.freeze([
  {
    key: "posts-projection",
    title: "Posts Projection",
    targetKind: "firestore-projection"
  },
  {
    key: "categories-projection",
    title: "Categories Projection",
    targetKind: "firestore-projection"
  },
  {
    key: "tags-projection",
    title: "Tags Projection",
    targetKind: "firestore-projection"
  },
  {
    key: "translations-projection",
    title: "Translations Projection",
    targetKind: "firestore-projection"
  },
  {
    key: "deployment-storage",
    title: "HTML Deployment",
    targetKind: "deployment-storage"
  },
  {
    key: "media-storage",
    title: "Media Library",
    targetKind: "media-storage"
  },
  {
    key: "browser-delivery",
    title: "Primary Domain",
    targetKind: "browser-delivery"
  }
]);

const MODULE_BINDING_SPECS = Object.freeze([
  {
    moduleId: CONTENT_MODULE_ID,
    fieldId: "remoteProjectionTargetProfileId",
    bindingKey: "posts-projection"
  },
  {
    moduleId: TAXONOMY_MODULE_ID,
    fieldId: "remoteCategoriesProjectionTargetProfileId",
    bindingKey: "categories-projection"
  },
  {
    moduleId: TAXONOMY_MODULE_ID,
    fieldId: "remoteTagsProjectionTargetProfileId",
    bindingKey: "tags-projection"
  },
  {
    moduleId: PAGES_MODULE_ID,
    fieldId: "remoteDeploymentTargetProfileId",
    bindingKey: "deployment-storage"
  },
  {
    moduleId: PAGES_MODULE_ID,
    fieldId: "remoteBrowserDeliveryTargetProfileId",
    bindingKey: "browser-delivery"
  },
  {
    moduleId: MEDIA_MODULE_ID,
    fieldId: "remoteMediaTargetProfileId",
    bindingKey: "media-storage"
  }
]);

function sanitizeBucketPart(value, fallback) {
  const normalized = normalizeOptionalText(value) ?? fallback;
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildManagedBucketName(connectionProfile, suffix) {
  const projectId = sanitizeBucketPart(connectionProfile.projectId, "crud-control");
  const environmentLabel = sanitizeBucketPart(connectionProfile.environmentLabel, "");
  const projectNumber = sanitizeBucketPart(connectionProfile.projectNumber, "");
  const parts = [projectId];
  if (environmentLabel) {
    parts.push(environmentLabel);
  }
  parts.push(suffix);
  if (projectNumber) {
    parts.push(projectNumber);
  }
  return parts.join("-").slice(0, 63).replace(/-+$/g, "");
}

function createProjectionDefaults(projectionScope, firestoreCollectionPath) {
  return {
    adapterMode: "live-gcp",
    config: {
      projectionScope,
      firestoreCollectionPath
    },
    policy: {
      allowDeletes: true,
      allowRestore: false,
      requireDryRunFirst: true
    }
  };
}

function createStorageDefaults(connectionProfile, suffix, prefix, localRootHint) {
  return {
    adapterMode: "live-gcp",
    config: {
      bucketName: buildManagedBucketName(connectionProfile, suffix),
      prefix,
      localRootHint
    },
    policy: {
      allowDeletes: true,
      allowRestore: true,
      requireDryRunFirst: true
    }
  };
}

function createBrowserDefaults(linkedTargets = {}) {
  return {
    adapterMode: "live-gcp",
    config: {
      accessMode: "gcp-temporary",
      stackMode: "direct-storage",
      dnsMode: "external",
      localRootHint: "deployment",
      deploymentTargetProfileId: linkedTargets.deploymentTargetId ?? null,
      mediaTargetProfileId: linkedTargets.mediaTargetId ?? null
    },
    policy: {
      allowDeletes: false,
      allowRestore: false,
      requireDryRunFirst: true
    }
  };
}

function createManagedTargetDefaults(bindingKey, connectionProfile, linkedTargets = {}) {
  const defaultFactories = {
    "posts-projection": () =>
      createProjectionDefaults("published-blog-posts", "publishedPosts"),
    "categories-projection": () =>
      createProjectionDefaults("public-blog-categories", "publicCategories"),
    "tags-projection": () => createProjectionDefaults("public-blog-tags", "publicTags"),
    "translations-projection": () =>
      createProjectionDefaults("public-translations", "publicTranslations"),
    "deployment-storage": () =>
      createStorageDefaults(connectionProfile, "deployment", "site", "deployment"),
    "media-storage": () =>
      createStorageDefaults(connectionProfile, "media", "library", "media"),
    "browser-delivery": () => createBrowserDefaults(linkedTargets)
  };

  return (defaultFactories[bindingKey] ?? defaultFactories["browser-delivery"])();
}

function mergeProjectionConfig(currentConfig, defaults) {
  return normalizeTargetConfig(
    {
      ...currentConfig,
      ...defaults.config,
      projectionScope: currentConfig.projectionScope ?? defaults.config.projectionScope,
      firestoreCollectionPath:
        currentConfig.firestoreCollectionPath ?? defaults.config.firestoreCollectionPath
    },
    "firestore-projection"
  );
}

function mergeStorageConfig(currentConfig, defaults, targetKind) {
  return normalizeTargetConfig(
    {
      ...currentConfig,
      ...defaults.config,
      bucketName: currentConfig.bucketName ?? defaults.config.bucketName,
      prefix: currentConfig.prefix ?? defaults.config.prefix,
      localRootHint: currentConfig.localRootHint ?? defaults.config.localRootHint
    },
    targetKind
  );
}

function mergeBrowserConfig(currentConfig, defaults, linkedTargets = {}) {
  return normalizeTargetConfig(
    {
      ...currentConfig,
      ...defaults.config,
      accessMode: currentConfig.accessMode ?? defaults.config.accessMode,
      stackMode: currentConfig.stackMode ?? defaults.config.stackMode,
      dnsMode: currentConfig.dnsMode ?? defaults.config.dnsMode,
      hostname: currentConfig.hostname ?? null,
      dnsZone: currentConfig.dnsZone ?? null,
      certificateName: currentConfig.certificateName ?? null,
      urlMapHint: currentConfig.urlMapHint ?? null,
      deploymentTargetProfileId:
        linkedTargets.deploymentTargetId ??
        currentConfig.deploymentTargetProfileId ??
        defaults.config.deploymentTargetProfileId,
      mediaTargetProfileId:
        linkedTargets.mediaTargetId ??
        currentConfig.mediaTargetProfileId ??
        defaults.config.mediaTargetProfileId
    },
    "browser-delivery"
  );
}

function mergeManagedConfig(bindingKey, currentTarget, defaults, linkedTargets = {}) {
  const currentConfig =
    currentTarget?.config && typeof currentTarget.config === "object" ? currentTarget.config : {};

  if (bindingKey === "browser-delivery") {
    return mergeBrowserConfig(currentConfig, defaults, linkedTargets);
  }

  if (bindingKey === "deployment-storage" || bindingKey === "media-storage") {
    return mergeStorageConfig(
      currentConfig,
      defaults,
      bindingKey === "deployment-storage" ? "deployment-storage" : "media-storage"
    );
  }

  return mergeProjectionConfig(currentConfig, defaults);
}

function mergeManagedPolicy(currentTarget, defaults) {
  return normalizeTargetPolicy({
    ...createDefaultTargetPolicy(),
    ...(currentTarget?.policy ?? {}),
    ...defaults.policy
  });
}

function asTargetListPayload(value) {
  if (Array.isArray(value?.items)) {
    return value.items;
  }
  return [];
}

function findExistingManagedTarget(connectionTargets, spec) {
  return (
    connectionTargets.find((target) => target?.productBindingKey === spec.key) ??
    connectionTargets.find(
      (target) =>
        !target?.productBindingKey &&
        target?.targetKind === spec.targetKind &&
        normalizeOptionalText(target?.title) === spec.title
    ) ??
    null
  );
}

export function listMissingManagedTargetSpecs(connectionTargets = []) {
  return PRODUCT_BINDING_SPECS.filter(
    (spec) => !findExistingManagedTarget(connectionTargets, spec)
  );
}

export function resolveManagedTargetCompatibilityBundleId(bindingKey) {
  if (
    bindingKey === "posts-projection" ||
    bindingKey === "categories-projection" ||
    bindingKey === "tags-projection" ||
    bindingKey === "translations-projection"
  ) {
    return "firestore-projection";
  }
  if (bindingKey === "deployment-storage") {
    return "deployment-storage";
  }
  if (bindingKey === "media-storage") {
    return "media-storage";
  }
  if (bindingKey === "browser-delivery") {
    return "browser-delivery";
  }
  return null;
}

async function persistTarget(routeContext, currentTarget, nextTarget, reply) {
  if (currentTarget) {
    const updateResult = await routeContext.targetsHandler.update({
      body: nextTarget,
      item: currentTarget,
      reply
    });
    if (updateResult?.ok !== true) {
      return {
        ok: false,
        statusCode: updateResult?.statusCode ?? 400,
        payload:
          updateResult?.payload ??
          errorPayload("REMOTE_OPS_MANAGED_TARGET_UPDATE_FAILED", "Failed to update managed target")
      };
    }
    return {
      ok: true,
      item: updateResult.item,
      changed: true,
      created: false
    };
  }

  const createResult = await routeContext.targetsHandler.create({
    value: nextTarget,
    reply
  });
  if (createResult?.ok !== true) {
    return {
      ok: false,
      statusCode: createResult?.statusCode ?? 400,
      payload:
        createResult?.payload ??
        errorPayload("REMOTE_OPS_MANAGED_TARGET_CREATE_FAILED", "Failed to create managed target")
    };
  }
  return {
    ok: true,
    item: createResult.item,
    changed: true,
    created: true
  };
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

async function bindModuleSetting(routeContext, moduleId, fieldId, targetId, availableTargetIds) {
  const repository =
    typeof routeContext.resolveSettingsRepository === "function"
      ? routeContext.resolveSettingsRepository(moduleId)
      : null;
  if (!repository || typeof repository.transact !== "function") {
    return {
      ok: false,
      statusCode: 409,
      payload: errorPayload(
        "REMOTE_OPS_MODULE_SETTINGS_UNAVAILABLE",
        `Module settings repository is unavailable for '${moduleId}'.`
      )
    };
  }

  const writeResult = await repository.transact(async (workingState) => {
    const currentState = isObject(workingState[moduleId]) ? workingState[moduleId] : {};
    const currentValue = normalizeOptionalText(currentState[fieldId]);
    if (currentValue === targetId) {
      return {
        commit: false,
        value: {
          updated: false,
          preserved: false,
          value: currentValue
        }
      };
    }
    if (currentValue && availableTargetIds.has(currentValue)) {
      return {
        commit: false,
        value: {
          updated: false,
          preserved: true,
          value: currentValue
        }
      };
    }

    workingState[moduleId] = {
      ...currentState,
      [fieldId]: targetId
    };
    return {
      commit: true,
      value: {
        updated: true,
        preserved: false,
        value: targetId
      }
    };
  });

  return {
    ok: true,
    value: writeResult
  };
}

function buildLinkedTargetIds(targetsByBindingKey) {
  return {
    deploymentTargetId: targetsByBindingKey["deployment-storage"]?.id ?? null,
    mediaTargetId: targetsByBindingKey["media-storage"]?.id ?? null
  };
}

async function ensureManagedTargetForSpec({
  routeContext,
  reply,
  spec,
  connectionProfile,
  connectionTargets,
  targetsByBindingKey
}) {
  const linkedTargetIds = buildLinkedTargetIds(targetsByBindingKey);
  const currentTarget =
    findExistingManagedTarget(connectionTargets, spec) ??
    (targetsByBindingKey[spec.key] ?? null);
  const defaults = createManagedTargetDefaults(spec.key, connectionProfile, linkedTargetIds);
  const nextTarget = {
    title: currentTarget?.title ?? spec.title,
    productBindingKey: spec.key,
    connectionProfileId: connectionProfile.id,
    targetKind: spec.targetKind,
    adapterMode: defaults.adapterMode,
    config: mergeManagedConfig(spec.key, currentTarget, defaults, linkedTargetIds),
    policy: mergeManagedPolicy(currentTarget, defaults),
    targetStatus: currentTarget?.targetStatus ?? "draft",
    lastValidatedOn: currentTarget?.lastValidatedOn ?? null,
    lastComparedOn: currentTarget?.lastComparedOn ?? null,
    validationSummary: currentTarget?.validationSummary ?? null,
    compareSummary: currentTarget?.compareSummary ?? null
  };

  return persistTarget(routeContext, currentTarget, nextTarget, reply);
}

async function bindManagedModuleSettings({
  routeContext,
  targetsByBindingKey,
  availableTargetIds
}) {
  const settingBindings = [];

  for (const bindingSpec of MODULE_BINDING_SPECS) {
    const targetId = targetsByBindingKey[bindingSpec.bindingKey]?.id ?? null;
    if (!targetId) {
      continue;
    }
    const bindingResult = await bindModuleSetting(
      routeContext,
      bindingSpec.moduleId,
      bindingSpec.fieldId,
      targetId,
      availableTargetIds
    );
    if (!bindingResult.ok) {
      return bindingResult;
    }
    settingBindings.push({
      ...bindingSpec,
      targetId,
      updated: bindingResult.value?.updated === true,
      preserved: bindingResult.value?.preserved === true
    });
  }

  return {
    ok: true,
    settingBindings
  };
}

export async function ensureStandardProductBundle(routeContext, connectionProfile, reply) {
  const targetsPayload = await routeContext.targetsHandler.list({ limit: 500 });
  const allTargets = asTargetListPayload(targetsPayload);
  const connectionTargets = allTargets.filter(
    (target) => target?.connectionProfileId === connectionProfile.id
  );
  const targetsByBindingKey = {};
  const createdTargetIds = [];
  const updatedTargetIds = [];

  for (const spec of PRODUCT_BINDING_SPECS) {
    const persisted = await ensureManagedTargetForSpec({
      routeContext,
      reply,
      spec,
      connectionProfile,
      connectionTargets,
      targetsByBindingKey
    });
    if (!persisted.ok) {
      return persisted;
    }
    targetsByBindingKey[spec.key] = persisted.item;
    if (persisted.created) {
      createdTargetIds.push(persisted.item.id);
    } else if (persisted.changed) {
      updatedTargetIds.push(persisted.item.id);
    }
  }

  const bindingResult = await bindManagedModuleSettings({
    routeContext,
    targetsByBindingKey,
    availableTargetIds: new Set(allTargets.map((target) => target.id))
  });
  if (!bindingResult.ok) {
    return bindingResult;
  }

  return {
    ok: true,
    bundle: {
      preparedOn: toTimestamp(),
      connectionProfileId: connectionProfile.id,
      targetsByBindingKey,
      createdTargetIds,
      updatedTargetIds,
      settingBindings: bindingResult.settingBindings
    }
  };
}
