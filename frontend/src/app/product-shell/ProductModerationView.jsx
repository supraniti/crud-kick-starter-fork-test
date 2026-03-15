import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useMemo } from "react";
import { useBlogEngagementWorkspace } from "../../../../modules/test-modules-engagement/frontend/useBlogEngagementWorkspace.js";
import { RemoteCommentContractCard, ModerationComplianceCard, SelectedCommentLifecycleCard } from "./ProductModerationInsightsPanels.jsx";
import { useCommentModerationAwareness } from "./useCommentModerationAwareness.js";

function SummaryCard({ label, value, tone = "default" }) {
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
          color={tone === "attention" ? "warning" : tone === "ready" ? "success" : "default"}
          sx={{ alignSelf: "flex-start" }}
        />
      </Stack>
    </Paper>
  );
}

function resolveOptionLabel(options, id, fallback = "Unknown") {
  return options.find((option) => option.id === id)?.label ?? fallback;
}

function buildModerationDiagnostics(comments = []) {
  const threadRoots = new Set();
  let unresolvedThreads = 0;
  for (const comment of comments) {
    const threadRootId = comment.parentCommentId ?? comment.id;
    if (!threadRoots.has(threadRootId)) {
      threadRoots.add(threadRootId);
    }
    if (comment.status === "pending") {
      unresolvedThreads += 1;
    }
  }
  return {
    unresolvedThreads,
    withoutModerator: comments.filter(
      (comment) =>
        (comment.status === "approved" || comment.status === "rejected" || comment.status === "spam") &&
        !comment.approvedByAuthorId
    ).length
  };
}

