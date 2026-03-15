import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";

function RemoteMediaSummary({ latestRun, target }) {
  if (!target) {
    return null;
  }
  const compareSummary = target.compareSummary ?? {};
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      <Chip size="small" label={target.targetStatus ?? "draft"} />
      <Chip
        size="small"
        label={`${compareSummary.createCount ?? 0} create · ${compareSummary.updateCount ?? 0} update · ${compareSummary.deleteCount ?? 0} delete`}
        variant="outlined"
      />
      <Chip
        size="small"
        label={`${compareSummary.localOnlyCount ?? 0} local-only · ${compareSummary.remoteOnlyCount ?? 0} remote-only`}
        variant="outlined"
      />
      {latestRun?.procedureType ? (
        <Chip
          size="small"
          label={`Last ${latestRun.procedureType} ${latestRun.status ?? "unknown"}`}
          variant="outlined"
        />
      ) : null}
    </Stack>
  );
}

export function MediaManagerRemotePanel({
  latestRun,
  moduleSettingsDomain,
  onCompare,
  onExecute,
  onOpenRemoteOps,
  onRestore,
  onSaveSettings,
  onValidate,
  procedureState,
  selectedTarget,
  targetOptions
}) {
  const settingsState = moduleSettingsDomain?.moduleSettingsState ?? null;
  const selectedTargetId = settingsState?.draftValues?.remoteMediaTargetProfileId ?? "";
  const safeSelectedTargetId = targetOptions.some((target) => target.id === selectedTargetId)
    ? selectedTargetId
    : "";
  const isBusy =
    procedureState.processing &&
    procedureState.targetId === selectedTarget?.id;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">Remote Media Sync</Typography>
            <Typography variant="body2" color="text.secondary">
              Compare the local media library with the selected remote storage target, sync changes, or restore a missing local file from remote.
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={onOpenRemoteOps}>
            Open Remotes
          </Button>
        </Stack>
        {settingsState?.errorMessage ? <Alert severity="error">{settingsState.errorMessage}</Alert> : null}
        {settingsState?.successMessage ? <Alert severity="success">{settingsState.successMessage}</Alert> : null}
        <TextField
          select
          label="Remote Media Target"
          value={safeSelectedTargetId}
          onChange={(event) =>
            moduleSettingsDomain?.handleSettingsFieldChange(
              "remoteMediaTargetProfileId",
              event.target.value
            )
          }
        >
          <MenuItem value="">None</MenuItem>
          {targetOptions.map((target) => (
            <MenuItem key={target.id} value={target.id}>
              {target.title}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={onSaveSettings}
            disabled={!moduleSettingsDomain || settingsState?.saving}
          >
            {settingsState?.saving ? "Saving..." : "Save Media Settings"}
          </Button>
        </Stack>
        {!selectedTarget ? (
          <Alert severity="info">
            Select and save a media-storage target to manage remote media from this desk.
          </Alert>
        ) : (
          <>
            <Typography variant="subtitle2">{selectedTarget.title}</Typography>
            <RemoteMediaSummary target={selectedTarget} latestRun={latestRun} />
            {procedureState.errorMessage ? <Alert severity="error">{procedureState.errorMessage}</Alert> : null}
            {procedureState.successMessage ? <Alert severity="success">{procedureState.successMessage}</Alert> : null}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button variant="outlined" onClick={onValidate} disabled={isBusy}>
                {isBusy && procedureState.procedureType === "validate" ? "Validating..." : "Validate Target"}
              </Button>
              <Button variant="outlined" onClick={onCompare} disabled={isBusy}>
                {isBusy && procedureState.procedureType === "compare" ? "Comparing..." : "Compare Remote"}
              </Button>
              <Button variant="contained" onClick={onExecute} disabled={isBusy}>
                {isBusy && procedureState.procedureType === "execute" ? "Syncing..." : "Sync Remote Media"}
              </Button>
              <Button variant="outlined" color="warning" onClick={onRestore} disabled={isBusy}>
                {isBusy && procedureState.procedureType === "restore" ? "Restoring..." : "Restore Missing Local File"}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
