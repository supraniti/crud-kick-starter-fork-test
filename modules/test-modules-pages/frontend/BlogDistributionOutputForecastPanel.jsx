import { Alert, Chip, Paper, Stack, Typography } from "@mui/material";
import { createPageOutputForecast } from "./page-output-forecast-support.js";

export function OutputForecastPanel({ workspace }) {
  const page = workspace.selectedPage ?? workspace.pageDraft;
  const forecast = createPageOutputForecast({
    page,
    previewSourceItems: workspace.previewSourceState.items,
    deploymentInstances: workspace.deploymentInstancesState.items,
    deliveryPayload: workspace.deliveryState.payload
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.25}>
          <Typography variant="h6">SEO + Output Forecast</Typography>
          <Typography variant="body2" color="text.secondary">
            Use the current draft, preview payload, and tracked deployment instances to see what this page will publish.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={forecast.modeLabel} variant="outlined" />
          <Chip
            size="small"
            label={`Expected HTML outputs ${forecast.expectedOutputCount}`}
            color={forecast.expectedOutputCount > 0 ? "success" : "warning"}
          />
          <Chip size="small" label={`Public origin ${forecast.publicOrigin}`} variant="outlined" />
        </Stack>

        <Alert severity={forecast.expectedOutputCount > 0 ? "info" : "warning"}>
          {forecast.expectedOutputCount > 0
            ? "The current draft resolves enough information to forecast its public outputs and SEO surface."
            : "The current draft is not yet specific enough to forecast public outputs."}
        </Alert>

        <Stack spacing={0.75}>
          <Typography variant="body2" color="text.secondary">
            Path or pattern: {forecast.pathLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Canonical: {forecast.canonicalUrl}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SEO title: {forecast.seoTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SEO description: {forecast.seoDescription}
          </Typography>
        </Stack>

        {forecast.samplePaths.length > 0 ? (
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Sample Output Paths</Typography>
            {forecast.samplePaths.map((path) => (
              <Typography key={path} variant="body2" color="text.secondary">
                {path}
              </Typography>
            ))}
            {forecast.extraPathCount > 0 ? (
              <Typography variant="caption" color="text.secondary">
                +{forecast.extraPathCount} additional output paths
              </Typography>
            ) : null}
          </Stack>
        ) : null}

        {forecast.samplePublicUrls.length > 0 ? (
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Sample Public URLs</Typography>
            {forecast.samplePublicUrls.map((url) => (
              <Typography key={url} variant="body2" color="text.secondary">
                {url}
              </Typography>
            ))}
            {forecast.extraPublicUrlCount > 0 ? (
              <Typography variant="caption" color="text.secondary">
                +{forecast.extraPublicUrlCount} additional public URLs
              </Typography>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
