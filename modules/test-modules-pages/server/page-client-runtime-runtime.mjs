import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeScriptUrlList } from "./distribution-shared-runtime.mjs";

const DEFAULT_CLIENT_RUNTIME_ASSET_URL = "/assets/client-runtime.global.js";
const DEFAULT_PAGE_PAYLOAD_DATASET = "page-payload";

function resolveAssetRelativePath(assetUrl) {
  return String(assetUrl || "")
    .split(/[?#]/, 1)[0]
    .replace(/^\/+/, "");
}

function resolveClientRuntimeSourcePath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../../../client-runtime/dist/client-runtime.global.js");
}

export function buildClientRuntimeContract(payload = {}) {
  return {
    contractVersion: 1,
    assetUrl: DEFAULT_CLIENT_RUNTIME_ASSET_URL,
    bootstrapDatasets: [DEFAULT_PAGE_PAYLOAD_DATASET],
    context: {
      pagePayloadScriptId: "page-data",
      pageId: payload?.page?.id ?? "",
      pagePath: payload?.page?.path ?? "",
      publicOrigin: payload?.delivery?.publicOrigin ?? null,
      publicUrl: payload?.delivery?.publicUrl ?? null,
      publicMediaBaseUrl: payload?.delivery?.publicMediaBaseUrl ?? null
    },
    queries: [
      {
        resource: "page",
        query: "current",
        policy: "local-first",
        dataset: DEFAULT_PAGE_PAYLOAD_DATASET
      }
    ],
    actions: [],
    datasets: [
      {
        dataset: DEFAULT_PAGE_PAYLOAD_DATASET,
        bootstrapMode: "inline-json-script",
        inlineScriptId: "page-data",
        recordMode: "single-item",
        versionPath: "resolvedAt",
        syncTokenPath: "page.id"
      }
    ]
  };
}

export function attachClientRuntimeContract(payload = {}) {
  return {
    ...payload,
    runtime: {
      ...(payload?.runtime && typeof payload.runtime === "object" ? payload.runtime : {}),
      clientRuntime: buildClientRuntimeContract(payload)
    }
  };
}

export function resolvePageRuntimeScriptUrls(payload, runtimeScriptUrls = []) {
  const normalizedUrls = normalizeScriptUrlList(runtimeScriptUrls);
  const clientRuntimeAssetUrl = payload?.runtime?.clientRuntime?.assetUrl ?? DEFAULT_CLIENT_RUNTIME_ASSET_URL;
  if (normalizedUrls.includes(clientRuntimeAssetUrl)) {
    return normalizedUrls;
  }
  return [clientRuntimeAssetUrl, ...normalizedUrls];
}

export async function syncClientRuntimeAsset(deploymentRootDir, assetUrl = DEFAULT_CLIENT_RUNTIME_ASSET_URL) {
  const sourcePath = resolveClientRuntimeSourcePath();
  const targetPath = path.resolve(deploymentRootDir, resolveAssetRelativePath(assetUrl));
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  return targetPath;
}
