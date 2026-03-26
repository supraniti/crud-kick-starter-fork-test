import { Alert, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveManagedProductBindingKey } from "../../../../modules/test-modules-remote-ops/shared/product-binding-support.mjs";
import { useRemoteOpsWorkspace } from "../../../../modules/test-modules-remote-ops/frontend/useRemoteOpsWorkspace.js";
import { ProductRemoteBillingPanel } from "./ProductRemoteBillingPanel.jsx";
import {
  ProductRemoteConnectionPanel,
  ProductRemoteConnectionSidebar
} from "./ProductRemoteConnectionPanels.jsx";
import { ProductRemoteSetupCards } from "./ProductRemoteSetupCards.jsx";
import { DeskSplitLayout } from "../../ui/DeskSplitLayout.jsx";
import { DeskTabsCard } from "../../ui/DeskTabsCard.jsx";

const MANAGED_PRODUCT_TARGET_KEYS = new Set([
  "posts-projection",
  "categories-projection",
  "tags-projection",
  "translations-projection",
  "deployment-storage",
  "media-storage",
  "browser-delivery"
]);

const REMOTES_SECTIONS = new Set(["setup", "connection", "billing", "activity"]);

function resolveRequestedSection(route = {}) {
  let requestedTab = typeof route?.tab === "string" ? route.tab.trim() : "";
  let requestedFocus = typeof route?.focus === "string" ? route.focus.trim() : "";

  if (typeof window !== "undefined") {
    const pathname = typeof window.location?.pathname === "string" ? window.location.pathname : "";
    if (pathname.includes("/app/remotes")) {
      const params = new URLSearchParams(window.location?.search ?? "");
      const urlTab = params.get("tab");
      const urlFocus = params.get("focus");
      if (!urlTab && !urlFocus) {
        requestedTab = "";
        requestedFocus = "";
      } else {
        requestedTab = typeof urlTab === "string" ? urlTab.trim() : "";
        requestedFocus = typeof urlFocus === "string" ? urlFocus.trim() : "";
      }
    }
  }

  if (REMOTES_SECTIONS.has(requestedTab)) {
    return requestedTab;
  }
  return requestedFocus === "key-import" ? "connection" : null;
}

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
        <Typography variant="h4">Remote Readiness Desk</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Connect one remote per environment, validate the credential, and make sure published data, media, HTML, and public delivery are ready before release time.
        </Typography>
      </Stack>
    </Card>
  );
}

function countPreparedManagedTargets(targets = [], connectionId = "") {
  const preparedKeys = new Set(
    targets
      .filter((target) => target?.connectionProfileId === connectionId)
      .map((target) => resolveManagedProductBindingKey(target))
      .filter((bindingKey) => MANAGED_PRODUCT_TARGET_KEYS.has(bindingKey))
  );
  return preparedKeys.size;
}

function countPermissionIssues(compatibilityReport) {
  return Array.isArray(compatibilityReport?.bundles)
    ? compatibilityReport.bundles.reduce(
        (count, bundle) => count + (Array.isArray(bundle.permissionDiagnostics) ? bundle.permissionDiagnostics.length : 0),
        0
      )
    : 0;
}

function ActiveRemotePanel({
  connection,
  preparedTargetCount,
  compatibilityReport,
  onOpenDomains,
  onOpenDeployments
}) {
  if (!connection) {
    return (
      <Alert severity="info">
        Create a remote connection first. Once it exists, this desk will show whether published data, media, HTML, and public delivery are ready.
      </Alert>
    );
  }

  const permissionIssueCount = countPermissionIssues(compatibilityReport);
  const overallState = compatibilityReport?.overallState ?? null;
  const readinessLabel =
    !overallState
      ? "Not analyzed"
      : overallState === "ready"
        ? "Ready"
        : overallState === "blocked"
          ? "Blocked"
          : "Needs attention";
  const readinessColor =
    overallState === "ready" ? "success" : overallState === "blocked" ? "error" : overallState ? "warning" : "default";

  let messageSeverity = "info";
  let message = "Validate the connection to unlock readiness analysis.";
  if (connection.connectionStatus === "validated" && !compatibilityReport) {
    message = "Connection is healthy. Run Analyze Readiness to inspect the remote publishing pieces.";
  } else if (connection.connectionStatus === "validated" && overallState === "ready") {
    messageSeverity = "success";
    message = "This remote is ready for the current publishing model.";
  } else if (connection.connectionStatus === "validated" && overallState === "blocked") {
    messageSeverity = "error";
    message = "A permission or service issue is blocking one or more publishing pieces.";
  } else if (connection.connectionStatus === "validated" && overallState === "action-required") {
    messageSeverity = "warning";
    message = "The connection works, but some publishing pieces still need to be prepared or repaired.";
  } else if (connection.connectionStatus !== "validated") {
    messageSeverity = "warning";
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.35}>
              <Typography variant="subtitle1">Active Remote</Typography>
              <Typography variant="body2" color="text.secondary">
                One place to see whether this environment is connected, understood, and ready to publish.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button variant="text" onClick={onOpenDomains}>
                Open Domains
              </Button>
              <Button variant="outlined" onClick={onOpenDeployments}>
                Open Deployments
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" color={connection.connectionStatus === "validated" ? "success" : "warning"} label={connection.connectionStatus === "validated" ? "Connection validated" : "Needs validation"} />
            <Chip size="small" variant="outlined" label={`Environment: ${connection.environmentLabel || "not named"}`} />
            <Chip size="small" variant="outlined" label={`Prepared pieces: ${preparedTargetCount}/7`} />
            <Chip size="small" color={readinessColor} label={`Readiness: ${readinessLabel}`} />
            {permissionIssueCount > 0 ? <Chip size="small" variant="outlined" label={`Permission notes: ${permissionIssueCount}`} /> : null}
          </Stack>

          <Stack spacing={0.35}>
            <Typography variant="body2">{connection.profileName}</Typography>
            {connection.projectDisplayName || connection.projectId ? (
              <Typography variant="body2" color="text.secondary">
                Project: {connection.projectDisplayName ?? connection.projectId}
              </Typography>
            ) : null}
            {connection.serviceAccountEmail ? (
              <Typography variant="body2" color="text.secondary">
                Service account: {connection.serviceAccountEmail}
              </Typography>
            ) : null}
            {connection.lastValidatedOn ? (
              <Typography variant="body2" color="text.secondary">
                Last validated: {connection.lastValidatedOn}
              </Typography>
            ) : null}
          </Stack>

          <Alert severity={messageSeverity}>{message}</Alert>
        </Stack>
      </CardContent>
    </Card>
  );
}

