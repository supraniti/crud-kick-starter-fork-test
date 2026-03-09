import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import {
  REDIRECT_HTTP_CODE_OPTIONS,
  REDIRECT_STATUS_OPTIONS
} from "./blog-distribution-panel-support.js";

export function RedirectFilters({ filters, pages, onChangeFilters, onClear }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <TextField
          label="Search"
          size="small"
          value={filters.search}
          onChange={(event) => onChangeFilters("search", event.target.value)}
        />
        <TextField
          select
          label="Status"
          size="small"
          value={filters.status}
          onChange={(event) => onChangeFilters("status", event.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {REDIRECT_STATUS_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="HTTP Code"
          size="small"
          value={filters.httpCode}
          onChange={(event) => onChangeFilters("httpCode", event.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {REDIRECT_HTTP_CODE_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Target Page"
          size="small"
          value={filters.targetPageId}
          onChange={(event) => onChangeFilters("targetPageId", event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All</MenuItem>
          {pages.map((page) => (
            <MenuItem key={page.id} value={page.id}>
              {page.title}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" onClick={onClear}>
          Clear Filters
        </Button>
      </Stack>
    </Paper>
  );
}

export function RedirectList({ redirects, pageById, selectedRedirectId, onSelectRedirect, onCreateRedirect }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Redirect Registry</Typography>
          <Button variant="outlined" onClick={onCreateRedirect}>
            New Redirect
          </Button>
        </Stack>
        {redirects.length === 0 ? <Alert severity="info">No redirect rules match the current filters.</Alert> : null}
        <Stack spacing={1.5}>
          {redirects.map((rule) => (
            <Paper
              key={rule.id}
              variant="outlined"
              sx={{
                p: 1.5,
                cursor: "pointer",
                borderColor: selectedRedirectId === rule.id ? "primary.main" : "divider"
              }}
              onClick={() => onSelectRedirect(rule.id)}
            >
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Typography variant="subtitle2">{rule.sourcePath}</Typography>
                  <Chip size="small" label={rule.status} />
                  <Chip size="small" label={rule.httpCode} variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {rule.targetPageId
                    ? pageById.get(rule.targetPageId)?.title ?? rule.targetPageId
                    : rule.targetUrl || "No target configured"}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

export function RedirectEditorPanel({ workspace }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">
          {workspace.selectedRedirectId ? "Edit Redirect Rule" : "Create Redirect Rule"}
        </Typography>
        {workspace.redirectActionState.errorMessage ? <Alert severity="error">{workspace.redirectActionState.errorMessage}</Alert> : null}
        {workspace.redirectActionState.successMessage ? <Alert severity="success">{workspace.redirectActionState.successMessage}</Alert> : null}
        <TextField
          label="Source Path"
          value={workspace.redirectDraft.sourcePath}
          onChange={(event) => workspace.changeRedirectField("sourcePath", event.target.value)}
          helperText="Use a relative path such as /blog/old-launch-url"
        />
        <TextField
          select
          label="Target Page"
          value={workspace.redirectDraft.targetPageId}
          onChange={(event) => workspace.changeRedirectField("targetPageId", event.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          {workspace.pages.map((page) => (
            <MenuItem key={page.id} value={page.id}>
              {page.title}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Target URL"
          value={workspace.redirectDraft.targetUrl}
          onChange={(event) => workspace.changeRedirectField("targetUrl", event.target.value)}
          helperText="Set either a target page or a direct URL."
        />
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="HTTP Code"
            value={workspace.redirectDraft.httpCode}
            onChange={(event) => workspace.changeRedirectField("httpCode", event.target.value)}
            sx={{ minWidth: 160 }}
          >
            {REDIRECT_HTTP_CODE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            value={workspace.redirectDraft.status}
            onChange={(event) => workspace.changeRedirectField("status", event.target.value)}
            sx={{ minWidth: 180 }}
          >
            {REDIRECT_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <TextField
          label="Reason"
          value={workspace.redirectDraft.reason}
          onChange={(event) => workspace.changeRedirectField("reason", event.target.value)}
          multiline
          minRows={3}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="contained"
            onClick={workspace.persistRedirect}
            disabled={workspace.redirectActionState.saving}
          >
            {workspace.selectedRedirectId ? "Save Redirect" : "Create Redirect"}
          </Button>
          <Button variant="outlined" onClick={workspace.startNewRedirect}>
            New Draft
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={workspace.disableSelectedRedirect}
            disabled={!workspace.selectedRedirectId || workspace.redirectActionState.saving}
          >
            Disable Redirect
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
