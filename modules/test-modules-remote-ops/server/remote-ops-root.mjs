import { fileURLToPath } from "node:url";
import path from "node:path";

const MODULE_SERVER_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(MODULE_SERVER_DIR, "../../..");

export function resolveRepoRoot() {
  return REPO_ROOT;
}

export function resolveDeploymentRoot() {
  return path.join(REPO_ROOT, "deployment");
}

export function resolveMediaRoot() {
  return path.join(REPO_ROOT, "media");
}

export function resolveRemoteOpsSimulationRoot() {
  return path.join(REPO_ROOT, "remote-runtime", "remote-ops-sim");
}

export function resolveRemoteOpsLiveRoot() {
  return path.join(REPO_ROOT, "remote-runtime", "remote-ops-live");
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
