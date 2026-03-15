import { Alert, Card, CardContent, Chip, Stack, TextField, Typography } from "@mui/material";
import { createDeploymentRuntimePreview } from "./product-deployment-runtime-preview.js";

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

export function DeploymentBundleRuntimePreviewCard({ runtimePreviewState }) {
  const preview = createDeploymentRuntimePreview({
    payload: runtimePreviewState.payload,
    previewSource: runtimePreviewState.previewSource
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Client Runtime Release Preview</Typography>
            <Typography variant="body2" color="text.secondary">
              Inspect the generated runtime contract from the selected bundle before release: datasets, queries, actions, slots, and resolved media links.
            </Typography>
          </Stack>

          {runtimePreviewState.loading ? (
            <Typography variant="body2" color="text.secondary">
              Resolving runtime preview...
            </Typography>
          ) : null}
          {runtimePreviewState.errorMessage ? <Alert severity="error">{runtimePreviewState.errorMessage}</Alert> : null}
          {!runtimePreviewState.loading && !runtimePreviewState.errorMessage && !runtimePreviewState.payload ? (
            <Alert severity="info">Select a published page bundle to resolve the runtime preview.</Alert>
          ) : null}

          {runtimePreviewState.payload ? (
            <>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" label={`Bootstrap ${preview.bootstrapDatasets.length}`} variant="outlined" />
                <Chip size="small" label={`Queries ${preview.queries.length}`} variant="outlined" />
                <Chip size="small" label={`Actions ${preview.actions.length}`} variant="outlined" />
                <Chip size="small" label={`Datasets ${preview.datasets.length}`} variant="outlined" />
                <Chip size="small" label={`Slots ${preview.slots.length}`} variant="outlined" />
                <Chip size="small" label={`Media links ${preview.mediaUrls.length}`} variant="outlined" />
              </Stack>

              <Stack spacing={0.75}>
                {preview.previewSourceLabel ? (
                  <Typography variant="body2" color="text.secondary">
                    Preview source: {preview.previewSourceLabel}
                  </Typography>
                ) : null}
                <Typography variant="body2" color="text.secondary">
                  Runtime asset: {preview.runtimeAssetUrl || "Not resolved yet"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Runtime remote base: {preview.runtimeRemoteBaseUrl || "Same-origin browser default"}
                </Typography>
              </Stack>

              <ValueList
                title="Bootstrap Datasets"
                values={preview.bootstrapDatasets}
                emptyLabel="No bootstrap datasets declared."
              />
              <ValueList title="Queries" values={preview.queries} emptyLabel="No runtime queries declared." />
              <ValueList title="Actions" values={preview.actions} emptyLabel="No runtime actions declared." />
              <ValueList title="Datasets" values={preview.datasets} emptyLabel="No runtime datasets declared." />
              <ValueList title="Slots" values={preview.slots} emptyLabel="No runtime slots declared." />
              <ValueList title="Resolved Media Links" values={preview.mediaUrls.slice(0, 4)} emptyLabel="No media links resolved." />

              <TextField
                label="Resolved Runtime Contract JSON"
                multiline
                minRows={12}
                value={preview.rawRuntimeJson}
                InputProps={{ readOnly: true }}
              />
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
