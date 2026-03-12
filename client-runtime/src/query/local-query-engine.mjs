function applyPredicate(record, predicate) {
  const value = record[predicate.field];

  switch (predicate.op) {
    case "eq":
      return value === predicate.value;
    case "ne":
      return value !== predicate.value;
    case "lt":
      return value < predicate.value;
    case "lte":
      return value <= predicate.value;
    case "gt":
      return value > predicate.value;
    case "gte":
      return value >= predicate.value;
    case "in":
      return Array.isArray(predicate.value) && predicate.value.includes(value);
    case "contains":
      return Array.isArray(value) ? value.includes(predicate.value) : String(value || "").includes(String(predicate.value));
    case "prefix":
      return String(value || "").startsWith(String(predicate.value || ""));
    default:
      return true;
  }
}

function normalizePredicates(filters = {}) {
  if (Array.isArray(filters)) {
    return filters;
  }

  return Object.entries(filters).map(([field, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && value.op) {
      return { field, op: value.op, value: value.value };
    }
    return { field, op: "eq", value };
  });
}

function applyProjection(records, fields = []) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return records;
  }

  return records.map((record) =>
    fields.reduce((accumulator, field) => {
      accumulator[field] = record[field];
      return accumulator;
    }, {})
  );
}

function applySort(records, sort = []) {
  if (!Array.isArray(sort) || sort.length === 0) {
    return records;
  }

  return [...records].sort((left, right) => {
    for (const entry of sort) {
      const direction = entry.dir === "desc" ? -1 : 1;
      if (left[entry.field] === right[entry.field]) {
        continue;
      }
      return left[entry.field] > right[entry.field] ? direction : -direction;
    }
    return 0;
  });
}

export function runLocalStructuredQuery(records, params = {}) {
  const predicates = normalizePredicates(params.filters || params.where || {});
  const filtered = records.filter((record) => predicates.every((predicate) => applyPredicate(record, predicate)));
  const sorted = applySort(filtered, params.sort || []);
  const pageSize = Number(params.pageSize || params.limit || sorted.length || 1);
  const page = Number(params.page || 1);
  const offset = Number(params.offset ?? (page - 1) * pageSize);
  const paged = sorted.slice(offset, offset + pageSize);

  return {
    items: applyProjection(paged, params.fields || []),
    total: sorted.length,
    page,
    pageSize
  };
}
