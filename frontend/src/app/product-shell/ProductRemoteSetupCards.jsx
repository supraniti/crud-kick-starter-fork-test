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
  Stack,
  Typography
} from "@mui/material";
import { resolveManagedProductBindingKey } from "../../../../modules/test-modules-remote-ops/shared/product-binding-support.mjs";

const PRODUCT_STAGE_SPECS = Object.freeze([
  {
    id: "connection",
    title: "1. Connection",
    description: "Bring in the credential, confirm the environment, and validate that the product can talk to the chosen project."
  },
  {
    id: "project",
    title: "2. Remote Access",
    description: "Confirm the project is reachable and inspect what the product still needs before publishing can begin."
  },
  {
    id: "projections",
    title: "3. Published Data",
    description:
      "Posts, categories, tags, and locale overlays need a healthy remote home before the site can publish data-backed pages.",
    bundleId: "firestore-projection",
    bindingKeys: ["posts-projection", "categories-projection", "tags-projection", "translations-projection"]
  },
  {
    id: "media",
    title: "4. Media Library",
    description: "Images and uploaded files need a remote library that the published site can reach.",
    bundleId: "media-storage",
    bindingKeys: ["media-storage"]
  },
  {
    id: "deployment",
    title: "5. Public HTML",
    description: "Generated HTML needs a remote home so releases can publish real pages.",
    bundleId: "deployment-storage",
    bindingKeys: ["deployment-storage"]
  },
  {
    id: "browser",
    title: "6. Public Delivery",
    description: "People need a public route to the published site, whether that is a temporary URL or a real domain.",
    bundleId: "browser-delivery",
    bindingKeys: ["browser-delivery"]
  }
]);

const BINDING_LABELS = Object.freeze({
  "posts-projection": "Posts Projection",
  "categories-projection": "Categories Projection",
  "tags-projection": "Tags Projection",
  "translations-projection": "Translations Projection",
  "deployment-storage": "HTML Deployment",
  "media-storage": "Media Library",
  "browser-delivery": "Primary Domain"
});

function getStageTone(state) {
  if (state === "ready") {
    return { chipColor: "success", label: "Ready", alertSeverity: "success" };
  }
  if (state === "blocked") {
    return { chipColor: "error", label: "Blocked", alertSeverity: "error" };
  }
  if (state === "action-required" || state === "missing") {
    return { chipColor: "warning", label: "Needs Attention", alertSeverity: "warning" };
  }
  return { chipColor: "default", label: "Waiting", alertSeverity: "info" };
}

function getManagedTargetsForStage(targets, connectionId, bindingKeys = []) {
  const targetMap = new Map(
    (Array.isArray(targets) ? targets : [])
      .filter((target) => target?.connectionProfileId === connectionId)
      .map((target) => [resolveManagedProductBindingKey(target), target])
      .filter(([bindingKey]) => bindingKey)
  );
  return bindingKeys.map((bindingKey) => targetMap.get(bindingKey) ?? null).filter(Boolean);
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
      lines.push(`Collection: ${target.config.firestoreCollectionPath}`);
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
      lines.push(`Folder: ${target.config.prefix}`);
    }
    if (target?.targetKind === "browser-delivery" && target?.config?.hostname) {
      lines.push(`Hostname: ${target.config.hostname}`);
    }
    if (target?.targetKind === "browser-delivery" && target?.config?.accessMode) {
      lines.push(`Access mode: ${target.config.accessMode}`);
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
          lines.push(`Example page: ${deliveryReport.publicUrl}`);
        }
        if (deliveryReport.publicMediaBaseUrl) {
          lines.push(`Media base: ${deliveryReport.publicMediaBaseUrl}`);
        }
        return lines;
      })
    : [];
}

