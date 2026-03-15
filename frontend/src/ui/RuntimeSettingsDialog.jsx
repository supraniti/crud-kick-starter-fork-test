import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from "@mui/material";
import { ModuleRuntimePanel } from "./ModuleRuntimePanel.jsx";

function RuntimeSettingsDialog({
  open,
  onClose,
  moduleRuntimeState,
  onRunModuleAction
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Developer Runtime Settings</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Developer-only controls for lifecycle state, internal module exposure, and runtime availability.
          </Typography>
          <ModuleRuntimePanel
            moduleRuntimeState={moduleRuntimeState}
            onRunAction={onRunModuleAction}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export { RuntimeSettingsDialog };

