import { Alert, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useMemo } from "react";
import {
  ConnectionEditor,
  ConnectionList
} from "../../../../modules/test-modules-remote-ops/frontend/RemoteOpsConnectionPanels.jsx";
import { RemoteOpsConnectionSetupCard } from "../../../../modules/test-modules-remote-ops/frontend/RemoteOpsConnectionSetupCard.jsx";
import { useRemoteOpsWorkspace } from "../../../../modules/test-modules-remote-ops/frontend/useRemoteOpsWorkspace.js";
import { SummaryCard } from "../../../../modules/test-modules-remote-ops/frontend/RemoteOpsSharedPanels.jsx";
import { ProductRemoteSetupCards } from "./ProductRemoteSetupCards.jsx";

const MANAGED_PRODUCT_TARGET_KEYS = new Set([
  "posts-projection",
  "categories-projection",
  "tags-projection",
  "deployment-storage",
  "media-storage",
  "browser-delivery"
]);

function Hero() {
  return (
    <Card
      variant="outlined"
      sx={{ p: 2, background: "linear-gradient(135deg, #0f172a 0%, #075985 100%)", color: "common.white" }}
    >
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
          Remotes
        </Typography>
        <Typography variant="h4">Remote Control Desk</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Configure provider access, validate permissions, auto-prepare the product&apos;s standard remote services,
          and provision missing remote infrastructure for the current CMS release model.
        </Typography>
      </Stack>
    </Card>
  );
}

function countPreparedManagedTargets(targets = [], connectionId = "") {
  return targets.filter(
    (target) =>
      target?.connectionProfileId === connectionId &&
      MANAGED_PRODUCT_TARGET_KEYS.has(target?.productBindingKey)
  ).length;
}

