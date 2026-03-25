import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const moduleDataDir = path.resolve(repoRoot, "server/runtime/module-data");
const mediaDir = path.resolve(repoRoot, "media");
const backupRoot = path.resolve(
  repoRoot,
  ".codex-runtime",
  "cleanup-backups",
  `cleanup-${new Date().toISOString().replace(/[:.]/g, "-")}`
);

const STATE_FILES = {
  content: path.resolve(moduleDataDir, "test-modules-content-state.json"),
  editorial: path.resolve(moduleDataDir, "test-modules-editorial-state.json"),
  taxonomy: path.resolve(moduleDataDir, "test-modules-taxonomy-state.json"),
  media: path.resolve(moduleDataDir, "test-modules-media-manager-state.json"),
  layouts: path.resolve(moduleDataDir, "test-modules-layouts-state.json"),
  pages: path.resolve(moduleDataDir, "test-modules-pages-state.json"),
  engagement: path.resolve(moduleDataDir, "test-modules-engagement-state.json"),
  remoteOps: path.resolve(moduleDataDir, "test-modules-remote-ops-state.json")
};

const ORPHAN_STATE_FILES = [
  path.resolve(moduleDataDir, "test-modules-blog-content-state.json"),
  path.resolve(moduleDataDir, "test-modules-blog-editorial-state.json"),
  path.resolve(moduleDataDir, "test-modules-blog-taxonomy-state.json")
];

const KEEP = {
  posts: new Set(["blogpost-021", "blogpost-022"]),
  authors: new Set([
    "blogauth-014",
    "blogauth-015",
    "blogauth-016",
    "blogauth-018",
    "blogauth-021"
  ]),
  categories: new Set(["blogcate-012", "blogcate-017", "blogcate-018"]),
  tags: new Set(["blogtags-017", "blogtags-019"]),
  media: new Set(["mdi-037", "mdi-040", "mdi-041", "mdi-042", "mdi-043", "mdi-044"]),
  layouts: new Set(["pagelayo-002", "pagelayo-003"]),
  pages: new Set(["blogpage-013", "blogpage-015", "blogpage-016"]),
  bundles: new Set(["pagedepl-001", "pagedepl-003", "pagedepl-004"])
};

const CATEGORY_OVERRIDES = new Map([
  [
    "blogcate-012",
    {
      description: "Places and recurring settings in the Nuli journal."
    }
  ],
  [
    "blogcate-017",
    {
      description: "Kitchen tables, window light, and quiet corners at home."
    }
  ],
  [
    "blogcate-018",
    {
      description: "Park benches, footpaths, and slow outdoor observations."
    }
  ]
]);

const TAG_OVERRIDES = new Map([
  [
    "blogtags-017",
    {
      name: "Nuli Park",
      description: "Outdoor notes, benches, and slow park walks."
    }
  ],
  [
    "blogtags-019",
    {
      name: "Nuli Comfort",
      description: "Home routines, calm corners, and small moments of rest."
    }
  ]
]);

const PAGE_OVERRIDES = new Map([
  [
    "blogpage-013",
    {
      title: "Post Page",
      canonicalUrl: "https://fastcart.dev/post/{slug}",
      seoTitle: "Post Page",
      seoDescription: "Primary post detail page for the clean editorial baseline.",
      ogTitle: "Post Page",
      ogDescription: "Primary post detail page for the clean editorial baseline.",
      remoteDeploymentTargetProfileId: "remoteta-018",
      remoteBrowserDeliveryTargetProfileId: "remoteta-020"
    }
  ],
  [
    "blogpage-015",
    {
      title: "Journal Post Page",
      canonicalUrl: "https://fastcart.dev/journal/{slug}",
      seoTitle: "Journal Post Page",
      seoDescription: "Alternate journal presentation of the same published posts.",
      ogTitle: "Journal Post Page",
      ogDescription: "Alternate journal presentation of the same published posts.",
      remoteDeploymentTargetProfileId: "remoteta-018",
      remoteBrowserDeliveryTargetProfileId: "remoteta-020"
    }
  ],
  [
    "blogpage-016",
    {
      title: "Category Page",
      canonicalUrl: "https://fastcart.dev/category/{slug}",
      seoTitle: "Category Page",
      seoDescription: "Category detail page for the clean editorial baseline.",
      ogTitle: "Category Page",
      ogDescription: "Category detail page for the clean editorial baseline.",
      remoteDeploymentTargetProfileId: "remoteta-018",
      remoteBrowserDeliveryTargetProfileId: "remoteta-020"
    }
  ]
]);

