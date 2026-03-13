import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  FormControlLabel,
  FormGroup,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { ValidationSummary } from "./RemoteOpsSharedPanels.jsx";

function HiddenFileInput(props) {
  return (
    <Box
      component="input"
      sx={{
        border: 0,
        clip: "rect(0 0 0 0)",
        height: 1,
        m: -1,
        overflow: "hidden",
        p: 0,
        position: "absolute",
        whiteSpace: "nowrap",
        width: 1
      }}
      {...props}
    />
  );
}

export function ConnectionList({ workspace }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Connections</Typography>
          <Button variant="outlined" size="small" onClick={workspace.startNewConnection}>
            New
          </Button>
        </Stack>
        <List dense disablePadding>
          {workspace.connections.map((item) => (
            <ListItemButton
              key={item.id}
              selected={!workspace.isCreatingConnection && workspace.selectedConnectionId === item.id}
              onClick={() => workspace.selectConnection(item.id)}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemText
                primary={item.profileName}
                secondary={`${
                  item.serviceAccountEmail ?? item.projectDisplayName ?? item.projectId ?? "No service account loaded"
                } • ${item.authMode}`}
              />
            </ListItemButton>
          ))}
          {workspace.connections.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No connection profiles yet.
            </Typography>
          ) : null}
        </List>
      </Stack>
    </Paper>
  );
}

