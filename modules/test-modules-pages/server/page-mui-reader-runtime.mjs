import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendRuntimeAssetVersion } from "./page-runtime-asset-version-runtime.mjs";

const DEFAULT_PAGE_MUI_READER_ASSET_PATH = "assets/page-mui-reader.global.js";

function countPathSegments(pagePath) {
  return String(pagePath || "")
    .split("/")
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

function buildRelativeAssetUrl(pagePath) {
  const segmentCount = countPathSegments(pagePath);
  return `${"../".repeat(segmentCount)}${DEFAULT_PAGE_MUI_READER_ASSET_PATH}`;
}

export function resolvePageMuiReaderSourcePath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../dist/page-mui-reader.global.js");
}

export function buildPageMuiReaderAssetUrl(payload = {}) {
  const publicOrigin =
    typeof payload?.delivery?.publicOrigin === "string" && payload.delivery.publicOrigin.trim().length > 0
      ? payload.delivery.publicOrigin.trim().replace(/\/+$/g, "")
      : null;
  if (!publicOrigin) {
    return buildRelativeAssetUrl(payload?.page?.path ?? "/");
  }
  return appendRuntimeAssetVersion(
    `${publicOrigin}/${DEFAULT_PAGE_MUI_READER_ASSET_PATH}`,
    payload,
    resolvePageMuiReaderSourcePath()
  );
}

export async function syncPageMuiReaderAsset(deploymentRootDir) {
  const sourcePath = resolvePageMuiReaderSourcePath();
  const targetPath = path.resolve(deploymentRootDir, DEFAULT_PAGE_MUI_READER_ASSET_PATH);
  await fs.access(sourcePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  return targetPath;
}
