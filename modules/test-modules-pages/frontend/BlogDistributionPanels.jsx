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
  PAGE_KIND_OPTIONS,
  PAGE_STATUS_OPTIONS,
  PRIMARY_SOURCE_TYPE_OPTIONS,
  resolveSourceLabel
} from "./blog-distribution-panel-support.js";

export {
  DeliveryPreviewPanel,
  DeploymentInstancesPanel,
  ReadinessPanel
} from "./BlogDistributionPagePanels.jsx";
export { OutputForecastPanel } from "./BlogDistributionOutputForecastPanel.jsx";
export {
  RedirectEditorPanel,
  RedirectFilters,
  RedirectList
} from "./BlogDistributionRedirectPanels.jsx";

export function SummaryCard({ label, value, tone = "default" }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4">{value}</Typography>
        <Chip
          size="small"
          label={tone}
          color={tone === "attention" ? "warning" : "default"}
          sx={{ alignSelf: "flex-start" }}
        />
      </Stack>
    </Paper>
  );
}

export function DistributionFilters({ filters, onChangeFilters, onClear }) {
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
          {PAGE_STATUS_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Page Kind"
          size="small"
          value={filters.pageKind}
          onChange={(event) => onChangeFilters("pageKind", event.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {PAGE_KIND_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Primary Source"
          size="small"
          value={filters.primarySourceType}
          onChange={(event) => onChangeFilters("primarySourceType", event.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {PRIMARY_SOURCE_TYPE_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Readiness"
          size="small"
          value={filters.readiness}
          onChange={(event) => onChangeFilters("readiness", event.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="ready">Ready</MenuItem>
          <MenuItem value="warnings">Has warnings</MenuItem>
        </TextField>
        <Button variant="outlined" onClick={onClear}>
          Clear Filters
        </Button>
      </Stack>
    </Paper>
  );
}

export function DistributionQueue({ pages, selectedPageId, sourceOptionsByType, readinessMap, onSelectPage, onCreatePage }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Pages Desk</Typography>
          <Button variant="contained" onClick={onCreatePage}>
            New Page
          </Button>
        </Stack>
        {pages.length === 0 ? <Alert severity="info">No pages match the current filters.</Alert> : null}
        <Stack spacing={1.5}>
          {pages.map((page) => {
            const issues = readinessMap.get(page.id) ?? [];
            return (
              <Paper
                key={page.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  cursor: "pointer",
                  borderColor: selectedPageId === page.id ? "primary.main" : "divider"
                }}
                onClick={() => onSelectPage(page.id)}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                    <Typography variant="subtitle2">{page.title}</Typography>
                    <Chip size="small" label={page.status} />
                    <Chip size="small" label={page.pageKind} variant="outlined" />
                    <Chip size="small" label={page.deploymentMode ?? "single-page"} variant="outlined" />
                    <Chip size="small" label={page.deploymentStatus ?? "missing"} variant="outlined" />
                    <Chip
                      size="small"
                      label={`Expected ${page.deploymentMode === "per-record" ? page.deploymentTargetCount ?? 0 : 1}`}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`${issues.length} warning${issues.length === 1 ? "" : "s"}`}
                      color={issues.length > 0 ? "warning" : "success"}
                      variant={issues.length > 0 ? "filled" : "outlined"}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {page.deploymentMode === "per-record" ? page.pathPattern || page.path : page.path}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {resolveSourceLabel(
                      sourceOptionsByType,
                      page.primarySourceType,
                      page.primarySource?.itemId ?? "",
                      page.sourceSelectionMode
                    )}
                  </Typography>
                  {page.deploymentMode === "per-record" ? (
                    <Typography variant="caption" color="text.secondary">
                      {`${page.deploymentSyncedCount ?? 0}/${page.deploymentTargetCount ?? 0} synced`}
                      {` · ${page.deploymentStaleCount ?? 0} stale`}
                      {` · ${page.deploymentMissingCount ?? 0} missing`}
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Stack>
    </Paper>
  );
}
