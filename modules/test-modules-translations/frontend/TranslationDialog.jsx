import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { lookupTranslationUnit, upsertTranslationUnit } from "./api.js";
import {
  listSupportedTranslationLocales,
  normalizeLocaleCode,
  readLocaleLabel,
  resolveTargetTranslationLocales
} from "../shared/translation-locale-catalog.mjs";

function normalizeField(value = null) {
  return value && typeof value === "object" ? value : null;
}

export function TranslationDialog({ open, field, onClose, onSaved = null }) {
  const normalizedField = normalizeField(field);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [existingItem, setExistingItem] = useState(null);
  const [translations, setTranslations] = useState({});

  const sourceLocale = normalizeLocaleCode(normalizedField?.sourceLocale ?? "en-US");
  const targetLocales = useMemo(
    () => resolveTargetTranslationLocales(sourceLocale),
    [sourceLocale]
  );
  const canPersist = Boolean(normalizedField?.entityId);
  const stale = Boolean(existingItem?.sourceValue) && existingItem.sourceValue !== (normalizedField?.sourceValue ?? "");

  useEffect(() => {
    if (!open || !normalizedField) {
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      if (!normalizedField.entityId) {
        setExistingItem(null);
        setTranslations({});
        setLoading(false);
        return;
      }
      try {
        const payload = await lookupTranslationUnit({
          entityType: normalizedField.entityType,
          entityId: normalizedField.entityId,
          fieldPath: normalizedField.fieldPath
        });
        if (!active) {
          return;
        }
        setExistingItem(payload?.item ?? null);
        setTranslations(payload?.item?.translations ?? {});
      } catch (error) {
        if (!active) {
          return;
        }
        setErrorMessage(error?.message ?? "Failed to load translations.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [open, normalizedField?.entityType, normalizedField?.entityId, normalizedField?.fieldPath, normalizedField?.sourceValue]);

  const handleSave = async () => {
    if (!normalizedField) {
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = await upsertTranslationUnit({
        entityType: normalizedField.entityType,
        entityId: normalizedField.entityId,
        entityLabel: normalizedField.entityLabel,
        fieldPath: normalizedField.fieldPath,
        fieldLabel: normalizedField.fieldLabel,
        sourceLocale,
        sourceValue: normalizedField.sourceValue ?? "",
        valueKind: normalizedField.valueKind ?? "text",
        translations
      });
      if (payload?.ok !== true) {
        throw new Error(payload?.error?.message ?? "Failed to save translations.");
      }
      setExistingItem(payload.item ?? null);
      setTranslations(payload.item?.translations ?? translations);
      setSuccessMessage(payload.action === "deleted" ? "Translation entry removed." : "Translations saved.");
      onSaved?.(payload.item ?? null);
    } catch (error) {
      setErrorMessage(error?.message ?? "Failed to save translations.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{normalizedField?.fieldLabel ?? "Translations"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={0.75}>
              <Typography variant="subtitle2">Source</Typography>
              <Typography variant="body2" color="text.secondary">
                {normalizedField?.entityLabel ?? "Record"} • {readLocaleLabel(sourceLocale)}
              </Typography>
              <Typography variant="body2">{normalizedField?.sourceValue ?? ""}</Typography>
            </Stack>
          </Paper>

          {!canPersist ? (
            <Alert severity="info">
              Save this record first. Translations need a stable record id before they can be persisted.
            </Alert>
          ) : null}
          {stale ? (
            <Alert severity="warning">
              The source value changed since these translations were last saved. Reader overlays will ignore the stale translation until you save again.
            </Alert>
          ) : null}
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
          {loading ? <Alert severity="info">Loading translations...</Alert> : null}

          <Stack spacing={2}>
            {targetLocales.map((locale) => (
              <TextField
                key={locale.code}
                label={locale.label}
                multiline={normalizedField?.valueKind === "rich-text"}
                minRows={normalizedField?.valueKind === "rich-text" ? 4 : 1}
                value={translations[locale.code] ?? ""}
                onChange={(event) =>
                  setTranslations((previous) => ({
                    ...previous,
                    [locale.code]: event.target.value
                  }))
                }
                disabled={!canPersist || saving}
                helperText={locale.nativeLabel}
              />
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleSave} disabled={!canPersist || saving || loading}>
          {saving ? "Saving..." : "Save Translations"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
