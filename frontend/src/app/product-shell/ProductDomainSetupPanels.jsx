import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Drawer,
  FormControlLabel,
  FormGroup,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { buildTemporaryArtifactUrl } from "../../../../modules/test-modules-remote-ops/shared/browser-delivery-support.mjs";

function getDomainStateTone(state) {
  if (state === "compatible" || state === "ready") {
    return "success";
  }
  if (state === "blocked") {
    return "error";
  }
  if (state === "action-required" || state === "missing") {
    return "warning";
  }
  return "default";
}

function getDnsInstructions(descriptor, deliveryReport) {
  if (Array.isArray(deliveryReport?.dnsInstructions) && deliveryReport.dnsInstructions.length > 0) {
    return deliveryReport.dnsInstructions;
  }
  return descriptor?.dnsInstruction ? [descriptor.dnsInstruction] : [];
}

function getBrowserStageActions(bundleReport, targetId) {
  return Array.isArray(bundleReport?.provisionableActions)
    ? bundleReport.provisionableActions.filter(
        (action) =>
          action?.targetId === targetId &&
          action?.createSupported === true &&
          action?.phaseStatus === "execution-started"
      )
    : [];
}

function buildExampleLinks(descriptor, deploymentTarget) {
  const temporaryPostUrl = buildTemporaryArtifactUrl(
    deploymentTarget?.config?.bucketName,
    deploymentTarget?.config?.prefix,
    "post/example-post/index.html"
  );
  const temporaryCategoryUrl = buildTemporaryArtifactUrl(
    deploymentTarget?.config?.bucketName,
    deploymentTarget?.config?.prefix,
    "category/example-category/index.html"
  );
  const temporaryMediaUrl = descriptor?.temporaryMediaBaseUrl
    ? `${descriptor.temporaryMediaBaseUrl}/example-image.webp`
    : null;

  if (descriptor?.accessMode === "custom-domain") {
    return {
      modeLabel: "Live domain",
      postUrl: descriptor?.publicOrigin ? `${descriptor.publicOrigin}/post/example-post` : null,
      categoryUrl: descriptor?.publicOrigin ? `${descriptor.publicOrigin}/category/example-category` : null,
      mediaUrl: descriptor?.publicMediaBaseUrl ? `${descriptor.publicMediaBaseUrl}/example-image.webp` : null,
      temporaryPostUrl,
      temporaryCategoryUrl,
      temporaryMediaUrl
    };
  }

  return {
    modeLabel: "Testing mode",
    postUrl: temporaryPostUrl,
    categoryUrl: temporaryCategoryUrl,
    mediaUrl: temporaryMediaUrl,
    temporaryPostUrl,
    temporaryCategoryUrl,
    temporaryMediaUrl
  };
}

function resolveCurrentTruth({ descriptor, bundleReport }) {
  if (!descriptor) {
    return { severity: "info", message: "Create a public address to see what readers can open." };
  }
  if (descriptor.accessMode === "gcp-temporary") {
    return {
      severity: "info",
      message: "Readers can use temporary provider-owned URLs today. This is testing mode, not the final public address."
    };
  }
  if (!descriptor.hostname) {
    return {
      severity: "warning",
      message: "This address is set to live-domain mode, but no hostname is configured yet."
    };
  }
  if (!bundleReport) {
    return {
      severity: "info",
      message: "A hostname is configured, but the live delivery stack has not been analyzed yet."
    };
  }
  if (bundleReport.state === "ready") {
    return { severity: "success", message: "This hostname is ready to be the public face of the site." };
  }
  if (bundleReport.state === "blocked") {
    return { severity: "error", message: "This hostname is configured, but a blocking issue is stopping it from going live." };
  }
  return {
    severity: "warning",
    message: "The hostname is configured, but it still needs work before it should be treated as fully live."
  };
}

