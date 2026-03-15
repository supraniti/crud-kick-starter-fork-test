import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { MediaManagerRemotePanel } from "./MediaManagerRemotePanel.jsx";
import { useMediaManagerWorkspace } from "./useMediaManagerWorkspace.js";
import {
  MediaArtifactLinksPanel,
  MediaBulkSelectionPanel,
  MediaCard,
  MediaPreview,
  MediaRemoteOnlyPanel,
  MetadataEditor,
  OperationsPanel,
  resolveMediaCardRemoteSyncState
} from "./MediaManagerPanels.jsx";
import {
  resolveLinkedBrowserDeliveryTarget,
  sortMediaItemsForDisplay
} from "./media-manager-remote-state.js";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";

const SORT_OPTIONS = [
  { value: "recent", label: "Recently Updated" },
  { value: "oldest", label: "Oldest Updated" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "category", label: "Category" }
];

export function MediaManagerView({
  activeModuleLabel,
  collectionsDomain,
  moduleSettingsDomain = null,
  navigate = null
}) {
  const fileInputRef = useRef(null);
  const [sortMode, setSortMode] = useState("recent");
  const [selectedMediaIds, setSelectedMediaIds] = useState([]);
  const workspace = useMediaManagerWorkspace({
    collectionsDomain
  });
  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const remoteMediaTargetId =
    moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteMediaTargetProfileId ?? "";
  const remoteMediaTargets = remoteOpsSupport.getTargetsByKind("media-storage");
  const remoteMediaTarget = remoteOpsSupport.getTargetById(remoteMediaTargetId);
  const browserDeliveryTarget = resolveLinkedBrowserDeliveryTarget(
    remoteOpsSupport.getTargetsByKind("browser-delivery"),
    remoteMediaTarget
  );
  const deploymentTarget = remoteOpsSupport.getTargetById(
    browserDeliveryTarget?.config?.deploymentTargetProfileId ?? ""
  );
  const remoteMediaLatestRun = remoteOpsSupport.getLatestRunForTarget(remoteMediaTargetId);
  const visibleItems = useMemo(
    () => sortMediaItemsForDisplay(workspace.items, sortMode),
    [sortMode, workspace.items]
  );
  const remoteRuns = remoteOpsSupport.supportState.runs ?? [];
  const remoteBusy =
    remoteOpsSupport.procedureState.processing &&
    remoteOpsSupport.procedureState.targetId === remoteMediaTarget?.id;

  useEffect(() => {
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    setSelectedMediaIds((previous) => previous.filter((itemId) => visibleIds.has(itemId)));
  }, [visibleItems]);

  function toggleMediaSelection(mediaItemId) {
    setSelectedMediaIds((previous) =>
      previous.includes(mediaItemId)
        ? previous.filter((itemId) => itemId !== mediaItemId)
        : [...previous, mediaItemId]
    );
  }

  function selectVisibleItems() {
    setSelectedMediaIds(visibleItems.map((item) => item.id));
    if (visibleItems[0]) {
      workspace.setSelectedMediaId(visibleItems[0].id);
    }
  }

  function clearSelection() {
    setSelectedMediaIds([]);
  }

  async function handleDeleteSelectedItems() {
    await workspace.handleDeleteItems(selectedMediaIds);
    setSelectedMediaIds([]);
  }

  const openRemoteOpsTarget = () => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate(
      {
        moduleId: "test-modules-remote-ops",
        tab: "targets",
        targetId: remoteMediaTargetId
      },
      { replace: false }
    );
  };

  const saveModuleSettings = async () => {
    if (!moduleSettingsDomain || typeof moduleSettingsDomain.handleSaveModuleSettings !== "function") {
      return;
    }
    await moduleSettingsDomain.handleSaveModuleSettings();
    await remoteOpsSupport.reload();
  };

  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          background: "linear-gradient(135deg, #111111 0%, #6f5b42 100%)",
          color: "common.white"
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Stack spacing={0.5}>
            <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)" }}>
              {activeModuleLabel}
            </Typography>
            <Typography variant="h4">Local Media Library</Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
              Upload images, curate metadata, inspect remote sync posture, and manage public media visibility from one desk.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={workspace.uploadState.busy}
            >
              {workspace.uploadState.busy ? "Uploading..." : "Upload Image"}
            </Button>
            <Button variant="outlined" color="inherit" onClick={collectionsDomain.reloadCollectionItems}>
              Refresh
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                void workspace.handleUploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      {workspace.uploadState.errorMessage ? (
        <Alert severity="error">{workspace.uploadState.errorMessage}</Alert>
      ) : null}
      {collectionsDomain.collectionItemsState.errorMessage ? (
        <Alert severity="error">{collectionsDomain.collectionItemsState.errorMessage}</Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Search"
            size="small"
            value={collectionsDomain.collectionFilterState.search ?? ""}
            onChange={(event) =>
              collectionsDomain.handleCollectionFilterChange("search", event.target.value)
            }
          />
          <TextField
            select
            label="Status"
            size="small"
            value={collectionsDomain.collectionFilterState.status ?? ""}
            onChange={(event) =>
              collectionsDomain.handleCollectionFilterChange("status", event.target.value)
            }
          >
            <MenuItem value="">All</MenuItem>
            {["ready", "processing", "failed"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Category"
            size="small"
            value={collectionsDomain.collectionFilterState.category ?? ""}
            onChange={(event) =>
              collectionsDomain.handleCollectionFilterChange("category", event.target.value)
            }
          >
            <MenuItem value="">All</MenuItem>
            {["library", "campaign", "product", "social"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Asset Type"
            size="small"
            value={collectionsDomain.collectionFilterState.isDerived ?? ""}
            onChange={(event) =>
              collectionsDomain.handleCollectionFilterChange("isDerived", event.target.value)
            }
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="false">Originals</MenuItem>
            <MenuItem value="true">Derived</MenuItem>
          </TextField>
          <TextField
            select
            label="Sort"
            size="small"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="text" onClick={collectionsDomain.handleClearCollectionFilters}>
            Clear Filters
          </Button>
        </Stack>
      </Paper>

      <MediaBulkSelectionPanel
        selectedCount={selectedMediaIds.length}
        visibleCount={visibleItems.length}
        onSelectVisible={selectVisibleItems}
        onClearSelection={clearSelection}
        onDeleteSelected={handleDeleteSelectedItems}
        onCompareRemote={() => remoteOpsSupport.compareTarget(remoteMediaTargetId)}
        onSyncRemote={() => remoteOpsSupport.executeTarget(remoteMediaTargetId)}
        remoteEnabled={Boolean(remoteMediaTargetId)}
        remoteBusy={remoteBusy}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.2fr) minmax(340px, 0.8fr)" },
          gap: 2
        }}
      >
        <Stack spacing={2}>
          {collectionsDomain.collectionItemsState.loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2">Loading media...</Typography>
            </Stack>
          ) : null}
          {visibleItems.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6">No media yet</Typography>
              <Typography variant="body2" color="text.secondary">
                Upload a PNG, JPEG, or WebP file to seed the library.
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))"
                },
                gap: 2
              }}
            >
              {visibleItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  selected={workspace.selectedItem?.id === item.id}
                  checked={selectedMediaIds.includes(item.id)}
                  onSelect={() => workspace.setSelectedMediaId(item.id)}
                  onToggleSelect={() => toggleMediaSelection(item.id)}
                  mediaContentUrlFor={workspace.mediaContentUrlFor}
                  remoteSyncState={resolveMediaCardRemoteSyncState(item, remoteMediaTarget, remoteRuns)}
                />
              ))}
            </Box>
          )}
        </Stack>

        <Stack spacing={2}>
          <MediaPreview
            item={workspace.selectedItem}
            derivedItems={workspace.derivedItems}
            mediaContentUrlFor={workspace.mediaContentUrlFor}
            remoteSyncState={resolveMediaCardRemoteSyncState(workspace.selectedItem, remoteMediaTarget, remoteRuns)}
          />
          <MediaArtifactLinksPanel
            item={workspace.selectedItem}
            mediaTarget={remoteMediaTarget}
            browserTarget={browserDeliveryTarget}
            deploymentTarget={deploymentTarget}
            mediaContentUrlFor={workspace.mediaContentUrlFor}
          />
          <MetadataEditor
            metadataState={workspace.metadataState}
            onChangeField={workspace.handleMetadataFieldChange}
            onSave={workspace.handleSaveMetadata}
          />
          <OperationsPanel
            selectedItem={workspace.selectedItem}
            operationState={workspace.operationState}
            onRunPreset={workspace.handleRunPreset}
            onDeleteSelected={workspace.handleDeleteSelected}
          />
          <MediaRemoteOnlyPanel mediaTarget={remoteMediaTarget} />
          <MediaManagerRemotePanel
            latestRun={remoteMediaLatestRun}
            moduleSettingsDomain={moduleSettingsDomain}
            onCompare={() => remoteOpsSupport.compareTarget(remoteMediaTargetId)}
            onExecute={() => remoteOpsSupport.executeTarget(remoteMediaTargetId)}
            onOpenRemoteOps={openRemoteOpsTarget}
            onRestore={() => remoteOpsSupport.restoreTarget(remoteMediaTargetId)}
            onSaveSettings={saveModuleSettings}
            onValidate={() => remoteOpsSupport.validateTarget(remoteMediaTargetId)}
            procedureState={remoteOpsSupport.procedureState}
            selectedTarget={remoteMediaTarget}
            targetOptions={remoteMediaTargets}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
