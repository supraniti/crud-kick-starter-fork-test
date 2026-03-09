import {
  Alert,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";

function resolveAuthorName(authorMap, authorId, fallback = "Unknown author") {
  return authorMap.get(authorId)?.displayName ?? fallback;
}

function resolvePostLabel(posts, postId, fallback = "Direct URL target") {
  return posts.find((post) => post.id === postId)?.title ?? fallback;
}

function formatTimestamp(value, fallback = "Not set") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

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
          {["draft", "in-review", "scheduled", "published", "archived"].map((option) => (
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

export function RedirectFilters({ filters, posts, onChangeFilters, onClear }) {
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
          {["active", "disabled"].map((option) => (
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
          {["301", "302", "307", "308"].map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Target Post"
          size="small"
          value={filters.targetPostId}
          onChange={(event) => onChangeFilters("targetPostId", event.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All</MenuItem>
          {posts.map((post) => (
            <MenuItem key={post.id} value={post.id}>
              {post.title}
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

export function DistributionQueue({ posts, selectedPostId, authorMap, readinessMap, onSelectPost }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Pages Queue</Typography>
        {posts.length === 0 ? (
          <Alert severity="info">No pages match the current page filters.</Alert>
        ) : null}
        <Stack spacing={1.5}>
          {posts.map((post) => {
            const issues = readinessMap.get(post.id) ?? [];
            return (
              <Paper
                key={post.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  cursor: "pointer",
                  borderColor: selectedPostId === post.id ? "primary.main" : "divider"
                }}
                onClick={() => onSelectPost(post.id)}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                    <Typography variant="subtitle2">{post.title}</Typography>
                    <Chip size="small" label={post.status} />
                    <Chip
                      size="small"
                      label={`${issues.length} warnings`}
                      color={issues.length > 0 ? "warning" : "success"}
                      variant={issues.length > 0 ? "filled" : "outlined"}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {resolveAuthorName(authorMap, post.primaryAuthorId)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Path {post.path || "Not set"} | Scheduled {formatTimestamp(post.scheduledOn)}
                  </Typography>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Stack>
    </Paper>
  );
}

export function ReadinessPanel({ workspace }) {
  const post = workspace.selectedPost;
  const readinessIssues = post ? workspace.readinessMap.get(post.id) ?? [] : [];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Page Detail</Typography>
        {!post ? (
          <Alert severity="info">Select a page from the pages queue.</Alert>
        ) : (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip size="small" label={post.status} />
              <Chip
                size="small"
                label={`Path ${post.path || `/blog/${post.slug ?? post.sourcePostId ?? post.id}`}`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`Author ${resolveAuthorName(workspace.authorMap, post.primaryAuthorId)}`}
              />
            </Stack>
            <Typography variant="h5">{post.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              Scheduled {formatTimestamp(post.scheduledOn)} | Published {formatTimestamp(post.publishedOn)}
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "grey.50" }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">SEO / Social Warnings</Typography>
                {readinessIssues.length === 0 ? (
                  <Typography variant="body2" color="success.main">
                    No advisory distribution warnings detected.
                  </Typography>
                ) : (
                  readinessIssues.map((issue) => <Chip key={issue} size="small" label={issue} color="warning" />)
                )}
              </Stack>
            </Paper>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Metadata Snapshot</Typography>
              <Typography variant="body2" color="text.secondary">
                SEO title: {post.seoTitle || "missing"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                SEO description: {post.seoDescription || "missing"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                OpenGraph title: {post.ogTitle || "missing"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                OpenGraph description: {post.ogDescription || "missing"}
              </Typography>
            </Stack>
            <Divider />
            <TextField
              select
              label="Publishing Actor"
              value={workspace.selectedActorId}
              onChange={(event) => workspace.setSelectedActorId(event.target.value)}
              sx={{ maxWidth: 320 }}
            >
              {workspace.actorOptions.map((author) => (
                <MenuItem key={author.id} value={author.id}>
                  {author.displayName}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="contained"
                disabled={post.status !== "scheduled" || workspace.postActionState.saving}
                onClick={workspace.publishSelectedPost}
              >
                Publish Scheduled Page
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}

export function RedirectList({ redirects, posts, selectedRedirectId, onSelectRedirect, onCreate }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Redirect Registry</Typography>
          <Button variant="outlined" onClick={onCreate}>
            New Redirect
          </Button>
        </Stack>
        {redirects.length === 0 ? (
          <Alert severity="info">No redirect rules match the current filters.</Alert>
        ) : null}
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
                  {rule.targetPostId
                    ? resolvePostLabel(posts, rule.targetPostId)
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
        <TextField
          label="Source Path"
          value={workspace.redirectDraft.sourcePath}
          onChange={(event) => workspace.changeRedirectField("sourcePath", event.target.value)}
          helperText="Use a relative path such as /blog/old-launch-url"
        />
        <TextField
          select
          label="Target Post"
          value={workspace.redirectDraft.targetPostId}
          onChange={(event) => workspace.changeRedirectField("targetPostId", event.target.value)}
        >
          <MenuItem value="">None</MenuItem>
          {workspace.posts.map((post) => (
            <MenuItem key={post.id} value={post.id}>
              {post.title}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Target URL"
          value={workspace.redirectDraft.targetUrl}
          onChange={(event) => workspace.changeRedirectField("targetUrl", event.target.value)}
          helperText="Set either a target post or a direct URL."
        />
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="HTTP Code"
            value={workspace.redirectDraft.httpCode}
            onChange={(event) => workspace.changeRedirectField("httpCode", event.target.value)}
            sx={{ minWidth: 160 }}
          >
            {["301", "302", "307", "308"].map((option) => (
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
            {["active", "disabled"].map((option) => (
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
