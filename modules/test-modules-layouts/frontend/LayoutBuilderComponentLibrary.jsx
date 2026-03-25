import { Button, Chip, Paper, Stack, Typography } from "@mui/material";

export function LayoutBuilderComponentLibrary({
  components = [],
  selectedComponentKey = "",
  onSelectComponent
}) {
  if (!Array.isArray(components) || components.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">Widget Library</Typography>
      <Stack spacing={1.5}>
        {components.map((descriptor) => {
          const selected = descriptor.componentKey === selectedComponentKey;
          return (
            <Paper
              key={descriptor.componentKey}
              variant="outlined"
              sx={{
                p: 1.5,
                borderColor: selected ? "primary.main" : "divider",
                backgroundColor: selected ? "rgba(37,99,235,0.05)" : "background.paper"
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                  <Typography variant="subtitle2">{descriptor.displayName}</Typography>
                  <Chip size="small" label={descriptor.group} />
                  <Chip size="small" variant="outlined" label={descriptor.wrapperKind} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {descriptor.description ?? "Curated widget wrapper"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Choose the widget first. Then configure its content with either a static value, dynamic page data, or the media library.
                </Typography>
                <Button
                  variant={selected ? "contained" : "outlined"}
                  onClick={() => onSelectComponent?.(descriptor.componentKey)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {selected ? "Using This Widget" : "Use This Widget"}
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}
