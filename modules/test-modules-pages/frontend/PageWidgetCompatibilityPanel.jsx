import { Alert, Button, Chip, Paper, Stack, Typography } from "@mui/material";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function PageWidgetCompatibilityPanel({
  page = null,
  widgetCompatibility = null,
  onOpenLayoutBuilder
}) {
  const summary = widgetCompatibility?.summary ?? {
    totalBlocks: 0,
    widgetizedBlocks: 0,
    compatibleWidgets: 0,
    blockingIssueCount: 0,
    warningIssueCount: 0
  };
  const inventory = toArray(widgetCompatibility?.widgetInventory);
  const widgetizedInventory = inventory.filter((entry) => entry.componentInstance);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack spacing={0.35}>
            <Typography variant="h6">Layout Widgets</Typography>
            <Typography variant="body2" color="text.secondary">
              Check whether the selected layout is already authored with compatible widgets for this page.
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={onOpenLayoutBuilder}>
            Open Layout
          </Button>
        </Stack>

        {!page?.layoutId ? (
          <Alert severity="info">Choose a reusable layout before widget compatibility can be evaluated.</Alert>
        ) : null}

        {page?.layoutId && summary.widgetizedBlocks === 0 ? (
          <Alert severity="info">
            This layout is still a structural shell. It does not yet assign widgets to any block.
          </Alert>
        ) : null}

        {page?.layoutId && summary.widgetizedBlocks > 0 ? (
          <Alert severity={summary.blockingIssueCount > 0 ? "warning" : "success"}>
            {summary.blockingIssueCount > 0
              ? `${summary.blockingIssueCount} blocking widget issue${summary.blockingIssueCount === 1 ? "" : "s"} must be resolved before preview/publish.`
              : `${summary.compatibleWidgets} widget block${summary.compatibleWidgets === 1 ? "" : "s"} are currently compatible with this page.`}
          </Alert>
        ) : null}

        {widgetizedInventory.map((entry) => (
          <Paper key={entry.nodeId} variant="outlined" sx={{ p: 1.5 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                <Typography variant="subtitle2">{entry.nodeLabel}</Typography>
                <Chip
                  size="small"
                  color={entry.isCompatible ? "success" : "warning"}
                  variant={entry.isCompatible ? "outlined" : "filled"}
                  label={entry.descriptor?.displayName ?? entry.componentInstance?.componentKey ?? "Unknown widget"}
                />
                <Chip size="small" variant="outlined" label={entry.nodeId} />
              </Stack>
              {entry.issues.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Ready for preview and publish.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {entry.issues.map((issue) => (
                    <Alert key={`${entry.nodeId}-${issue.code}-${issue.bindingField ?? "base"}`} severity={issue.blocking ? "warning" : "info"}>
                      {issue.message}
                    </Alert>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}
