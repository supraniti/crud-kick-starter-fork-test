import assert from "node:assert/strict";
import {
  createClientRuntime,
  createIndexedDbAdapter,
  createMemoryDatasetStorageDriver,
  createRemoteTransportAdapter,
  installGlobalRuntime
} from "../src/index.mjs";

function createRuntimeHarness() {
  const storage = createMemoryDatasetStorageDriver();
  const requests = [];
  const remote = createRemoteTransportAdapter({
    baseUrl: "https://example.test",
    fetchJson: async (url, init) => {
      requests.push({ url, init });
      if (url.includes("/remote-posts")) {
        return {
          ok: true,
          status: 200,
          body: { items: [{ id: "p1", title: "Remote Product" }], total: 1, page: 1, pageSize: 20 }
        };
      }
      if (url.includes("/posts/p1") && init.method === "PATCH") {
        return {
          ok: true,
          status: 200,
          body: { id: "p1", title: "Updated title" }
        };
      }
      if (url.includes("/api/reference/collections/blog-comments/items") && init.method === "GET") {
        return {
          ok: true,
          status: 200,
          body: {
            items: [
              { id: "comment-001", postId: "post-001", authorDisplayName: "Reader One", body: "Helpful update.", status: "approved" },
              { id: "comment-002", postId: "post-001", authorDisplayName: "Reader Two", body: "Thanks for the details.", status: "approved" }
            ],
            meta: {
              total: 2
            }
          }
        };
      }
      if (url.includes("/api/reference/collections/blog-comments/items") && init.method === "POST") {
        return {
          ok: true,
          status: 201,
          body: {
            item: {
              id: "comment-003",
              postId: "post-001",
              authorDisplayName: "Reader Three",
              body: "Queued for moderation.",
              status: "pending"
            }
          }
        };
      }
      return {
        ok: true,
        status: 200,
        body: {
          items: [
            { id: "p1", title: "Atlas", category: "books", price: 12 },
            { id: "p2", title: "Nova", category: "books", price: 18 },
            { id: "p3", title: "Gamma", category: "games", price: 40 }
          ],
          version: "1",
          syncToken: "install"
        }
      };
    },
    dispatch: async ({ definition, request }) => ({
      ok: true,
      action: definition.action,
      payload: request.payload
    }),
    fetchDataset: async ({ mode }) => ({
      items: [
        { id: "p1", title: "Atlas", category: "books", price: 12 },
        { id: "p2", title: "Nova", category: "books", price: 18 },
        { id: "p3", title: "Gamma", category: "games", price: 40 }
      ],
      version: mode === "sync" ? "2" : "1",
      syncToken: mode
    })
  });

  const runtime = createClientRuntime({
    remote: {
      baseUrl: "https://example.test"
    },
    queries: [
      { resource: "products", query: "search", policy: "local-first", dataset: "catalog" },
      {
        resource: "products",
        query: "remoteSearch",
        policy: "cache-first",
        remote: {
          method: "GET",
          path: "/remote-posts",
          queryParams: "params"
        }
      },
      { resource: "posts", query: "list", policy: "local-only", dataset: "posts" }
    ],
    actions: [
      { action: "cart.addItem", policy: "remote-with-local-update", markDatasetsDirty: ["catalog"] },
      {
        action: "posts.update",
        policy: "remote-required",
        remote: {
          method: "PATCH",
          path: "/posts/:id",
          pathParams: { id: "payload.id" },
          body: { title: "payload.title" }
        }
      },
      {
        action: "comments.submit",
        policy: "remote-with-local-update",
        markDatasetsDirty: ["post-comments"],
        remote: {
          method: "POST",
          path: "/api/reference/collections/blog-comments/items",
          body: {
            postId: "context.primaryRecordId",
            parentCommentId: "payload.parentCommentId",
            authorDisplayName: "payload.authorDisplayName",
            authorEmail: "payload.authorEmail",
            body: "payload.body"
          }
        }
      }
    ],
    datasets: [
      { dataset: "catalog" },
      {
        dataset: "post-comments",
        remoteInstall: {
          method: "GET",
          path: "/api/reference/collections/blog-comments/items",
          queryParams: {
            postId: "context.primaryRecordId",
            status: "approved"
          }
        },
        remoteSync: {
          method: "GET",
          path: "/api/reference/collections/blog-comments/items",
          queryParams: {
            postId: "context.primaryRecordId",
            status: "approved"
          }
        },
        recordMode: "array",
        remoteValuePath: "items"
      },
      {
        dataset: "posts",
        fetchInstall: async () => ({ items: [{ id: "a", title: "One" }], version: "1", syncToken: "install" }),
        fetchSync: async () => ({ items: [{ id: "a", title: "One" }, { id: "b", title: "Two" }], version: "2", syncToken: "sync" })
      }
    ],
    adapters: {
      indexedDb: createIndexedDbAdapter({ storage }),
      remote
    },
    capabilities: {
      getSnapshot: () => ({ online: true, memory: true, cacheStorage: false, indexedDb: true })
    },
    context: {
      primaryRecordId: "post-001"
    }
  });

  return { runtime, requests };
}

