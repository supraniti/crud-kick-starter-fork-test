function readNumericSuffix(blockId) {
  if (typeof blockId !== "string") {
    return null;
  }
  const match = blockId.trim().match(/^B-(\d{4})$/);
  if (!match) {
    return null;
  }
  const numeric = Number(match[1]);
  return Number.isFinite(numeric) ? numeric : null;
}

export function createSerializedBlockId(sequence = 1) {
  const numeric = Number(sequence);
  const normalized = Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : 1;
  return `B-${`${normalized}`.padStart(4, "0")}`;
}

export function allocateNextBlockId(blocks = []) {
  const highest = (Array.isArray(blocks) ? blocks : []).reduce((maxValue, block) => {
    const candidate = readNumericSuffix(block?.id);
    return candidate && candidate > maxValue ? candidate : maxValue;
  }, 0);
  return createSerializedBlockId(highest + 1);
}
