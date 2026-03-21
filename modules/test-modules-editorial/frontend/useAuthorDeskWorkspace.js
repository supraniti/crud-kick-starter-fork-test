import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteReferenceCollectionItem,
  fetchReferenceCollectionItems
} from "../../../frontend/src/api/reference.js";
import { buildMediaContentUrl, uploadMediaAsset } from "../../test-modules-media-manager/frontend/media-manager-api.js";
import { useEditorialOverview } from "./useEditorialOverview.js";
import {
  buildAuthorAssignmentRows,
  buildAuthorSummary,
  buildAuthorValidation,
  buildLocaleOptions,
  buildVisibleAuthorRows,
  paginateAuthorRows,
  readSocialField,
  resolveAuthorRouteState,
  sortMediaGalleryItems,
  updateSocialField
} from "./author-desk-model.js";

const AUTHORS_COLLECTION_ID = "blog-authors";
const MEDIA_COLLECTION_ID = "media-items";

function normalizeArrayValue(value) {
  return Array.isArray(value) ? value : [];
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
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  const seenSuccessMessageRef = useRef("");
  const seenErrorMessageRef = useRef("");

  useEffect(() => {
    const successMessage =
      typeof formState?.successMessage === "string" ? formState.successMessage : "";
    if (successMessage.length === 0 || successMessage === seenSuccessMessageRef.current) {
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
    const errorMessage =
      typeof formState?.errorMessage === "string" ? formState.errorMessage : "";
    if (errorMessage.length === 0 || errorMessage === seenErrorMessageRef.current) {
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

function useMediaGalleryState(referenceOptionsState) {
  const referenceMediaItems = normalizeArrayValue(referenceOptionsState?.[MEDIA_COLLECTION_ID]?.items);
  const [mediaItems, setMediaItems] = useState(() => sortMediaGalleryItems(referenceMediaItems));
  const [galleryState, setGalleryState] = useState({
    open: false,
    loading: false,
    uploading: false,
    errorMessage: null
  });

  useEffect(() => {
    if (referenceMediaItems.length === 0) {
      return;
    }
    setMediaItems((previous) => {
      const previousIds = previous.map((item) => item.id).join("|");
      const nextItems = sortMediaGalleryItems(referenceMediaItems);
      const nextIds = nextItems.map((item) => item.id).join("|");
      return previousIds === nextIds ? previous : nextItems;
    });
  }, [referenceMediaItems]);

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
      if (!payload?.ok) {
        throw new Error(payload?.error?.message ?? "Failed to load media gallery");
      }
      setMediaItems(sortMediaGalleryItems(payload.items ?? []));
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
        throw new Error(payload?.error?.message ?? "Avatar upload failed");
      }
      setMediaItems((previous) =>
        sortMediaGalleryItems([payload.item, ...previous.filter((item) => item.id !== payload.item.id)])
      );
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
        errorMessage: error?.message ?? "Avatar upload failed"
      }));
      return null;
    }
  }, []);

  return {
    mediaItems,
    galleryState,
    openGallery,
    closeGallery,
    refreshMediaItems,
    uploadMediaFile
  };
}

