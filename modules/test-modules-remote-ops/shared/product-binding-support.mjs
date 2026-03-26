function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeProjectionScope(target) {
  return normalizeText(target?.config?.projectionScope);
}

export function resolveManagedProductBindingKey(target = null) {
  const explicitBindingKey = normalizeText(target?.productBindingKey);
  if (explicitBindingKey) {
    return explicitBindingKey;
  }

  const targetKind = normalizeText(target?.targetKind);
  const title = normalizeText(target?.title);
  const projectionScope = normalizeProjectionScope(target);

  if (targetKind === "firestore-projection") {
    if (projectionScope === "published-blog-posts") {
      return "posts-projection";
    }
    if (projectionScope === "public-blog-categories") {
      return "categories-projection";
    }
    if (projectionScope === "public-blog-tags") {
      return "tags-projection";
    }
    if (projectionScope === "public-translations") {
      return "translations-projection";
    }
  }

  if (targetKind === "deployment-storage" && title === "HTML Deployment") {
    return "deployment-storage";
  }
  if (targetKind === "media-storage" && title === "Media Library") {
    return "media-storage";
  }
  if (targetKind === "browser-delivery" && title === "Primary Domain") {
    return "browser-delivery";
  }

  return "";
}
