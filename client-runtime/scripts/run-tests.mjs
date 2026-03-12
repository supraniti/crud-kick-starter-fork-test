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
  const remote = createRemoteTransportAdapter({
    query: async ({ definition }) => {
      if (`${definition.resource}.${definition.query}` === "products.remoteSearch") {
        return { items: [{ id: "p1", title: "Remote Product" }], total: 1, page: 1, pageSize: 20 };
      }
      throw new Error("unexpected query");
    },
    dispatch: async ({ definition, request }) => ({ ok: true, action: definition.action, payload: request.payload }),
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

  return createClientRuntime({
    queries: [
      { resource: "products", query: "search", policy: "local-first", dataset: "catalog" },
      { resource: "products", query: "remoteSearch", policy: "cache-first" },
      { resource: "posts", query: "list", policy: "local-only", dataset: "posts" }
    ],
    actions: [
      { action: "cart.addItem", policy: "remote-with-local-update", markDatasetsDirty: ["catalog"] }
    ],
    datasets: [
      { dataset: "catalog" },
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
    }
  });
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

await runScenario("local-first queries answer from installed dataset state", async () => {
  const runtime = createRuntimeHarness();
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
  const runtime = createRuntimeHarness();
  const firstResult = await runtime.query({ resource: "products", query: "remoteSearch", params: { term: "atlas" } });
  const secondResult = await runtime.query({ resource: "products", query: "remoteSearch", params: { term: "atlas" } });
  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.meta.source, "remote");
  assert.equal(secondResult.ok, true);
  assert.equal(secondResult.meta.source, "memory");
});

await runScenario("remote-with-local-update marks dependent datasets dirty", async () => {
  const runtime = createRuntimeHarness();
  await runtime.installDataset({ dataset: "catalog" });
  const actionResult = await runtime.dispatch({ action: "cart.addItem", payload: { productId: "p1", qty: 1 } });
  const status = await runtime.getDatasetStatus("catalog");
  assert.equal(actionResult.ok, true);
  assert.equal(status.dirty, true);
});

await runScenario("local-only query failures are structured", async () => {
  const runtime = createRuntimeHarness();
  const result = await runtime.query({ resource: "posts", query: "list" });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "LOCAL_DATA_UNAVAILABLE");
});

await runScenario("dataset sync updates stored metadata and record counts", async () => {
  const runtime = createRuntimeHarness();
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
