import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import {
  resolveSimulatedFirestoreRoot,
  resolveSimulatedStorageRoot
} from "../../../modules/test-modules-remote-ops/server/remote-ops-root.mjs";
import {
  buildReferenceModuleSettingsPath,
  createEphemeralReferenceServer,
  createSharedReferenceStatePersistence,
  injectJson,
  waitForMissionJob
} from "./helpers/reference-slice-runtime-test-helpers.js";
import { PAGE_DEPLOYMENT_BUNDLE_RELEASE_MISSION_ID } from "../../../modules/test-modules-pages/shared/deployment-bundle-release-shared.mjs";

const BLOG_DISTRIBUTION_TEST_TIMEOUT_MS = 20_000;
const MODULE_ID = "test-modules-pages";
const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=";

function buildItemsRoute(collectionId) {
  return `/api/reference/collections/${collectionId}/items`;
}

function buildItemRoute(collectionId, itemId) {
  return `/api/reference/collections/${collectionId}/items/${itemId}`;
}

function buildPublishRoute(pageId) {
  return `/api/reference/modules/${MODULE_ID}/pages/${pageId}/publish-now`;
}

function buildDeliveryRoute(pageId) {
  return `/api/reference/modules/${MODULE_ID}/pages/${pageId}/delivery`;
}

function buildPreviewSourcesRoute(pageId) {
  return `/api/reference/modules/${MODULE_ID}/pages/${pageId}/preview-sources`;
}

function buildSyncDeploymentRoute(pageId) {
  return `/api/reference/modules/${MODULE_ID}/pages/${pageId}/sync-deployment`;
}

function buildBundleReleaseRoute(bundleId) {
  return `/api/reference/modules/${MODULE_ID}/deployment-bundles/${bundleId}/run-release`;
}

function buildBundleReleaseMissionRoute() {
  return `/api/reference/missions/${PAGE_DEPLOYMENT_BUNDLE_RELEASE_MISSION_ID}/jobs`;
}

function buildDeploymentInstancesRoute(pageId) {
  return `/api/reference/modules/${MODULE_ID}/pages/${pageId}/deployment-instances`;
}

function buildPathDeliveryRoute(path, preview = false) {
  return `/api/reference/modules/${MODULE_ID}/delivery/resolve?path=${encodeURIComponent(path)}${preview ? "&preview=true" : ""}`;
}

async function createDeploymentSandbox(moduleSettings = null) {
  const deploymentRootDir = await fs.mkdtemp(path.join(os.tmpdir(), "pages-deployment-"));
  const previousRootDir = process.env.REFERENCE_PAGE_DEPLOYMENT_ROOT_DIR;
  process.env.REFERENCE_PAGE_DEPLOYMENT_ROOT_DIR = deploymentRootDir;

  return {
    deploymentRootDir,
    referenceStatePersistence: createSharedReferenceStatePersistence({
      moduleSettings: moduleSettings
        ? {
            [MODULE_ID]: moduleSettings
          }
        : {}
    }).adapter,
    async cleanup() {
      if (previousRootDir === undefined) {
        delete process.env.REFERENCE_PAGE_DEPLOYMENT_ROOT_DIR;
      } else {
        process.env.REFERENCE_PAGE_DEPLOYMENT_ROOT_DIR = previousRootDir;
      }
      await fs.rm(deploymentRootDir, {
        recursive: true,
        force: true
      });
    }
  };
}

async function createDeploymentAndMediaSandbox(moduleSettings = null) {
  const deploymentSandbox = await createDeploymentSandbox(moduleSettings);
  const mediaLibraryRootDir = await fs.mkdtemp(path.join(os.tmpdir(), "pages-media-"));
  const previousMediaRootDir = process.env.REFERENCE_MEDIA_LIBRARY_ROOT_DIR;
  process.env.REFERENCE_MEDIA_LIBRARY_ROOT_DIR = mediaLibraryRootDir;

  return {
    deploymentRootDir: deploymentSandbox.deploymentRootDir,
    mediaLibraryRootDir,
    referenceStatePersistence: deploymentSandbox.referenceStatePersistence,
    async cleanup() {
      if (previousMediaRootDir === undefined) {
        delete process.env.REFERENCE_MEDIA_LIBRARY_ROOT_DIR;
      } else {
        process.env.REFERENCE_MEDIA_LIBRARY_ROOT_DIR = previousMediaRootDir;
      }
      await deploymentSandbox.cleanup();
      await fs.rm(mediaLibraryRootDir, {
        recursive: true,
        force: true
      });
    }
  };
}

async function readDeploymentHtml(deploymentRootDir, artifactRelativePath) {
  return fs.readFile(path.join(deploymentRootDir, ...artifactRelativePath.split("/")), "utf8");
}

