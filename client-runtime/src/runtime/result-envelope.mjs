export function createResultEnvelope({ ok, data = null, error = null, meta = {} }) {
  return {
    ok,
    data,
    error,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}