function CompatibilityReport({ report, actionState }) {
  if (!report) {
    return (
      <Alert severity="info">
        Run <strong>Analyze Compatibility</strong> to inspect the selected GCP project, detect missing services and
        resources, and see which provisioning actions are currently available.
      </Alert>
    );
  }

  const severity =
    report.overallState === "blocked"
      ? "error"
      : report.overallState === "action-required"
        ? "warning"
        : "success";

  return (
    <Stack spacing={2}>
      {actionState.errorMessage ? <Alert severity="error">{actionState.errorMessage}</Alert> : null}
      {actionState.successMessage ? <Alert severity="success">{actionState.successMessage}</Alert> : null}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="subtitle1">Compatibility Report</Typography>
              <Chip size="small" color={severity} label={report.overallState} />
              <Chip size="small" variant="outlined" label={report.project?.projectId ?? "No project"} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {report.project?.displayName ?? report.project?.projectId ?? "Unknown project"} • analyzed {report.analyzedOn}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" variant="outlined" label={`Compatible ${report.counts?.compatibleBundles ?? 0}`} />
              <Chip size="small" variant="outlined" label={`Action Required ${report.counts?.actionRequiredBundles ?? 0}`} />
              <Chip size="small" variant="outlined" label={`Blocked ${report.counts?.blockedBundles ?? 0}`} />
              <Chip size="small" variant="outlined" label={`Provisionable ${report.provisionableActions?.length ?? 0}`} />
            </Stack>
            {Array.isArray(report.missingResources) && report.missingResources.length > 0 ? (
              <Alert severity="warning">
                <Stack spacing={0.5}>
                  <Typography variant="body2">Missing remote requirements detected:</Typography>
                  {report.missingResources.slice(0, 6).map((resource, index) => (
                    <Typography key={`${resource.bundleId}-${resource.label ?? resource.serviceName ?? index}`} variant="body2">
                      {resource.bundleLabel}: {resource.label ?? resource.serviceName ?? resource.bucketName}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
      <Stack spacing={1.5}>
        {report.bundles.map((bundle) => (
          <Card key={bundle.id} variant="outlined">
            <CardContent>
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                  <Typography variant="subtitle2">{bundle.label}</Typography>
                  <Chip
                    size="small"
                    label={bundle.state}
                    color={
                      bundle.state === "blocked" ? "error" : bundle.state === "action-required" ? "warning" : "success"
                    }
                  />
                  <Chip size="small" variant="outlined" label={`${bundle.targetCount} targets`} />
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {bundle.requiredApis.map((entry) => (
                    <Chip
                      key={entry.serviceName}
                      size="small"
                      variant="outlined"
                      label={`${entry.serviceName} • ${entry.state}`}
                    />
                  ))}
                </Stack>
                {bundle.configurationWarnings?.length > 0 ? (
                  <Alert severity="info">
                    <Stack spacing={0.5}>
                      {bundle.configurationWarnings.map((warning) => (
                        <Typography key={warning} variant="body2">
                          {warning}
                        </Typography>
                      ))}
                    </Stack>
                  </Alert>
                ) : null}
                {bundle.notes?.length > 0 ? (
                  <Alert severity="info">
                    <Stack spacing={0.5}>
                      {bundle.notes.map((note) => (
                        <Typography key={note} variant="body2">
                          {note}
                        </Typography>
                      ))}
                    </Stack>
                  </Alert>
                ) : null}
                {bundle.deliveryReports?.length > 0 ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Delivery Views
                    </Typography>
                    <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                      {bundle.deliveryReports.map((deliveryReport) => (
                        <Paper key={deliveryReport.targetId} variant="outlined" sx={{ p: 1 }}>
                          <Stack spacing={0.5}>
                            <Typography variant="body2">{deliveryReport.title}</Typography>
                            {deliveryReport.stackMode ? (
                              <Typography variant="caption" color="text.secondary">
                                Mode: {deliveryReport.accessMode} / {deliveryReport.stackMode}
                              </Typography>
                            ) : null}
                            {deliveryReport.publicOrigin ? (
                              <Typography variant="caption" color="text.secondary">
                                Public origin: {deliveryReport.publicOrigin}
                              </Typography>
                            ) : null}
                            {deliveryReport.publicUrl ? (
                              <Typography variant="caption" color="text.secondary">
                                Example page URL: {deliveryReport.publicUrl}
                              </Typography>
                            ) : null}
                            {deliveryReport.temporaryMediaBaseUrl ? (
                              <Typography variant="caption" color="text.secondary">
                                Temporary media base: {deliveryReport.temporaryMediaBaseUrl}
                              </Typography>
                            ) : null}
                            {deliveryReport.publicMediaBaseUrl ? (
                              <Typography variant="caption" color="text.secondary">
                                Public media base: {deliveryReport.publicMediaBaseUrl}
                              </Typography>
                            ) : null}
                            {Array.isArray(deliveryReport.dnsInstructions) && deliveryReport.dnsInstructions.length > 0 ? (
                              <Stack spacing={0.25}>
                                {deliveryReport.dnsInstructions.map((instruction) => (
                                  <Typography
                                    key={`${deliveryReport.targetId}-${instruction.label}-${instruction.recordName}`}
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {instruction.label}: {instruction.recordType} {instruction.recordName} {"->"}{" "}
                                    {instruction.recordValue}
                                  </Typography>
                                ))}
                              </Stack>
                            ) : deliveryReport.dnsInstruction ? (
                              <Typography variant="caption" color="text.secondary">
                                DNS: {deliveryReport.dnsInstruction.recordType} {deliveryReport.dnsInstruction.recordName}{" "}
                                {"->"} {deliveryReport.dnsInstruction.recordValue}
                              </Typography>
                            ) : null}
                            {Array.isArray(deliveryReport.nameServers) && deliveryReport.nameServers.length > 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                Name servers: {deliveryReport.nameServers.join(", ")}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                ) : null}
                {bundle.permissionDiagnostics?.length > 0 ? (
                  <Alert severity="error">
                    <Stack spacing={0.75}>
                      {bundle.permissionDiagnostics.map((diagnostic, index) => (
                        <Box key={`${bundle.id}-permission-${index}`}>
                          <Typography variant="body2">{diagnostic.summary}</Typography>
                          {diagnostic.missingPermissions?.length > 0 ? (
                            <Typography variant="caption" color="text.secondary">
                              Missing: {diagnostic.missingPermissions.join(", ")}
                            </Typography>
                          ) : null}
                          {diagnostic.instruction?.guidance ? (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {diagnostic.instruction.guidance}
                            </Typography>
                          ) : null}
                        </Box>
                      ))}
                    </Stack>
                  </Alert>
                ) : null}
                {bundle.provisionableActions?.length > 0 ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Provisioning Actions
                    </Typography>
                    <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                      {bundle.provisionableActions.map((action) => (
                        <Paper key={action.id} variant="outlined" sx={{ p: 1 }}>
                          <Stack spacing={0.5}>
                            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                              <Typography variant="body2">{action.label}</Typography>
                              <Chip
                                size="small"
                                label={action.availableNow ? "ready-now" : "blocked"}
                                color={action.availableNow ? "success" : "warning"}
                              />
                            </Stack>
                            {action.missingPermissions?.length > 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                Requires: {action.missingPermissions.join(", ")}
                              </Typography>
                            ) : null}
                            {action.notes?.length > 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                {action.notes.join(" ")}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                ) : null}
                {bundle.costWarnings?.length > 0 ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Cost / Safeguard Notes
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {bundle.costWarnings.map((warning) => (
                        <Typography key={warning.id} variant="body2" color="text.secondary">
                          {warning.message}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

function ProvisioningPanel({ workspace, report }) {
  if (!report) {
    return null;
  }

  const actionState = workspace.provisioningActionState;
  const safeguardRules = Array.isArray(report.safeguardRules) ? report.safeguardRules : [];
  const readyActionCount = Array.isArray(report.provisionableActions)
    ? report.provisionableActions.filter(
        (action) => action.createSupported === true && action.availableNow === true && action.phaseStatus === "execution-started"
      ).length
    : 0;
  const blockedActionCount = Array.isArray(report.provisionableActions)
    ? report.provisionableActions.filter(
        (action) => action.createSupported === true && !(action.availableNow === true && action.phaseStatus === "execution-started")
      ).length
    : 0;
  const confirmedSafeguardIds = workspace.confirmedSafeguardIds ?? [];
  const canProvision =
    readyActionCount > 0 &&
    safeguardRules.every((rule) => confirmedSafeguardIds.includes(rule.id)) &&
    !actionState.processing;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="subtitle1">Provision Missing Resources</Typography>
            <Chip size="small" variant="outlined" label={`Ready ${readyActionCount}`} />
            <Chip size="small" variant="outlined" label={`Blocked ${blockedActionCount}`} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            This creates only missing supported resources that are ready now for the selected connection, including the
            managed HTTPS browser-delivery stack when the configured target and permissions allow it.
          </Typography>
          {actionState.errorMessage ? <Alert severity="error">{actionState.errorMessage}</Alert> : null}
          {actionState.successMessage ? <Alert severity="success">{actionState.successMessage}</Alert> : null}
          {safeguardRules.length > 0 ? (
            <FormGroup>
              {safeguardRules.map((rule) => (
                <FormControlLabel
                  key={rule.id}
                  control={
                    <Checkbox
                      checked={confirmedSafeguardIds.includes(rule.id)}
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
          ) : null}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="contained"
              color="secondary"
              disabled={!canProvision}
              onClick={workspace.provisionSelectedConnectionCompatibility}
            >
              {actionState.processing ? "Provisioning..." : "Provision Missing Resources"}
            </Button>
          </Stack>
          {readyActionCount === 0 ? (
            <Alert severity="info">No ready provisioning actions are available for the current compatibility report.</Alert>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ConnectionEditor({ workspace, SetupCard }) {
  const draft = workspace.connectionDraft;
  const actionState = workspace.connectionActionState;
  const compatibilityActionState = workspace.compatibilityActionState;
  const canChooseKey = draft.profileName.trim().length > 0 && !actionState.processing;
  const canLoadKey = draft.profileName.trim().length > 0 && Boolean(draft.credentialPathHint);
  const canValidate =
    (Boolean(draft.lastConnectedOn) || draft.connectionStatus === "connected" || draft.connectionStatus === "validated") &&
    Boolean(draft.projectId);
  const canAnalyze = Boolean(draft.credentialPathHint) && Boolean(draft.projectId) && !compatibilityActionState.processing;

  function handleCredentialFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) {
      return;
    }
    void workspace.importSelectedCredentialFile(file);
  }

  return (
    <Stack spacing={2}>
      <SetupCard workspace={workspace} />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {workspace.isCreatingConnection ? "New Connection Profile" : draft.profileName || "Connection Profile"}
            </Typography>
            <Chip
              size="small"
              label={draft.connectionStatus}
              color={draft.connectionStatus === "error" ? "error" : draft.connectionStatus === "warning" ? "warning" : "default"}
            />
          </Stack>
          {actionState.errorMessage ? <Alert severity="error">{actionState.errorMessage}</Alert> : null}
          {actionState.successMessage ? <Alert severity="success">{actionState.successMessage}</Alert> : null}
          <TextField label="Profile Name" value={draft.profileName} onChange={(event) => workspace.changeConnectionField("profileName", event.target.value)} fullWidth />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField label="Auth Mode" value="Service Account Key" InputProps={{ readOnly: true }} fullWidth />
            <TextField
              label="Stored Key File"
              value={draft.credentialPathHint ?? ""}
              InputProps={{ readOnly: true }}
              helperText="The imported key file is copied into a local untracked runtime area and referenced from here."
              fullWidth
            />
          </Stack>
          <Alert severity="info">
            Choose the downloaded service-account JSON file directly. The app copies it into a local
            untracked runtime area and stores only the reference and extracted metadata in collection rows.
          </Alert>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField label="Operator Email" value={draft.operatorEmail ?? ""} onChange={(event) => workspace.changeConnectionField("operatorEmail", event.target.value)} fullWidth />
            <TextField label="Region" value={draft.region ?? ""} onChange={(event) => workspace.changeConnectionField("region", event.target.value)} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField label="Environment Label" value={draft.environmentLabel ?? ""} onChange={(event) => workspace.changeConnectionField("environmentLabel", event.target.value)} fullWidth />
            <TextField label="Credential Label" value={draft.credentialLabel ?? ""} InputProps={{ readOnly: true }} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Project ID"
              value={draft.projectId ?? ""}
              onChange={(event) => workspace.changeConnectionProject(event.target.value)}
              fullWidth
              helperText={
                draft.projectId
                  ? "The key file can suggest a project. You may override it before validation if needed."
                  : "Load the key first, then enter the project you want this service account to operate against."
              }
            />
            <TextField label="Project Number" value={draft.projectNumber ?? ""} InputProps={{ readOnly: true }} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField label="Service Account Email" value={draft.serviceAccountEmail ?? ""} InputProps={{ readOnly: true }} fullWidth />
            <TextField label="Service Account Key ID" value={draft.serviceAccountKeyId ?? ""} InputProps={{ readOnly: true }} fullWidth />
          </Stack>
          <TextField label="Project Display Name" value={draft.projectDisplayName ?? ""} InputProps={{ readOnly: true }} fullWidth />
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" onClick={workspace.saveConnection} disabled={actionState.saving}>
              {actionState.saving ? "Saving..." : workspace.isCreatingConnection ? "Create Connection" : "Save Connection"}
            </Button>
            <Button variant="outlined" component="label" disabled={!canChooseKey}>
              {actionState.processing ? "Working..." : "Choose JSON Key File"}
              <HiddenFileInput
                data-testid="service-account-key-input"
                type="file"
                accept="application/json,.json"
                onChange={handleCredentialFileChange}
              />
            </Button>
            <Button variant="outlined" onClick={workspace.connectSelectedConnection} disabled={!canLoadKey || actionState.processing}>
              {actionState.processing ? "Working..." : "Reload Stored Key"}
            </Button>
            <Button variant="outlined" onClick={workspace.validateSelectedConnection} disabled={!canValidate || actionState.processing}>
              Validate Connection
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={workspace.analyzeSelectedConnectionCompatibility}
              disabled={!canAnalyze}
            >
              {compatibilityActionState.processing ? "Analyzing..." : "Analyze Compatibility"}
            </Button>
          </Stack>
          {!canChooseKey ? (
            <Alert severity="info">
              Start with a profile name, then choose the downloaded service-account JSON key file.
            </Alert>
          ) : null}
          {canChooseKey && !draft.lastConnectedOn ? (
            <Alert severity="info">
              Next step: choose the JSON key file. The app will import it, extract the service-account metadata,
              and suggest the project id from the credential.
            </Alert>
          ) : null}
          {Boolean(draft.lastConnectedOn) && !draft.projectId ? (
            <Alert severity="info">
              Next step: enter the <strong>Project ID</strong> you want to validate, then run <strong>Validate Connection</strong>.
            </Alert>
          ) : null}
        </Stack>
      </Paper>
      <ValidationSummary summary={draft.validationSummary} statusLabel={draft.connectionStatus} />
      <CompatibilityReport report={workspace.compatibilityReport} actionState={compatibilityActionState} />
      <ProvisioningPanel workspace={workspace} report={workspace.compatibilityReport} />
    </Stack>
  );
}