async function seedAuthor(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-authors"), {
    displayName: "Distribution Editor",
    legalName: "Distribution Editor",
    bio: "Owns scheduling and permalink decisions.",
    email: "distribution-editor@example.com",
    role: "editor",
    status: "active",
    locale: "en-US",
    expertiseTagIds: [],
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedCategory(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-categories"), {
    name: "Releases",
    description: "Release announcements",
    parentCategoryId: null,
    sortOrder: 1,
    visibility: "public",
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedTag(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-tags"), {
    name: "Platform",
    description: "Platform category",
    color: "#3355aa",
    visibility: "public",
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedRemoteConnectionProfile(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("remote-connection-profiles"), {
    profileName: "Merchant Guild",
    provider: "gcp",
    authMode: "service-account-key",
    connectionStatus: "validated",
    projectId: "merchant-guild",
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedRemoteTargetProfile(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("remote-target-profiles"), {
    title: "Target",
    connectionProfileId: "missing-connection",
    targetKind: "deployment-storage",
    adapterMode: "live-gcp",
    config: {},
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedDeploymentBundle(server, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("page-deployment-bundles"), {
    title: "Posts Release Bundle",
    pageId: "missing-page",
    postsProjectionTargetProfileId: "missing-posts",
    categoriesProjectionTargetProfileId: "missing-categories",
    tagsProjectionTargetProfileId: "missing-tags",
    mediaTargetProfileId: "missing-media",
    deploymentTargetProfileId: "missing-deployment",
    browserDeliveryTargetProfileId: "missing-browser",
    ...overrides
  });
  if (response.statusCode !== 201) {
    throw new Error(JSON.stringify(response.body));
  }
  return response.body.item;
}

function createLongBody(label) {
  return `<p>${label} `.repeat(32) + "</p>";
}

async function waitForFileExists(filePath, timeoutMs = 3_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await fs.access(filePath);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  await fs.access(filePath);
}

async function seedMedia(server, overrides = {}) {
  const response = await injectJson(
    server,
    "POST",
    "/api/reference/modules/test-modules-media-manager/media-items/uploads",
    {
      fileName: "hero.png",
      mimeType: "image/png",
      contentBase64: ONE_PIXEL_PNG_BASE64,
      ...overrides
    }
  );
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

async function seedPost(server, authorId, categoryId, tagId, overrides = {}) {
  const response = await injectJson(server, "POST", buildItemsRoute("blog-posts"), {
    title: "Release Window Update",
    excerpt: "Release window update excerpt",
    body: createLongBody("Release window update body"),
    status: "draft",
    format: "article",
    primaryAuthorId: authorId,
    coAuthorIds: [],
    categoryIds: [categoryId],
    tagIds: [tagId],
    galleryMediaIds: [],
    allowComments: true,
    commentPolicy: "open",
    createdByAuthorId: authorId,
    updatedByAuthorId: authorId,
    ...overrides
  });
  expect(response.statusCode).toBe(201);
  return response.body.item;
}

test("pages create standalone records and resolve deterministic delivery payloads", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);
    const post = await seedPost(server, editor.id, category.id, tag.id, {
      title: "Launch Window Update",
      status: "scheduled",
      scheduledOn: "2026-03-09T08:30:00.000Z",
      seoTitle: "Launch Window Update",
      seoDescription: "Launch window update description",
      ogTitle: "Launch Window Update",
      ogDescription: "Launch window update description"
    });

    const standalonePage = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Platform Landing",
      pageKind: "standalone",
      primarySourceType: "none",
      path: "/platform",
      layoutKey: "landing-shell",
      status: "draft",
      seoTitle: "Platform Landing",
      seoDescription: "Platform landing description",
      ogTitle: "Platform Landing",
      ogDescription: "Platform landing description"
    });
    expect(standalonePage.statusCode).toBe(201);
    expect(standalonePage.body.item).toEqual(
      expect.objectContaining({
        title: "Platform Landing",
        pageKind: "standalone",
        primarySourceType: "none",
        path: "/platform"
      })
    );

    const postPage = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Launch Story",
      pageKind: "content-detail",
      primarySourceType: "blog-post",
      path: "/stories/launch-window-update",
      layoutKey: "story-shell",
      primarySource: {
        sourceType: "blog-post",
        itemId: post.id,
        bindAs: "primary"
      },
      dataSources: [
        {
          key: "related-posts",
          kind: "posts-by-category",
          sourceType: "blog-category",
          itemId: category.id,
          bindAs: "relatedPosts",
          limit: 5,
          sortKey: "updatedOn",
          sortDirection: "desc"
        }
      ],
      status: "scheduled",
      scheduledOn: "2026-03-09T09:00:00.000Z",
      seoTitle: "Launch Story",
      seoDescription: "Launch story description",
      ogTitle: "Launch Story",
      ogDescription: "Launch story description"
    });
    expect(postPage.statusCode).toBe(201);

    const duplicatePath = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Duplicate Launch Story",
      pageKind: "content-detail",
      primarySourceType: "blog-post",
      path: "/stories/launch-window-update",
      primarySource: {
        sourceType: "blog-post",
        itemId: post.id,
        bindAs: "primary"
      }
    });
    expect(duplicatePath.statusCode).toBe(400);
    expect(duplicatePath.body.error.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAGE_PATH_CONFLICT"
        })
      ])
    );

    const pageDelivery = await injectJson(server, "GET", buildDeliveryRoute(postPage.body.item.id));
    expect(pageDelivery.statusCode).toBe(200);
    expect(pageDelivery.body.payload).toEqual(
      expect.objectContaining({
        contractVersion: 1,
        page: expect.objectContaining({
          id: postPage.body.item.id,
          path: "/stories/launch-window-update"
        }),
        runtime: expect.objectContaining({
          clientRuntime: expect.objectContaining({
            assetUrl: "/assets/client-runtime.global.js",
            bootstrapDatasets: expect.arrayContaining([
              "page-payload",
              "page-slot-primary",
              "page-slot-relatedposts"
            ]),
            slots: expect.arrayContaining([
              expect.objectContaining({
                bindAs: "primary",
                dataset: "page-slot-primary",
                sourceType: "blog-post",
                recordMode: "single-item"
              }),
              expect.objectContaining({
                bindAs: "relatedPosts",
                dataset: "page-slot-relatedposts",
                sourceType: "blog-category",
                recordMode: "array"
              })
            ]),
            queries: expect.arrayContaining([
              expect.objectContaining({
                resource: "page-slot",
                query: "primary",
                dataset: "page-slot-primary"
              }),
              expect.objectContaining({
                resource: "page-slot",
                query: "relatedPosts",
                dataset: "page-slot-relatedposts",
                remote: expect.objectContaining({
                  path: expect.stringContaining("/delivery/resolve?path="),
                  responsePath: "payload.data.relatedPosts"
                }),
                remoteResult: expect.objectContaining({
                  type: "collection"
                })
              })
            ]),
            datasets: expect.arrayContaining([
              expect.objectContaining({
                dataset: "page-slot-primary",
                valuePath: "data.primary",
                remoteValuePath: "payload.data.primary"
              }),
              expect.objectContaining({
                dataset: "page-slot-relatedposts",
                valuePath: "data.relatedPosts",
                remoteValuePath: "payload.data.relatedPosts"
              })
            ])
          })
        }),
        data: expect.objectContaining({
          primary: expect.objectContaining({
            collectionId: "blog-posts",
            itemId: post.id
          }),
          relatedPosts: expect.any(Array)
        }),
        followUp: expect.objectContaining({
          pageByIdRoute: expect.stringContaining(`/pages/${postPage.body.item.id}/delivery`),
          pageByPathRoute: expect.stringContaining("/delivery/resolve?path=")
        }),
        versioning: expect.objectContaining({
          publishModel: "live-reference",
          dependencyKeys: expect.arrayContaining([
            `blog-pages:${postPage.body.item.id}`,
            `blog-posts:${post.id}`,
            `blog-posts:*`
          ])
        })
      })
    );

    const pathPreview = await injectJson(
      server,
      "GET",
      buildPathDeliveryRoute("/stories/launch-window-update", true)
    );
    expect(pathPreview.statusCode).toBe(200);
    expect(pathPreview.body.payload.page.id).toBe(postPage.body.item.id);

    const pathWithoutPreview = await injectJson(
      server,
      "GET",
      buildPathDeliveryRoute("/stories/launch-window-update")
    );
    expect(pathWithoutPreview.statusCode).toBe(404);
  } finally {
    await server.close();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("pages support per-record post templates and preview a concrete generated path", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);
    const firstPost = await seedPost(server, editor.id, category.id, tag.id, {
      title: "Launch Window Update",
      status: "published",
      publishedOn: "2026-03-09T08:30:00.000Z",
      seoTitle: "Launch Window Update",
      seoDescription: "Launch window update description",
      ogTitle: "Launch Window Update",
      ogDescription: "Launch window update description"
    });
    const secondPost = await seedPost(server, editor.id, category.id, tag.id, {
      title: "Quarterly Review",
      status: "published",
      publishedOn: "2026-03-09T10:30:00.000Z",
      seoTitle: "Quarterly Review",
      seoDescription: "Quarterly review description",
      ogTitle: "Quarterly Review",
      ogDescription: "Quarterly review description"
    });

    const templatePage = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Posts Page",
      pageKind: "content-detail",
      deploymentMode: "per-record",
      primarySourceType: "blog-post",
      sourceSelectionMode: "all-records",
      path: "/posts",
      pathPattern: "/posts/{slug}",
      layoutKey: "story-shell",
      primarySource: {
        sourceType: "blog-post",
        itemId: null,
        bindAs: "primary"
      },
      status: "draft"
    });
    expect(templatePage.statusCode).toBe(201);
    expect(templatePage.body.item).toEqual(
      expect.objectContaining({
        deploymentMode: "per-record",
        sourceSelectionMode: "all-records",
        pathPattern: "/posts/{slug}"
      })
    );

    const previewSources = await injectJson(
      server,
      "GET",
      buildPreviewSourcesRoute(templatePage.body.item.id)
    );
    expect(previewSources.statusCode).toBe(200);
    expect(previewSources.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: firstPost.id,
          path: "/posts/launch-window-update"
        }),
        expect.objectContaining({
          id: secondPost.id,
          path: "/posts/quarterly-review"
        })
      ])
    );

    const previewPayload = await injectJson(
      server,
      "GET",
      `${buildDeliveryRoute(templatePage.body.item.id)}?preview=true&sourceItemId=${encodeURIComponent(firstPost.id)}`
    );
    expect(previewPayload.statusCode).toBe(200);
    expect(previewPayload.body.payload).toEqual(
      expect.objectContaining({
        page: expect.objectContaining({
          id: templatePage.body.item.id,
          path: "/posts/launch-window-update",
          pathPattern: "/posts/{slug}",
          deploymentMode: "per-record"
        }),
        data: expect.objectContaining({
          primary: expect.objectContaining({
            collectionId: "blog-posts",
            itemId: firstPost.id
          })
        })
      })
    );
  } finally {
    await server.close();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("pages support per-record category templates, deploy public category outputs, and resolve generated paths", async () => {
  const sandbox = await createDeploymentSandbox();
  const server = await createEphemeralReferenceServer({
    referenceStatePersistence: sandbox.referenceStatePersistence
  });

  try {
    const rootCategory = await seedCategory(server, {
      name: "Guides",
      description: "Guides category description",
      visibility: "public"
    });
    const childCategory = await seedCategory(server, {
      name: "Release Ops",
      description: "Release ops category description",
      parentCategoryId: rootCategory.id,
      visibility: "public"
    });
    const internalCategory = await seedCategory(server, {
      name: "Internal Ops",
      description: "Internal category description",
      visibility: "internal"
    });
    const editor = await seedAuthor(server, {
      displayName: "Category Editor",
      legalName: "Category Editor",
      email: "category-editor@example.com"
    });
    const tag = await seedTag(server, {
      name: "Guides Tag",
      description: "Guides tag"
    });
    const rootCategoryPost = await seedPost(server, editor.id, rootCategory.id, tag.id, {
      title: "Guides Overview",
      status: "published",
      publishedOn: "2026-03-14T09:00:00.000Z"
    });
    const childCategoryPost = await seedPost(server, editor.id, childCategory.id, tag.id, {
      title: "Release Ops Checklist",
      status: "published",
      publishedOn: "2026-03-14T10:00:00.000Z"
    });

    const templatePage = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Categories Page",
      pageKind: "listing",
      deploymentMode: "per-record",
      primarySourceType: "blog-category",
      sourceSelectionMode: "all-records",
      path: "/category",
      pathPattern: "/category/{slug}",
      layoutKey: "listing-shell",
      primarySource: {
        sourceType: "blog-category",
        itemId: null,
        bindAs: "primary"
      },
      dataSources: [
        {
          key: "category-posts",
          kind: "posts-by-category",
          sourceType: "blog-category",
          itemId: null,
          bindAs: "categoryPosts",
          limit: 12,
          sortKey: "updatedOn",
          sortDirection: "desc"
        }
      ],
      status: "published",
      publishedOn: "2026-03-14T08:00:00.000Z",
      seoTitle: "Categories Page",
      seoDescription: "Categories page description",
      ogTitle: "Categories Page",
      ogDescription: "Categories page description"
    });
    expect(templatePage.statusCode).toBe(201);
    expect(templatePage.body.item).toEqual(
      expect.objectContaining({
        deploymentMode: "per-record",
        primarySourceType: "blog-category",
        pathPattern: "/category/{slug}"
      })
    );

    const previewSources = await injectJson(
      server,
      "GET",
      buildPreviewSourcesRoute(templatePage.body.item.id)
    );
    expect(previewSources.statusCode).toBe(200);
    expect(previewSources.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: rootCategory.id,
          path: "/category/guides"
        }),
        expect.objectContaining({
          id: childCategory.id,
          path: "/category/release-ops"
        })
      ])
    );
    expect(previewSources.body.items.map((item) => item.id)).not.toContain(internalCategory.id);

    const previewPayload = await injectJson(
      server,
      "GET",
      `${buildDeliveryRoute(templatePage.body.item.id)}?preview=true&sourceItemId=${encodeURIComponent(rootCategory.id)}`
    );
    expect(previewPayload.statusCode).toBe(200);
    expect(previewPayload.body.payload).toEqual(
      expect.objectContaining({
        page: expect.objectContaining({
          id: templatePage.body.item.id,
          path: "/category/guides",
          deploymentMode: "per-record"
        }),
        data: expect.objectContaining({
          primary: expect.objectContaining({
            collectionId: "blog-categories",
            itemId: rootCategory.id
          }),
          categoryPosts: expect.arrayContaining([
            expect.objectContaining({
              collectionId: "blog-posts",
              itemId: rootCategoryPost.id
            })
          ])
        }),
        runtime: expect.objectContaining({
          clientRuntime: expect.objectContaining({
            bootstrapDatasets: expect.arrayContaining([
              "page-payload",
              "page-slot-primary",
              "page-slot-categoryposts"
            ]),
            slots: expect.arrayContaining([
              expect.objectContaining({
                bindAs: "primary",
                dataset: "page-slot-primary",
                sourceType: "blog-category",
                recordMode: "single-item"
              }),
              expect.objectContaining({
                bindAs: "categoryPosts",
                dataset: "page-slot-categoryposts",
                sourceType: "blog-category",
                recordMode: "array"
              })
            ]),
            queries: expect.arrayContaining([
              expect.objectContaining({
                resource: "page-slot",
                query: "categoryPosts",
                dataset: "page-slot-categoryposts",
                remote: expect.objectContaining({
                  responsePath: "payload.data.categoryPosts"
                }),
                remoteResult: expect.objectContaining({
                  type: "collection"
                })
              })
            ])
          })
        })
      })
    );

    const pathPayload = await injectJson(server, "GET", buildPathDeliveryRoute("/category/guides"));
    expect(pathPayload.statusCode).toBe(200);
    expect(pathPayload.body.payload.page.path).toBe("/category/guides");
    expect(pathPayload.body.payload.data.primary).toEqual(
      expect.objectContaining({
        collectionId: "blog-categories",
        itemId: rootCategory.id
      })
    );
    expect(pathPayload.body.payload.data.categoryPosts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: "blog-posts",
          itemId: rootCategoryPost.id
        })
      ])
    );
    expect(pathPayload.body.payload.data.categoryPosts.map((item) => item.itemId)).not.toContain(
      childCategoryPost.id
    );

    const syncResponse = await injectJson(
      server,
      "POST",
      buildSyncDeploymentRoute(templatePage.body.item.id),
      {}
    );
    expect(syncResponse.statusCode).toBe(200);
    expect(syncResponse.body.item).toEqual(
      expect.objectContaining({
        deploymentStatus: "clean",
        deploymentTargetCount: 2,
        deploymentSyncedCount: 2,
        deploymentStaleCount: 0,
        deploymentMissingCount: 0
      })
    );

    const instancesResponse = await injectJson(
      server,
      "GET",
      buildDeploymentInstancesRoute(templatePage.body.item.id)
    );
    expect(instancesResponse.statusCode).toBe(200);
    expect(instancesResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceItemId: rootCategory.id,
          resolvedPath: "/category/guides",
          artifactRelativePath: "category/guides/index.html",
          status: "synced"
        }),
        expect.objectContaining({
          sourceItemId: childCategory.id,
          resolvedPath: "/category/release-ops",
          artifactRelativePath: "category/release-ops/index.html",
          status: "synced"
        })
      ])
    );
    expect(instancesResponse.body.items.map((item) => item.sourceItemId)).not.toContain(
      internalCategory.id
    );

    await expect(
      readDeploymentHtml(sandbox.deploymentRootDir, "category/guides/index.html")
    ).resolves.toContain("Guides");
    await expect(
      readDeploymentHtml(sandbox.deploymentRootDir, "category/release-ops/index.html")
    ).resolves.toContain("Release Ops");
  } finally {
    await server.close();
    await sandbox.cleanup();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("pages sync per-record deployment outputs and surface stale or missing state after content changes", async () => {
  const sandbox = await createDeploymentSandbox();
  const server = await createEphemeralReferenceServer({
    referenceStatePersistence: sandbox.referenceStatePersistence
  });

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);
    const firstPost = await seedPost(server, editor.id, category.id, tag.id, {
      title: "Launch Window Update",
      status: "published",
      publishedOn: "2026-03-09T08:30:00.000Z",
      seoTitle: "Launch Window Update",
      seoDescription: "Launch window update description",
      ogTitle: "Launch Window Update",
      ogDescription: "Launch window update description"
    });
    const secondPost = await seedPost(server, editor.id, category.id, tag.id, {
      title: "Quarterly Review",
      status: "published",
      publishedOn: "2026-03-09T09:30:00.000Z",
      seoTitle: "Quarterly Review",
      seoDescription: "Quarterly review description",
      ogTitle: "Quarterly Review",
      ogDescription: "Quarterly review description"
    });

    const templatePage = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Posts Page",
      pageKind: "content-detail",
      deploymentMode: "per-record",
      primarySourceType: "blog-post",
      sourceSelectionMode: "all-records",
      path: "/posts",
      pathPattern: "/posts/{slug}",
      layoutKey: "story-shell",
      primarySource: {
        sourceType: "blog-post",
        itemId: null,
        bindAs: "primary"
      },
      status: "published",
      publishedOn: "2026-03-09T10:00:00.000Z",
      seoTitle: "Posts Page",
      seoDescription: "Posts page description",
      ogTitle: "Posts Page",
      ogDescription: "Posts page description"
    });
    expect(templatePage.statusCode).toBe(201);

    const syncResponse = await injectJson(
      server,
      "POST",
      buildSyncDeploymentRoute(templatePage.body.item.id),
      {}
    );
    expect(syncResponse.statusCode).toBe(200);
    expect(syncResponse.body.item).toEqual(
      expect.objectContaining({
        id: templatePage.body.item.id,
        deploymentStatus: "clean",
        deploymentTargetCount: 2,
        deploymentSyncedCount: 2,
        deploymentStaleCount: 0,
        deploymentMissingCount: 0
      })
    );

    const instancesResponse = await injectJson(
      server,
      "GET",
      buildDeploymentInstancesRoute(templatePage.body.item.id)
    );
    expect(instancesResponse.statusCode).toBe(200);
    expect(instancesResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceItemId: firstPost.id,
          resolvedPath: "/posts/launch-window-update",
          artifactRelativePath: "posts/launch-window-update/index.html",
          status: "synced"
        }),
        expect.objectContaining({
          sourceItemId: secondPost.id,
          resolvedPath: "/posts/quarterly-review",
          artifactRelativePath: "posts/quarterly-review/index.html",
          status: "synced"
        })
      ])
    );

    await expect(
      readDeploymentHtml(sandbox.deploymentRootDir, "posts/launch-window-update/index.html")
    ).resolves.toContain("Launch Window Update");
    await expect(
      readDeploymentHtml(sandbox.deploymentRootDir, "posts/quarterly-review/index.html")
    ).resolves.toContain("Quarterly Review");

    const updatedFirstPost = await injectJson(
      server,
      "PUT",
      buildItemRoute("blog-posts", firstPost.id),
      {
        title: "Launch Window Update Revised",
        updatedByAuthorId: editor.id
      }
    );
    expect(updatedFirstPost.statusCode).toBe(200);

    const stalePage = await injectJson(
      server,
      "GET",
      buildItemRoute("blog-pages", templatePage.body.item.id)
    );
    expect(stalePage.statusCode).toBe(200);
    expect(stalePage.body.item).toEqual(
      expect.objectContaining({
        deploymentStatus: "stale",
        deploymentTargetCount: 2,
        deploymentSyncedCount: 1,
        deploymentStaleCount: 1,
        deploymentMissingCount: 0
      })
    );

    const thirdPost = await seedPost(server, editor.id, category.id, tag.id, {
      title: "Platform Health Review",
      status: "published",
      publishedOn: "2026-03-09T10:30:00.000Z",
      seoTitle: "Platform Health Review",
      seoDescription: "Platform health review description",
      ogTitle: "Platform Health Review",
      ogDescription: "Platform health review description"
    });

    const missingPage = await injectJson(
      server,
      "GET",
      buildItemRoute("blog-pages", templatePage.body.item.id)
    );
    expect(missingPage.statusCode).toBe(200);
    expect(missingPage.body.item).toEqual(
      expect.objectContaining({
        deploymentStatus: "missing",
        deploymentTargetCount: 3,
        deploymentSyncedCount: 1,
        deploymentStaleCount: 1,
        deploymentMissingCount: 1
      })
    );

    const refreshedInstances = await injectJson(
      server,
      "GET",
      buildDeploymentInstancesRoute(templatePage.body.item.id)
    );
    expect(refreshedInstances.statusCode).toBe(200);
    expect(refreshedInstances.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceItemId: firstPost.id,
          status: "stale",
          staleReasonSummary: expect.stringContaining("Source record changed")
        }),
        expect.objectContaining({
          sourceItemId: secondPost.id,
          status: "synced"
        }),
        expect.objectContaining({
          sourceItemId: thirdPost.id,
          status: "missing",
          staleReasonSummary: expect.stringContaining("No deployed artifact exists")
        })
      ])
    );
  } finally {
    await server.close();
    await sandbox.cleanup();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("pages sync existing per-record artifacts after browser-delivery settings change and emit domain-aware html", async () => {
  const sandbox = await createDeploymentSandbox();
  const server = await createEphemeralReferenceServer({
    referenceStatePersistence: sandbox.referenceStatePersistence
  });

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);
    const post = await seedPost(server, editor.id, category.id, tag.id, {
      title: "Launch Window Update",
      status: "published",
      publishedOn: "2026-03-09T08:30:00.000Z",
      seoTitle: "Launch Window Update",
      seoDescription: "Launch window update description",
      ogTitle: "Launch Window Update",
      ogDescription: "Launch window update description"
    });

    const connection = await seedRemoteConnectionProfile(server);
    const deploymentTarget = await seedRemoteTargetProfile(server, {
      title: "Deployment Bucket",
      connectionProfileId: connection.id,
      targetKind: "deployment-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "content.example.com",
        prefix: ""
      }
    });
    const mediaTarget = await seedRemoteTargetProfile(server, {
      title: "Media Bucket",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "content-example-media",
        prefix: "library"
      }
    });
    const browserDeliveryTarget = await seedRemoteTargetProfile(server, {
      title: "Delivery Domain",
      connectionProfileId: connection.id,
      targetKind: "browser-delivery",
      adapterMode: "live-gcp",
      config: {
        accessMode: "custom-domain",
        dnsMode: "external",
        hostname: "content.example.com",
        deploymentTargetProfileId: deploymentTarget.id,
        mediaTargetProfileId: mediaTarget.id
      }
    });

    const settingsResponse = await injectJson(
      server,
      "PUT",
      buildReferenceModuleSettingsPath(MODULE_ID),
      {
        remoteBrowserDeliveryTargetProfileId: browserDeliveryTarget.id
      }
    );
    expect(settingsResponse.statusCode).toBe(200);
    expect(settingsResponse.body.settings.values.remoteBrowserDeliveryTargetProfileId).toBe(
      browserDeliveryTarget.id
    );

    const templatePage = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Posts Page",
      pageKind: "content-detail",
      deploymentMode: "per-record",
      primarySourceType: "blog-post",
      sourceSelectionMode: "all-records",
      path: "/posts",
      pathPattern: "/posts/{slug}",
      layoutKey: "story-shell",
      primarySource: {
        sourceType: "blog-post",
        itemId: null,
        bindAs: "primary"
      },
      status: "published",
      publishedOn: "2026-03-09T10:00:00.000Z",
      seoTitle: "Posts Page",
      seoDescription: "Posts page description",
      ogTitle: "Posts Page",
      ogDescription: "Posts page description"
    });
    expect(templatePage.statusCode).toBe(201);

    const firstSyncResponse = await injectJson(
      server,
      "POST",
      buildSyncDeploymentRoute(templatePage.body.item.id),
      {}
    );
    expect(firstSyncResponse.statusCode).toBe(200);
    expect(firstSyncResponse.body.item).toEqual(
      expect.objectContaining({
        deploymentStatus: "clean",
        deploymentTargetCount: 1,
        deploymentSyncedCount: 1,
        deploymentStaleCount: 0,
        deploymentMissingCount: 0
      })
    );

    const secondSyncResponse = await injectJson(
      server,
      "POST",
      buildSyncDeploymentRoute(templatePage.body.item.id),
      {}
    );
    expect(secondSyncResponse.statusCode).toBe(200);
    expect(secondSyncResponse.body.item).toEqual(
      expect.objectContaining({
        deploymentStatus: "clean",
        deploymentTargetCount: 1,
        deploymentSyncedCount: 1,
        deploymentStaleCount: 0,
        deploymentMissingCount: 0
      })
    );

    const deploymentHtml = await readDeploymentHtml(
      sandbox.deploymentRootDir,
      "posts/launch-window-update/index.html"
    );
    expect(deploymentHtml).toContain("http://content.example.com/posts/launch-window-update");
    expect(deploymentHtml).toContain("\"publicOrigin\":\"http://content.example.com\"");
    expect(deploymentHtml).toContain("\"temporaryMediaBaseUrl\":\"https://storage.googleapis.com/content-example-media/library\"");

    const deliveryResponse = await injectJson(
      server,
      "GET",
      `${buildDeliveryRoute(templatePage.body.item.id)}?preview=true&sourceItemId=${post.id}`
    );
    expect(deliveryResponse.statusCode).toBe(200);
    expect(deliveryResponse.body.payload.delivery).toEqual(
      expect.objectContaining({
        accessMode: "custom-domain",
        dnsMode: "external",
        publicOrigin: "http://content.example.com",
        publicUrl: "http://content.example.com/posts/launch-window-update",
        temporaryDeploymentBaseUrl: "https://storage.googleapis.com/content.example.com",
        temporaryMediaBaseUrl: "https://storage.googleapis.com/content-example-media/library"
      })
    );
    expect(deliveryResponse.body.payload.head.canonicalUrl).toBe(
      "http://content.example.com/posts/launch-window-update"
    );
  } finally {
    await server.close();
    await sandbox.cleanup();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("pages emit HTTPS load-balancer browser-delivery metadata including public media base", async () => {
  const sandbox = await createDeploymentSandbox();
  const server = await createEphemeralReferenceServer({
    referenceStatePersistence: sandbox.referenceStatePersistence
  });

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);
    const heroMedia = await seedMedia(server, {
      fileName: "https-delivery-story.png"
    });
    const post = await seedPost(server, editor.id, category.id, tag.id, {
      title: "HTTPS Delivery Story",
      status: "published",
      publishedOn: "2026-03-09T08:30:00.000Z",
      featuredMediaId: heroMedia.id,
      ogImageMediaId: heroMedia.id,
      galleryMediaIds: [heroMedia.id]
    });

    const connection = await seedRemoteConnectionProfile(server);
    const deploymentTarget = await seedRemoteTargetProfile(server, {
      title: "Deployment Bucket",
      connectionProfileId: connection.id,
      targetKind: "deployment-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "content.example.com",
        prefix: ""
      }
    });
    const mediaTarget = await seedRemoteTargetProfile(server, {
      title: "Media Bucket",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "content-example-media",
        prefix: "library"
      }
    });
    const browserDeliveryTarget = await seedRemoteTargetProfile(server, {
      title: "Delivery Domain",
      connectionProfileId: connection.id,
      targetKind: "browser-delivery",
      adapterMode: "live-gcp",
      config: {
        accessMode: "custom-domain",
        stackMode: "https-load-balancer",
        dnsMode: "external",
        hostname: "content.example.com",
        deploymentTargetProfileId: deploymentTarget.id,
        mediaTargetProfileId: mediaTarget.id
      }
    });

    const settingsResponse = await injectJson(
      server,
      "PUT",
      buildReferenceModuleSettingsPath(MODULE_ID),
      {
        remoteBrowserDeliveryTargetProfileId: browserDeliveryTarget.id
      }
    );
    expect(settingsResponse.statusCode).toBe(200);

    const templatePage = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Posts Page",
      pageKind: "content-detail",
      deploymentMode: "per-record",
      primarySourceType: "blog-post",
      sourceSelectionMode: "all-records",
      path: "/posts",
      pathPattern: "/posts/{slug}",
      layoutKey: "story-shell",
      primarySource: {
        sourceType: "blog-post",
        itemId: null,
        bindAs: "primary"
      },
      status: "published",
      publishedOn: "2026-03-09T10:00:00.000Z"
    });
    expect(templatePage.statusCode).toBe(201);

    const syncResponse = await injectJson(
      server,
      "POST",
      buildSyncDeploymentRoute(templatePage.body.item.id),
      {}
    );
    expect(syncResponse.statusCode).toBe(200);

    const deploymentHtml = await readDeploymentHtml(
      sandbox.deploymentRootDir,
      "posts/https-delivery-story/index.html"
    );
    expect(deploymentHtml).toContain("https://content.example.com/posts/https-delivery-story");
    expect(deploymentHtml).toContain("\"publicOrigin\":\"https://content.example.com\"");
    expect(deploymentHtml).toContain("\"publicMediaBaseUrl\":\"https://content.example.com/library\"");
    expect(deploymentHtml).toContain("https://content.example.com/library/originals");
    expect(deploymentHtml).toContain("property=\"og:image\" content=\"https://content.example.com/library/originals");

    const deliveryResponse = await injectJson(
      server,
      "GET",
      `${buildDeliveryRoute(templatePage.body.item.id)}?preview=true&sourceItemId=${post.id}`
    );
    expect(deliveryResponse.statusCode).toBe(200);
    expect(deliveryResponse.body.payload.delivery).toEqual(
      expect.objectContaining({
        accessMode: "custom-domain",
        dnsMode: "external",
        publicOrigin: "https://content.example.com",
        publicUrl: "https://content.example.com/posts/https-delivery-story",
        publicMediaBaseUrl: "https://content.example.com/library",
        temporaryDeploymentBaseUrl: "https://storage.googleapis.com/content.example.com",
        temporaryMediaBaseUrl: "https://storage.googleapis.com/content-example-media/library"
      })
    );
    expect(deliveryResponse.body.payload.media).toEqual(
      expect.objectContaining({
        referencedIds: expect.arrayContaining([heroMedia.id]),
        publicBaseUrl: "https://content.example.com/library",
        temporaryBaseUrl: "https://storage.googleapis.com/content-example-media/library",
        items: expect.arrayContaining([
          expect.objectContaining({
            id: heroMedia.id,
            publicUrl: expect.stringContaining("https://content.example.com/library/originals"),
            temporaryUrl: expect.stringContaining("https://storage.googleapis.com/content-example-media/library/originals"),
            preferredUrl: expect.stringContaining("https://content.example.com/library/originals")
          })
        ])
      })
    );
    expect(deliveryResponse.body.payload.head.openGraph).toEqual(
      expect.objectContaining({
        imageMediaId: heroMedia.id,
        imageUrl: expect.stringContaining("https://content.example.com/library/originals"),
        image: expect.objectContaining({
          id: heroMedia.id,
          preferredUrl: expect.stringContaining("https://content.example.com/library/originals")
        })
      })
    );
    expect(deliveryResponse.body.payload.data.primary.record).toEqual(
      expect.objectContaining({
        featuredMediaId: heroMedia.id,
        featuredMedia: expect.objectContaining({
          id: heroMedia.id,
          preferredUrl: expect.stringContaining("https://content.example.com/library/originals")
        }),
        galleryMediaIds: [heroMedia.id],
        galleryMedia: [
          expect.objectContaining({
            id: heroMedia.id,
            preferredUrl: expect.stringContaining("https://content.example.com/library/originals")
          })
        ]
      })
    );
    expect(deliveryResponse.body.payload.runtime.clientRuntime).toEqual(
      expect.objectContaining({
        bootstrapDatasets: expect.arrayContaining(["page-payload", "page-media", "page-slot-primary"]),
        context: expect.objectContaining({
          primaryRecordId: post.id,
          primarySourceType: "blog-post",
          commentsEnabled: true
        }),
        slots: expect.arrayContaining([
          expect.objectContaining({
            bindAs: "primary",
            dataset: "page-slot-primary",
            sourceType: "blog-post",
            recordMode: "single-item"
          })
        ]),
        remote: expect.objectContaining({
          baseUrl: "https://content.example.com",
          defaultHeaders: expect.objectContaining({
            Accept: "application/json"
          })
        }),
        queries: expect.arrayContaining([
          expect.objectContaining({
            resource: "page",
            query: "currentRemote",
            remote: expect.objectContaining({
              path: expect.stringContaining("/delivery/resolve?path="),
              responsePath: "payload"
            })
          }),
          expect.objectContaining({
            resource: "media",
            query: "byId",
            dataset: "page-media"
          }),
          expect.objectContaining({
            resource: "page-slot",
            query: "primary",
            dataset: "page-slot-primary",
            remote: expect.objectContaining({
              path: expect.stringContaining("/delivery/resolve?path="),
              responsePath: "payload.data.primary"
            })
          }),
          expect.objectContaining({
            resource: "comments",
            query: "byPost",
            dataset: "post-comments",
            remote: expect.objectContaining({
              path: "/api/reference/collections/blog-comments/items",
              queryParams: expect.objectContaining({
                postId: "context.primaryRecordId",
                status: "approved"
              })
            }),
            remoteResult: expect.objectContaining({
              type: "collection",
              itemsPath: "items",
              totalPath: "meta.total"
            })
          })
        ]),
        actions: expect.arrayContaining([
          expect.objectContaining({
            action: "page.refresh",
            local: expect.objectContaining({
              kind: "sync-dataset",
              dataset: "page-payload"
            })
          }),
          expect.objectContaining({
            action: "media.refresh",
            local: expect.objectContaining({
              kind: "sync-dataset",
              dataset: "page-media"
            })
          }),
          expect.objectContaining({
            action: "comments.refresh",
            local: expect.objectContaining({
              kind: "sync-dataset",
              dataset: "post-comments"
            })
          }),
          expect.objectContaining({
            action: "page-slot.refresh.primary",
            local: expect.objectContaining({
              kind: "sync-dataset",
              dataset: "page-slot-primary"
            })
          }),
          expect.objectContaining({
            action: "comments.submit",
            markDatasetsDirty: ["post-comments"],
            remote: expect.objectContaining({
              method: "POST",
              path: "/api/reference/collections/blog-comments/items"
            })
          })
        ]),
        datasets: expect.arrayContaining([
          expect.objectContaining({
            dataset: "page-payload",
            remoteSync: expect.objectContaining({
              path: expect.stringContaining("/delivery/resolve?path=")
            }),
            responsePath: "payload",
            remoteValuePath: "payload"
          }),
          expect.objectContaining({
            dataset: "page-media",
            remoteSync: expect.objectContaining({
              path: expect.stringContaining("/delivery/resolve?path=")
            }),
            responsePath: "payload",
            remoteValuePath: "payload.media.items"
          }),
          expect.objectContaining({
            dataset: "page-slot-primary",
            valuePath: "data.primary",
            remoteSync: expect.objectContaining({
              path: expect.stringContaining("/delivery/resolve?path=")
            }),
            remoteValuePath: "payload.data.primary"
          }),
          expect.objectContaining({
            dataset: "post-comments",
            remoteInstall: expect.objectContaining({
              path: "/api/reference/collections/blog-comments/items",
              queryParams: expect.objectContaining({
                postId: "context.primaryRecordId",
                status: "approved"
              })
            }),
            remoteSync: expect.objectContaining({
              path: "/api/reference/collections/blog-comments/items"
            }),
            remoteValuePath: "items"
          })
        ])
      })
    );
    expect(deliveryResponse.body.payload.head.canonicalUrl).toBe(
      "https://content.example.com/posts/https-delivery-story"
    );
  } finally {
    await server.close();
    await sandbox.cleanup();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("page-owned browser-delivery binding overrides the Pages module default", async () => {
  const sandbox = await createDeploymentSandbox();
  const server = await createEphemeralReferenceServer({
    referenceStatePersistence: sandbox.referenceStatePersistence
  });

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);
    const post = await seedPost(server, editor.id, category.id, tag.id, {
      title: "Override Delivery Story",
      status: "published",
      publishedOn: "2026-03-09T08:30:00.000Z"
    });

    const connection = await seedRemoteConnectionProfile(server);
    const deploymentTarget = await seedRemoteTargetProfile(server, {
      title: "Deployment Bucket",
      connectionProfileId: connection.id,
      targetKind: "deployment-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "content.example.com",
        prefix: ""
      }
    });
    const mediaTarget = await seedRemoteTargetProfile(server, {
      title: "Media Bucket",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      adapterMode: "live-gcp",
      config: {
        bucketName: "content-example-media",
        prefix: "library"
      }
    });
    const moduleBrowserDeliveryTarget = await seedRemoteTargetProfile(server, {
      title: "Module Delivery Domain",
      connectionProfileId: connection.id,
      targetKind: "browser-delivery",
      adapterMode: "live-gcp",
      config: {
        accessMode: "custom-domain",
        dnsMode: "external",
        hostname: "content.example.com",
        deploymentTargetProfileId: deploymentTarget.id,
        mediaTargetProfileId: mediaTarget.id
      }
    });
    const pageBrowserDeliveryTarget = await seedRemoteTargetProfile(server, {
      title: "Page Delivery Domain",
      connectionProfileId: connection.id,
      targetKind: "browser-delivery",
      adapterMode: "live-gcp",
      config: {
        accessMode: "custom-domain",
        dnsMode: "external",
        hostname: "stories.example.com",
        deploymentTargetProfileId: deploymentTarget.id,
        mediaTargetProfileId: mediaTarget.id
      }
    });

    const settingsResponse = await injectJson(
      server,
      "PUT",
      buildReferenceModuleSettingsPath(MODULE_ID),
      {
        remoteBrowserDeliveryTargetProfileId: moduleBrowserDeliveryTarget.id
      }
    );
    expect(settingsResponse.statusCode).toBe(200);

    const templatePage = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Posts Page",
      pageKind: "content-detail",
      deploymentMode: "per-record",
      primarySourceType: "blog-post",
      sourceSelectionMode: "all-records",
      path: "/posts",
      pathPattern: "/posts/{slug}",
      remoteBrowserDeliveryTargetProfileId: pageBrowserDeliveryTarget.id,
      layoutKey: "story-shell",
      primarySource: {
        sourceType: "blog-post",
        itemId: null,
        bindAs: "primary"
      },
      status: "published",
      publishedOn: "2026-03-09T10:00:00.000Z"
    });
    expect(templatePage.statusCode).toBe(201);

    const syncResponse = await injectJson(
      server,
      "POST",
      buildSyncDeploymentRoute(templatePage.body.item.id),
      {}
    );
    expect(syncResponse.statusCode).toBe(200);

    const deploymentHtml = await readDeploymentHtml(
      sandbox.deploymentRootDir,
      "posts/override-delivery-story/index.html"
    );
    expect(deploymentHtml).toContain("http://stories.example.com/posts/override-delivery-story");
    expect(deploymentHtml).not.toContain("http://content.example.com/posts/override-delivery-story");

    const deliveryResponse = await injectJson(
      server,
      "GET",
      `${buildDeliveryRoute(templatePage.body.item.id)}?preview=true&sourceItemId=${post.id}`
    );
    expect(deliveryResponse.statusCode).toBe(200);
    expect(deliveryResponse.body.payload.delivery).toEqual(
      expect.objectContaining({
        publicOrigin: "http://stories.example.com",
        publicUrl: "http://stories.example.com/posts/override-delivery-story"
      })
    );
    expect(deliveryResponse.body.payload.head.canonicalUrl).toBe(
      "http://stories.example.com/posts/override-delivery-story"
    );
  } finally {
    await server.close();
    await sandbox.cleanup();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("pages publish from page records and redirects target standalone pages", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const editor = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);
    const scheduledPost = await seedPost(server, editor.id, category.id, tag.id, {
      title: "Scheduled Launch Update",
      status: "scheduled",
      scheduledOn: "2026-03-09T08:30:00.000Z"
    });

    const page = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Scheduled Launch Story",
      pageKind: "content-detail",
      primarySourceType: "blog-post",
      path: "/stories/scheduled-launch",
      primarySource: {
        sourceType: "blog-post",
        itemId: scheduledPost.id,
        bindAs: "primary"
      },
      status: "scheduled",
      scheduledOn: "2026-03-09T09:00:00.000Z",
      seoTitle: "Scheduled Launch Story",
      seoDescription: "Scheduled launch story description",
      ogTitle: "Scheduled Launch Story",
      ogDescription: "Scheduled launch story description"
    });
    expect(page.statusCode).toBe(201);

    const publishResponse = await injectJson(server, "POST", buildPublishRoute(page.body.item.id), {
      updatedByAuthorId: editor.id
    });
    expect(publishResponse.statusCode).toBe(200);
    expect(publishResponse.body.item).toEqual(
      expect.objectContaining({
        id: page.body.item.id,
        status: "published",
        publishedOn: expect.any(String)
      })
    );

    const updatedPost = await injectJson(server, "GET", buildItemRoute("blog-posts", scheduledPost.id));
    expect(updatedPost.statusCode).toBe(200);
    expect(updatedPost.body.item).toEqual(
      expect.objectContaining({
        id: scheduledPost.id,
        status: "published",
        publishedOn: expect.any(String)
      })
    );

    const revisionsResponse = await injectJson(
      server,
      "GET",
      `${buildItemsRoute("blog-post-revisions")}?postId=${scheduledPost.id}&limit=200`
    );
    expect(revisionsResponse.statusCode).toBe(200);
    expect(revisionsResponse.body.items).toHaveLength(2);

    const redirect = await injectJson(server, "POST", buildItemsRoute("blog-redirect-rules"), {
      sourcePath: "/launch-update",
      targetPageId: page.body.item.id,
      httpCode: "301",
      status: "active",
      reason: "Permalink migration"
    });
    expect(redirect.statusCode).toBe(201);
    expect(redirect.body.item).toEqual(
      expect.objectContaining({
        sourcePath: "/launch-update",
        targetPageId: page.body.item.id
      })
    );

    const duplicateRule = await injectJson(server, "POST", buildItemsRoute("blog-redirect-rules"), {
      sourcePath: "/launch-update/",
      targetUrl: "https://example.com/stories/scheduled-launch",
      httpCode: "302",
      status: "active"
    });
    expect(duplicateRule.statusCode).toBe(400);
    expect(duplicateRule.body.error.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAGE_REDIRECT_SOURCE_PATH_CONFLICT"
        })
      ])
    );
  } finally {
    await server.close();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("pages publish generates deployment html, updates old artifacts, and removes archived deployments", async () => {
  const sandbox = await createDeploymentSandbox({
    appMountTagName: "page-runtime"
  });
  const server = await createEphemeralReferenceServer({
    referenceStatePersistence: sandbox.referenceStatePersistence
  });

  try {
    const editor = await seedAuthor(server, {
      displayName: "Deployment Editor",
      email: "deployment-editor@example.com"
    });
    const category = await seedCategory(server, {
      name: "Announcements"
    });
    const tag = await seedTag(server, {
      name: "Launch"
    });
    const scheduledPost = await seedPost(server, editor.id, category.id, tag.id, {
      title: "Launch Rollout Story",
      status: "draft"
    });

    const pageResponse = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Launch Rollout Page",
      pageKind: "content-detail",
      primarySourceType: "blog-post",
      path: "/stories/launch-rollout",
      layoutKey: "story-shell",
      primarySource: {
        sourceType: "blog-post",
        itemId: scheduledPost.id,
        bindAs: "primary"
      },
      runtimeScriptUrls: [
        {
          url: "https://cdn.example.com/runtime/app.js"
        },
        {
          url: "/assets/runtime/entry.js"
        }
      ],
      status: "draft",
      seoTitle: "Launch Rollout SEO",
      seoDescription: "Launch rollout SEO description",
      canonicalUrl: "https://example.com/stories/launch-rollout",
      ogTitle: "Launch Rollout OG",
      ogDescription: "Launch rollout OG description"
    });
    expect(pageResponse.statusCode).toBe(201);

    const publishResponse = await injectJson(server, "POST", buildPublishRoute(pageResponse.body.item.id), {
      updatedByAuthorId: editor.id
    });
    expect(publishResponse.statusCode).toBe(200);
    expect(publishResponse.body.item).toEqual(
      expect.objectContaining({
        status: "published",
        deploymentArtifactPath: "stories/launch-rollout/index.html",
        deploymentSyncedOn: expect.any(String)
      })
    );

    const initialHtml = await readDeploymentHtml(
      sandbox.deploymentRootDir,
      "stories/launch-rollout/index.html"
    );
    expect(initialHtml).toContain("<page-runtime");
    expect(initialHtml).toContain("window.__CRUD_CLIENT_RUNTIME_CONFIG__ =");
    expect(initialHtml).toContain("/assets/client-runtime.global.js");
    expect(initialHtml).toContain("\"page-slot-primary\"");
    expect(initialHtml).toContain("https://cdn.example.com/runtime/app.js");
    expect(initialHtml).toContain("/assets/runtime/entry.js");
    expect(initialHtml).toContain("type=\"application/json\" id=\"page-data\"");
    expect(initialHtml).toContain("Launch Rollout SEO");
    expect(initialHtml).toContain("https://example.com/stories/launch-rollout");
    await expect(
      fs.access(path.join(sandbox.deploymentRootDir, "assets", "client-runtime.global.js"))
    ).resolves.toBeUndefined();

    const updateResponse = await injectJson(
      server,
      "PUT",
      buildItemRoute("blog-pages", pageResponse.body.item.id),
      {
        path: "/stories/launch-rollout-recap",
        seoTitle: "Launch Rollout Recap",
        runtimeScriptUrls: [
          {
            url: "/assets/runtime/recap.js"
          }
        ]
      }
    );
    expect(updateResponse.statusCode).toBe(200);

    await expect(
      fs.access(path.join(sandbox.deploymentRootDir, "stories", "launch-rollout", "index.html"))
    ).rejects.toMatchObject({
      code: "ENOENT"
    });

    const updatedPageResponse = await injectJson(
      server,
      "GET",
      buildItemRoute("blog-pages", pageResponse.body.item.id)
    );
    expect(updatedPageResponse.statusCode).toBe(200);
    expect(updatedPageResponse.body.item).toEqual(
      expect.objectContaining({
        path: "/stories/launch-rollout-recap",
        status: "published",
        deploymentArtifactPath: "stories/launch-rollout-recap/index.html",
        deploymentSyncedOn: expect.any(String)
      })
    );

    const updatedHtml = await readDeploymentHtml(
      sandbox.deploymentRootDir,
      "stories/launch-rollout-recap/index.html"
    );
    expect(updatedHtml).toContain("Launch Rollout Recap");
    expect(updatedHtml).toContain("/assets/client-runtime.global.js");
    expect(updatedHtml).toContain("/assets/runtime/recap.js");
    expect(updatedHtml).not.toContain("/assets/runtime/entry.js");

    const archiveResponse = await injectJson(
      server,
      "PUT",
      buildItemRoute("blog-pages", pageResponse.body.item.id),
      {
        status: "archived"
      }
    );
    expect(archiveResponse.statusCode).toBe(200);

    await expect(
      fs.access(path.join(sandbox.deploymentRootDir, "stories", "launch-rollout-recap", "index.html"))
    ).rejects.toMatchObject({
      code: "ENOENT"
    });

    const archivedPageResponse = await injectJson(
      server,
      "GET",
      buildItemRoute("blog-pages", pageResponse.body.item.id)
    );
    expect(archivedPageResponse.statusCode).toBe(200);
    expect(archivedPageResponse.body.item).toEqual(
      expect.objectContaining({
        status: "archived",
        deploymentArtifactPath: null,
        deploymentSyncedOn: null
      })
    );
  } finally {
    await server.close();
    await sandbox.cleanup();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("deployment bundles reject invalid remote target contracts on server-side save", async () => {
  const server = await createEphemeralReferenceServer();

  try {
    const connection = await seedRemoteConnectionProfile(server, {
      id: "conn-001"
    });
    const pageResponse = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Release Bundle Page",
      pageKind: "standalone",
      primarySourceType: "none",
      path: "/release-bundle-page",
      layoutKey: "landing-shell",
      status: "published"
    });
    expect(pageResponse.statusCode).toBe(201);

    const postsTarget = await seedRemoteTargetProfile(server, {
      id: "target-posts-001",
      title: "Posts Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "publishedPosts"
      }
    });
    const invalidCategoriesTarget = await seedRemoteTargetProfile(server, {
      id: "target-categories-001",
      title: "Categories Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "publicCategories"
      }
    });
    const tagsTarget = await seedRemoteTargetProfile(server, {
      id: "target-tags-001",
      title: "Tags Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        projectionScope: "public-blog-tags",
        firestoreCollectionPath: "publicTags"
      }
    });
    const mediaTarget = await seedRemoteTargetProfile(server, {
      id: "target-media-001",
      title: "Media Library",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        bucketName: "demo-media-bucket",
        prefix: "library"
      }
    });
    const deploymentTarget = await seedRemoteTargetProfile(server, {
      id: "target-deployment-001",
      title: "HTML Deployment",
      connectionProfileId: connection.id,
      targetKind: "deployment-storage",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        bucketName: "demo-deployment-bucket",
        prefix: "site"
      }
    });
    const browserTarget = await seedRemoteTargetProfile(server, {
      id: "target-browser-001",
      title: "Primary Domain",
      connectionProfileId: connection.id,
      targetKind: "browser-delivery",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        accessMode: "gcp-temporary",
        stackMode: "direct-storage",
        dnsMode: "external",
        deploymentTargetProfileId: deploymentTarget.id,
        mediaTargetProfileId: mediaTarget.id
      }
    });

    const invalidBundle = await injectJson(server, "POST", buildItemsRoute("page-deployment-bundles"), {
      title: "Posts Release Bundle",
      pageId: pageResponse.body.item.id,
      postsProjectionTargetProfileId: postsTarget.id,
      categoriesProjectionTargetProfileId: invalidCategoriesTarget.id,
      tagsProjectionTargetProfileId: tagsTarget.id,
      mediaTargetProfileId: mediaTarget.id,
      deploymentTargetProfileId: deploymentTarget.id,
      browserDeliveryTargetProfileId: browserTarget.id
    });

    expect(invalidBundle.statusCode).toBe(400);
    expect(invalidBundle.body.error.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PAGE_DEPLOYMENT_BUNDLE_TARGET_SCOPE_INVALID",
          fieldId: "categoriesProjectionTargetProfileId"
        })
      ])
    );
  } finally {
    await server.close();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("deployment bundle release route executes the full server-owned bundle pipeline", async () => {
  const sandbox = await createDeploymentAndMediaSandbox();
  const server = await createEphemeralReferenceServer({
    referenceStatePersistence: sandbox.referenceStatePersistence
  });
  let postsTargetId = null;
  let categoriesTargetId = null;
  let tagsTargetId = null;
  let mediaTargetId = null;
  let deploymentTargetId = null;

  try {
    const author = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);
    const mediaItem = await seedMedia(server, {
      fileName: "release-hero.png"
    });
    expect(mediaItem.relativePath).toEqual(expect.any(String));
    await seedPost(server, author.id, category.id, tag.id, {
      title: "Bundle Release Story",
      status: "published",
      publishedOn: "2026-03-15T10:00:00.000Z",
      seoTitle: "Bundle Release Story",
      seoDescription: "Bundle release story description"
    });

    const pageResponse = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Posts Page",
      pageKind: "content-detail",
      deploymentMode: "per-record",
      primarySourceType: "blog-post",
      sourceSelectionMode: "all-records",
      path: "/posts",
      pathPattern: "/posts/{slug}",
      layoutKey: "story-shell",
      primarySource: {
        sourceType: "blog-post",
        itemId: null,
        bindAs: "primary"
      },
      status: "published",
      publishedOn: "2026-03-15T10:05:00.000Z"
    });
    expect(pageResponse.statusCode).toBe(201);

    const connection = await seedRemoteConnectionProfile(server, {
      id: "conn-release-001"
    });
    const postsTarget = await seedRemoteTargetProfile(server, {
      id: "target-posts-release-001",
      title: "Posts Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "publishedPosts"
      }
    });
    postsTargetId = postsTarget.id;
    const categoriesTarget = await seedRemoteTargetProfile(server, {
      id: "target-categories-release-001",
      title: "Categories Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        projectionScope: "public-blog-categories",
        firestoreCollectionPath: "publicCategories"
      }
    });
    categoriesTargetId = categoriesTarget.id;
    const tagsTarget = await seedRemoteTargetProfile(server, {
      id: "target-tags-release-001",
      title: "Tags Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        projectionScope: "public-blog-tags",
        firestoreCollectionPath: "publicTags"
      }
    });
    tagsTargetId = tagsTarget.id;
    const mediaTarget = await seedRemoteTargetProfile(server, {
      id: "target-media-release-001",
      title: "Media Library",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        bucketName: "demo-media-bucket",
        prefix: "library",
        localRootHint: "media"
      }
    });
    mediaTargetId = mediaTarget.id;
    const deploymentTarget = await seedRemoteTargetProfile(server, {
      id: "target-deployment-release-001",
      title: "HTML Deployment",
      connectionProfileId: connection.id,
      targetKind: "deployment-storage",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        bucketName: "demo-deployment-bucket",
        prefix: "site",
        localRootHint: "deployment"
      }
    });
    deploymentTargetId = deploymentTarget.id;
    const browserTarget = await seedRemoteTargetProfile(server, {
      id: "target-browser-release-001",
      title: "Primary Domain",
      connectionProfileId: connection.id,
      targetKind: "browser-delivery",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: {
        state: "validated",
        canProceed: true
      },
      config: {
        accessMode: "custom-domain",
        stackMode: "https-load-balancer",
        dnsMode: "external",
        hostname: "stories.example.com",
        dnsZone: "stories-example-com",
        certificateName: "stories-example-com-cert",
        deploymentTargetProfileId: deploymentTarget.id,
        mediaTargetProfileId: mediaTarget.id
      }
    });
    await Promise.all([
      fs.rm(resolveSimulatedFirestoreRoot(postsTarget.id), { recursive: true, force: true }),
      fs.rm(resolveSimulatedFirestoreRoot(categoriesTarget.id), { recursive: true, force: true }),
      fs.rm(resolveSimulatedFirestoreRoot(tagsTarget.id), { recursive: true, force: true }),
      fs.rm(resolveSimulatedStorageRoot(mediaTarget.id), { recursive: true, force: true }),
      fs.rm(resolveSimulatedStorageRoot(deploymentTarget.id), { recursive: true, force: true })
    ]);
    const bundle = await seedDeploymentBundle(server, {
      title: "Posts Release Bundle",
      pageId: pageResponse.body.item.id,
      postsProjectionTargetProfileId: postsTarget.id,
      categoriesProjectionTargetProfileId: categoriesTarget.id,
      tagsProjectionTargetProfileId: tagsTarget.id,
      mediaTargetProfileId: mediaTarget.id,
      deploymentTargetProfileId: deploymentTarget.id,
      browserDeliveryTargetProfileId: browserTarget.id
    });

    const releaseResponse = await injectJson(
      server,
      "POST",
      buildBundleReleaseRoute(bundle.id),
      {}
    );

    expect(releaseResponse.statusCode).toBe(200);
    expect(releaseResponse.body).toEqual(
      expect.objectContaining({
        ok: true,
        message: "Release pipeline completed for 'Posts Release Bundle'",
        run: expect.objectContaining({
          bundleId: bundle.id,
          pageId: pageResponse.body.item.id,
          status: "completed",
          successfulStepCount: 12,
          failedStepCount: 0,
          steps: expect.arrayContaining([
            expect.objectContaining({
              key: "sync-local-html",
              status: "success"
            }),
            expect.objectContaining({
              key: "validate-browser-delivery",
              status: "success"
            })
          ])
        })
      })
    );

    const updatedDeploymentTarget = await injectJson(
      server,
      "GET",
      buildItemRoute("remote-target-profiles", deploymentTarget.id)
    );
    expect(updatedDeploymentTarget.statusCode).toBe(200);
    expect(updatedDeploymentTarget.body.item).toEqual(
      expect.objectContaining({
        targetStatus: "validated",
        compareSummary: expect.objectContaining({
          state: "clean"
        })
      })
    );

    const updatedBrowserTarget = await injectJson(
      server,
      "GET",
      buildItemRoute("remote-target-profiles", browserTarget.id)
    );
    expect(updatedBrowserTarget.statusCode).toBe(200);
    expect(updatedBrowserTarget.body.item).toEqual(
      expect.objectContaining({
        targetStatus: "warning",
        validationSummary: expect.objectContaining({
          state: "warning",
          canProceed: true
        })
      })
    );

    const firestoreProjectionPath = path.join(
      resolveSimulatedFirestoreRoot(postsTarget.id),
      "publishedPosts",
      "bundle-release-story.json"
    );
    const deploymentArtifactPath = path.join(
      resolveSimulatedStorageRoot(deploymentTarget.id),
      "site",
      "posts",
      "bundle-release-story",
      "index.html"
    );
    const mediaArtifactPath = path.join(
      resolveSimulatedStorageRoot(mediaTarget.id),
      "library",
      ...(mediaItem.relativePath ?? "").split("/")
    );

    await expect(waitForFileExists(firestoreProjectionPath)).resolves.toBeUndefined();
    await expect(waitForFileExists(deploymentArtifactPath)).resolves.toBeUndefined();
    await expect(waitForFileExists(mediaArtifactPath)).resolves.toBeUndefined();
  } finally {
    await server.close();
    await Promise.all(
      [
        postsTargetId ? fs.rm(resolveSimulatedFirestoreRoot(postsTargetId), { recursive: true, force: true }) : null,
        categoriesTargetId ? fs.rm(resolveSimulatedFirestoreRoot(categoriesTargetId), { recursive: true, force: true }) : null,
        tagsTargetId ? fs.rm(resolveSimulatedFirestoreRoot(tagsTargetId), { recursive: true, force: true }) : null,
        mediaTargetId ? fs.rm(resolveSimulatedStorageRoot(mediaTargetId), { recursive: true, force: true }) : null,
        deploymentTargetId ? fs.rm(resolveSimulatedStorageRoot(deploymentTargetId), { recursive: true, force: true }) : null
      ].filter(Boolean).map((promise) => promise.catch(() => {}))
    );
    await sandbox.cleanup();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("deployment bundle release mission executes the full server-owned bundle pipeline asynchronously", async () => {
  const sandbox = await createDeploymentAndMediaSandbox();
  const server = await createEphemeralReferenceServer({
    referenceStatePersistence: sandbox.referenceStatePersistence
  });
  let postsTargetId = null;
  let categoriesTargetId = null;
  let tagsTargetId = null;
  let mediaTargetId = null;
  let deploymentTargetId = null;

  try {
    const author = await seedAuthor(server);
    const category = await seedCategory(server);
    const tag = await seedTag(server);
    const mediaItem = await seedMedia(server, {
      fileName: "mission-release-hero.png"
    });
    await seedPost(server, author.id, category.id, tag.id, {
      title: "Mission Release Story",
      status: "published",
      publishedOn: "2026-03-15T10:00:00.000Z",
      seoTitle: "Mission Release Story",
      seoDescription: "Mission release story description"
    });

    const pageResponse = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Posts Page",
      pageKind: "content-detail",
      deploymentMode: "per-record",
      primarySourceType: "blog-post",
      sourceSelectionMode: "all-records",
      path: "/posts",
      pathPattern: "/posts/{slug}",
      layoutKey: "story-shell",
      primarySource: {
        sourceType: "blog-post",
        itemId: null,
        bindAs: "primary"
      },
      status: "published",
      publishedOn: "2026-03-15T10:05:00.000Z"
    });
    expect(pageResponse.statusCode).toBe(201);

    const connection = await seedRemoteConnectionProfile(server, {
      id: "conn-release-mission-001"
    });
    const postsTarget = await seedRemoteTargetProfile(server, {
      id: "target-posts-release-mission-001",
      title: "Posts Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true },
      config: {
        projectionScope: "published-blog-posts",
        firestoreCollectionPath: "publishedPosts"
      }
    });
    postsTargetId = postsTarget.id;
    const categoriesTarget = await seedRemoteTargetProfile(server, {
      id: "target-categories-release-mission-001",
      title: "Categories Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true },
      config: {
        projectionScope: "public-blog-categories",
        firestoreCollectionPath: "publicCategories"
      }
    });
    categoriesTargetId = categoriesTarget.id;
    const tagsTarget = await seedRemoteTargetProfile(server, {
      id: "target-tags-release-mission-001",
      title: "Tags Projection",
      connectionProfileId: connection.id,
      targetKind: "firestore-projection",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true },
      config: {
        projectionScope: "public-blog-tags",
        firestoreCollectionPath: "publicTags"
      }
    });
    tagsTargetId = tagsTarget.id;
    const mediaTarget = await seedRemoteTargetProfile(server, {
      id: "target-media-release-mission-001",
      title: "Media Library",
      connectionProfileId: connection.id,
      targetKind: "media-storage",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true },
      config: {
        bucketName: "demo-media-bucket",
        prefix: "library",
        localRootHint: "media"
      }
    });
    mediaTargetId = mediaTarget.id;
    const deploymentTarget = await seedRemoteTargetProfile(server, {
      id: "target-deployment-release-mission-001",
      title: "HTML Deployment",
      connectionProfileId: connection.id,
      targetKind: "deployment-storage",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true },
      config: {
        bucketName: "demo-deployment-bucket",
        prefix: "site",
        localRootHint: "deployment"
      }
    });
    deploymentTargetId = deploymentTarget.id;
    const browserTarget = await seedRemoteTargetProfile(server, {
      id: "target-browser-release-mission-001",
      title: "Primary Domain",
      connectionProfileId: connection.id,
      targetKind: "browser-delivery",
      adapterMode: "simulated-gcp",
      targetStatus: "validated",
      validationSummary: { state: "validated", canProceed: true },
      config: {
        accessMode: "custom-domain",
        stackMode: "https-load-balancer",
        dnsMode: "external",
        hostname: "stories.example.com",
        dnsZone: "stories-example-com",
        certificateName: "stories-example-com-cert",
        deploymentTargetProfileId: deploymentTarget.id,
        mediaTargetProfileId: mediaTarget.id
      }
    });
    await Promise.all([
      fs.rm(resolveSimulatedFirestoreRoot(postsTarget.id), { recursive: true, force: true }),
      fs.rm(resolveSimulatedFirestoreRoot(categoriesTarget.id), { recursive: true, force: true }),
      fs.rm(resolveSimulatedFirestoreRoot(tagsTarget.id), { recursive: true, force: true }),
      fs.rm(resolveSimulatedStorageRoot(mediaTarget.id), { recursive: true, force: true }),
      fs.rm(resolveSimulatedStorageRoot(deploymentTarget.id), { recursive: true, force: true })
    ]);
    const bundle = await seedDeploymentBundle(server, {
      title: "Posts Release Bundle",
      pageId: pageResponse.body.item.id,
      postsProjectionTargetProfileId: postsTarget.id,
      categoriesProjectionTargetProfileId: categoriesTarget.id,
      tagsProjectionTargetProfileId: tagsTarget.id,
      mediaTargetProfileId: mediaTarget.id,
      deploymentTargetProfileId: deploymentTarget.id,
      browserDeliveryTargetProfileId: browserTarget.id
    });

    const submitResponse = await injectJson(server, "POST", buildBundleReleaseMissionRoute(), {
      bundleId: bundle.id
    });
    expect(submitResponse.statusCode).toBe(202);
    expect(submitResponse.body).toEqual(
      expect.objectContaining({
        ok: true,
        mission: expect.objectContaining({
          missionId: PAGE_DEPLOYMENT_BUNDLE_RELEASE_MISSION_ID,
          moduleId: MODULE_ID
        }),
        job: expect.objectContaining({
          status: expect.stringMatching(/queued|running|succeeded/)
        })
      })
    );

    const completedJob = await waitForMissionJob(server, submitResponse.body.job.id);
    expect(completedJob).toEqual(
      expect.objectContaining({
        status: "succeeded",
        result: expect.objectContaining({
          output: expect.objectContaining({
            ok: true,
            message: "Release pipeline completed for 'Posts Release Bundle'",
            run: expect.objectContaining({
              bundleId: bundle.id,
              pageId: pageResponse.body.item.id,
              status: "completed",
              successfulStepCount: 12,
              failedStepCount: 0
            })
          })
        })
      })
    );

    const firestoreProjectionPath = path.join(
      resolveSimulatedFirestoreRoot(postsTarget.id),
      "publishedPosts",
      "mission-release-story.json"
    );
    const deploymentArtifactPath = path.join(
      resolveSimulatedStorageRoot(deploymentTarget.id),
      "site",
      "posts",
      "mission-release-story",
      "index.html"
    );
    const mediaArtifactPath = path.join(
      resolveSimulatedStorageRoot(mediaTarget.id),
      "library",
      ...(mediaItem.relativePath ?? "").split("/")
    );

    await expect(waitForFileExists(firestoreProjectionPath)).resolves.toBeUndefined();
    await expect(waitForFileExists(deploymentArtifactPath)).resolves.toBeUndefined();
    await expect(waitForFileExists(mediaArtifactPath)).resolves.toBeUndefined();
  } finally {
    await server.close();
    await Promise.all(
      [
        postsTargetId ? fs.rm(resolveSimulatedFirestoreRoot(postsTargetId), { recursive: true, force: true }) : null,
        categoriesTargetId ? fs.rm(resolveSimulatedFirestoreRoot(categoriesTargetId), { recursive: true, force: true }) : null,
        tagsTargetId ? fs.rm(resolveSimulatedFirestoreRoot(tagsTargetId), { recursive: true, force: true }) : null,
        mediaTargetId ? fs.rm(resolveSimulatedStorageRoot(mediaTargetId), { recursive: true, force: true }) : null,
        deploymentTargetId ? fs.rm(resolveSimulatedStorageRoot(deploymentTargetId), { recursive: true, force: true }) : null
      ].filter(Boolean).map((promise) => promise.catch(() => {}))
    );
    await sandbox.cleanup();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);

