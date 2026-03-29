import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function createSeoTag(index = 0) {
  return {
    key: `tag-${index + 1}`,
    label: `SEO Tag ${index + 1}`,
    valueBinding: {
      mode: "static",
      value: ""
    }
  };
}

export function PageStudioSeoDialog({
  open,
  initialSeoTags = [],
  bindableFields = [],
  onClose,
  onSave
}) {
  const [seoTags, setSeoTags] = useState(() => cloneJson(initialSeoTags));

  useEffect(() => {
    if (!open) {
      return;
    }
    setSeoTags(cloneJson(initialSeoTags));
  }, [initialSeoTags, open]);

  const fieldOptions = useMemo(
    () => (Array.isArray(bindableFields) ? bindableFields : []).filter((entry) => entry?.path),
    [bindableFields]
  );

  function patchTag(index, patch) {
    setSeoTags((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry))
    );
  }

  function patchValueBinding(index, patch) {
    setSeoTags((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              valueBinding: {
                ...entry.valueBinding,
                ...patch
              }
            }
          : entry
      )
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>SEO Tags</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Alert severity="info">
            SEO values can stay static or bind directly to the declared page context. The same tag contract should flow into Preview and Live.
          </Alert>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              size="small"
              variant="contained"
              onClick={() => setSeoTags((current) => [...current, createSeoTag(current.length)])}
            >
              Add SEO Tag
            </Button>
          </Stack>
          <Stack spacing={1}>
            {seoTags.map((entry, index) => {
              const dynamic = entry.valueBinding?.mode === "dynamic";
              return (
                <Paper key={`${entry.key}-${index}`} variant="outlined" square sx={{ p: 1.25 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {entry.label || entry.key || `SEO Tag ${index + 1}`}
                      </Typography>
                      <Tooltip title="Remove tag">
                        <IconButton size="small" onClick={() => setSeoTags((current) => current.filter((_, entryIndex) => entryIndex !== index))}>
                          ×
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <TextField
                        label="Tag Key"
                        size="small"
                        value={entry.key}
                        onChange={(event) => patchTag(index, { key: event.target.value })}
                      />
                      <TextField
                        label="Label"
                        size="small"
                        value={entry.label}
                        onChange={(event) => patchTag(index, { label: event.target.value })}
                      />
                      <TextField
                        select
                        label="Source"
                        size="small"
                        value={dynamic ? "dynamic" : "static"}
                        onChange={(event) => {
                          if (event.target.value === "dynamic") {
                            patchValueBinding(index, {
                              mode: "dynamic",
                              source: "context",
                              path: fieldOptions[0]?.path ?? "context.page.title",
                              fallback: ""
                            });
                            return;
                          }
                          patchValueBinding(index, {
                            mode: "static",
                            value: entry.valueBinding?.value ?? ""
                          });
                        }}
                      >
                        <MenuItem value="static">Static text</MenuItem>
                        <MenuItem value="dynamic">Dynamic page data</MenuItem>
                      </TextField>
                    </Stack>
                    {dynamic ? (
                      <TextField
                        select
                        label="Page data field"
                        size="small"
                        value={entry.valueBinding?.path ?? ""}
                        onChange={(event) =>
                          patchValueBinding(index, {
                            mode: "dynamic",
                            source: "context",
                            path: event.target.value
                          })
                        }
                        helperText="Pick from the canonical context manifest."
                      >
                        {fieldOptions.map((option) => (
                          <MenuItem key={option.path} value={option.path}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <TextField
                        label="Static value"
                        size="small"
                        fullWidth
                        value={normalizeText(entry.valueBinding?.value, "")}
                        onChange={(event) =>
                          patchValueBinding(index, {
                            mode: "static",
                            value: event.target.value
                          })
                        }
                      />
                    )}
                  </Stack>
                </Paper>
              );
            })}
            {seoTags.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No SEO tags yet. Add tags here instead of editing raw fields on the page.
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(cloneJson(seoTags))}>
          Save SEO
        </Button>
      </DialogActions>
    </Dialog>
  );
}
