import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MediaManagerRemotePanel } from "./MediaManagerRemotePanel.jsx";
import { useMediaManagerWorkspace } from "./useMediaManagerWorkspace.js";
import {
  MediaArtifactLinksPanel,
  MediaBulkSelectionPanel,
  MediaCard,
  MediaListView,
  MediaPreview,
  MediaRemoteProcedureFeedback,
  MediaRemoteOnlyPanel,
  MediaUploadTile,
  MediaUsagePanel,
  MetadataEditor,
  OperationsPanel,
  resolveMediaCardRemoteSyncState
} from "./MediaManagerPanels.jsx";
import {
  resolveLinkedBrowserDeliveryTarget,
  summarizeMediaSyncStates
} from "./media-manager-remote-state.js";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";
import { DeskTabsCard } from "../../../frontend/src/ui/DeskTabsCard.jsx";
import {
  MEDIA_DETAIL_TABS,
  MEDIA_SORT_OPTIONS,
  MEDIA_VIEW_OPTIONS,
  buildMediaSummary,
  resolveMediaDeskRouteState,
  sortMediaItemsForDesk
} from "./media-desk-model.js";
import { useMediaUsageAwareness } from "./useMediaUsageAwareness.js";

function MediaSummaryCard({ label, value, tone = "default" }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4">{value}</Typography>
        <Chip
          size="small"
          label={tone}
          color={tone === "attention" ? "warning" : "default"}
          sx={{ alignSelf: "flex-start" }}
        />
      </Stack>
    </Paper>
  );
}

