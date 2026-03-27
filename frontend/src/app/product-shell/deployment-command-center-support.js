import { resolveManagedProductBindingKey } from "../../../../modules/test-modules-remote-ops/shared/product-binding-support.mjs";

const TRANSLATIONS_BINDING_KEY = "translations-projection";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sumCompareChanges(compareSummary = null) {
  const summary = compareSummary ?? {};
  return (
    Number(summary.createCount ?? 0) +
    Number(summary.updateCount ?? 0) +
    Number(summary.deleteCount ?? 0) +
    Number(summary.localOnlyCount ?? 0) +
    Number(summary.remoteOnlyCount ?? 0)
  );
}

function resolveTargetCompareState(target) {
  if (!target || typeof target !== "object") {
    return {
      known: false,
      clean: false,
      detail: "Target is not configured."
    };
  }

  const compareSummary = target.compareSummary ?? null;
  const compareState = normalizeText(compareSummary?.state);
  const changeCount = sumCompareChanges(compareSummary);

  if (compareState === "clean") {
    return {
      known: true,
      clean: true,
      detail: "Remote compare is clean."
    };
  }

  if (compareState && compareState !== "unknown") {
    return {
      known: true,
      clean: changeCount === 0,
      detail:
        changeCount > 0
          ? `${changeCount} remote change${changeCount === 1 ? "" : "s"} still need sync.`
          : "Remote compare is loaded."
    };
  }

  if (normalizeText(target.lastComparedOn)) {
    return {
      known: true,
      clean: changeCount === 0,
      detail:
        changeCount > 0
          ? `${changeCount} remote change${changeCount === 1 ? "" : "s"} still need sync.`
          : "Remote compare is clean."
    };
  }

  return {
    known: false,
    clean: false,
    detail: "Remote compare has not been loaded yet."
  };
}

function buildTargetMaps(targets = []) {
  const byId = new Map();
  const byBindingKey = new Map();

  toArray(targets).forEach((target) => {
    if (!target || typeof target !== "object") {
      return;
    }
    const id = normalizeText(target.id);
    if (id) {
      byId.set(id, target);
    }
    const bindingKey = resolveManagedProductBindingKey(target);
    if (bindingKey) {
      byBindingKey.set(bindingKey, target);
    }
  });

  return {
    byId,
    byBindingKey
  };
}

function resolveExplicitTarget(bundle, targetMaps, fieldId) {
  const targetId = normalizeText(bundle?.[fieldId]);
  return targetId ? targetMaps.byId.get(targetId) ?? null : null;
}

function resolveBundleState(bundle, page, targetMaps) {
  const issues = [];
  const unknowns = [];
  let needsSync = false;

  if (!page) {
    return {
      bundleId: normalizeText(bundle?.id),
      canRun: false,
      needsSync: false,
      label: "Needs setup",
      detail: "Choose the page this release owns before it can sync."
    };
  }

  if (page.deploymentStatus !== "clean") {
    needsSync = true;
    issues.push(
      page.deploymentStatus === "stale"
        ? "Page output is stale."
        : page.deploymentStatus === "missing"
          ? "Page output is missing."
          : "Page output needs attention."
    );
  }

  const explicitTargets = [
    { fieldId: "postsProjectionTargetProfileId", label: "Posts data target" },
    { fieldId: "categoriesProjectionTargetProfileId", label: "Categories data target" },
    { fieldId: "tagsProjectionTargetProfileId", label: "Tags data target" },
    { fieldId: "mediaTargetProfileId", label: "Media target" },
    { fieldId: "deploymentTargetProfileId", label: "HTML target" }
  ];

  explicitTargets.forEach(({ fieldId, label }) => {
    const targetId = normalizeText(bundle?.[fieldId]);
    if (!targetId) {
      issues.push(`${label} is missing.`);
      return;
    }
    const target = resolveExplicitTarget(bundle, targetMaps, fieldId);
    if (!target) {
      issues.push(`${label} was not found.`);
      return;
    }
    const compareState = resolveTargetCompareState(target);
    if (!compareState.known) {
      unknowns.push(compareState.detail);
      return;
    }
    if (!compareState.clean) {
      needsSync = true;
      issues.push(compareState.detail);
    }
  });

  const translationsTarget = targetMaps.byBindingKey.get(TRANSLATIONS_BINDING_KEY) ?? null;
  if (!translationsTarget) {
    issues.push("Translations target is missing.");
  } else {
    const compareState = resolveTargetCompareState(translationsTarget);
    if (!compareState.known) {
      unknowns.push(compareState.detail);
    } else if (!compareState.clean) {
      needsSync = true;
      issues.push(compareState.detail);
    }
  }

  if (issues.some((issue) => issue.includes("missing") || issue.includes("not found"))) {
    return {
      bundleId: normalizeText(bundle?.id),
      canRun: false,
      needsSync: false,
      label: "Needs attention",
      detail: issues[0]
    };
  }

  if (needsSync) {
    return {
      bundleId: normalizeText(bundle?.id),
      canRun: true,
      needsSync: true,
      label: "Needs sync",
      detail: issues[0] ?? "This release still has unpublished changes."
    };
  }

  if (unknowns.length > 0) {
    return {
      bundleId: normalizeText(bundle?.id),
      canRun: true,
      needsSync: true,
      label: "Check state",
      detail: unknowns[0]
    };
  }

  return {
    bundleId: normalizeText(bundle?.id),
    canRun: false,
    needsSync: false,
    label: "Current",
    detail: "This release already matches local state."
  };
}

export function buildBundleSyncState({ bundles = [], pages = [], targets = [] }) {
  const targetMaps = buildTargetMaps(targets);
  const pagesById = new Map(toArray(pages).map((page) => [normalizeText(page?.id), page]));
  const bundleStates = toArray(bundles).map((bundle) => {
    const pageId = normalizeText(bundle?.pageId);
    const page = pageId ? pagesById.get(pageId) ?? null : null;
    return resolveBundleState(bundle, page, targetMaps);
  });

  return {
    byBundleId: new Map(bundleStates.map((entry) => [entry.bundleId, entry])),
    canSyncAny: bundleStates.some((entry) => entry.canRun && entry.needsSync),
    entries: bundleStates
  };
}

const PERSISTED_RUN_STORAGE_KEY = "deployment-command-center-active-run-v1";

export function loadPersistedDeploymentRun() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const rawValue = window.localStorage.getItem(PERSISTED_RUN_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function persistDeploymentRun(value) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  if (!value || typeof value !== "object") {
    window.localStorage.removeItem(PERSISTED_RUN_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(PERSISTED_RUN_STORAGE_KEY, JSON.stringify(value));
}

export function clearPersistedDeploymentRun() {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(PERSISTED_RUN_STORAGE_KEY);
}

