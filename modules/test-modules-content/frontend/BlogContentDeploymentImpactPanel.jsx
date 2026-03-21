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
    return (
      <Alert severity="info">
        No published page is currently using this story. Create or assign one in Pages before expecting a live URL.
      </Alert>
    );
  }

  const staleTemplates = impactedTemplates.filter((page) => page.deploymentStatus === "stale").length;
  const missingTemplates = impactedTemplates.filter((page) => page.deploymentStatus === "missing").length;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">Public Pages</Typography>
            <Typography variant="body2" color="text.secondary">
              These page templates can make this story visible to readers.
            </Typography>
          </Stack>
          {typeof onOpenPages === "function" ? (
            <Button variant="outlined" onClick={onOpenPages}>
              Open Pages
            </Button>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={`${impactedTemplates.length} page${impactedTemplates.length === 1 ? "" : "s"}`} />
          <Chip
            size="small"
            color={staleTemplates > 0 || missingTemplates > 0 ? "warning" : "success"}
            variant={staleTemplates > 0 || missingTemplates > 0 ? "outlined" : "filled"}
            label={staleTemplates > 0 || missingTemplates > 0 ? `${staleTemplates} need refresh · ${missingTemplates} missing` : "Ready for readers"}
          />
        </Stack>
        <Stack spacing={1}>
          {impactedTemplates.map((page) => (
            <Paper key={page.id} variant="outlined" sx={{ p: 1.25 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2">{page.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {page.publicationOutput?.path || (page.deploymentMode === "per-record" ? page.pathPattern || page.path : page.path)}
                  </Typography>
                  {page.publicationOutput?.localArtifactPath ? (
                    <Typography variant="caption" color="text.secondary">
                      Local artifact: {page.publicationOutput.localArtifactPath}
                    </Typography>
                  ) : null}
                  {page.publicationOutput?.publicUrl ? (
                    <Typography variant="caption" color="text.secondary">
                      Public URL: {page.publicationOutput.publicUrl}
                    </Typography>
                  ) : null}
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip size="small" label={page.deploymentStatus ?? "missing"} variant="outlined" />
                  {page.publicationOutput?.publicUrl ? (
                    <Button
                      component="a"
                      href={page.publicationOutput.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      size="small"
                      variant="outlined"
                    >
                      Open URL
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