async function runScenario(name, fn) {
  try {
    await fn();
    console.log(`[client-runtime:test] PASS ${name}`);
  } catch (error) {
    console.error(`[client-runtime:test] FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

await runScenario("global shell exposes data and action layers", async () => {
  const globalObject = {};
  installGlobalRuntime({}, globalObject);
  assert.equal(typeof globalObject.dataLayer.query, "function");
  assert.equal(typeof globalObject.dataLayer.installDataset, "function");
  assert.equal(typeof globalObject.actionLayer.dispatch, "function");
  assert.equal(typeof globalObject.crudClientRuntime.getRuntime, "function");
});

await runScenario("global runtime bootstraps inline page payload datasets from page-data", async () => {
  const requests = [];
  const globalObject = {
    location: {
      origin: "https://preview.example.test"
    },
    fetch: async (url) => {
      requests.push(url);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            ok: true,
            payload: {
              page: {
                id: "page-001",
                path: "/stories/launch-window-update"
              },
              media: {
                items: [
                  {
                    id: "media-001",
                    displayName: "Launch Hero (Remote)",
                    preferredUrl:
                      "https://preview.example.test/library/originals/media-001/hero-remote.png"
                  }
                ]
              },
              resolvedAt: "2026-03-15T10:00:00.000Z"
            }
          };
        }
      };
    },
    document: {
      getElementById(id) {
        if (id !== "page-data") {
          return null;
        }
        return {
          textContent: JSON.stringify({
            page: {
              id: "page-001",
              path: "/stories/launch-window-update"
            },
            media: {
              items: [
                {
                  id: "media-001",
                  displayName: "Launch Hero",
                  preferredUrl: "https://cdn.example.test/library/originals/media-001/hero.png"
                }
              ]
            },
            resolvedAt: "2026-03-15T09:00:00.000Z"
          })
        };
      }
    }
  };
  installGlobalRuntime(
    {
      bootstrapDatasets: ["page-payload", "page-media"],
      queries: [
        {
          resource: "page",
          query: "current",
          policy: "local-first",
          dataset: "page-payload"
        },
        {
          resource: "media",
          query: "byId",
          policy: "local-first",
          dataset: "page-media"
        },
        {
          resource: "page",
          query: "currentRemote",
          policy: "network-first",
          remote: {
            method: "GET",
            path: "/api/reference/modules/test-modules-pages/delivery/resolve?path=%2Fstories%2Flaunch-window-update",
            responsePath: "payload"
          }
        }
      ],
      datasets: [
        {
          dataset: "page-payload",
          bootstrapMode: "inline-json-script",
          inlineScriptId: "page-data",
          recordMode: "single-item",
          versionPath: "resolvedAt",
          syncTokenPath: "page.id",
          remoteSync: {
            method: "GET",
            path: "/api/reference/modules/test-modules-pages/delivery/resolve?path=%2Fstories%2Flaunch-window-update"
          },
          responsePath: "payload",
          remoteValuePath: "payload",
          remoteVersionPath: "payload.resolvedAt",
          remoteSyncTokenPath: "payload.page.id"
        },
        {
          dataset: "page-media",
          bootstrapMode: "inline-json-script",
          inlineScriptId: "page-data",
          valuePath: "media.items",
          recordMode: "array",
          versionPath: "resolvedAt",
          syncTokenPath: "page.id",
          remoteSync: {
            method: "GET",
            path: "/api/reference/modules/test-modules-pages/delivery/resolve?path=%2Fstories%2Flaunch-window-update"
          },
          responsePath: "payload",
          remoteValuePath: "payload.media.items",
          remoteVersionPath: "payload.resolvedAt",
          remoteSyncTokenPath: "payload.page.id"
        }
      ],
      adapters: {
        indexedDb: createIndexedDbAdapter({
          storage: createMemoryDatasetStorageDriver()
        })
      },
      capabilities: {
        getSnapshot: () => ({ online: true, memory: true, cacheStorage: false, indexedDb: true })
      }
    },
    globalObject
  );
  await globalObject.crudClientRuntime.ready;
  const status = await globalObject.dataLayer.getDatasetStatus("page-payload");
  const mediaStatus = await globalObject.dataLayer.getDatasetStatus("page-media");
  const queryResult = await globalObject.dataLayer.query({
    resource: "page",
    query: "current"
  });
  const mediaQueryResult = await globalObject.dataLayer.query({
    resource: "media",
    query: "byId",
    params: {
      filters: {
        id: "media-001"
      }
    }
  });
  const remoteQueryResult = await globalObject.dataLayer.query({
    resource: "page",
    query: "currentRemote"
  });
  const syncResult = await globalObject.dataLayer.syncDataset({
    dataset: "page-media"
  });
  const syncedMediaStatus = await globalObject.dataLayer.getDatasetStatus("page-media");
  const syncedMediaQueryResult = await globalObject.dataLayer.query({
    resource: "media",
    query: "byId",
    params: {
      filters: {
        id: "media-001"
      }
    }
  });
  assert.equal(status.installed, true);
  assert.equal(mediaStatus.installed, true);
  assert.equal(status.version, "2026-03-15T09:00:00.000Z");
  assert.equal(status.syncToken, "page-001");
  assert.equal(queryResult.ok, true);
  assert.equal(queryResult.meta.source, "indexeddb");
  assert.equal(queryResult.data.items[0].page.id, "page-001");
  assert.equal(mediaQueryResult.ok, true);
  assert.equal(mediaQueryResult.data.items[0].preferredUrl, "https://cdn.example.test/library/originals/media-001/hero.png");
  assert.equal(remoteQueryResult.ok, true);
  assert.equal(remoteQueryResult.data.resolvedAt, "2026-03-15T10:00:00.000Z");
  assert.equal(syncResult.ok, true);
  assert.equal(syncedMediaStatus.version, "2026-03-15T10:00:00.000Z");
  assert.equal(syncedMediaQueryResult.ok, true);
  assert.equal(
    syncedMediaQueryResult.data.items[0].preferredUrl,
    "https://preview.example.test/library/originals/media-001/hero-remote.png"
  );
  assert.equal(
    requests[0],
    "https://preview.example.test/api/reference/modules/test-modules-pages/delivery/resolve?path=%2Fstories%2Flaunch-window-update"
  );
});

await runScenario("local-first queries answer from installed dataset state", async () => {
  const { runtime } = createRuntimeHarness();
  const installResult = await runtime.installDataset({ dataset: "catalog" });
  assert.equal(installResult.ok, true);
  const queryResult = await runtime.query({
    resource: "products",
    query: "search",
    params: {
      filters: { category: "books", price: { op: "lte", value: 18 } },
      sort: [{ field: "title", dir: "asc" }],
      page: 1,
      pageSize: 1,
      fields: ["id", "title"]
    }
  });
  assert.equal(queryResult.ok, true);
  assert.equal(queryResult.meta.source, "indexeddb");
  assert.equal(queryResult.data.total, 2);
  assert.deepEqual(queryResult.data.items, [{ id: "p1", title: "Atlas" }]);
});

await runScenario("cache-first queries reuse memory after the first remote read", async () => {
  const { runtime } = createRuntimeHarness();
  const firstResult = await runtime.query({ resource: "products", query: "remoteSearch", params: { term: "atlas" } });
  const secondResult = await runtime.query({ resource: "products", query: "remoteSearch", params: { term: "atlas" } });
  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.meta.source, "remote");
  assert.equal(secondResult.ok, true);
  assert.equal(secondResult.meta.source, "memory");
});

await runScenario("declarative remote definitions resolve URL params and body payloads", async () => {
  const { runtime, requests } = createRuntimeHarness();
  const result = await runtime.dispatch({
    action: "posts.update",
    payload: { id: "p1", title: "Updated title" }
  });
  assert.equal(result.ok, true);
  assert.equal(requests.at(-1).url, "https://example.test/posts/p1");
  assert.equal(requests.at(-1).init.method, "PATCH");
  assert.equal(requests.at(-1).init.body, JSON.stringify({ title: "Updated title" }));
});

await runScenario("collection-shaped remote queries normalize into structured results", async () => {
  const { runtime, requests } = createRuntimeHarness();
  const result = await runtime.query({
    resource: "comments",
    query: "byPost",
    policy: "network-first",
    params: {}
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "QUERY_NOT_FOUND");

  const commentsRuntime = createClientRuntime({
    remote: {
      baseUrl: "https://example.test"
    },
    queries: [
      {
        resource: "comments",
        query: "byPost",
        policy: "network-first",
        dataset: "post-comments",
        remote: {
          method: "GET",
          path: "/api/reference/collections/blog-comments/items",
          queryParams: {
            postId: "context.primaryRecordId",
            status: "approved"
          }
        },
        remoteResult: {
          type: "collection",
          itemsPath: "items",
          totalPath: "meta.total"
        }
      }
    ],
    datasets: [
      {
        dataset: "post-comments"
      }
    ],
    adapters: {
      indexedDb: createIndexedDbAdapter({ storage: createMemoryDatasetStorageDriver() }),
      remote: createRemoteTransportAdapter({
        baseUrl: "https://example.test",
        fetchJson: async (url, init) => {
          requests.push({ url, init });
          return {
            ok: true,
            status: 200,
            body: {
              items: [
                { id: "comment-001", postId: "post-001", body: "Helpful update." },
                { id: "comment-002", postId: "post-001", body: "Thanks for the details." }
              ],
              meta: { total: 2 }
            }
          };
        }
      })
    },
    capabilities: {
      getSnapshot: () => ({ online: true, memory: true, cacheStorage: false, indexedDb: true })
    },
    context: {
      primaryRecordId: "post-001"
    }
  });

  const commentsResult = await commentsRuntime.query({
    resource: "comments",
    query: "byPost"
  });
  assert.equal(commentsResult.ok, true);
  assert.equal(commentsResult.meta.source, "remote");
  assert.equal(commentsResult.data.total, 2);
  assert.equal(commentsResult.data.items[0].postId, "post-001");
  assert.equal(
    requests.at(-1).url,
    "https://example.test/api/reference/collections/blog-comments/items?postId=post-001&status=approved"
  );
});

await runScenario("remote-with-local-update marks dependent datasets dirty", async () => {
  const { runtime } = createRuntimeHarness();
  await runtime.installDataset({ dataset: "catalog" });
  const actionResult = await runtime.dispatch({ action: "cart.addItem", payload: { productId: "p1", qty: 1 } });
  const status = await runtime.getDatasetStatus("catalog");
  assert.equal(actionResult.ok, true);
  assert.equal(status.dirty, true);
});

await runScenario("comment submission actions mark the comment dataset dirty", async () => {
  const { runtime } = createRuntimeHarness();
  const actionResult = await runtime.dispatch({
    action: "comments.submit",
    payload: {
      authorDisplayName: "Reader Three",
      authorEmail: "reader.three@example.com",
      body: "Queued for moderation.",
      parentCommentId: null
    }
  });
  const status = await runtime.getDatasetStatus("post-comments");
  assert.equal(actionResult.ok, true);
  assert.equal(actionResult.data.item.postId, "post-001");
  assert.equal(status.dirty, true);
});

await runScenario("local-only query failures are structured", async () => {
  const { runtime } = createRuntimeHarness();
  const result = await runtime.query({ resource: "posts", query: "list" });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "LOCAL_DATA_UNAVAILABLE");
});

await runScenario("dataset sync updates stored metadata and record counts", async () => {
  const { runtime } = createRuntimeHarness();
  await runtime.installDataset({ dataset: "posts" });
  const syncResult = await runtime.syncDataset({ dataset: "posts" });
  const status = await runtime.getDatasetStatus("posts");
  assert.equal(syncResult.ok, true);
  assert.equal(status.recordCount, 2);
  assert.equal(status.version, "2");
  assert.equal(status.syncToken, "sync");
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
