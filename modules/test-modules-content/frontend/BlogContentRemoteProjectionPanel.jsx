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

function RemoteProjectionSummary({ latestRun, target }) {
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

export function BlogContentRemoteProjectionPanel({
  latestRun,
  moduleSettingsDomain,
  onCompare,
  onExecute,
  onOpenRemoteOps,
  onSaveSettings,
  onValidate,
  post,
  procedureState,
  selectedTarget,
  targetOptions
}) {
  const settingsState = moduleSettingsDomain?.moduleSettingsState ?? null;
  const selectedTargetId = settingsState?.draftValues?.remoteProjectionTargetProfileId ?? "";
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
            <Typography variant="subtitle1">Remote Projection</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage the Firestore projection that consumers read from. Published posts participate in this flow.
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={onOpenRemoteOps}>
            Open Remote Ops
          </Button>
        </Stack>
        {settingsState?.errorMessage ? <Alert severity="error">{settingsState.errorMessage}</Alert> : null}
        {settingsState?.successMessage ? <Alert severity="success">{settingsState.successMessage}</Alert> : null}
        <TextField
          select
          label="Remote Projection Target"
          value={safeSelectedTargetId}
          onChange={(event) =>
            moduleSettingsDomain?.handleSettingsFieldChange(
              "remoteProjectionTargetProfileId",
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
            {settingsState?.saving ? "Saving..." : "Save Content Settings"}
          </Button>
        </Stack>
        {!selectedTarget ? (
          <Alert severity="info">
            Select and save a Firestore target to compare or sync published content to the remote projection.
          </Alert>
        ) : (
          <>
            <Typography variant="subtitle2">{selectedTarget.title}</Typography>
            <RemoteProjectionSummary target={selectedTarget} latestRun={latestRun} />
            {post?.status !== "published" ? (
              <Alert severity="info">
                The selected post is currently `{post?.status ?? "draft"}`. Only published posts are included in the remote projection.
              </Alert>
            ) : null}
            {procedureState.errorMessage ? <Alert severity="error">{procedureState.errorMessage}</Alert> : null}
            {procedureState.successMessage ? <Alert severity="success">{procedureState.successMessage}</Alert> : null}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button variant="outlined" onClick={onValidate} disabled={isBusy}>
                {isBusy && procedureState.procedureType === "validate" ? "Validating..." : "Validate Target"}
              </Button>
              <Button variant="outlined" onClick={onCompare} disabled={isBusy}>
                {isBusy && procedureState.procedureType === "compare" ? "Comparing..." : "Compare Projection"}
              </Button>
              <Button variant="contained" onClick={onExecute} disabled={isBusy}>
                {isBusy && procedureState.procedureType === "execute" ? "Syncing..." : "Sync Projection"}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
