import {
  Alert,
  Button,
  Chip,
  Drawer,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DeliveryPreviewPanel,
  DeploymentInstancesPanel,
  OutputForecastPanel,
  RedirectEditorPanel,
  RedirectFilters,
  RedirectList
} from "./BlogDistributionPanels.jsx";
import { RuntimeContractPanel } from "./BlogDistributionRuntimeContractPanel.jsx";
import { PageWidgetCompatibilityPanel } from "./PageWidgetCompatibilityPanel.jsx";
import {
  PagesBrowserDeliveryPanel,
  PagesRemoteDeploymentPanel,
  PagesRemoteSettingsPanel
} from "./BlogDistributionRemotePanels.jsx";
import { useBlogDistributionWorkspace } from "./useBlogDistributionWorkspace.js";
import { useEmbeddedRemoteOpsSupport } from "../../test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js";
import { DeskTabsCard } from "../../../frontend/src/ui/DeskTabsCard.jsx";
import { applyPagePreset } from "./BlogDistributionPageFlowSections.jsx";
import {
  DataSourcesSection,
  PageReadinessSection,
  PageRemoteBindingsSection,
  PageSeoSection
} from "./BlogDistributionPageAdvancedSections.jsx";
import {
  DEPLOYMENT_MODE_OPTIONS,
  PAGE_KIND_OPTIONS,
  PAGE_STATUS_OPTIONS,
  PRIMARY_SOURCE_TYPE_OPTIONS,
  resolvePerRecordPathPlaceholder,
  resolveSourceTypeLabels,
  SOURCE_SELECTION_MODE_OPTIONS
} from "./blog-distribution-panel-support.js";
import {
  buildVisiblePages,
  createPagesStorySummary,
  paginatePages,
  resolveOutputPosture,
  resolveOutputPromise,
  resolvePagePathLabel,
  resolvePagesDeskRouteState,
  resolvePageSourceSummary,
  resolvePageStoryType
} from "./pages-desk-model.js";
import { resolvePagePublicOutput } from "./page-public-link-support.js";

const REDIRECTS_COLLECTION_ID = "blog-redirect-rules";
const PAGE_SIZE = 8;

function Hero({ activeModuleLabel }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        background: "linear-gradient(135deg, #132238 0%, #365d75 100%)",
        color: "common.white"
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
          {activeModuleLabel}
        </Typography>
        <Typography variant="h4">Pages</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)", maxWidth: 860 }}>
          Decide what kind of public surface you are creating, how many outputs it will publish, and what those outputs look like before release.
        </Typography>
      </Stack>
    </Paper>
  );
}

function SummaryCard({ label, value, detail, tone = "default" }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4">{value}</Typography>
        <Typography variant="body2" color="text.secondary">
          {detail}
        </Typography>
        <Chip
          size="small"
          label={tone === "warning" ? "attention" : "healthy"}
          color={tone === "warning" ? "warning" : "default"}
          sx={{ alignSelf: "flex-start" }}
        />
      </Stack>
    </Paper>
  );
}

function SummaryGrid({ summary }) {
  return (
    <Stack
      spacing={2}
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "repeat(3, minmax(0, 1fr))",
          xl: "repeat(5, minmax(0, 1fr))"
        }
      }}
    >
      <SummaryCard
        label="Standalone"
        value={summary.standaloneCount}
        detail="One page, one public output"
      />
      <SummaryCard
        label="Post Templates"
        value={summary.postTemplateCount}
        detail="Reusable post-detail surfaces"
      />
      <SummaryCard
        label="Category Templates"
        value={summary.categoryTemplateCount}
        detail="Reusable category surfaces"
      />
      <SummaryCard
        label="Live"
        value={summary.liveCount}
        detail="Publishing promises currently in sync"
      />
      <SummaryCard
        label="Needs Attention"
        value={summary.staleOrMissingCount}
        detail="Missing or stale outputs still need work"
        tone="warning"
      />
    </Stack>
  );
}