function RemoteStatusPanel({ connection, preparedTargetCount, compatibilityReport, onOpenDomains, onOpenDeployments }) {
  if (!connection) {
    return (
      <Alert severity="info">
        Create or select a remote connection profile to load the service-account key, validate project access, and
        prepare the managed remote services used by Domains, Posts, Taxonomies, Media, Pages, and Deployments.
      </Alert>
    );
  }

  const permissionIssueCount = Array.isArray(compatibilityReport?.bundles)
    ? compatibilityReport.bundles.reduce(
        (count, bundle) => count + (Array.isArray(bundle.permissionDiagnostics) ? bundle.permissionDiagnostics.length : 0),
        0
      )
    : 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.35}>
              <Typography variant="subtitle1">Selected Remote</Typography>
              <Typography variant="body2" color="text.secondary">
                Health, managed-service coverage, and permission pressure for the currently selected remote.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="text" onClick={onOpenDomains}>
                Open Domains
              </Button>
              <Button variant="outlined" onClick={onOpenDeployments}>
                Open Deployments
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              size="small"
              label={`Status: ${connection.connectionStatus}`}
              color={connection.connectionStatus === "validated" ? "success" : "warning"}
            />
            <Chip size="small" variant="outlined" label={`Project: ${connection.projectId || "none"}`} />
            <Chip size="small" variant="outlined" label={`Managed services: ${preparedTargetCount}/6`} />
            <Chip size="small" variant="outlined" label={`Permission notes: ${permissionIssueCount}`} />
            <Chip
              size="small"
              variant="outlined"
              label={`Compatibility: ${compatibilityReport?.overallState ?? "not analyzed"}`}
            />
          </Stack>

          <Stack spacing={0.35}>
            <Typography variant="body2">{connection.profileName}</Typography>
            {connection.serviceAccountEmail ? (
              <Typography variant="body2" color="text.secondary">
                Service account: {connection.serviceAccountEmail}
              </Typography>
            ) : null}
            {connection.projectDisplayName ? (
              <Typography variant="body2" color="text.secondary">
                Project: {connection.projectDisplayName}
              </Typography>
            ) : null}
            {connection.lastValidatedOn ? (
              <Typography variant="body2" color="text.secondary">
                Last validated: {connection.lastValidatedOn}
              </Typography>
            ) : null}
          </Stack>

          {connection.connectionStatus !== "validated" ? (
            <Alert severity="warning">
              This remote cannot unlock the product release pipeline until the service-account key and project access are validated.
            </Alert>
          ) : null}
          {permissionIssueCount > 0 ? (
            <Alert severity="warning">
              Compatibility analysis found permission gaps. Expand the service-account roles before expecting provisioning or sync to succeed.
            </Alert>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function RecentRunsPanel({ runs = [] }) {
  const visibleRuns = runs.slice(0, 5);
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Recent Remote Runs</Typography>
            <Typography variant="body2" color="text.secondary">
              Latest remote procedures for the selected connection.
            </Typography>
          </Stack>
          {visibleRuns.length === 0 ? (
            <Alert severity="info">No remote procedures have been run for this connection yet.</Alert>
          ) : (
            <Stack spacing={1}>
              {visibleRuns.map((run) => (
                <Card key={run.id} variant="outlined">
                  <CardContent>
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                        <Typography variant="body2">{run.title}</Typography>
                        <Chip
                          size="small"
                          label={run.status ?? "unknown"}
                          color={run.status === "success" ? "success" : run.status === "warning" ? "warning" : "default"}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {run.message ?? "No summary message."}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ProductRemotesView({ navigate = null, route = {} }) {
  const workspace = useRemoteOpsWorkspace();
  const routeConnectionId = typeof route?.connectionId === "string" ? route.connectionId : "";
  const effectiveSelectedConnectionId = useMemo(() => {
    if (workspace.selectedConnectionId) {
      return workspace.selectedConnectionId;
    }
    if (routeConnectionId && workspace.connections.some((connection) => connection.id === routeConnectionId)) {
      return routeConnectionId;
    }
    return workspace.connections[0]?.id ?? "";
  }, [routeConnectionId, workspace.connections, workspace.selectedConnectionId]);
  const selectedConnection = useMemo(
    () => workspace.connections.find((connection) => connection.id === effectiveSelectedConnectionId) ?? null,
    [effectiveSelectedConnectionId, workspace.connections]
  );
  const compatibilityReport =
    effectiveSelectedConnectionId === workspace.selectedConnectionId ? workspace.compatibilityReport : null;
  const preparedTargetCount = useMemo(
    () => countPreparedManagedTargets(workspace.targets, effectiveSelectedConnectionId),
    [effectiveSelectedConnectionId, workspace.targets]
  );
  const recentRuns = useMemo(
    () =>
      (workspace.runs ?? []).filter(
        (run) =>
          !effectiveSelectedConnectionId ||
          run.connectionProfileId === effectiveSelectedConnectionId
      ),
    [effectiveSelectedConnectionId, workspace.runs]
  );

  useEffect(() => {
    if (!routeConnectionId || workspace.selectedConnectionId === routeConnectionId) {
      return;
    }
    if (workspace.connections.some((connection) => connection.id === routeConnectionId)) {
      workspace.selectConnection(routeConnectionId);
    }
  }, [route?.connectionId, workspace]);

  useEffect(() => {
    if (workspace.connections.length === 0) {
      return;
    }
    const preferredConnection =
      workspace.connections.find((connection) => connection.id === routeConnectionId) ??
      workspace.connections[0] ??
      null;
    if (
      preferredConnection &&
      (workspace.isCreatingConnection || workspace.selectedConnectionId !== preferredConnection.id)
    ) {
      workspace.selectConnection(preferredConnection.id);
    }
  }, [
    route?.connectionId,
    workspace.connections,
    workspace.isCreatingConnection,
    workspace.selectedConnectionId,
    workspace.selectConnection
  ]);

  useEffect(() => {
    if (typeof navigate !== "function" || workspace.isCreatingConnection) {
      return;
    }
    const nextConnectionId = workspace.selectedConnectionId ?? "";
    const routeConnectionId = typeof route?.connectionId === "string" ? route.connectionId : "";
    if (routeConnectionId === nextConnectionId) {
      return;
    }
    navigate(
      {
        ...route,
        connectionId: nextConnectionId
      },
      { replace: true }
    );
  }, [navigate, route, workspace.isCreatingConnection, workspace.selectedConnectionId]);

  function openRoute(moduleId) {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId }, { replace: false });
  }

  return (
    <Stack spacing={2}>
      <Hero />
      <Alert severity="info">
        This is the product-owned remote surface. The normal operator flow here is connection-first: validate one
        remote, auto-prepare the managed services, inspect compatibility, and provision only what the current product
        release model needs.
      </Alert>
      {workspace.errorMessage ? <Alert severity="error">{workspace.errorMessage}</Alert> : null}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" } }}
      >
        <SummaryCard label="Remote Profiles" value={workspace.summary.connections} />
        <SummaryCard label="Validated Services" value={workspace.summary.ready} tone="success" />
        <SummaryCard label="Warnings" value={workspace.summary.warnings} tone="attention" />
        <SummaryCard label="Managed Targets" value={preparedTargetCount} />
        <SummaryCard label="Remote Runs" value={recentRuns.length} />
      </Stack>
      <RemoteStatusPanel
        connection={selectedConnection}
        preparedTargetCount={preparedTargetCount}
        compatibilityReport={compatibilityReport}
        onOpenDomains={() => openRoute("domains")}
        onOpenDeployments={() => openRoute("deployments")}
      />
      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", xl: 320 }, flexShrink: 0 }} spacing={2}>
          <ConnectionList workspace={workspace} />
          <RecentRunsPanel runs={recentRuns} />
        </Stack>
        <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
          <ProductRemoteSetupCards
            workspace={workspace}
            selectedConnection={selectedConnection}
            compatibilityReport={compatibilityReport}
            targets={workspace.targets}
            onOpenDomains={() => openRoute("domains")}
            onOpenDeployments={() => openRoute("deployments")}
          />
          <ConnectionEditor
            workspace={workspace}
            SetupCard={RemoteOpsConnectionSetupCard}
            surface="product"
            showManagedTargetsPanel={false}
            showCompatibilityReport={false}
            showProvisioningPanel={false}
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
