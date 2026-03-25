import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import {
  StatusChip,
  DeployPanel,
  ModuleSidebar,
  ModuleQuickActions
} from "../../ui/ShellViews.jsx";
import { RuntimeSettingsDialog } from "../../ui/RuntimeSettingsDialog.jsx";
import { APP_VERSION } from "./01-app-config.js";

function AppShellLayout({
  moduleState,
  route,
  activeRouteGuide = null,
  handleSelectModule,
  routeUrl,
  connectivityMode,
  runConnectivityCheck,
  handleSignOut,
  viewActions,
  handleRunViewAction,
  requiredDomains,
  remotesDeployDomain,
  activeViewRegistration,
  runtimeSettingsOpen,
  handleOpenRuntimeSettings,
  handleCloseRuntimeSettings,
  handleOpenRemotes,
  developerModeEnabled = false,
  activeModuleView
}) {
  const immersiveShell =
    activeViewRegistration?.shell?.mode === "immersive";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "grey.100"
      }}
    >
      {!immersiveShell ? (
        <ModuleSidebar
          modules={moduleState.items}
          activeModuleId={route.moduleId}
          onSelectModule={handleSelectModule}
        />
      ) : null}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Paper
          square
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: 2,
            py: 1.5
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack spacing={0.5}>
              <Typography variant="h6">Crud Control v{APP_VERSION}</Typography>
              {activeRouteGuide ? (
                <>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    {activeRouteGuide.stageLabel ? (
                      <Chip size="small" label={`Stage: ${activeRouteGuide.stageLabel}`} />
                    ) : null}
                    <Typography variant="caption" color="text.secondary">
                      Route: {routeUrl}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {activeRouteGuide.title}: {activeRouteGuide.purpose}
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Active route: {routeUrl}
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <StatusChip mode={connectivityMode} />
              {activeRouteGuide?.nextRouteId ? (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleSelectModule(activeRouteGuide.nextRouteId)}
                >
                  Next: {activeRouteGuide.nextRouteLabel || activeRouteGuide.nextRouteId}
                </Button>
              ) : null}
              <Button size="small" variant="outlined" onClick={runConnectivityCheck}>
                Re-check API
              </Button>
              {developerModeEnabled ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleOpenRuntimeSettings}
                >
                  Developer tools
                </Button>
              ) : null}
              <Button size="small" variant="text" color="inherit" onClick={handleSignOut}>
                Sign out
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Box
          sx={{
            p: immersiveShell ? 0 : 2,
            overflow: immersiveShell ? "hidden" : "auto",
            flex: 1,
            minWidth: 0,
            width: "100%",
            maxWidth: "100%"
          }}
        >
          {moduleState.loading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ p: immersiveShell ? 2 : 0 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Loading modules...</Typography>
            </Stack>
          ) : null}

          {moduleState.errorMessage ? (
            <Alert severity="error" sx={{ m: immersiveShell ? 2 : 0, mb: 2 }}>
              {moduleState.errorMessage}
            </Alert>
          ) : null}

          {!immersiveShell ? (
            <ModuleQuickActions actions={viewActions} onRunAction={handleRunViewAction} />
          ) : null}

          {!immersiveShell && requiredDomains.has("remotes-deploy") ? (
            <DeployPanel
              state={remotesDeployDomain.deployState}
              remotes={remotesDeployDomain.remotesState.items}
              selectedRemoteId={remotesDeployDomain.selectedRemoteId}
              onSelectRemote={remotesDeployDomain.setSelectedRemoteId}
              onOpenRemotes={handleOpenRemotes}
              onDeployNow={remotesDeployDomain.handleDeployNow}
            />
          ) : null}

          {!immersiveShell ? <Divider sx={{ mb: 2 }} /> : null}

          {activeModuleView}
        </Box>
      </Box>

      {developerModeEnabled ? (
        <RuntimeSettingsDialog
          open={runtimeSettingsOpen}
          onClose={handleCloseRuntimeSettings}
          moduleRuntimeState={remotesDeployDomain.moduleRuntimeState}
          onRunModuleAction={remotesDeployDomain.handleRunModuleAction}
        />
      ) : null}
    </Box>
  );
}

export { AppShellLayout };
