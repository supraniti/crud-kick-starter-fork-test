import { Alert, Card, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  TargetEditor,
  TargetList
} from "../../../../modules/test-modules-remote-ops/frontend/RemoteOpsTargetPanels.jsx";
import { useRemoteOpsWorkspace } from "../../../../modules/test-modules-remote-ops/frontend/useRemoteOpsWorkspace.js";
import { buildBrowserDeliveryDescriptor } from "../../../../modules/test-modules-remote-ops/shared/browser-delivery-support.mjs";
import {
  AccessModePanel,
  DnsInstructionsPanel,
  DomainProvisioningCard,
  DomainSummaryPanel,
  ServicePathsPanel
} from "./ProductDomainSetupPanels.jsx";
import { DeskSplitLayout } from "../../ui/DeskSplitLayout.jsx";
import { DeskTabsCard } from "../../ui/DeskTabsCard.jsx";

function Hero() {
  return (
    <Card variant="outlined" sx={{ p: 2, background: "linear-gradient(135deg, #3f6212 0%, #0f766e 100%)", color: "common.white" }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
          Domains
        </Typography>
        <Typography variant="h4">Domain Delivery Desk</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Bind public hostnames or temporary GCP access URLs to the product&apos;s HTML deployment and media services.
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

function summarizeProjectionTargets(targets = [], connectionId = "") {
  return targets
    .filter(
      (target) =>
        target?.connectionProfileId === connectionId &&
        target?.targetKind === "firestore-projection" &&
        target?.targetStatus === "validated"
    )
    .map((target) => ({
      id: target.id,
      title: target.title,
      projectionScope: target?.config?.projectionScope ?? "",
      firestoreCollectionPath: target?.config?.firestoreCollectionPath ?? ""
    }));
}

export function ProductDomainsView({ navigate = null, route = {} }) {
  const [section, setSection] = useState("overview");
  const workspace = useRemoteOpsWorkspace();
  const browserTargets = workspace.targets.filter((item) => item.targetKind === "browser-delivery");
  const selectedBrowserTarget =
    browserTargets.find((target) => target.id === workspace.selectedTargetId) ??
    browserTargets.find((target) => target.productBindingKey === "browser-delivery") ??
    browserTargets[0] ??
    null;
  const selectedConnection =
    workspace.connections.find((connection) => connection.id === selectedBrowserTarget?.connectionProfileId) ?? null;
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
    pagePath: "/posts/example-post",
    artifactRelativePath: "posts/example-post/index.html"
  });
  const projectionTargets = useMemo(
    () => summarizeProjectionTargets(workspace.targets, selectedConnection?.id ?? ""),
    [selectedConnection?.id, workspace.targets]
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
    if (!workspace.isCreatingTarget) {
      if (workspace.selectedTargetId && browserTargets.some((target) => target.id === workspace.selectedTargetId)) {
        return;
      }
      if (selectedBrowserTarget) {
        workspace.selectTarget(selectedBrowserTarget.id);
      } else {
        workspace.startNewTarget();
      }
      return;
    }
    if (workspace.targetDraft.targetKind !== "browser-delivery") {
      workspace.changeTargetField("targetKind", "browser-delivery");
    }
  }, [browserTargets, selectedBrowserTarget, workspace]);

  function openRoute(moduleId) {
    if (typeof navigate === "function") {
      navigate({ moduleId }, { replace: false });
    }
  }

  const domainsWorkspace = {
    ...workspace,
    targets: browserTargets,
    startNewTarget() {
      workspace.startNewTarget();
    },
    changeTargetField(fieldId, value) {
      workspace.changeTargetField(fieldId, fieldId === "targetKind" ? "browser-delivery" : value);
    }
  };

  return (
    <Stack spacing={2}>
      <Hero />
      <Alert severity="info">
        This product desk owns domain setup. Use it to decide whether the release uses an owned hostname or temporary
        GCP URLs, inspect the linked HTML/media services, and drive DNS or HTTPS delivery-stack work without dropping
        to the raw target mental model first.
      </Alert>
      {workspace.errorMessage ? <Alert severity="error">{workspace.errorMessage}</Alert> : null}
      <DeskSplitLayout
        sidebar={<TargetList workspace={domainsWorkspace} />}
        sidebarWidth={320}
        main={
          <>
            <DeskTabsCard
              value={section}
              onChange={setSection}
              tabs={[
                { value: "overview", label: "Delivery Overview" },
                { value: "setup", label: "DNS And Setup" },
                { value: "details", label: "Domain Details" }
              ]}
            />
            {section === "overview" ? (
              <Stack spacing={2}>
                <DomainSummaryPanel
                  selectedTarget={selectedBrowserTarget}
                  selectedConnection={selectedConnection}
                  descriptor={descriptor}
                  bundleReport={bundleReport}
                  deliveryReport={deliveryReport}
                />
                {selectedBrowserTarget ? (
                  <>
                    <AccessModePanel descriptor={descriptor} selectedTarget={selectedBrowserTarget} />
                    <ServicePathsPanel
                      descriptor={descriptor}
                      deploymentTarget={deploymentTarget}
                      mediaTarget={mediaTarget}
                      projectionTargets={projectionTargets}
                    />
                  </>
                ) : null}
              </Stack>
            ) : null}
            {section === "setup" && selectedBrowserTarget ? (
              <Stack spacing={2}>
                <DnsInstructionsPanel
                  selectedTarget={selectedBrowserTarget}
                  descriptor={descriptor}
                  deliveryReport={deliveryReport}
                  bundleReport={bundleReport}
                />
                <DomainProvisioningCard
                  workspace={workspace}
                  bundleReport={bundleReport}
                  selectedTarget={selectedBrowserTarget}
                  onOpenRemotes={() => openRoute("remotes")}
                  onOpenDeployments={() => openRoute("deployments")}
                />
              </Stack>
            ) : null}
            {section === "details" ? <TargetEditor workspace={domainsWorkspace} /> : null}
          </>
        }
      />
    </Stack>
  );
}
