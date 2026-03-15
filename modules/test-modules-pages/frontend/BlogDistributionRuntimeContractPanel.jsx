import { Alert, Chip, Paper, Stack, TextField, Typography } from "@mui/material";
import { jsonPreview } from "./blog-distribution-panel-support.js";

function formatQueryLabel(definition = {}) {
  return `${definition.resource ?? "resource"}.${definition.query ?? "query"}`;
}

function formatActionLabel(definition = {}) {
  return definition.action ?? "action";
}

function formatDatasetLabel(definition = {}) {
  return definition.dataset ?? "dataset";
}

function formatSlotLabel(slot = {}) {
  return `${slot.bindAs ?? "slot"} • ${slot.sourceType ?? "none"} • ${slot.recordMode ?? "single-item"}`;
}

function ValueList({ title, values = [], emptyLabel }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2">{title}</Typography>
      {values.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {values.map((value) => (
            <Chip key={value} size="small" variant="outlined" label={value} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function RuntimeContractPanel({ workspace }) {
  const clientRuntime = workspace.deliveryState.payload?.runtime?.clientRuntime ?? null;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Client Runtime Contract</Typography>
        {workspace.deliveryState.loading ? (
          <Typography color="text.secondary">Resolving runtime contract...</Typography>
        ) : null}
        {workspace.deliveryState.errorMessage ? <Alert severity="error">{workspace.deliveryState.errorMessage}</Alert> : null}
        {!workspace.deliveryState.loading && !workspace.deliveryState.errorMessage && !clientRuntime ? (
          <Alert severity="info">No client-runtime contract is present in the current delivery payload.</Alert>
        ) : null}
        {clientRuntime ? (
          <>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" label={`Bootstrap ${clientRuntime.bootstrapDatasets?.length ?? 0}`} variant="outlined" />
              <Chip size="small" label={`Queries ${clientRuntime.queries?.length ?? 0}`} variant="outlined" />
              <Chip size="small" label={`Actions ${clientRuntime.actions?.length ?? 0}`} variant="outlined" />
              <Chip size="small" label={`Datasets ${clientRuntime.datasets?.length ?? 0}`} variant="outlined" />
              <Chip size="small" label={`Slots ${clientRuntime.slots?.length ?? 0}`} variant="outlined" />
            </Stack>
            <TextField label="Runtime Asset URL" value={clientRuntime.assetUrl ?? ""} InputProps={{ readOnly: true }} fullWidth />
            <TextField
              label="Runtime Remote Base URL"
              value={clientRuntime.remote?.baseUrl ?? ""}
              InputProps={{ readOnly: true }}
              helperText="Empty means the browser bootstrap will stay same-origin."
              fullWidth
            />
            <ValueList
              title="Bootstrap Datasets"
              values={clientRuntime.bootstrapDatasets ?? []}
              emptyLabel="No bootstrap datasets declared."
            />
            <ValueList
              title="Queries"
              values={(clientRuntime.queries ?? []).map(formatQueryLabel)}
              emptyLabel="No runtime queries declared."
            />
            <ValueList
              title="Actions"
              values={(clientRuntime.actions ?? []).map(formatActionLabel)}
              emptyLabel="No runtime actions declared."
            />
            <ValueList
              title="Datasets"
              values={(clientRuntime.datasets ?? []).map(formatDatasetLabel)}
              emptyLabel="No runtime datasets declared."
            />
            <ValueList
              title="Slots"
              values={(clientRuntime.slots ?? []).map(formatSlotLabel)}
              emptyLabel="No page-bound runtime slots declared."
            />
            <TextField
              label="Resolved Runtime Contract JSON"
              multiline
              minRows={16}
              value={jsonPreview(clientRuntime)}
              InputProps={{ readOnly: true }}
            />
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}
