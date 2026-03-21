import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useMemo } from "react";
import {
  buildMediaArtifactUrls,
  resolveMediaRemoteSyncState,
  summarizeRemoteOnlyArtifacts
} from "./media-manager-remote-state.js";

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

function toneForSyncState(tone) {
  return tone === "success" ? "success" : tone === "warning" ? "warning" : "default";
}

function resolveProcedureLabel(procedureType) {
  if (procedureType === "validate") {
    return "target validation";
  }
  if (procedureType === "compare") {
    return "remote compare";
  }
  if (procedureType === "execute") {
    return "remote sync";
  }
  if (procedureType === "restore") {
    return "local restore";
  }
  return "remote action";
}

export function MediaCard({
  item,
  selected,
  checked,
  onSelect,
  onToggleSelect,
  mediaContentUrlFor,
  remoteSyncState,
  usageSummary = null
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
            overflow: "hidden",
            position: "relative"
          }}
        >
          <Box sx={{ position: "absolute", top: 8, left: 8, zIndex: 1 }}>
            <Checkbox
              checked={checked}
              onChange={(event) => {
                event.stopPropagation();
                onToggleSelect();
              }}
              onClick={(event) => event.stopPropagation()}
              sx={{ bgcolor: "rgba(255,255,255,0.72)", borderRadius: 1 }}
            />
          </Box>
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
              <Chip size="small" label={remoteSyncState.label} color={toneForSyncState(remoteSyncState.tone)} />
              <Chip
                size="small"
                label={
                  usageSummary?.totalReferences
                    ? `${usageSummary.totalReferences} use${usageSummary.totalReferences === 1 ? "" : "s"}`
                    : "Unused"
                }
                color={usageSummary?.totalReferences ? "primary" : "default"}
                variant={usageSummary?.totalReferences ? "filled" : "outlined"}
              />
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

