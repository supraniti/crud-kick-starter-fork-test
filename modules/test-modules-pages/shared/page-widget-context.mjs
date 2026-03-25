import { normalizeCanonicalBindingPath, stripCanonicalBindingRoot } from "./widget-binding-namespace.mjs";

function cloneJsonValue(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizePathSegments(bindingPath) {
  const relativePath = stripCanonicalBindingRoot(normalizeCanonicalBindingPath(bindingPath));
  if (relativePath === null) {
    return [];
  }
  if (relativePath.length === 0) {
    return [];
  }
  return relativePath
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function resolveValueBySegments(currentValue, segments = []) {
  if (segments.length === 0) {
    return currentValue;
  }
  if (currentValue === null || currentValue === undefined) {
    return null;
  }

  const [segment, ...restSegments] = segments;
  const isCollectionSegment = segment.endsWith("[]");
  const fieldKey = isCollectionSegment ? segment.slice(0, -2) : segment;
  const nextValue = fieldKey ? currentValue?.[fieldKey] : currentValue;

  if (isCollectionSegment) {
    const collection = Array.isArray(nextValue) ? nextValue : [];
    if (restSegments.length === 0) {
      return collection;
    }
    return collection.map((entry) => resolveValueBySegments(entry, restSegments));
  }

  return resolveValueBySegments(nextValue, restSegments);
}

export function resolveWidgetContextBindingValue(bindingPath, context = {}) {
  if (!bindingPath) {
    return null;
  }
  return resolveValueBySegments(context, normalizePathSegments(bindingPath));
}

export function buildWidgetContextScope({ page = {}, model = null } = {}) {
  const context = {
    page: {
      id: page?.id ?? null,
      title: page?.title ?? null,
      path: page?.path ?? null,
      pathPattern: page?.pathPattern ?? null,
      status: page?.status ?? null,
      pageKind: page?.pageKind ?? null,
      deploymentMode: page?.deploymentMode ?? null,
      sourceSelectionMode: page?.sourceSelectionMode ?? null,
      primarySourceType: page?.primarySourceType ?? null,
      layoutId: page?.layoutId ?? null,
      layoutKey: page?.layoutKey ?? null,
      publishedOn: page?.publishedOn ?? null,
      scheduledOn: page?.scheduledOn ?? null
    }
  };

  if (model?.kind === "post-detail") {
    context.post = cloneJsonValue(model.post ?? null);
    context.author = cloneJsonValue(model.post?.author ?? null);
    context.categories = cloneJsonValue(model.post?.categories ?? []);
    context.tags = cloneJsonValue(model.post?.tags ?? []);
    context.navigation = cloneJsonValue(model.navigation ?? null);
    context.related = cloneJsonValue(model.related ?? null);
    context.commentsMeta = cloneJsonValue(model.comments ?? null);
    return context;
  }

  if (model?.kind === "category-detail") {
    context.category = cloneJsonValue(model.category ?? null);
    context.navigation = cloneJsonValue(model.navigation ?? null);
    context.children = cloneJsonValue(model.children ?? []);
    context.posts = cloneJsonValue(model.posts ?? []);
    return context;
  }

  return context;
}
