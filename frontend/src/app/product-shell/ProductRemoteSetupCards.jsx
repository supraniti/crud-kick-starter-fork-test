import {
  Alert,
  Box,
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

const PRODUCT_STAGE_SPECS = Object.freeze([
  {
    id: "connection",
    title: "1. Connection",
    description: "Load one service-account key and validate that the CMS can operate against the chosen GCP project."
  },
  {
    id: "project",
    title: "2. Project Access",
    description: "Inspect the selected project, confirm managed services, and surface permission or provisioning pressure."
  },
  {
    id: "projections",
    title: "3. Firestore Projections",
    description: "Prepare and inspect the remote collections used for published posts, categories, and tags.",
    bundleId: "firestore-projection",
    bindingKeys: ["posts-projection", "categories-projection", "tags-projection"]
  },
  {
    id: "media",
    title: "4. Media Storage",
    description: "Prepare and inspect the remote bucket used for published media objects.",
    bundleId: "media-storage",
    bindingKeys: ["media-storage"]
  },
  {
    id: "deployment",
    title: "5. HTML Deployment",
    description: "Prepare and inspect the remote bucket used for generated page HTML.",
    bundleId: "deployment-storage",
    bindingKeys: ["deployment-storage"]
  },
  {
    id: "browser",
    title: "6. Browser Delivery",
    description: "Prepare and inspect the browser-facing delivery layer for temporary URLs or owned custom domains.",
    bundleId: "browser-delivery",
    bindingKeys: ["browser-delivery"]
  }
]);

function getStageColor(state) {
  if (state === "ready") {
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

function getManagedTargetsForStage(targets, connectionId, bindingKeys = []) {
  const targetMap = new Map(
    (Array.isArray(targets) ? targets : [])
      .filter((target) => target?.connectionProfileId === connectionId && typeof target?.productBindingKey === "string")
      .map((target) => [target.productBindingKey, target])
  );
  return bindingKeys
    .map((bindingKey) => targetMap.get(bindingKey) ?? null)
    .filter(Boolean);
}

function getBundleReport(report, bundleId) {
  return Array.isArray(report?.bundles) ? report.bundles.find((bundle) => bundle?.id === bundleId) ?? null : null;
}

function summarizePermissionDiagnostics(bundleReport) {
  return Array.isArray(bundleReport?.permissionDiagnostics)
    ? bundleReport.permissionDiagnostics.flatMap((diagnostic) =>
        [diagnostic.summary, diagnostic.instruction?.guidance].filter(Boolean)
      )
    : [];
}

function summarizeMissingResources(bundleReport) {
  return Array.isArray(bundleReport?.missingResources)
    ? bundleReport.missingResources.map(
        (resource) => `Missing: ${resource.label ?? resource.serviceName ?? resource.bucketName ?? resource.kind}`
      )
    : [];
}

function summarizeTargetDetails(targets = []) {
  return targets.flatMap((target) => {
    const lines = [target.title];
    if (target?.targetKind === "firestore-projection" && target?.config?.firestoreCollectionPath) {
      lines.push(`Collection path: ${target.config.firestoreCollectionPath}`);
    }
    if (
      (target?.targetKind === "deployment-storage" || target?.targetKind === "media-storage") &&
      target?.config?.bucketName
    ) {
      lines.push(`Bucket: ${target.config.bucketName}`);
    }
    if (
      (target?.targetKind === "deployment-storage" || target?.targetKind === "media-storage") &&
      target?.config?.prefix
    ) {
      lines.push(`Prefix: ${target.config.prefix}`);
    }
    if (target?.targetKind === "browser-delivery" && target?.config?.hostname) {
      lines.push(`Hostname: ${target.config.hostname}`);
    }
    if (target?.targetKind === "browser-delivery" && target?.config?.accessMode) {
      lines.push(`Access mode: ${target.config.accessMode}`);
    }
    if (target?.targetKind === "browser-delivery" && target?.config?.dnsMode) {
      lines.push(`DNS mode: ${target.config.dnsMode}`);
    }
    return lines;
  });
}

function summarizeDeliveryDetails(bundleReport) {
  return Array.isArray(bundleReport?.deliveryReports)
    ? bundleReport.deliveryReports.flatMap((deliveryReport) => {
        const lines = [];
        if (deliveryReport.publicOrigin) {
          lines.push(`Public origin: ${deliveryReport.publicOrigin}`);
        }
        if (deliveryReport.publicUrl) {
          lines.push(`Example page URL: ${deliveryReport.publicUrl}`);
        }
        if (deliveryReport.publicMediaBaseUrl) {
          lines.push(`Public media base: ${deliveryReport.publicMediaBaseUrl}`);
        }
        if (deliveryReport.temporaryMediaBaseUrl) {
          lines.push(`Temporary media base: ${deliveryReport.temporaryMediaBaseUrl}`);
        }
        return lines;
      })
    : [];
}

function createConnectionStage(connection, compatibilityReport) {
  if (!connection) {
    return {
      state: "missing",
      summary: "Create or select a remote profile.",
      details: ["The product flow starts with one named GCP remote."]
    };
  }

  if (connection.connectionStatus === "validated") {
    return {
      state: "ready",
      summary: "Service-account key and project access are validated.",
      details: [
        connection.profileName,
        connection.serviceAccountEmail ? `Service account: ${connection.serviceAccountEmail}` : null,
        connection.projectId ? `Project ID: ${connection.projectId}` : null,
        connection.lastValidatedOn ? `Last validated: ${connection.lastValidatedOn}` : null,
        compatibilityReport ? "Compatibility analysis can now drive the managed service setup." : null
      ].filter(Boolean)
    };
  }

  if (connection.serviceAccountEmail || connection.credentialPathHint) {
    return {
      state: "action-required",
      summary: "Credential is loaded but the connection is not yet validated.",
      details: [
        connection.serviceAccountEmail ? `Service account: ${connection.serviceAccountEmail}` : null,
        connection.projectId ? `Project ID: ${connection.projectId}` : "Choose the target project id before validation.",
        "Run Validate Connection before expecting managed services to unlock."
      ].filter(Boolean)
    };
  }

  return {
    state: "action-required",
    summary: "Choose and import the service-account JSON key file.",
    details: [
      "The app stores the imported key in a local untracked runtime area.",
      "Only the reference path and extracted metadata are persisted."
    ]
  };
}

function createProjectStage(connection, compatibilityReport) {
  if (!connection) {
    return {
      state: "blocked",
      summary: "No remote is selected yet.",
      details: ["Pick or create a connection profile first."]
    };
  }
  if (!connection.projectId) {
    return {
      state: "missing",
      summary: "Project id is not set.",
      details: ["Load the key, then confirm or override the suggested project id."]
    };
  }
  if (connection.connectionStatus !== "validated") {
    return {
      state: "action-required",
      summary: "Project is chosen but live access is not validated yet.",
      details: [`Project ID: ${connection.projectId}`, "Run Validate Connection before analyzing compatibility."]
    };
  }
  if (!compatibilityReport) {
    return {
      state: "action-required",
      summary: "Project access is validated. Compatibility analysis is still pending.",
      details: [
        connection.projectDisplayName ? `Project: ${connection.projectDisplayName}` : `Project ID: ${connection.projectId}`,
        "Run Analyze Compatibility to inspect managed services, permissions, and missing resources."
      ]
    };
  }
  return {
    state:
      compatibilityReport.overallState === "blocked"
        ? "blocked"
        : compatibilityReport.overallState === "action-required"
          ? "action-required"
          : "ready",
    summary:
      compatibilityReport.overallState === "blocked"
        ? "Project access is blocked by permission or service issues."
        : compatibilityReport.overallState === "action-required"
          ? "Project access is live, but the managed service bundle still needs work."
          : "Project access and managed service inspection are ready.",
    details: [
      compatibilityReport.project?.displayName
        ? `Project: ${compatibilityReport.project.displayName}`
        : `Project ID: ${connection.projectId}`,
      `Blocked bundles: ${compatibilityReport.counts?.blockedBundles ?? 0}`,
      `Action required bundles: ${compatibilityReport.counts?.actionRequiredBundles ?? 0}`,
      `Provisionable actions: ${compatibilityReport.provisionableActions?.length ?? 0}`
    ]
  };
}

function createBundleStage(stageSpec, connection, targets, compatibilityReport) {
  if (!connection) {
    return {
      state: "blocked",
      summary: "No remote is selected yet.",
      details: ["Pick or create a connection profile first."]
    };
  }

  const stageTargets = getManagedTargetsForStage(targets, connection.id, stageSpec.bindingKeys);
  const bundleReport = getBundleReport(compatibilityReport, stageSpec.bundleId);
  const targetDetails = summarizeTargetDetails(stageTargets);

  if (stageTargets.length === 0) {
    return {
      state: "missing",
      summary: "Managed targets are not prepared yet.",
      details: [
        "Validate the connection so the CMS can prepare the standard managed target bundle."
      ],
      stageTargets,
      bundleReport
    };
  }

  if (!bundleReport) {
    return {
      state: "action-required",
      summary: "Managed targets are prepared. Compatibility analysis is still pending.",
      details: [...targetDetails, "Run Analyze Compatibility to inspect the remote service state."],
      stageTargets,
      bundleReport
    };
  }

  const permissionDetails = summarizePermissionDiagnostics(bundleReport);
  const missingResourceDetails = summarizeMissingResources(bundleReport);
  const deliveryDetails = stageSpec.id === "browser" ? summarizeDeliveryDetails(bundleReport) : [];
  const noteDetails = Array.isArray(bundleReport.notes) ? bundleReport.notes : [];
  const warningDetails = Array.isArray(bundleReport.configurationWarnings) ? bundleReport.configurationWarnings : [];

  return {
    state:
      bundleReport.state === "blocked"
        ? "blocked"
        : bundleReport.state === "action-required"
          ? "action-required"
          : "ready",
    summary:
      bundleReport.state === "blocked"
        ? "Permission gaps block this managed service."
        : bundleReport.state === "action-required"
          ? "This managed service still needs provisioning or configuration."
          : "This managed service is ready for the current release model.",
    details: [...targetDetails, ...deliveryDetails, ...missingResourceDetails, ...warningDetails, ...noteDetails, ...permissionDetails],
    stageTargets,
    bundleReport
  };
}

function createStageModels({ connection, compatibilityReport, targets }) {
  return PRODUCT_STAGE_SPECS.map((stageSpec) => {
    if (stageSpec.id === "connection") {
      return {
        ...stageSpec,
        ...createConnectionStage(connection, compatibilityReport)
      };
    }
    if (stageSpec.id === "project") {
      return {
        ...stageSpec,
        ...createProjectStage(connection, compatibilityReport)
      };
    }
    return {
      ...stageSpec,
      ...createBundleStage(stageSpec, connection, targets, compatibilityReport)
    };
  });
}

function resolveStageProvisioning(stage) {
  const provisionableActions = Array.isArray(stage.bundleReport?.provisionableActions)
    ? stage.bundleReport.provisionableActions.filter((action) => action.createSupported === true)
    : [];
  const readyActionIds = provisionableActions
    .filter((action) => action.availableNow === true && action.phaseStatus === "execution-started")
    .map((action) => action.id);
  const blockedCount = provisionableActions.length - readyActionIds.length;
  return {
    readyActionIds,
    blockedCount
  };
}

function StageCard({
  stage,
  workspace,
  safeguardsConfirmed,
  onProvisionStage,
  onOpenDomains,
  onOpenDeployments
}) {
  const { readyActionIds, blockedCount } = resolveStageProvisioning(stage);
  const canValidateConnection =
    stage.id === "connection" &&
    workspace.selectedConnectionId &&
    workspace.connectionDraft.connectionStatus !== "validated" &&
    Boolean(workspace.connectionDraft.projectId) &&
    (Boolean(workspace.connectionDraft.lastConnectedOn) || workspace.connectionDraft.connectionStatus === "connected");
  const canAnalyzeCompatibility =
    (stage.id === "project" || stage.state === "action-required") &&
    workspace.selectedConnectionId &&
    workspace.connectionDraft.connectionStatus === "validated" &&
    Boolean(workspace.connectionDraft.projectId) &&
    !workspace.compatibilityActionState.processing;
  const canProvisionStage =
    readyActionIds.length > 0 &&
    safeguardsConfirmed &&
    !workspace.provisioningActionState.processing;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="subtitle1">{stage.title}</Typography>
              <Chip size="small" color={getStageColor(stage.state)} label={stage.state} />
              {stage.stageTargets?.length ? (
                <Chip size="small" variant="outlined" label={`Targets ${stage.stageTargets.length}`} />
              ) : null}
              {readyActionIds.length > 0 ? (
                <Chip size="small" variant="outlined" label={`Ready actions ${readyActionIds.length}`} />
              ) : null}
              {blockedCount > 0 ? (
                <Chip size="small" variant="outlined" label={`Blocked actions ${blockedCount}`} />
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {stage.description}
            </Typography>
          </Stack>

          <Alert severity={stage.state === "blocked" ? "error" : stage.state === "ready" ? "success" : "info"}>
            {stage.summary}
          </Alert>

          {stage.details?.length > 0 ? (
            <Stack spacing={0.5}>
              {stage.details.map((line, index) => (
                <Typography key={`${stage.id}-${index}`} variant="body2" color="text.secondary">
                  {line}
                </Typography>
              ))}
            </Stack>
          ) : null}

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {canValidateConnection ? (
              <Button
                variant="outlined"
                onClick={workspace.validateSelectedConnection}
                disabled={workspace.connectionActionState.processing}
              >
                Validate Connection
              </Button>
            ) : null}
            {canAnalyzeCompatibility ? (
              <Button variant="outlined" color="secondary" onClick={workspace.analyzeSelectedConnectionCompatibility}>
                {workspace.compatibilityActionState.processing ? "Analyzing..." : "Analyze Compatibility"}
              </Button>
            ) : null}
            {canProvisionStage ? (
              <Button variant="contained" color="secondary" onClick={() => onProvisionStage(readyActionIds)}>
                {workspace.provisioningActionState.processing ? "Provisioning..." : "Provision This Stage"}
              </Button>
            ) : null}
            {stage.id === "browser" ? (
              <Button variant="text" onClick={onOpenDomains}>
                Open Domains
              </Button>
            ) : null}
            {stage.id === "deployment" ? (
              <Button variant="text" onClick={onOpenDeployments}>
                Open Deployments
              </Button>
            ) : null}
          </Stack>

          {readyActionIds.length > 0 && !safeguardsConfirmed ? (
            <Typography variant="caption" color="text.secondary">
              Confirm the provisioning safeguards below before provisioning this stage.
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function SafeguardsCard({ workspace, compatibilityReport }) {
  if (!compatibilityReport) {
    return null;
  }

  const safeguardRules = Array.isArray(compatibilityReport.safeguardRules) ? compatibilityReport.safeguardRules : [];
  const readyActionCount = Array.isArray(compatibilityReport.provisionableActions)
    ? compatibilityReport.provisionableActions.filter(
        (action) => action.createSupported === true && action.availableNow === true && action.phaseStatus === "execution-started"
      ).length
    : 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="subtitle1">Provisioning Safeguards</Typography>
            <Chip size="small" variant="outlined" label={`Ready actions ${readyActionCount}`} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Stage-level provisioning buttons only run after these operator confirmations are checked.
          </Typography>
          {workspace.provisioningActionState.errorMessage ? (
            <Alert severity="error">{workspace.provisioningActionState.errorMessage}</Alert>
          ) : null}
          {workspace.provisioningActionState.successMessage ? (
            <Alert severity="success">{workspace.provisioningActionState.successMessage}</Alert>
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
                    <Box>
                      <Typography variant="body2">{rule.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rule.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          ) : (
            <Alert severity="info">No provisioning safeguards are required for the current report.</Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function SetupSummary({ stages }) {
  const counts = stages.reduce(
    (summary, stage) => {
      if (stage.state === "ready") {
        summary.ready += 1;
      } else if (stage.state === "blocked") {
        summary.blocked += 1;
      } else if (stage.state === "action-required" || stage.state === "missing") {
        summary.actionRequired += 1;
      } else {
        summary.pending += 1;
      }
      return summary;
    },
    { ready: 0, blocked: 0, actionRequired: 0, pending: 0 }
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Stack spacing={0.35}>
            <Typography variant="subtitle1">Managed Service Setup</Typography>
            <Typography variant="body2" color="text.secondary">
              This product surface owns the CMS remote setup flow. Work through the stages below instead of treating
              remote targets as independent low-level objects.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" color="success" label={`Ready ${counts.ready}`} />
            <Chip size="small" color="warning" label={`Action required ${counts.actionRequired}`} />
            <Chip size="small" color="error" label={`Blocked ${counts.blocked}`} />
            {counts.pending > 0 ? <Chip size="small" variant="outlined" label={`Pending ${counts.pending}`} /> : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ProductRemoteSetupCards({
  workspace,
  selectedConnection,
  compatibilityReport,
  targets,
  onOpenDomains,
  onOpenDeployments
}) {
  const stages = createStageModels({
    connection: selectedConnection,
    compatibilityReport,
    targets
  });
  const safeguardsConfirmed =
    Array.isArray(compatibilityReport?.safeguardRules) &&
    compatibilityReport.safeguardRules.every((rule) => (workspace.confirmedSafeguardIds ?? []).includes(rule.id));

  return (
    <Stack spacing={2}>
      <SetupSummary stages={stages} />
      <Stack
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" } }}
      >
        {stages.map((stage) => (
          <StageCard
            key={stage.id}
            stage={stage}
            workspace={workspace}
            safeguardsConfirmed={safeguardsConfirmed}
            onProvisionStage={(actionIds) => workspace.provisionSelectedConnectionCompatibility(actionIds)}
            onOpenDomains={onOpenDomains}
            onOpenDeployments={onOpenDeployments}
          />
        ))}
      </Stack>
      <SafeguardsCard workspace={workspace} compatibilityReport={compatibilityReport} />
    </Stack>
  );
}
