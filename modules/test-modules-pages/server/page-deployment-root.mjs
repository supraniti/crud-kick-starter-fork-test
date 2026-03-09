import path from "node:path";
import { fileURLToPath } from "node:url";

function resolvePageDeploymentRootDir({
  overrideDir = process.env.REFERENCE_PAGE_DEPLOYMENT_ROOT_DIR,
  moduleUrl = import.meta.url
} = {}) {
  const normalizedOverride =
    typeof overrideDir === "string" ? overrideDir.trim() : "";
  if (normalizedOverride.length > 0) {
    return path.resolve(normalizedOverride);
  }

  const repositoryRootDir = fileURLToPath(new URL("../../../", moduleUrl));
  return path.resolve(repositoryRootDir, "deployment");
}

export { resolvePageDeploymentRootDir };
