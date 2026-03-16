import { Stack } from "@mui/material";

export function DeskSplitLayout({ sidebar, main, sidebarWidth = 360 }) {
  return (
    <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
      <Stack sx={{ width: { xs: "100%", xl: sidebarWidth }, flexShrink: 0 }}>{sidebar}</Stack>
      <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
        {main}
      </Stack>
    </Stack>
  );
}
