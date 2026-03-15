import { Box, Paper, Stack, Typography } from "@mui/material";

export function HiddenFileInput(props) {
  return (
    <Box
      component="input"
      sx={{
        border: 0,
        clip: "rect(0 0 0 0)",
        height: 1,
        m: -1,
        overflow: "hidden",
        p: 0,
        position: "absolute",
        whiteSpace: "nowrap",
        width: 1
      }}
      {...props}
    />
  );
}

export function ProductConnectionMetadata({ draft }) {
  const metadataLines = [
    draft.projectDisplayName ? `Project: ${draft.projectDisplayName}` : null,
    draft.projectNumber ? `Project number: ${draft.projectNumber}` : null,
    draft.serviceAccountKeyId ? `Key ID: ${draft.serviceAccountKeyId}` : null
  ].filter(Boolean);

  if (metadataLines.length === 0) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">Discovered Metadata</Typography>
        {metadataLines.map((line) => (
          <Typography key={line} variant="body2" color="text.secondary">
            {line}
          </Typography>
        ))}
      </Stack>
    </Paper>
  );
}
