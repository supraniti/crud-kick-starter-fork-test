import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolvePageDeploymentRootDir } from "../../test-modules-pages/server/page-deployment-root.mjs";
import { resolveMediaLibraryRootDir } from "../../test-modules-media-manager/server/media-library/media-library-root.mjs";

const MODULE_SERVER_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(MODULE_SERVER_DIR, "../../..");
const REMOTE_OPS_SIM_ROOT_ENV = "CRUD_CONTROL_REMOTE_OPS_SIM_ROOT";
const REMOTE_OPS_LIVE_ROOT_ENV = "CRUD_CONTROL_REMOTE_OPS_LIVE_ROOT";

function resolveOverriddenRoot(envKey, fallbackPath) {
  const overridden = process.env[envKey];
  return overridden ? path.resolve(REPO_ROOT, overridden) : fallbackPath;
}

export function resolveRepoRoot() {
  return REPO_ROOT;
}

export function resolveDeploymentRoot() {
  return resolvePageDeploymentRootDir();
}

export function resolveMediaRoot() {
  return resolveMediaLibraryRootDir();
}

export function resolveRemoteOpsSimulationRoot() {
  return resolveOverriddenRoot(
    REMOTE_OPS_SIM_ROOT_ENV,
    path.join(REPO_ROOT, "remote-runtime", "remote-ops-sim")
  );
}

export function resolveRemoteOpsLiveRoot() {
  return resolveOverriddenRoot(
    REMOTE_OPS_LIVE_ROOT_ENV,
    path.join(REPO_ROOT, "remote-runtime", "remote-ops-live")
  );
}

export function resolveRemoteOpsLiveSessionsRoot() {
  return path.join(resolveRemoteOpsLiveRoot(), "sessions");
}

export function resolveRemoteOpsLiveConnectionsRoot() {
  return path.join(resolveRemoteOpsLiveRoot(), "connections");
}

export function resolveRemoteOpsCredentialsRoot() {
  return path.join(resolveRemoteOpsLiveRoot(), "credentials");
}

export function resolveSimulatedFirestoreRoot(targetId) {
  return path.join(resolveRemoteOpsSimulationRoot(), "firestore", targetId, "documents");
}

export function resolveSimulatedStorageRoot(targetId) {
  return path.join(resolveRemoteOpsSimulationRoot(), "storage", targetId);
}
