import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Drawer,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBlogEngagementWorkspace } from "../../../../modules/test-modules-engagement/frontend/useBlogEngagementWorkspace.js";
import { importReferencePublicCommentsToLocal } from "../../api/reference.js";
import { useCommentModerationAwareness } from "./useCommentModerationAwareness.js";
import {
  buildCommentDeskRows,
  buildCommentDeskSummary,
  buildDiscussionHotspots,
  buildVisibleCommentRows,
  paginateCommentRows,
  resolveModerationRouteState
} from "./product-moderation-desk-model.js";

function resolveOptionLabel(options, id, fallback = "Unknown") {
  return options.find((option) => option.id === id)?.label ?? fallback;
}

function createPublicIntakeState() {
  return {
    loading: false,
    errorMessage: null,
    successMessage: null,
    result: null,
    completedAt: null
  };
}

function QueueHealthPanel({ summary }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.35}>
          <Typography variant="subtitle1">Queue Health</Typography>
          <Typography variant="body2" color="text.secondary">
            Stay aware of backlog pressure without turning the page into a dashboard.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={`Pending ${summary.pending}`} color={summary.pending > 0 ? "warning" : "success"} />
          <Chip size="small" label={`Approved ${summary.approved}`} variant="outlined" />
          <Chip size="small" label={`Flagged ${summary.flagged}`} variant="outlined" />
          <Chip size="small" label={`Replies ${summary.replies}`} variant="outlined" />
          <Chip size="small" label={`Missing moderator ${summary.missingModerator}`} color={summary.missingModerator > 0 ? "warning" : "default"} />
          <Chip size="small" label={`Oldest pending ${summary.oldestPendingLabel}`} variant="outlined" />
        </Stack>
        <Alert severity={summary.pending > 0 ? "warning" : "success"}>
          {summary.pending > 0
            ? "Pending comments are waiting for a decision. Clear the obvious cases quickly and inspect the borderline ones in context."
            : "The visible queue is clear right now."}
        </Alert>
      </Stack>
    </Paper>
  );
}

