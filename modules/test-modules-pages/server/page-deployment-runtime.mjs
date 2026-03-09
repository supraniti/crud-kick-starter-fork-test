import fs from "node:fs/promises";
import path from "node:path";
import { resolveGeneratedModuleSettingsValues } from "../../../server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime/module-settings-runtime-helpers.mjs";
import {
  DEFAULT_APP_MOUNT_TAG_NAME,
  MODULE_ID,
  hasUnsafePathSegments,
  isPagePublished,
  normalizeAppMountTagName,
  normalizePagePath,
  normalizeScriptUrlList,
  normalizeTrimmedText,
  toTimestamp
} from "./distribution-shared-runtime.mjs";
import { resolvePageDeliveryPayload } from "./page-delivery-runtime.mjs";
import { resolvePageDeploymentRootDir } from "./page-deployment-root.mjs";

function escapeHtmlText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(value) {
  return escapeHtmlText(value).replace(/"/g, "&quot;");
}

function serializeJsonForScript(value) {
  return JSON.stringify(value ?? null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildMetaTag(attributeName, attributeValue, content) {
  if (!content) {
    return null;
  }
  return `<meta ${attributeName}="${escapeHtmlAttribute(attributeValue)}" content="${escapeHtmlAttribute(content)}">`;
}

function resolvePageTitle(payload) {
  return payload?.head?.title ?? payload?.page?.title ?? "Untitled Page";
}

function resolvePageDescription(payload) {
  return payload?.head?.description ?? "";
}

function resolveOpenGraphField(payload, fieldId, fallback = "") {
  return payload?.head?.openGraph?.[fieldId] ?? fallback;
}

function resolveOpenGraphType(payload) {
  return payload?.page?.pageKind === "content-detail" ? "article" : "website";
}

function resolveHeadContent(payload) {
  const title = resolvePageTitle(payload);
  const description = resolvePageDescription(payload);
  return {
    title,
    description,
    canonicalUrl: payload?.head?.canonicalUrl ?? "",
    ogTitle: resolveOpenGraphField(payload, "title", title),
    ogDescription: resolveOpenGraphField(payload, "description", description),
    ogImageMediaId: resolveOpenGraphField(payload, "imageMediaId"),
    ogType: resolveOpenGraphType(payload)
  };
}

function buildCanonicalHeadTags(canonicalUrl) {
  if (!canonicalUrl) {
    return [];
  }
  return [
    `<link rel="canonical" href="${escapeHtmlAttribute(canonicalUrl)}">`,
    buildMetaTag("property", "og:url", canonicalUrl)
  ];
}

function buildOpenGraphHeadTags({
  ogTitle,
  ogDescription,
  ogType,
  ogImageMediaId
}) {
  return [
    buildMetaTag("property", "og:title", ogTitle),
    buildMetaTag("property", "og:description", ogDescription),
    buildMetaTag("property", "og:type", ogType),
    buildMetaTag("property", "og:image", ogImageMediaId)
  ].filter(Boolean);
}

function buildHeadMarkup(payload) {
  const head = resolveHeadContent(payload);
  return [
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    `<title>${escapeHtmlText(head.title)}</title>`,
    buildMetaTag("name", "description", head.description),
    ...buildCanonicalHeadTags(head.canonicalUrl),
    ...buildOpenGraphHeadTags(head)
  ]
    .filter(Boolean)
    .join("\n    ");
}

function buildRuntimeScriptsMarkup(scriptUrls = []) {
  return normalizeScriptUrlList(scriptUrls)
    .map(
      (entry) =>
        `<script src="${escapeHtmlAttribute(entry)}" defer data-page-runtime-script="true"></script>`
    )
    .join("\n    ");
}

function renderStaticPageDocument({ payload, mountTagName, runtimeScriptUrls }) {
  const payloadScriptId = "page-data";
  const headMarkup = buildHeadMarkup(payload);
  const scriptMarkup = buildRuntimeScriptsMarkup(runtimeScriptUrls);
  const mountMarkup = [
    `<${mountTagName}`,
    ` id="page-app"`,
    ` data-page-id="${escapeHtmlAttribute(payload?.page?.id ?? "")}"`,
    ` data-page-path="${escapeHtmlAttribute(payload?.page?.path ?? "")}"`,
    ` data-page-payload-id="${payloadScriptId}"`,
    ` data-layout-key="${escapeHtmlAttribute(payload?.renderModel?.layoutKey ?? "")}"`,
    "></",
    mountTagName,
    ">"
  ].join("");

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "  <head>",
    `    ${headMarkup}`,
    "  </head>",
    "  <body>",
    "    <main id=\"page-shell\">",
    `      ${mountMarkup}`,
    "      <noscript>This page requires JavaScript to render its application shell.</noscript>",
    "    </main>",
    `    <script type="application/json" id="${payloadScriptId}">${serializeJsonForScript(payload)}</script>`,
    ...(scriptMarkup ? [`    ${scriptMarkup}`] : []),
    "  </body>",
    "</html>",
    ""
  ].join("\n");
}

function resolveArtifactRelativePath(pagePath) {
  const normalizedPath = normalizePagePath(pagePath);
  if (!normalizedPath || hasUnsafePathSegments(normalizedPath)) {
    throw new Error(`Cannot resolve deployment artifact for unsafe path '${pagePath}'`);
  }
  if (normalizedPath === "/") {
    return "index.html";
  }

  const segments = normalizedPath
    .split("/")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return [...segments, "index.html"].join("/");
}

function resolveArtifactAbsolutePath(rootDir, artifactRelativePath) {
  return path.resolve(rootDir, ...artifactRelativePath.split("/"));
}

async function removeEmptyParentDirectories(rootDir, artifactAbsolutePath) {
  let currentDir = path.dirname(artifactAbsolutePath);
  const normalizedRootDir = path.resolve(rootDir);

  while (currentDir.startsWith(normalizedRootDir) && currentDir !== normalizedRootDir) {
    try {
      const entries = await fs.readdir(currentDir);
      if (entries.length > 0) {
        return;
      }
      await fs.rmdir(currentDir);
      currentDir = path.dirname(currentDir);
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ENOTEMPTY") {
        return;
      }
      throw error;
    }
  }
}

async function removeArtifactIfPresent(rootDir, artifactRelativePath) {
  const normalizedRelativePath = normalizeTrimmedText(artifactRelativePath);
  if (!normalizedRelativePath) {
    return;
  }

  const artifactAbsolutePath = resolveArtifactAbsolutePath(rootDir, normalizedRelativePath);
  try {
    await fs.unlink(artifactAbsolutePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  await removeEmptyParentDirectories(rootDir, artifactAbsolutePath);
}

function resolveKnownArtifactPath(page = {}) {
  const source = page && typeof page === "object" ? page : {};
  const storedPath = normalizeTrimmedText(source.deploymentArtifactPath);
  if (storedPath) {
    return storedPath;
  }

  const normalizedPath = normalizeTrimmedText(source.path);
  if (!normalizedPath || hasUnsafePathSegments(normalizedPath)) {
    return null;
  }

  try {
    return resolveArtifactRelativePath(normalizedPath);
  } catch {
    return null;
  }
}

async function readPagesModuleSettings({ resolveSettingsRepository, settingsDefinition }) {
  const values = await resolveGeneratedModuleSettingsValues({
    moduleId: MODULE_ID,
    settingsDefinition,
    resolveSettingsRepository
  });

  return {
    appMountTagName: normalizeAppMountTagName(
      values?.appMountTagName,
      DEFAULT_APP_MOUNT_TAG_NAME
    )
  };
}

async function persistDeploymentMetadata(handler, page, artifactPath) {
  const nextArtifactPath = normalizeTrimmedText(artifactPath) ?? null;
  const nextSyncedOn = nextArtifactPath ? toTimestamp() : null;
  if (
    page?.deploymentArtifactPath === nextArtifactPath &&
    page?.deploymentSyncedOn === nextSyncedOn
  ) {
    return;
  }

  await handler.update({
    body: {
      deploymentArtifactPath: nextArtifactPath,
      deploymentSyncedOn: nextSyncedOn
    },
    value: {
      deploymentArtifactPath: nextArtifactPath,
      deploymentSyncedOn: nextSyncedOn
    },
    item: page
  });
}

async function writePublishedArtifact({
  handler,
  page,
  previousPage,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  const deploymentRootDir = resolvePageDeploymentRootDir();
  const artifactRelativePath = resolveArtifactRelativePath(page.path);
  const payload = await resolvePageDeliveryPayload({
    collectionHandlerRegistry,
    page,
    preview: false
  });
  const settings = await readPagesModuleSettings({
    resolveSettingsRepository,
    settingsDefinition
  });
  const htmlDocument = renderStaticPageDocument({
    payload,
    mountTagName: settings.appMountTagName,
    runtimeScriptUrls: page.runtimeScriptUrls
  });
  const artifactAbsolutePath = resolveArtifactAbsolutePath(
    deploymentRootDir,
    artifactRelativePath
  );
  const previousArtifactPath = resolveKnownArtifactPath(previousPage);

  if (previousArtifactPath && previousArtifactPath !== artifactRelativePath) {
    await removeArtifactIfPresent(deploymentRootDir, previousArtifactPath);
  }

  await fs.mkdir(path.dirname(artifactAbsolutePath), { recursive: true });
  await fs.writeFile(artifactAbsolutePath, htmlDocument, "utf8");
  await persistDeploymentMetadata(handler, page, artifactRelativePath);

  return {
    artifactRelativePath
  };
}

async function clearDeploymentArtifact({ handler, page, previousPage }) {
  const deploymentRootDir = resolvePageDeploymentRootDir();
  const artifactPath =
    resolveKnownArtifactPath(page) ?? resolveKnownArtifactPath(previousPage);

  await removeArtifactIfPresent(deploymentRootDir, artifactPath);
  if (page) {
    await persistDeploymentMetadata(handler, page, null);
  }
}

export async function syncPageDeploymentArtifact({
  handler,
  page,
  previousPage,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  if (!page) {
    await clearDeploymentArtifact({
      handler,
      page: null,
      previousPage
    });
    return {
      artifactRelativePath: null
    };
  }

  if (!isPagePublished(page.status)) {
    await clearDeploymentArtifact({
      handler,
      page,
      previousPage
    });
    return {
      artifactRelativePath: null
    };
  }

  return writePublishedArtifact({
    handler,
    page,
    previousPage,
    collectionHandlerRegistry,
    resolveSettingsRepository,
    settingsDefinition
  });
}

export async function removeDeletedPageDeploymentArtifact(pageSnapshot) {
  await clearDeploymentArtifact({
    handler: null,
    page: null,
    previousPage: pageSnapshot
  });
}