const BUNDLE_OVERRIDES = new Map([
  ["pagedepl-001", { title: "Post Release Bundle", pageId: "blogpage-013" }],
  ["pagedepl-003", { title: "Journal Release Bundle", pageId: "blogpage-015" }],
  ["pagedepl-004", { title: "Category Release Bundle", pageId: "blogpage-016" }]
]);

function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, toJson(value), "utf8");
}

async function backupFile(filePath) {
  const relative = path.relative(repoRoot, filePath);
  const target = path.resolve(backupRoot, relative);
  await ensureDir(path.dirname(target));
  await fs.copyFile(filePath, target);
  return target;
}

function toIdNumber(items = [], prefix) {
  const expression = new RegExp(`^${prefix}(\\d+)$`);
  return items.reduce((maxValue, item) => {
    const value = typeof item?.id === "string" ? item.id : "";
    const match = expression.exec(value);
    return match ? Math.max(maxValue, Number.parseInt(match[1], 10)) : maxValue;
  }, 0);
}

function keepOnlyIds(items = [], keepSet) {
  return items.filter((item) => keepSet.has(item?.id));
}

function filterIds(values = [], keepSet) {
  return Array.isArray(values) ? values.filter((value) => keepSet.has(value)) : [];
}

function resetDeploymentFields(page) {
  return {
    ...page,
    deploymentArtifactPath: "",
    deploymentStatus: "missing",
    deploymentTargetCount: 0,
    deploymentSyncedCount: 0,
    deploymentStaleCount: 0,
    deploymentMissingCount: 0,
    deploymentSyncedOn: "",
    deploymentLastRunOn: ""
  };
}

