import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import {
  HiddenFileInput,
  ProductConnectionMetadata
} from "../../../../modules/test-modules-remote-ops/frontend/RemoteOpsConnectionEditorShared.jsx";
import { ValidationSummary } from "../../../../modules/test-modules-remote-ops/frontend/RemoteOpsSharedPanels.jsx";

function resolveConnectionTone(status) {
  if (status === "validated") {
    return "success";
  }
  if (status === "error") {
    return "error";
  }
  if (status === "connected" || status === "draft") {
    return "warning";
  }
  return "default";
}

function buildConnectionSecondary(item) {
  const lines = [];
  if (item?.projectDisplayName || item?.projectId) {
    lines.push(`Project ${item.projectDisplayName ?? item.projectId}`);
  }
  if (item?.serviceAccountEmail) {
    lines.push(item.serviceAccountEmail);
  }
  if (lines.length === 0) {
    lines.push("No credential loaded yet");
  }
  return lines;
}

export function ProductRemoteConnectionSidebar({ workspace, onCreateConnection = null }) {
  function handleCreateConnection() {
    workspace.startNewConnection();
    if (typeof onCreateConnection === "function") {
      onCreateConnection();
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={0.35}>
            <Typography variant="h6">Connections</Typography>
            <Typography variant="body2" color="text.secondary">
              One remote per environment.
            </Typography>
          </Stack>
          <Button variant="outlined" size="small" onClick={handleCreateConnection}>
            New
          </Button>
        </Stack>
        {workspace.connections.length === 0 ? (
          <Alert severity="info">No remote connections yet.</Alert>
        ) : (
          <List dense disablePadding>
            {workspace.connections.map((item) => (
              <ListItemButton
                key={item.id}
                selected={!workspace.isCreatingConnection && workspace.selectedConnectionId === item.id}
                onClick={() => workspace.selectConnection(item.id)}
                sx={{ borderRadius: 1, mb: 0.75, alignItems: "flex-start", border: "1px solid", borderColor: "divider" }}
              >
                <ListItemText
                  primary={item.profileName}
                  secondaryTypographyProps={{ component: "div" }}
                  secondary={(
                    <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Chip size="small" label={item.connectionStatus || "unknown"} color={resolveConnectionTone(item.connectionStatus)} />
                        {item.environmentLabel ? <Chip size="small" label={item.environmentLabel} variant="outlined" /> : null}
                      </Stack>
                      {buildConnectionSecondary(item).map((line) => (
                        <Typography key={`${item.id}-${line}`} variant="body2" color="text.secondary">
                          {line}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Stack>
    </Paper>
  );
}

export function ProductRemoteConnectionPanel({
  workspace,
  showKeyImportGuidance = false
}) {
  const draft = workspace.connectionDraft;
  const actionState = workspace.connectionActionState;
  const compatibilityActionState = workspace.compatibilityActionState;
  const canChooseKey = draft.profileName.trim().length > 0 && !actionState.processing;
  const canReloadStoredKey = draft.profileName.trim().length > 0 && Boolean(draft.credentialPathHint);
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
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Stack spacing={0.35}>
                <Typography variant="subtitle1">
                  {workspace.isCreatingConnection ? "New Remote Connection" : draft.profileName || "Remote Connection"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Load the credential, confirm the project, and repair the key here if anything breaks later.
                </Typography>
              </Stack>
              {!workspace.isCreatingConnection ? (
                <Button variant="text" onClick={workspace.startNewConnection}>
                  Start Fresh Connection
                </Button>
              ) : null}
            </Stack>

            {showKeyImportGuidance ? (
              <Alert severity="warning">
                This remote needs the service-account key re-imported here. Choose the same JSON key file again, then validate the connection.
              </Alert>
            ) : null}
            {actionState.errorMessage ? <Alert severity="error">{actionState.errorMessage}</Alert> : null}
            {actionState.successMessage ? <Alert severity="success">{actionState.successMessage}</Alert> : null}
            {compatibilityActionState.errorMessage ? <Alert severity="error">{compatibilityActionState.errorMessage}</Alert> : null}
            {compatibilityActionState.successMessage ? <Alert severity="success">{compatibilityActionState.successMessage}</Alert> : null}

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Remote Name"
                value={draft.profileName}
                onChange={(event) => workspace.changeConnectionField("profileName", event.target.value)}
                fullWidth
              />
              <TextField
                label="Environment"
                value={draft.environmentLabel ?? ""}
                onChange={(event) => workspace.changeConnectionField("environmentLabel", event.target.value)}
                fullWidth
              />
            </Stack>

            <TextField
              label="Project ID"
              value={draft.projectId ?? ""}
              onChange={(event) => workspace.changeConnectionProject(event.target.value)}
              helperText={
                draft.projectId
                  ? "You can override the suggested project before validation if needed."
                  : "Load the key first, then confirm the project id this remote should operate against."
              }
              fullWidth
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Stored Key File"
                value={draft.credentialPathHint ?? ""}
                InputProps={{ readOnly: true }}
                helperText="The key is copied into a local untracked runtime area and referenced from here."
                fullWidth
              />
              <TextField
                label="Service Account"
                value={draft.serviceAccountEmail ?? ""}
                InputProps={{ readOnly: true }}
                fullWidth
              />
            </Stack>

            {draft.projectDisplayName ? (
              <TextField
                label="Project Name"
                value={draft.projectDisplayName}
                InputProps={{ readOnly: true }}
                fullWidth
              />
            ) : null}

            <ProductConnectionMetadata draft={draft} />

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
              <Button variant="outlined" onClick={workspace.connectSelectedConnection} disabled={!canReloadStoredKey || actionState.processing}>
                {actionState.processing ? "Working..." : "Reload Stored Key"}
              </Button>
              <Button variant="outlined" onClick={workspace.validateSelectedConnection} disabled={!canValidate || actionState.processing}>
                Validate Connection
              </Button>
              <Button variant="outlined" color="secondary" onClick={workspace.analyzeSelectedConnectionCompatibility} disabled={!canAnalyze}>
                {compatibilityActionState.processing ? "Analyzing..." : "Analyze Readiness"}
              </Button>
            </Stack>

            {!canChooseKey ? (
              <Alert severity="info">
                Start with a remote name, then choose the service-account JSON key file.
              </Alert>
            ) : null}
            {canChooseKey && !draft.lastConnectedOn ? (
              <Alert severity="info">
                Next step: choose the key file. The app will import it, extract the account details, and suggest the project id.
              </Alert>
            ) : null}
            {Boolean(draft.lastConnectedOn) && !draft.projectId ? (
              <Alert severity="info">
                Next step: confirm the project id, then validate the connection.
              </Alert>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
      <ValidationSummary summary={draft.validationSummary} statusLabel={draft.connectionStatus} />
    </Stack>
  );
}
