import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useMemo, useRef } from "react";
import { useMediaManagerWorkspace } from "./useMediaManagerWorkspace.js";
import { MediaManagerRemotePanel } from "./MediaManagerRemotePanel.jsx";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";

const USAGE_LABEL_OPTIONS = [
  "editorial",
  "marketing",
  "reference",
  "hero",
  "thumbnail"
];

function resolveMimeLabel(item) {
  const mimeType = typeof item?.mimeType === "string" ? item.mimeType : "";
  if (mimeType.startsWith("image/")) {
    return mimeType.replace("image/", "");
  }

  return mimeType || "unknown";
}

function MediaCard({
  item,
  selected,
  onSelect,
  mediaContentUrlFor
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? "primary.50" : "background.paper"
      }}
    >
      <CardActionArea onClick={onSelect}>
        <Box
          sx={{
            height: 168,
            background: "linear-gradient(135deg, #f3efe8 0%, #ddd6c8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}
        >
          <Box
            component="img"
            src={mediaContentUrlFor(item.id, item.updatedOn)}
            alt={item.altText || item.displayName}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        </Box>
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" label={item.status} color={item.status === "failed" ? "error" : "default"} />
              {item.isDerived ? <Chip size="small" label="Derived" color="secondary" /> : null}
              <Chip size="small" label={resolveMimeLabel(item)} />
            </Stack>
            <Typography variant="subtitle2">{item.displayName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {item.width} x {item.height} px
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function MediaPreview({ item, derivedItems, mediaContentUrlFor }) {
  if (!item) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6">No media selected</Typography>
        <Typography variant="body2" color="text.secondary">
          Upload an asset or select one from the gallery.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          height: 280,
          background: "radial-gradient(circle at top, #f5efe4 0%, #dcd0bf 100%)"
        }}
      >
        <Box
          component="img"
          src={mediaContentUrlFor(item.id, item.updatedOn)}
          alt={item.altText || item.displayName}
          sx={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </Box>
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={item.status} size="small" color={item.status === "failed" ? "error" : "default"} />
          <Chip label={item.category} size="small" />
          <Chip label={`${Math.round(item.fileSizeBytes / 1024)} KB`} size="small" />
          {item.isDerived ? <Chip label={`Derived from ${item.sourceMediaId}`} size="small" color="secondary" /> : null}
        </Stack>
        <Typography variant="h6">{item.displayName}</Typography>
        {item.description ? (
          <Typography variant="body2" color="text.secondary">
            {item.description}
          </Typography>
        ) : null}
        {derivedItems.length > 0 ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2">Derived Variants</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {derivedItems.map((derivedItem) => (
                <Chip key={derivedItem.id} label={derivedItem.displayName} size="small" variant="outlined" />
              ))}
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function MetadataEditor({
  metadataState,
  onChangeField,
  onSave
}) {
  const selectedUsageLabels = metadataState.draft.usageLabels ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1">Metadata</Typography>
          <Button variant="contained" size="small" onClick={onSave} disabled={metadataState.saving}>
            {metadataState.saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
        {metadataState.errorMessage ? (
          <Alert severity="error">{metadataState.errorMessage}</Alert>
        ) : null}
        <TextField
          label="Display name"
          value={metadataState.draft.displayName}
          onChange={(event) => onChangeField("displayName", event.target.value)}
          size="small"
        />
        <TextField
          label="Alt text"
          value={metadataState.draft.altText}
          onChange={(event) => onChangeField("altText", event.target.value)}
          size="small"
        />
        <TextField
          label="Description"
          value={metadataState.draft.description}
          onChange={(event) => onChangeField("description", event.target.value)}
          size="small"
          multiline
          minRows={3}
        />
        <TextField
          select
          label="Category"
          value={metadataState.draft.category}
          onChange={(event) => onChangeField("category", event.target.value)}
          size="small"
        >
          {["library", "campaign", "product", "social"].map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Usage labels
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {USAGE_LABEL_OPTIONS.map((option) => {
              const selected = selectedUsageLabels.includes(option);
              return (
                <Chip
                  key={option}
                  label={option}
                  size="small"
                  color={selected ? "primary" : "default"}
                  variant={selected ? "filled" : "outlined"}
                  onClick={() =>
                    onChangeField(
                      "usageLabels",
                      selected
                        ? selectedUsageLabels.filter((value) => value !== option)
                        : [...selectedUsageLabels, option]
                    )
                  }
                />
              );
            })}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

function OperationsPanel({
  selectedItem,
  operationState,
  onRunPreset,
  onDeleteSelected
}) {
  const jobRows = useMemo(
    () =>
      [...operationState.jobs].sort((left, right) =>
        (right.createdAt ?? "").localeCompare(left.createdAt ?? "")
      ),
    [operationState.jobs]
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1">Operations</Typography>
        {operationState.errorMessage ? (
          <Alert severity="error">{operationState.errorMessage}</Alert>
        ) : null}
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onRunPreset("web-optimized")}
            disabled={!selectedItem || selectedItem.isDerived || operationState.runningPreset.length > 0}
          >
            Web Optimized
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onRunPreset("thumbnail")}
            disabled={!selectedItem || selectedItem.isDerived || operationState.runningPreset.length > 0}
          >
            Thumbnail
          </Button>
          <Button
            color="error"
            variant="text"
            size="small"
            onClick={onDeleteSelected}
            disabled={!selectedItem}
          >
            Delete
          </Button>
        </Stack>
        {operationState.runningPreset ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={16} />
            <Typography variant="body2">
              Starting {operationState.runningPreset}...
            </Typography>
          </Stack>
        ) : null}
        <Divider />
        <Stack spacing={1}>
          <Typography variant="subtitle2">Recent jobs</Typography>
          {jobRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No jobs recorded for the selected asset yet.
            </Typography>
          ) : (
            jobRows.map((job) => (
              <Paper key={job.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">{job.id}</Typography>
                  <Chip size="small" label={job.status} color={job.status === "failed" ? "error" : "default"} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {job.payload?.preset ?? "unknown"} • {job.createdAt}
                </Typography>
              </Paper>
            ))
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export function MediaManagerView({
  activeModuleLabel,
  collectionsDomain,
  moduleSettingsDomain = null,
  navigate = null
}) {
  const fileInputRef = useRef(null);
  const workspace = useMediaManagerWorkspace({
    collectionsDomain
  });
  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const remoteMediaTargetId =
    moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteMediaTargetProfileId ?? "";
  const remoteMediaTargets = remoteOpsSupport.getTargetsByKind("media-storage");
  const remoteMediaTarget = remoteOpsSupport.getTargetById(remoteMediaTargetId);
  const remoteMediaLatestRun = remoteOpsSupport.getLatestRunForTarget(remoteMediaTargetId);

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
              Upload images, curate metadata, and generate derived assets without leaving the module.
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
          <Button variant="text" onClick={collectionsDomain.handleClearCollectionFilters}>
            Clear Filters
          </Button>
        </Stack>
      </Paper>

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
          {workspace.items.length === 0 ? (
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
              {workspace.items.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  selected={workspace.selectedItem?.id === item.id}
                  onSelect={() => workspace.setSelectedMediaId(item.id)}
                  mediaContentUrlFor={workspace.mediaContentUrlFor}
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
