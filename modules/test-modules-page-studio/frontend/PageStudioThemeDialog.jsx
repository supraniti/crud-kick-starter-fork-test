import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import {
  buildPredefinedThemeRecords,
  normalizeThemeDocument
} from "../../test-modules-themes/shared/theme-document.mjs";

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readThemeDocument(entry = {}) {
  if (entry?.themeDocument && typeof entry.themeDocument === "object") {
    return normalizeThemeDocument(entry.themeDocument);
  }
  if (typeof entry?.themeDocumentJson === "string" && entry.themeDocumentJson.trim().length > 0) {
    try {
      return normalizeThemeDocument(JSON.parse(entry.themeDocumentJson));
    } catch {
      return normalizeThemeDocument({});
    }
  }
  return normalizeThemeDocument({});
}

function buildThemeOptions(themeItems = []) {
  const items = Array.isArray(themeItems) && themeItems.length > 0 ? themeItems : buildPredefinedThemeRecords();
  return items.map((entry) => ({
    title: normalizeText(entry.title, "Theme"),
    themeKey: normalizeText(entry.themeKey, "theme"),
    summary: normalizeText(entry.summary, ""),
    isGlobalDefault: entry.isGlobalDefault === true,
    document: readThemeDocument(entry)
  }));
}

export function PageStudioThemeDialog({
  open,
  themeItems = [],
  selectedThemeKey = "global-default",
  onClose,
  onSave
}) {
  const themeOptions = useMemo(() => buildThemeOptions(themeItems), [themeItems]);
  const [draftThemeKey, setDraftThemeKey] = useState(selectedThemeKey);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraftThemeKey(selectedThemeKey);
  }, [open, selectedThemeKey]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Theme Picker</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          {themeOptions.map((theme) => {
            const selected = draftThemeKey === theme.themeKey;
            const colors = theme.document?.colorModel ?? {};
            return (
              <Paper
                key={theme.themeKey}
                variant="outlined"
                square
                sx={{
                  p: 1.25,
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "action.selected" : "background.paper",
                  cursor: "pointer"
                }}
                onClick={() => setDraftThemeKey(theme.themeKey)}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                    <Typography variant="subtitle2" sx={{ flex: 1 }}>
                      {theme.title}
                    </Typography>
                    {theme.isGlobalDefault ? <Chip size="small" color="primary" label="Global default" /> : null}
                    {selected ? <Chip size="small" variant="outlined" label="Selected" /> : null}
                  </Stack>
                  {theme.summary ? (
                    <Typography variant="body2" color="text.secondary">
                      {theme.summary}
                    </Typography>
                  ) : null}
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {[colors.primary, colors.secondary, colors.accent, colors.surface, colors.background]
                      .filter(Boolean)
                      .map((colorValue, index) => (
                        <Paper
                          key={`${theme.themeKey}-${index}`}
                          square
                          variant="outlined"
                          sx={{
                            width: 28,
                            height: 28,
                            borderColor: "divider",
                            bgcolor: colorValue
                          }}
                        />
                      ))}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {theme.document?.fontModel?.heading?.family ?? "Heading font"} / {theme.document?.fontModel?.body?.family ?? "Body font"}
                  </Typography>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(draftThemeKey)}>
          Use Theme
        </Button>
      </DialogActions>
    </Dialog>
  );
}
