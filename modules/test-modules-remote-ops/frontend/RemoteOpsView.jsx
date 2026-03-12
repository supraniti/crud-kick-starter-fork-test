import { Alert, Box, Paper, Stack, Tab, Tabs } from "@mui/material";
import { useMemo, useState } from "react";
import { RemoteOpsConnectionSetupCard } from "./RemoteOpsConnectionSetupCard.jsx";
import { ConnectionEditor, ConnectionList } from "./RemoteOpsConnectionPanels.jsx";
import { Hero, SummaryCard } from "./RemoteOpsSharedPanels.jsx";
import { RunsPanel, TargetEditor, TargetList } from "./RemoteOpsTargetPanels.jsx";
import { useRemoteOpsWorkspace } from "./useRemoteOpsWorkspace.js";

export function RemoteOpsView({ activeModuleLabel }) {
  const workspace = useRemoteOpsWorkspace();
  const [tab, setTab] = useState("connections");
  const headerAlert = useMemo(
    () => (
      <Alert severity="info">
        Service-account connection, target validation, compare, execute, and compatibility analysis now run
        inside the remote-ops module. Browser-delivery remains validation-only until its provisioning/runtime
        slice is implemented.
      </Alert>
    ),
    []
  );

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
        <Tabs value={tab} onChange={(_, nextValue) => setTab(nextValue)}>
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