export function useAuthorDeskWorkspace({ collectionsDomain, route = {}, navigate = null }) {
  const overview = useEditorialOverview({ collectionsDomain });
  const routeState = useMemo(() => resolveAuthorRouteState(route), [route]);
  const [selectedAuthorIds, setSelectedAuthorIds] = useState([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const { snackbarState, handleCloseSnackbar, showSnackbar } = useSnackbarState(
    collectionsDomain.collectionFormState
  );
  const mediaGallery = useMediaGalleryState(collectionsDomain.referenceOptionsState);

  const assignmentRows = useMemo(
    () => buildAuthorAssignmentRows(overview.authors, overview.queueState.items),
    [overview.authors, overview.queueState.items]
  );
  const summary = useMemo(
    () => buildAuthorSummary(overview.authors, assignmentRows),
    [overview.authors, assignmentRows]
  );
  const visibleRows = useMemo(
    () => buildVisibleAuthorRows(assignmentRows, routeState),
    [assignmentRows, routeState]
  );
  const pagedRows = useMemo(
    () => paginateAuthorRows(visibleRows, routeState.page),
    [visibleRows, routeState.page]
  );
  const localeOptions = useMemo(
    () => buildLocaleOptions(overview.authors),
    [overview.authors]
  );
  const validation = useMemo(
    () => buildAuthorValidation(collectionsDomain.collectionFormState, overview.authors),
    [collectionsDomain.collectionFormState, overview.authors]
  );
  const expertiseTagOptions = normalizeArrayValue(
    collectionsDomain.referenceOptionsState?.["blog-tags"]?.items
  );
  const mediaItemsById = useMemo(
    () => new Map(mediaGallery.mediaItems.map((item) => [item.id, item])),
    [mediaGallery.mediaItems]
  );
  const selectedAvatarItem = mediaItemsById.get(collectionsDomain.collectionFormState.avatarMediaId) ?? null;

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
    const currentSearch = collectionsDomain.collectionFilterState.search ?? "";
    if (currentSearch === routeState.search) {
      return;
    }
    collectionsDomain.handleCollectionFilterChange("search", routeState.search);
  }, [
    collectionsDomain,
    collectionsDomain.collectionFilterState.search,
    routeState.search
  ]);

  useEffect(() => {
    const routeAuthorId = routeState.authorId;
    const routeIsCreate = routeState.authorMode === "create";
    if (routeIsCreate) {
      return;
    }
    if (!routeAuthorId) {
      return;
    }
    if (collectionsDomain.collectionFormState.itemId === routeAuthorId) {
      return;
    }
    const targetAuthor = overview.authors.find((author) => author.id === routeAuthorId);
    if (!targetAuthor) {
      return;
    }
    collectionsDomain.handleEditCollectionItem(targetAuthor);
    setHasAttemptedSubmit(false);
  }, [
    collectionsDomain,
    collectionsDomain.collectionFormState.itemId,
    overview.authors,
    routeState.authorId,
    routeState.authorMode
  ]);

  const isCreateDrawerOpen = routeState.authorMode === "create";
  const isEditDrawerOpen = routeState.authorId.length > 0;
  const isDrawerOpen = isCreateDrawerOpen || isEditDrawerOpen;

  const handleOpenCreate = useCallback(() => {
    collectionsDomain.handleResetCollectionForm();
    setHasAttemptedSubmit(false);
    updateRouteState(
      {
        authorMode: "create",
        authorId: "",
        authorPage: 1
      },
      false
    );
  }, [collectionsDomain, updateRouteState]);

  const handleOpenEdit = useCallback(
    (author) => {
      collectionsDomain.handleEditCollectionItem(author);
      setHasAttemptedSubmit(false);
      updateRouteState(
        {
          authorMode: "",
          authorId: author.id
        },
        false
      );
    },
    [collectionsDomain, updateRouteState]
  );

  const handleCloseDrawer = useCallback(() => {
    collectionsDomain.handleResetCollectionForm();
    setHasAttemptedSubmit(false);
    updateRouteState(
      {
        authorMode: "",
        authorId: ""
      },
      true
    );
  }, [collectionsDomain, updateRouteState]);

  useEffect(() => {
    if (!collectionsDomain.collectionFormState.successMessage || !isDrawerOpen) {
      return;
    }
    handleCloseDrawer();
  }, [collectionsDomain.collectionFormState.successMessage, handleCloseDrawer, isDrawerOpen]);

  const handleFilterChange = useCallback(
    (fieldId, value) => {
      if (fieldId === "locale") {
        updateRouteState(
          {
            locale: value,
            authorPage: 1
          },
          true
        );
        return;
      }

      collectionsDomain.handleCollectionFilterChange(fieldId, value);
      updateRouteState(
        {
          [fieldId]: value,
          authorPage: 1
        },
        true
      );
    },
    [collectionsDomain, updateRouteState]
  );

  const handleSortChange = useCallback(
    (value) => {
      updateRouteState(
        {
          authorSort: value,
          authorPage: 1
        },
        true
      );
    },
    [updateRouteState]
  );

  const handlePageChange = useCallback(
    (_event, nextPageIndex) => {
      updateRouteState(
        {
          authorPage: nextPageIndex + 1
        },
        true
      );
    },
    [updateRouteState]
  );

  const openPostsForAuthor = useCallback(
    (authorId) => {
      if (typeof navigate !== "function") {
        return;
      }
      navigate(
        {
          moduleId: "test-modules-content",
          collectionId: "blog-posts",
          primaryAuthorId: authorId
        },
        { replace: false }
      );
    },
    [navigate]
  );

  const handleToggleAuthorSelection = useCallback((authorId) => {
    setSelectedAuthorIds((previous) =>
      previous.includes(authorId)
        ? previous.filter((itemId) => itemId !== authorId)
        : [...previous, authorId]
    );
  }, []);

  const handleSelectVisible = useCallback(() => {
    setSelectedAuthorIds(pagedRows.rows.map((row) => row.id));
  }, [pagedRows.rows]);

  const handleClearSelection = useCallback(() => {
    setSelectedAuthorIds([]);
  }, []);

  useEffect(() => {
    const visibleIds = new Set(visibleRows.map((row) => row.id));
    setSelectedAuthorIds((previous) => previous.filter((authorId) => visibleIds.has(authorId)));
  }, [visibleRows]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedAuthorIds.length === 0) {
      return;
    }
    const selectedRows = visibleRows.filter((row) => selectedAuthorIds.includes(row.id));
    const affectedRows = selectedRows.filter((row) => row.totalPosts > 0);
    const confirmMessage = affectedRows.length > 0
      ? `Delete ${selectedAuthorIds.length} authors? Some still own posts: ${affectedRows
          .map((row) => `${row.displayName} (${row.totalPosts})`)
          .join(", ")}.`
      : `Delete ${selectedAuthorIds.length} selected authors?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const failures = [];
    for (const authorId of selectedAuthorIds) {
      const payload = await deleteReferenceCollectionItem({
        collectionId: AUTHORS_COLLECTION_ID,
        itemId: authorId
      });
      if (!payload?.ok) {
        failures.push(payload?.error?.message ?? `Failed to delete '${authorId}'`);
      }
    }

    await collectionsDomain.reloadCollectionItems();
    overview.reloadQueue();

    if (failures.length > 0) {
      showSnackbar(failures[0], "error");
      return;
    }

    setSelectedAuthorIds([]);
    showSnackbar("Selected authors deleted", "success");
  }, [
    collectionsDomain,
    overview,
    selectedAuthorIds,
    showSnackbar,
    visibleRows
  ]);

  const handleFieldChange = useCallback(
    (fieldId, value) => {
      collectionsDomain.handleCollectionFormChange(fieldId, value);
    },
    [collectionsDomain]
  );

  const handleSocialLinkChange = useCallback(
    (fieldId, value) => {
      collectionsDomain.handleCollectionFormChange(
        "socialLinks",
        updateSocialField(collectionsDomain.collectionFormState, fieldId, value)
      );
    },
    [collectionsDomain]
  );

  const handleToggleExpertiseTag = useCallback(
    (tagId) => {
      const currentValue = normalizeArrayValue(collectionsDomain.collectionFormState.expertiseTagIds);
      collectionsDomain.handleCollectionFormChange(
        "expertiseTagIds",
        currentValue.includes(tagId)
          ? currentValue.filter((item) => item !== tagId)
          : [...currentValue, tagId]
      );
    },
    [collectionsDomain]
  );

  const handleSelectAvatar = useCallback(
    (mediaItemId) => {
      collectionsDomain.handleCollectionFormChange("avatarMediaId", mediaItemId);
      mediaGallery.closeGallery();
    },
    [collectionsDomain, mediaGallery]
  );

  const handleUploadAvatar = useCallback(
    async (files) => {
      const file = Array.isArray(files) ? files[0] : files?.[0];
      const uploadedItem = await mediaGallery.uploadMediaFile(file);
      if (!uploadedItem) {
        return;
      }
      collectionsDomain.handleCollectionFormChange("avatarMediaId", uploadedItem.id);
      showSnackbar("Avatar uploaded", "success");
    },
    [collectionsDomain, mediaGallery, showSnackbar]
  );

  const handleSubmit = useCallback(async () => {
    setHasAttemptedSubmit(true);
    if (!validation.ok) {
      showSnackbar("Fix the author form before saving", "error");
      return;
    }
    await collectionsDomain.handleSubmitCollectionForm();
    await collectionsDomain.reloadCollectionItems();
    await overview.reloadQueue();
  }, [collectionsDomain, overview, showSnackbar, validation.ok]);

  const handleDeleteSingle = useCallback(
    async (authorId) => {
      const author = overview.authors.find((item) => item.id === authorId);
      if (!window.confirm(`Delete '${author?.displayName ?? authorId}'?`)) {
        return;
      }
      await collectionsDomain.handleDeleteCollectionItem(authorId);
      await collectionsDomain.reloadCollectionItems();
      await overview.reloadQueue();
      if (collectionsDomain.collectionFormState.itemId === authorId) {
        handleCloseDrawer();
      }
    },
    [collectionsDomain, handleCloseDrawer, overview]
  );

  return {
    authors: overview.authors,
    queueState: overview.queueState,
    summary,
    routeState,
    pagedRows,
    visibleRows,
    localeOptions,
    selectedAuthorIds,
    isDrawerOpen,
    isCreateDrawerOpen,
    validationErrors: hasAttemptedSubmit ? validation.errors : {},
    isFormValid: validation.ok,
    formState: collectionsDomain.collectionFormState,
    expertiseTagOptions,
    selectedAvatarItem,
    mediaGallery,
    mediaItemsById,
    snackbarState,
    handleCloseSnackbar,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseDrawer,
    handleFilterChange,
    handleSortChange,
    handlePageChange,
    handleToggleAuthorSelection,
    handleSelectVisible,
    handleClearSelection,
    handleBulkDelete,
    handleFieldChange,
    handleSocialLinkChange,
    handleToggleExpertiseTag,
    handleSelectAvatar,
    handleUploadAvatar,
    handleSubmit,
    handleDeleteSingle,
    openPostsForAuthor,
    openGallery: mediaGallery.openGallery,
    refreshMediaItems: mediaGallery.refreshMediaItems,
    readSocialField: (fieldId) => readSocialField(collectionsDomain.collectionFormState, fieldId),
    mediaContentUrlFor: buildMediaContentUrl,
    loadingAuthors: toBoolean(collectionsDomain.collectionItemsState.loading),
    authorErrorMessage: collectionsDomain.collectionItemsState.errorMessage
  };
}
