import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";

function StepRow({ index, title, description, action = null }) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "flex-start" }}>
      <Chip label={index} size="small" color="primary" sx={{ width: "fit-content" }} />
      <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {action}
      </Stack>
    </Stack>
  );
}

export function RemoteOpsConnectionSetupCard({ workspace }) {
  const credentialLoaded = Boolean(workspace.connectionDraft.serviceAccountEmail);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="subtitle1">GCP Connection Setup</Typography>
            <Typography variant="body2" color="text.secondary">
              Step 1 uses a local Google service-account key file controlled by the operator. The app stores
              only the file path and extracted metadata, then validates real access against GCP.
            </Typography>
            {!workspace.isCreatingConnection ? (
              <Box>
                <Button variant="text" size="small" onClick={workspace.startNewConnection}>
                  Start Fresh Connection
                </Button>
              </Box>
            ) : null}
          </Stack>
          <Alert severity="info">
            Keep the service-account key file outside the repo. When you choose it here, the app copies it
            into a local untracked runtime area and stores only the reference path and extracted metadata in
            collection rows.
          </Alert>
          <StepRow
            index="1"
            title="Create or choose a GCP service account"
            description="Use a service account with the minimum roles needed for Firestore, Cloud Storage, DNS, and certificate validation for your target procedures."
          />
          <StepRow
            index="2"
            title="Download the JSON key file and store it locally"
            description="Put the file somewhere stable on your machine, then choose it from the connection form below."
          />
          <StepRow
            index="3"
            title="Choose the key file"
            description="The app imports the JSON key into its local untracked runtime area, confirms it is a Google service-account key, and extracts the service-account email, key id, and suggested project id."
          />
          <StepRow
            index="4"
            title="Validate the connection"
            description="Validation confirms the service-account can obtain an access token and reach the selected GCP project before target-level validation begins."
          />
          {credentialLoaded ? (
            <Alert severity="success">
              Service account metadata loaded for <strong>{workspace.connectionDraft.serviceAccountEmail}</strong>.
              Validate the connection to confirm live project access.
            </Alert>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
