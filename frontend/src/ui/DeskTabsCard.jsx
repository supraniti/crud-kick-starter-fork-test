import { Paper, Tab, Tabs } from "@mui/material";

export function DeskTabsCard({ value, onChange, tabs }) {
  return (
    <Paper variant="outlined" sx={{ px: 2 }}>
      <Tabs value={value} onChange={(_, nextValue) => onChange(nextValue)}>
        {tabs.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Tabs>
    </Paper>
  );
}
