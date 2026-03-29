import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  StatusChip,
  DeployPanel,
  ModuleSidebar,
  ModuleQuickActions
} from "../../ui/ShellViews.jsx";
import { RuntimeSettingsDialog } from "../../ui/RuntimeSettingsDialog.jsx";
import { APP_VERSION } from "./01-app-config.js";
import { APP_SIDEBAR_STORAGE_KEY } from "./00-app-theme.js";
import { GlobalDeploymentFab } from "../product-shell/GlobalDeploymentFab.jsx";
import { useGlobalDeploymentCommandCenter } from "../product-shell/useGlobalDeploymentCommandCenter.js";

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
  const deploymentCommandCenter = useGlobalDeploymentCommandCenter();
  const theme = useTheme();
  const preferCollapsedSidebar = useMediaQuery(theme.breakpoints.down("lg"));
  const activeModuleId = typeof route?.moduleId === "string" ? route.moduleId.trim().toLowerCase() : "";
  const requestedImmersiveRoute =
    activeModuleId === "test-modules-page-studio" || activeModuleId === "page-studio";
  const immersiveShell =
    activeViewRegistration?.shell?.mode === "immersive" || requestedImmersiveRoute;
  const hideImmersiveAppChrome =
    immersiveShell && requestedImmersiveRoute;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    return window.localStorage.getItem(APP_SIDEBAR_STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    const persistedValue = window.localStorage.getItem(APP_SIDEBAR_STORAGE_KEY);
    if (persistedValue === null && preferCollapsedSidebar) {
      setSidebarCollapsed(true);
    }
  }, [preferCollapsedSidebar]);

  const handleToggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((previous) => {
      const nextValue = !previous;
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(APP_SIDEBAR_STORAGE_KEY, nextValue ? "1" : "0");
      }
      return nextValue;
    });
  }, []);

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
          collapsed={sidebarCollapsed}
          onToggleCollapsed={handleToggleSidebarCollapsed}
        />
      ) : null}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!hideImmersiveAppChrome ? (
          <Paper
            square
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              px: 1.5,
              py: 1
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={0.75}
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
        ) : null}

        <Box
          sx={{
            p: immersiveShell ? 0 : 1.25,
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

          {!immersiveShell ? <Divider sx={{ mb: 1.5 }} /> : null}

          {!moduleState.loading ? activeModuleView : null}
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

      {!immersiveShell ? (
        <GlobalDeploymentFab
          commandCenter={deploymentCommandCenter}
          onOpenDeployments={() => handleSelectModule("deployments")}
        />
      ) : null}
    </Box>
  );
}

export { AppShellLayout };
