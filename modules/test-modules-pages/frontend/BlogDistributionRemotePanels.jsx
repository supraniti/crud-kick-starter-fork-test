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

function RemoteSummaryChips({ target, latestRun }) {
  if (!target) {
    return null;
  }

  const compareSummary = target.compareSummary ?? {};
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      <Chip size="small" label={target.adapterMode ?? "unknown"} variant="outlined" />
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

export function PagesRemoteSettingsPanel({
  appMountTagName,
  browserTargets,
  deploymentTargets,
  onChangeField,
  onSave,
  saveDisabled = false,
  settingsState
}) {
  const deploymentTargetId = settingsState?.draftValues?.remoteDeploymentTargetProfileId ?? "";
  const browserTargetId = settingsState?.draftValues?.remoteBrowserDeliveryTargetProfileId ?? "";
  const safeDeploymentTargetId = deploymentTargets.some((target) => target.id === deploymentTargetId)
    ? deploymentTargetId
    : "";
  const safeBrowserTargetId = browserTargets.some((target) => target.id === browserTargetId)
    ? browserTargetId
    : "";
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6">Pages Runtime Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Select the module-level default remote targets that Pages should use when a page does not define its own remote bindings.
          </Typography>
        </Stack>
        {settingsState?.errorMessage ? <Alert severity="error">{settingsState.errorMessage}</Alert> : null}
        {settingsState?.successMessage ? <Alert severity="success">{settingsState.successMessage}</Alert> : null}
        <TextField
          label="App Mount Tag Name"
          value={appMountTagName}
          onChange={(event) => onChangeField("appMountTagName", event.target.value)}
        />
        <TextField
          select
          label="Remote Deployment Target"
          value={safeDeploymentTargetId}
          onChange={(event) => onChangeField("remoteDeploymentTargetProfileId", event.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          {deploymentTargets.map((target) => (
            <MenuItem key={target.id} value={target.id}>
              {target.title}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Remote Browser Delivery Target"
          value={safeBrowserTargetId}
          onChange={(event) => onChangeField("remoteBrowserDeliveryTargetProfileId", event.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          {browserTargets.map((target) => (
            <MenuItem key={target.id} value={target.id}>
              {target.title}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" onClick={onSave} disabled={saveDisabled}>
            {settingsState?.saving ? "Saving..." : "Save settings"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function PagesRemoteDeploymentPanel({
  bindingSourceLabel = "Pages module default",
  latestRun,
  onCompare,
  onExecute,
  onOpenRemoteOps,
  onValidate,
  page,
  procedureState,
  selectedTarget
}) {
  const isBusy =
    procedureState.processing &&
    procedureState.targetId === selectedTarget?.id;

  if (!selectedTarget) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Remote Deployment</Typography>
          <Alert severity="info">
            Save a remote deployment target in Pages settings to compare and sync the local
            `deployment/` folder to cloud storage.
          </Alert>
          <Stack direction="row" justifyContent="flex-end">
            <Button variant="outlined" onClick={onOpenRemoteOps}>
              Open Remotes
            </Button>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h6">Remote Deployment</Typography>
            <Typography variant="body2" color="text.secondary">
              {page?.title
                ? `This remote target publishes the local deployment output that includes '${page.title}'.`
                : "This target syncs the local deployment output to remote storage."}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Binding source: {bindingSourceLabel}
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={onOpenRemoteOps}>
            Open Remotes
          </Button>
        </Stack>
        <Typography variant="subtitle2">{selectedTarget.title}</Typography>
        <RemoteSummaryChips target={selectedTarget} latestRun={latestRun} />
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
            {isBusy && procedureState.procedureType === "execute" ? "Syncing..." : "Sync Remote Deployment"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function PagesBrowserDeliveryPanel({
  bindingSourceLabel = "Pages module default",
  latestRun,
  onOpenRemoteOps,
  onValidate,
  procedureState,
  selectedTarget
}) {
  const isBusy =
    procedureState.processing &&
    procedureState.targetId === selectedTarget?.id;

  if (!selectedTarget) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Browser Delivery Validation</Typography>
          <Alert severity="info">
            Select a browser-delivery target in Pages settings if you want Pages to surface CDN/domain validation in-context.
          </Alert>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h6">Browser Delivery Validation</Typography>
            <Typography variant="body2" color="text.secondary">
              Browser delivery remains validation-only in this slice. Use this target to confirm domain and certificate readiness.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Binding source: {bindingSourceLabel}
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={onOpenRemoteOps}>
            Open Remotes
          </Button>
        </Stack>
        <Typography variant="subtitle2">{selectedTarget.title}</Typography>
        <RemoteSummaryChips target={selectedTarget} latestRun={latestRun} />
        {procedureState.errorMessage ? <Alert severity="error">{procedureState.errorMessage}</Alert> : null}
        {procedureState.successMessage ? <Alert severity="success">{procedureState.successMessage}</Alert> : null}
        <Stack direction="row" justifyContent="flex-start">
          <Button variant="outlined" onClick={onValidate} disabled={isBusy}>
            {isBusy && procedureState.procedureType === "validate" ? "Validating..." : "Validate Browser Delivery"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
