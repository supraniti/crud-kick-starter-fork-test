import { Alert, Button, Card, CardContent, Chip, Paper, Stack, Typography } from "@mui/material";

function CompareSummaryLine({ item }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.25 }}>
      <Stack spacing={0.5}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Typography variant="subtitle2">{item.label}</Typography>
          <Chip size="small" label={item.status} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {item.targetTitle}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Creates {item.createCount} • Updates {item.updateCount} • Deletes {item.deleteCount} • Local only {item.localOnlyCount} • Remote only {item.remoteOnlyCount}
        </Typography>
        {!item.hasComparison ? (
          <Typography variant="caption" color="text.secondary">
            Compare this target to populate drift counts before release.
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function DeploymentReleaseObservabilityCard({ observability, onAnalyzeCompatibility }) {
  if (!observability) {
    return null;
  }

  const { connection, analysis, footprint } = observability;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Remote Cost And Provisioning</Typography>
              <Typography variant="body2" color="text.secondary">
                Use this when you need the remote-side details: recurring-cost cautions, missing services, and provisioning actions.
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              onClick={onAnalyzeCompatibility}
              disabled={connection.state !== "ready" || analysis.processing}
            >
              {analysis.processing ? "Analyzing..." : "Analyze Remote Costs"}
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`Connection: ${connection.message}`} color={connection.state === "ready" ? "success" : "warning"} />
            <Chip size="small" label={`HTML outputs: ${footprint.htmlOutputs}`} />
            <Chip size="small" label={`Page status: ${footprint.pageStatus}`} />
            <Chip size="small" label={`Cost warnings: ${analysis.costWarnings.length}`} color={analysis.costWarnings.length > 0 ? "warning" : "default"} />
            <Chip size="small" label={`Missing resources: ${analysis.missingResources}`} color={analysis.missingResources > 0 ? "warning" : "default"} />
            <Chip size="small" label={`Provision actions: ${analysis.provisionableActions}`} color={analysis.provisionableActions > 0 ? "warning" : "default"} />
            <Chip size="small" label={`Safeguards: ${analysis.safeguardRuleCount}`} />
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Browser delivery: {footprint.browserDelivery.hostname ?? "No hostname"} • access {footprint.browserDelivery.accessMode ?? "n/a"} • stack {footprint.browserDelivery.stackMode ?? "n/a"} • DNS {footprint.browserDelivery.dnsMode ?? "n/a"}
          </Typography>

          {connection.state !== "ready" ? <Alert severity="warning">{connection.message}</Alert> : null}
          {analysis.errorMessage ? <Alert severity="error">{analysis.errorMessage}</Alert> : null}
          {connection.state === "ready" && !analysis.report && !analysis.processing ? (
            <Alert severity="info">Run remote analysis to load provisioning warnings and recurring-cost cautions for this bundle.</Alert>
          ) : null}
          {analysis.blockedBundles > 0 ? (
            <Alert severity="error">{analysis.blockedBundles} remote bundle areas are blocked by missing permissions.</Alert>
          ) : null}
          {analysis.actionRequiredBundles > 0 ? (
            <Alert severity="warning">{analysis.actionRequiredBundles} remote bundle areas still need provisioning actions.</Alert>
          ) : null}

          {analysis.costWarnings.length > 0 ? (
            <Alert severity="warning">
              <Stack spacing={0.5}>
                {analysis.costWarnings.map((warning) => (
                  <Typography key={warning.id} variant="body2">
                    {warning.label}: {warning.message}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}

          <Stack spacing={1}>
            {footprint.compareItems.map((item) => (
              <CompareSummaryLine key={item.key} item={item} />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
