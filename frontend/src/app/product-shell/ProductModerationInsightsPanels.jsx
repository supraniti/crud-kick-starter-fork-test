import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography
} from "@mui/material";

function hasModeratorAttribution(comment) {
  return typeof comment?.approvedByAuthorId === "string" && comment.approvedByAuthorId.length > 0;
}

function buildComplianceSignals(comments = []) {
  return {
    missingEmail: comments.filter((comment) => !comment.authorEmail).length,
    replies: comments.filter((comment) => comment.parentCommentId).length,
    pending: comments.filter((comment) => comment.status === "pending").length,
    spam: comments.filter((comment) => comment.status === "spam").length,
    rejected: comments.filter((comment) => comment.status === "rejected").length,
    approvedWithoutModerator: comments.filter(
      (comment) => comment.status === "approved" && !hasModeratorAttribution(comment)
    ).length
  };
}

function buildLifecycleEntries(comment, selectedPost) {
  const isModerated = comment?.status === "approved" || comment?.status === "rejected" || comment?.status === "spam";
  return [
    {
      label: "Submitted",
      ready: Boolean(comment)
    },
    {
      label: "Queued",
      ready: Boolean(comment) && comment?.status === "pending"
    },
    {
      label: "Moderated",
      ready: Boolean(comment) && isModerated
    },
    {
      label: "Comments Open On Post",
      ready: Boolean(selectedPost) && selectedPost.allowComments !== false && selectedPost.commentPolicy !== "closed"
    }
  ];
}

export function RemoteCommentContractCard({ awareness, onOpenPosts, onOpenPages }) {
  const summary = awareness.postSummary;
  const contract = awareness.remoteContract;

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
              <Typography variant="subtitle1">Remote Intake Contract</Typography>
              <Typography variant="body2" color="text.secondary">
                Comments arrive from delivered pages through the injected runtime contract, then land in the local moderation queue.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button variant="text" onClick={onOpenPosts}>
                Open Posts
              </Button>
              <Button variant="text" onClick={onOpenPages}>
                Open Pages
              </Button>
              <Button variant="outlined" size="small" onClick={awareness.reload}>
                Refresh Intake
              </Button>
            </Stack>
          </Stack>

          {awareness.state.errorMessage ? <Alert severity="error">{awareness.state.errorMessage}</Alert> : null}

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`Published posts ${summary.publishedPosts}`} variant="outlined" />
            <Chip
              size="small"
              label={`Comments-enabled posts ${summary.publishedCommentEnabledPosts}`}
              color={summary.publishedCommentEnabledPosts > 0 ? "success" : "warning"}
            />
            <Chip size="small" label={`Closed posts ${summary.publishedClosedPosts}`} variant="outlined" />
            <Chip size="small" label={contract.dataset} variant="outlined" />
            <Chip size="small" label={contract.query} variant="outlined" />
            <Chip size="small" label={contract.action} variant="outlined" />
          </Stack>

          <Alert severity={summary.publishedCommentEnabledPosts > 0 ? "info" : "warning"}>
            {summary.publishedCommentEnabledPosts > 0
              ? "Published posts with open comment policy can submit remote comments into this queue."
              : "No published posts are currently open for remote comment intake."}
          </Alert>

          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary">
              Dataset: {contract.dataset}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Query: {contract.query} {"->"} GET {contract.getPath}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Action: {contract.action} {"->"} POST {contract.postPath}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ModerationComplianceCard({ comments, onOpenAuthors }) {
  const signals = buildComplianceSignals(comments);

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
              <Typography variant="subtitle1">Compliance Signals</Typography>
              <Typography variant="body2" color="text.secondary">
                Keep anonymous input, thread complexity, spam pressure, and moderator attribution visible while triaging the queue.
              </Typography>
            </Stack>
            <Button variant="text" onClick={onOpenAuthors}>
              Open Authors
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`Missing email ${signals.missingEmail}`} color={signals.missingEmail > 0 ? "warning" : "default"} />
            <Chip size="small" label={`Replies ${signals.replies}`} variant="outlined" />
            <Chip size="small" label={`Pending ${signals.pending}`} color={signals.pending > 0 ? "warning" : "default"} />
            <Chip size="small" label={`Spam ${signals.spam}`} color={signals.spam > 0 ? "warning" : "default"} />
            <Chip size="small" label={`Rejected ${signals.rejected}`} variant="outlined" />
            <Chip
              size="small"
              label={`Approved without moderator ${signals.approvedWithoutModerator}`}
              color={signals.approvedWithoutModerator > 0 ? "warning" : "default"}
            />
          </Stack>

          <Alert severity={signals.approvedWithoutModerator > 0 || signals.pending > 0 ? "warning" : "success"}>
            {signals.approvedWithoutModerator > 0 || signals.pending > 0
              ? "Moderation is not clean yet. Clear pending items and ensure every approved comment carries moderator attribution."
              : "The visible queue is moderated cleanly and does not show attribution gaps."}
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function SelectedCommentLifecycleCard({ comment, selectedPost, moderatorLabel }) {
  const lifecycleEntries = buildLifecycleEntries(comment, selectedPost);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Moderation Stage</Typography>
            <Typography variant="body2" color="text.secondary">
              Read the selected comment as remote intake moving through queue and moderator review.
            </Typography>
          </Stack>

          {!comment ? (
            <Alert severity="info">Select a comment from the moderation queue to inspect its lifecycle.</Alert>
          ) : (
            <>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {lifecycleEntries.map((entry) => (
                  <Chip
                    key={entry.label}
                    size="small"
                    label={entry.label}
                    color={entry.ready ? "success" : "default"}
                    variant={entry.ready ? "filled" : "outlined"}
                  />
                ))}
                {comment.parentCommentId ? <Chip size="small" label="Reply Thread" variant="outlined" /> : null}
                {!comment.authorEmail ? <Chip size="small" label="Missing Email" color="warning" /> : null}
              </Stack>

              <Stack spacing={0.75}>
                <Typography variant="body2" color="text.secondary">
                  Source post: {selectedPost?.title ?? comment.postId ?? "Unknown post"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Post policy: {selectedPost ? `${selectedPost.allowComments === false ? "disabled" : selectedPost.commentPolicy ?? "open"}` : "Unknown"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Moderator attribution: {moderatorLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Moderation reason: {comment.moderationReason || "Not recorded yet"}
                </Typography>
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
