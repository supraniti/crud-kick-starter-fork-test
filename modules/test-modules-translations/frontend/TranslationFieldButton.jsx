import { Button } from "@mui/material";

export function TranslationFieldButton({ onClick, disabled = false }) {
  return (
    <Button
      variant="text"
      size="small"
      onClick={onClick}
      disabled={disabled}
      sx={{ alignSelf: "flex-end", px: 0 }}
    >
      Translations
    </Button>
  );
}
