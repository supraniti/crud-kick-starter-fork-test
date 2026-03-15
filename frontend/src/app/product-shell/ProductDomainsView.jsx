import { Alert, Button, Card, CardContent, Chip, Paper, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import {
  TargetEditor,
  TargetList
} from "../../../../modules/test-modules-remote-ops/frontend/RemoteOpsTargetPanels.jsx";
import { useRemoteOpsWorkspace } from "../../../../modules/test-modules-remote-ops/frontend/useRemoteOpsWorkspace.js";
import { buildBrowserDeliveryDescriptor } from "../../../../modules/test-modules-remote-ops/shared/browser-delivery-support.mjs";

function Hero() {
  return (
    <Card variant="outlined" sx={{ p: 2, background: "linear-gradient(135deg, #3f6212 0%, #0f766e 100%)", color: "common.white" }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
          Domains
        </Typography>
        <Typography variant="h4">Browser Delivery Desk</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
          Manage owned domains, temporary GCP URLs, DNS instructions, and browser-delivery target readiness.
        </Typography>
      </Stack>
    </Card>
  );
}

function DomainOverviewPanel({ selectedTarget, targets }) {
  if (!selectedTarget) {
    return (
      <Alert severity="info">
        Create or select a browser-delivery target to see the current public origin, temporary GCP URLs, and DNS
        instructions for this domain.
      </Alert>
    );
  }

  const deploymentTarget =
    targets.find((target) => target.id === selectedTarget?.config?.deploymentTargetProfileId) ?? null;
  const mediaTarget =
    targets.find((target) => target.id === selectedTarget?.config?.mediaTargetProfileId) ?? null;
  const descriptor = buildBrowserDeliveryDescriptor({
    browserTarget: selectedTarget,
    deploymentTarget,
    mediaTarget,
    pagePath: "/posts/example-post",
    artifactRelativePath: "posts/example-post/index.html"
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="h6">Current Delivery View</Typography>
            <Chip size="small" label={descriptor.accessMode} variant="outlined" />
            <Chip size="small" label={descriptor.stackMode} variant="outlined" />
            <Chip size="small" label={descriptor.dnsMode} variant="outlined" />
          </Stack>

          <Stack spacing={0.35}>
            <Typography variant="body2">Target: {selectedTarget.title}</Typography>
            {descriptor.publicOrigin ? (
              <Typography variant="body2" color="text.secondary">
                Public origin: {descriptor.publicOrigin}
              </Typography>
            ) : null}
            {descriptor.publicUrl ? (
              <Typography variant="body2" color="text.secondary">
                Example page URL: {descriptor.publicUrl}
              </Typography>
            ) : null}
            {descriptor.publicMediaBaseUrl ? (
              <Typography variant="body2" color="text.secondary">
                Public media base: {descriptor.publicMediaBaseUrl}
              </Typography>
            ) : null}
            {descriptor.temporaryDeploymentBaseUrl ? (
              <Typography variant="body2" color="text.secondary">
                Temporary deployment base: {descriptor.temporaryDeploymentBaseUrl}
              </Typography>
            ) : null}
            {descriptor.temporaryMediaBaseUrl ? (
              <Typography variant="body2" color="text.secondary">
                Temporary media base: {descriptor.temporaryMediaBaseUrl}
              </Typography>
            ) : null}
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
              <Stack spacing={0.35}>
                <Typography variant="subtitle2">HTML Service</Typography>
                <Typography variant="body2" color="text.secondary">
                  {deploymentTarget?.title ?? "No linked deployment target"}
                </Typography>
                {deploymentTarget?.config?.bucketName ? (
                  <Typography variant="caption" color="text.secondary">
                    Bucket: {deploymentTarget.config.bucketName}
                  </Typography>
                ) : null}
                {deploymentTarget?.config?.prefix ? (
                  <Typography variant="caption" color="text.secondary">
                    Prefix: {deploymentTarget.config.prefix}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
              <Stack spacing={0.35}>
                <Typography variant="subtitle2">Media Service</Typography>
                <Typography variant="body2" color="text.secondary">
                  {mediaTarget?.title ?? "No linked media target"}
                </Typography>
                {mediaTarget?.config?.bucketName ? (
                  <Typography variant="caption" color="text.secondary">
                    Bucket: {mediaTarget.config.bucketName}
                  </Typography>
                ) : null}
                {mediaTarget?.config?.prefix ? (
                  <Typography variant="caption" color="text.secondary">
                    Prefix: {mediaTarget.config.prefix}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          </Stack>

          {descriptor.dnsInstruction ? (
            <Alert severity="info">
              <Stack spacing={0.35}>
                <Typography variant="body2">
                  DNS record: {descriptor.dnsInstruction.recordType} {descriptor.dnsInstruction.recordName} {"->"}{" "}
                  {descriptor.dnsInstruction.recordValue}
                </Typography>
                {descriptor.dnsInstruction.notes.map((note) => (
                  <Typography key={note} variant="caption" color="text.secondary">
                    {note}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}

          {descriptor.notes?.length > 0 ? (
            <Alert severity="info">
              <Stack spacing={0.35}>
                {descriptor.notes.map((note) => (
                  <Typography key={note} variant="body2">
                    {note}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}

          {descriptor.warnings?.length > 0 ? (
            <Alert severity="warning">
              <Stack spacing={0.35}>
                {descriptor.warnings.map((warning) => (
                  <Typography key={warning} variant="body2">
                    {warning}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ProductDomainsView({ navigate = null, route = {} }) {
  const workspace = useRemoteOpsWorkspace();
  const browserTargets = workspace.targets.filter((item) => item.targetKind === "browser-delivery");
  const selectedBrowserTarget =
    browserTargets.find((target) => target.id === workspace.selectedTargetId) ??
    browserTargets.find((target) => target.productBindingKey === "browser-delivery") ??
    browserTargets[0] ??
    null;

  useEffect(() => {
    const routeTargetId = typeof route?.targetId === "string" ? route.targetId : "";
    if (!routeTargetId) {
      return;
    }
    if (browserTargets.some((target) => target.id === routeTargetId)) {
      workspace.selectTarget(routeTargetId);
    }
  }, [browserTargets, route?.targetId, workspace]);

  useEffect(() => {
    if (!workspace.isCreatingTarget) {
      if (
        workspace.selectedTargetId &&
        browserTargets.some((target) => target.id === workspace.selectedTargetId)
      ) {
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

  function openRemotes() {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId: "test-modules-remote-ops" }, { replace: false });
  }

  const domainsWorkspace = {
    ...workspace,
    targets: browserTargets,
    startNewTarget() {
      workspace.startNewTarget();
    },
    changeTargetField(fieldId, value) {
      if (fieldId === "targetKind") {
        workspace.changeTargetField(fieldId, "browser-delivery");
        return;
      }
      workspace.changeTargetField(fieldId, value);
    }
  };

  return (
    <Stack spacing={2}>
      <Hero />
      <Alert severity="info">
        This desk is a focused surface over the existing browser-delivery targets in Remotes. Connections and other
        target kinds remain managed in the Remotes desk.
      </Alert>
      <DomainOverviewPanel selectedTarget={selectedBrowserTarget} targets={workspace.targets} />
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" onClick={openRemotes}>
          Open Remotes
        </Button>
      </Stack>
      {workspace.errorMessage ? <Alert severity="error">{workspace.errorMessage}</Alert> : null}
      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", xl: 320 }, flexShrink: 0 }}>
          <TargetList workspace={domainsWorkspace} />
        </Stack>
        <Stack sx={{ flex: 1, width: "100%" }}>
          <TargetEditor workspace={domainsWorkspace} />
        </Stack>
      </Stack>
    </Stack>
  );
}
