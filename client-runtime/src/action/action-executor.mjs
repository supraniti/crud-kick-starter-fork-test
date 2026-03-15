import { createResultEnvelope } from "../runtime/result-envelope.mjs";
import { normalizeActionRequest } from "../runtime/request-shapes.mjs";

async function applySuccessfulActionSideEffects(definition, context) {
  const invalidates = definition.invalidateQueries || [];
  invalidates.forEach((queryKey) => context.adapters.memory.remove(queryKey));

  if (definition.markDatasetsDirty) {
    await Promise.all(
      definition.markDatasetsDirty.map((dataset) =>
        context.adapters.indexedDb.updateDatasetStatus(dataset, {
          dirty: true,
          dirtyAt: new Date().toISOString()
        })
      )
    );
  }
}

function hasLocalAction(definition) {
  return Boolean(definition?.local && typeof definition.local === "object");
}

function createLocalActionRequest(localDefinition = {}) {
  return {
    dataset: String(localDefinition.dataset || "").trim(),
    params: localDefinition.params || {}
  };
}

async function executeLocalAction(definition, context) {
  const localDefinition = definition?.local || {};
  const request = createLocalActionRequest(localDefinition);

  if (localDefinition.kind === "sync-dataset") {
    return context.datasetManager.syncDataset(request);
  }
  if (localDefinition.kind === "install-dataset") {
    return context.datasetManager.installDataset(request);
  }

  return createResultEnvelope({
    ok: false,
    error: {
      code: "LOCAL_ACTION_UNSUPPORTED",
      message: `Unsupported local action '${localDefinition.kind ?? "unknown"}'`
    }
  });
}

export async function executeAction(requestInput, context) {
  const request = normalizeActionRequest(requestInput);
  const definition = context.actionRegistry.get(request.action);

  if (!definition) {
    return createResultEnvelope({ ok: false, error: { code: "ACTION_NOT_FOUND", message: `Unknown action '${request.action}'` } });
  }

  const policy = request.policy || definition.policy || "remote-required";
  const capabilities = context.capabilities.getSnapshot();

  try {
    if (hasLocalAction(definition)) {
      const localResult = await executeLocalAction(definition, context);
      return createResultEnvelope({
        ok: localResult.ok,
        data: localResult.data,
        error: localResult.error,
        meta: {
          source: "runtime-local",
          policy,
          capabilities,
          operation: definition.local.kind,
          dataset: definition.local.dataset
        }
      });
    }

    const remoteResult = await context.adapters.remote.dispatch(definition, request, context);
    if (policy === "remote-with-local-update") {
      await applySuccessfulActionSideEffects(definition, context);
    }
    return createResultEnvelope({
      ok: true,
      data: remoteResult,
      meta: {
        source: "remote",
        policy,
        capabilities
      }
    });
  } catch (error) {
    return createResultEnvelope({
      ok: false,
      error: { code: "ACTION_EXECUTION_FAILED", message: error.message },
      meta: { policy, capabilities }
    });
  }
}
