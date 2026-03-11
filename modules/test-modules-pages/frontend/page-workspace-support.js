export function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function createActionState() {
  return {
    saving: false,
    syncingDeployment: false,
    errorMessage: null,
    successMessage: null
  };
}

export function createSupportState() {
  return {
    loading: false,
    errorMessage: null,
    pages: [],
    redirects: [],
    layouts: [],
    posts: [],
    authors: [],
    categories: [],
    tags: [],
    media: []
  };
}

export function createDeliveryState() {
  return {
    loading: false,
    errorMessage: null,
    payload: null
  };
}

export function createDeploymentInstancesState() {
  return {
    loading: false,
    errorMessage: null,
    items: []
  };
}

export function createEmptyDataSourceDraft(index = 0) {
  return {
    key: `source-${index + 1}`,
    kind: "record-by-id",
    sourceType: "blog-post",
    itemId: "",
    bindAs: `source${index + 1}`,
    limit: 12,
    sortKey: "updatedOn",
    sortDirection: "desc"
  };
}

export function createEmptyPageDraft() {
  return {
    title: "",
    pageKind: "standalone",
    deploymentMode: "single-page",
    primarySourceType: "none",
    sourceSelectionMode: "none",
    primarySourceItemId: "",
    path: "",
    pathPattern: "",
    layoutId: "",
    layoutKey: "page-shell",
    templateKey: "page-shell",
    heroVariant: "standard",
    themeKey: "editorial-default",
    heroBinding: "primary",
    bodyBinding: "primary",
    supportingBinding: "supporting",
    sectionOrderText: "hero, body, supporting",
    dataSources: [],
    runtimeScriptUrlsText: "",
    status: "draft",
    canonicalUrl: "",
    seoTitle: "",
    seoDescription: "",
    ogTitle: "",
    ogDescription: "",
    ogImageMediaId: "",
    scheduledOn: "",
    deploymentStatus: "missing",
    deploymentTargetCount: 0,
    deploymentSyncedCount: 0,
    deploymentStaleCount: 0,
    deploymentMissingCount: 0,
    deploymentSyncedOn: "",
    deploymentLastRunOn: "",
    previewSourceItemId: ""
  };
}

function readLayoutDraft(page = {}) {
  const sectionOrder = page.layoutModel?.sectionOrder ?? ["hero", "body", "supporting"];
  return {
    layoutKey: page.layoutKey ?? "page-shell",
    templateKey: page.layoutModel?.templateKey ?? "page-shell",
    heroVariant: page.layoutModel?.heroVariant ?? "standard",
    themeKey: page.layoutModel?.themeKey ?? "editorial-default",
    heroBinding: page.layoutModel?.heroBinding ?? "primary",
    bodyBinding: page.layoutModel?.bodyBinding ?? "primary",
    supportingBinding: page.layoutModel?.supportingBinding ?? "supporting",
    sectionOrderText: sectionOrder.join(", ")
  };
}

function readSeoDraft(page = {}) {
  const runtimeScriptUrls = toArray(page.runtimeScriptUrls)
    .map((entry) => (typeof entry === "string" ? entry : entry?.url ?? ""))
    .filter(Boolean);

  return {
    canonicalUrl: page.canonicalUrl ?? "",
    seoTitle: page.seoTitle ?? "",
    seoDescription: page.seoDescription ?? "",
    ogTitle: page.ogTitle ?? "",
    ogDescription: page.ogDescription ?? "",
    ogImageMediaId: page.ogImageMediaId ?? "",
    runtimeScriptUrlsText: runtimeScriptUrls.join("\n")
  };
}

function readDeploymentDraft(page = {}) {
  return {
    deploymentMode: page.deploymentMode ?? "single-page",
    sourceSelectionMode:
      page.sourceSelectionMode ??
      (page.primarySourceType === "none" ? "none" : "specific-record"),
    pathPattern: page.pathPattern ?? "",
    deploymentStatus: page.deploymentStatus ?? "missing",
    deploymentTargetCount: page.deploymentTargetCount ?? 0,
    deploymentSyncedCount: page.deploymentSyncedCount ?? 0,
    deploymentStaleCount: page.deploymentStaleCount ?? 0,
    deploymentMissingCount: page.deploymentMissingCount ?? 0,
    deploymentSyncedOn: page.deploymentSyncedOn ?? "",
    deploymentLastRunOn: page.deploymentLastRunOn ?? "",
    previewSourceItemId: page.primarySource?.itemId ?? ""
  };
}

