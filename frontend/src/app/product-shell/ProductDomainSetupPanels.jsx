import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  Typography
} from "@mui/material";

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
  if (descriptor?.dnsInstruction) {
    return [descriptor.dnsInstruction];
  }
  return [];
}

function getNameServers(deliveryReport) {
  return Array.isArray(deliveryReport?.nameServers) ? deliveryReport.nameServers.filter(Boolean) : [];
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

function ServiceCard({ title, primary, details = [] }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
      <Stack spacing={0.35}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {primary}
        </Typography>
        {details.filter(Boolean).map((detail) => (
          <Typography key={detail} variant="caption" color="text.secondary">
            {detail}
          </Typography>
        ))}
      </Stack>
    </Paper>
  );
}

export function DomainSummaryPanel({
  selectedTarget,
  selectedConnection,
  descriptor,
  bundleReport,
  deliveryReport
}) {
  if (!selectedTarget) {
    return (
      <Alert severity="info">
        Create or select a browser-delivery target. This desk will then show the public origin, DNS work, linked
        HTML/media services, and the current HTTPS delivery-stack readiness.
      </Alert>
    );
  }

  const bundleState = bundleReport?.state ?? "not-analyzed";
  const readyActionCount = getBrowserStageActions(bundleReport, selectedTarget.id).filter(
    (action) => action.availableNow === true
  ).length;
  const missingResourceCount = Array.isArray(bundleReport?.missingResources) ? bundleReport.missingResources.length : 0;
  const permissionIssueCount = Array.isArray(bundleReport?.permissionDiagnostics)
    ? bundleReport.permissionDiagnostics.length
    : 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.35}>
              <Typography variant="h6">Current Delivery View</Typography>
              <Typography variant="body2" color="text.secondary">
                Domain target, public origin, and current browser-delivery readiness for the selected setup.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" label={descriptor.accessMode} variant="outlined" />
              <Chip size="small" label={descriptor.stackMode} variant="outlined" />
              <Chip size="small" label={descriptor.dnsMode} variant="outlined" />
              <Chip size="small" color={getDomainStateTone(bundleState)} label={`bundle ${bundleState}`} />
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" variant="outlined" label={`Target ${selectedTarget.title}`} />
            <Chip
              size="small"
              variant="outlined"
              label={`Connection ${selectedConnection?.profileName ?? "not selected"}`}
            />
            <Chip size="small" variant="outlined" label={`Missing resources ${missingResourceCount}`} />
            <Chip size="small" variant="outlined" label={`Permission notes ${permissionIssueCount}`} />
            <Chip size="small" variant="outlined" label={`Ready actions ${readyActionCount}`} />
          </Stack>

          <Stack spacing={0.35}>
            {descriptor.publicOrigin ? (
              <Typography variant="body2" color="text.secondary">
                Public origin: {descriptor.publicOrigin}
              </Typography>
            ) : null}
            {descriptor.applicationApiOrigin ? (
              <Typography variant="body2" color="text.secondary">
                Application API origin: {descriptor.applicationApiOrigin}
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
            {deliveryReport?.nameServers?.length > 0 ? (
              <Typography variant="body2" color="text.secondary">
                Name servers: {deliveryReport.nameServers.join(", ")}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function AccessModePanel({ descriptor, selectedTarget }) {
  if (!selectedTarget) {
    return null;
  }

  const customDomainActive = descriptor.accessMode === "custom-domain";
  const temporaryActive = descriptor.accessMode === "gcp-temporary";

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Access Modes</Typography>
            <Typography variant="body2" color="text.secondary">
              Custom domains are the owned public path. Temporary GCP URLs remain useful for preview and fallback
              inspection.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                  <Typography variant="subtitle2">Owned custom domain</Typography>
                  <Chip size="small" color={customDomainActive ? "success" : "default"} label={customDomainActive ? "active" : "inactive"} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {customDomainActive
                    ? "Browser traffic is intended to resolve through the configured hostname."
                    : "This target currently uses temporary GCP access instead of an owned public hostname."}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Hostname: {selectedTarget?.config?.hostname || "not configured"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Stack: {descriptor.stackMode}
                </Typography>
                {descriptor.publicOrigin ? (
                  <Typography variant="caption" color="text.secondary">
                    Public origin: {descriptor.publicOrigin}
                  </Typography>
                ) : null}
                {descriptor.applicationApiOrigin ? (
                  <Typography variant="caption" color="text.secondary">
                    Application API origin: {descriptor.applicationApiOrigin}
                  </Typography>
                ) : null}
                {descriptor.publicMediaBaseUrl ? (
                  <Typography variant="caption" color="text.secondary">
                    Public media base: {descriptor.publicMediaBaseUrl}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                  <Typography variant="subtitle2">Temporary GCP access</Typography>
                  <Chip size="small" color={temporaryActive ? "success" : "default"} label={temporaryActive ? "active" : "available"} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Direct bucket/object URLs for smoke access, fallback validation, and non-canonical browser testing.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  HTML base: {descriptor.temporaryDeploymentBaseUrl || "not available"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Media base: {descriptor.temporaryMediaBaseUrl || "not available"}
                </Typography>
                {temporaryActive && descriptor.publicUrl ? (
                  <Typography variant="caption" color="text.secondary">
                    Example temporary HTML URL: {descriptor.publicUrl}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DnsInstructionsPanel({ selectedTarget, descriptor, deliveryReport, bundleReport }) {
  if (!selectedTarget) {
    return null;
  }

  const dnsInstructions = getDnsInstructions(descriptor, deliveryReport);
  const nameServers = getNameServers(deliveryReport);
  const isTemporary = descriptor.accessMode === "gcp-temporary";
  const isGcpManaged = descriptor.dnsMode === "gcp-managed";
  const bundleState = bundleReport?.state ?? "not-analyzed";

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.35}>
            <Typography variant="h6">DNS And Provider Steps</Typography>
            <Typography variant="body2" color="text.secondary">
              The browser-delivery target decides whether the operator owns a hostname or stays on temporary GCP URLs.
            </Typography>
          </Stack>

          {isTemporary ? (
            <Alert severity="info">Temporary GCP access mode requires no DNS work. Use the temporary deployment and media URLs shown above.</Alert>
          ) : (
            <>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" variant="outlined" label={`DNS mode ${descriptor.dnsMode}`} />
                <Chip size="small" variant="outlined" label={`Stack ${descriptor.stackMode}`} />
                <Chip size="small" color={getDomainStateTone(bundleState)} label={`bundle ${bundleState}`} />
              </Stack>

              <Alert severity={isGcpManaged ? "success" : "info"}>
                {isGcpManaged
                  ? "GCP-managed DNS mode keeps the zone and traffic records inside Cloud DNS when provisioning is allowed."
                  : "External DNS mode expects the operator to create the shown records at the current DNS provider."}
              </Alert>

              {dnsInstructions.length > 0 ? (
                <Stack spacing={1}>
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
                </Stack>
              ) : (
                <Alert severity="info">
                  No concrete DNS records are available yet. Run compatibility analysis to resolve reserved global IP,
                  certificate authorization, and managed-zone details for this hostname.
                </Alert>
              )}

              {nameServers.length > 0 ? (
                <Paper variant="outlined" sx={{ p: 1.25 }}>
                  <Stack spacing={0.35}>
                    <Typography variant="subtitle2">Managed zone delegation</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Name servers: {nameServers.join(", ")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Delegate the hostname or matching parent zone to these name servers if this hostname is kept on
                      Cloud DNS.
                    </Typography>
                  </Stack>
                </Paper>
              ) : null}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ServicePathsPanel({ descriptor, deploymentTarget, mediaTarget, projectionTargets }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Service Paths</Typography>
            <Typography variant="body2" color="text.secondary">
              Public browser paths, fallback URLs, and remote data surfaces currently bound to this delivery stack.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <ServiceCard
              title="HTML Service"
              primary={deploymentTarget?.title ?? "No linked deployment target"}
              details={[
                descriptor.publicOrigin ? `Public origin: ${descriptor.publicOrigin}` : null,
                descriptor.publicUrl ? `Example page URL: ${descriptor.publicUrl}` : null,
                descriptor.temporaryDeploymentBaseUrl
                  ? `Temporary deployment base: ${descriptor.temporaryDeploymentBaseUrl}`
                  : null,
                deploymentTarget?.config?.bucketName ? `Bucket: ${deploymentTarget.config.bucketName}` : null,
                deploymentTarget?.config?.prefix ? `Prefix: ${deploymentTarget.config.prefix}` : null
              ]}
            />
            <ServiceCard
              title="Media Service"
              primary={mediaTarget?.title ?? "No linked media target"}
              details={[
                descriptor.publicMediaBaseUrl ? `Public media base: ${descriptor.publicMediaBaseUrl}` : null,
                descriptor.temporaryMediaBaseUrl ? `Temporary media base: ${descriptor.temporaryMediaBaseUrl}` : null,
                mediaTarget?.config?.bucketName ? `Bucket: ${mediaTarget.config.bucketName}` : null,
                mediaTarget?.config?.prefix ? `Prefix: ${mediaTarget.config.prefix}` : null
              ]}
            />
          </Stack>

          <Paper variant="outlined" sx={{ p: 1.25 }}>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">Remote Data Surfaces</Typography>
              {projectionTargets.length > 0 ? (
                projectionTargets.map((target) => (
                  <Typography key={target.id} variant="body2" color="text.secondary">
                    {target.title}: {target.firestoreCollectionPath} ({target.projectionScope})
                  </Typography>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No validated Firestore projection targets are bound to this remote yet.
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                Firestore collection paths are remote data surfaces, not browser-routed URLs.
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DomainProvisioningCard({
  workspace,
  bundleReport,
  selectedTarget,
  onOpenRemotes,
  onOpenDeployments
}) {
  if (!selectedTarget) {
    return null;
  }

  const readyActions = getBrowserStageActions(bundleReport, selectedTarget.id).filter(
    (action) => action.availableNow === true
  );
  const blockedActions = getBrowserStageActions(bundleReport, selectedTarget.id).filter(
    (action) => action.availableNow !== true
  );
  const safeguardRules = Array.isArray(workspace.compatibilityReport?.safeguardRules)
    ? workspace.compatibilityReport.safeguardRules
    : [];
  const safeguardsConfirmed =
    safeguardRules.length === 0 ||
    safeguardRules.every((rule) => (workspace.confirmedSafeguardIds ?? []).includes(rule.id));
  const hasValidatedConnection = workspace.connectionDraft.connectionStatus === "validated";

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.35}>
              <Typography variant="h6">HTTPS Stack Readiness</Typography>
              <Typography variant="body2" color="text.secondary">
                Delivery-stack inspection, missing resource pressure, and bounded provisioning for the selected domain target.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                size="small"
                color={getDomainStateTone(bundleReport?.state ?? "not-analyzed")}
                label={`bundle ${bundleReport?.state ?? "not-analyzed"}`}
              />
              <Chip size="small" variant="outlined" label={`Ready actions ${readyActions.length}`} />
              <Chip size="small" variant="outlined" label={`Blocked actions ${blockedActions.length}`} />
            </Stack>
          </Stack>

          {!hasValidatedConnection ? (
            <Alert severity="warning">
              Validate the linked remote connection before analyzing or provisioning this domain stack.
            </Alert>
          ) : null}

          {!bundleReport ? (
            <Alert severity="info">
              Run compatibility analysis to inspect DNS, certificate, backend-bucket, and HTTPS routing resources for this hostname.
            </Alert>
          ) : null}

          {workspace.compatibilityActionState.errorMessage ? (
            <Alert severity="error">{workspace.compatibilityActionState.errorMessage}</Alert>
          ) : null}
          {workspace.compatibilityActionState.successMessage ? (
            <Alert severity="success">{workspace.compatibilityActionState.successMessage}</Alert>
          ) : null}
          {workspace.provisioningActionState.errorMessage ? (
            <Alert severity="error">{workspace.provisioningActionState.errorMessage}</Alert>
          ) : null}
          {workspace.provisioningActionState.successMessage ? (
            <Alert severity="success">{workspace.provisioningActionState.successMessage}</Alert>
          ) : null}

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
                  control={
                    <Checkbox
                      checked={(workspace.confirmedSafeguardIds ?? []).includes(rule.id)}
                      onChange={() => workspace.toggleProvisioningSafeguard(rule.id)}
                    />
                  }
                  label={
                    <Stack spacing={0.15}>
                      <Typography variant="body2">{rule.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rule.description}
                      </Typography>
                    </Stack>
                  }
                />
              ))}
            </FormGroup>
          ) : null}

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={workspace.analyzeSelectedConnectionCompatibility}
              disabled={!workspace.selectedConnectionId || !hasValidatedConnection || workspace.compatibilityActionState.processing}
            >
              {workspace.compatibilityActionState.processing ? "Analyzing..." : "Analyze Domain Setup"}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => workspace.provisionSelectedConnectionCompatibility(readyActions.map((action) => action.id))}
              disabled={
                readyActions.length === 0 ||
                !safeguardsConfirmed ||
                workspace.provisioningActionState.processing
              }
            >
              {workspace.provisioningActionState.processing ? "Provisioning..." : "Provision Domain Stack"}
            </Button>
            <Button variant="text" onClick={onOpenRemotes}>
              Open Remotes
            </Button>
            <Button variant="text" onClick={onOpenDeployments}>
              Open Deployments
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
