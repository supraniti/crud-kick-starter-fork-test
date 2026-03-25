import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createReferenceCollectionItem,
  deleteReferenceCollectionItem,
  fetchReferenceCollectionItems
} from "../../../frontend/src/api/reference.js";
import {
  buildMediaContentUrl,
  uploadMediaAsset
} from "../../test-modules-media-manager/frontend/media-manager-api.js";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";
import { resolvePagePublicOutput } from "../../test-modules-pages/frontend/page-public-link-support.js";
import { createTaxonomyPublicationState } from "./blog-taxonomy-publication-state.js";
import {
  buildCategoryPathPreview,
  buildCategoryRows,
  buildCategorySummary,
  buildCategoryValidation,
  buildReferenceCountMap,
  buildTagBatchCandidates,
  buildTagRows,
  buildTagSummary,
  buildTagValidation,
  buildVisibleCategoryRows,
  CATEGORY_BRANCH,
  paginateTagRows,
  PUBLICATION_BRANCH,
  resolveTaxonomyRouteState,
  TAG_BRANCH
} from "./taxonomy-desk-model.js";
import { useTaxonomyUsageAwareness } from "./useTaxonomyUsageAwareness.js";

const CATEGORIES_COLLECTION_ID = "blog-categories";
const TAGS_COLLECTION_ID = "blog-tags";
const MEDIA_COLLECTION_ID = "media-items";

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlug(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function createSnackbarState() {
  return {
    open: false,
    message: "",
    severity: "success"
  };
}

function toBoolean(value) {
  return value === true;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, contentBase64 = ""] = result.split(",", 2);
      resolve(contentBase64);
    };
    reader.onerror = () => reject(new Error("Failed reading file"));
    reader.readAsDataURL(file);
  });
}

function useSnackbarState(formState) {
  const [snackbarState, setSnackbarState] = useState(createSnackbarState);
  const seenSuccessMessageRef = useRef("");
  const seenErrorMessageRef = useRef("");

  useEffect(() => {
    const successMessage = typeof formState?.successMessage === "string" ? formState.successMessage : "";
    if (!successMessage || successMessage === seenSuccessMessageRef.current) {
      return;
    }
    seenSuccessMessageRef.current = successMessage;
    setSnackbarState({
      open: true,
      message: successMessage,
      severity: "success"
    });
  }, [formState?.successMessage]);

  useEffect(() => {
    const errorMessage = typeof formState?.errorMessage === "string" ? formState.errorMessage : "";
    if (!errorMessage || errorMessage === seenErrorMessageRef.current) {
      return;
    }
    seenErrorMessageRef.current = errorMessage;
    setSnackbarState({
      open: true,
      message: errorMessage,
      severity: "error"
    });
  }, [formState?.errorMessage]);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbarState((previous) => ({
      ...previous,
      open: false
    }));
  }, []);

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbarState({
      open: true,
      message,
      severity
    });
  }, []);

  return {
    snackbarState,
    handleCloseSnackbar,
    showSnackbar
  };
}

function sortMediaItems(items = []) {
  return [...items].sort((left, right) => {
    const leftText = `${left?.updatedOn ?? left?.createdOn ?? ""}`;
    const rightText = `${right?.updatedOn ?? right?.createdOn ?? ""}`;
    return rightText.localeCompare(leftText) || `${left?.displayName ?? ""}`.localeCompare(`${right?.displayName ?? ""}`);
  });
}

function areMediaItemsEquivalent(leftItems = [], rightItems = []) {
  if (leftItems === rightItems) {
    return true;
  }
  if (!Array.isArray(leftItems) || !Array.isArray(rightItems) || leftItems.length !== rightItems.length) {
    return false;
  }
  for (let index = 0; index < leftItems.length; index += 1) {
    const left = leftItems[index];
    const right = rightItems[index];
    if (
      left?.id !== right?.id ||
      left?.updatedOn !== right?.updatedOn ||
      left?.createdOn !== right?.createdOn ||
      left?.displayName !== right?.displayName
    ) {
      return false;
    }
  }
  return true;
}

