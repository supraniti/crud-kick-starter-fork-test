import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useMemo } from "react";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";

const TAGS_COLLECTION_ID = "blog-tags";
const CATEGORIES_COLLECTION_ID = "blog-categories";

function resolveProjectionDescriptor(activeCollectionId) {
  if (activeCollectionId === TAGS_COLLECTION_ID) {
    return {
      settingsFieldId: "remoteTagsProjectionTargetProfileId",
      scope: "public-blog-tags",
      title: "Remote Tags Projection",
      saveLabel: "Save Tags Settings",
      emptyMessage: "Select and save a Firestore target for the public tags projection.",
      inclusionMessage: "Only tags with visibility set to public are included in this projection."
    };
  }

  return {
    settingsFieldId: "remoteCategoriesProjectionTargetProfileId",
    scope: "public-blog-categories",
    title: "Remote Categories Projection",
    saveLabel: "Save Categories Settings",
    emptyMessage: "Select and save a Firestore target for the public categories projection.",
    inclusionMessage: "Only categories with visibility set to public are included in this projection."
  };
}

function RemoteProjectionSummary({ latestRun, target }) {
  if (!target) {
    return null;
  }
  const compareSummary = target.compareSummary ?? {};
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      <Chip size="small" label={target.targetStatus ?? "draft"} />
      <Chip
        size="small"
        label={`${compareSummary.createCount ?? 0} create · ${compareSummary.updateCount ?? 0} update · ${compareSummary.deleteCount ?? 0} delete`}
        variant="outlined"
      />
      {latestRun?.procedureType ? (
        <Chip
          size="small"
          label={`Last ${latestRun.procedureType} ${latestRun.status ?? "unknown"}`}
          variant="outlined"
        />
      ) : null}
    </Stack>
  );
}

export function BlogTaxonomyRemoteProjectionPanel({
  activeCollectionId,
  moduleSettingsDomain,
  navigate = null
}) {
  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const descriptor = resolveProjectionDescriptor(activeCollectionId);
  const settingsState = moduleSettingsDomain?.moduleSettingsState ?? null;
  const selectedTargetId = settingsState?.draftValues?.[descriptor.settingsFieldId] ?? "";
  const projectionTargets = remoteOpsSupport
    .getTargetsByKind("firestore-projection")
    .filter((target) => target?.config?.projectionScope === descriptor.scope);
  const selectedTarget = remoteOpsSupport.getTargetById(selectedTargetId);
  const latestRun = remoteOpsSupport.getLatestRunForTarget(selectedTargetId);
  const hasScopeMismatch =
    Boolean(selectedTarget) &&
    selectedTarget?.config?.projectionScope !== descriptor.scope;
  const targetOptions = useMemo(() => {
    const options = [...projectionTargets];
    if (hasScopeMismatch && selectedTarget) {
      options.push({
        ...selectedTarget,
        title: `${selectedTarget.title} (wrong projection scope)`
      });
    }
    return options;
  }, [hasScopeMismatch, projectionTargets, selectedTarget]);
  const isBusy =
    remoteOpsSupport.procedureState.processing &&
    remoteOpsSupport.procedureState.targetId === selectedTarget?.id;

  const openRemoteOps = () => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate(
      {
        moduleId: "test-modules-remote-ops",
        tab: "targets",
        targetId: selectedTargetId
      },
      { replace: false }
    );
  };

  const saveSettings = async () => {
    if (!moduleSettingsDomain || typeof moduleSettingsDomain.handleSaveModuleSettings !== "function") {
      return;
    }
    await moduleSettingsDomain.handleSaveModuleSettings();
    await remoteOpsSupport.reload();
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">{descriptor.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage the Firestore projection that consumers read from for this taxonomy branch.
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={openRemoteOps}>
            Open Remotes
          </Button>
        </Stack>

        {settingsState?.errorMessage ? <Alert severity="error">{settingsState.errorMessage}</Alert> : null}
        {settingsState?.successMessage ? <Alert severity="success">{settingsState.successMessage}</Alert> : null}
        {remoteOpsSupport.supportState.errorMessage ? (
          <Alert severity="error">{remoteOpsSupport.supportState.errorMessage}</Alert>
        ) : null}

        <TextField
          select
          label="Remote Projection Target"
          value={selectedTargetId}
          onChange={(event) =>
            moduleSettingsDomain?.handleSettingsFieldChange(
              descriptor.settingsFieldId,
              event.target.value
            )
          }
          helperText={
            hasScopeMismatch
              ? "The selected target exists, but it uses the wrong projection scope."
              : targetOptions.length === 0
                ? "No targets for this taxonomy projection scope are configured yet."
                : ""
          }
        >
          <MenuItem value="">None</MenuItem>
          {targetOptions.map((target) => (
            <MenuItem key={target.id} value={target.id}>
              {target.title}
            </MenuItem>
          ))}
        </TextField>

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={saveSettings}
            disabled={!moduleSettingsDomain || settingsState?.saving}
          >
            {settingsState?.saving ? "Saving..." : descriptor.saveLabel}
          </Button>
        </Stack>

        {!selectedTarget ? (
          <Alert severity="info">{descriptor.emptyMessage}</Alert>
        ) : (
          <>
            <Typography variant="subtitle2">{selectedTarget.title}</Typography>
            <RemoteProjectionSummary target={selectedTarget} latestRun={latestRun} />
            <Alert severity={hasScopeMismatch ? "warning" : "info"}>
              {hasScopeMismatch ? "Fix the target scope before running projection procedures." : descriptor.inclusionMessage}
            </Alert>
            {remoteOpsSupport.procedureState.errorMessage ? (
              <Alert severity="error">{remoteOpsSupport.procedureState.errorMessage}</Alert>
            ) : null}
            {remoteOpsSupport.procedureState.successMessage ? (
              <Alert severity="success">{remoteOpsSupport.procedureState.successMessage}</Alert>
            ) : null}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={() => remoteOpsSupport.validateTarget(selectedTarget.id)}
                disabled={isBusy || hasScopeMismatch}
              >
                {isBusy && remoteOpsSupport.procedureState.procedureType === "validate"
                  ? "Validating..."
                  : "Validate Target"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => remoteOpsSupport.compareTarget(selectedTarget.id)}
                disabled={isBusy || hasScopeMismatch}
              >
                {isBusy && remoteOpsSupport.procedureState.procedureType === "compare"
                  ? "Comparing..."
                  : "Compare Projection"}
              </Button>
              <Button
                variant="contained"
                onClick={() => remoteOpsSupport.executeTarget(selectedTarget.id)}
                disabled={isBusy || hasScopeMismatch}
              >
                {isBusy && remoteOpsSupport.procedureState.procedureType === "execute"
                  ? "Syncing..."
                  : "Sync Projection"}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
