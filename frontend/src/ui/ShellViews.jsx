import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";

function resolveModuleGlyph(icon) {
  const normalized = typeof icon === "string" ? icon.trim() : "";
  if (normalized === "settings") {
    return "⚙";
  }
  if (normalized === "cloud_sync") {
    return "☁";
  }
  if (normalized === "public") {
    return "◎";
  }
  if (normalized === "perm_media") {
    return "▣";
  }
  if (normalized === "account_tree") {
    return "⎇";
  }
  if (normalized === "article") {
    return "▤";
  }
  if (normalized === "group") {
    return "◍";
  }
  if (normalized === "forum") {
    return "◌";
  }
  if (normalized === "dashboard_customize") {
    return "▥";
  }
  if (normalized === "web") {
    return "◫";
  }
  if (normalized === "rocket_launch") {
    return "▲";
  }
  return "•";
}

function getDeploySeverity(deploy) {
  if (deploy?.deployRequired) {
    return "warning";
  }

  return "success";
}

function getDeployStatusLabel(deploy) {
  if (deploy?.deployRequired) {
    return "Deploy required";
  }

  return "Deployed";
}

function getJobStatusSeverity(status) {
  if (status === "failed") {
    return "error";
  }

  if (status === "running" || status === "queued") {
    return "warning";
  }

  if (status === "cancelled") {
    return "info";
  }

  return "success";
}

function StatusChip({ mode }) {
  if (mode === "connected") {
    return <Chip color="success" label="API connected" size="small" />;
  }

  if (mode === "disconnected") {
    return <Chip color="error" label="API disconnected" size="small" />;
  }

  return <Chip color="warning" label="API checking" size="small" />;
}

