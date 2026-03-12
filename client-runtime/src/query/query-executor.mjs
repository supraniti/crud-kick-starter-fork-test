import { buildQueryKey, normalizeQueryRequest } from "../runtime/request-shapes.mjs";
import { createResultEnvelope } from "../runtime/result-envelope.mjs";

async function tryCachedRead(cacheKey, adapters) {
  const memoryHit = adapters.memory.read(cacheKey);
  if (memoryHit) {
    return { source: "memory", value: memoryHit };
  }

  const cacheHit = await adapters.cacheStorage.read(cacheKey);
  if (cacheHit) {
    adapters.memory.write(cacheKey, cacheHit);
    return { source: "cache-storage", value: cacheHit };
  }

  return null;
}

async function writeCachedRead(cacheKey, value, adapters, definition) {
  adapters.memory.write(cacheKey, value, { ttlMs: definition.ttlMs || 0 });
  await adapters.cacheStorage.write(cacheKey, value);
}

async function runLocal(definition, request, context) {
  const datasetName = definition.dataset || request.dataset;
  if (!datasetName) {
    return null;
  }
  const status = await context.datasetManager.getDatasetStatus(datasetName);
  if (!status?.installed) {
    return null;
  }
  const localResult = await context.datasetManager.queryDataset(datasetName, request.params);
  return {
    data: localResult,
    meta: {
      source: "indexeddb",
      dataset: datasetName,
      installed: true,
      syncedAt: status.syncedAt || null
    }
  };
}

async function runRemote(definition, request, context, cacheKey) {
  const remoteData = await context.adapters.remote.query(definition, request, context);
  await writeCachedRead(cacheKey, remoteData, context.adapters, definition);
  return {
    data: remoteData,
    meta: {
      source: "remote",
      dataset: definition.dataset || null
    }
  };
}

export async function executeQuery(requestInput, context) {
  const request = normalizeQueryRequest(requestInput);
  const definition = context.queryRegistry.get(`${request.resource}.${request.query}`);

  if (!definition) {
    return createResultEnvelope({ ok: false, error: { code: "QUERY_NOT_FOUND", message: `Unknown query '${request.resource}.${request.query}'` } });
  }

  const cacheKey = buildQueryKey(request);
  const policy = request.policy || definition.policy || "remote-only";
  const capabilities = context.capabilities.getSnapshot();

  try {
    if (policy === "cache-first") {
      const cached = await tryCachedRead(cacheKey, context.adapters);
      if (cached) {
        return createResultEnvelope({ ok: true, data: cached.value, meta: { ...cached, policy, capabilities } });
      }
    }

    if (policy === "local-first" || policy === "local-only") {
      const local = await runLocal(definition, request, context);
      if (local) {
        return createResultEnvelope({ ok: true, data: local.data, meta: { ...local.meta, policy, capabilities } });
      }
      if (policy === "local-only") {
        return createResultEnvelope({ ok: false, error: { code: "LOCAL_DATA_UNAVAILABLE", message: "Requested dataset is not installed locally" }, meta: { policy, capabilities } });
      }
    }

    if (policy === "network-first") {
      try {
        const remote = await runRemote(definition, request, context, cacheKey);
        return createResultEnvelope({ ok: true, data: remote.data, meta: { ...remote.meta, policy, capabilities } });
      } catch (error) {
        const fallback = await runLocal(definition, request, context);
        if (fallback) {
          return createResultEnvelope({ ok: true, data: fallback.data, meta: { ...fallback.meta, policy, fallbackFrom: "remote", capabilities, stale: true } });
        }
        throw error;
      }
    }

    const remote = await runRemote(definition, request, context, cacheKey);
    return createResultEnvelope({ ok: true, data: remote.data, meta: { ...remote.meta, policy, capabilities } });
  } catch (error) {
    return createResultEnvelope({ ok: false, error: { code: "QUERY_EXECUTION_FAILED", message: error.message }, meta: { policy, capabilities } });
  }
}
