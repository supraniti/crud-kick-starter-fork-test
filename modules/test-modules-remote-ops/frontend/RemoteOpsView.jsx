import { Alert, Box, Paper, Stack, Tab, Tabs } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { RemoteOpsConnectionSetupCard } from "./RemoteOpsConnectionSetupCard.jsx";
import { ConnectionEditor, ConnectionList } from "./RemoteOpsConnectionPanels.jsx";
import { Hero, SummaryCard } from "./RemoteOpsSharedPanels.jsx";
import { RunsPanel, TargetEditor, TargetList } from "./RemoteOpsTargetPanels.jsx";
import { useRemoteOpsWorkspace } from "./useRemoteOpsWorkspace.js";

const VALID_TABS = new Set(["connections", "targets", "runs"]);

function resolveRouteTab(route) {
  const routeTab = typeof route?.tab === "string" ? route.tab : "";
  return VALID_TABS.has(routeTab) ? routeTab : "connections";
}

export function RemoteOpsView({ activeModuleLabel, navigate = null, route = null }) {
  const workspace = useRemoteOpsWorkspace();
  const [tab, setTab] = useState(() => resolveRouteTab(route));
  const headerAlert = useMemo(
    () => (
      <Alert severity="info">
        Service-account connection, target validation, compare, execute, and compatibility analysis now run
        inside the remote-ops module. Browser-delivery now supports custom-domain instructions, GCP
        temporary URL previews, and bounded direct-storage provisioning while full CDN/load-balancer
        orchestration remains future work.
      </Alert>
    ),
    []
  );

  useEffect(() => {
    if (typeof route?.tab !== "string") {
      return;
    }
    const nextTab = resolveRouteTab(route);
    if (nextTab !== tab) {
      setTab(nextTab);
    }
  }, [route, tab]);

  useEffect(() => {
    const routeTargetId = typeof route?.targetId === "string" ? route.targetId : "";
    if (!routeTargetId || workspace.isCreatingTarget || workspace.selectedTargetId === routeTargetId) {
      return;
    }
    if (!workspace.targets.some((target) => target.id === routeTargetId)) {
      return;
    }
    workspace.selectTarget(routeTargetId);
    setTab("targets");
  }, [
    route,
    workspace.isCreatingTarget,
    workspace.selectedTargetId,
    workspace.selectTarget,
    workspace.targets
  ]);

  useEffect(() => {
    const routeConnectionId = typeof route?.connectionId === "string" ? route.connectionId : "";
    if (
      !routeConnectionId ||
      workspace.isCreatingConnection ||
      workspace.selectedConnectionId === routeConnectionId
    ) {
      return;
    }
    if (!workspace.connections.some((connection) => connection.id === routeConnectionId)) {
      return;
    }
    workspace.selectConnection(routeConnectionId);
    if (!route?.targetId) {
      setTab("connections");
    }
  }, [
    route,
    workspace.connections,
    workspace.isCreatingConnection,
    workspace.selectConnection,
    workspace.selectedConnectionId
  ]);

  const handleChangeTab = (_, nextTab) => {
    setTab(nextTab);
    if (typeof navigate === "function") {
      navigate(
        {
          ...route,
          tab: nextTab
        },
        { replace: true }
      );
    }
  };

  return (
    <Stack spacing={2}>
      <Hero activeModuleLabel={activeModuleLabel} />
      {headerAlert}
      {workspace.errorMessage ? <Alert severity="error">{workspace.errorMessage}</Alert> : null}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" } }}
      >
        <SummaryCard label="Connections" value={workspace.summary.connections} />
        <SummaryCard label="Targets" value={workspace.summary.targets} />
        <SummaryCard label="Validated Targets" value={workspace.summary.ready} tone="success" />
        <SummaryCard label="Targets With Warnings" value={workspace.summary.warnings} tone="attention" />
        <SummaryCard label="Operation Runs" value={workspace.summary.runs} />
      </Stack>
      <Paper variant="outlined" sx={{ px: 2 }}>
        <Tabs value={tab} onChange={handleChangeTab}>
          <Tab value="connections" label="Connections" />
          <Tab value="targets" label="Targets" />
          <Tab value="runs" label="Runs" />
        </Tabs>
      </Paper>
      {tab === "connections" ? (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "320px minmax(0, 1fr)" } }}>
          <ConnectionList workspace={workspace} />
          <ConnectionEditor workspace={workspace} SetupCard={RemoteOpsConnectionSetupCard} />
        </Box>
      ) : null}
      {tab === "targets" ? (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "320px minmax(0, 1fr)" } }}>
          <TargetList workspace={workspace} />
          <TargetEditor workspace={workspace} />
        </Box>
      ) : null}
      {tab === "runs" ? <RunsPanel workspace={workspace} /> : null}
    </Stack>
  );
}
