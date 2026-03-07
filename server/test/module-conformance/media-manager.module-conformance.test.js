import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeAll, expect, test } from "vitest";
import { fileURLToPath } from "node:url";
import {
  createEphemeralReferenceServer,
  injectJson,
  waitForMissionJob
} from "./helpers/reference-slice-runtime-test-helpers.js";
import { resolveMediaLibraryRootDir } from "../../../modules/test-modules-media-manager/server/media-library/media-library-root.mjs";

const MODULE_ID = "test-modules-media-manager";
const COLLECTION_ID = "media-items";
const MEDIA_LIBRARY_ROOT_PREFIX = "crud-media-library-";
const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=";

let mediaLibraryRootDir = "";

test("media manager defaults media storage to repo-root media directory", () => {
  const repositoryRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  expect(resolveMediaLibraryRootDir({ overrideDir: "" })).toBe(
    path.resolve(repositoryRootDir, "media")
  );
});

function buildMediaItemsRoute(pathSuffix = "") {
  const normalizedSuffix =
    typeof pathSuffix === "string" && pathSuffix.length > 0 ? `/${pathSuffix}` : "";
  return `/api/reference/modules/${MODULE_ID}/media-items${normalizedSuffix}`;
}

function buildCollectionItemRoute(itemId = "") {
  return `/api/reference/collections/${COLLECTION_ID}/items/${itemId}`;
}

