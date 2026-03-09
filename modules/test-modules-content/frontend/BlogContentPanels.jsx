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
import { memo, useMemo } from "react";

export const SummaryCard = memo(function SummaryCard({ label, value, tone = "default" }) {
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
});

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

export const ContentFilterBar = memo(function ContentFilterBar({
  collectionsDomain,
  authorOptions
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <TextField
          label="Search"
          size="small"
          value={collectionsDomain.collectionFilterState.search ?? ""}
          onChange={(event) =>
            collectionsDomain.handleCollectionFilterChange("search", event.target.value)
          }
        />
        <TextField
          select
          label="Status"
          size="small"
          value={collectionsDomain.collectionFilterState.status ?? ""}
          onChange={(event) =>
            collectionsDomain.handleCollectionFilterChange("status", event.target.value)
          }
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
          label="Format"
          size="small"
          value={collectionsDomain.collectionFilterState.format ?? ""}
          onChange={(event) =>
            collectionsDomain.handleCollectionFilterChange("format", event.target.value)
          }
        >
          <MenuItem value="">All</MenuItem>
          {["article", "news", "opinion", "tutorial", "review"].map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Primary Author"
          size="small"
          value={collectionsDomain.collectionFilterState.primaryAuthorId ?? ""}
          onChange={(event) =>
            collectionsDomain.handleCollectionFilterChange("primaryAuthorId", event.target.value)
          }
        >
          <MenuItem value="">All</MenuItem>
          {authorOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" onClick={collectionsDomain.handleClearCollectionFilters}>
          Clear Filters
        </Button>
      </Stack>
    </Paper>
  );
});

export const PostList = memo(function PostList({
  posts,
  selectedPostId,
  postHealthMap,
  onSelect,
  onCreate
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Editorial Dashboard</Typography>
          <Button variant="contained" size="small" onClick={onCreate}>
            New Draft
          </Button>
        </Stack>

        {posts.length === 0 ? (
          <Alert severity="info">No posts match the current filters.</Alert>
        ) : null}

        <Stack spacing={1.5}>
          {posts.map((post) => {
            const healthIssues = postHealthMap.get(post.id) ?? [];
            const selected = selectedPostId === post.id;
            return (
              <Paper
                key={post.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  cursor: "pointer",
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "primary.50" : "background.paper"
                }}
                onClick={() => onSelect(post.id)}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                    <Typography variant="subtitle2">{post.title}</Typography>
                    <Chip size="small" label={post.status} />
                    <Chip size="small" label={post.format} variant="outlined" />
                    <Chip
                      size="small"
                      label={
                        healthIssues.length === 0
                          ? "healthy"
                          : `${healthIssues.length} issue${healthIssues.length > 1 ? "s" : ""}`
                      }
                      color={healthIssues.length === 0 ? "success" : "warning"}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {post.excerpt || "No excerpt yet."}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {post.wordCount ?? 0} words | {post.readTimeMinutes ?? 0} min read
                  </Typography>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Stack>
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
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Revision Timeline</Typography>
          {selectedRevision ? (
            <Button
              variant="outlined"
              size="small"
              onClick={() => onRestoreRevision(selectedRevision.id)}
            >
              Restore Selected Revision
            </Button>
          ) : null}
        </Stack>

        {loading ? <Typography color="text.secondary">Loading revisions...</Typography> : null}
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        {revisions.length === 0 && !loading ? (
          <Alert severity="info">Save a post to generate the deterministic revision timeline.</Alert>
        ) : null}

        <Stack direction={{ xs: "column", xl: "row" }} spacing={2}>
          <Stack spacing={1.5} sx={{ minWidth: { xl: 320 } }}>
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
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip size="small" label={`Rev ${revision.revisionNumber}`} />
                    <Chip size="small" label={revision.source} variant="outlined" />
                    <Chip size="small" label={revision.statusSnapshot} />
                  </Stack>
                  <Typography variant="subtitle2">{revision.titleSnapshot}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {resolveOptionLabel(authorOptions, revision.changedByAuthorId)} |{" "}
                    {revision.changedOn}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>

          {selectedRevision ? (
            <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Revision Compare</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedRevision.changeSummary || "No change summary recorded."}
                </Typography>
                <Divider />
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
                    {String(selectedRevision.bodySnapshot ?? "").slice(0, 280)}
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
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6">SEO + Social Preview</Typography>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              Search Preview
            </Typography>
            <Typography variant="subtitle2">{draft.seoTitle || draft.title || "Untitled Post"}</Typography>
            <Typography variant="caption" color="success.main">
              {draft.canonicalUrl || draft.path || "https://example.com/blog/post-slug"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {draft.seoDescription || draft.excerpt || "Add an SEO description to complete the preview."}
            </Typography>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              Social Preview
            </Typography>
            <Typography variant="subtitle2">{draft.ogTitle || draft.title || "Untitled Post"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {draft.ogDescription || draft.seoDescription || draft.excerpt || "Add OG description."}
            </Typography>
            <Chip label={imageLabel} size="small" sx={{ alignSelf: "flex-start" }} />
          </Stack>
        </Paper>
      </Stack>
    </Paper>
  );
});