export function createPageDraftFromItem(page = {}) {
  return {
    title: page.title ?? "",
    pageKind: page.pageKind ?? "standalone",
    primarySourceType: page.primarySourceType ?? "none",
    primarySourceItemId: page.primarySource?.itemId ?? "",
    path: page.path ?? "",
    layoutId: page.layoutId ?? "",
    ...readDeploymentDraft(page),
    ...readLayoutDraft(page),
    dataSources: toArray(page.dataSources).map((entry, index) => ({
      ...createEmptyDataSourceDraft(index),
      ...entry,
      itemId: entry?.itemId ?? ""
    })),
    status: page.status ?? "draft",
    ...readSeoDraft(page),
    scheduledOn: page.scheduledOn ?? ""
  };
}

export function normalizeOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function normalizeSectionOrder(sectionOrder) {
  if (Array.isArray(sectionOrder)) {
    return sectionOrder.filter((value) => typeof value === "string" && value.trim().length > 0);
  }
  if (typeof sectionOrder !== "string") {
    return [];
  }
  return sectionOrder
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildPrimarySourcePayload(draft) {
  if (draft.primarySourceType === "none") {
    return null;
  }
  return {
    sourceType: draft.primarySourceType,
    itemId:
      draft.sourceSelectionMode === "all-records"
        ? null
        : normalizeOptionalText(draft.primarySourceItemId),
    bindAs: draft.heroBinding || "primary"
  };
}

function buildDataSourcePayload(draft) {
  return draft.dataSources.map((entry, index) => ({
    key: normalizeOptionalText(entry.key) ?? `source-${index + 1}`,
    kind: entry.kind,
    sourceType: entry.sourceType,
    itemId: normalizeOptionalText(entry.itemId),
    bindAs: normalizeOptionalText(entry.bindAs) ?? `source${index + 1}`,
    limit: Number(entry.limit) || 12,
    sortKey: entry.sortKey || "updatedOn",
    sortDirection: entry.sortDirection || "desc"
  }));
}

function normalizeScriptUrlsText(value) {
  if (typeof value !== "string") {
    return [];
  }

  return [...new Set(
    value
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  )];
}

export function buildPageMutationPayload(draft) {
  return {
    title: draft.title,
    pageKind: draft.pageKind,
    deploymentMode: draft.deploymentMode,
    primarySourceType: draft.primarySourceType,
    sourceSelectionMode: draft.sourceSelectionMode,
    path: draft.path,
    pathPattern: normalizeOptionalText(draft.pathPattern),
    layoutId: normalizeOptionalText(draft.layoutId),
    layoutKey: draft.layoutKey,
    layoutModel: {
      templateKey: draft.templateKey,
      heroVariant: draft.heroVariant,
      themeKey: draft.themeKey,
      heroBinding: draft.heroBinding,
      bodyBinding: draft.bodyBinding,
      supportingBinding: draft.supportingBinding,
      sectionOrder: normalizeSectionOrder(draft.sectionOrderText)
    },
    primarySource: buildPrimarySourcePayload(draft),
    dataSources: buildDataSourcePayload(draft),
    runtimeScriptUrls: normalizeScriptUrlsText(draft.runtimeScriptUrlsText).map((url) => ({
      url
    })),
    renderPolicy: {
      publishModel: "live-reference",
      serverRenderMode: "resolved-page-payload",
      clientBootstrapMode: "page-payload",
      followUpMode: "page-by-path"
    },
    status: draft.status,
    canonicalUrl: normalizeOptionalText(draft.canonicalUrl),
    seoTitle: normalizeOptionalText(draft.seoTitle),
    seoDescription: normalizeOptionalText(draft.seoDescription),
    ogTitle: normalizeOptionalText(draft.ogTitle),
    ogDescription: normalizeOptionalText(draft.ogDescription),
    ogImageMediaId: normalizeOptionalText(draft.ogImageMediaId),
    scheduledOn: draft.status === "scheduled" ? normalizeOptionalText(draft.scheduledOn) : null
  };
}

export function createEmptyRedirectDraft() {
  return {
    sourcePath: "",
    targetPageId: "",
    targetUrl: "",
    httpCode: "301",
    status: "active",
    reason: ""
  };
}

export function normalizeRedirectDraft(rule = {}) {
  return {
    sourcePath: rule.sourcePath ?? "",
    targetPageId: rule.targetPageId ?? "",
    targetUrl: rule.targetUrl ?? "",
    httpCode: rule.httpCode ?? "301",
    status: rule.status ?? "active",
    reason: rule.reason ?? ""
  };
}

export function toOption(item) {
  return {
    id: item.id,
    label: item.displayName ?? item.name ?? item.title ?? item.path ?? item.slug ?? item.id
  };
}

export function createSourceOptionsMap({ posts, authors, categories, tags }) {
  return {
    "blog-post": posts.map(toOption),
    "blog-author": authors.map(toOption),
    "blog-category": categories.map(toOption),
    "blog-tag": tags.map(toOption)
  };
}

export function resolveActorOptions(authors) {
  return authors
    .filter((author) => author.status === "active")
    .filter((author) => author.role === "editor" || author.role === "managing-editor")
    .map(toOption);
}