function toAbsoluteMediaPath(relativePath) {
  return path.resolve(mediaLibraryRootDir, relativePath);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function createUploadPayload(overrides = {}) {
  return {
    fileName: "hero.png",
    mimeType: "image/png",
    contentBase64: ONE_PIXEL_PNG_BASE64,
    ...overrides
  };
}

beforeAll(async () => {
  mediaLibraryRootDir = await fs.mkdtemp(path.join(os.tmpdir(), MEDIA_LIBRARY_ROOT_PREFIX));
  process.env.REFERENCE_MEDIA_LIBRARY_ROOT_DIR = mediaLibraryRootDir;
});

test(
  "media manager routes upload, enrich, derive, and delete media deterministically",
  async () => {
    const server = await createEphemeralReferenceServer();

    try {
      const uploadResponse = await injectJson(
        server,
        "POST",
        `${buildMediaItemsRoute("uploads")}`,
        createUploadPayload()
      );
      expect(uploadResponse.statusCode).toBe(201);
      expect(uploadResponse.body.ok).toBe(true);
      expect(uploadResponse.body.collectionId).toBe(COLLECTION_ID);

      const originalItem = uploadResponse.body.item;
      const originalFilePath = toAbsoluteMediaPath(originalItem.relativePath);
      expect(await fileExists(originalFilePath)).toBe(true);

      const contentResponse = await server.inject({
        method: "GET",
        url: buildMediaItemsRoute(`${originalItem.id}/content`)
      });
      expect(contentResponse.statusCode).toBe(200);
      expect(contentResponse.headers["content-type"]).toContain("image/png");
      expect(contentResponse.body.length).toBeGreaterThan(0);

      const metadataResponse = await injectJson(
        server,
        "PUT",
        buildMediaItemsRoute(`${originalItem.id}/metadata`),
        {
          altText: "One pixel sample",
          description: "Upload path smoke proof",
          category: "campaign",
          usageLabels: ["hero", "marketing"]
        }
      );
      expect(metadataResponse.statusCode).toBe(200);
      expect(metadataResponse.body.item).toEqual(
        expect.objectContaining({
          id: originalItem.id,
          altText: "One pixel sample",
          category: "campaign",
          usageLabels: ["hero", "marketing"]
        })
      );

      const createJobResponse = await injectJson(
        server,
        "POST",
        "/api/reference/missions/media-library-image-compression/jobs",
        {
          mediaItemId: originalItem.id,
          preset: "thumbnail"
        }
      );
      expect(createJobResponse.statusCode).toBe(202);
      const jobId = createJobResponse.body.job?.id;
      expect(typeof jobId).toBe("string");

      const completedJob = await waitForMissionJob(server, jobId);
      expect(completedJob.status).toBe("succeeded");
      expect(completedJob.result?.output).toEqual(
        expect.objectContaining({
          sourceMediaId: originalItem.id,
          derivedMediaId: expect.any(String),
          preset: "thumbnail"
        })
      );

      const derivedItemId = completedJob.result.output.derivedMediaId;
      const derivedItemResponse = await injectJson(
        server,
        "GET",
        buildCollectionItemRoute(derivedItemId)
      );
      expect(derivedItemResponse.statusCode).toBe(200);
      expect(derivedItemResponse.body.item).toEqual(
        expect.objectContaining({
          id: derivedItemId,
          isDerived: true,
          sourceMediaId: originalItem.id,
          operationPreset: "thumbnail"
        })
      );
      const derivedFilePath = toAbsoluteMediaPath(derivedItemResponse.body.item.relativePath);
      expect(await fileExists(derivedFilePath)).toBe(true);

      const restrictedDeleteResponse = await injectJson(
        server,
        "DELETE",
        buildMediaItemsRoute(originalItem.id)
      );
      expect(restrictedDeleteResponse.statusCode).toBe(409);
      expect(restrictedDeleteResponse.body.error.code).toBe("REFERENCE_DELETE_RESTRICTED");

      const deleteDerivedResponse = await injectJson(
        server,
        "DELETE",
        buildMediaItemsRoute(derivedItemId)
      );
      expect(deleteDerivedResponse.statusCode).toBe(200);
      expect(await fileExists(derivedFilePath)).toBe(false);

      const deleteOriginalResponse = await injectJson(
        server,
        "DELETE",
        buildMediaItemsRoute(originalItem.id)
      );
      expect(deleteOriginalResponse.statusCode).toBe(200);
      expect(await fileExists(originalFilePath)).toBe(false);

      const itemsResponse = await injectJson(server, "GET", `/api/reference/collections/${COLLECTION_ID}/items`);
      expect(itemsResponse.statusCode).toBe(200);
      expect(itemsResponse.body.items).toEqual([]);
    } finally {
      await server.close();
    }
  },
  20_000
);

test(
  "media-items generic collection mutation routes stay blocked behind module-owned routes",
  async () => {
    const server = await createEphemeralReferenceServer();

    try {
      const genericCreateResponse = await injectJson(
        server,
        "POST",
        `/api/reference/collections/${COLLECTION_ID}/items`,
        {
          displayName: "Should fail",
          mediaKind: "image",
          mimeType: "image/png",
          fileSizeBytes: 67,
          status: "ready",
          category: "library",
          usageLabels: [],
          isDerived: false,
          operationPreset: "original",
          storageKey: "manual/path.png",
          relativePath: "manual/path.png",
          createdOn: "2026-03-06T00:00:00.000Z",
          updatedOn: "2026-03-06T00:00:00.000Z"
        }
      );
      expect(genericCreateResponse.statusCode).toBe(405);
      expect(genericCreateResponse.body.error.code).toBe("MEDIA_ITEMS_CREATE_UNSUPPORTED");

      const uploadResponse = await injectJson(
        server,
        "POST",
        `${buildMediaItemsRoute("uploads")}`,
        createUploadPayload({
          fileName: "locked.png"
        })
      );
      expect(uploadResponse.statusCode).toBe(201);

      const itemId = uploadResponse.body.item.id;
      const storedFilePath = toAbsoluteMediaPath(uploadResponse.body.item.relativePath);

      const genericUpdateResponse = await injectJson(
        server,
        "PUT",
        buildCollectionItemRoute(itemId),
        {
          displayName: "Blocked update"
        }
      );
      expect(genericUpdateResponse.statusCode).toBe(405);
      expect(genericUpdateResponse.body.error.code).toBe("MEDIA_ITEMS_UPDATE_UNSUPPORTED");

      const genericDeleteResponse = await injectJson(
        server,
        "DELETE",
        buildCollectionItemRoute(itemId)
      );
      expect(genericDeleteResponse.statusCode).toBe(404);
      expect(genericDeleteResponse.body.error.code).toBe("ITEM_NOT_FOUND");
      expect(await fileExists(storedFilePath)).toBe(true);
    } finally {
      await server.close();
    }
  },
  20_000
);
