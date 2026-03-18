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

function formatFlowLabel(value) {
  return String(value ?? "").trim() || "flow";
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
  const applicationTester = workspace.deliveryState.payload?.runtime?.applicationTester ?? null;

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
        {!workspace.deliveryState.loading && !workspace.deliveryState.errorMessage && !applicationTester ? (
          <Alert severity="info">No application tester contract is present in the current delivery payload.</Alert>
        ) : null}
        {applicationTester ? (
          <>
            <Typography variant="h6">Application Tester Contract</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                size="small"
                label={`Enable Params ${(applicationTester.enabledQueryParams ?? []).length}`}
                variant="outlined"
              />
              <Chip size="small" label={`Flows ${(applicationTester.flows ?? []).length}`} variant="outlined" />
            </Stack>
            <TextField
              label="Application Tester Asset URL"
              value={applicationTester.assetUrl ?? ""}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <TextField
              label="Application API Mode"
              value={applicationTester.publicApiMode ?? ""}
              InputProps={{ readOnly: true }}
              helperText="Local CMS public routes are for local review. Deployed public service is the real online interaction path."
              fullWidth
            />
            <TextField
              label="Default Application API Origin"
              value={applicationTester.defaultApiOrigin ?? ""}
              InputProps={{ readOnly: true }}
              helperText="When set, deployed pages can exercise Firestore/comment flows without a localhost query parameter."
              fullWidth
            />
            <TextField
              label="Published Document URL"
              value={applicationTester.documentUrl ?? ""}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <TextField
              label="Direct Firestore Document URL"
              value={applicationTester.firestore?.documentUrl ?? ""}
              InputProps={{ readOnly: true }}
              helperText={
                applicationTester.firestore?.documentUrl
                  ? "This is the direct Firestore document behind the tester. The tester can also use the public app API path below."
                  : "No Firestore publication contract is configured for this page yet."
              }
              fullWidth
            />
            <TextField
              label="Public Published Document API Path"
              value={applicationTester.publicPublishedDocumentApiPath ?? ""}
              InputProps={{ readOnly: true }}
              helperText="Temporary application tester reads should prefer this bounded app API over direct anonymous Firestore reads."
              fullWidth
            />
            <TextField
              label="Public Comments API Path"
              value={applicationTester.publicCommentsApiPath ?? ""}
              InputProps={{ readOnly: true }}
              helperText={
                applicationTester.publicCommentsApiPath
                  ? "Temporary application tester comment submissions target this path when an application API origin is available."
                  : "Comment submission is not enabled for the current page payload."
              }
              fullWidth
            />
            <ValueList
              title="Enable Query Params"
              values={applicationTester.enabledQueryParams ?? []}
              emptyLabel="No enable query params declared."
            />
            <ValueList
              title="Application API Origin Query Params"
              values={applicationTester.apiOriginQueryParams ?? []}
              emptyLabel="No application API origin query params declared."
            />
            <ValueList
              title="Flows"
              values={(applicationTester.flows ?? []).map(formatFlowLabel)}
              emptyLabel="No tester flows declared."
            />
            <TextField
              label="Resolved Application Tester JSON"
              multiline
              minRows={12}
              value={jsonPreview(applicationTester)}
              InputProps={{ readOnly: true }}
            />
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}
