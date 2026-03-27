import { Chip } from "@mui/material";

function resolveColor(tone) {
  if (tone === "success") {
    return "success";
  }
  if (tone === "warning") {
    return "warning";
  }
  if (tone === "error") {
    return "error";
  }
  return "default";
}

export function SyncPostureChip({ label, tone = "default", variant = "outlined", size = "small" }) {
  return <Chip size={size} label={label} color={resolveColor(tone)} variant={variant} />;
}