export function MediaManagerView({
  activeModuleLabel,
  collectionsDomain,
  moduleSettingsDomain = null,
  navigate = null,
  route = {}
}) {
  const fileInputRef = useRef(null);
  const routeState = useMemo(() => resolveMediaDeskRouteState(route), [route]);
  const [selectedMediaIds, setSelectedMediaIds] = useState([]);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [localSortMode, setLocalSortMode] = useState(routeState.sort);
  const [localDetailSection, setLocalDetailSection] = useState(routeState.tab);
  const [localViewMode, setLocalViewMode] = useState(routeState.view);
  const usesRouteState = typeof navigate === "function";
  const activeSortMode = localSortMode;
  const activeDetailSection = localDetailSection;
  const activeViewMode = localViewMode;
  const workspace = useMediaManagerWorkspace({
    collectionsDomain
  });
  const usageAwareness = useMediaUsageAwareness(workspace.items);
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
    () => sortMediaItemsForDesk(workspace.items, activeSortMode, usageAwareness.usageByMediaId),
    [activeSortMode, usageAwareness.usageByMediaId, workspace.items]
  );
  const remoteRuns = remoteOpsSupport.supportState.runs ?? [];
  const remoteSummary = useMemo(
    () =>
      summarizeMediaSyncStates({
        items: workspace.items,
        mediaTarget: remoteMediaTarget,
        runs: remoteRuns
      }),
    [remoteMediaTarget, remoteRuns, workspace.items]
  );
  const mediaSummary = useMemo(
    () => buildMediaSummary(workspace.items, usageAwareness.usageByMediaId, remoteSummary),
    [remoteSummary, usageAwareness.usageByMediaId, workspace.items]
  );
  const remoteBusy =
    remoteOpsSupport.procedureState.processing &&
    remoteOpsSupport.procedureState.targetId === remoteMediaTarget?.id;
  const selectedUsage = useMemo(
    () =>
      usageAwareness.usageByMediaId.get(workspace.selectedItem?.id) ?? {
        entries: [],
        totalReferences: 0,
        authorCount: 0,
        postCount: 0,
        categoryCount: 0,
        pageCount: 0
      },
    [usageAwareness.usageByMediaId, workspace.selectedItem?.id]
  );

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
    if (!usesRouteState) {
      return;
    }
    setLocalSortMode(routeState.sort);
    setLocalDetailSection(routeState.tab);
    setLocalViewMode(routeState.view);
  }, [routeState.sort, routeState.tab, routeState.view, usesRouteState]);

  useEffect(() => {
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    setSelectedMediaIds((previous) => previous.filter((itemId) => visibleIds.has(itemId)));
  }, [visibleItems]);

  useEffect(() => {
    if (!usesRouteState) {
      return;
    }
    const filterKeys = ["search", "status", "category", "isDerived"];
    for (const fieldId of filterKeys) {
      const nextValue = routeState[fieldId] ?? "";
      if ((collectionsDomain.collectionFilterState[fieldId] ?? "") !== nextValue) {
        collectionsDomain.handleCollectionFilterChange(fieldId, nextValue);
      }
    }
  }, [
    collectionsDomain,
    collectionsDomain.collectionFilterState,
    routeState,
    usesRouteState
  ]);

  useEffect(() => {
    if (!usesRouteState) {
      return;
    }
    if (!routeState.mediaId) {
      if (workspace.selectedItem?.id) {
        updateRouteState({ mediaId: workspace.selectedItem.id }, true);
      }
      return;
    }
    if (workspace.selectedItem?.id === routeState.mediaId) {
      return;
    }
    if (visibleItems.some((item) => item.id === routeState.mediaId)) {
      workspace.setSelectedMediaId(routeState.mediaId);
    }
  }, [
    routeState.mediaId,
    updateRouteState,
    usesRouteState,
    visibleItems,
    workspace.selectedItem?.id,
    workspace.setSelectedMediaId
  ]);

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

  const handleFilterChange = useCallback(
    (fieldId, value) => {
      collectionsDomain.handleCollectionFilterChange(fieldId, value);
      if (!usesRouteState) {
        return;
      }
      updateRouteState(
        {
          [fieldId]: value
        },
        true
      );
    },
    [collectionsDomain, updateRouteState, usesRouteState]
  );

  const handleClearFilters = useCallback(() => {
    collectionsDomain.handleClearCollectionFilters();
    if (!usesRouteState) {
      return;
    }
    updateRouteState(
      {
        search: "",
        status: "",
        category: "",
        isDerived: ""
      },
      true
    );
  }, [collectionsDomain, updateRouteState, usesRouteState]);

  const handleSortChange = useCallback(
    (value) => {
      setLocalSortMode(value);
      if (usesRouteState) {
        updateRouteState(
          {
            mediaSort: value
          },
          true
        );
      }
    },
    [updateRouteState, usesRouteState]
  );

  const handleViewChange = useCallback(
    (value) => {
      setLocalViewMode(value);
      if (usesRouteState) {
        updateRouteState(
          {
            mediaView: value
          },
          true
        );
      }
    },
    [updateRouteState, usesRouteState]
  );

  const handleSelectItem = useCallback(
    (mediaItemId) => {
      workspace.setSelectedMediaId(mediaItemId);
      if (usesRouteState) {
        updateRouteState(
          {
            mediaId: mediaItemId
          },
          true
        );
      }
    },
    [updateRouteState, usesRouteState, workspace]
  );

  const handleCloseEditor = useCallback(() => {
    workspace.setSelectedMediaId("");
    if (!usesRouteState) {
      return;
    }
    updateRouteState(
      {
        mediaId: ""
      },
      true
    );
  }, [updateRouteState, usesRouteState, workspace]);

  const handleOpenReference = useCallback(
    (entry) => {
      if (typeof navigate !== "function" || !entry?.route) {
        return;
      }
      navigate(entry.route, { replace: false });
    },
    [navigate]
  );

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

  function RemoteSyncSection() {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.35}>
              <Typography variant="h6">Remote Sync</Typography>
              <Typography variant="body2" color="text.secondary">
                Curate assets here first. Expand this section only when you need to inspect or drive the secondary remote media sync flow directly from the Media desk.
              </Typography>
            </Stack>
            <Button variant="outlined" onClick={() => setRemoteOpen((value) => !value)}>
              {remoteOpen ? "Hide Remote Sync" : "Show Remote Sync"}
            </Button>
          </Stack>
          {!remoteOpen ? (
            <Alert severity="info">
              Media authoring remains the primary task here. Remote compare, sync, and restore stay available as a secondary control surface.
            </Alert>
          ) : null}
          {remoteOpen ? (
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
          ) : null}
        </Stack>
      </Paper>
    );
  }

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

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" } }}
      >
        <MediaSummaryCard label="Total Assets" value={mediaSummary.total} />
        <MediaSummaryCard
          label="In Use"
          value={mediaSummary.inUse}
          tone={mediaSummary.inUse > 0 ? "attention" : "default"}
        />
        <MediaSummaryCard
          label="Missing Alt"
          value={mediaSummary.missingAlt}
          tone={mediaSummary.missingAlt > 0 ? "attention" : "default"}
        />
        <MediaSummaryCard
          label="Not Synced"
          value={mediaSummary.notSynced}
          tone={mediaSummary.notSynced > 0 ? "attention" : "default"}
        />
        <MediaSummaryCard
          label="Synced"
          value={mediaSummary.synced}
          tone={mediaSummary.synced > 0 ? "attention" : "default"}
        />
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ lg: "center" }}
          >
            <Stack spacing={0.35}>
              <Typography variant="subtitle1">Search And Filter</Typography>
              <Typography variant="body2" color="text.secondary">
                Narrow the library by status, category, asset type, and sort order without losing your selected asset.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {MEDIA_VIEW_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={activeViewMode === option.value ? "contained" : "outlined"}
                  size="small"
                  onClick={() => handleViewChange(option.value)}
                >
                  {option.label} View
                </Button>
              ))}
            </Stack>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
                xl: "minmax(240px, 2fr) repeat(4, minmax(140px, 1fr)) auto"
              },
              gap: 2,
              alignItems: "start"
            }}
          >
          <TextField
            label="Search"
            size="small"
            fullWidth
            value={usesRouteState ? routeState.search : collectionsDomain.collectionFilterState.search ?? ""}
            onChange={(event) => handleFilterChange("search", event.target.value)}
          />
          <TextField
            select
            label="Status"
            size="small"
            fullWidth
            value={usesRouteState ? routeState.status : collectionsDomain.collectionFilterState.status ?? ""}
            onChange={(event) => handleFilterChange("status", event.target.value)}
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
            fullWidth
            value={usesRouteState ? routeState.category : collectionsDomain.collectionFilterState.category ?? ""}
            onChange={(event) => handleFilterChange("category", event.target.value)}
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
            fullWidth
            value={usesRouteState ? routeState.isDerived : collectionsDomain.collectionFilterState.isDerived ?? ""}
            onChange={(event) => handleFilterChange("isDerived", event.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="false">Originals</MenuItem>
            <MenuItem value="true">Derived</MenuItem>
          </TextField>
          <TextField
            select
            label="Sort"
            size="small"
            fullWidth
            value={activeSortMode}
            onChange={(event) => handleSortChange(event.target.value)}
          >
            {MEDIA_SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="text"
            onClick={handleClearFilters}
            sx={{
              minHeight: 40,
              whiteSpace: "nowrap",
              width: { xs: "100%", xl: "auto" },
              gridColumn: { xs: "1 / -1", xl: "auto" }
            }}
          >
            Clear Filters
          </Button>
          </Box>
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
        remoteTarget={remoteMediaTarget}
        procedureState={remoteOpsSupport.procedureState}
        remoteEnabled={Boolean(remoteMediaTarget)}
        remoteBusy={remoteBusy}
      />

      <Box sx={{ minWidth: 0 }}>
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
          ) : activeViewMode === "gallery" ? (
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
              <MediaUploadTile onUpload={() => fileInputRef.current?.click()} />
              {visibleItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  selected={workspace.selectedItem?.id === item.id}
                  checked={selectedMediaIds.includes(item.id)}
                  onSelect={() => handleSelectItem(item.id)}
                  onToggleSelect={() => toggleMediaSelection(item.id)}
                  mediaContentUrlFor={workspace.mediaContentUrlFor}
                  remoteSyncState={resolveMediaCardRemoteSyncState(item, remoteMediaTarget, remoteRuns)}
                  usageSummary={usageAwareness.usageByMediaId.get(item.id) ?? null}
                />
              ))}
            </Box>
          ) : (
            <MediaListView
              items={visibleItems}
              selectedItemId={workspace.selectedItem?.id ?? ""}
              onSelect={handleSelectItem}
              mediaContentUrlFor={workspace.mediaContentUrlFor}
              remoteSyncStateFor={(item) => resolveMediaCardRemoteSyncState(item, remoteMediaTarget, remoteRuns)}
              usageSummaryFor={(item) =>
                usageAwareness.usageByMediaId.get(item.id) ?? {
                  totalReferences: 0
                }
              }
            />
          )}
        </Stack>
      </Box>

      <Drawer
        anchor="right"
        variant="persistent"
        open={Boolean(workspace.selectedItem)}
        onClose={handleCloseEditor}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: 520 },
            maxWidth: "100%"
          }
        }}
      >
        <Stack spacing={2} sx={{ p: 2, height: "100%", overflowY: "auto" }}>
          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                Asset Editor
              </Typography>
              <Typography variant="h5" noWrap>
                {workspace.selectedItem?.displayName ?? "Media Asset"}
              </Typography>
              {workspace.selectedItem ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip size="small" label={workspace.selectedItem.status} />
                  <Chip
                    size="small"
                    label={resolveMediaCardRemoteSyncState(workspace.selectedItem, remoteMediaTarget, remoteRuns).label}
                    color={resolveMediaCardRemoteSyncState(workspace.selectedItem, remoteMediaTarget, remoteRuns).tone === "success" ? "success" : resolveMediaCardRemoteSyncState(workspace.selectedItem, remoteMediaTarget, remoteRuns).tone === "warning" ? "warning" : "default"}
                  />
                  {workspace.selectedItem.isDerived ? <Chip size="small" label="Derived" color="secondary" /> : null}
                </Stack>
              ) : null}
            </Stack>
            <Button variant="text" onClick={handleCloseEditor}>
              Close
            </Button>
          </Stack>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack spacing={0.35}>
                <Typography variant="subtitle1">Create Variants</Typography>
                <Typography variant="body2" color="text.secondary">
                  Generate web-optimized outputs and thumbnails from the current source asset.
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => workspace.handleRunPreset("web-optimized")}
                  disabled={!workspace.selectedItem || workspace.selectedItem.isDerived || workspace.operationState.runningPreset.length > 0}
                >
                  Create Web Optimized
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => workspace.handleRunPreset("thumbnail")}
                  disabled={!workspace.selectedItem || workspace.selectedItem.isDerived || workspace.operationState.runningPreset.length > 0}
                >
                  Create Thumbnail
                </Button>
              </Stack>
              {workspace.operationState.runningPreset ? (
                <Alert severity="info">Starting {workspace.operationState.runningPreset}...</Alert>
              ) : null}
              {workspace.derivedItems.length > 0 ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {workspace.derivedItems.map((item) => (
                    <Chip key={item.id} label={item.displayName} size="small" variant="outlined" color="secondary" />
                  ))}
                </Stack>
              ) : null}
            </Stack>
          </Paper>

          <DeskTabsCard
            value={activeDetailSection}
            onChange={(value) => {
              setLocalDetailSection(value);
              if (usesRouteState) {
                updateRouteState({ mediaTab: value }, true);
              }
            }}
            tabs={MEDIA_DETAIL_TABS}
          />
          {activeDetailSection === "preview" ? (
            <MediaPreview
              item={workspace.selectedItem}
              derivedItems={workspace.derivedItems}
              mediaContentUrlFor={workspace.mediaContentUrlFor}
              remoteSyncState={resolveMediaCardRemoteSyncState(workspace.selectedItem, remoteMediaTarget, remoteRuns)}
            />
          ) : null}
          {activeDetailSection === "details" ? (
            <Stack spacing={2}>
              <MetadataEditor
                metadataState={workspace.metadataState}
                onChangeField={workspace.handleMetadataFieldChange}
                onSave={workspace.handleSaveMetadata}
              />
              <OperationsPanel
                selectedItem={workspace.selectedItem}
                derivedItems={workspace.derivedItems}
                operationState={workspace.operationState}
                onRunPreset={workspace.handleRunPreset}
                onDeleteSelected={workspace.handleDeleteSelected}
              />
            </Stack>
          ) : null}
          {activeDetailSection === "usage" ? (
            <MediaUsagePanel
              item={workspace.selectedItem}
              usageState={usageAwareness.usageState}
              usageSummary={selectedUsage}
              usageEntries={selectedUsage.entries}
              onRefresh={usageAwareness.reload}
              onOpenReference={handleOpenReference}
            />
          ) : null}
          {activeDetailSection === "publish" ? (
            <Stack spacing={2}>
              <MediaRemoteProcedureFeedback
                remoteTarget={remoteMediaTarget}
                procedureState={remoteOpsSupport.procedureState}
              />
              <MediaArtifactLinksPanel
                item={workspace.selectedItem}
                mediaTarget={remoteMediaTarget}
                browserTarget={browserDeliveryTarget}
                deploymentTarget={deploymentTarget}
                mediaContentUrlFor={workspace.mediaContentUrlFor}
              />
              <MediaRemoteOnlyPanel mediaTarget={remoteMediaTarget} />
              <RemoteSyncSection />
            </Stack>
          ) : null}
        </Stack>
      </Drawer>
    </Stack>
  );
}