function PublicIntakePanel({ intakeState, onRefresh }) {
  const result = intakeState.result;
  const hasResult = result && typeof result === "object";

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
        >
          <Stack spacing={0.35}>
            <Typography variant="subtitle1">Public Intake</Typography>
            <Typography variant="body2" color="text.secondary">
              Pull comments submitted from deployed pages into the local moderation queue.
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={onRefresh} disabled={intakeState.loading}>
            {intakeState.loading ? "Refreshing..." : "Refresh Public Intake"}
          </Button>
        </Stack>
        {intakeState.errorMessage ? <Alert severity="error">{intakeState.errorMessage}</Alert> : null}
        {intakeState.successMessage ? <Alert severity="success">{intakeState.successMessage}</Alert> : null}
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip
            size="small"
            label={`Imported ${hasResult ? result.importedCount ?? 0 : 0}`}
            color={hasResult && (result.importedCount ?? 0) > 0 ? "success" : "default"}
          />
          <Chip size="small" label={`Skipped ${hasResult ? result.skippedCount ?? 0 : 0}`} variant="outlined" />
          <Chip
            size="small"
            label={`Failed ${hasResult ? result.failedCount ?? 0 : 0}`}
            color={hasResult && (result.failedCount ?? 0) > 0 ? "warning" : "default"}
            variant={hasResult && (result.failedCount ?? 0) > 0 ? "filled" : "outlined"}
          />
          {hasResult ? <Chip size="small" label={`Remote ${result.remoteCount ?? 0}`} variant="outlined" /> : null}
        </Stack>
        {hasResult ? (
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Source: {result.projectId}/{result.collectionPath}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last refresh: {intakeState.completedAt ?? "Just now"}
            </Typography>
            {Array.isArray(result.failures) && result.failures.length > 0 ? (
              <Typography variant="caption" color="text.secondary">
                First issue: {result.failures[0]?.message}
              </Typography>
            ) : null}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No public intake refresh has completed yet on this screen.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

function DiscussionHotspotsPanel({ hotspots, onFilterPost }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.35}>
          <Typography variant="subtitle1">Discussion Hotspots</Typography>
          <Typography variant="body2" color="text.secondary">
            See which posts are drawing the most discussion so moderation stays contextual.
          </Typography>
        </Stack>
        {hotspots.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No comments have landed yet.
          </Typography>
        ) : (
          hotspots.map((hotspot) => (
            <Paper key={hotspot.postId} variant="outlined" sx={{ p: 1.25 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ sm: "center" }}
              >
                <Stack spacing={0.35}>
                  <Typography variant="subtitle2">{hotspot.postLabel}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {hotspot.total} comment{hotspot.total === 1 ? "" : "s"} · {hotspot.pending} pending
                  </Typography>
                </Stack>
                <Button variant="text" size="small" onClick={() => onFilterPost(hotspot.postId)}>
                  Filter Queue
                </Button>
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </Paper>
  );
}

function QueueFilters({ routeState, postOptions, authorOptions, onChangeFilter, onClear }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1">Search And Filter</Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 1.5fr) repeat(4, minmax(160px, 1fr)) auto"
            }
          }}
        >
          <TextField
            label="Search"
            size="small"
            value={routeState.search}
            onChange={(event) => onChangeFilter("commentSearch", event.target.value)}
          />
          <TextField
            select
            label="Status"
            size="small"
            value={routeState.status}
            onChange={(event) => onChangeFilter("commentStatus", event.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {["pending", "approved", "rejected", "spam"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Post"
            size="small"
            value={routeState.postId}
            onChange={(event) => onChangeFilter("commentPostId", event.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {postOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Moderator"
            size="small"
            value={routeState.moderatorId}
            onChange={(event) => onChangeFilter("commentModeratorId", event.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {authorOptions.map((option) => (
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
            onChange={(event) => onChangeFilter("commentSort", event.target.value)}
          >
            <MenuItem value="pending-first">Pending first</MenuItem>
            <MenuItem value="newest-desc">Newest first</MenuItem>
            <MenuItem value="oldest-asc">Oldest first</MenuItem>
            <MenuItem value="status-asc">Status</MenuItem>
            <MenuItem value="post-asc">Post</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={onClear}>
            Clear
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

function BulkModerationBar({
  selectedCount,
  moderatorLabel,
  saving,
  onApprove,
  onReject,
  onSpam,
  onClear
}) {
  if (selectedCount === 0) {
    return null;
  }
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ lg: "center" }}
      >
        <Stack spacing={0.35}>
          <Typography variant="subtitle2">Bulk moderation</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedCount} selected comment{selectedCount === 1 ? "" : "s"} · moderation attribution will use {moderatorLabel}.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button variant="contained" onClick={onApprove} disabled={saving}>
            Approve Selected
          </Button>
          <Button variant="outlined" onClick={onReject} disabled={saving}>
            Reject Selected
          </Button>
          <Button variant="outlined" color="warning" onClick={onSpam} disabled={saving}>
            Mark Selected Spam
          </Button>
          <Button variant="text" color="inherit" onClick={onClear} disabled={saving}>
            Clear Selection
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function CommentQueueTable({
  routeState,
  pagedRows,
  selectedCommentIds,
  onToggleAllVisible,
  onToggleComment,
  onOpenComment,
  onPageChange
}) {
  const allVisibleSelected =
    pagedRows.rows.length > 0 &&
    pagedRows.rows.every((row) => selectedCommentIds.includes(row.id));
  const someVisibleSelected =
    pagedRows.rows.some((row) => selectedCommentIds.includes(row.id)) && !allVisibleSelected;

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected}
                onChange={(event) => onToggleAllVisible(event.target.checked)}
              />
            </TableCell>
            <TableCell>Commenter</TableCell>
            <TableCell>Comment</TableCell>
            <TableCell>Post</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell>Flags</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedRows.rows.map((row) => {
            const isSelected = routeState.commentId === row.id;
            const isChecked = selectedCommentIds.includes(row.id);
            return (
              <TableRow
                key={row.id}
                hover
                selected={isSelected}
                sx={{ cursor: "pointer" }}
                onClick={() => onOpenComment(row.id)}
              >
                <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                  <Checkbox checked={isChecked} onChange={() => onToggleComment(row.id)} />
                </TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  <Stack spacing={0.35}>
                    <Typography variant="subtitle2">{row.authorDisplayName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.authorEmail || "No email provided"}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ minWidth: 320 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2">{row.bodyPreview || "No comment body"}</Typography>
                    {row.threadSize > 1 ? (
                      <Typography variant="caption" color="text.secondary">
                        Thread size {row.threadSize}
                      </Typography>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  <Typography variant="body2">{row.postLabel}</Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={row.status} color={row.status === "pending" ? "warning" : "default"} />
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{row.submittedLabel}</TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {row.flags.length > 0 ? (
                      row.flags.map((flag) => <Chip key={flag} size="small" label={flag} variant="outlined" />)
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Clean
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
          {pagedRows.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <Alert severity="info">No comments match the current queue filters.</Alert>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={pagedRows.totalCount}
        page={pagedRows.page - 1}
        rowsPerPage={pagedRows.pageSize}
        onPageChange={onPageChange}
        rowsPerPageOptions={[pagedRows.pageSize]}
      />
    </TableContainer>
  );
}

function ContextTab({ comment, selectedPost, threadItems, onOpenPost }) {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
          >
            <Typography variant="subtitle1">Comment Context</Typography>
            {comment?.postId ? (
              <Button variant="text" size="small" onClick={() => onOpenPost(comment.postId)}>
                Open Post
              </Button>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={comment?.status ?? "Unknown"} color={comment?.status === "pending" ? "warning" : "default"} />
            <Chip size="small" label={selectedPost?.title ?? comment?.postId ?? "Unknown post"} variant="outlined" />
            <Chip
              size="small"
              label={
                selectedPost
                  ? selectedPost.allowComments === false || selectedPost.commentPolicy === "closed"
                    ? "Comments closed on post"
                    : "Comments open on post"
                  : "Post policy unknown"
              }
              variant="outlined"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {comment?.authorDisplayName}
            {comment?.authorEmail ? ` · ${comment.authorEmail}` : " · no email provided"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Submitted {comment?.createdOn || "Unknown"}
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "grey.50" }}>
            <Typography variant="body2">{comment?.body || "No comment body"}</Typography>
          </Paper>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1">Nearby Thread</Typography>
          {threadItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No nearby thread context is available.
            </Typography>
          ) : (
            threadItems.map((threadComment) => (
              <Paper
                key={threadComment.id}
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderColor: threadComment.id === comment?.id ? "primary.main" : "divider"
                }}
              >
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Typography variant="subtitle2">{threadComment.authorDisplayName}</Typography>
                    <Chip size="small" label={threadComment.status} />
                    <Typography variant="caption" color="text.secondary">
                      {threadComment.createdOn}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {threadComment.body}
                  </Typography>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

function ModerateTab({ workspace }) {
  const comment = workspace.selectedComment;
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Moderation Decision</Typography>
          <Typography variant="body2" color="text.secondary">
            The moderation reason is internal. Use it to explain borderline decisions to other editors.
          </Typography>
          <TextField
            select
            label="Moderator"
            size="small"
            value={workspace.selectedModeratorId}
            onChange={(event) => workspace.setSelectedModeratorId(event.target.value)}
          >
            {workspace.authorOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Moderation Reason"
            value={workspace.moderationReason}
            onChange={(event) => workspace.setModerationReason(event.target.value)}
            multiline
            minRows={4}
          />
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="contained"
              onClick={() => workspace.runModerationAction("approved")}
              disabled={workspace.actionState.saving || !comment}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              onClick={() => workspace.runModerationAction("rejected")}
              disabled={workspace.actionState.saving || !comment}
            >
              Reject
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => workspace.runModerationAction("spam")}
              disabled={workspace.actionState.saving || !comment}
            >
              Mark Spam
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

function HistoryTab({ comment, selectedPost, moderatorLabel, awareness }) {
  const isModerated =
    comment?.status === "approved" || comment?.status === "rejected" || comment?.status === "spam";

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Lifecycle</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label="Submitted" color={comment ? "success" : "default"} variant={comment ? "filled" : "outlined"} />
            <Chip size="small" label="Queued" color={comment?.status === "pending" ? "warning" : "default"} variant={comment?.status === "pending" ? "filled" : "outlined"} />
            <Chip size="small" label="Moderated" color={isModerated ? "success" : "default"} variant={isModerated ? "filled" : "outlined"} />
            {comment?.parentCommentId ? <Chip size="small" label="Reply Thread" variant="outlined" /> : null}
          </Stack>
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary">
              Source post: {selectedPost?.title ?? comment?.postId ?? "Unknown post"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Moderator attribution: {moderatorLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Moderation reason: {comment?.moderationReason || "Not recorded yet"}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Remote Intake</Typography>
          <Typography variant="body2" color="text.secondary">
            Deployed pages submit public comments first. This desk refreshes that public intake into the local moderation queue you are reviewing here.
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={awareness.remoteContract.dataset} variant="outlined" />
            <Chip size="small" label={awareness.remoteContract.query} variant="outlined" />
            <Chip size="small" label={awareness.remoteContract.action} variant="outlined" />
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

function CommentWorkbenchDrawer({
  open,
  routeState,
  selectedComment,
  selectedPost,
  moderatorLabel,
  workspace,
  awareness,
  onClose,
  onChangeTab,
  onOpenPost
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", lg: 560 },
          maxWidth: "100vw"
        }
      }}
    >
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Stack spacing={0.35}>
              <Typography variant="overline" color="text.secondary">
                Comment Desk
              </Typography>
              <Typography variant="h5">{selectedComment?.authorDisplayName ?? "Comment"}</Typography>
              <Typography variant="body2" color="text.secondary">
                Keep the queue visible while you review one conversation in a dedicated moderation workbench.
              </Typography>
            </Stack>
            <Button variant="text" color="inherit" onClick={onClose}>
              Close
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={selectedComment?.status ?? "Unknown"} color={selectedComment?.status === "pending" ? "warning" : "default"} />
            <Chip size="small" label={selectedPost?.title ?? selectedComment?.postId ?? "Unknown post"} variant="outlined" />
            {selectedComment?.approvedByAuthorId ? <Chip size="small" label={moderatorLabel} variant="outlined" /> : null}
          </Stack>
        </Stack>

        <Paper variant="outlined" sx={{ px: 1.5 }}>
          <Tabs
            value={routeState.tab}
            onChange={(_, nextValue) => onChangeTab(nextValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab value="context" label="Context" />
            <Tab value="moderate" label="Moderate" />
            <Tab value="history" label="History" />
          </Tabs>
        </Paper>

        {workspace.actionState.errorMessage ? <Alert severity="error">{workspace.actionState.errorMessage}</Alert> : null}
        {workspace.actionState.successMessage ? <Alert severity="success">{workspace.actionState.successMessage}</Alert> : null}

        {routeState.tab === "context" ? (
          <ContextTab
            comment={selectedComment}
            selectedPost={selectedPost}
            threadItems={workspace.threadItems}
            onOpenPost={onOpenPost}
          />
        ) : null}
        {routeState.tab === "moderate" ? <ModerateTab workspace={workspace} /> : null}
        {routeState.tab === "history" ? (
          <HistoryTab
            comment={selectedComment}
            selectedPost={selectedPost}
            moderatorLabel={moderatorLabel}
            awareness={awareness}
          />
        ) : null}
      </Stack>
    </Drawer>
  );
}

export function ProductModerationView({ navigate = null, route = {}, collectionsDomain }) {
  const routeState = useMemo(() => resolveModerationRouteState(route), [route]);
  const [publicIntakeState, setPublicIntakeState] = useState(createPublicIntakeState);
  const reloadCommentItems = collectionsDomain.reloadCollectionItems;

  const updateRouteState = useCallback(
    (patch = {}, replace = true) => {
      if (typeof navigate !== "function") {
        return;
      }
      navigate(
        {
          ...route,
          ...patch
        },
        { replace }
      );
    },
    [navigate, route]
  );

  const workspace = useBlogEngagementWorkspace({
    collectionsDomain,
    selectedCommentId: routeState.commentId || "",
    onSelectCommentId: (commentId) =>
      updateRouteState(
        {
          commentId: commentId || "",
          commentTab: routeState.tab || "context"
        },
        false
      )
  });

  const awareness = useCommentModerationAwareness({
    selectedComment: workspace.selectedComment
  });
  const [selectedCommentIds, setSelectedCommentIds] = useState([]);

  const runPublicIntakeSync = useCallback(
    async ({ announceEmpty = true } = {}) => {
      setPublicIntakeState((previous) => ({
        ...previous,
        loading: true,
        errorMessage: null,
        successMessage: null
      }));

      try {
        const payload = await importReferencePublicCommentsToLocal();
        if (payload?.ok !== true) {
          setPublicIntakeState({
            loading: false,
            errorMessage: payload?.error?.message ?? "Failed to refresh public comments.",
            successMessage: null,
            result: null,
            completedAt: null
          });
          return;
        }

        await reloadCommentItems();
        const importedCount = payload.importedCount ?? 0;
        const skippedCount = payload.skippedCount ?? 0;
        const failedCount = payload.failedCount ?? 0;
        const successMessage =
          importedCount > 0
            ? `Imported ${importedCount} public comment${importedCount === 1 ? "" : "s"} into the moderation queue.`
            : announceEmpty
              ? `Public intake is up to date. ${skippedCount} existing comment${skippedCount === 1 ? "" : "s"} matched the current queue.`
              : null;

        setPublicIntakeState({
          loading: false,
          errorMessage: null,
          successMessage:
            failedCount > 0 && !successMessage
              ? `Public intake completed with ${failedCount} issue${failedCount === 1 ? "" : "s"}.`
              : successMessage,
          result: payload,
          completedAt: new Date().toISOString()
        });
      } catch (error) {
        setPublicIntakeState({
          loading: false,
          errorMessage: error?.message ?? "Failed to refresh public comments.",
          successMessage: null,
          result: null,
          completedAt: null
        });
      }
    },
    [reloadCommentItems]
  );

  useEffect(() => {
    runPublicIntakeSync({
      announceEmpty: false
    });
  }, [runPublicIntakeSync]);

  const postOptions = useMemo(() => {
    const fromReferenceOptions = Array.isArray(workspace.postOptions) ? workspace.postOptions : [];
    const merged = new Map(fromReferenceOptions.map((option) => [option.id, option]));
    for (const post of awareness.state.items ?? []) {
      if (!post?.id) {
        continue;
      }
      merged.set(post.id, {
        id: post.id,
        label: post.title || post.slug || post.id
      });
    }
    return [...merged.values()];
  }, [awareness.state.items, workspace.postOptions]);

  const commentRows = useMemo(
    () => buildCommentDeskRows(workspace.comments, postOptions, workspace.authorOptions),
    [postOptions, workspace.authorOptions, workspace.comments]
  );
  const visibleRows = useMemo(
    () => buildVisibleCommentRows(commentRows, routeState),
    [commentRows, routeState]
  );
  const pagedRows = useMemo(
    () => paginateCommentRows(visibleRows, routeState.page),
    [routeState.page, visibleRows]
  );
  const summary = useMemo(() => buildCommentDeskSummary(commentRows), [commentRows]);
  const hotspots = useMemo(() => buildDiscussionHotspots(commentRows), [commentRows]);

  useEffect(() => {
    if (pagedRows.page === routeState.page) {
      return;
    }
    updateRouteState({ commentPage: pagedRows.page }, true);
  }, [pagedRows.page, routeState.page, updateRouteState]);

  useEffect(() => {
    const visibleIds = new Set(visibleRows.map((row) => row.id));
    setSelectedCommentIds((previous) => previous.filter((commentId) => visibleIds.has(commentId)));
    if (routeState.commentId && !visibleIds.has(routeState.commentId)) {
      updateRouteState({ commentId: "", commentTab: "context" }, true);
    }
  }, [routeState.commentId, updateRouteState, visibleRows]);

  const moderatorLabel = resolveOptionLabel(
    workspace.authorOptions,
    workspace.selectedModeratorId,
    workspace.authorOptions[0]?.label ?? "a moderator"
  );

  const handleFilterChange = useCallback(
    (fieldId, value) => {
      updateRouteState(
        {
          [fieldId]: value,
          commentPage: 1,
          commentId: ""
        },
        true
      );
    },
    [updateRouteState]
  );

  const handleOpenComment = useCallback(
    (commentId) => {
      updateRouteState(
        {
          commentId,
          commentTab: routeState.tab || "context"
        },
        false
      );
    },
    [routeState.tab, updateRouteState]
  );

  const handleToggleCommentSelection = useCallback((commentId) => {
    setSelectedCommentIds((previous) =>
      previous.includes(commentId)
        ? previous.filter((itemId) => itemId !== commentId)
        : [...previous, commentId]
    );
  }, []);

  const handleToggleAllVisible = useCallback(
    (checked) => {
      setSelectedCommentIds((previous) => {
        if (!checked) {
          const pageIds = new Set(pagedRows.rows.map((row) => row.id));
          return previous.filter((commentId) => !pageIds.has(commentId));
        }
        return [...new Set([...previous, ...pagedRows.rows.map((row) => row.id)])];
      });
    },
    [pagedRows.rows]
  );

  const handleOpenPost = useCallback(
    (postId) => {
      if (typeof navigate !== "function") {
        return;
      }
      navigate(
        {
          moduleId: "test-modules-content",
          postId,
          postEditorSection: "publish"
        },
        { replace: false }
      );
    },
    [navigate]
  );

  const selectedComment = workspace.selectedComment;

  if (
    !collectionsDomain.isActiveCollectionAvailable &&
    collectionsDomain.activeCollectionId === "blog-comments"
  ) {
    return <Alert severity="warning">{collectionsDomain.activeCollectionUnavailableMessage}</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          background: "linear-gradient(135deg, #111827 0%, #1d4ed8 100%)",
          color: "common.white"
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.75)" }}>
            Comments
          </Typography>
          <Typography variant="h4">Moderation Queue</Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
            Work through discussion with the queue on the page and one focused comment workbench at a time.
          </Typography>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            xl: "repeat(3, minmax(0, 1fr))"
          }
        }}
      >
        <QueueHealthPanel summary={summary} />
        <DiscussionHotspotsPanel
          hotspots={hotspots}
          onFilterPost={(postId) => handleFilterChange("commentPostId", postId)}
        />
        <PublicIntakePanel
          intakeState={publicIntakeState}
          onRefresh={() =>
            runPublicIntakeSync({
              announceEmpty: true
            })
          }
        />
      </Box>

      <QueueFilters
        routeState={routeState}
        postOptions={postOptions}
        authorOptions={workspace.authorOptions}
        onChangeFilter={handleFilterChange}
        onClear={() =>
          updateRouteState(
            {
              commentSearch: "",
              commentStatus: "",
              commentPostId: "",
              commentModeratorId: "",
              commentSort: "pending-first",
              commentPage: 1,
              commentId: "",
              commentTab: "context"
            },
            true
          )
        }
      />

      <BulkModerationBar
        selectedCount={selectedCommentIds.length}
        moderatorLabel={moderatorLabel}
        saving={workspace.actionState.saving}
        onApprove={() => workspace.runBulkModerationAction(selectedCommentIds, "approved")}
        onReject={() => workspace.runBulkModerationAction(selectedCommentIds, "rejected")}
        onSpam={() => workspace.runBulkModerationAction(selectedCommentIds, "spam")}
        onClear={() => setSelectedCommentIds([])}
      />

      {workspace.actionState.errorMessage ? <Alert severity="error">{workspace.actionState.errorMessage}</Alert> : null}
      {workspace.actionState.successMessage ? <Alert severity="success">{workspace.actionState.successMessage}</Alert> : null}

      <CommentQueueTable
        routeState={routeState}
        pagedRows={pagedRows}
        selectedCommentIds={selectedCommentIds}
        onToggleAllVisible={handleToggleAllVisible}
        onToggleComment={handleToggleCommentSelection}
        onOpenComment={handleOpenComment}
        onPageChange={(_event, nextPageIndex) =>
          updateRouteState(
            {
              commentPage: nextPageIndex + 1
            },
            true
          )
        }
      />

      <CommentWorkbenchDrawer
        open={Boolean(selectedComment)}
        routeState={routeState}
        selectedComment={selectedComment}
        selectedPost={awareness.selectedPost}
        moderatorLabel={resolveOptionLabel(
          workspace.authorOptions,
          selectedComment?.approvedByAuthorId,
          "Not moderated"
        )}
        workspace={workspace}
        awareness={awareness}
        onClose={() => updateRouteState({ commentId: "", commentTab: "context" }, true)}
        onChangeTab={(nextValue) => updateRouteState({ commentTab: nextValue }, true)}
        onOpenPost={handleOpenPost}
      />
    </Stack>
  );
}