function DeployPanel({
  state,
  remotes,
  selectedRemoteId,
  onSelectRemote,
  onOpenRemotes,
  onDeployNow
}) {
  const deploy = state.deploy;
  const latestJob = state.latestJob;
  const selectedRemote = remotes.find((item) => item.id === selectedRemoteId) ?? null;

  return (
    <Paper variant="outlined" sx={{ mb: 1.5, p: 1.25 }}>
      <Stack spacing={1}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2">Release state</Typography>
            <Chip
              size="small"
              color={getDeploySeverity(deploy)}
              label={getDeployStatusLabel(deploy)}
            />
          </Stack>
          <Button
            size="small"
            variant="contained"
            onClick={onDeployNow}
            disabled={
              state.starting ||
              !deploy?.deployRequired ||
              !selectedRemote ||
              selectedRemote.enabled !== true
            }
          >
            {state.starting ? "Deploying..." : "Deploy now"}
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Revision {deploy?.currentRevision ?? 0} / deployed {deploy?.deployedRevision ?? 0}
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="deploy-remote-select-label">Deploy target</InputLabel>
            <Select
              id="deploy-remote-select-input"
              labelId="deploy-remote-select-label"
              label="Deploy target"
              value={selectedRemoteId}
              onChange={(event) => onSelectRemote(event.target.value)}
              inputProps={{
                id: "deploy-remote-select-input",
                name: "deployTarget"
              }}
            >
              {remotes.map((remote) => (
                <MenuItem key={remote.id} value={remote.id}>
                  {remote.label} ({remote.kind}) {remote.enabled ? "" : "[disabled]"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="text" size="small" onClick={onOpenRemotes}>
            Manage remotes
          </Button>
        </Stack>

        {state.errorMessage ? <Alert severity="error">{state.errorMessage}</Alert> : null}
        {!selectedRemote ? (
          <Alert severity="warning">Select a deploy target remote.</Alert>
        ) : null}
        {selectedRemote && !selectedRemote.enabled ? (
          <Alert severity="warning">
            Selected remote is disabled. Choose another remote or enable it.
          </Alert>
        ) : null}

        {latestJob ? (
          <Alert severity={getJobStatusSeverity(latestJob.status)}>
            <Stack spacing={0.5}>
              <Typography variant="body2">
                Job {latestJob.id}: {latestJob.status}
              </Typography>
              <Typography variant="caption">
                Target:{" "}
                {latestJob.result?.remote?.label ??
                  latestJob.result?.remote?.id ??
                  latestJob.payload?.remote?.id ??
                  latestJob.payload?.remoteId ??
                  "-"}
              </Typography>
              {(latestJob.logs ?? []).slice(-3).map((entry) => (
                <Typography key={`${latestJob.id}-${entry.timestamp}-${entry.message}`} variant="caption">
                  [{entry.level}] {entry.message}
                </Typography>
              ))}
            </Stack>
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}

function LoginView({ onSignIn }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "grey.100",
        p: 2
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 440 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Crud Control</Typography>
            <Typography variant="body2" color="text.secondary">
              Local authenticated shell baseline for the M4 reference slice.
            </Typography>
            <Button variant="contained" onClick={onSignIn}>
              Sign in (local)
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function ModuleSidebar({
  modules,
  activeModuleId,
  onSelectModule,
  collapsed = false,
  onToggleCollapsed = null
}) {
  const hasProductStages = modules.some(
    (moduleItem) =>
      typeof moduleItem?.productStageLabel === "string" && moduleItem.productStageLabel.length > 0
  );
  const resolveModuleStateLabel = (moduleItem) => {
    const state =
      typeof moduleItem?.state === "string" && moduleItem.state.length > 0
        ? moduleItem.state
        : "unknown";
    return state;
  };

  const isModuleRouteAvailable = (moduleItem) => {
    if (
      moduleItem?.routeAvailability &&
      typeof moduleItem.routeAvailability === "object" &&
      moduleItem.routeAvailability.routeAvailable === true
    ) {
      return true;
    }

    return resolveModuleStateLabel(moduleItem) === "enabled";
  };

  return (
    <Paper
      component="aside"
      square
      sx={{
        width: collapsed ? 76 : 196,
        borderRight: 1,
        borderColor: "divider",
        px: 1,
        py: 1,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        overflow: "hidden",
        transition: (theme) =>
          theme.transitions.create("width", {
            duration: theme.transitions.duration.shorter
          })
      }}
    >
      <Stack
        direction={collapsed ? "column" : "row"}
        spacing={0.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: collapsed ? 0 : 0.5, pb: 0.5 }}
      >
        {!collapsed ? (
          <Typography variant="subtitle2" color="text.secondary" sx={{ px: 0.5 }}>
            {hasProductStages ? "Workflow" : "Modules"}
          </Typography>
        ) : (
          <Tooltip title={hasProductStages ? "Workflow" : "Modules"} placement="right">
            <Typography variant="subtitle2" color="text.secondary">
              {hasProductStages ? "WF" : "MD"}
            </Typography>
          </Tooltip>
        )}
        {typeof onToggleCollapsed === "function" ? (
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
            <IconButton
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onToggleCollapsed}
              size="small"
            >
              {collapsed ? "»" : "«"}
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
      {modules.map((moduleItem, index) => {
        const active = moduleItem.id === activeModuleId;
        const moduleState = resolveModuleStateLabel(moduleItem);
        const routeAvailable = isModuleRouteAvailable(moduleItem);
        const currentStage = moduleItem.productStageLabel ?? "";
        const previousStage =
          index > 0 ? modules[index - 1]?.productStageLabel ?? "" : "";
        const buttonContent = (
          <Stack
            direction="row"
            spacing={collapsed ? 0 : 0.75}
            alignItems="center"
            justifyContent={collapsed ? "center" : "flex-start"}
            useFlexGap
            sx={{ width: "100%" }}
          >
            <Box
              component="span"
              sx={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "inline-grid",
                placeItems: "center",
                fontSize: 12,
                bgcolor: active ? "rgba(255,255,255,0.18)" : "action.hover",
                flexShrink: 0
              }}
            >
              {resolveModuleGlyph(moduleItem.icon)}
            </Box>
            {!collapsed ? <span>{moduleItem.label}</span> : null}
            {!collapsed && moduleState !== "enabled" ? (
              <Chip
                size="small"
                color={routeAvailable ? "warning" : "default"}
                label={moduleState}
              />
            ) : null}
          </Stack>
        );
        return (
          <Stack key={moduleItem.id} spacing={0.75}>
            {hasProductStages && currentStage && currentStage !== previousStage && !collapsed ? (
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ px: 1, pt: index === 0 ? 0.25 : 0.75 }}
              >
                {currentStage}
              </Typography>
            ) : null}
            {hasProductStages && currentStage && currentStage !== previousStage && collapsed ? (
              <Tooltip title={currentStage} placement="right">
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ textAlign: "center", pt: index === 0 ? 0.25 : 0.75 }}
                >
                  {currentStage.slice(0, 1)}
                </Typography>
              </Tooltip>
            ) : null}
            <Tooltip title={collapsed ? moduleItem.label : ""} placement="right">
              <Button
                variant={active ? "contained" : "text"}
                color={active ? "primary" : "inherit"}
                onClick={() => onSelectModule(moduleItem.id)}
                aria-label={moduleItem.label}
                data-module-id={moduleItem.id}
                data-module-state={moduleState}
                data-route-available={routeAvailable ? "true" : "false"}
                sx={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  minWidth: 0,
                  px: collapsed ? 0.75 : 1.25,
                  py: 0.5
                }}
              >
                {buttonContent}
              </Button>
            </Tooltip>
          </Stack>
        );
      })}
    </Paper>
  );
}

function ModuleQuickActions({ actions, onRunAction }) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ mb: 1.5, p: 1.25 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle2" color="text.secondary">
          View shortcuts
        </Typography>
        {actions.map((action) => (
          <Button
            key={action.id}
            size="small"
            variant="text"
            onClick={() => onRunAction(action.id)}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
    </Paper>
  );
}

export { StatusChip, DeployPanel, LoginView, ModuleSidebar, ModuleQuickActions };

