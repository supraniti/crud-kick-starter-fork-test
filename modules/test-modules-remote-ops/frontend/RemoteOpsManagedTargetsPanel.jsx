import { Card, CardContent, Chip, Paper, Stack, Typography } from "@mui/material";

const MANAGED_PRODUCT_TARGETS = Object.freeze([
  {
    key: "posts-projection",
    label: "Posts Projection",
    description: "Remote Firestore collection for published posts."
  },
  {
    key: "categories-projection",
    label: "Categories Projection",
    description: "Remote Firestore collection for public categories."
  },
  {
    key: "tags-projection",
    label: "Tags Projection",
    description: "Remote Firestore collection for public tags."
  },
  {
    key: "deployment-storage",
    label: "HTML Deployment",
    description: "Remote storage mirror for generated page HTML."
  },
  {
    key: "media-storage",
    label: "Media Library",
    description: "Remote storage mirror for published media."
  },
  {
    key: "browser-delivery",
    label: "Primary Domain",
    description: "Browser-delivery target for custom domains or GCP temporary URLs."
  }
]);

export function ManagedProductTargetsPanel({ workspace }) {
  const connectionId = workspace.selectedConnectionId;
  const targetsByBindingKey = new Map(
    workspace.targets
      .filter(
        (target) =>
          target?.connectionProfileId === connectionId && typeof target?.productBindingKey === "string"
      )
      .map((target) => [target.productBindingKey, target])
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="subtitle1">Managed Product Targets</Typography>
            <Chip
              size="small"
              variant="outlined"
              label={`${targetsByBindingKey.size}/${MANAGED_PRODUCT_TARGETS.length} prepared`}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            A validated connection now prepares the product&apos;s standard remote bundle automatically. You can still
            open the Targets tab for lower-level edits, but the product desks consume this managed set by default.
          </Typography>
          <Stack spacing={1}>
            {MANAGED_PRODUCT_TARGETS.map((spec) => {
              const target = targetsByBindingKey.get(spec.key) ?? null;
              return (
                <Paper key={spec.key} variant="outlined" sx={{ p: 1.25 }}>
                  <Stack spacing={0.35}>
                    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                      <Typography variant="body2">{spec.label}</Typography>
                      <Chip
                        size="small"
                        label={target?.targetStatus ?? "missing"}
                        color={
                          target?.targetStatus === "validated"
                            ? "success"
                            : target?.targetStatus === "warning"
                              ? "warning"
                              : target?.targetStatus === "error"
                                ? "error"
                                : "default"
                        }
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {target?.title ?? spec.description}
                    </Typography>
                    {target?.config?.bucketName ? (
                      <Typography variant="caption" color="text.secondary">
                        Bucket: {target.config.bucketName}
                      </Typography>
                    ) : null}
                    {target?.config?.firestoreCollectionPath ? (
                      <Typography variant="caption" color="text.secondary">
                        Firestore path: {target.config.firestoreCollectionPath}
                      </Typography>
                    ) : null}
                    {target?.config?.hostname ? (
                      <Typography variant="caption" color="text.secondary">
                        Hostname: {target.config.hostname}
                      </Typography>
                    ) : null}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