function PagesToolbar({
  routeState,
  onChangeField,
  onClear,
  onCreatePage
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle1">Page Backlog</Typography>
          <Typography variant="body2" color="text.secondary">
            Start from the type of public surface you want to publish, then open one page promise and refine it in the workbench.
          </Typography>
        </Stack>
        <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems={{ xs: "stretch", xl: "center" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            useFlexGap
            flexWrap="wrap"
            sx={{ flex: 1, minWidth: 0 }}
          >
            <TextField
              size="small"
              label="Search Pages"
              value={routeState.search}
              onChange={(event) => onChangeField("pageSearch", event.target.value)}
              sx={{ minWidth: 220, flex: "1 1 220px" }}
            />
            <TextField
              select
              size="small"
              label="Page Type"
              value={routeState.storyType}
              onChange={(event) => onChangeField("pageStoryType", event.target.value)}
              sx={{ minWidth: 190, flex: "1 1 190px" }}
            >
              <MenuItem value="">All page types</MenuItem>
              <MenuItem value="standalone">Standalone</MenuItem>
              <MenuItem value="post-template">Post template</MenuItem>
              <MenuItem value="category-template">Category template</MenuItem>
              <MenuItem value="tag-template">Tag template</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Attention"
              value={routeState.attention}
              onChange={(event) => onChangeField("pageAttention", event.target.value)}
              sx={{ minWidth: 170, flex: "1 1 170px" }}
            >
              <MenuItem value="">All states</MenuItem>
              <MenuItem value="ready">Ready</MenuItem>
              <MenuItem value="attention">Needs attention</MenuItem>
              <MenuItem value="live">Live</MenuItem>
              <MenuItem value="not-live">Not live yet</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Sort"
              value={routeState.sort}
              onChange={(event) => onChangeField("pageSort", event.target.value)}
              sx={{ minWidth: 180, flex: "1 1 180px" }}
            >
              <MenuItem value="updated-desc">Recently updated</MenuItem>
              <MenuItem value="title-asc">Title A-Z</MenuItem>
              <MenuItem value="outputs-desc">Most outputs first</MenuItem>
              <MenuItem value="live-first">Live first</MenuItem>
            </TextField>
            <Button variant="outlined" onClick={onClear}>
              Clear
            </Button>
          </Stack>
          <Button variant="contained" onClick={onCreatePage} sx={{ flexShrink: 0 }}>
            New Page
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function StateChip({ label, tone = "default", variant = "outlined" }) {
  const color =
    tone === "success" ? "success" : tone === "warning" ? "warning" : tone === "error" ? "error" : "default";
  return <Chip size="small" label={label} color={color} variant={variant} />;
}

function resolveRosterExampleSource(page, sourceOptionsByType) {
  const options = Array.isArray(sourceOptionsByType?.[page?.primarySourceType])
    ? sourceOptionsByType[page.primarySourceType]
    : [];

  if (options.length === 0) {
    return null;
  }

  const primarySourceId = page?.primarySource?.itemId ?? page?.primarySourceItemId ?? "";
  if (primarySourceId) {
    return options.find((option) => option.id === primarySourceId) ?? options[0];
  }

  return options[0];
}

function PageRosterTable({
  rows,
  pagination,
  sourceOptionsByType,
  readinessMap,
  remoteTargets,
  fallbackDeploymentTarget,
  fallbackBrowserTarget,
  selectedPageId,
  onSelectPage,
  onChangePage
}) {
  const cellTextSx = {
    minWidth: 0,
    wordBreak: "break-word",
    whiteSpace: "normal"
  };

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table
          size="small"
          sx={{
            tableLayout: { xs: "fixed", lg: "auto" },
            "& th, & td": {
              verticalAlign: "top"
            }
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Page</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Public Pattern</TableCell>
              <TableCell>Live</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((page) => {
              const storyType = resolvePageStoryType(page);
              const posture = resolveOutputPosture(page);
              const readinessIssues = readinessMap.get(page.id) ?? [];
              const exampleSource = resolveRosterExampleSource(page, sourceOptionsByType);
              const liveOutput = resolvePagePublicOutput({
                page,
                sourceRecord: exampleSource,
                targets: remoteTargets,
                fallbackDeploymentTarget,
                fallbackBrowserTarget
              });
              const liveUrl = liveOutput.publicUrl;

              return (
                <TableRow
                  key={page.id}
                  hover
                  selected={selectedPageId === page.id}
                  sx={{ cursor: "pointer" }}
                  onClick={() => onSelectPage(page.id)}
                >
                  <TableCell sx={{ minWidth: { xs: 150, md: 220 }, ...cellTextSx }}>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2">{page.title}</Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Chip size="small" label={page.status} variant="outlined" />
                        <Chip size="small" label={storyType.label} variant="outlined" />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {storyType.detail}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: { xs: 160, md: 220 }, ...cellTextSx }}>
                    <Stack spacing={0.25}>
                      <Typography variant="body2">{resolvePageSourceSummary(page, sourceOptionsByType)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {resolveOutputPromise(page)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: { xs: 120, md: 160 }, ...cellTextSx }}>
                    <Typography variant="body2">{resolvePagePathLabel(page)}</Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: { xs: 120, md: 170 }, ...cellTextSx }}>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <StateChip
                        label={posture.label}
                        tone={posture.tone}
                        variant={posture.tone === "success" ? "filled" : "outlined"}
                      />
                      <StateChip label={posture.summary} />
                      {readinessIssues.length > 0 ? (
                        <StateChip
                          label={`${readinessIssues.length} warning${readinessIssues.length === 1 ? "" : "s"}`}
                          tone="warning"
                        />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end" useFlexGap flexWrap="wrap">
                      {liveUrl ? (
                        <Button
                          component="a"
                          href={liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          variant="text"
                          size="small"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Open Live
                        </Button>
                      ) : null}
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectPage(page.id);
                        }}
                      >
                        Open
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Alert severity="info">No pages match the current filters.</Alert>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={pagination.totalCount}
        page={Math.max(0, pagination.page - 1)}
        rowsPerPage={pagination.pageSize}
        onPageChange={(_, nextPage) => onChangePage(nextPage + 1)}
        rowsPerPageOptions={[PAGE_SIZE]}
      />
    </Paper>
  );
}

function PageStudioSummaryCard({
  page,
  sourceOptionsByType,
  title = "Page Summary",
  description = "This page tells you what kind of public surface it is, what it will generate, and whether it is already live."
}) {
  const storyType = resolvePageStoryType(page);
  const posture = resolveOutputPosture(page);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.35}>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <StateChip label={storyType.label} tone="default" />
          <StateChip label={posture.label} tone={posture.tone} variant={posture.tone === "success" ? "filled" : "outlined"} />
          <StateChip label={posture.summary} />
        </Stack>
        <Stack spacing={0.5}>
          <Typography variant="body2">
            <strong>Source:</strong> {resolvePageSourceSummary(page, sourceOptionsByType)}
          </Typography>
          <Typography variant="body2">
            <strong>Output promise:</strong> {resolveOutputPromise(page)}
          </Typography>
          <Typography variant="body2">
            <strong>Public pattern:</strong> {resolvePagePathLabel(page)}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

function PageWorkbenchHeader({
  page,
  isCreatingNewPage,
  pageActionState,
  onSave,
  onPublish,
  onReturnToType,
  canReturnToType = false,
  primaryActionLabel = "",
  primaryActionDisabled = false,
  onClose
}) {
  const publishLabel =
    page?.deploymentMode === "per-record"
      ? (page?.status === "published" ? "Publish Template State" : "Publish Template")
      : (page?.status === "published" ? "Sync Published Page" : "Publish Page");
  const title = isCreatingNewPage ? "New Page" : page?.title || "Page";
  const description = isCreatingNewPage
    ? "Create the page in two calm steps: choose the page type, then save the basics. Preview and live delivery come after the page exists."
    : "Edit one page calmly. Basics define the page, Preview shows a real example, Live explains what is already public.";

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Stack spacing={0.35} sx={{ minWidth: 0 }}>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="body2" color="text.secondary">{description}</Typography>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          {isCreatingNewPage && canReturnToType ? (
            <Button variant="outlined" onClick={onReturnToType} disabled={pageActionState.saving}>
              Change Page Type
            </Button>
          ) : null}
          <Button variant="contained" onClick={onSave} disabled={pageActionState.saving || primaryActionDisabled}>
            {pageActionState.saving ? "Saving..." : primaryActionLabel || (isCreatingNewPage ? "Create Page" : "Save Page")}
          </Button>
          {!isCreatingNewPage ? (
            <Button
              variant="outlined"
              onClick={onPublish}
              disabled={!page || page.status === "archived" || pageActionState.saving}
            >
              {publishLabel}
            </Button>
          ) : null}
          <Button variant="text" onClick={onClose}>
            Close
          </Button>
        </Stack>
      </Stack>
      {pageActionState.errorMessage ? <Alert severity="error">{pageActionState.errorMessage}</Alert> : null}
      {pageActionState.successMessage ? <Alert severity="success">{pageActionState.successMessage}</Alert> : null}
    </Stack>
  );
}

function CreatePresetCard({ label, description, detail, selected = false, onSelect }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: selected ? "primary.main" : "divider",
        backgroundColor: selected ? "rgba(37,99,235,0.06)" : "background.paper"
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1">{label}</Typography>
          {selected ? <Chip size="small" color="primary" label="Selected" /> : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {detail}
        </Typography>
        <Stack direction="row" justifyContent="flex-start">
          <Button variant={selected ? "contained" : "outlined"} onClick={onSelect}>
            {selected ? "Using This Type" : "Choose This Type"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function CreatePageTypeStep({ selectedPreset, onSelectPreset }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Start with the page type. After that, the drawer narrows to only the basics needed to create the page.
      </Alert>
      <Stack
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" } }}
      >
        <CreatePresetCard
          label="Standalone Page"
          description="One page, one path, with no primary record source."
          detail="Good for landing pages, policy pages, and other single public surfaces."
          selected={selectedPreset === "standalone"}
          onSelect={() => onSelectPreset("standalone")}
        />
        <CreatePresetCard
          label="Post Template"
          description="One reusable page that generates one public page per published post."
          detail="Good for story detail pages that should multiply automatically."
          selected={selectedPreset === "post-detail-template"}
          onSelect={() => onSelectPreset("post-detail-template")}
        />
        <CreatePresetCard
          label="Category Template"
          description="One reusable page that generates one public page per category."
          detail="Good for category landing pages that should multiply automatically."
          selected={selectedPreset === "category-detail-template"}
          onSelect={() => onSelectPreset("category-detail-template")}
        />
      </Stack>
    </Stack>
  );
}

function PageBasicsTab({ workspace, isCreateMode }) {
  const page = workspace.selectedPage ?? workspace.pageDraft;
  const widgetCompatibility = isCreateMode
    ? workspace.draftWidgetCompatibility
    : workspace.selectedPage
      ? workspace.widgetCompatibilityByPageId.get(workspace.selectedPage.id) ?? workspace.draftWidgetCompatibility
      : workspace.draftWidgetCompatibility;
  const sourceOptions = workspace.sourceOptionsByType[workspace.pageDraft.primarySourceType] ?? [];
  const sourceLabels = resolveSourceTypeLabels(workspace.pageDraft.primarySourceType);
  const isPerRecordMode = workspace.pageDraft.deploymentMode === "per-record";
  const usingReusableLayout = Boolean(workspace.pageDraft.layoutId);
  const safeLayoutId = workspace.layoutOptions.some((option) => option.id === workspace.pageDraft.layoutId)
    ? workspace.pageDraft.layoutId
    : "";
  const currentThemeOption = workspace.themeOptions.find(
    (option) => option.themeKey === workspace.pageDraft.themeKey
  );
  const safeThemeKey = currentThemeOption?.themeKey ?? (workspace.pageDraft.themeKey || "");
  const defaultGlobalThemeLabel = workspace.defaultGlobalTheme?.title ?? "the global default theme";

  return (
    <Stack spacing={2}>
      {isCreateMode ? (
        <Alert severity="info">
          Save only the basics here. After the page exists, the drawer will open up preview, live state, and the deeper publishing controls.
        </Alert>
      ) : (
        <PageStudioSummaryCard
          page={page}
          sourceOptionsByType={workspace.sourceOptionsByType}
          title="Page Basics"
          description="Define what this page is, what it points at, and which layout frames it."
        />
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Identity</Typography>
            <Typography variant="body2" color="text.secondary">
              Set the page title, publishing status, and the public path or pattern this page will own.
            </Typography>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Page Title"
              value={workspace.pageDraft.title}
              onChange={(event) => workspace.changePageField("title", event.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              label="Status"
              value={workspace.pageDraft.status}
              onChange={(event) => workspace.changePageField("status", event.target.value)}
              sx={{ minWidth: 180 }}
            >
              {PAGE_STATUS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label={isPerRecordMode ? "Public Pattern" : "Public Path"}
            value={isPerRecordMode ? workspace.pageDraft.pathPattern : workspace.pageDraft.path}
            onChange={(event) =>
              workspace.changePageField(isPerRecordMode ? "pathPattern" : "path", event.target.value)
            }
            placeholder={
              isPerRecordMode
                ? resolvePerRecordPathPlaceholder(workspace.pageDraft.primarySourceType)
                : "/stories/platform-health"
            }
            helperText={
              isPerRecordMode
                ? "Use a bounded token like {slug} so one saved page can generate many public outputs."
                : "Use the exact public path this page should own."
            }
          />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Layout</Typography>
            <Typography variant="body2" color="text.secondary">
              Choose the layout record that frames this page. If the structure needs work, jump to Layouts and come back here.
            </Typography>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "flex-start" }}>
            <TextField
              select
              label="Layout Record"
              value={safeLayoutId}
              onChange={(event) => workspace.changePageField("layoutId", event.target.value)}
              sx={{ minWidth: 260, flex: 1 }}
              helperText="Reusable layouts are managed from the Layouts module."
            >
              <MenuItem value="">Legacy Inline Layout</MenuItem>
              {workspace.layoutOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" onClick={workspace.openLayoutBuilder}>
              {usingReusableLayout ? "Edit Selected Layout" : "Open Layouts"}
            </Button>
          </Stack>
          {usingReusableLayout ? (
            <Alert severity="info">
              This page uses a reusable layout record. The layout now owns widget structure and default bindings.
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Theme</Typography>
            <Typography variant="body2" color="text.secondary">
              Pick whether this page inherits the global theme or intentionally overrides it with a page-specific choice.
            </Typography>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "flex-start" }}>
            <TextField
              select
              label="Theme"
              value={safeThemeKey}
              onChange={(event) => workspace.changePageField("themeKey", event.target.value)}
              sx={{ minWidth: 260, flex: 1 }}
              helperText={
                safeThemeKey
                  ? "This page overrides the global default theme."
                  : `This page currently inherits ${defaultGlobalThemeLabel}.`
              }
            >
              <MenuItem value="">Use Global Default</MenuItem>
              {workspace.themeOptions.map((option) => (
                <MenuItem key={option.themeKey} value={option.themeKey}>
                  {option.label}
                  {option.isGlobalDefault ? " (Global Default)" : ""}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" onClick={workspace.openThemesLibrary}>
              Open Themes
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <PageWidgetCompatibilityPanel
        page={page}
        widgetCompatibility={widgetCompatibility}
        onOpenLayoutBuilder={workspace.openLayoutBuilder}
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Source</Typography>
            <Typography variant="body2" color="text.secondary">
              Keep the source simple here. Only move into deeper source controls if this page needs an unusual setup.
            </Typography>
          </Stack>
          {workspace.pageDraft.primarySourceType === "none" ? (
            <Alert severity="info">
              This is a standalone page. It does not depend on a post, category, or tag record.
            </Alert>
          ) : null}
          {workspace.pageDraft.primarySourceType !== "none" && isPerRecordMode ? (
            <Alert severity="info">
              This template will publish one page for every {sourceLabels.plural.toLowerCase()} that matches the current publishing rules.
            </Alert>
          ) : null}
          {workspace.pageDraft.primarySourceType !== "none" && !isPerRecordMode ? (
            <TextField
              select
              label={`${sourceLabels.singular} Record`}
              value={workspace.pageDraft.primarySourceItemId}
              onChange={(event) => workspace.changePageField("primarySourceItemId", event.target.value)}
              sx={{ minWidth: 260 }}
            >
              <MenuItem value="">None</MenuItem>
              {sourceOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}

function PageDefinitionSection({ workspace }) {
  const sourceOptions = workspace.sourceOptionsByType[workspace.pageDraft.primarySourceType] ?? [];
  const isPerRecordMode = workspace.pageDraft.deploymentMode === "per-record";

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack spacing={0.35}>
          <Typography variant="h6">Page Definition</Typography>
          <Typography variant="body2" color="text.secondary">
            These controls change the underlying behavior of the page. Use them only when the normal Basics tab is not enough.
          </Typography>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Deployment Mode"
            value={workspace.pageDraft.deploymentMode}
            onChange={(event) => workspace.changePageField("deploymentMode", event.target.value)}
            sx={{ minWidth: 200 }}
          >
            {DEPLOYMENT_MODE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Page Kind"
            value={workspace.pageDraft.pageKind}
            onChange={(event) => workspace.changePageField("pageKind", event.target.value)}
            sx={{ minWidth: 200 }}
          >
            {PAGE_KIND_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Primary Source Type"
            value={workspace.pageDraft.primarySourceType}
            onChange={(event) => workspace.changePageField("primarySourceType", event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {PRIMARY_SOURCE_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Source Selection"
            value={workspace.pageDraft.sourceSelectionMode}
            onChange={(event) => workspace.changePageField("sourceSelectionMode", event.target.value)}
            sx={{ minWidth: 220 }}
            disabled={workspace.pageDraft.primarySourceType === "none" || isPerRecordMode}
          >
            {SOURCE_SELECTION_MODE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Primary Source"
            value={workspace.pageDraft.primarySourceItemId}
            onChange={(event) => workspace.changePageField("primarySourceItemId", event.target.value)}
            sx={{ minWidth: 240 }}
            disabled={workspace.pageDraft.primarySourceType === "none" || workspace.pageDraft.sourceSelectionMode !== "specific-record"}
          >
            <MenuItem value="">None</MenuItem>
            {sourceOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Scheduled On"
            value={workspace.pageDraft.scheduledOn}
            onChange={(event) => workspace.changePageField("scheduledOn", event.target.value)}
            placeholder="2026-03-09T12:00:00.000Z"
          />
        </Stack>
        {isPerRecordMode ? (
          <TextField
            label="Template Path"
            value={workspace.pageDraft.path}
            onChange={(event) => workspace.changePageField("path", event.target.value)}
            placeholder={workspace.pageDraft.primarySourceType === "blog-category" ? "/category" : "/posts"}
          />
        ) : null}
      </Stack>
    </Paper>
  );
}

function PageMoreTab({ workspace, moduleSettingsDomain, onSaveModuleSettings }) {
  const page = workspace.selectedPage ?? workspace.pageDraft;
  const widgetCompatibility = workspace.selectedPage
    ? workspace.widgetCompatibilityByPageId.get(workspace.selectedPage.id) ?? workspace.draftWidgetCompatibility
    : workspace.draftWidgetCompatibility;
  return (
    <Stack spacing={2}>
      <PageSeoSection workspace={workspace} />
      <SecondaryOverviewSection
        title="Page Definition"
        description="Change these only when the normal Basics tab is not enough."
        collapsedLabel="Show Page Definition"
        expandedLabel="Hide Page Definition"
      >
        <PageDefinitionSection workspace={workspace} />
      </SecondaryOverviewSection>
      <SecondaryOverviewSection
        title="Advanced Data Sources"
        description="Use this only when the standard page type and source promise are not enough."
        collapsedLabel="Show Data Sources"
        expandedLabel="Hide Data Sources"
      >
        <DataSourcesSection workspace={workspace} />
      </SecondaryOverviewSection>
      <SecondaryOverviewSection
        title="Remote Overrides"
        description="Leave these empty to keep using the Pages defaults."
        collapsedLabel="Show Remote Overrides"
        expandedLabel="Hide Remote Overrides"
      >
        <PageRemoteBindingsSection workspace={workspace} />
      </SecondaryOverviewSection>
      <SecondaryOverviewSection
        title="Pages Defaults"
        description="Default targets and mount behavior for the whole Pages desk."
        collapsedLabel="Show Pages Defaults"
        expandedLabel="Hide Pages Defaults"
      >
        <PagesRemoteSettingsPanel
          appMountTagName={moduleSettingsDomain?.moduleSettingsState?.draftValues?.appMountTagName ?? ""}
          deploymentTargets={workspace.remoteDeploymentTargets}
          browserTargets={workspace.remoteBrowserTargets}
          onChangeField={moduleSettingsDomain?.handleSettingsFieldChange ?? (() => {})}
          onSave={onSaveModuleSettings}
          saveDisabled={!moduleSettingsDomain}
          settingsState={moduleSettingsDomain?.moduleSettingsState}
        />
      </SecondaryOverviewSection>
      <SecondaryOverviewSection
        title="Layout Widget Contract"
        description="Check widget inventory and compatibility before going deeper into runtime and remote details."
        collapsedLabel="Show Layout Widgets"
        expandedLabel="Hide Layout Widgets"
      >
        <PageWidgetCompatibilityPanel
          page={page}
          widgetCompatibility={widgetCompatibility}
          onOpenLayoutBuilder={workspace.openLayoutBuilder}
        />
      </SecondaryOverviewSection>
      <SecondaryOverviewSection
        title="Client Runtime Contract"
        description="Inspect the exact browser bootstrap and tester contract that this page will publish."
        collapsedLabel="Show Runtime Contract"
        expandedLabel="Hide Runtime Contract"
      >
        <RuntimeContractPanel workspace={workspace} />
      </SecondaryOverviewSection>
    </Stack>
  );
}

function PageOutputContextPanel({
  page,
  deliveryPayload,
  widgetCompatibility,
  readinessIssues,
  onOpenLayoutBuilder,
  onOpenSourceRecord
}) {
  const posture = resolveOutputPosture(page);
  const publicUrl = deliveryPayload?.delivery?.publicUrl ?? "";
  const artifactPath = page?.deploymentArtifactPath ? `deployment/${page.deploymentArtifactPath}` : "Not deployed yet";

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.35}>
          <Typography variant="h6">Live Status</Typography>
          <Typography variant="body2" color="text.secondary">
            See what is already public, what path is being promised, and what still needs another release.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <StateChip label={posture.label} tone={posture.tone} variant={posture.tone === "success" ? "filled" : "outlined"} />
          <StateChip label={posture.summary} />
          {widgetCompatibility?.summary?.widgetizedBlocks > 0 ? (
            <StateChip
              label={
                widgetCompatibility.summary.blockingIssueCount > 0
                  ? `${widgetCompatibility.summary.blockingIssueCount} widget blockers`
                  : `${widgetCompatibility.summary.compatibleWidgets} widget blocks ready`
              }
              tone={widgetCompatibility.summary.blockingIssueCount > 0 ? "warning" : "success"}
            />
          ) : null}
          {readinessIssues.length > 0 ? (
            <StateChip label={`${readinessIssues.length} warning${readinessIssues.length === 1 ? "" : "s"}`} tone="warning" />
          ) : null}
        </Stack>
        <Stack spacing={0.5}>
          <Typography variant="body2">
            <strong>Public pattern:</strong> {resolvePagePathLabel(page)}
          </Typography>
          <Typography variant="body2">
            <strong>Local artifact:</strong> {artifactPath}
          </Typography>
          <Typography variant="body2">
            <strong>Current live URL:</strong> {publicUrl || "Resolve a preview or deploy this page to see the public URL."}
          </Typography>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="outlined" onClick={onOpenLayoutBuilder}>
            Open Layout
          </Button>
          <Button variant="outlined" onClick={onOpenSourceRecord}>
            Open Source
          </Button>
          <Button
            component="a"
            href={publicUrl || undefined}
            target="_blank"
            rel="noreferrer"
            variant="contained"
            disabled={!publicUrl}
          >
            Open Live URL
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function SecondaryOverviewSection({ collapsedLabel, expandedLabel, title, description, children }) {
  const [open, setOpen] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={() => setOpen((previous) => !previous)}>
            {open ? expandedLabel : collapsedLabel}
          </Button>
        </Stack>
        {open ? children : null}
      </Stack>
    </Paper>
  );
}

function PagesWorkbench({
  open,
  routeState,
  onChangeWorkbenchTab,
  onSelectCreatePreset,
  onBackToCreateType,
  onClose,
  workspace,
  moduleSettingsDomain,
  onSaveModuleSettings,
  onOpenLayoutBuilder,
  onOpenSourceRecord
}) {
  const page = workspace.selectedPage ?? workspace.pageDraft;
  const readinessIssues = workspace.selectedPage ? workspace.readinessMap.get(workspace.selectedPage.id) ?? [] : [];
  const widgetCompatibility = workspace.selectedPage
    ? workspace.widgetCompatibilityByPageId.get(workspace.selectedPage.id) ?? workspace.draftWidgetCompatibility
    : workspace.draftWidgetCompatibility;
  const isCreateMode = workspace.isCreatingNewPage;
  const canReturnToType = isCreateMode && routeState.createStage === "basics";
  const createReady = Boolean(routeState.createPreset) && routeState.createStage === "basics";
  const workbenchTabs = [
    { value: "basics", label: "Basics" },
    { value: "preview", label: "Preview" },
    { value: "live", label: "Live" },
    { value: "more", label: "More" }
  ];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100vw", xl: 980 },
          maxWidth: "100vw"
        }
      }}
    >
      <Stack spacing={2} sx={{ p: 2.5, minWidth: 0 }}>
        <PageWorkbenchHeader
          page={workspace.selectedPage}
          isCreatingNewPage={isCreateMode}
          pageActionState={workspace.pageActionState}
          onSave={workspace.persistPage}
          onPublish={workspace.publishPage}
          onReturnToType={onBackToCreateType}
          canReturnToType={canReturnToType}
          primaryActionLabel={isCreateMode && !createReady ? "Create Page" : ""}
          primaryActionDisabled={isCreateMode && !createReady}
          onClose={onClose}
        />

        {isCreateMode ? (
          routeState.createStage === "type" || !routeState.createPreset ? (
            <CreatePageTypeStep
              selectedPreset={routeState.createPreset}
              onSelectPreset={onSelectCreatePreset}
            />
          ) : (
            <PageBasicsTab workspace={workspace} isCreateMode />
          )
        ) : (
          <DeskTabsCard
            value={routeState.workbenchTab}
            onChange={onChangeWorkbenchTab}
            tabs={workbenchTabs}
          />
        )}

        {!isCreateMode && routeState.workbenchTab === "basics" ? (
          <PageBasicsTab workspace={workspace} isCreateMode={isCreateMode} />
        ) : null}

        {!isCreateMode && routeState.workbenchTab === "preview" ? (
          <Stack spacing={2}>
            <Alert severity="info">
              Use a real record example here so there is no mystery about what this page will generate before release.
            </Alert>
            <OutputForecastPanel workspace={workspace} />
            <DeliveryPreviewPanel workspace={workspace} />
          </Stack>
        ) : null}

        {!isCreateMode && routeState.workbenchTab === "live" ? (
          <Stack spacing={2}>
            <PageOutputContextPanel
              page={page}
              deliveryPayload={workspace.deliveryState.payload}
              widgetCompatibility={widgetCompatibility}
              readinessIssues={readinessIssues}
              onOpenLayoutBuilder={onOpenLayoutBuilder}
              onOpenSourceRecord={onOpenSourceRecord}
            />
            <PageWidgetCompatibilityPanel
              page={page}
              widgetCompatibility={widgetCompatibility}
              onOpenLayoutBuilder={onOpenLayoutBuilder}
            />
            <PageReadinessSection
              page={workspace.selectedPage}
              readinessIssues={readinessIssues}
              workspace={workspace}
            />
            <DeploymentInstancesPanel workspace={workspace} />
            <SecondaryOverviewSection
              title="Remote Deployment Tools"
              description="Compare and sync the generated HTML only when you want to inspect or run the remote delivery step directly from Pages."
              collapsedLabel="Show Remote Deployment"
              expandedLabel="Hide Remote Deployment"
            >
              <PagesRemoteDeploymentPanel
                latestRun={workspace.remoteDeploymentLatestRun}
                onCompare={workspace.compareRemoteDeployment}
                onExecute={workspace.executeRemoteDeployment}
                onOpenRemoteOps={workspace.openRemoteDeploymentTarget}
                onValidate={workspace.validateRemoteDeployment}
                page={workspace.selectedPage}
                procedureState={workspace.remoteOpsSupport.procedureState}
                selectedTarget={workspace.remoteDeploymentTarget}
                bindingSourceLabel={workspace.remoteDeploymentBindingSourceLabel}
              />
            </SecondaryOverviewSection>
            <SecondaryOverviewSection
              title="Browser Delivery Checks"
              description="Use this only when you need domain or browser-delivery readiness from the page itself."
              collapsedLabel="Show Browser Delivery"
              expandedLabel="Hide Browser Delivery"
            >
              <PagesBrowserDeliveryPanel
                latestRun={workspace.remoteBrowserLatestRun}
                onOpenRemoteOps={workspace.openRemoteBrowserTarget}
                onValidate={workspace.validateRemoteBrowserTarget}
                procedureState={workspace.remoteOpsSupport.procedureState}
                selectedTarget={workspace.remoteBrowserTarget}
                bindingSourceLabel={workspace.remoteBrowserBindingSourceLabel}
              />
            </SecondaryOverviewSection>
          </Stack>
        ) : null}

        {!isCreateMode && routeState.workbenchTab === "more" ? (
          <PageMoreTab
            workspace={workspace}
            moduleSettingsDomain={moduleSettingsDomain}
            onSaveModuleSettings={onSaveModuleSettings}
          />
        ) : null}
      </Stack>
    </Drawer>
  );
}

function OverviewTab({
  routeState,
  onChangeField,
  onClearFilters,
  onSelectPage,
  onCreatePage,
  pagination,
  visiblePages,
  workspace
}) {
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Normal flow: choose the page you want, edit its basics in the side studio, preview a real example, then inspect live posture only when you need release answers.
      </Alert>
      <PagesToolbar
        routeState={routeState}
        onChangeField={onChangeField}
        onClear={onClearFilters}
        onCreatePage={onCreatePage}
      />
      <PageRosterTable
        rows={pagination.rows}
        pagination={pagination}
        sourceOptionsByType={workspace.sourceOptionsByType}
        readinessMap={workspace.readinessMap}
        remoteTargets={workspace.remoteOpsSupport.supportState.targets}
        fallbackDeploymentTarget={workspace.remoteDeploymentTarget}
        fallbackBrowserTarget={workspace.remoteBrowserTarget}
        selectedPageId={routeState.pageId}
        onSelectPage={onSelectPage}
        onChangePage={(nextPage) => onChangeField("pagePage", String(nextPage))}
      />
      {visiblePages.length === 0 ? null : (
        <Typography variant="caption" color="text.secondary">
          {visiblePages.length} page promise{visiblePages.length === 1 ? "" : "s"} match the current view.
        </Typography>
      )}
    </Stack>
  );
}

function RedirectsTab({ workspace }) {
  return (
    <Stack spacing={2}>
      <RedirectFilters
        filters={workspace.redirectFilters}
        pages={workspace.pages}
        onChangeFilters={(fieldId, value) =>
          workspace.setRedirectFilters((previous) => ({
            ...previous,
            [fieldId]: value
          }))
        }
        onClear={() =>
          workspace.setRedirectFilters({
            search: "",
            status: "",
            httpCode: "",
            targetPageId: ""
          })
        }
      />
      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", xl: 360 }, flexShrink: 0 }}>
          <RedirectList
            redirects={workspace.filteredRedirects}
            pageById={workspace.pageById}
            selectedRedirectId={workspace.selectedRedirectId}
            onSelectRedirect={workspace.selectRedirect}
            onCreateRedirect={workspace.startNewRedirect}
          />
        </Stack>
        <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
          <RedirectEditorPanel workspace={workspace} />
        </Stack>
      </Stack>
    </Stack>
  );
}

export function BlogDistributionView({
  activeModuleLabel,
  collectionsDomain,
  moduleSettingsDomain = null,
  navigate = null,
  route = {}
}) {
  const [localRoute, setLocalRoute] = useState(() => route);
  const workspace = useBlogDistributionWorkspace({
    collectionsDomain
  });
  const remoteOpsSupport = useEmbeddedRemoteOpsSupport();
  const routeSource = typeof navigate === "function" ? route : localRoute;
  const routeModuleId = typeof routeSource?.moduleId === "string" ? routeSource.moduleId : "pages";
  const routeState = useMemo(() => resolvePagesDeskRouteState(routeSource), [routeSource]);
  const appliedCreatePresetRef = useRef("");

  useEffect(() => {
    if (typeof navigate === "function") {
      return;
    }
    setLocalRoute(route);
  }, [navigate, route]);

  const syncRoute = useCallback((patch, replace = true) => {
    if (typeof navigate === "function") {
      navigate(
        {
          ...routeSource,
          moduleId: routeModuleId,
          ...patch
        },
        { replace }
      );
      return;
    }

    setLocalRoute((previous) => ({
      ...previous,
      moduleId: routeModuleId,
      ...patch
    }));
  }, [navigate, routeModuleId, routeSource]);

  const navigateToBacklog = useCallback((replace = true) => {
    const nextRoute = {
      moduleId: routeModuleId,
      pagesTab: routeState.topTab === "overview" ? "" : routeState.topTab,
      pageSearch: routeState.search,
      pageStoryType: routeState.storyType,
      pageAttention: routeState.attention,
      pageSort: routeState.sort === "updated-desc" ? "" : routeState.sort,
      pagePage: routeState.page > 1 ? String(routeState.page) : ""
    };
    const params = new URLSearchParams();
    if (nextRoute.pagesTab) {
      params.set("pagesTab", nextRoute.pagesTab);
    }
    if (nextRoute.pageSearch) {
      params.set("pageSearch", nextRoute.pageSearch);
    }
    if (nextRoute.pageStoryType) {
      params.set("pageStoryType", nextRoute.pageStoryType);
    }
    if (nextRoute.pageAttention) {
      params.set("pageAttention", nextRoute.pageAttention);
    }
    if (nextRoute.pageSort) {
      params.set("pageSort", nextRoute.pageSort);
    }
    if (nextRoute.pagePage) {
      params.set("pagePage", nextRoute.pagePage);
    }
    const backlogUrl = `${window.location.pathname}${params.toString().length > 0 ? `?${params.toString()}` : ""}`;

    if (typeof navigate === "function") {
      navigate(nextRoute, { replace });
    } else {
      setLocalRoute(nextRoute);
    }

    const hasWorkbenchQuery =
      window.location.search.includes("pageWorkbenchTab=")
      || window.location.search.includes("pageCreatePreset=")
      || window.location.search.includes("pageCreateStage=");

    if (hasWorkbenchQuery) {
      window.history.replaceState({}, "", backlogUrl);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [
    navigate,
    routeModuleId,
    routeState.attention,
    routeState.page,
    routeState.search,
    routeState.sort,
    routeState.storyType,
    routeState.topTab
  ]);

  useEffect(() => {
    if (routeState.pageMode === "create") {
      if (!workspace.isCreatingNewPage && workspace.selectedPageId) {
        syncRoute(
          {
            pageId: workspace.selectedPageId,
            pageMode: "",
            pageCreatePreset: "",
            pageCreateStage: "",
            pageWorkbenchTab: "basics"
          },
          true
        );
        return;
      }

      if (!workspace.isCreatingNewPage) {
        appliedCreatePresetRef.current = "";
        workspace.startNewPage();
        return;
      }

      if (!routeState.createPreset) {
        appliedCreatePresetRef.current = "";
        return;
      }

      if (appliedCreatePresetRef.current !== routeState.createPreset) {
        applyPagePreset(workspace, routeState.createPreset);
        appliedCreatePresetRef.current = routeState.createPreset;
      }
      return;
    }

    appliedCreatePresetRef.current = "";

    if (routeState.pageId.length === 0) {
      const hasWorkbenchRouteState =
        (typeof routeSource?.pageWorkbenchTab === "string" && routeSource.pageWorkbenchTab.trim().length > 0)
        || (typeof routeSource?.pageCreatePreset === "string" && routeSource.pageCreatePreset.trim().length > 0)
        || (typeof routeSource?.pageCreateStage === "string" && routeSource.pageCreateStage.trim().length > 0);

      if (hasWorkbenchRouteState) {
        navigateToBacklog(true);
      }
      return;
    }

    if (!workspace.pages.some((page) => page.id === routeState.pageId)) {
      navigateToBacklog(true);
      return;
    }

    if (workspace.selectedPageId !== routeState.pageId) {
      workspace.selectPage(routeState.pageId);
    }
  }, [
    routeState.pageId,
    routeState.createPreset,
    routeState.pageMode,
    routeSource,
    navigateToBacklog,
    syncRoute,
    workspace.isCreatingNewPage,
    workspace.pages,
    workspace.selectPage,
    workspace.selectedPageId,
    workspace.startNewPage
  ]);

  const openLayoutBuilder = useCallback(() => {
    if (typeof navigate !== "function") {
      return;
    }
    const targetLayoutId = workspace.pageDraft.layoutId || workspace.selectedPage?.layoutId || "";
    navigate(
      {
        moduleId: "test-modules-layouts",
        layoutId: targetLayoutId,
        returnModuleId: "test-modules-pages",
        returnPageId: workspace.selectedPageId ?? "",
        returnTab: "overview"
      },
      { replace: false }
    );
  }, [navigate, workspace.pageDraft.layoutId, workspace.selectedPage?.layoutId, workspace.selectedPageId]);

  const openThemesLibrary = useCallback(() => {
    if (typeof navigate !== "function") {
      return;
    }
    navigate(
      {
        moduleId: "themes"
      },
      { replace: false }
    );
  }, [navigate]);

  const saveModuleSettings = useCallback(async () => {
    if (!moduleSettingsDomain || typeof moduleSettingsDomain.handleSaveModuleSettings !== "function") {
      return;
    }
    await moduleSettingsDomain.handleSaveModuleSettings();
    await workspace.reloadSupportData();
  }, [moduleSettingsDomain, workspace]);

  const remoteDeploymentTargetId =
    workspace.selectedPage?.remoteDeploymentTargetProfileId
    || moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteDeploymentTargetProfileId
    || "";
  const remoteBrowserTargetId =
    workspace.selectedPage?.remoteBrowserDeliveryTargetProfileId
    || moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteBrowserDeliveryTargetProfileId
    || "";
  const remoteDeploymentTargets = remoteOpsSupport.getTargetsByKind("deployment-storage");
  const remoteBrowserTargets = remoteOpsSupport.getTargetsByKind("browser-delivery");
  const remoteDeploymentTarget = remoteOpsSupport.getTargetById(remoteDeploymentTargetId);
  const remoteBrowserTarget = remoteOpsSupport.getTargetById(remoteBrowserTargetId);
  const remoteDeploymentLatestRun = remoteOpsSupport.getLatestRunForTarget(remoteDeploymentTargetId);
  const remoteBrowserLatestRun = remoteOpsSupport.getLatestRunForTarget(remoteBrowserTargetId);
  const remoteDeploymentBindingSourceLabel = workspace.selectedPage?.remoteDeploymentTargetProfileId
    ? "Selected page override"
    : "Pages module default";
  const remoteBrowserBindingSourceLabel = workspace.selectedPage?.remoteBrowserDeliveryTargetProfileId
    ? "Selected page override"
    : "Pages module default";

  const openRemoteTarget = useCallback(
    (targetId) => {
      if (typeof navigate !== "function") {
        return;
      }
      navigate(
        {
          moduleId: "test-modules-remote-ops",
          tab: "targets",
          targetId: targetId || ""
        },
        { replace: false }
      );
    },
    [navigate]
  );

  const openRemoteDeploymentTarget = useCallback(() => {
    openRemoteTarget(remoteDeploymentTargetId);
  }, [openRemoteTarget, remoteDeploymentTargetId]);

  const openRemoteBrowserTarget = useCallback(() => {
    openRemoteTarget(remoteBrowserTargetId);
  }, [openRemoteTarget, remoteBrowserTargetId]);

  const openSourceRecord = useCallback(() => {
    if (typeof navigate !== "function") {
      return;
    }

    const sourceType = workspace.pageDraft.primarySourceType;
    const sourceId = workspace.pageDraft.previewSourceItemId || workspace.pageDraft.primarySourceItemId;

    if (!sourceId) {
      return;
    }

    if (sourceType === "blog-post") {
      navigate(
        {
          moduleId: "test-modules-content",
          postId: sourceId
        },
        { replace: false }
      );
      return;
    }

    if (sourceType === "blog-category") {
      navigate(
        {
          moduleId: "test-modules-taxonomy",
          taxonomyBranch: "categories",
          categoryId: sourceId
        },
        { replace: false }
      );
      return;
    }

    if (sourceType === "blog-tag") {
      navigate(
        {
          moduleId: "test-modules-taxonomy",
          taxonomyBranch: "tags",
          tagId: sourceId
        },
        { replace: false }
      );
    }
  }, [
    navigate,
    workspace.pageDraft.previewSourceItemId,
    workspace.pageDraft.primarySourceItemId,
    workspace.pageDraft.primarySourceType
  ]);

  const pageSummary = useMemo(() => createPagesStorySummary(workspace.pages), [workspace.pages]);
  const visiblePages = useMemo(
    () =>
      buildVisiblePages({
        pages: workspace.pages,
        readinessMap: workspace.readinessMap,
        routeState,
        sourceOptionsByType: workspace.sourceOptionsByType
      }),
    [routeState, workspace.pages, workspace.readinessMap, workspace.sourceOptionsByType]
  );
  const pagination = useMemo(
    () => paginatePages(visiblePages, routeState.page, PAGE_SIZE),
    [routeState.page, visiblePages]
  );

  const openPage = useCallback((pageId) => {
    workspace.selectPage(pageId);
    syncRoute(
      {
        pageId,
        pageMode: "",
        pageCreatePreset: "",
        pageCreateStage: "",
        pageWorkbenchTab: "basics"
      },
      true
    );
  }, [syncRoute, workspace]);

  const beginCreatePage = useCallback(() => {
    workspace.startNewPage();
    appliedCreatePresetRef.current = "";
    syncRoute(
      {
        pageId: "",
        pageMode: "create",
        pageCreatePreset: "",
        pageCreateStage: "type",
        pageWorkbenchTab: ""
      },
      false
    );
  }, [syncRoute, workspace]);

  const selectCreatePreset = useCallback((presetId) => {
    applyPagePreset(workspace, presetId);
    appliedCreatePresetRef.current = presetId;
    syncRoute(
      {
        pageCreatePreset: presetId,
        pageCreateStage: "basics"
      },
      true
    );
  }, [syncRoute, workspace]);

  const backToCreateType = useCallback(() => {
    workspace.startNewPage();
    appliedCreatePresetRef.current = "";
    syncRoute(
      {
        pageCreatePreset: "",
        pageCreateStage: "type"
      },
      true
    );
  }, [syncRoute, workspace]);

  const viewWorkspace = {
    ...workspace,
    moduleSettingsDomain,
    openLayoutBuilder,
    openThemesLibrary,
    saveModuleSettings,
    remoteOpsSupport,
    remoteDeploymentTargets,
    remoteBrowserTargets,
    remoteDeploymentTarget,
    remoteBrowserTarget,
    remoteDeploymentLatestRun,
    remoteBrowserLatestRun,
    remoteDeploymentBindingSourceLabel,
    remoteBrowserBindingSourceLabel,
    openRemoteDeploymentTarget,
    openRemoteBrowserTarget,
    validateRemoteDeployment: () => remoteOpsSupport.validateTarget(remoteDeploymentTargetId),
    compareRemoteDeployment: () => remoteOpsSupport.compareTarget(remoteDeploymentTargetId),
    executeRemoteDeployment: () => remoteOpsSupport.executeTarget(remoteDeploymentTargetId),
    validateRemoteBrowserTarget: () => remoteOpsSupport.validateTarget(remoteBrowserTargetId)
  };

  if (
    !collectionsDomain.isActiveCollectionAvailable &&
    collectionsDomain.activeCollectionId === REDIRECTS_COLLECTION_ID
  ) {
    return <Alert severity="warning">{collectionsDomain.activeCollectionUnavailableMessage}</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Hero activeModuleLabel={activeModuleLabel} />
      <SummaryGrid summary={pageSummary} />
      <DeskTabsCard
        value={routeState.topTab}
        onChange={(nextValue) => syncRoute({ pagesTab: nextValue }, true)}
        tabs={[
          { value: "overview", label: "Pages" },
          { value: "redirects", label: "Redirects" }
        ]}
      />

      {routeState.topTab === "overview" ? (
        <OverviewTab
          routeState={routeState}
          onChangeField={(fieldId, value) =>
            syncRoute(
              fieldId === "pagePage"
                ? { [fieldId]: value }
                : { [fieldId]: value, pagePage: "1" },
              true
            )
          }
          onClearFilters={() =>
            syncRoute(
              {
                pageSearch: "",
                pageStoryType: "",
                pageAttention: "",
                pageSort: "updated-desc",
                pagePage: "1"
              },
              true
            )
          }
          onSelectPage={openPage}
          onCreatePage={beginCreatePage}
          pagination={pagination}
          visiblePages={visiblePages}
          workspace={viewWorkspace}
        />
      ) : null}

      {routeState.topTab === "redirects" ? <RedirectsTab workspace={viewWorkspace} /> : null}

      <PagesWorkbench
        open={routeState.pageMode === "create" || Boolean(routeState.pageId)}
        routeState={routeState}
        onChangeWorkbenchTab={(nextValue) => syncRoute({ pageWorkbenchTab: nextValue }, true)}
        onSelectCreatePreset={selectCreatePreset}
        onBackToCreateType={backToCreateType}
        onClose={() =>
          navigateToBacklog(true)
        }
        workspace={viewWorkspace}
        moduleSettingsDomain={moduleSettingsDomain}
        onSaveModuleSettings={saveModuleSettings}
        onOpenLayoutBuilder={openLayoutBuilder}
        onOpenSourceRecord={openSourceRecord}
      />
    </Stack>
  );
}
