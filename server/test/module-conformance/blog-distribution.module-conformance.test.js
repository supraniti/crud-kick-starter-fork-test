import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import {
  createEphemeralReferenceServer,
  createSharedReferenceStatePersistence,
  injectJson
} from "./helpers/reference-slice-runtime-test-helpers.js";

const BLOG_DISTRIBUTION_TEST_TIMEOUT_MS = 20_000;
const MODULE_ID = "test-modules-pages";

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

function createLongBody(label) {
  return `<p>${label} `.repeat(32) + "</p>";
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
    expect(initialHtml).toContain("https://cdn.example.com/runtime/app.js");
    expect(initialHtml).toContain("/assets/runtime/entry.js");
    expect(initialHtml).toContain("type=\"application/json\" id=\"page-data\"");
    expect(initialHtml).toContain("Launch Rollout SEO");
    expect(initialHtml).toContain("https://example.com/stories/launch-rollout");

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
