import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildMediaContentUrl,
  deleteMediaAsset,
  listMediaPresetJobs,
  startMediaPresetJob,
  updateMediaAssetMetadata,
  uploadMediaAsset
} from "./media-manager-api.js";

const MEDIA_ITEMS_COLLECTION_ID = "media-items";
const EMPTY_METADATA_DRAFT = Object.freeze({
  displayName: "",
  altText: "",
  description: "",
  category: "library",
  usageLabels: []
});

function sortMediaItems(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left?.updatedOn ?? left?.createdOn ?? "") || 0;
    const rightTime = Date.parse(right?.updatedOn ?? right?.createdOn ?? "") || 0;
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    const leftName = typeof left?.displayName === "string" ? left.displayName : "";
    const rightName = typeof right?.displayName === "string" ? right.displayName : "";
    return leftName.localeCompare(rightName);
  });
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

function normalizeUsageLabels(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((entry) => typeof entry === "string" && entry.length > 0))];
}

function toMetadataDraft(item) {
  if (!item) {
    return { ...EMPTY_METADATA_DRAFT };
  }

  return {
    displayName: item.displayName ?? "",
    altText: item.altText ?? "",
    description: item.description ?? "",
    category: item.category ?? "library",
    usageLabels: normalizeUsageLabels(item.usageLabels)
  };
}

function useMediaSelection(collectionsDomain) {
  const [selectedMediaId, setSelectedMediaId] = useState("");

  useEffect(() => {
    if (collectionsDomain.activeCollectionId !== MEDIA_ITEMS_COLLECTION_ID) {
      collectionsDomain.handleSelectCollection(MEDIA_ITEMS_COLLECTION_ID);
    }
  }, [collectionsDomain.activeCollectionId, collectionsDomain.handleSelectCollection]);

  const items = useMemo(
    () => sortMediaItems(collectionsDomain.collectionItemsState.items),
    [collectionsDomain.collectionItemsState.items]
  );
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedMediaId) ?? null,
    [items, selectedMediaId]
  );
  const derivedItems = useMemo(
    () => items.filter((item) => item.sourceMediaId === selectedItem?.id),
    [items, selectedItem?.id]
  );

  useEffect(() => {
    if (items.length === 0) {
      setSelectedMediaId("");
      return;
    }
    if (!selectedMediaId || !items.some((item) => item.id === selectedMediaId)) {
      setSelectedMediaId(items[0].id);
    }
  }, [items, selectedMediaId]);

  return {
    items,
    selectedItem,
    derivedItems,
    setSelectedMediaId
  };
}

function useMediaUpload(collectionsDomain, setSelectedMediaId) {
  const [uploadState, setUploadState] = useState({
    busy: false,
    errorMessage: null
  });

  const handleUploadFiles = useCallback(async (files) => {
    const file = Array.isArray(files) ? files[0] : files?.[0];
    if (!file) {
      return;
    }

    setUploadState({
      busy: true,
      errorMessage: null
    });

    try {
      const payload = await uploadMediaAsset({
        fileName: file.name,
        mimeType: file.type,
        contentBase64: await fileToBase64(file)
      });
      if (payload?.ok !== true) {
        throw new Error(payload?.error?.message ?? "Upload failed");
      }

      await collectionsDomain.reloadCollectionItems();
      setSelectedMediaId(payload.item?.id ?? "");
      setUploadState({
        busy: false,
        errorMessage: null
      });
    } catch (error) {
      setUploadState({
        busy: false,
        errorMessage: error?.message ?? "Upload failed"
      });
    }
  }, [collectionsDomain, setSelectedMediaId]);

  return {
    uploadState,
    handleUploadFiles
  };
}

function useMediaMetadata(selectedItem, collectionsDomain) {
  const metadataDraftRef = useRef({ ...EMPTY_METADATA_DRAFT });
  const [metadataState, setMetadataState] = useState({
    draft: { ...EMPTY_METADATA_DRAFT },
    saving: false,
    errorMessage: null
  });

  useEffect(() => {
    const nextDraft = toMetadataDraft(selectedItem);
    metadataDraftRef.current = nextDraft;
    setMetadataState((previous) => ({
      ...previous,
      draft: nextDraft,
      errorMessage: null
    }));
  }, [selectedItem?.id, selectedItem?.updatedOn]);

  const handleMetadataFieldChange = useCallback((fieldId, value) => {
    setMetadataState((previous) => {
      const nextDraft = {
        ...previous.draft,
        [fieldId]: fieldId === "usageLabels" ? normalizeUsageLabels(value) : value
      };
      metadataDraftRef.current = nextDraft;
      return {
        ...previous,
        draft: nextDraft
      };
    });
  }, []);

  const handleSaveMetadata = useCallback(async () => {
    if (!selectedItem) {
      return;
    }

    setMetadataState((previous) => ({
      ...previous,
      saving: true,
      errorMessage: null
    }));

    try {
      const payload = await updateMediaAssetMetadata(selectedItem.id, metadataDraftRef.current);
      if (payload?.ok !== true) {
        throw new Error(payload?.error?.message ?? "Metadata update failed");
      }

      await collectionsDomain.reloadCollectionItems();
      setMetadataState((previous) => ({
        ...previous,
        saving: false,
        errorMessage: null
      }));
    } catch (error) {
      setMetadataState((previous) => ({
        ...previous,
        saving: false,
        errorMessage: error?.message ?? "Metadata update failed"
      }));
    }
  }, [collectionsDomain, selectedItem]);

  return {
    metadataState,
    handleMetadataFieldChange,
    handleSaveMetadata
  };
}