export function MediaUploadTile({ onUpload }) {
  return (
    <Card
      variant="outlined"
      sx={{
        minHeight: 262,
        borderStyle: "dashed",
        borderColor: "divider",
        background: "linear-gradient(135deg, #f5efe5 0%, #ebe0cd 100%)"
      }}
    >
      <CardActionArea
        onClick={onUpload}
        sx={{ height: "100%", display: "flex", alignItems: "stretch", justifyContent: "stretch" }}
      >
        <CardContent sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Stack spacing={1.5} alignItems="center" textAlign="center">
            <Typography variant="overline" color="text.secondary">
              Add To Library
            </Typography>
            <Typography variant="h6">Upload Image</Typography>
            <Typography variant="body2" color="text.secondary">
              Bring a new asset in without leaving the gallery.
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function MediaListView({
  items,
  selectedItemId,
  onSelect,
  mediaContentUrlFor,
  remoteSyncStateFor,
  usageSummaryFor
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 0.8fr) auto",
          gap: 1,
          px: 2,
          py: 1.25,
          bgcolor: "grey.100",
          borderBottom: 1,
          borderColor: "divider"
        }}
      >
        {["Asset", "Category", "Sync", "Usage", "Type", ""].map((label) => (
          <Typography key={label || "action"} variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {label}
          </Typography>
        ))}
      </Box>
      <Stack divider={<Divider />}>
        {items.map((item) => {
          const remoteSyncState = remoteSyncStateFor(item);
          const usageSummary = usageSummaryFor(item);
          const isSelected = selectedItemId === item.id;
          return (
            <Box
              key={item.id}
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 0.8fr) auto",
                gap: 1,
                alignItems: "center",
                px: 2,
                py: 1.25,
                bgcolor: isSelected ? "primary.50" : "background.paper"
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Box
                  component="img"
                  src={mediaContentUrlFor(item.id, item.updatedOn)}
                  alt={item.altText || item.displayName}
                  sx={{ width: 48, height: 48, objectFit: "cover", borderRadius: 1, flexShrink: 0 }}
                />
                <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {item.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {item.width} x {item.height} px
                  </Typography>
                </Stack>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {item.category}
              </Typography>
              <Chip size="small" label={remoteSyncState.label} color={toneForSyncState(remoteSyncState.tone)} />
              <Typography variant="body2" color="text.secondary">
                {usageSummary.totalReferences}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.isDerived ? "Derived" : "Original"}
              </Typography>
              <Button variant={isSelected ? "contained" : "text"} size="small" onClick={() => onSelect(item.id)}>
                {isSelected ? "Open" : "Edit"}
              </Button>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

export function MediaPreview({ item, derivedItems, mediaContentUrlFor, remoteSyncState }) {
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
          <Chip label={remoteSyncState.label} size="small" color={toneForSyncState(remoteSyncState.tone)} />
          {item.isDerived ? <Chip label={`Derived from ${item.sourceMediaId}`} size="small" color="secondary" /> : null}
        </Stack>
        <Typography variant="h6">{item.displayName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {remoteSyncState.detail}
        </Typography>
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

function UsageChip({ label, value, tone = "default" }) {
  return (
    <Chip
      size="small"
      label={`${label} ${value}`}
      color={tone === "attention" ? "warning" : tone === "active" ? "primary" : "default"}
      variant={tone === "active" ? "filled" : "outlined"}
    />
  );
}

export function MediaUsagePanel({
  item,
  usageState,
  usageSummary,
  usageEntries,
  onRefresh,
  onOpenReference
}) {
  if (!item) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Stack spacing={0.35}>
            <Typography variant="subtitle1">Usage</Typography>
            <Typography variant="body2" color="text.secondary">
              See where the current asset appears across authors, posts, taxonomies, and pages.
            </Typography>
          </Stack>
          <Button variant="outlined" size="small" onClick={onRefresh} disabled={usageState.loading}>
            {usageState.loading ? "Refreshing..." : "Refresh Usage"}
          </Button>
        </Stack>

        {usageState.errorMessage ? <Alert severity="error">{usageState.errorMessage}</Alert> : null}

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <UsageChip label="Total" value={usageSummary.totalReferences} tone={usageSummary.totalReferences > 0 ? "active" : "default"} />
          <UsageChip label="Posts" value={usageSummary.postCount} tone={usageSummary.postCount > 0 ? "active" : "default"} />
          <UsageChip label="Authors" value={usageSummary.authorCount} tone={usageSummary.authorCount > 0 ? "active" : "default"} />
          <UsageChip label="Categories" value={usageSummary.categoryCount} tone={usageSummary.categoryCount > 0 ? "active" : "default"} />
          <UsageChip label="Pages" value={usageSummary.pageCount} tone={usageSummary.pageCount > 0 ? "active" : "default"} />
        </Stack>

        {usageEntries.length === 0 ? (
          <Alert severity="info">
            This asset is not referenced by the main authored records yet.
          </Alert>
        ) : (
          <Stack spacing={1}>
            {usageEntries.map((entry, index) => (
              <Paper key={`${entry.kind}-${entry.slot}-${entry.label}-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
                  <Stack spacing={0.35}>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                      <Typography variant="subtitle2">{entry.label}</Typography>
                      <Chip size="small" label={entry.kind} variant="outlined" />
                      <Chip size="small" label={entry.slot} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Open the related desk to inspect or change this reference.
                    </Typography>
                  </Stack>
                  <Button variant="text" onClick={() => onOpenReference(entry)}>
                    Open
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

export function MediaRemoteProcedureFeedback({ remoteTarget, procedureState }) {
  const targetStatus = typeof remoteTarget?.targetStatus === "string" ? remoteTarget.targetStatus : "";
  const targetLabel = remoteTarget?.title ?? "remote media target";

  if (!remoteTarget) {
    return (
      <Alert severity="info">
        Choose a media target in Publish before running compare or sync from this desk.
      </Alert>
    );
  }

  if (procedureState.processing && procedureState.targetId === remoteTarget.id) {
    return (
      <Alert severity="info">
        Running {resolveProcedureLabel(procedureState.procedureType)} for {targetLabel}.
      </Alert>
    );
  }

  if (procedureState.errorMessage && procedureState.targetId === remoteTarget.id) {
    return <Alert severity="error">{procedureState.errorMessage}</Alert>;
  }

  if (procedureState.successMessage && procedureState.targetId === remoteTarget.id) {
    return <Alert severity="success">{procedureState.successMessage}</Alert>;
  }

  if (targetStatus.length > 0 && targetStatus !== "validated") {
    return (
      <Alert severity="warning">
        {targetLabel} is currently {targetStatus}. Validate it before relying on sync results.
      </Alert>
    );
  }

  return (
    <Alert severity="success">
      {targetLabel} is connected and ready for compare or sync.
    </Alert>
  );
}

export function MetadataEditor({
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

export function OperationsPanel({
  selectedItem,
  derivedItems = [],
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
        <Stack spacing={0.35}>
          <Typography variant="subtitle1">Create Variants And Actions</Typography>
          <Typography variant="body2" color="text.secondary">
            Create derived assets such as a web-optimized image or thumbnail without leaving the current asset.
          </Typography>
        </Stack>
        {operationState.errorMessage ? (
          <Alert severity="error">{operationState.errorMessage}</Alert>
        ) : null}
        {selectedItem?.isDerived ? (
          <Alert severity="info">
            Derived assets cannot generate more variants. Open the original asset to create new outputs.
          </Alert>
        ) : null}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onRunPreset("web-optimized")}
            disabled={!selectedItem || selectedItem.isDerived || operationState.runningPreset.length > 0}
          >
            Create Web Optimized
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onRunPreset("thumbnail")}
            disabled={!selectedItem || selectedItem.isDerived || operationState.runningPreset.length > 0}
          >
            Create Thumbnail
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
            <Typography variant="body2">
              Starting {operationState.runningPreset}...
            </Typography>
          </Stack>
        ) : null}
        {derivedItems.length > 0 ? (
          <Stack spacing={1}>
            <Typography variant="subtitle2">Derived Assets</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {derivedItems.map((item) => (
                <Chip key={item.id} size="small" label={item.displayName} variant="outlined" color="secondary" />
              ))}
            </Stack>
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

export function MediaBulkSelectionPanel({
  selectedCount,
  visibleCount,
  onSelectVisible,
  onClearSelection,
  onDeleteSelected,
  onCompareRemote,
  onSyncRemote,
  remoteTarget,
  procedureState,
  remoteEnabled,
  remoteBusy
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Stack spacing={0.35}>
            <Typography variant="subtitle1">Selection And Bulk Actions</Typography>
            <Typography variant="body2" color="text.secondary">
              Multi-select is local to this desk. Remote sync remains target-wide and uses the current selection as a review set, not as a remote execution scope.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" variant="outlined" label={`Visible ${visibleCount}`} />
            <Chip size="small" variant="outlined" label={`Selected ${selectedCount}`} />
          </Stack>
        </Stack>
        <MediaRemoteProcedureFeedback remoteTarget={remoteTarget} procedureState={procedureState} />
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button variant="outlined" size="small" onClick={onSelectVisible} disabled={visibleCount === 0}>
            Select Visible
          </Button>
          <Button variant="outlined" size="small" onClick={onClearSelection} disabled={selectedCount === 0}>
            Clear Selection
          </Button>
          <Button variant="text" size="small" color="error" onClick={onDeleteSelected} disabled={selectedCount === 0}>
            Delete Selected
          </Button>
          <Button variant="outlined" size="small" onClick={onCompareRemote} disabled={!remoteEnabled || remoteBusy}>
            Compare Remote Target
          </Button>
          <Button variant="contained" size="small" onClick={onSyncRemote} disabled={!remoteEnabled || remoteBusy}>
            Sync Remote Target
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function MediaArtifactLinksPanel({
  item,
  mediaTarget,
  browserTarget,
  deploymentTarget,
  mediaContentUrlFor
}) {
  if (!item) {
    return null;
  }

  const artifactUrls = buildMediaArtifactUrls({
    item,
    mediaTarget,
    browserTarget,
    deploymentTarget,
    localUrl: mediaContentUrlFor(item.id, item.updatedOn)
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle1">Artifact Links</Typography>
        <Typography variant="body2" color="text.secondary">
          Local and remote paths for the selected media item.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Local file URL: {artifactUrls.localUrl}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Temporary remote URL: {artifactUrls.temporaryRemoteUrl ?? "Not available"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Public media URL: {artifactUrls.publicMediaUrl ?? "Not available"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Remote object key: {artifactUrls.remoteObjectKey ?? "Not available"}
        </Typography>
      </Stack>
    </Paper>
  );
}

export function MediaRemoteOnlyPanel({ mediaTarget }) {
  const { remoteOnlyCount, sampleKeys } = summarizeRemoteOnlyArtifacts(mediaTarget);
  if (!mediaTarget) {
    return null;
  }
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="subtitle1">Remote-Only Visibility</Typography>
          <Chip size="small" variant="outlined" label={`Remote only ${remoteOnlyCount}`} />
        </Stack>
        {remoteOnlyCount === 0 ? (
          <Typography variant="body2" color="text.secondary">
            The latest compare summary does not report remote-only artifacts for this media target.
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              These object keys exist remotely but do not currently map to local media items in this desk.
            </Typography>
            <Stack spacing={0.35}>
              {sampleKeys.map((sampleKey) => (
                <Typography key={sampleKey} variant="caption" color="text.secondary">
                  {sampleKey}
                </Typography>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}

export function resolveMediaCardRemoteSyncState(item, remoteMediaTarget, runs) {
  return resolveMediaRemoteSyncState({
    item,
    mediaTarget: remoteMediaTarget,
    runs
  });
}
