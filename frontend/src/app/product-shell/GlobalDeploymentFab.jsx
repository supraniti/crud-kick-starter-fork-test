import {
  Alert,
  Box,
  Button,
  Divider,
  Fab,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { useMemo, useState } from "react";

function resolveResultTone(status) {
  if (status === "success") {
    return "success.main";
  }
  if (status === "error") {
    return "error.main";
  }
  return "text.primary";
}

function resolveRunModeLabel(mode) {
  if (mode === "all") {
    return "Sync All";
  }
  if (mode === "bundle") {
    return "Sync Bundle";
  }
  return "Deployment Sync";
}

function resolveFabLabel(commandCenter) {
  if (commandCenter.runState.processing) {
    const activeCount = Math.min(
      commandCenter.runState.totalCount || 0,
      (commandCenter.runState.completedCount || 0) + 1
    );
    return `Sync ${activeCount}/${commandCenter.runState.totalCount || 0}`;
  }
  if (commandCenter.state.loading) {
    return "Loading Sync";
  }
  return "Sync";
}

function ProgressPanel({ runState, onHide, onOpenDeployments }) {
  const completedSummary = useMemo(
    () =>
      runState.processing
        ? `${Math.min(runState.totalCount || 0, (runState.completedCount || 0) + 1)}/${runState.totalCount || 0}`
        : `${runState.completedCount}/${runState.totalCount || 0}`,
    [runState.completedCount, runState.processing, runState.totalCount]
  );
  const progressLabel = runState.processing
    ? runState.currentLabel
    : runState.errorMessage
      ? runState.currentLabel || "Sync failed."
      : runState.successMessage
        ? "Sync finished."
        : runState.currentLabel;

  return (
    <Paper
      elevation={12}
      sx={{
        position: "fixed",
        right: 24,
        bottom: 88,
        width: { xs: "calc(100vw - 32px)", sm: 400 },
        maxWidth: "calc(100vw - 32px)",
        zIndex: (theme) => theme.zIndex.modal + 1,
        p: 2
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">{resolveRunModeLabel(runState.mode)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {runState.processing
                ? "Sync runs in the background. You can keep working while this stays open or hidden."
                : "The latest sync result stays here until you hide it."}
            </Typography>
          </Stack>
          <Button size="small" onClick={onHide}>
            {runState.processing ? "Hide" : "Close"}
          </Button>
        </Stack>

        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {runState.processing
                ? `Syncing ${runState.activeBundleTitle || "deployment bundle"}`
                : "Deployment progress"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {completedSummary}
            </Typography>
          </Stack>
          <LinearProgress
            variant={runState.processing ? "indeterminate" : "determinate"}
            value={runState.progressPercent}
          />
          {progressLabel ? (
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                {progressLabel}
              </Typography>
              {runState.processing && runState.activeStepCount > 0 ? (
                <Typography variant="caption" color="text.secondary">
                  {`Step ${runState.activeStepIndex}/${runState.activeStepCount}${runState.activeStepLabel ? ` · ${runState.activeStepLabel}` : ""}`}
                </Typography>
              ) : null}
            </Stack>
          ) : null}
        </Stack>

        {runState.errorMessage ? (
          <Alert severity="error">
            <Stack spacing={0.5}>
              <Typography variant="body2">{runState.errorMessage}</Typography>
              {runState.guidance ? <Typography variant="caption">{runState.guidance}</Typography> : null}
            </Stack>
          </Alert>
        ) : null}

        {runState.successMessage ? <Alert severity="success">{runState.successMessage}</Alert> : null}

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Bundle Results
          </Typography>
          <List dense disablePadding sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
            {runState.bundleResults.length === 0 ? (
              <ListItem>
                <ListItemText primary="No bundle results yet." />
              </ListItem>
            ) : (
              runState.bundleResults.map((result, index) => (
                <Box key={`${result.bundleId}-${index}`}>
                  {index > 0 ? <Divider /> : null}
                  <ListItem>
                    <ListItemText
                      primary={result.title}
                      secondary={result.message}
                      primaryTypographyProps={{
                        sx: { color: resolveResultTone(result.status), fontWeight: 600 }
                      }}
                    />
                  </ListItem>
                </Box>
              ))
            )}
          </List>
        </Box>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onOpenDeployments}>Open Deployments</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function BundleMenuItem({ bundle, onSelect }) {
  const disabled = !bundle.syncState?.canRun || !bundle.syncState?.needsSync;
  const labelPrefix = disabled
    ? bundle.syncState?.label === "Current"
      ? "Already Synced"
      : bundle.syncState?.label ?? "Unavailable"
    : "Sync";

  return (
    <MenuItem onClick={() => onSelect(bundle.id)} disabled={disabled}>
      <ListItemText
        primary={`${labelPrefix} ${bundle.title}`}
        secondary={bundle.syncState?.detail ?? ""}
      />
    </MenuItem>
  );
}

export function GlobalDeploymentFab({ commandCenter, onOpenDeployments }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const handleOpenMenu = (event) => {
    if (commandCenter.runState.processing || commandCenter.runState.open) {
      commandCenter.openRunState();
      return;
    }
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSyncAll = async () => {
    handleCloseMenu();
    await commandCenter.runSyncAll();
  };

  const handleSyncBundle = async (bundleId) => {
    handleCloseMenu();
    await commandCenter.runSyncBundle(bundleId);
  };

  const allCurrent = !commandCenter.bundleSyncState.canSyncAny && commandCenter.bundleOptions.length > 0;
  const showReopenButton =
    !commandCenter.runState.open &&
    (commandCenter.runState.processing ||
      Boolean(commandCenter.runState.successMessage) ||
      Boolean(commandCenter.runState.errorMessage));
  const reopenLabel = commandCenter.runState.processing
    ? commandCenter.runState.activeBundleTitle
      ? `Syncing ${commandCenter.runState.activeBundleTitle}`
      : "Sync in progress"
    : commandCenter.runState.errorMessage
      ? "Sync failed"
      : "Sync finished";

  return (
    <>
      {showReopenButton ? (
        <Button
          variant="contained"
          color={commandCenter.runState.errorMessage ? "error" : "inherit"}
          onClick={commandCenter.openRunState}
          sx={{
            position: "fixed",
            right: 24,
            bottom: 88,
            zIndex: (theme) => theme.zIndex.modal + 1,
            boxShadow: 4
          }}
        >
          {reopenLabel}
        </Button>
      ) : null}

      <Fab
        color="primary"
        variant="extended"
        onClick={handleOpenMenu}
        disabled={commandCenter.state.loading}
        sx={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: (theme) => theme.zIndex.modal + 1
        }}
      >
        <Box component="span" sx={{ mr: 1, fontWeight: 700 }}>
          ▲
        </Box>
        {resolveFabLabel(commandCenter)}
      </Fab>

      <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleCloseMenu}>
        <MenuItem
          onClick={handleSyncAll}
          disabled={
            commandCenter.bundleOptions.length === 0 ||
            commandCenter.runState.processing ||
            allCurrent
          }
        >
          <ListItemText
            primary={allCurrent ? "Everything Already Synced" : "Sync All"}
            secondary={
              allCurrent
                ? "No bundle currently reports outstanding deployment work."
                : "Run every bundle that still has local changes."
            }
          />
        </MenuItem>
        <Divider />
        {commandCenter.bundleOptions.length === 0 ? (
          <MenuItem disabled>No release bundles yet</MenuItem>
        ) : (
          commandCenter.bundleOptions.map((bundle) => (
            <BundleMenuItem key={bundle.id} bundle={bundle} onSelect={(bundleId) => void handleSyncBundle(bundleId)} />
          ))
        )}
      </Menu>

      {commandCenter.runState.open ? (
        <ProgressPanel
          runState={commandCenter.runState}
          onHide={commandCenter.closeRunState}
          onOpenDeployments={onOpenDeployments}
        />
      ) : null}
    </>
  );
}