function createConnectionStage(connection, compatibilityReport) {
  if (!connection) {
    return {
      state: "missing",
      summary: "No remote is selected yet.",
      nextStep: "Create a remote connection and choose the service-account JSON key file.",
      details: ["The product uses one named remote per environment."]
    };
  }

  if (connection.connectionStatus === "validated") {
    return {
      state: "ready",
      summary: "The credential and project access are validated.",
      nextStep: compatibilityReport ? "You can review or prepare the remote publishing pieces below." : "Run Analyze Readiness to inspect the remote publishing pieces.",
      details: [
        connection.projectDisplayName ? `Project: ${connection.projectDisplayName}` : null,
        connection.serviceAccountEmail ? `Service account: ${connection.serviceAccountEmail}` : null,
        connection.lastValidatedOn ? `Last validated: ${connection.lastValidatedOn}` : null
      ].filter(Boolean)
    };
  }

  if (connection.serviceAccountEmail || connection.credentialPathHint) {
    return {
      state: "action-required",
      summary: "The credential is loaded, but the connection is not validated yet.",
      nextStep: "Validate the connection so the product can inspect and prepare the remote publishing pieces.",
      details: [
        connection.projectId ? `Project ID: ${connection.projectId}` : "Choose the project ID before validation.",
        connection.serviceAccountEmail ? `Service account: ${connection.serviceAccountEmail}` : null
      ].filter(Boolean)
    };
  }

  return {
    state: "action-required",
    summary: "The connection still needs its service-account key.",
    nextStep: "Choose the JSON key file from this desk.",
    details: ["The app stores a local untracked copy so it can be re-used later."]
  };
}

