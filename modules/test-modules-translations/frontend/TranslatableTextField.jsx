import { Stack, TextField } from "@mui/material";
import { useState } from "react";
import { TranslationDialog } from "./TranslationDialog.jsx";
import { TranslationFieldButton } from "./TranslationFieldButton.jsx";

function hasTranslationField(field) {
  return Boolean(field && typeof field === "object" && typeof field.fieldPath === "string");
}

export function TranslatableTextField({
  translationField = null,
  translationEnabled = true,
  stackSx = null,
  ...textFieldProps
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const enabled = translationEnabled && hasTranslationField(translationField);

  return (
    <Stack spacing={0.5} sx={stackSx}>
      <TextField {...textFieldProps} />
      {enabled ? (
        <TranslationFieldButton
          onClick={() => setDialogOpen(true)}
          disabled={textFieldProps.disabled === true}
        />
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
