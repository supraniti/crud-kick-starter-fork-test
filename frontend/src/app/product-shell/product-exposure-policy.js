import { DEVELOPER_MODE_STORAGE_KEY } from "../parts/01-app-config.js";

function parseDeveloperModeToken(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (["1", "true", "on", "yes"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "off", "no"].includes(normalized)) {
    return false;
  }
  return null;
}

function readDeveloperModeQueryOverride() {
  try {
    const params = new URLSearchParams(window.location.search);
    return parseDeveloperModeToken(params.get("developerMode"));
  } catch {
    return null;
  }
}

export function writeDeveloperMode(enabled) {
  try {
    if (enabled) {
      window.localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, "1");
      return;
    }

    window.localStorage.removeItem(DEVELOPER_MODE_STORAGE_KEY);
  } catch {
    // Local storage is unavailable in this runtime.
  }
}

export function readDeveloperMode() {
  const queryOverride = readDeveloperModeQueryOverride();
  if (queryOverride !== null) {
    writeDeveloperMode(queryOverride);
    return queryOverride;
  }

  try {
    return window.localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
