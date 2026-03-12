import { Card, CardContent, Chip, Paper, Stack, Typography, Alert } from "@mui/material";

export function SummaryCard({ label, value, tone = "default" }) {
  return (
    <Card variant="outlined" sx={{ minWidth: 0 }}>
      <CardContent>
        <Stack spacing={0.5}>
          <Typography variant="overline" color="text.secondary">
            {label}
          </Typography>
          <Typography
            variant="h4"
            color={tone === "attention" ? "warning.main" : tone === "success" ? "success.main" : "text.primary"}
          >
            {value}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function Hero({ activeModuleLabel }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
        color: "common.white"
      }}
    >
      <Stack spacing={1}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
          {activeModuleLabel}
        </Typography>
        <Typography variant="h4">Remote Ops Kitchensink</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.84)", maxWidth: 880 }}>
          Step 1 now proves a service-account-first operator workflow: load a local GCP key file,
          validate real project access, then compare and sync real Firestore and storage targets
          while keeping browser-delivery validation-only and simulated smoke helpers explicit.
        </Typography>
      </Stack>
    </Paper>
  );
}

export function ValidationSummary({ summary, statusLabel }) {
  const tone =
    summary?.state === "error"
      ? "error"
      : summary?.state === "warning"
        ? "warning"
        : summary?.state === "validated"
          ? "success"
          : "default";
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="subtitle1">Validation Summary</Typography>
            <Chip size="small" label={statusLabel} color={tone} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {summary?.message ?? "Not validated yet."}
          </Typography>
          {Array.isArray(summary?.checkedItems) && summary.checkedItems.length > 0 ? (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {summary.checkedItems.map((item) => (
                <Chip key={item} size="small" variant="outlined" label={item} />
              ))}
            </Stack>
          ) : null}
          {Array.isArray(summary?.warnings) && summary.warnings.length > 0 ? (
            <Alert severity="warning">
              <Stack spacing={0.5}>
                {summary.warnings.map((warning) => (
                  <Typography key={warning} variant="body2">
                    {warning}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function CompareSummary({ summary }) {
  const tone = summary?.state === "error" ? "error" : summary?.state === "drift" ? "warning" : "success";
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="subtitle1">Compare Summary</Typography>
            <Chip size="small" label={summary?.state ?? "unknown"} color={tone} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {summary?.message ?? "Run compare to see drift."}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" variant="outlined" label={`Create ${summary?.createCount ?? 0}`} />
            <Chip size="small" variant="outlined" label={`Update ${summary?.updateCount ?? 0}`} />
            <Chip size="small" variant="outlined" label={`Delete ${summary?.deleteCount ?? 0}`} />
            <Chip size="small" variant="outlined" label={`Local Only ${summary?.localOnlyCount ?? 0}`} />
            <Chip size="small" variant="outlined" label={`Remote Only ${summary?.remoteOnlyCount ?? 0}`} />
          </Stack>
          {Array.isArray(summary?.sampleKeys) && summary.sampleKeys.length > 0 ? (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">Sample Keys</Typography>
              {summary.sampleKeys.map((key) => (
                <Typography key={key} variant="body2" sx={{ fontFamily: "monospace" }}>
                  {key}
                </Typography>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