function createProjectStage(connection, compatibilityReport) {
  if (!connection) {
    return {
      state: "blocked",
      summary: "The product cannot inspect remote readiness without a connection.",
      nextStep: "Create or select a remote first.",
      details: []
    };
  }
  if (!connection.projectId) {
    return {
      state: "missing",
      summary: "The project is not confirmed yet.",
      nextStep: "Confirm the project ID, then validate the connection.",
      details: []
    };
  }
  if (connection.connectionStatus !== "validated") {
    return {
      state: "action-required",
      summary: "Project access is chosen but not confirmed.",
      nextStep: "Validate the connection before analyzing readiness.",
      details: [`Project ID: ${connection.projectId}`]
    };
  }
  if (!compatibilityReport) {
    return {
      state: "action-required",
      summary: "The connection works, but readiness has not been analyzed yet.",
      nextStep: "Run Analyze Readiness to inspect services, permissions, and missing pieces.",
      details: [
        connection.projectDisplayName ? `Project: ${connection.projectDisplayName}` : `Project ID: ${connection.projectId}`
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
        ? "Remote access is blocked by permission or service issues."
        : compatibilityReport.overallState === "action-required"
          ? "Remote access works, but some publishing pieces still need work."
          : "Remote access is healthy for the current publishing model.",
    nextStep:
      compatibilityReport.overallState === "ready"
        ? "Review the publishing pieces below or move on to Domains and Deployments."
        : "Use the stage cards below to prepare missing pieces or fix blocked ones.",
    details: [
      `Needs attention: ${compatibilityReport.counts?.actionRequiredBundles ?? 0}`,
      `Blocked: ${compatibilityReport.counts?.blockedBundles ?? 0}`,
      `Prepare actions available: ${compatibilityReport.provisionableActions?.length ?? 0}`
    ]
  };
}

function createBundleStage(stageSpec, connection, targets, compatibilityReport) {
  if (!connection) {
    return {
      state: "blocked",
      summary: "This part cannot be prepared until a remote is selected.",
      nextStep: "Create or select a remote first.",
      details: [],
      stageTargets: [],
      bundleReport: null
    };
  }

  const stageTargets = getManagedTargetsForStage(targets, connection.id, stageSpec.bindingKeys);
  const bundleReport = getBundleReport(compatibilityReport, stageSpec.bundleId);
  const targetDetails = summarizeTargetDetails(stageTargets);
  const preparedBindingKeys = new Set(stageTargets.map((target) => resolveManagedProductBindingKey(target)));
  const missingBindingKeys = (Array.isArray(stageSpec.bindingKeys) ? stageSpec.bindingKeys : []).filter(
    (bindingKey) => !preparedBindingKeys.has(bindingKey)
  );

  if (stageTargets.length === 0) {
    return {
      state: "action-required",
      summary: "This publishing piece has not been prepared yet.",
      nextStep: "Analyze readiness, then prepare the missing piece from this desk.",
      details: [],
      stageTargets,
      bundleReport
    };
  }

  if (missingBindingKeys.length > 0) {
    return {
      state: "action-required",
      summary: "One or more standard publishing pieces have not been prepared yet.",
      nextStep: "Prepare the missing piece from this desk before relying on this stage in production.",
      details: [
        ...targetDetails,
        ...missingBindingKeys.map(
          (bindingKey) => `Missing: ${BINDING_LABELS[bindingKey] ?? bindingKey}`
        )
      ],
      stageTargets,
      bundleReport
    };
  }

  if (!bundleReport) {
    return {
      state: "action-required",
      summary: "This publishing piece exists, but its readiness has not been inspected yet.",
      nextStep: "Run Analyze Readiness to inspect this part.",
      details: targetDetails,
      stageTargets,
      bundleReport
    };
  }

  const permissionDetails = summarizePermissionDiagnostics(bundleReport);
  const missingResourceDetails = summarizeMissingResources(bundleReport);
  const deliveryDetails = stageSpec.id === "browser" ? summarizeDeliveryDetails(bundleReport) : [];
  const warningDetails = Array.isArray(bundleReport.configurationWarnings) ? bundleReport.configurationWarnings : [];
  const noteDetails = Array.isArray(bundleReport.notes) ? bundleReport.notes : [];

  return {
    state:
      bundleReport.state === "blocked"
        ? "blocked"
        : bundleReport.state === "action-required"
          ? "action-required"
          : "ready",
    summary:
      bundleReport.state === "blocked"
        ? "A permission or service issue is blocking this publishing piece."
        : bundleReport.state === "action-required"
          ? "This publishing piece still needs preparation or repair."
          : "This publishing piece is ready.",
    nextStep:
      bundleReport.state === "ready"
        ? "No action is needed here right now."
        : "Use the action below if preparation is available, otherwise fix the blocking issue first.",
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

function ReadinessBoardSummary({
  connection,
  stages,
  workspace,
  compatibilityReport,
  safeguardsConfirmed
}) {
  const counts = stages.reduce(
    (summary, stage) => {
      if (stage.state === "ready") {
        summary.ready += 1;
      } else if (stage.state === "blocked") {
        summary.blocked += 1;
      } else if (stage.state === "action-required" || stage.state === "missing") {
        summary.attention += 1;
      } else {
        summary.waiting += 1;
      }
      return summary;
    },
    { ready: 0, blocked: 0, attention: 0, waiting: 0 }
  );

  const readyActionCount = Array.isArray(compatibilityReport?.provisionableActions)
    ? compatibilityReport.provisionableActions.filter(
        (action) => action.createSupported === true && action.availableNow === true && action.phaseStatus === "execution-started"
      ).length
    : 0;

  const canAnalyze =
    Boolean(connection?.id) &&
    connection?.connectionStatus === "validated" &&
    Boolean(connection?.projectId) &&
    !workspace.compatibilityActionState.processing;
  const canPrepare = readyActionCount > 0 && safeguardsConfirmed && !workspace.provisioningActionState.processing;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.35}>
            <Typography variant="subtitle1">Readiness Board</Typography>
            <Typography variant="body2" color="text.secondary">
              This board answers one question: is this remote ready to power published data, media, HTML, and public delivery?
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" color="success" label={`Ready ${counts.ready}`} />
            <Chip size="small" color="warning" label={`Needs attention ${counts.attention}`} />
            <Chip size="small" color="error" label={`Blocked ${counts.blocked}`} />
            {counts.waiting > 0 ? <Chip size="small" variant="outlined" label={`Waiting ${counts.waiting}`} /> : null}
          </Stack>

          {connection ? (
            <Alert severity={connection.connectionStatus === "validated" ? "success" : "info"}>
              {connection.connectionStatus === "validated"
                ? `${connection.profileName} is connected to ${connection.projectDisplayName ?? connection.projectId}.`
                : `${connection.profileName} still needs validation before the board can inspect the remote world.`}
            </Alert>
          ) : (
            <Alert severity="info">Create a remote connection first, then return here to inspect readiness.</Alert>
          )}

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

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="outlined" color="secondary" onClick={workspace.analyzeSelectedConnectionCompatibility} disabled={!canAnalyze}>
              {workspace.compatibilityActionState.processing ? "Analyzing..." : "Analyze Readiness"}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => workspace.provisionSelectedConnectionCompatibility()}
              disabled={!canPrepare}
            >
              {workspace.provisioningActionState.processing ? "Preparing..." : "Prepare Missing Pieces"}
            </Button>
          </Stack>

          {!connection ? (
            <Typography variant="body2" color="text.secondary">
              This board stays quiet until a remote connection exists.
            </Typography>
          ) : null}
          {connection && connection.connectionStatus !== "validated" ? (
            <Typography variant="body2" color="text.secondary">
              Validate the connection first. The board only becomes reliable after that.
            </Typography>
          ) : null}
          {connection && connection.connectionStatus === "validated" && !compatibilityReport ? (
            <Typography variant="body2" color="text.secondary">
              The connection is healthy. Analyze readiness to see what is already prepared and what still needs work.
            </Typography>
          ) : null}
          {readyActionCount > 0 && !safeguardsConfirmed ? (
            <Typography variant="body2" color="text.secondary">
              Confirm the preparation safeguards below before using the global prepare action.
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function StageCard({ stage, workspace, safeguardsConfirmed, onProvisionStage, onOpenDomains, onOpenDeployments }) {
  const { readyActionIds, blockedCount } = resolveStageProvisioning(stage);
  const tone = getStageTone(stage.state);
  const canValidateConnection =
    stage.id === "connection" &&
    workspace.selectedConnectionId &&
    workspace.connectionDraft.connectionStatus !== "validated" &&
    Boolean(workspace.connectionDraft.projectId) &&
    (Boolean(workspace.connectionDraft.lastConnectedOn) || workspace.connectionDraft.connectionStatus === "connected");
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
              <Chip size="small" color={tone.chipColor} label={tone.label} />
              {stage.stageTargets?.length ? (
                <Chip size="small" variant="outlined" label={`Prepared ${stage.stageTargets.length}`} />
              ) : null}
              {readyActionIds.length > 0 ? (
                <Chip size="small" variant="outlined" label={`Can prepare ${readyActionIds.length}`} />
              ) : null}
              {blockedCount > 0 ? (
                <Chip size="small" variant="outlined" label={`Blocked actions ${blockedCount}`} />
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {stage.description}
            </Typography>
          </Stack>

          <Alert severity={tone.alertSeverity}>{stage.summary}</Alert>

          {stage.nextStep ? (
            <Typography variant="body2" color="text.secondary">
              Next step: {stage.nextStep}
            </Typography>
          ) : null}

          {stage.details?.length > 0 ? (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {stage.details.map((line, index) => (
                <Typography key={`${stage.id}-${index}`} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.35 }}>
                  {line}
                </Typography>
              ))}
            </Box>
          ) : null}

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {canValidateConnection ? (
              <Button variant="outlined" onClick={workspace.validateSelectedConnection} disabled={workspace.connectionActionState.processing}>
                {workspace.connectionActionState.processing ? "Validating..." : "Validate Connection"}
              </Button>
            ) : null}
            {canProvisionStage ? (
              <Button variant="contained" color="secondary" onClick={() => onProvisionStage(readyActionIds)}>
                {workspace.provisioningActionState.processing ? "Preparing..." : "Prepare This Part"}
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
        </Stack>
      </CardContent>
    </Card>
  );
}

function PrepareMissingPiecesCard({ workspace, compatibilityReport }) {
  if (!compatibilityReport) {
    return null;
  }

  const safeguardRules = Array.isArray(compatibilityReport.safeguardRules) ? compatibilityReport.safeguardRules : [];
  const readyActionCount = Array.isArray(compatibilityReport.provisionableActions)
    ? compatibilityReport.provisionableActions.filter(
        (action) => action.createSupported === true && action.availableNow === true && action.phaseStatus === "execution-started"
      ).length
    : 0;

  if (safeguardRules.length === 0 && readyActionCount === 0) {
    return null;
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.35}>
            <Typography variant="subtitle1">Prepare Missing Pieces</Typography>
            <Typography variant="body2" color="text.secondary">
              These confirmations protect the remote before the product creates missing services or buckets.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" variant="outlined" label={`Ready actions ${readyActionCount}`} />
          </Stack>

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
                  label={(
                    <Box>
                      <Typography variant="body2">{rule.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rule.description}
                      </Typography>
                    </Box>
                  )}
                />
              ))}
            </FormGroup>
          ) : (
            <Alert severity="info">No extra confirmations are needed for the current prepare actions.</Alert>
          )}
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
      <ReadinessBoardSummary
        connection={selectedConnection}
        stages={stages}
        workspace={workspace}
        compatibilityReport={compatibilityReport}
        safeguardsConfirmed={safeguardsConfirmed}
      />
      <Stack spacing={2} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" } }}>
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
      <PrepareMissingPiecesCard workspace={workspace} compatibilityReport={compatibilityReport} />
    </Stack>
  );
}
