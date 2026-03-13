import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REMOTE_OPS_MODULE_ID = "test-modules-remote-ops";
const TARGETS_COLLECTION_ID = "remote-target-profiles";

function resolveRemoteOpsStateFilePath() {
  const repositoryRootDir = fileURLToPath(new URL("../../../", import.meta.url));
  return path.resolve(
    repositoryRootDir,
    "server",
    "runtime",
    "module-data",
    `${REMOTE_OPS_MODULE_ID}-state.json`
  );
}

async function readRemoteOpsStateSnapshot() {
  try {
    const raw = await fs.readFile(resolveRemoteOpsStateFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function readStoredRemoteTargetProfileById(targetId) {
  if (typeof targetId !== "string" || targetId.trim().length === 0) {
    return null;
  }

  const snapshot = await readRemoteOpsStateSnapshot();
  const items = Array.isArray(snapshot?.[TARGETS_COLLECTION_ID])
    ? snapshot[TARGETS_COLLECTION_ID]
    : [];
  return items.find((item) => item?.id === targetId) ?? null;
}
