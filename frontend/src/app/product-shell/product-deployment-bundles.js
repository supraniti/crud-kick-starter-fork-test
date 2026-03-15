function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export const DEPLOYMENT_BUNDLES_COLLECTION_ID = "page-deployment-bundles";

export function sortDeploymentBundles(bundles = []) {
  return [...bundles].sort((left, right) =>
    `${left?.title ?? ""}`.localeCompare(`${right?.title ?? ""}`)
  );
}

export function createBundleDraft() {
  return {
    title: "",
    pageId: "",
    postsProjectionTargetProfileId: "",
    categoriesProjectionTargetProfileId: "",
    tagsProjectionTargetProfileId: "",
    mediaTargetProfileId: "",
    deploymentTargetProfileId: "",
    browserDeliveryTargetProfileId: ""
  };
}

export function createBundleDraftFromItem(item = null) {
  if (!item || typeof item !== "object") {
    return createBundleDraft();
  }
  return {
    title: normalizeText(item.title),
    pageId: normalizeText(item.pageId),
    postsProjectionTargetProfileId: normalizeText(item.postsProjectionTargetProfileId),
    categoriesProjectionTargetProfileId: normalizeText(item.categoriesProjectionTargetProfileId),
    tagsProjectionTargetProfileId: normalizeText(item.tagsProjectionTargetProfileId),
    mediaTargetProfileId: normalizeText(item.mediaTargetProfileId),
    deploymentTargetProfileId: normalizeText(item.deploymentTargetProfileId),
    browserDeliveryTargetProfileId: normalizeText(item.browserDeliveryTargetProfileId)
  };
}

export function createBundleMutationPayload(draft = {}) {
  return {
    title: normalizeText(draft.title),
    pageId: normalizeText(draft.pageId),
    postsProjectionTargetProfileId: normalizeText(draft.postsProjectionTargetProfileId),
    categoriesProjectionTargetProfileId: normalizeText(draft.categoriesProjectionTargetProfileId),
    tagsProjectionTargetProfileId: normalizeText(draft.tagsProjectionTargetProfileId),
    mediaTargetProfileId: normalizeText(draft.mediaTargetProfileId),
    deploymentTargetProfileId: normalizeText(draft.deploymentTargetProfileId),
    browserDeliveryTargetProfileId: normalizeText(draft.browserDeliveryTargetProfileId)
  };
}
