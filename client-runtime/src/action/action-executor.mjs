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

export async function executeAction(requestInput, context) {
  const request = normalizeActionRequest(requestInput);
  const definition = context.actionRegistry.get(request.action);

  if (!definition) {
    return createResultEnvelope({ ok: false, error: { code: "ACTION_NOT_FOUND", message: `Unknown action '${request.action}'` } });
  }

  const policy = request.policy || definition.policy || "remote-required";
  const capabilities = context.capabilities.getSnapshot();

  try {
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