function areStringArraysEquivalent(leftItems = [], rightItems = []) {
  if (leftItems === rightItems) {
    return true;
  }
  if (!Array.isArray(leftItems) || !Array.isArray(rightItems) || leftItems.length !== rightItems.length) {
    return false;
  }
  for (let index = 0; index < leftItems.length; index += 1) {
    if (leftItems[index] !== rightItems[index]) {
      return false;
    }
  }
  return true;
}

function useFeaturedMediaGallery(referenceOptionsState) {
  const seedItems = normalizeArray(referenceOptionsState?.[MEDIA_COLLECTION_ID]?.items);
  const [mediaItems, setMediaItems] = useState(() => sortMediaItems(seedItems));
  const [galleryState, setGalleryState] = useState({
    open: false,
    loading: false,
    uploading: false,
    errorMessage: null
  });

  useEffect(() => {
    if (seedItems.length === 0) {
      return;
    }
    const nextItems = sortMediaItems(seedItems);
    setMediaItems((previous) => (areMediaItemsEquivalent(previous, nextItems) ? previous : nextItems));
  }, [seedItems]);

  const refreshMediaItems = useCallback(async () => {
    setGalleryState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));

    try {
      const payload = await fetchReferenceCollectionItems({
        collectionId: MEDIA_COLLECTION_ID,
        offset: 0,
        limit: 100,
        search: ""
      });
      if (payload?.ok === false) {
        throw new Error(payload?.error?.message ?? "Failed to load media gallery");
      }
      setMediaItems(sortMediaItems(payload?.items ?? []));
      setGalleryState((previous) => ({
        ...previous,
        loading: false,
        errorMessage: null
      }));
    } catch (error) {
      setGalleryState((previous) => ({
        ...previous,
        loading: false,
        errorMessage: error?.message ?? "Failed to load media gallery"
      }));
    }
  }, []);

  const openGallery = useCallback(async () => {
    setGalleryState((previous) => ({
      ...previous,
      open: true
    }));
    if (mediaItems.length === 0) {
      await refreshMediaItems();
    }
  }, [mediaItems.length, refreshMediaItems]);

  const closeGallery = useCallback(() => {
    setGalleryState((previous) => ({
      ...previous,
      open: false,
      errorMessage: null
    }));
  }, []);

  const uploadMediaFile = useCallback(async (file) => {
    if (!file) {
      return null;
    }

    setGalleryState((previous) => ({
      ...previous,
      uploading: true,
      errorMessage: null
    }));

    try {
      const payload = await uploadMediaAsset({
        fileName: file.name,
        mimeType: file.type,
        contentBase64: await fileToBase64(file)
      });
      if (payload?.ok !== true || !payload?.item) {
        throw new Error(payload?.error?.message ?? "Image upload failed");
      }
      setMediaItems((previous) => sortMediaItems([payload.item, ...previous.filter((item) => item.id !== payload.item.id)]));
      setGalleryState((previous) => ({
        ...previous,
        uploading: false,
        errorMessage: null
      }));
      return payload.item;
    } catch (error) {
      setGalleryState((previous) => ({
        ...previous,
        uploading: false,
        errorMessage: error?.message ?? "Image upload failed"
      }));
      return null;
    }
  }, []);

  return {
    mediaItems,
    galleryState,
    refreshMediaItems,
    openGallery,
    closeGallery,
    uploadMediaFile
  };
}

function buildSelectionCollectionId(branch) {
  return branch === TAG_BRANCH ? TAGS_COLLECTION_ID : CATEGORIES_COLLECTION_ID;
}