function ExampleLinkCard({ title, url, modeLabel }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="subtitle2">{title}</Typography>
          <Chip size="small" variant="outlined" label={modeLabel} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
          {url ?? "Not available yet"}
        </Typography>
        {url ? (
          <Button component="a" href={url} target="_blank" rel="noreferrer" variant="text" sx={{ alignSelf: "flex-start" }}>
            Open
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function PublicAddressSidebar({ targets, selectedTargetId, descriptor, bundleReport, onSelectTarget, onCreateAddress }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={0.35}>
            <Typography variant="h6">Public Addresses</Typography>
            <Typography variant="body2" color="text.secondary">
              Testing URLs and real domains live here.
            </Typography>
          </Stack>
          <Button variant="outlined" size="small" onClick={onCreateAddress}>
            New Address
          </Button>
        </Stack>
        {targets.length === 0 ? (
          <Alert severity="info">No public addresses yet.</Alert>
        ) : (
          <List dense disablePadding>
            {targets.map((target) => {
              const isSelected = target.id === selectedTargetId;
              const currentDescriptor = isSelected ? descriptor : null;
              const currentBundle = isSelected ? bundleReport : null;
              const secondaryLine =
                currentDescriptor?.accessMode === "custom-domain"
                  ? target?.config?.hostname || "No hostname yet"
                  : currentDescriptor?.publicOrigin || "Testing mode";
              return (
                <ListItemButton
                  key={target.id}
                  selected={isSelected}
                  onClick={() => onSelectTarget(target.id)}
                  sx={{ borderRadius: 1, mb: 0.75, alignItems: "flex-start", border: "1px solid", borderColor: "divider" }}
                >
                  <ListItemText
                    primary={target.title}
                    secondaryTypographyProps={{ component: "div" }}
                    secondary={(
                      <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          <Chip
                            size="small"
                            color={(currentDescriptor?.accessMode ?? target?.config?.accessMode) === "custom-domain" ? "success" : "info"}
                            label={(currentDescriptor?.accessMode ?? target?.config?.accessMode) === "custom-domain" ? "Live domain" : "Testing mode"}
                          />
                          <Chip size="small" variant="outlined" label={currentBundle?.state ? `Readiness ${currentBundle.state}` : "Not analyzed"} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {secondaryLine}
                        </Typography>
                      </Stack>
                    )}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Stack>
    </Paper>
  );
}

export function PublicAddressSummaryPanel({ selectedTarget, descriptor, deploymentTarget, bundleReport, onEditAddress }) {
  if (!selectedTarget) {
    return (
      <Alert severity="info">
        Create a public address first. This desk will then answer what readers can open today and what still needs to happen before the site is truly live.
      </Alert>
    );
  }

  const truth = resolveCurrentTruth({ descriptor, bundleReport });
  const examples = buildExampleLinks(descriptor, deploymentTarget);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Stack spacing={0.35}>
                <Typography variant="subtitle1">What Readers Can Open Today</Typography>
                <Typography variant="body2" color="text.secondary">
                  This is the public truth for the selected address: what works right now, whether it is testing or real, and what the main reader-facing links look like.
                </Typography>
              </Stack>
              <Button variant="outlined" onClick={onEditAddress}>
                Edit Address
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" color={descriptor?.accessMode === "custom-domain" ? "success" : "info"} label={examples.modeLabel} />
              <Chip size="small" variant="outlined" label={descriptor?.hostname ? `Hostname ${descriptor.hostname}` : "No hostname yet"} />
              <Chip size="small" variant="outlined" label={descriptor?.publicOrigin ? "Pages browseable" : "Pages not browseable yet"} />
              <Chip size="small" variant="outlined" label={descriptor?.publicMediaBaseUrl ? "Media browseable" : "Media not browseable yet"} />
            </Stack>

            <Alert severity={truth.severity}>{truth.message}</Alert>

            {descriptor?.publicOrigin ? (
              <Typography variant="body2" color="text.secondary">
                Current public root: {descriptor.publicOrigin}
              </Typography>
            ) : null}
            {descriptor?.temporaryDeploymentBaseUrl ? (
              <Typography variant="body2" color="text.secondary">
                Temporary HTML base: {descriptor.temporaryDeploymentBaseUrl}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <ExampleLinkCard title="Post page" url={examples.postUrl} modeLabel={examples.modeLabel} />
        <ExampleLinkCard title="Category page" url={examples.categoryUrl} modeLabel={examples.modeLabel} />
        <ExampleLinkCard title="Media file" url={examples.mediaUrl} modeLabel={examples.modeLabel} />
      </Stack>
    </Stack>
  );
}

function StatusLine({ label, value, tone = "default" }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
      <Stack spacing={0.35}>
        <Typography variant="subtitle2">{label}</Typography>
        <Chip size="small" color={tone} label={value} sx={{ alignSelf: "flex-start" }} />
      </Stack>
    </Paper>
  );
}

function GoLiveStepCard({ title, description, tone, detail, children = null }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="subtitle2">{title}</Typography>
          <Chip
            size="small"
            color={tone}
            label={tone === "success" ? "Ready" : tone === "warning" ? "Action Needed" : tone === "error" ? "Blocked" : tone === "info" ? "Info" : "Waiting"}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {detail ? (
          <Typography variant="caption" color="text.secondary">
            {detail}
          </Typography>
        ) : null}
        {children}
      </Stack>
    </Paper>
  );
}

export function GoLiveChecklistPanel({
  workspace,
  selectedTarget,
  descriptor,
  bundleReport,
  deliveryReport,
  onOpenRemotes,
  onOpenDeployments,
  onEditAddress
}) {
  if (!selectedTarget) {
    return null;
  }

  const dnsInstructions = getDnsInstructions(descriptor, deliveryReport);
  const nameServers = Array.isArray(deliveryReport?.nameServers) ? deliveryReport.nameServers.filter(Boolean) : [];
  const readyActions = getBrowserStageActions(bundleReport, selectedTarget.id).filter((action) => action.availableNow === true);
  const blockedActions = getBrowserStageActions(bundleReport, selectedTarget.id).filter((action) => action.availableNow !== true);
  const safeguardRules = Array.isArray(workspace.compatibilityReport?.safeguardRules) ? workspace.compatibilityReport.safeguardRules : [];
  const safeguardsConfirmed =
    safeguardRules.length === 0 || safeguardRules.every((rule) => (workspace.confirmedSafeguardIds ?? []).includes(rule.id));
  const certificateWaiting = Array.isArray(bundleReport?.configurationWarnings)
    ? bundleReport.configurationWarnings.some((warning) => String(warning).toLowerCase().includes("certificate"))
    : false;
  const isTemporary = descriptor?.accessMode === "gcp-temporary";
  const isManagedDns = descriptor?.dnsMode === "gcp-managed";
  const canAnalyze =
    Boolean(workspace.selectedConnectionId) &&
    workspace.connectionDraft.connectionStatus === "validated" &&
    !workspace.compatibilityActionState.processing &&
    !workspace.provisioningActionState.processing;
  const canPrepare =
    Boolean(workspace.selectedConnectionId) &&
    workspace.connectionDraft.connectionStatus === "validated" &&
    !workspace.compatibilityActionState.processing &&
    !workspace.provisioningActionState.processing &&
    safeguardsConfirmed;
  const latestMissingCount = Array.isArray(bundleReport?.missingResources) ? bundleReport.missingResources.length : 0;

  async function handlePrepareDomain() {
    const analysisPayload = await workspace.analyzeSelectedConnectionCompatibility();
    const nextReport = analysisPayload?.report ?? workspace.compatibilityReport;
    const nextBundleReport = Array.isArray(nextReport?.bundles)
      ? nextReport.bundles.find((bundle) => bundle?.id === "browser-delivery") ?? null
      : null;
    const nextReadyActionIds = getBrowserStageActions(nextBundleReport, selectedTarget.id)
      .filter((action) => action.availableNow === true)
      .map((action) => action.id);
    if (nextReadyActionIds.length === 0) {
      return;
    }
    await workspace.provisionSelectedConnectionCompatibility(nextReadyActionIds);
  }

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Stack spacing={0.35}>
                <Typography variant="subtitle1">Go Live Checklist</Typography>
                <Typography variant="body2" color="text.secondary">
                  This tells the truth about whether the selected address is still in testing mode or ready to become the public face of the site.
                </Typography>
              </Stack>
              <Button variant="outlined" onClick={onEditAddress}>
                Edit Address
              </Button>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <StatusLine label="Public mode" value={isTemporary ? "Testing mode" : "Live domain mode"} tone={isTemporary ? "info" : "success"} />
              <StatusLine label="Pages" value={descriptor?.publicUrl ? "Browseable" : "Not browseable yet"} tone={descriptor?.publicUrl ? "success" : "warning"} />
              <StatusLine label="Media" value={descriptor?.publicMediaBaseUrl ? "Browseable" : "Not browseable yet"} tone={descriptor?.publicMediaBaseUrl ? "success" : "warning"} />
              <StatusLine
                label="Certificate"
                value={isTemporary ? "Not needed" : certificateWaiting ? "Still waiting" : bundleReport?.state === "ready" ? "Ready" : "Unknown"}
                tone={isTemporary ? "default" : certificateWaiting ? "warning" : bundleReport?.state === "ready" ? "success" : "default"}
              />
            </Stack>

            {isTemporary ? (
              <Alert severity="info">This address is still in testing mode. Readers can open it today, but it is not the final public hostname.</Alert>
            ) : bundleReport?.state === "ready" ? (
              <Alert severity="success">This hostname is ready to be the public address for the site.</Alert>
            ) : !bundleReport ? (
              <Alert severity="info">Analyze this address to find out what still needs to happen before it can go live.</Alert>
            ) : (
              <Alert severity={bundleReport.state === "blocked" ? "error" : "warning"}>
                This hostname still needs work before it should be treated as fully live.
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack spacing={0.35}>
              <Typography variant="subtitle1">What Happens Next</Typography>
              <Typography variant="body2" color="text.secondary">
                This flow is split cleanly between product-owned setup on Google and the one registrar change the operator still controls.
              </Typography>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <GoLiveStepCard
                title="1. Product-Owned Setup"
                tone={
                  isTemporary
                    ? "info"
                    : bundleReport?.state === "ready" || (latestMissingCount === 0 && readyActions.length === 0)
                      ? "success"
                      : workspace.connectionDraft.connectionStatus !== "validated"
                        ? "warning"
                        : "warning"
                }
                description={
                  isTemporary
                    ? "Testing mode does not need Google delivery setup."
                    : latestMissingCount > 0 || readyActions.length > 0
                      ? "Press the prepare action. The app will create and wire the Google delivery resources for this hostname."
                      : "The Google-side delivery resources are already in place for this hostname."
                }
                detail={
                  isTemporary
                    ? "No domain stack is required."
                    : workspace.connectionDraft.connectionStatus !== "validated"
                      ? "Validate the selected remote connection first."
                      : readyActions.length > 0
                        ? `${readyActions.length} setup action${readyActions.length === 1 ? "" : "s"} can be executed now.`
                        : "The app has no remaining create actions to run for this hostname."
                }
              />
              <GoLiveStepCard
                title="2. Registrar Step"
                tone={
                  isTemporary
                    ? "info"
                    : isManagedDns
                      ? nameServers.length > 0
                        ? "warning"
                        : "info"
                      : dnsInstructions.length > 0
                        ? "warning"
                        : "info"
                }
                description={
                  isTemporary
                    ? "No registrar change is needed in testing mode."
                    : isManagedDns
                      ? nameServers.length > 0
                        ? "Point the domain to these Google-managed name servers. The app already owns the zone records after preparation."
                        : "After prepare runs, this desk will show the exact Google name servers to use."
                      : "Use the exact records below at your current DNS provider."
                }
                detail={
                  isTemporary
                    ? "Temporary provider URLs stay active."
                    : isManagedDns
                      ? nameServers.length > 0
                        ? "Do not create registrar A or CNAME records manually for this hostname."
                        : "The nameserver instruction appears only after the managed zone exists."
                      : "External DNS keeps nameservers unchanged."
                }
              >
                {!isTemporary && isManagedDns && nameServers.length > 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    Name servers: {nameServers.join(", ")}
                  </Typography>
                ) : null}
              </GoLiveStepCard>
              <GoLiveStepCard
                title="3. Public HTTPS"
                tone={isTemporary ? "default" : bundleReport?.state === "ready" ? "success" : certificateWaiting ? "warning" : "info"}
                description={
                  isTemporary
                    ? "Testing mode does not wait on a certificate."
                    : bundleReport?.state === "ready"
                      ? "Readers can now use the real public hostname."
                      : certificateWaiting
                        ? "Google is still waiting for DNS delegation and certificate activation to settle."
                        : "Public HTTPS is still waiting on the earlier steps."
                }
                detail={
                  isTemporary
                    ? "You can open the temporary site immediately."
                    : certificateWaiting
                      ? "Once delegation propagates, the managed certificate should become active automatically."
                      : "This card will turn ready when the hostname is genuinely live."
                }
              />
            </Stack>

            {isTemporary ? (
              <Alert severity="info">Testing mode needs no DNS records. The temporary provider URLs are the current public path.</Alert>
            ) : dnsInstructions.length > 0 ? (
              <Stack spacing={1}>
                <Alert severity={isManagedDns ? "info" : "warning"}>
                  {isManagedDns
                    ? "Point the registrar to the Google name servers shown here. The app will create and maintain the needed zone records on Google."
                    : "Create or verify these exact records at your DNS provider."}
                </Alert>
                {dnsInstructions.map((instruction) => (
                  <Paper key={`${instruction.label}-${instruction.recordName}-${instruction.recordType}`} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack spacing={0.35}>
                      <Typography variant="subtitle2">{instruction.label ?? "DNS record"}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {instruction.recordType} {instruction.recordName} {"->"} {instruction.recordValue}
                      </Typography>
                      {(instruction.notes ?? []).map((note) => (
                        <Typography key={note} variant="caption" color="text.secondary">
                          {note}
                        </Typography>
                      ))}
                    </Stack>
                  </Paper>
                ))}
                {nameServers.length > 0 ? (
                  <Paper variant="outlined" sx={{ p: 1.25 }}>
                    <Typography variant="subtitle2">Name servers to point the domain to</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                      {nameServers.join(", ")}
                    </Typography>
                  </Paper>
                ) : null}
              </Stack>
            ) : (
              <Alert severity="info">
                No exact records are available yet. Analyze this address first so the desk can show the required values instead of asking the operator to guess.
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack spacing={0.35}>
              <Typography variant="subtitle1">Bring This Live</Typography>
              <Typography variant="body2" color="text.secondary">
                The product can inspect the domain, create the Google delivery pieces, and then tell you the single registrar step that remains outside the app.
              </Typography>
            </Stack>

            {workspace.compatibilityActionState.errorMessage ? <Alert severity="error">{workspace.compatibilityActionState.errorMessage}</Alert> : null}
            {workspace.compatibilityActionState.successMessage ? <Alert severity="success">{workspace.compatibilityActionState.successMessage}</Alert> : null}
            {workspace.provisioningActionState.errorMessage ? <Alert severity="error">{workspace.provisioningActionState.errorMessage}</Alert> : null}
            {workspace.provisioningActionState.successMessage ? <Alert severity="success">{workspace.provisioningActionState.successMessage}</Alert> : null}

            {bundleReport ? (
              <Stack spacing={0.5}>
                {(bundleReport.missingResources ?? []).map((resource) => (
                  <Typography key={`${resource.kind}-${resource.label ?? resource.resourceName}`} variant="body2" color="text.secondary">
                    Missing: {resource.label ?? resource.resourceName ?? resource.kind}
                  </Typography>
                ))}
                {(bundleReport.configurationWarnings ?? []).map((warning) => (
                  <Typography key={warning} variant="body2" color="text.secondary">
                    {warning}
                  </Typography>
                ))}
                {(bundleReport.permissionDiagnostics ?? []).map((diagnostic) => (
                  <Typography key={diagnostic.summary} variant="body2" color="text.secondary">
                    {diagnostic.summary}
                  </Typography>
                ))}
              </Stack>
            ) : null}

            {safeguardRules.length > 0 ? (
              <FormGroup>
                {safeguardRules.map((rule) => (
                  <FormControlLabel
                    key={rule.id}
                    control={<Checkbox checked={(workspace.confirmedSafeguardIds ?? []).includes(rule.id)} onChange={() => workspace.toggleProvisioningSafeguard(rule.id)} />}
                    label={(
                      <Stack spacing={0.15}>
                        <Typography variant="body2">{rule.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rule.description}
                        </Typography>
                      </Stack>
                    )}
                  />
                ))}
              </FormGroup>
            ) : null}

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={workspace.analyzeSelectedConnectionCompatibility}
                disabled={!canAnalyze}
              >
                {workspace.compatibilityActionState.processing ? "Analyzing..." : "Analyze Domain State"}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handlePrepareDomain}
                disabled={!canPrepare}
              >
                {workspace.provisioningActionState.processing ? "Preparing..." : "Prepare This Domain On Google"}
              </Button>
              <Button variant="text" onClick={onOpenRemotes}>Open Remotes</Button>
              <Button variant="text" onClick={onOpenDeployments}>Open Deployments</Button>
            </Stack>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" variant="outlined" label={`Ready actions ${readyActions.length}`} />
              <Chip size="small" variant="outlined" label={`Blocked actions ${blockedActions.length}`} />
              {latestMissingCount > 0 ? <Chip size="small" variant="outlined" label={`Missing pieces ${latestMissingCount}`} /> : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
export function PublicAddressEditorDrawer({ open, onClose, workspace, connections, deploymentTargets, mediaTargets }) {
  const draft = workspace.targetDraft;
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowAdvanced(false);
    }
  }, [open]);

  const filteredDeploymentTargets = deploymentTargets.filter(
    (target) => !draft.connectionProfileId || target.connectionProfileId === draft.connectionProfileId
  );
  const filteredMediaTargets = mediaTargets.filter(
    (target) => !draft.connectionProfileId || target.connectionProfileId === draft.connectionProfileId
  );
  const isLiveDomain = draft.config.accessMode === "custom-domain";

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Stack spacing={2} sx={{ width: { xs: "100vw", sm: 560 }, p: 2.5 }}>
        <Stack spacing={0.35}>
          <Typography variant="h6">{workspace.isCreatingTarget ? "New Public Address" : draft.title || "Public Address"}</Typography>
          <Typography variant="body2" color="text.secondary">
            Decide whether readers are using a testing address or a real hostname, then bind that address to the public HTML and media services.
          </Typography>
        </Stack>

        {workspace.targetActionState.errorMessage ? <Alert severity="error">{workspace.targetActionState.errorMessage}</Alert> : null}
        {workspace.targetActionState.successMessage ? <Alert severity="success">{workspace.targetActionState.successMessage}</Alert> : null}

        <TextField label="Address Name" value={draft.title} onChange={(event) => workspace.changeTargetField("title", event.target.value)} fullWidth />

        <TextField select label="Remote Connection" value={draft.connectionProfileId ?? ""} onChange={(event) => workspace.changeTargetField("connectionProfileId", event.target.value)} fullWidth>
          {connections.map((connection) => (
            <MenuItem key={connection.id} value={connection.id}>
              {connection.profileName}
            </MenuItem>
          ))}
        </TextField>

        <TextField select label="How Readers Reach The Site" value={draft.config.accessMode ?? "gcp-temporary"} onChange={(event) => workspace.changeTargetConfigField("accessMode", event.target.value)} fullWidth>
          <MenuItem value="gcp-temporary">Testing address</MenuItem>
          <MenuItem value="custom-domain">Real domain</MenuItem>
        </TextField>

        {isLiveDomain ? (
          <Stack spacing={2}>
            <TextField label="Hostname" value={draft.config.hostname ?? ""} onChange={(event) => workspace.changeTargetConfigField("hostname", event.target.value)} helperText="Example: fastcart.dev" fullWidth />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField select label="DNS Ownership" value={draft.config.dnsMode ?? "external"} onChange={(event) => workspace.changeTargetConfigField("dnsMode", event.target.value)} helperText={draft.config.dnsMode === "gcp-managed" ? "The app will create the Cloud DNS zone and then tell the operator which Google name servers to use." : "Keep your current nameservers and create the shown records at your DNS provider."} fullWidth>
                <MenuItem value="external">External DNS provider</MenuItem>
                <MenuItem value="gcp-managed">Google-managed DNS</MenuItem>
              </TextField>
              <TextField select label="Delivery Stack" value={draft.config.stackMode ?? "direct-storage"} onChange={(event) => workspace.changeTargetConfigField("stackMode", event.target.value)} helperText="Use HTTPS load balancer for clean public routes and managed certificates." fullWidth>
                <MenuItem value="direct-storage">Direct storage</MenuItem>
                <MenuItem value="https-load-balancer">HTTPS load balancer</MenuItem>
              </TextField>
            </Stack>
            {draft.config.dnsMode === "gcp-managed" ? (
              <Alert severity="info">
                After saving this address, open <strong>Go Live</strong>. The app will prepare the Google DNS and delivery resources, then show the exact nameservers to point the domain to.
              </Alert>
            ) : null}
          </Stack>
        ) : (
          <Alert severity="info">Testing mode uses provider-owned URLs. This is useful for review, but it is not the final public address.</Alert>
        )}

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField select label="Public HTML Target" value={draft.config.deploymentTargetProfileId ?? ""} onChange={(event) => workspace.changeTargetConfigField("deploymentTargetProfileId", event.target.value)} fullWidth>
            {filteredDeploymentTargets.map((target) => (
              <MenuItem key={target.id} value={target.id}>
                {target.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Media Library Target" value={draft.config.mediaTargetProfileId ?? ""} onChange={(event) => workspace.changeTargetConfigField("mediaTargetProfileId", event.target.value)} fullWidth>
            {filteredMediaTargets.map((target) => (
              <MenuItem key={target.id} value={target.id}>
                {target.title}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Button variant="text" onClick={() => setShowAdvanced((previous) => !previous)} sx={{ alignSelf: "flex-start" }}>
          {showAdvanced ? "Hide Advanced Browser Fields" : "Show Advanced Browser Fields"}
        </Button>

        {showAdvanced ? (
          <Stack spacing={2}>
            <TextField label="Application API Origin" value={draft.config.applicationApiOrigin ?? ""} onChange={(event) => workspace.changeTargetConfigField("applicationApiOrigin", event.target.value)} fullWidth />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Firebase Project ID" value={draft.config.firebaseProjectId ?? ""} onChange={(event) => workspace.changeTargetConfigField("firebaseProjectId", event.target.value)} fullWidth />
              <TextField label="Firebase API Key" value={draft.config.firebaseApiKey ?? ""} onChange={(event) => workspace.changeTargetConfigField("firebaseApiKey", event.target.value)} fullWidth />
            </Stack>
            <TextField label="Firebase App ID" value={draft.config.firebaseAppId ?? ""} onChange={(event) => workspace.changeTargetConfigField("firebaseAppId", event.target.value)} fullWidth />
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1} justifyContent="flex-end" useFlexGap flexWrap="wrap">
          <Button variant="text" onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={workspace.saveTarget} disabled={workspace.targetActionState.saving}>
            {workspace.targetActionState.saving ? "Saving..." : "Save Address"}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