function QueueFilters({ filters, postOptions, authorOptions, onChangeFilter, onClear }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <TextField
          label="Search"
          size="small"
          value={filters.search}
          onChange={(event) => onChangeFilter("search", event.target.value)}
        />
        <TextField
          select
          label="Status"
          size="small"
          value={filters.status}
          onChange={(event) => onChangeFilter("status", event.target.value)}
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
          value={filters.postId}
          onChange={(event) => onChangeFilter("postId", event.target.value)}
          sx={{ minWidth: 220 }}
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
          value={filters.moderatorId}
          onChange={(event) => onChangeFilter("moderatorId", event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All</MenuItem>
          {authorOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.label}
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

function ModerationReadinessCard({ diagnostics, moderatorCount, onOpenPosts, onOpenAuthors }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
          >
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Moderation Readiness</Typography>
              <Typography variant="body2" color="text.secondary">
                Comments moderation now stays coupled to post context and moderator roster coverage.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="text" onClick={onOpenPosts}>
                Open Posts
              </Button>
              <Button variant="text" onClick={onOpenAuthors}>
                Open Authors
              </Button>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`Moderators available: ${moderatorCount}`} color={moderatorCount > 0 ? "success" : "warning"} />
            <Chip size="small" label={`Pending items: ${diagnostics.unresolvedThreads}`} color={diagnostics.unresolvedThreads > 0 ? "warning" : "default"} />
            <Chip size="small" label={`Missing moderator attribution: ${diagnostics.withoutModerator}`} variant="outlined" />
          </Stack>
          <Alert severity={diagnostics.unresolvedThreads > 0 ? "warning" : "success"}>
            {diagnostics.unresolvedThreads > 0
              ? "Pending comments still require moderation. Keep the moderator roster healthy before treating comments as release-ready."
              : "No pending moderation backlog is currently visible."}
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CommentQueue({ comments, selectedCommentId, postOptions, onSelectComment }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Moderation Queue</Typography>
        {comments.length === 0 ? <Alert severity="info">No comments match the current moderation filters.</Alert> : null}
        <Stack spacing={1.5}>
          {comments.map((comment) => (
            <Paper
              key={comment.id}
              variant="outlined"
              sx={{
                p: 1.5,
                cursor: "pointer",
                borderColor: selectedCommentId === comment.id ? "primary.main" : "divider"
              }}
              onClick={() => onSelectComment(comment.id)}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                  <Typography variant="subtitle2">{comment.authorDisplayName}</Typography>
                  <Chip size="small" label={comment.status} />
                  <Chip
                    size="small"
                    label={resolveOptionLabel(postOptions, comment.postId, comment.postId)}
                    variant="outlined"
                  />
                  {comment.parentCommentId ? <Chip size="small" label="reply" variant="outlined" /> : null}
                  {!comment.authorEmail ? <Chip size="small" label="missing email" color="warning" /> : null}
                  {(comment.status === "approved" || comment.status === "rejected" || comment.status === "spam") &&
                  !comment.approvedByAuthorId ? (
                    <Chip size="small" label="missing moderator" color="warning" />
                  ) : null}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {String(comment.body ?? "").slice(0, 140)}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

function ThreadPanel({ threadItems, selectedCommentId }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6">Thread Inspector</Typography>
        {threadItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Select a comment to inspect its thread context.
          </Typography>
        ) : (
          threadItems.map((comment) => (
            <Paper
              key={comment.id}
              variant="outlined"
              sx={{
                p: 1.5,
                borderColor: selectedCommentId === comment.id ? "primary.main" : "divider"
              }}
            >
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Typography variant="subtitle2">{comment.authorDisplayName}</Typography>
                  <Chip size="small" label={comment.status} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {comment.createdOn}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {comment.body}
                </Typography>
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </Paper>
  );
}

function CommentDetail({ workspace }) {
  const comment = workspace.selectedComment;
  const moderatorLabel = resolveOptionLabel(
    workspace.authorOptions,
    comment?.approvedByAuthorId,
    "Not moderated"
  );
  const postLabel = resolveOptionLabel(workspace.postOptions, comment?.postId, "Unknown post");

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Comment Detail</Typography>
        {!comment ? (
          <Alert severity="info">Select a comment from the moderation queue.</Alert>
        ) : (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" label={comment.status} />
              <Chip size="small" label={postLabel} variant="outlined" />
              <Chip size="small" label={moderatorLabel} />
            </Stack>
            <Typography variant="subtitle1">{comment.authorDisplayName}</Typography>
            {comment.authorEmail ? (
              <Typography variant="body2" color="text.secondary">
                {comment.authorEmail}
              </Typography>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              Created {comment.createdOn}
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "grey.50" }}>
              <Typography variant="body2">{comment.body}</Typography>
            </Paper>
            <TextField
              select
              label="Moderator"
              value={workspace.selectedModeratorId}
              onChange={(event) => workspace.setSelectedModeratorId(event.target.value)}
              sx={{ maxWidth: 320 }}
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
              minRows={3}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="contained"
                onClick={() => workspace.runModerationAction("approved")}
                disabled={workspace.actionState.saving}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                onClick={() => workspace.runModerationAction("rejected")}
                disabled={workspace.actionState.saving}
              >
                Reject
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => workspace.runModerationAction("spam")}
                disabled={workspace.actionState.saving}
              >
                Mark Spam
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}

export function ProductModerationView({ navigate = null, collectionsDomain }) {
  const workspace = useBlogEngagementWorkspace({ collectionsDomain });
  const awareness = useCommentModerationAwareness({
    selectedComment: workspace.selectedComment
  });
  const queueTitle = useMemo(
    () => resolveOptionLabel(workspace.postOptions, workspace.selectedComment?.postId, "Comment Queue"),
    [workspace.postOptions, workspace.selectedComment?.postId]
  );
  const diagnostics = useMemo(() => buildModerationDiagnostics(workspace.comments), [workspace.comments]);
  const moderatorLabel = resolveOptionLabel(
    workspace.authorOptions,
    workspace.selectedComment?.approvedByAuthorId,
    "Not moderated"
  );

  function openRoute(moduleId) {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId }, { replace: false });
  }

  if (
    !collectionsDomain.isActiveCollectionAvailable &&
    collectionsDomain.activeCollectionId === "blog-comments"
  ) {
    return <Alert severity="warning">{collectionsDomain.activeCollectionUnavailableMessage}</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Card
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
          <Typography variant="h4">Moderation Control Desk</Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
            Review the queue, inspect thread context, and keep moderator attribution tied to the editorial roster.
          </Typography>
        </Stack>
      </Card>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" } }}
      >
        <SummaryCard label="Total Comments" value={workspace.summary.total} />
        <SummaryCard label="Pending Review" value={workspace.summary.pending} tone="attention" />
        <SummaryCard label="Approved" value={workspace.summary.approved} />
        <SummaryCard label="Flagged" value={workspace.summary.flagged} />
        <SummaryCard
          label="Moderators"
          value={workspace.authorOptions.length}
          tone={workspace.authorOptions.length > 0 ? "ready" : "attention"}
        />
      </Stack>

      <ModerationReadinessCard
        diagnostics={diagnostics}
        moderatorCount={workspace.authorOptions.length}
        onOpenPosts={() => openRoute("test-modules-content")}
        onOpenAuthors={() => openRoute("test-modules-editorial")}
      />

      <RemoteCommentContractCard
        awareness={awareness}
        onOpenPosts={() => openRoute("test-modules-content")}
        onOpenPages={() => openRoute("test-modules-pages")}
      />

      <ModerationComplianceCard
        comments={workspace.comments}
        onOpenAuthors={() => openRoute("test-modules-editorial")}
      />

      <QueueFilters
        filters={workspace.filters}
        postOptions={workspace.postOptions}
        authorOptions={workspace.authorOptions}
        onChangeFilter={(fieldId, value) =>
          workspace.setFilters((previous) => ({
            ...previous,
            [fieldId]: value
          }))
        }
        onClear={() =>
          workspace.setFilters({
            search: "",
            status: "",
            postId: "",
            moderatorId: ""
          })
        }
      />

      {workspace.actionState.errorMessage ? <Alert severity="error">{workspace.actionState.errorMessage}</Alert> : null}
      {workspace.actionState.successMessage ? <Alert severity="success">{workspace.actionState.successMessage}</Alert> : null}

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2} alignItems="flex-start">
        <Stack sx={{ width: { xs: "100%", xl: 360 }, flexShrink: 0 }}>
          <CommentQueue
            comments={workspace.filteredComments}
            selectedCommentId={workspace.selectedCommentId}
            postOptions={workspace.postOptions}
            onSelectComment={workspace.selectComment}
          />
        </Stack>
        <Stack sx={{ flex: 1, width: "100%" }} spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary">
              Active Thread
            </Typography>
            <Typography variant="h6">{queueTitle}</Typography>
          </Paper>
          <SelectedCommentLifecycleCard
            comment={workspace.selectedComment}
            selectedPost={awareness.selectedPost}
            moderatorLabel={moderatorLabel}
          />
          <CommentDetail workspace={workspace} />
          <ThreadPanel threadItems={workspace.threadItems} selectedCommentId={workspace.selectedCommentId} />
        </Stack>
      </Stack>
    </Stack>
  );
}
