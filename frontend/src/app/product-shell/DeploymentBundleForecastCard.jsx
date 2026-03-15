import { Alert, Card, CardContent, Chip, Stack, Typography } from "@mui/material";

export function DeploymentBundleForecastCard({ forecast }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Public Output Forecast</Typography>
            <Typography variant="body2" color="text.secondary">
              Inspect the selected bundle as one public outcome: page pattern, expected HTML count, delivery origin, and bound targets.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={forecast.modeLabel} variant="outlined" />
            <Chip
              size="small"
              label={`Expected outputs ${forecast.expectedOutputCount}`}
              color={forecast.expectedOutputCount > 0 ? "success" : "warning"}
            />
            <Chip size="small" label={`Deployment ${forecast.deploymentTargetTitle}`} variant="outlined" />
            <Chip size="small" label={`Browser ${forecast.browserTargetTitle}`} variant="outlined" />
          </Stack>

          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary">
              Page: {forecast.pageTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Path or pattern: {forecast.pathLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Public origin: {forecast.publicOrigin}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Example public URL: {forecast.publicUrl}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Media base: {forecast.publicMediaBaseUrl}
            </Typography>
          </Stack>

          {forecast.warnings.length > 0 ? (
            <Stack spacing={1}>
              {forecast.warnings.map((warning) => (
                <Alert key={warning} severity="warning">
                  {warning}
                </Alert>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
