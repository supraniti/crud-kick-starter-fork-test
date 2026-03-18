import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { CompareSummary, ValidationSummary } from "./RemoteOpsSharedPanels.jsx";
import { buildBrowserDeliveryDescriptor } from "../shared/browser-delivery-support.mjs";

export function TargetList({ workspace }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Targets</Typography>
          <Button variant="outlined" size="small" onClick={workspace.startNewTarget}>
            New
          </Button>
        </Stack>
        <List dense disablePadding>
          {workspace.targets.map((item) => (
            <ListItemButton
              key={item.id}
              selected={!workspace.isCreatingTarget && workspace.selectedTargetId === item.id}
              onClick={() => workspace.selectTarget(item.id)}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemText
                primary={item.title}
                secondary={`${item.targetKind} • ${item.adapterMode}`}
              />
            </ListItemButton>
          ))}
          {workspace.targets.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No target profiles yet.
            </Typography>
          ) : null}
        </List>
      </Stack>
    </Paper>
  );
}

export function TargetEditor({ workspace }) {
  const draft = workspace.targetDraft;
  const actionState = workspace.targetActionState;
  const connectionOptions = workspace.connections;
  const showFirestoreFields = draft.targetKind === "firestore-projection";
  const showStorageFields = draft.targetKind === "deployment-storage" || draft.targetKind === "media-storage";
  const showBrowserFields = draft.targetKind === "browser-delivery";
  const siblingTargets = workspace.targets.filter((item) => item.id !== workspace.selectedTargetId);
  const browserDeploymentOptions = siblingTargets.filter(
    (item) =>
      item.connectionProfileId === draft.connectionProfileId && item.targetKind === "deployment-storage"
  );
  const browserMediaOptions = siblingTargets.filter(
    (item) =>
      item.connectionProfileId === draft.connectionProfileId && item.targetKind === "media-storage"
  );
  const deliveryPreview = showBrowserFields
    ? buildBrowserDeliveryDescriptor({
        browserTarget: {
          config: draft.config
        },
        deploymentTarget:
          browserDeploymentOptions.find((item) => item.id === draft.config.deploymentTargetProfileId) ?? null,
        mediaTarget:
          browserMediaOptions.find((item) => item.id === draft.config.mediaTargetProfileId) ?? null,
        pagePath: "/posts/example-post",
        artifactRelativePath: "posts/example-post/index.html"
      })
    : null;
  const isLiveTarget = draft.adapterMode === "live-gcp";
  const liveSupportsCompare = isLiveTarget && !showBrowserFields;
  const liveSupportsRestore = isLiveTarget && showStorageFields;
  const compareDisabled = !workspace.selectedTargetId || actionState.processing || (isLiveTarget && !liveSupportsCompare);
  const executeDisabled = !workspace.selectedTargetId || actionState.processing || (isLiveTarget && !liveSupportsCompare);
  const restoreDisabled = !workspace.selectedTargetId || actionState.processing || (isLiveTarget && !liveSupportsRestore);
  const executeLabel = isLiveTarget ? "Execute Sync" : "Execute Smoke Sync";
  const restoreLabel = isLiveTarget ? "Restore From Remote" : "Restore Smoke";

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {workspace.isCreatingTarget ? "New Target Profile" : draft.title || "Target Profile"}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip size="small" label={draft.adapterMode} variant="outlined" />
              <Chip size="small" label={draft.targetStatus} color={draft.targetStatus === "error" ? "error" : draft.targetStatus === "warning" ? "warning" : "default"} />
            </Stack>
          </Stack>
          {actionState.errorMessage ? <Alert severity="error">{actionState.errorMessage}</Alert> : null}
          {actionState.successMessage ? <Alert severity="success">{actionState.successMessage}</Alert> : null}
          <TextField label="Target Title" value={draft.title} onChange={(event) => workspace.changeTargetField("title", event.target.value)} fullWidth />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField select label="Connection Profile" value={draft.connectionProfileId} onChange={(event) => workspace.changeTargetField("connectionProfileId", event.target.value)} fullWidth>
              {connectionOptions.map((item) => (
                <MenuItem key={item.id} value={item.id}>{item.profileName}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Target Kind" value={draft.targetKind} onChange={(event) => workspace.changeTargetField("targetKind", event.target.value)} fullWidth>
              <MenuItem value="firestore-projection">Firestore Projection</MenuItem>
              <MenuItem value="deployment-storage">Deployment Storage</MenuItem>
              <MenuItem value="media-storage">Media Storage</MenuItem>
              <MenuItem value="browser-delivery">Browser Delivery</MenuItem>
            </TextField>
          </Stack>
          <TextField select label="Adapter Mode" value={draft.adapterMode} onChange={(event) => workspace.changeTargetField("adapterMode", event.target.value)} fullWidth>
            <MenuItem value="simulated-gcp">Simulated GCP</MenuItem>
            <MenuItem value="live-gcp">Live GCP</MenuItem>
          </TextField>
          {isLiveTarget ? (
            <Alert severity="info">
              {showBrowserFields
                ? "Live browser-delivery targets support validation, compatibility analysis, instructions, and bounded provisioning through the connection workflow. Compare/execute on the target itself still remain validation-only."
                : "Live Firestore and storage targets now support real compare and execute flows. Restore is available for storage targets only."}
            </Alert>
          ) : null}
          {showFirestoreFields ? (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField select label="Projection Scope" value={draft.config.projectionScope ?? "published-blog-posts"} onChange={(event) => workspace.changeTargetConfigField("projectionScope", event.target.value)} fullWidth>
                <MenuItem value="published-blog-posts">Published Blog Posts</MenuItem>
                <MenuItem value="published-pages">Published Pages</MenuItem>
                <MenuItem value="public-blog-categories">Public Blog Categories</MenuItem>
                <MenuItem value="public-blog-tags">Public Blog Tags</MenuItem>
              </TextField>
              <TextField
                label="Firestore Collection Path"
                value={draft.config.firestoreCollectionPath ?? ""}
                onChange={(event) => workspace.changeTargetConfigField("firestoreCollectionPath", event.target.value)}
                helperText={
                  isLiveTarget
                    ? "Use a real Firestore collection path. Examples: 'publishedPosts' or 'sites/main/posts'."
                    : "Simulated mode accepts file-like paths too."
                }
                fullWidth
              />
            </Stack>
          ) : null}
          {showStorageFields ? (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Bucket Name"
                value={draft.config.bucketName ?? ""}
                onChange={(event) => workspace.changeTargetConfigField("bucketName", event.target.value)}
                helperText={isLiveTarget ? "Use a real GCS bucket name from the selected project." : null}
                fullWidth
              />
              <TextField label="Prefix" value={draft.config.prefix ?? ""} onChange={(event) => workspace.changeTargetConfigField("prefix", event.target.value)} fullWidth />
              <TextField label="Local Root Hint" value={draft.config.localRootHint ?? ""} onChange={(event) => workspace.changeTargetConfigField("localRootHint", event.target.value)} fullWidth />
            </Stack>
          ) : null}
          {showBrowserFields ? (
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField select label="Access Mode" value={draft.config.accessMode ?? "gcp-temporary"} onChange={(event) => workspace.changeTargetConfigField("accessMode", event.target.value)} fullWidth>
                  <MenuItem value="gcp-temporary">GCP Temporary URLs</MenuItem>
                  <MenuItem value="custom-domain">Custom Domain</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Stack Mode"
                  value={draft.config.stackMode ?? "direct-storage"}
                  onChange={(event) => workspace.changeTargetConfigField("stackMode", event.target.value)}
                  fullWidth
                  disabled={(draft.config.accessMode ?? "gcp-temporary") !== "custom-domain"}
                >
                  <MenuItem value="direct-storage">Direct Storage</MenuItem>
                  <MenuItem value="https-load-balancer">HTTPS Load Balancer</MenuItem>
                </TextField>
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField select label="DNS Mode" value={draft.config.dnsMode ?? "external"} onChange={(event) => workspace.changeTargetConfigField("dnsMode", event.target.value)} fullWidth>
                  <MenuItem value="external">External DNS</MenuItem>
                  <MenuItem value="gcp-managed">GCP Managed DNS</MenuItem>
                </TextField>
                <TextField label="Hostname" value={draft.config.hostname ?? ""} onChange={(event) => workspace.changeTargetConfigField("hostname", event.target.value)} fullWidth />
              </Stack>
              <TextField
                label="Application API Origin"
                value={draft.config.applicationApiOrigin ?? ""}
                onChange={(event) => workspace.changeTargetConfigField("applicationApiOrigin", event.target.value)}
                helperText="Optional public API host used by deployed runtime applications for Firestore-backed interactions."
                fullWidth
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField select label="Deployment Target" value={draft.config.deploymentTargetProfileId ?? ""} onChange={(event) => workspace.changeTargetConfigField("deploymentTargetProfileId", event.target.value)} fullWidth>
                  <MenuItem value="">None</MenuItem>
                  {browserDeploymentOptions.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>
                  ))}
                </TextField>
                <TextField select label="Media Target" value={draft.config.mediaTargetProfileId ?? ""} onChange={(event) => workspace.changeTargetConfigField("mediaTargetProfileId", event.target.value)} fullWidth>
                  <MenuItem value="">None</MenuItem>
                  {browserMediaOptions.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="DNS Zone" value={draft.config.dnsZone ?? ""} onChange={(event) => workspace.changeTargetConfigField("dnsZone", event.target.value)} fullWidth />
                <TextField label="Certificate Name" value={draft.config.certificateName ?? ""} onChange={(event) => workspace.changeTargetConfigField("certificateName", event.target.value)} fullWidth />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField label="URL Map Hint" value={draft.config.urlMapHint ?? ""} onChange={(event) => workspace.changeTargetConfigField("urlMapHint", event.target.value)} fullWidth />
                <Stack flex={1}>
                  {(draft.config.accessMode ?? "gcp-temporary") === "custom-domain" ? (
                    <Alert severity={(draft.config.stackMode ?? "direct-storage") === "https-load-balancer" ? "info" : "warning"}>
                      {(draft.config.stackMode ?? "direct-storage") === "https-load-balancer"
                        ? "HTTPS load-balancer mode manages GCP delivery-stack resources and keeps page output on the intended HTTPS origin."
                        : "Direct-storage mode stays on the bounded bucket-hosting path and remains HTTP-oriented until a managed HTTPS stack is configured."}
                    </Alert>
                  ) : null}
                </Stack>
              </Stack>
              {deliveryPreview ? (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Delivery Preview</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mode: {deliveryPreview.accessMode} / {deliveryPreview.stackMode}
                    </Typography>
                    {deliveryPreview.publicOrigin ? (
                      <Typography variant="body2" color="text.secondary">
                        Public origin: {deliveryPreview.publicOrigin}
                      </Typography>
                    ) : null}
                    {deliveryPreview.applicationApiOrigin ? (
                      <Typography variant="body2" color="text.secondary">
                        Application API origin: {deliveryPreview.applicationApiOrigin}
                      </Typography>
                    ) : null}
                    {deliveryPreview.publicUrl ? (
                      <Typography variant="body2" color="text.secondary">
                        Example page URL: {deliveryPreview.publicUrl}
                      </Typography>
                    ) : null}
                    {deliveryPreview.temporaryMediaBaseUrl ? (
                      <Typography variant="body2" color="text.secondary">
                        Temporary media base: {deliveryPreview.temporaryMediaBaseUrl}
                      </Typography>
                    ) : null}
                    {deliveryPreview.publicMediaBaseUrl ? (
                      <Typography variant="body2" color="text.secondary">
                        Public media base: {deliveryPreview.publicMediaBaseUrl}
                      </Typography>
                    ) : null}
                    {deliveryPreview.dnsInstruction ? (
                      <Alert severity="info">
                        <Stack spacing={0.5}>
                          <Typography variant="body2">
                            DNS record: {deliveryPreview.dnsInstruction.recordType} {deliveryPreview.dnsInstruction.recordName}{" "}
                            {"->"} {deliveryPreview.dnsInstruction.recordValue}
                          </Typography>
                          {deliveryPreview.dnsInstruction.notes.map((note) => (
                            <Typography key={note} variant="caption" color="text.secondary">{note}</Typography>
                          ))}
                        </Stack>
                      </Alert>
                    ) : null}
                    {deliveryPreview.notes?.length > 0 ? (
                      <Alert severity="info">
                        <Stack spacing={0.5}>
                          {deliveryPreview.notes.map((note) => (
                            <Typography key={note} variant="body2">{note}</Typography>
                          ))}
                        </Stack>
                      </Alert>
                    ) : null}
                    {deliveryPreview.warnings?.length > 0 ? (
                      <Alert severity="warning">
                        <Stack spacing={0.5}>
                          {deliveryPreview.warnings.map((warning) => (
                            <Typography key={warning} variant="body2">{warning}</Typography>
                          ))}
                        </Stack>
                      </Alert>
                    ) : null}
                  </Stack>
                </Paper>
              ) : null}
            </Stack>
          ) : null}
          <Divider />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControlLabel control={<Checkbox checked={Boolean(draft.policy.allowDeletes)} onChange={(event) => workspace.changeTargetPolicyField("allowDeletes", event.target.checked)} />} label="Allow remote deletes" />
            <FormControlLabel control={<Checkbox checked={Boolean(draft.policy.allowRestore)} onChange={(event) => workspace.changeTargetPolicyField("allowRestore", event.target.checked)} />} label="Allow restore" />
            <FormControlLabel control={<Checkbox checked={Boolean(draft.policy.requireDryRunFirst)} onChange={(event) => workspace.changeTargetPolicyField("requireDryRunFirst", event.target.checked)} />} label="Require compare before execute" />
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" onClick={workspace.saveTarget} disabled={actionState.saving}>
              {actionState.saving ? "Saving..." : workspace.isCreatingTarget ? "Create Target" : "Save Target"}
            </Button>
            <Button variant="outlined" onClick={workspace.validateSelectedTarget} disabled={!workspace.selectedTargetId || actionState.processing}>
              Validate Target
            </Button>
            <Button variant="outlined" onClick={workspace.compareSelectedTarget} disabled={compareDisabled}>
              Compare
            </Button>
            <Button variant="outlined" color="success" onClick={workspace.executeSelectedTarget} disabled={executeDisabled}>
              {executeLabel}
            </Button>
            <Button variant="outlined" color="warning" onClick={workspace.restoreSelectedTarget} disabled={restoreDisabled}>
              {restoreLabel}
            </Button>
            {(draft.targetKind === "deployment-storage" || draft.targetKind === "media-storage") ? (
              <Button variant="text" onClick={workspace.seedSelectedTargetRemoteExtra} disabled={!workspace.selectedTargetId || actionState.processing || isLiveTarget}>
                Seed Remote Extra
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>
      <ValidationSummary summary={draft.validationSummary} statusLabel={draft.targetStatus} />
      <CompareSummary summary={draft.compareSummary} />
    </Stack>
  );
}

export function RunsPanel({ workspace }) {
  const runs = workspace.runsForSelectedTarget;
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Operation Runs</Typography>
          {workspace.selectedTarget ? <Chip size="small" label={workspace.selectedTarget.title} /> : null}
        </Stack>
        <Stack spacing={1.25}>
          {runs.map((run) => (
            <Card key={run.id} variant="outlined">
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                    <Typography variant="subtitle2">{run.title}</Typography>
                    <Chip size="small" label={run.status} color={run.status === "failed" ? "error" : run.status === "warning" ? "warning" : "success"} />
                    <Chip size="small" variant="outlined" label={run.direction} />
                    <Chip size="small" variant="outlined" label={run.scopeKind} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {run.message ?? "No message"}
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip size="small" variant="outlined" label={`Create ${run.summary?.createCount ?? 0}`} />
                    <Chip size="small" variant="outlined" label={`Update ${run.summary?.updateCount ?? 0}`} />
                    <Chip size="small" variant="outlined" label={`Delete ${run.summary?.deleteCount ?? 0}`} />
                    <Chip size="small" variant="outlined" label={`Restore ${run.summary?.restoredCount ?? 0}`} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {run.finishedOn}
                  </Typography>
                  {Array.isArray(run.summary?.warnings) && run.summary.warnings.length > 0 ? (
                    <Alert severity="warning">
                      <Stack spacing={0.5}>
                        {run.summary.warnings.map((warning) => (
                          <Typography key={warning} variant="body2">{warning}</Typography>
                        ))}
                      </Stack>
                    </Alert>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          ))}
          {runs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No operation runs yet.
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}
