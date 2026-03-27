import {
  Alert,
  Box,
  Button,
  Chip,
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
import { memo, useMemo } from "react";
import { SyncPostureChip } from "../../../frontend/src/ui/SyncPostureChip.jsx";

const ISSUE_LABELS = {
  seo: "Missing SEO",
  media: "Missing image",
  body: "Short body",
  taxonomy: "Missing category"
};

function StatusChip({ label, tone = "default", variant = "outlined" }) {
  return (
    <Chip
      size="small"
      label={label}
      color={tone === "success" ? "success" : tone === "warning" ? "warning" : tone === "attention" ? "secondary" : "default"}
      variant={variant}
    />
  );
}

function SummaryChip({ label, value, tone = "default" }) {
  return (
    <StatusChip
      label={`${label} ${value}`}
      tone={tone}
      variant={tone === "success" ? "filled" : "outlined"}
    />
  );
}

export function optionItems(referenceOptions, collectionId) {
  const items = Array.isArray(referenceOptions?.[collectionId]?.items)
    ? referenceOptions[collectionId].items
    : [];
  return items
    .filter((item) => item && typeof item === "object" && typeof item.id === "string")
    .map((item) => ({
      id: item.id,
      label:
        item.displayName ??
        item.name ??
        item.title ??
        item.label ??
        item.slug ??
        item.path ??
        item.id,
      item
    }));
}

export function resolveOptionLabel(options, id) {
  return options.find((option) => option.id === id)?.label ?? id;
}

function buildToolbarSummary(summary, deploymentSummary) {
  return [
    { label: "Posts", value: summary.total },
    { label: "Published", value: summary.published, tone: summary.published > 0 ? "success" : "default" },
    { label: "Scheduled", value: summary.scheduled, tone: summary.scheduled > 0 ? "attention" : "default" },
    {
      label: "Needs Release",
      value: deploymentSummary.needsDeploymentCount,
      tone: deploymentSummary.needsDeploymentCount > 0 ? "warning" : "success"
    }
  ];
}

export const PostsToolbar = memo(function PostsToolbar({
  routeState,
  summary,
  deploymentSummary,
  authorOptions,
  categoryOptions,
  tagOptions,
  selectedCount,
  onChangeFilter,
  onChangeSort,
  onOpenCreate,
  onArchiveSelected,
  onClearSelection,
  onClearFilters
}) {
  const summaryChips = useMemo(
    () => buildToolbarSummary(summary, deploymentSummary),
    [deploymentSummary, summary]
  );
  const hasActiveFilters = Boolean(
    routeState.search ||
      routeState.status ||
      routeState.primaryAuthorId ||
      routeState.categoryId ||
      routeState.tagId ||
      routeState.issue ||
      routeState.deployment ||
      routeState.format
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ lg: "center" }}
        >
          <Stack spacing={0.35}>
            <Typography variant="h6">Editorial Backlog</Typography>
            <Typography variant="body2" color="text.secondary">
              Find the stories that need attention, open one, and finish it without losing the backlog context.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" onClick={onOpenCreate}>
              New Post
            </Button>
            <Button variant="outlined" disabled={selectedCount === 0} onClick={onArchiveSelected}>
              Archive Selected
            </Button>
            <Button variant="text" disabled={selectedCount === 0} onClick={onClearSelection}>
              Clear Selection
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {summaryChips.map((item) => (
            <SummaryChip key={item.label} label={item.label} value={item.value} tone={item.tone} />
          ))}
        </Stack>

        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(4, minmax(0, 1fr))"
            }
          }}
        >
          <TextField
            label="Search posts"
            size="small"
            value={routeState.search}
            onChange={(event) => onChangeFilter("postSearch", event.target.value)}
            sx={{ gridColumn: { xl: "span 2" } }}
          />
          <TextField
            select
            label="Status"
            size="small"
            value={routeState.status}
            onChange={(event) => onChangeFilter("postStatus", event.target.value)}
            fullWidth
          >
            <MenuItem value="">All statuses</MenuItem>
            {["draft", "in-review", "scheduled", "published", "archived"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Author"
            size="small"
            value={routeState.primaryAuthorId}
            onChange={(event) => onChangeFilter("postAuthorId", event.target.value)}
            fullWidth
          >
            <MenuItem value="">All authors</MenuItem>
            {authorOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Category"
            size="small"
            value={routeState.categoryId}
            onChange={(event) => onChangeFilter("postCategoryId", event.target.value)}
            fullWidth
          >
            <MenuItem value="">All categories</MenuItem>
            {categoryOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Needs"
            size="small"
            value={routeState.issue}
            onChange={(event) => onChangeFilter("postIssue", event.target.value)}
            fullWidth
          >
            <MenuItem value="">Anything</MenuItem>
            <MenuItem value="media">Missing image</MenuItem>
            <MenuItem value="seo">Missing SEO</MenuItem>
            <MenuItem value="taxonomy">Missing category</MenuItem>
            <MenuItem value="body">Short body</MenuItem>
          </TextField>
          <TextField
            select
            label="Live"
            size="small"
            value={routeState.deployment}
            onChange={(event) => onChangeFilter("postDeployment", event.target.value)}
            fullWidth
          >
            <MenuItem value="">Any live state</MenuItem>
            <MenuItem value="local-only">Local only</MenuItem>
            <MenuItem value="needs-deployment">Needs release</MenuItem>
            <MenuItem value="deployed">Live</MenuItem>
            <MenuItem value="no-page">No page</MenuItem>
          </TextField>
          <TextField
            select
            label="Tag"
            size="small"
            value={routeState.tagId}
            onChange={(event) => onChangeFilter("postTagId", event.target.value)}
            fullWidth
          >
            <MenuItem value="">All tags</MenuItem>
            {tagOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Sort"
            size="small"
            value={routeState.sort}
            onChange={(event) => onChangeSort(event.target.value)}
            fullWidth
          >
            <MenuItem value="updated-desc">Recently updated</MenuItem>
            <MenuItem value="published-first">Published first</MenuItem>
            <MenuItem value="title-asc">Title A-Z</MenuItem>
            <MenuItem value="title-desc">Title Z-A</MenuItem>
          </TextField>
        </Box>

        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">
            Search, sort, pagination, and the open post stay in the URL.
          </Typography>
          <Button variant="text" disabled={!hasActiveFilters} onClick={onClearFilters}>
            Clear Filters
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
});

function formatIssueChips(issueIds = []) {
  if (!Array.isArray(issueIds) || issueIds.length === 0) {
    return [<StatusChip key="ready" label="Ready" tone="success" variant="filled" />];
  }
  return issueIds.slice(0, 2).map((issueId) => (
    <StatusChip key={issueId} label={ISSUE_LABELS[issueId] || issueId} tone="warning" variant="outlined" />
  ));
}

function formatStatusCaption(post) {
  if (post.status === "scheduled" && post.scheduledOn) {
    return `Scheduled ${post.scheduledOn}`;
  }
  if (post.status === "published") {
    return "Published in CMS";
  }
  if (post.status === "in-review") {
    return "Waiting for editorial approval";
  }
  return "Working draft";
}

function resolvePostSyncPosture(deploymentState) {
  if (!deploymentState) {
    return { label: "Unknown", tone: "default", variant: "outlined" };
  }
  if (deploymentState.label === "Deployed") {
    return { label: "Synced", tone: "success", variant: "filled" };
  }
  if (deploymentState.label === "Needs Deployment" || deploymentState.label === "Missing Outputs") {
    return { label: "Needs Sync", tone: "warning", variant: "outlined" };
  }
  if (deploymentState.label === "Local Only" || deploymentState.label === "No Page") {
    return { label: deploymentState.label, tone: deploymentState.tone === "warning" ? "warning" : "default", variant: "outlined" };
  }
  return {
    label: deploymentState.label,
    tone: deploymentState.tone === "success" ? "success" : deploymentState.tone === "warning" ? "warning" : "default",
    variant: deploymentState.tone === "success" ? "filled" : "outlined"
  };
}

export const PostRosterTable = memo(function PostRosterTable({
  rows,
  page,
  pageSize,
  totalCount,
  selectedPostIds,
  authorLabelMap,
  categoryLabelMap,
  postHealthMap,
  postDeploymentStateMap,
  postPublicationMap,
  onToggleSelection,
  onEdit,
  onOpenLive,
  onOpenPage,
  onChangePage
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell sx={{ minWidth: 360 }}>Story</TableCell>
              <TableCell sx={{ minWidth: 160 }}>Author</TableCell>
              <TableCell sx={{ minWidth: 150 }}>Status</TableCell>
              <TableCell sx={{ minWidth: 180 }}>Page</TableCell>
              <TableCell sx={{ minWidth: 150 }}>Live</TableCell>
              <TableCell sx={{ minWidth: 140 }}>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((post) => {
              const selected = selectedPostIds.includes(post.id);
              const issueIds = postHealthMap.get(post.id) ?? [];
              const deploymentState = postDeploymentStateMap.get(post.id) ?? null;
              const syncPosture = resolvePostSyncPosture(deploymentState);
              const publicationState = postPublicationMap.get(post.id) ?? null;
              const primaryAuthorLabel = authorLabelMap.get(post.primaryAuthorId) ?? "No author";
              const primaryCategoryLabel =
                (Array.isArray(post.categoryIds) ? post.categoryIds : [])
                  .map((itemId) => categoryLabelMap.get(itemId))
                  .filter(Boolean)[0] ?? "No category";

              return (
                <TableRow
                  key={post.id}
                  hover
                  selected={selected}
                  sx={{ cursor: "pointer" }}
                  onClick={() => onEdit(post.id)}
                >
                  <TableCell
                    padding="checkbox"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelection(post.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.6}>
                      <Typography variant="subtitle2">{post.title || "Untitled post"}</Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {post.excerpt || "No excerpt yet."}
                      </Typography>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        <StatusChip label={post.format || "article"} variant="outlined" />
                        <StatusChip label={primaryCategoryLabel} variant="outlined" />
                        {formatIssueChips(issueIds)}
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>{primaryAuthorLabel}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <StatusChip
                        label={post.status}
                        tone={post.status === "published" ? "success" : post.status === "in-review" ? "attention" : "default"}
                        variant={post.status === "published" ? "filled" : "outlined"}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatStatusCaption(post)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">{publicationState?.pageTitle || "No page linked"}</Typography>
                      {publicationState?.pageId ? (
                        <Button
                          size="small"
                          variant="text"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenPage(publicationState.pageId);
                          }}
                        >
                          Open Page
                        </Button>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      {deploymentState ? (
                        <SyncPostureChip
                          label={syncPosture.label}
                          tone={syncPosture.tone}
                          variant={syncPosture.variant}
                        />
                      ) : (
                        <Typography variant="body2">-</Typography>
                      )}
                      {publicationState?.publicUrl ? (
                        <Button
                          size="small"
                          variant="text"
                          component="a"
                          href={publicationState.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Open Live
                        </Button>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>{post.updatedOn || post.createdOn || "-"}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Alert severity="info">No posts match the current editorial backlog filters.</Alert>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        page={Math.max(0, page - 1)}
        onPageChange={(_, nextPage) => onChangePage(nextPage + 1)}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[pageSize]}
      />
    </Paper>
  );
});

export const RevisionPanel = memo(function RevisionPanel({
  revisions,
  selectedRevision,
  loading,
  errorMessage,
  authorOptions,
  categoryOptions,
  tagOptions,
  onSelectRevision,
  onRestoreRevision
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Revision History</Typography>
            <Typography variant="body2" color="text.secondary">
              Compare earlier snapshots and restore a version without leaving the post.
            </Typography>
          </Stack>
          {selectedRevision ? (
            <Button variant="outlined" size="small" onClick={() => onRestoreRevision(selectedRevision.id)}>
              Restore Selected Revision
            </Button>
          ) : null}
        </Stack>

        {loading ? <Typography color="text.secondary">Loading revisions...</Typography> : null}
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        {revisions.length === 0 && !loading ? (
          <Alert severity="info">Save the post to start building revision history.</Alert>
        ) : null}

        <Stack direction={{ xs: "column", xl: "row" }} spacing={2}>
          <Stack spacing={1.5} sx={{ minWidth: { xl: 280 } }}>
            {revisions.map((revision) => (
              <Paper
                key={revision.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  cursor: "pointer",
                  borderColor: selectedRevision?.id === revision.id ? "primary.main" : "divider"
                }}
                onClick={() => onSelectRevision(revision.id)}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <StatusChip label={`Rev ${revision.revisionNumber}`} variant="filled" />
                    <StatusChip label={revision.statusSnapshot} variant="outlined" />
                  </Stack>
                  <Typography variant="subtitle2">{revision.titleSnapshot}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {resolveOptionLabel(authorOptions, revision.changedByAuthorId)} · {revision.changedOn}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>

          {selectedRevision ? (
            <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">What This Revision Contained</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedRevision.changeSummary || "No change summary recorded."}
                </Typography>
                <Typography variant="subtitle2">{selectedRevision.titleSnapshot}</Typography>
                {selectedRevision.subtitleSnapshot ? (
                  <Typography variant="body2" color="text.secondary">
                    {selectedRevision.subtitleSnapshot}
                  </Typography>
                ) : null}
                <Typography variant="body2" color="text.secondary">
                  Categories: {(selectedRevision.taxonomySnapshot?.categoryIds ?? [])
                    .map((id) => resolveOptionLabel(categoryOptions, id))
                    .join(", ") || "None"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tags: {(selectedRevision.taxonomySnapshot?.tagIds ?? [])
                    .map((id) => resolveOptionLabel(tagOptions, id))
                    .join(", ") || "None"}
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "grey.50" }}>
                  <Typography variant="caption" color="text.secondary">
                    Body Snapshot
                  </Typography>
                  <Typography variant="body2">
                    {String(selectedRevision.bodySnapshot ?? "").slice(0, 340)}
                  </Typography>
                </Paper>
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
});

export const SeoPreview = memo(function SeoPreview({ draft, mediaOptions }) {
  const imageLabel = useMemo(
    () => resolveOptionLabel(mediaOptions, draft.ogImageMediaId || draft.featuredMediaId || "No image"),
    [draft.featuredMediaId, draft.ogImageMediaId, mediaOptions]
  );

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.25}>
        <Typography variant="subtitle2">Preview</Typography>
        <Paper variant="outlined" sx={{ p: 1.25 }}>
          <Stack spacing={0.65}>
            <Typography variant="caption" color="text.secondary">
              Search result
            </Typography>
            <Typography variant="subtitle2">{draft.seoTitle || draft.title || "Untitled Post"}</Typography>
            <Typography variant="caption" color="success.main">
              {draft.canonicalUrl || "https://example.com/blog/post-slug"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {draft.seoDescription || draft.excerpt || "Add an SEO description to complete the preview."}
            </Typography>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.25 }}>
          <Stack spacing={0.65}>
            <Typography variant="caption" color="text.secondary">
              Social card
            </Typography>
            <Typography variant="subtitle2">{draft.ogTitle || draft.title || "Untitled Post"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {draft.ogDescription || draft.seoDescription || draft.excerpt || "Add a social description."}
            </Typography>
            <StatusChip label={imageLabel} variant="outlined" />
          </Stack>
        </Paper>
      </Stack>
    </Paper>
  );
});