test("deleting a published standalone page removes its deployment artifact", async () => {
  const sandbox = await createDeploymentSandbox();
  const server = await createEphemeralReferenceServer({
    referenceStatePersistence: sandbox.referenceStatePersistence
  });

  try {
    const createResponse = await injectJson(server, "POST", buildItemsRoute("blog-pages"), {
      title: "Standalone Landing",
      pageKind: "standalone",
      primarySourceType: "none",
      path: "/landing",
      layoutKey: "landing-shell",
      runtimeScriptUrls: [
        {
          url: "/assets/runtime/landing.js"
        }
      ],
      status: "published",
      seoTitle: "Standalone Landing"
    });
    expect(createResponse.statusCode).toBe(201);

    const pageResponse = await injectJson(
      server,
      "GET",
      buildItemRoute("blog-pages", createResponse.body.item.id)
    );
    expect(pageResponse.statusCode).toBe(200);
    expect(pageResponse.body.item.deploymentArtifactPath).toBe("landing/index.html");

    const deploymentHtml = await readDeploymentHtml(
      sandbox.deploymentRootDir,
      "landing/index.html"
    );
    expect(deploymentHtml).toContain("<app-root");
    expect(deploymentHtml).toContain("/assets/runtime/landing.js");

    const deleteResponse = await injectJson(
      server,
      "DELETE",
      buildItemRoute("blog-pages", createResponse.body.item.id)
    );
    expect(deleteResponse.statusCode).toBe(200);

    await expect(
      fs.access(path.join(sandbox.deploymentRootDir, "landing", "index.html"))
    ).rejects.toMatchObject({
      code: "ENOENT"
    });
  } finally {
    await server.close();
    await sandbox.cleanup();
  }
}, BLOG_DISTRIBUTION_TEST_TIMEOUT_MS);
