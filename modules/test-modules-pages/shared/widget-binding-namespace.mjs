const CANONICAL_BINDING_ROOT = "context";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isCanonicalBindingPath(value) {
  const normalized = normalizeText(value);
  return normalized === CANONICAL_BINDING_ROOT || normalized.startsWith(`${CANONICAL_BINDING_ROOT}.`);
}

export function normalizeCanonicalBindingPath(value, fallback = null) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return fallback;
  }
  if (normalized === CANONICAL_BINDING_ROOT) {
    return CANONICAL_BINDING_ROOT;
  }
  if (normalized.startsWith(`${CANONICAL_BINDING_ROOT}.`)) {
    return normalized;
  }

  const withoutLeadingDot = normalized.replace(/^\.+/, "");
  if (!withoutLeadingDot) {
    return fallback;
  }
  return `${CANONICAL_BINDING_ROOT}.${withoutLeadingDot}`;
}

export function buildCanonicalBindingPath(path = "") {
  return normalizeCanonicalBindingPath(path, CANONICAL_BINDING_ROOT);
}

export function stripCanonicalBindingRoot(value) {
  const normalized = normalizeCanonicalBindingPath(value);
  if (!normalized) {
    return null;
  }
  if (normalized === CANONICAL_BINDING_ROOT) {
    return "";
  }
  return normalized.slice(`${CANONICAL_BINDING_ROOT}.`.length);
}

export { CANONICAL_BINDING_ROOT };
