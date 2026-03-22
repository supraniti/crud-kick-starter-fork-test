import { Alert, Card, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRemoteOpsWorkspace } from "../../../../modules/test-modules-remote-ops/frontend/useRemoteOpsWorkspace.js";
import { buildBrowserDeliveryDescriptor } from "../../../../modules/test-modules-remote-ops/shared/browser-delivery-support.mjs";
import {
  GoLiveChecklistPanel,
  PublicAddressEditorDrawer,
  PublicAddressSidebar,
  PublicAddressSummaryPanel
} from "./ProductDomainSetupPanels.jsx";
import { DeskSplitLayout } from "../../ui/DeskSplitLayout.jsx";
import { DeskTabsCard } from "../../ui/DeskTabsCard.jsx";

function Hero() {
  return (
    <Card variant="outlined" sx={{ p: 2, background: "linear-gradient(135deg, #115e59 0%, #1d4ed8 100%)", color: "common.white" }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
          Domains
        </Typography>
        <Typography variant="h4">Public Address Desk</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Decide where readers actually reach the site, inspect the public examples, and bring a testing address or a real domain live without dropping into raw infrastructure language.
        </Typography>
      </Stack>
    </Card>
  );
}

function getBundleReport(compatibilityReport) {
  return Array.isArray(compatibilityReport?.bundles)
    ? compatibilityReport.bundles.find((bundle) => bundle?.id === "browser-delivery") ?? null
    : null;
}

function getDeliveryReport(bundleReport, targetId) {
  return Array.isArray(bundleReport?.deliveryReports)
    ? bundleReport.deliveryReports.find((report) => report?.targetId === targetId) ?? null
    : null;
}

function ensureBrowserDeliveryDraft(workspace, selectedConnectionId, browserTargets) {
  if (workspace.targetDraft.targetKind !== "browser-delivery") {
    workspace.changeTargetField("targetKind", "browser-delivery");
    return;
  }
  if (workspace.targetDraft.productBindingKey !== "browser-delivery") {
    workspace.changeTargetField("productBindingKey", "browser-delivery");
    return;
  }
  if (workspace.targetDraft.adapterMode !== "live-gcp") {
    workspace.changeTargetField("adapterMode", "live-gcp");
    return;
  }
  if (!workspace.targetDraft.connectionProfileId) {
    const fallbackConnectionId = selectedConnectionId ?? browserTargets[0]?.connectionProfileId ?? workspace.connections[0]?.id ?? "";
    if (fallbackConnectionId) {
      workspace.changeTargetField("connectionProfileId", fallbackConnectionId);
      return;
    }
  }
}

export function ProductDomainsView({ navigate = null, route = {} }) {
  const initialSection = route?.tab === "go-live" ? "go-live" : "public";
  const [section, setSection] = useState(initialSection);
  const [editorOpen, setEditorOpen] = useState(false);
  const workspace = useRemoteOpsWorkspace();
  const browserTargets = useMemo(
    () => workspace.targets.filter((item) => item.targetKind === "browser-delivery"),
    [workspace.targets]
  );
  const selectedBrowserTarget =
    browserTargets.find((target) => target.id === workspace.selectedTargetId) ??
    browserTargets.find((target) => target.productBindingKey === "browser-delivery") ??
    browserTargets[0] ??
    null;
  const selectedConnection =
    workspace.connections.find((connection) => connection.id === selectedBrowserTarget?.connectionProfileId) ??
    workspace.selectedConnection ??
    null;
  const compatibilityReport =
    selectedConnection && selectedConnection.id === workspace.selectedConnectionId
      ? workspace.compatibilityReport
      : null;
  const bundleReport = getBundleReport(compatibilityReport);
  const deliveryReport = getDeliveryReport(bundleReport, selectedBrowserTarget?.id ?? null);
  const deploymentTarget =
    workspace.targets.find((target) => target.id === selectedBrowserTarget?.config?.deploymentTargetProfileId) ?? null;
  const mediaTarget =
    workspace.targets.find((target) => target.id === selectedBrowserTarget?.config?.mediaTargetProfileId) ?? null;
  const descriptor = buildBrowserDeliveryDescriptor({
    browserTarget: selectedBrowserTarget,
    deploymentTarget,
    mediaTarget,
    pagePath: "/post/example-post",
    artifactRelativePath: "post/example-post/index.html"
  });
  const deploymentTargets = useMemo(
    () => workspace.targets.filter((target) => target.targetKind === "deployment-storage"),
    [workspace.targets]
  );
  const mediaTargets = useMemo(
    () => workspace.targets.filter((target) => target.targetKind === "media-storage"),
    [workspace.targets]
  );

  useEffect(() => {
    const routeTargetId = typeof route?.targetId === "string" ? route.targetId : "";
    if (routeTargetId && browserTargets.some((target) => target.id === routeTargetId)) {
      workspace.selectTarget(routeTargetId);
    }
  }, [browserTargets, route?.targetId, workspace]);

  useEffect(() => {
    if (selectedBrowserTarget?.connectionProfileId && workspace.selectedConnectionId !== selectedBrowserTarget.connectionProfileId) {
      workspace.selectConnection(selectedBrowserTarget.connectionProfileId);
    }
  }, [selectedBrowserTarget?.connectionProfileId, workspace]);

  useEffect(() => {
    if (workspace.isCreatingTarget) {
      ensureBrowserDeliveryDraft(workspace, selectedBrowserTarget?.connectionProfileId ?? workspace.selectedConnectionId, browserTargets);
      return;
    }
    if (workspace.selectedTargetId && browserTargets.some((target) => target.id === workspace.selectedTargetId)) {
      return;
    }
    if (selectedBrowserTarget) {
      workspace.selectTarget(selectedBrowserTarget.id);
    }
  }, [browserTargets, selectedBrowserTarget, workspace]);

  useEffect(() => {
    if (workspace.targetActionState.successMessage && editorOpen) {
      setEditorOpen(false);
    }
  }, [editorOpen, workspace.targetActionState.successMessage]);

  function openRoute(moduleId) {
    if (typeof navigate === "function") {
      navigate({ moduleId }, { replace: false });
    }
  }

  function handleCreateAddress() {
    workspace.startNewTarget();
    setEditorOpen(true);
  }

  function handleSelectTarget(targetId) {
    workspace.selectTarget(targetId);
    setEditorOpen(false);
  }

  function handleEditAddress() {
    if (!selectedBrowserTarget) {
      return;
    }
    workspace.selectTarget(selectedBrowserTarget.id);
    setEditorOpen(true);
  }

  return (
    <Stack spacing={2}>
      <Hero />
      <Alert severity="info">
        This desk answers one question first: where can readers open the site today? It keeps testing addresses and real public domains in one place, then tells the operator what still needs to happen before a hostname is truly live.
      </Alert>
      {workspace.errorMessage ? <Alert severity="error">{workspace.errorMessage}</Alert> : null}
      <DeskSplitLayout
        sidebar={
          <PublicAddressSidebar
            targets={browserTargets}
            selectedTargetId={selectedBrowserTarget?.id ?? ""}
            descriptor={descriptor}
            bundleReport={bundleReport}
            onSelectTarget={handleSelectTarget}
            onCreateAddress={handleCreateAddress}
          />
        }
        sidebarWidth={340}
        main={
          <Stack spacing={2}>
            <DeskTabsCard
              value={section}
              onChange={setSection}
              tabs={[
                { value: "public", label: "What Readers See" },
                { value: "go-live", label: "Go Live" }
              ]}
            />
            {section === "public" ? (
              <PublicAddressSummaryPanel
                selectedTarget={selectedBrowserTarget}
                descriptor={descriptor}
                deploymentTarget={deploymentTarget}
                bundleReport={bundleReport}
                onEditAddress={handleEditAddress}
              />
            ) : null}
            {section === "go-live" ? (
              <GoLiveChecklistPanel
                workspace={workspace}
                selectedTarget={selectedBrowserTarget}
                descriptor={descriptor}
                bundleReport={bundleReport}
                deliveryReport={deliveryReport}
                onOpenRemotes={() => openRoute("remotes")}
                onOpenDeployments={() => openRoute("deployments")}
                onEditAddress={handleEditAddress}
              />
            ) : null}
          </Stack>
        }
      />
      <PublicAddressEditorDrawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        workspace={workspace}
        connections={workspace.connections}
        deploymentTargets={deploymentTargets}
        mediaTargets={mediaTargets}
      />
    </Stack>
  );
}