export function useTaxonomyDeskWorkspace({
  collectionsDomain,
  moduleSettingsDomain = null,
  navigate = null,
  route = {}
}) {
  const routeState = useMemo(() => resolveTaxonomyRouteState(route), [route]);
  const activeBranch =
    routeState.branch === TAG_BRANCH
      ? TAG_BRANCH
      : routeState.branch === PUBLICATION_BRANCH
        ? routeState.publicationScope
        : CATEGORY_BRANCH;
  const targetCollectionId = buildSelectionCollectionId(activeBranch);

  useEffect(() => {
    if (collectionsDomain.activeCollectionId !== targetCollectionId) {
      collectionsDomain.handleSelectCollection(targetCollectionId);
    }
  }, [collectionsDomain.activeCollectionId, collectionsDomain.handleSelectCollection, targetCollectionId]);

  const items = useMemo(
    () => normalizeArray(collectionsDomain.collectionItemsState.items),
    [collectionsDomain.collectionItemsState.items]
  );
  const categories = activeBranch === CATEGORY_BRANCH ? items : [];
  const tags = activeBranch === TAG_BRANCH ? items : [];
  const usageAwareness = useTaxonomyUsageAwareness({
    activeCollectionId: targetCollectionId,
    items
  });
  const categoryReferenceCountMap = useMemo(
    () => buildReferenceCountMap(usageAwareness.usageState.posts, "categoryIds"),
    [usageAwareness.usageState.posts]
  );
  const tagReferenceCountMap = useMemo(
    () => buildReferenceCountMap(usageAwareness.usageState.posts, "tagIds"),
    [usageAwareness.usageState.posts]
  );
  const categoryRows = useMemo(
    () => buildCategoryRows(categories, categoryReferenceCountMap),
    [categories, categoryReferenceCountMap]
  );
  const rootCategoryIds = useMemo(
    () => categories.filter((category) => !normalizeString(category.parentCategoryId)).map((category) => category.id),
    [categories]
  );
  const effectiveCategoryRouteState = useMemo(
    () => ({
      ...routeState,
      categoryExpanded:
        routeState.categoryExpanded.length > 0 || routeState.categorySearch
          ? routeState.categoryExpanded
          : rootCategoryIds
    }),
    [rootCategoryIds, routeState]
  );
  const visibleCategoryRows = useMemo(
    () => buildVisibleCategoryRows(categoryRows, effectiveCategoryRouteState),
    [categoryRows, effectiveCategoryRouteState]
  );
  const tagRows = useMemo(
    () => buildTagRows(tags, routeState, tagReferenceCountMap),
    [routeState, tagReferenceCountMap, tags]
  );
  const pagedTagRows = useMemo(
    () => paginateTagRows(tagRows, routeState.tagPage),
    [routeState.tagPage, tagRows]
  );
  const categorySummary = useMemo(
    () => buildCategorySummary(categories, categoryReferenceCountMap),
    [categories, categoryReferenceCountMap]
  );
  const tagSummary = useMemo(
    () => buildTagSummary(tags, tagReferenceCountMap),
    [tagReferenceCountMap, tags]
  );
  const { snackbarState, handleCloseSnackbar, showSnackbar } = useSnackbarState(
    collectionsDomain.collectionFormState
  );
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [tagBatchInput, setTagBatchInput] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const featuredMediaGallery = useFeaturedMediaGallery(collectionsDomain.referenceOptionsState);
  const mediaItemsById = useMemo(
    () => new Map(featuredMediaGallery.mediaItems.map((item) => [item.id, item])),
    [featuredMediaGallery.mediaItems]
  );
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === routeState.categoryId) ?? null,
    [categories, routeState.categoryId]
  );
  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === routeState.tagId) ?? null,
    [routeState.tagId, tags]
  );
  const selectedFeaturedMedia = mediaItemsById.get(collectionsDomain.collectionFormState.featuredMediaId) ?? null;

  const updateRouteState = useCallback(
    (patch = {}, replace = true) => {
      if (typeof navigate !== "function") {
        return;
      }
      navigate(
        {
          ...route,
          ...patch
        },
        { replace }
      );
    },
    [navigate, route]
  );

  useEffect(() => {
    const routeCategoryId = routeState.categoryId;
    const routeIsCreate = routeState.categoryMode === "create";
    if (activeBranch !== CATEGORY_BRANCH || routeIsCreate || !routeCategoryId) {
      return;
    }
    if (collectionsDomain.collectionFormState.itemId === routeCategoryId) {
      return;
    }
    const nextCategory = categories.find((category) => category.id === routeCategoryId);
    if (!nextCategory) {
      return;
    }
    collectionsDomain.handleEditCollectionItem(nextCategory);
    setHasAttemptedSubmit(false);
  }, [
    activeBranch,
    categories,
    collectionsDomain,
    collectionsDomain.collectionFormState.itemId,
    routeState.categoryId,
    routeState.categoryMode
  ]);

  useEffect(() => {
    if (
      activeBranch !== CATEGORY_BRANCH ||
      routeState.categoryMode === "create" ||
      !routeState.categoryId ||
      collectionsDomain.collectionItemsState.loading
    ) {
      return;
    }
    if (categories.some((category) => category.id === routeState.categoryId)) {
      return;
    }
    collectionsDomain.handleResetCollectionForm();
    setHasAttemptedSubmit(false);
    updateRouteState(
      {
        categoryId: "",
        categoryMode: ""
      },
      true
    );
  }, [
    activeBranch,
    categories,
    collectionsDomain,
    collectionsDomain.collectionItemsState.loading,
    routeState.categoryId,
    routeState.categoryMode,
    updateRouteState
  ]);

  useEffect(() => {
    const routeTagId = routeState.tagId;
    const routeIsCreate = routeState.tagMode === "create";
    if (activeBranch !== TAG_BRANCH || routeIsCreate || !routeTagId) {
      return;
    }
    if (collectionsDomain.collectionFormState.itemId === routeTagId) {
      return;
    }
    const nextTag = tags.find((tag) => tag.id === routeTagId);
    if (!nextTag) {
      return;
    }
    collectionsDomain.handleEditCollectionItem(nextTag);
    setHasAttemptedSubmit(false);
  }, [
    activeBranch,
    collectionsDomain,
    collectionsDomain.collectionFormState.itemId,
    routeState.tagId,
    routeState.tagMode,
    tags
  ]);

  const isCategoryDrawerOpen = routeState.branch === CATEGORY_BRANCH && (routeState.categoryMode === "create" || routeState.categoryId.length > 0);
  const isTagDrawerOpen = routeState.branch === TAG_BRANCH && (routeState.tagMode === "create" || routeState.tagId.length > 0);
  const categoryValidation = useMemo(
    () => buildCategoryValidation(collectionsDomain.collectionFormState, categories),
    [categories, collectionsDomain.collectionFormState]
  );
  const tagValidation = useMemo(
    () => buildTagValidation(collectionsDomain.collectionFormState, tags),
    [collectionsDomain.collectionFormState, tags]
  );

  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const projectionTargetFieldId = activeBranch === CATEGORY_BRANCH
    ? "remoteCategoriesProjectionTargetProfileId"
    : "remoteTagsProjectionTargetProfileId";
  const projectionTargetId = moduleSettingsDomain?.moduleSettingsState?.draftValues?.[projectionTargetFieldId] ?? "";
  const projectionTarget = remoteOpsSupport.getTargetById(projectionTargetId);
  const projectionLatestRun = remoteOpsSupport.getLatestRunForTarget(projectionTargetId);
  const publicationState = useMemo(
    () => createTaxonomyPublicationState({
      items,
      target: projectionTarget,
      latestRun: projectionLatestRun
    }),
    [items, projectionLatestRun, projectionTarget]
  );

  const allTargets = remoteOpsSupport.supportState.targets ?? [];
  const fallbackBrowserTarget = allTargets.find((target) => target?.productBindingKey === "browser-delivery") ?? null;
  const fallbackDeploymentTarget = allTargets.find((target) => target?.productBindingKey === "deployment-storage") ?? null;
  const fallbackMediaTarget = allTargets.find((target) => target?.productBindingKey === "media-storage") ?? null;
  const selectedCategoryOutputs = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }
    return usageAwareness.usageState.pages
      .filter((page) => {
        if (page?.primarySourceType !== "blog-category" || page?.status !== "published") {
          return false;
        }
        if (page?.deploymentMode === "per-record" && page?.sourceSelectionMode === "all-records") {
          return true;
        }
        return page?.primarySource?.itemId === selectedCategory.id;
      })
      .map((page) => ({
        page,
        output: resolvePagePublicOutput({
          page,
          sourceRecord: selectedCategory,
          targets: allTargets,
          fallbackBrowserTarget,
          fallbackDeploymentTarget,
          fallbackMediaTarget
        })
      }));
  }, [
    allTargets,
    fallbackBrowserTarget,
    fallbackDeploymentTarget,
    fallbackMediaTarget,
    selectedCategory,
    usageAwareness.usageState.pages
  ]);

  const handleSelectBranch = useCallback((nextBranch) => {
    updateRouteState(
      {
        taxonomyBranch: nextBranch,
        ...(nextBranch === PUBLICATION_BRANCH ? {} : {})
      },
      true
    );
  }, [updateRouteState]);

  const handleSelectPublicationScope = useCallback((nextScope) => {
    updateRouteState(
      {
        publicationScope: nextScope
      },
      true
    );
  }, [updateRouteState]);

  const handleOpenCreateCategory = useCallback(() => {
    collectionsDomain.handleResetCollectionForm();
    setHasAttemptedSubmit(false);
    updateRouteState(
      {
        taxonomyBranch: CATEGORY_BRANCH,
        categoryMode: "create",
        categoryId: ""
      },
      false
    );
  }, [collectionsDomain, updateRouteState]);

  const handleOpenEditCategory = useCallback((category) => {
    collectionsDomain.handleEditCollectionItem(category);
    setHasAttemptedSubmit(false);
    updateRouteState(
      {
        taxonomyBranch: CATEGORY_BRANCH,
        categoryMode: "",
        categoryId: category.id
      },
      false
    );
  }, [collectionsDomain, updateRouteState]);

  const handleCloseCategoryDrawer = useCallback(() => {
    collectionsDomain.handleResetCollectionForm();
    featuredMediaGallery.closeGallery();
    setHasAttemptedSubmit(false);
    updateRouteState(
      {
        categoryMode: "",
        categoryId: ""
      },
      true
    );
  }, [collectionsDomain, featuredMediaGallery, updateRouteState]);

  const handleOpenCreateTag = useCallback(() => {
    collectionsDomain.handleResetCollectionForm();
    setHasAttemptedSubmit(false);
    updateRouteState(
      {
        taxonomyBranch: TAG_BRANCH,
        tagMode: "create",
        tagId: "",
        tagPage: 1
      },
      false
    );
  }, [collectionsDomain, updateRouteState]);

  const handleOpenEditTag = useCallback((tag) => {
    collectionsDomain.handleEditCollectionItem(tag);
    setHasAttemptedSubmit(false);
    updateRouteState(
      {
        taxonomyBranch: TAG_BRANCH,
        tagMode: "",
        tagId: tag.id
      },
      false
    );
  }, [collectionsDomain, updateRouteState]);

  const handleCloseTagDrawer = useCallback(() => {
    collectionsDomain.handleResetCollectionForm();
    setHasAttemptedSubmit(false);
    updateRouteState(
      {
        tagMode: "",
        tagId: ""
      },
      true
    );
  }, [collectionsDomain, updateRouteState]);

  useEffect(() => {
    if (!collectionsDomain.collectionFormState.successMessage) {
      return;
    }
    if (isCategoryDrawerOpen) {
      handleCloseCategoryDrawer();
    }
    if (isTagDrawerOpen) {
      handleCloseTagDrawer();
    }
  }, [
    collectionsDomain.collectionFormState.successMessage,
    handleCloseCategoryDrawer,
    handleCloseTagDrawer,
    isCategoryDrawerOpen,
    isTagDrawerOpen
  ]);

  const handleCategoryFilterChange = useCallback((fieldId, value) => {
    updateRouteState(
      {
        [fieldId]: value
      },
      true
    );
  }, [updateRouteState]);

  const handleTagFilterChange = useCallback((fieldId, value) => {
    updateRouteState(
      {
        [fieldId]: value,
        tagPage: fieldId === "tagPage" ? value : 1
      },
      true
    );
  }, [updateRouteState]);

  const handleToggleExpanded = useCallback((categoryId) => {
    const current = new Set(effectiveCategoryRouteState.categoryExpanded);
    if (current.has(categoryId)) {
      current.delete(categoryId);
    } else {
      current.add(categoryId);
    }
    updateRouteState(
      {
        categoryExpanded: [...current].join(",")
      },
      true
    );
  }, [effectiveCategoryRouteState.categoryExpanded, updateRouteState]);

  const handleExpandAll = useCallback(() => {
    updateRouteState(
      {
        categoryExpanded: categories.map((category) => category.id).join(",")
      },
      true
    );
  }, [categories, updateRouteState]);

  const handleCollapseAll = useCallback(() => {
    updateRouteState(
      {
        categoryExpanded: ""
      },
      true
    );
  }, [updateRouteState]);

  const handleCategoryFieldChange = useCallback((fieldId, value) => {
    collectionsDomain.handleCollectionFormChange(fieldId, value);
  }, [collectionsDomain]);

  const handleTagFieldChange = useCallback((fieldId, value) => {
    collectionsDomain.handleCollectionFormChange(fieldId, value);
  }, [collectionsDomain]);

  const handleSelectFeaturedMedia = useCallback((mediaItemId) => {
    collectionsDomain.handleCollectionFormChange("featuredMediaId", mediaItemId);
    featuredMediaGallery.closeGallery();
  }, [collectionsDomain, featuredMediaGallery]);

  const handleUploadFeaturedMedia = useCallback(async (files) => {
    const file = Array.isArray(files) ? files[0] : files?.[0];
    const uploadedItem = await featuredMediaGallery.uploadMediaFile(file);
    if (!uploadedItem) {
      return;
    }
    collectionsDomain.handleCollectionFormChange("featuredMediaId", uploadedItem.id);
    showSnackbar("Featured image uploaded", "success");
  }, [collectionsDomain, featuredMediaGallery, showSnackbar]);

  const reloadAll = useCallback(async () => {
    await collectionsDomain.reloadCollectionItems();
    await usageAwareness.reload();
  }, [collectionsDomain, usageAwareness]);

  const handleSubmitCategory = useCallback(async () => {
    setHasAttemptedSubmit(true);
    if (!categoryValidation.ok) {
      showSnackbar("Fix the category form before saving", "error");
      return;
    }
    await collectionsDomain.handleSubmitCollectionForm();
    await reloadAll();
  }, [categoryValidation.ok, collectionsDomain, reloadAll, showSnackbar]);

  const handleSubmitTag = useCallback(async () => {
    setHasAttemptedSubmit(true);
    if (!tagValidation.ok) {
      showSnackbar("Fix the tag form before saving", "error");
      return;
    }
    await collectionsDomain.handleSubmitCollectionForm();
    await reloadAll();
  }, [collectionsDomain, reloadAll, showSnackbar, tagValidation.ok]);

  const handleDeleteCategory = useCallback(async (categoryId) => {
    const category = categories.find((item) => item.id === categoryId);
    const childCount = categories.filter((item) => item.parentCategoryId === categoryId).length;
    const postCount = categoryReferenceCountMap.get(categoryId) ?? 0;
    const parts = [];
    if (postCount > 0) {
      parts.push(`${postCount} posts reference this category`);
    }
    if (childCount > 0) {
      parts.push(`${childCount} child categories sit below it`);
    }
    const detail = parts.length > 0 ? ` ${parts.join(". ")}.` : "";
    if (!window.confirm(`Delete '${category?.name ?? categoryId}'?${detail}`)) {
      return;
    }
    await collectionsDomain.handleDeleteCollectionItem(categoryId);
    await reloadAll();
    if (routeState.categoryId === categoryId) {
      handleCloseCategoryDrawer();
    }
  }, [categories, categoryReferenceCountMap, collectionsDomain, handleCloseCategoryDrawer, reloadAll, routeState.categoryId]);

  const handleToggleTagSelection = useCallback((tagId) => {
    setSelectedTagIds((previous) => previous.includes(tagId) ? previous.filter((item) => item !== tagId) : [...previous, tagId]);
  }, []);

  const handleClearTagSelection = useCallback(() => {
    setSelectedTagIds([]);
  }, []);

  useEffect(() => {
    const visibleIds = new Set(tagRows.map((row) => row.id));
    setSelectedTagIds((previous) => {
      const nextSelectedIds = previous.filter((tagId) => visibleIds.has(tagId));
      return areStringArraysEquivalent(previous, nextSelectedIds) ? previous : nextSelectedIds;
    });
  }, [tagRows]);

  const handleDeleteTag = useCallback(async (tagId) => {
    const tag = tags.find((item) => item.id === tagId);
    const postCount = tagReferenceCountMap.get(tagId) ?? 0;
    const detail = postCount > 0 ? ` ${postCount} posts will lose this tag.` : "";
    if (!window.confirm(`Delete '${tag?.name ?? tagId}'?${detail}`)) {
      return;
    }
    await collectionsDomain.handleDeleteCollectionItem(tagId);
    await reloadAll();
    if (routeState.tagId === tagId) {
      handleCloseTagDrawer();
    }
  }, [collectionsDomain, handleCloseTagDrawer, reloadAll, routeState.tagId, tagReferenceCountMap, tags]);

  const handleBulkDeleteTags = useCallback(async () => {
    if (selectedTagIds.length === 0) {
      return;
    }
    const selectedRows = tagRows.filter((row) => selectedTagIds.includes(row.id));
    const impactedPosts = selectedRows.reduce((total, row) => total + (row.referenceCount ?? 0), 0);
    const detail = impactedPosts > 0 ? ` ${impactedPosts} post references will be cleared.` : "";
    if (!window.confirm(`Delete ${selectedTagIds.length} selected tags?${detail}`)) {
      return;
    }

    const failures = [];
    for (const tagId of selectedTagIds) {
      const payload = await deleteReferenceCollectionItem({
        collectionId: TAGS_COLLECTION_ID,
        itemId: tagId
      });
      if (!payload?.ok) {
        failures.push(payload?.error?.message ?? `Failed to delete '${tagId}'`);
      }
    }

    await reloadAll();
    if (selectedTagIds.includes(routeState.tagId)) {
      handleCloseTagDrawer();
    }
    if (failures.length > 0) {
      showSnackbar(failures[0], "error");
      return;
    }
    setSelectedTagIds([]);
    showSnackbar("Selected tags deleted", "success");
  }, [handleCloseTagDrawer, reloadAll, routeState.tagId, selectedTagIds, showSnackbar, tagRows]);

  const handleCreateTagBatch = useCallback(async () => {
    const batch = buildTagBatchCandidates(tagBatchInput, tags);
    if (batch.candidates.length === 0) {
      showSnackbar(
        batch.duplicateNames.length > 0
          ? "All batch tags already exist or were duplicated in the input"
          : "Enter one or more tags to create",
        "warning"
      );
      return;
    }

    const failures = [];
    const requestedSlugs = batch.candidates.map((name) => normalizeSlug(name));
    for (const name of batch.candidates) {
      const payload = await createReferenceCollectionItem({
        collectionId: TAGS_COLLECTION_ID,
        item: {
          name,
          visibility: "public"
        }
      });
      if (!payload?.ok) {
        failures.push(payload?.error?.message ?? `Failed to create '${name}'`);
      }
    }

    const verifyPayload = await fetchReferenceCollectionItems({
      collectionId: TAGS_COLLECTION_ID,
      offset: 0,
      limit: 500,
      search: ""
    });
    await reloadAll();

    const verifiedItems = Array.isArray(verifyPayload?.items) ? verifyPayload.items : [];
    const verifiedSlugs = new Set(
      verifiedItems.map((tag) => normalizeSlug(tag.slug ?? tag.name))
    );
    const verifiedCreatedCount = requestedSlugs.filter((slug) => verifiedSlugs.has(slug)).length;
    const failedCount = failures.length + Math.max(0, batch.candidates.length - verifiedCreatedCount);

    if (verifiedCreatedCount === 0) {
      showSnackbar(
        failures[0] ??
          "Batch creation did not create any new tags. Review the names and try again.",
        "error"
      );
      return;
    }

    setTagBatchInput("");
    const parts = [`Created ${verifiedCreatedCount} tag${verifiedCreatedCount === 1 ? "" : "s"}`];
    if (batch.duplicateNames.length > 0) {
      parts.push(`skipped ${batch.duplicateNames.length}`);
    }
    if (failedCount > 0) {
      parts.push(`failed ${failedCount}`);
    }
    showSnackbar(parts.join(", "), failedCount > 0 ? "warning" : "success");
  }, [reloadAll, showSnackbar, tagBatchInput, tags]);

  const categoryPathPreview = useMemo(
    () => buildCategoryPathPreview({
      categoryId: collectionsDomain.collectionFormState.itemId,
      name: collectionsDomain.collectionFormState.name,
      parentCategoryId: collectionsDomain.collectionFormState.parentCategoryId,
      categories
    }),
    [categories, collectionsDomain.collectionFormState.itemId, collectionsDomain.collectionFormState.name, collectionsDomain.collectionFormState.parentCategoryId]
  );

  return {
    routeState,
    activeBranch,
    allCategories: categories,
    allTags: tags,
    categoryRows: visibleCategoryRows,
    fullCategoryRows: categoryRows,
    tagRows,
    pagedTagRows,
    categorySummary,
    tagSummary,
    usageAwareness,
    publicationState,
    projectionLatestRun,
    projectionTarget,
    selectedCategory,
    selectedTag,
    selectedCategoryOutputs,
    categoryValidationErrors: hasAttemptedSubmit ? categoryValidation.errors : {},
    tagValidationErrors: hasAttemptedSubmit ? tagValidation.errors : {},
    categoryPathPreview,
    selectedTagIds,
    tagBatchInput,
    setTagBatchInput,
    snackbarState,
    handleCloseSnackbar,
    handleSelectBranch,
    handleSelectPublicationScope,
    handleCategoryFilterChange,
    handleTagFilterChange,
    handleToggleExpanded,
    handleExpandAll,
    handleCollapseAll,
    handleOpenCreateCategory,
    handleOpenEditCategory,
    handleCloseCategoryDrawer,
    handleOpenCreateTag,
    handleOpenEditTag,
    handleCloseTagDrawer,
    handleCategoryFieldChange,
    handleTagFieldChange,
    handleSubmitCategory,
    handleSubmitTag,
    handleDeleteCategory,
    handleDeleteTag,
    handleToggleTagSelection,
    handleClearTagSelection,
    handleBulkDeleteTags,
    handleCreateTagBatch,
    isCategoryDrawerOpen,
    isTagDrawerOpen,
    formState: collectionsDomain.collectionFormState,
    featuredMediaGallery,
    selectedFeaturedMedia,
    mediaItemsById,
    mediaContentUrlFor: buildMediaContentUrl,
    handleSelectFeaturedMedia,
    handleUploadFeaturedMedia,
    openPosts: () => navigate?.({ moduleId: "posts" }, { replace: false }),
    openPages: () => navigate?.({ moduleId: "pages" }, { replace: false }),
    loadingTerms: toBoolean(collectionsDomain.collectionItemsState.loading),
    termsErrorMessage: collectionsDomain.collectionItemsState.errorMessage,
    publicationScope: routeState.publicationScope,
    handleTagPageChange: (_event, nextPageIndex) => {
      updateRouteState(
        {
          tagPage: nextPageIndex + 1
        },
        true
      );
    }
  };
}