async function moveDeletedMediaFiles(keepRelativePaths) {
  const originals = path.resolve(mediaDir, "originals");
  const derived = path.resolve(mediaDir, "derived");
  const trashRoot = path.resolve(backupRoot, "deleted-media");
  const existingFiles = [];

  async function collectFiles(startDir) {
    let entries = [];
    try {
      entries = await fs.readdir(startDir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const absolutePath = path.resolve(startDir, entry.name);
      if (entry.isDirectory()) {
        await collectFiles(absolutePath);
        continue;
      }
      const relativePath = path.relative(mediaDir, absolutePath).replace(/\\/g, "/");
      existingFiles.push({ absolutePath, relativePath });
    }
  }

  await collectFiles(originals);
  await collectFiles(derived);

  let movedCount = 0;
  for (const entry of existingFiles) {
    if (keepRelativePaths.has(entry.relativePath)) {
      continue;
    }
    const trashPath = path.resolve(trashRoot, entry.relativePath);
    await ensureDir(path.dirname(trashPath));
    await fs.rename(entry.absolutePath, trashPath);
    movedCount += 1;
  }
  return movedCount;
}

async function moveOrphanStateFiles() {
  let movedCount = 0;
  for (const filePath of ORPHAN_STATE_FILES) {
    try {
      await fs.access(filePath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    await backupFile(filePath);
    await fs.rm(filePath, { force: true });
    movedCount += 1;
  }
  return movedCount;
}

async function main() {
  await ensureDir(backupRoot);

  for (const filePath of Object.values(STATE_FILES)) {
    await backupFile(filePath);
  }

  const content = await readJson(STATE_FILES.content);
  const editorial = await readJson(STATE_FILES.editorial);
  const taxonomy = await readJson(STATE_FILES.taxonomy);
  const media = await readJson(STATE_FILES.media);
  const layouts = await readJson(STATE_FILES.layouts);
  const pages = await readJson(STATE_FILES.pages);
  const engagement = await readJson(STATE_FILES.engagement);
  const remoteOps = await readJson(STATE_FILES.remoteOps);

  content["blog-posts"] = keepOnlyIds(content["blog-posts"], KEEP.posts).map((post) => ({
    ...post,
    primaryAuthorId: KEEP.authors.has(post.primaryAuthorId) ? post.primaryAuthorId : null,
    coAuthorIds: filterIds(post.coAuthorIds, KEEP.authors),
    categoryIds: filterIds(post.categoryIds, KEEP.categories),
    tagIds: filterIds(post.tagIds, KEEP.tags),
    featuredMediaId: KEEP.media.has(post.featuredMediaId) ? post.featuredMediaId : null,
    galleryMediaIds: filterIds(post.galleryMediaIds, KEEP.media),
    ogImageMediaId: KEEP.media.has(post.ogImageMediaId) ? post.ogImageMediaId : null,
    createdByAuthorId: KEEP.authors.has(post.createdByAuthorId)
      ? post.createdByAuthorId
      : KEEP.authors.has(post.primaryAuthorId)
        ? post.primaryAuthorId
        : null,
    updatedByAuthorId: KEEP.authors.has(post.updatedByAuthorId)
      ? post.updatedByAuthorId
      : KEEP.authors.has(post.primaryAuthorId)
        ? post.primaryAuthorId
        : null
  }));
  content["blog-post-revisions"] = (content["blog-post-revisions"] ?? [])
    .filter((revision) => KEEP.posts.has(revision?.postId))
    .map((revision) => ({
      ...revision,
      changedByAuthorId: KEEP.authors.has(revision.changedByAuthorId)
        ? revision.changedByAuthorId
        : null,
      taxonomySnapshot: {
        ...(revision.taxonomySnapshot ?? {}),
        categoryIds: filterIds(revision?.taxonomySnapshot?.categoryIds, KEEP.categories),
        tagIds: filterIds(revision?.taxonomySnapshot?.tagIds, KEEP.tags)
      },
      mediaSnapshot: {
        ...(revision.mediaSnapshot ?? {}),
        featuredMediaId: KEEP.media.has(revision?.mediaSnapshot?.featuredMediaId)
          ? revision.mediaSnapshot.featuredMediaId
          : null,
        galleryMediaIds: filterIds(revision?.mediaSnapshot?.galleryMediaIds, KEEP.media),
        ogImageMediaId: KEEP.media.has(revision?.mediaSnapshot?.ogImageMediaId)
          ? revision.mediaSnapshot.ogImageMediaId
          : null
      }
    }));

  editorial["blog-authors"] = keepOnlyIds(editorial["blog-authors"], KEEP.authors).map((author) => ({
    ...author,
    avatarMediaId: KEEP.media.has(author.avatarMediaId) ? author.avatarMediaId : null,
    expertiseTagIds: filterIds(author.expertiseTagIds, KEEP.tags)
  }));

  taxonomy["blog-categories"] = keepOnlyIds(taxonomy["blog-categories"], KEEP.categories).map((category) => ({
    ...category,
    parentCategoryId: KEEP.categories.has(category.parentCategoryId) ? category.parentCategoryId : null,
    featuredMediaId: KEEP.media.has(category.featuredMediaId) ? category.featuredMediaId : null,
    ...(CATEGORY_OVERRIDES.get(category.id) ?? {})
  }));
  taxonomy["blog-tags"] = keepOnlyIds(taxonomy["blog-tags"], KEEP.tags).map((tag) => ({
    ...tag,
    ...(TAG_OVERRIDES.get(tag.id) ?? {})
  }));

  media["media-items"] = keepOnlyIds(media["media-items"], KEEP.media)
    .map((item) => ({
      ...item,
      sourceMediaId: KEEP.media.has(item.sourceMediaId) ? item.sourceMediaId : null
    }))
    .filter((item) => !item.isDerived || KEEP.media.has(item.sourceMediaId));

  layouts["page-layouts"] = keepOnlyIds(layouts["page-layouts"], KEEP.layouts).map((layout) => {
    if (layout.id === "pagelayo-002") {
      return {
        ...layout,
        title: "Editorial Grid",
        summary: "Predefined editorial grid layout kept as the clean baseline structured template.",
        status: "ready"
      };
    }
    if (layout.id === "pagelayo-003") {
      return {
        ...layout,
        status: "ready"
      };
    }
    return layout;
  });

  pages["blog-pages"] = keepOnlyIds(pages["blog-pages"], KEEP.pages).map((page) =>
    resetDeploymentFields({
      ...page,
      ...(PAGE_OVERRIDES.get(page.id) ?? {})
    })
  );
  pages["page-deployment-bundles"] = keepOnlyIds(pages["page-deployment-bundles"], KEEP.bundles).map((bundle) => ({
    ...bundle,
    ...(BUNDLE_OVERRIDES.get(bundle.id) ?? {}),
    postsProjectionTargetProfileId: "remoteta-021",
    categoriesProjectionTargetProfileId: "remoteta-016",
    tagsProjectionTargetProfileId: "remoteta-017",
    mediaTargetProfileId: "remoteta-019",
    deploymentTargetProfileId: "remoteta-018",
    browserDeliveryTargetProfileId: "remoteta-020"
  }));
  pages["page-deployment-artifacts"] = [];
  pages["page-deployment-bundle-runs"] = [];

  engagement["blog-comments"] = [];

  remoteOps["remote-operation-runs"] = [];

  content.nextPostNumber = toIdNumber(content["blog-posts"], "blogpost-") + 1;
  content.nextRevisionNumber = toIdNumber(content["blog-post-revisions"], "blogpost-") + 1;
  editorial.nextAuthorNumber = toIdNumber(editorial["blog-authors"], "blogauth-") + 1;
  taxonomy.nextTagNumber = toIdNumber(taxonomy["blog-tags"], "blogtags-") + 1;
  taxonomy.nextCategoryNumber = toIdNumber(taxonomy["blog-categories"], "blogcate-") + 1;
  media.nextMediaItemNumber = toIdNumber(media["media-items"], "mdi-") + 1;
  layouts.nextLayoutNumber = toIdNumber(layouts["page-layouts"], "pagelayo-") + 1;
  pages.nextPageNumber = toIdNumber(pages["blog-pages"], "blogpage-") + 1;
  pages.nextBundleNumber = 5;
  pages.nextDeploymentArtifactNumber = 55;
  pages.nextBundleRunNumber = 97;
  engagement.nextCommentNumber = 14;
  remoteOps.nextOperationRunNumber = 1044;

  await writeJson(STATE_FILES.content, content);
  await writeJson(STATE_FILES.editorial, editorial);
  await writeJson(STATE_FILES.taxonomy, taxonomy);
  await writeJson(STATE_FILES.media, media);
  await writeJson(STATE_FILES.layouts, layouts);
  await writeJson(STATE_FILES.pages, pages);
  await writeJson(STATE_FILES.engagement, engagement);
  await writeJson(STATE_FILES.remoteOps, remoteOps);

  const keepRelativePaths = new Set(
    media["media-items"]
      .map((item) => item.relativePath)
      .filter((value) => typeof value === "string" && value.length > 0)
  );

  const movedMediaFiles = await moveDeletedMediaFiles(keepRelativePaths);
  const removedOrphanStateFiles = await moveOrphanStateFiles();

  const report = {
    backupRoot,
    summary: {
      posts: content["blog-posts"].length,
      postRevisions: content["blog-post-revisions"].length,
      authors: editorial["blog-authors"].length,
      categories: taxonomy["blog-categories"].length,
      tags: taxonomy["blog-tags"].length,
      media: media["media-items"].length,
      layouts: layouts["page-layouts"].length,
      pages: pages["blog-pages"].length,
      bundles: pages["page-deployment-bundles"].length,
      deploymentArtifacts: pages["page-deployment-artifacts"].length,
      bundleRuns: pages["page-deployment-bundle-runs"].length,
      comments: engagement["blog-comments"].length,
      remoteOperationRuns: remoteOps["remote-operation-runs"].length,
      movedMediaFiles,
      removedOrphanStateFiles
    }
  };

  const reportPath = path.resolve(backupRoot, "cleanup-report.json");
  await writeJson(reportPath, report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