function RecentRunsPanel({ runs = [] }) {
  const visibleRuns = runs.slice(0, 6);
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Recent Activity</Typography>
            <Typography variant="body2" color="text.secondary">
              Latest connection checks, readiness scans, and prepare actions for the selected remote.
            </Typography>
          </Stack>
          {visibleRuns.length === 0 ? (
            <Alert severity="info">No remote activity has been recorded for this connection yet.</Alert>
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
  const [section, setSection] = useState(() => resolveRequestedSection(route) ?? "setup");
  const initializedDefaultSectionRef = useRef(false);
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
  const billingReport = effectiveSelectedConnectionId ? workspace.billingReports?.[effectiveSelectedConnectionId] ?? null : null;
  const preparedTargetCount = useMemo(
    () => countPreparedManagedTargets(workspace.targets, effectiveSelectedConnectionId),
    [effectiveSelectedConnectionId, workspace.targets]
  );
  const recentRuns = useMemo(
    () => (workspace.runs ?? []).filter((run) => !effectiveSelectedConnectionId || run.connectionProfileId === effectiveSelectedConnectionId),
    [effectiveSelectedConnectionId, workspace.runs]
  );

  useEffect(() => {
    const requestedSection = resolveRequestedSection(route);
    if (!requestedSection || requestedSection === section) {
      return;
    }
    setSection(requestedSection);
  }, [route?.focus, route?.tab, section]);

  useEffect(() => {
    if (initializedDefaultSectionRef.current) {
      return;
    }
    if (resolveRequestedSection(route)) {
      initializedDefaultSectionRef.current = true;
      return;
    }
    if (workspace.loading) {
      return;
    }
    initializedDefaultSectionRef.current = true;
    setSection("setup");
  }, [route, workspace.loading]);

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
    const activeRouteConnectionId = typeof route?.connectionId === "string" ? route.connectionId : "";
    if (activeRouteConnectionId === nextConnectionId) {
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
      {workspace.errorMessage ? <Alert severity="error">{workspace.errorMessage}</Alert> : null}
      <DeskSplitLayout
        sidebar={(
          <ProductRemoteConnectionSidebar
            workspace={workspace}
            onCreateConnection={() => setSection("connection")}
          />
        )}
        sidebarWidth={320}
        main={(
          <Stack spacing={2}>
            <ActiveRemotePanel
              connection={selectedConnection}
              preparedTargetCount={preparedTargetCount}
              compatibilityReport={compatibilityReport}
              onOpenDomains={() => openRoute("domains")}
              onOpenDeployments={() => openRoute("deployments")}
            />
            <DeskTabsCard
              value={section}
              onChange={setSection}
              tabs={[
                { value: "setup", label: "Readiness Board" },
                { value: "connection", label: "Connection" },
                { value: "billing", label: "Billing & Usage" },
                { value: "activity", label: "Recent Activity" }
              ]}
            />
            {section === "setup" ? (
              <ProductRemoteSetupCards
                workspace={workspace}
                selectedConnection={selectedConnection}
                compatibilityReport={compatibilityReport}
                targets={workspace.targets}
                onOpenDomains={() => openRoute("domains")}
                onOpenDeployments={() => openRoute("deployments")}
              />
            ) : null}
            {section === "connection" ? (
              <ProductRemoteConnectionPanel
                workspace={workspace}
                showKeyImportGuidance={route?.focus === "key-import"}
              />
            ) : null}
            {section === "billing" ? (
              <ProductRemoteBillingPanel
                workspace={workspace}
                selectedConnection={selectedConnection}
                report={billingReport}
                onLoadReport={() => workspace.loadConnectionBillingOverviewFor(effectiveSelectedConnectionId)}
              />
            ) : null}
            {section === "activity" ? <RecentRunsPanel runs={recentRuns} /> : null}
          </Stack>
        )}
      />
    </Stack>
  );
}
