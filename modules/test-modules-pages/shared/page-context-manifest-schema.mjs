import {
  CANONICAL_BINDING_ROOT,
  normalizeCanonicalBindingPath
} from "./widget-binding-namespace.mjs";

const PAGE_CONTEXT_BRANCH_KIND_SET = new Set(["record", "collection", "value"]);
const PAGE_CONTEXT_BRANCH_PROVENANCE_SET = new Set(["declared", "derived"]);

function normalizeText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeEnum(value, allowedValues, fallback) {
  return allowedValues.has(value) ? value : fallback;
}

function clampInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const normalized = Math.trunc(numeric);
  return Math.max(min, Math.min(max, normalized));
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createPageContextBranch(rawValue = {}) {
  const path = normalizeCanonicalBindingPath(rawValue.path, CANONICAL_BINDING_ROOT);
  return {
    path,
    label:
      normalizeOptionalText(rawValue.label) ??
      (path === CANONICAL_BINDING_ROOT ? "Page Context" : path.replace(/^context\./, "")),
    kind: normalizeEnum(rawValue.kind, PAGE_CONTEXT_BRANCH_KIND_SET, "value"),
    provenance: normalizeEnum(rawValue.provenance, PAGE_CONTEXT_BRANCH_PROVENANCE_SET, "declared"),
    bindable: rawValue.bindable !== false,
    initial: rawValue.initial !== false,
    widgetFamilies: Array.isArray(rawValue.widgetFamilies)
      ? [...new Set(rawValue.widgetFamilies.filter((entry) => typeof entry === "string" && entry.trim().length > 0))]
      : [],
    fields: Array.isArray(rawValue.fields)
      ? [...new Set(rawValue.fields.map((entry) => normalizeCanonicalBindingPath(entry)).filter(Boolean))]
      : [],
    notes: normalizeOptionalText(rawValue.notes)
  };
}

export function normalizePageContextManifest(rawValue = {}) {
  const branches = Array.isArray(rawValue.branches)
    ? rawValue.branches.map((entry) => createPageContextBranch(entry))
    : [];
  const uniqueBranchPaths = new Set();
  const normalizedBranches = [];
  for (const branch of branches) {
    if (uniqueBranchPaths.has(branch.path)) {
      continue;
    }
    uniqueBranchPaths.add(branch.path);
    normalizedBranches.push(branch);
  }

  return {
    contractVersion: clampInteger(rawValue.contractVersion, 1, { min: 1, max: 10 }),
    canonicalRoot: CANONICAL_BINDING_ROOT,
    pageKind: normalizeOptionalText(rawValue.pageKind),
    primarySourceType: normalizeOptionalText(rawValue.primarySourceType),
    branches: normalizedBranches
  };
}

export function validatePageContextManifest(rawValue = {}) {
  const manifest = normalizePageContextManifest(rawValue);
  const issues = [];
  const seenFieldPaths = new Set();

  for (const branch of manifest.branches) {
    if (!branch.path || !branch.path.startsWith(`${CANONICAL_BINDING_ROOT}`)) {
      issues.push({
        code: "PAGE_CONTEXT_BRANCH_PATH_INVALID",
        message: `Context branch '${branch.label}' must use the canonical '${CANONICAL_BINDING_ROOT}.*' namespace`
      });
    }
    if (branch.bindable && branch.provenance !== "declared") {
      issues.push({
        code: "PAGE_CONTEXT_BRANCH_BINDABLE_DERIVED",
        message: `Derived branch '${branch.path}' cannot be marked bindable in the current contract`
      });
    }
    for (const fieldPath of branch.fields) {
      if (seenFieldPaths.has(fieldPath)) {
        continue;
      }
      seenFieldPaths.add(fieldPath);
      if (!fieldPath.startsWith(branch.path)) {
        issues.push({
          code: "PAGE_CONTEXT_FIELD_OUTSIDE_BRANCH",
          message: `Field '${fieldPath}' must stay inside branch '${branch.path}'`
        });
      }
    }
  }

  return {
    manifest,
    issues
  };
}

export function clonePageContextManifest(rawValue = {}) {
  return cloneJsonValue(normalizePageContextManifest(rawValue));
}

export {
  PAGE_CONTEXT_BRANCH_KIND_SET,
  PAGE_CONTEXT_BRANCH_PROVENANCE_SET
};