function useMediaOperations(selectedItem, collectionsDomain, setSelectedMediaId) {
  const [operationState, setOperationState] = useState({
    runningPreset: "",
    errorMessage: null,
    jobs: []
  });

  const refreshJobs = useCallback(async () => {
    if (!selectedItem) {
      setOperationState((previous) => ({
        ...previous,
        jobs: []
      }));
      return;
    }

    try {
      const jobs = await listMediaPresetJobs(selectedItem.id);
      setOperationState((previous) => ({
        ...previous,
        jobs,
        errorMessage: null
      }));
    } catch (error) {
      setOperationState((previous) => ({
        ...previous,
        errorMessage: error?.message ?? "Failed to load media jobs"
      }));
    }
  }, [selectedItem]);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  useEffect(() => {
    const hasActiveJob = operationState.jobs.some(
      (job) => job?.status === "queued" || job?.status === "running"
    );
    if (!hasActiveJob) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      collectionsDomain.reloadCollectionItems();
      void refreshJobs();
    }, 1500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [collectionsDomain, operationState.jobs, refreshJobs]);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedItem) {
      return;
    }

    const confirmed = window.confirm(
      `Delete '${selectedItem.displayName}' from the media library?`
    );
    if (!confirmed) {
      return;
    }

    try {
      const payload = await deleteMediaAsset(selectedItem.id);
      if (payload?.ok !== true) {
        throw new Error(payload?.error?.message ?? "Delete failed");
      }

      await collectionsDomain.reloadCollectionItems();
      setSelectedMediaId("");
    } catch (error) {
      setOperationState((previous) => ({
        ...previous,
        errorMessage: error?.message ?? "Delete failed"
      }));
    }
  }, [collectionsDomain, selectedItem, setSelectedMediaId]);

  const handleRunPreset = useCallback(async (preset) => {
    if (!selectedItem) {
      return;
    }

    setOperationState((previous) => ({
      ...previous,
      runningPreset: preset,
      errorMessage: null
    }));

    try {
      const payload = await startMediaPresetJob(selectedItem.id, preset);
      if (payload?.ok !== true) {
        throw new Error(payload?.error?.message ?? "Operation failed to start");
      }

      await refreshJobs();
      await collectionsDomain.reloadCollectionItems();
      setOperationState((previous) => ({
        ...previous,
        runningPreset: ""
      }));
    } catch (error) {
      setOperationState((previous) => ({
        ...previous,
        runningPreset: "",
        errorMessage: error?.message ?? "Operation failed to start"
      }));
    }
  }, [collectionsDomain, refreshJobs, selectedItem]);

  return {
    operationState,
    handleDeleteSelected,
    handleRunPreset
  };
}

export function useMediaManagerWorkspace({ collectionsDomain }) {
  const { items, selectedItem, derivedItems, setSelectedMediaId } = useMediaSelection(collectionsDomain);
  const { uploadState, handleUploadFiles } = useMediaUpload(
    collectionsDomain,
    setSelectedMediaId
  );
  const { metadataState, handleMetadataFieldChange, handleSaveMetadata } = useMediaMetadata(
    selectedItem,
    collectionsDomain
  );
  const { operationState, handleDeleteSelected, handleRunPreset } = useMediaOperations(
    selectedItem,
    collectionsDomain,
    setSelectedMediaId
  );

  return {
    items,
    selectedItem,
    derivedItems,
    uploadState,
    metadataState,
    operationState,
    mediaContentUrlFor: buildMediaContentUrl,
    setSelectedMediaId,
    handleUploadFiles,
    handleMetadataFieldChange,
    handleSaveMetadata,
    handleDeleteSelected,
    handleRunPreset
  };
}
