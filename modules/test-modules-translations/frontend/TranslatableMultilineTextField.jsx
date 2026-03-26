import { memo, useCallback, useState } from "react";
import { Stack, TextField } from "@mui/material";
import { TranslationDialog } from "./TranslationDialog.jsx";
import { TranslationFieldButton } from "./TranslationFieldButton.jsx";

function hasTranslationField(field) {
  return Boolean(field && typeof field === "object" && typeof field.fieldPath === "string");
}

function TranslatableMultilineTextFieldComponent({
  label,
  value,
  fieldId,
  onChangeField,
  minRows = 3,
  translationField = null,
  translationEnabled = true,
  size = undefined,
  helperText = undefined,
  error = false
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const enabled = translationEnabled && hasTranslationField(translationField);
  const handleChange = useCallback(
    (event) => {
      onChangeField(fieldId, event.target.value);
    },
    [fieldId, onChangeField]
  );

  return (
    <Stack spacing={0.5}>
      <TextField
        label={label}
        value={value}
        onChange={handleChange}
        multiline
        minRows={minRows}
        size={size}
        helperText={helperText}
        error={error}
      />
      {enabled ? (
        <TranslationFieldButton onClick={() => setDialogOpen(true)} />
      ) : null}
      {enabled ? (
        <TranslationDialog
          open={dialogOpen}
          field={translationField}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </Stack>
  );
}

function areEqual(previousProps, nextProps) {
  const previousField = previousProps.translationField ?? null;
  const nextField = nextProps.translationField ?? null;
  return (
    previousProps.label === nextProps.label &&
    previousProps.value === nextProps.value &&
    previousProps.fieldId === nextProps.fieldId &&
    previousProps.onChangeField === nextProps.onChangeField &&
    previousProps.minRows === nextProps.minRows &&
    previousProps.size === nextProps.size &&
    previousProps.helperText === nextProps.helperText &&
    previousProps.error === nextProps.error &&
    previousField?.entityType === nextField?.entityType &&
    previousField?.entityId === nextField?.entityId &&
    previousField?.entityLabel === nextField?.entityLabel &&
    previousField?.fieldPath === nextField?.fieldPath &&
    previousField?.fieldLabel === nextField?.fieldLabel &&
    previousField?.sourceLocale === nextField?.sourceLocale &&
    previousField?.sourceValue === nextField?.sourceValue &&
    previousField?.valueKind === nextField?.valueKind &&
    previousProps.translationEnabled === nextProps.translationEnabled
  );
}

export const TranslatableMultilineTextField = memo(
  TranslatableMultilineTextFieldComponent,
  areEqual
);
