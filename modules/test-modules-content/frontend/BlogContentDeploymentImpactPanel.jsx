import { Alert, Button, Chip, Paper, Stack, Typography } from "@mui/material";

export function BlogContentDeploymentImpactPanel({
  impactedTemplates,
  loading = false,
  errorMessage = null,
  onOpenPages = null
}) {
  if (loading) {
    return (
      <Alert severity="info">Checking whether this post participates in deployed page templates...</Alert>
    );
  }

  if (errorMessage) {
    return <Alert severity="warning">{errorMessage}</Alert>;
  }

  if (impactedTemplates.length === 0) {
    return <Alert severity="info">Standalone pages and deployed post templates are managed in the Pages module.</Alert>;
  }

  const staleTemplates = impactedTemplates.filter((page) => page.deploymentStatus === "stale").length;
  const missingTemplates = impactedTemplates.filter((page) => page.deploymentStatus === "missing").length;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">Deployment Impact</Typography>
            <Typography variant="body2" color="text.secondary">
              This post participates in {impactedTemplates.length} page template{impactedTemplates.length === 1 ? "" : "s"}.
            </Typography>
          </Stack>
          {typeof onOpenPages === "function" ? (
            <Button variant="outlined" onClick={onOpenPages}>
              Open Pages
            </Button>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={`${impactedTemplates.length} linked`} />
          <Chip
            size="small"
            color={staleTemplates > 0 || missingTemplates > 0 ? "warning" : "success"}
            variant="outlined"
            label={`${staleTemplates} stale · ${missingTemplates} missing`}
          />
        </Stack>
        <Stack spacing={1}>
          {impactedTemplates.map((page) => (
            <Paper key={page.id} variant="outlined" sx={{ p: 1.25 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2">{page.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {page.deploymentMode === "per-record" ? page.pathPattern || page.path : page.path}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip size="small" label={page.deploymentStatus ?? "missing"} variant="outlined" />
                  <Chip
                    size="small"
                    label={`${page.deploymentSyncedCount ?? 0}/${page.deploymentTargetCount ?? 0} synced`}
                    variant="outlined"
                  />
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
