import {
  Alert,
  Button,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { SeoPreview, optionItems } from "./BlogContentPanels.jsx";

function ToggleChipField({ label, options, values, onToggle }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{label}</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {options.map((option) => {
          const selected = values.includes(option.id);
          return (
            <Chip
              key={option.id}
              label={option.label}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              size="small"
              onClick={() => onToggle(option.id)}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}

function EditorHeader({ workspace }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        background: "linear-gradient(135deg, #0f172a 0%, #255f85 100%)",
        color: "common.white"
      }}
    >
      <Stack spacing={1}>
        <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)" }}>
          Blog Content
        </Typography>
        <Typography variant="h4">Post Editor</Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
          Custom workflow surface for post editing, lifecycle transitions, and revision restore.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="contained" color="inherit" onClick={() => workspace.persistPost()}>
            {workspace.saveState.saving ? "Saving..." : "Save Post"}
          </Button>
          <Button variant="outlined" color="inherit" onClick={workspace.startNew}>
            New Draft
          </Button>
          {workspace.selectedPostId ? (
            <>
              <Button variant="outlined" color="inherit" onClick={() => workspace.runLifecycleAction("in-review")}>
                Submit for Review
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => workspace.runLifecycleAction("scheduled")}>
                Schedule
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => workspace.runLifecycleAction("published")}>
                Publish
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => workspace.runLifecycleAction("archived")}>
                Archive
              </Button>
            </>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

function EssentialsSection({ workspace }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Editorial Essentials</Typography>
        <TextField
          label="Title"
          value={workspace.draft.title}
          onChange={(event) => workspace.changeField("title", event.target.value)}
        />
        <TextField
          label="Subtitle"
          value={workspace.draft.subtitle}
          onChange={(event) => workspace.changeField("subtitle", event.target.value)}
        />
        <TextField
          label="Excerpt"
          value={workspace.draft.excerpt}
          onChange={(event) => workspace.changeField("excerpt", event.target.value)}
          multiline
          minRows={3}
        />
        <TextField
          label="Body (Sanitized HTML)"
          value={workspace.draft.body}
          onChange={(event) => workspace.changeField("body", event.target.value)}
          multiline
          minRows={12}
        />
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Status"
            value={workspace.draft.status}
            onChange={(event) => workspace.changeField("status", event.target.value)}
            sx={{ minWidth: 180 }}
          >
            {["draft", "in-review", "scheduled", "published", "archived"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Format"
            value={workspace.draft.format}
            onChange={(event) => workspace.changeField("format", event.target.value)}
            sx={{ minWidth: 180 }}
          >
            {["article", "news", "opinion", "tutorial", "review"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Scheduled On"
            value={workspace.draft.scheduledOn}
            onChange={(event) => workspace.changeField("scheduledOn", event.target.value)}
            placeholder="2026-03-08T12:00:00.000Z"
          />
          <TextField
            label="Locale"
            value={workspace.draft.locale}
            onChange={(event) => workspace.changeField("locale", event.target.value)}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}

function AssignmentSection({ workspace, authorOptions, categoryOptions, tagOptions }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Assignment + Taxonomy</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Primary Author"
            value={workspace.draft.primaryAuthorId}
            onChange={(event) => workspace.changeField("primaryAuthorId", event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {authorOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Created By"
            value={workspace.draft.createdByAuthorId}
            onChange={(event) => workspace.changeField("createdByAuthorId", event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {authorOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Updated By"
            value={workspace.draft.updatedByAuthorId}
            onChange={(event) => workspace.changeField("updatedByAuthorId", event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {authorOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <ToggleChipField
          label="Co-Authors"
          options={authorOptions}
          values={workspace.draft.coAuthorIds}
          onToggle={(value) => workspace.toggleFieldValue("coAuthorIds", value)}
        />
        <ToggleChipField
          label="Categories"
          options={categoryOptions}
          values={workspace.draft.categoryIds}
          onToggle={(value) => workspace.toggleFieldValue("categoryIds", value)}
        />
        <ToggleChipField
          label="Tags"
          options={tagOptions}
          values={workspace.draft.tagIds}
          onToggle={(value) => workspace.toggleFieldValue("tagIds", value)}
        />
      </Stack>
    </Paper>
  );
}

function MediaSection({ workspace, mediaOptions }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Media + Comment Policy</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Featured Media"
            value={workspace.draft.featuredMediaId}
            onChange={(event) => workspace.changeField("featuredMediaId", event.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="">None</MenuItem>
            {mediaOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="OpenGraph Image"
            value={workspace.draft.ogImageMediaId}
            onChange={(event) => workspace.changeField("ogImageMediaId", event.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="">None</MenuItem>
            {mediaOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Comment Policy"
            value={workspace.draft.commentPolicy}
            onChange={(event) => workspace.changeField("commentPolicy", event.target.value)}
            sx={{ minWidth: 220 }}
          >
            {["open", "registered-only", "closed"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <FormControlLabel
          control={
            <Switch
              checked={workspace.draft.allowComments}
              onChange={(event) => workspace.changeField("allowComments", event.target.checked)}
            />
          }
          label="Allow Comments"
        />
        <ToggleChipField
          label="Gallery Media"
          options={mediaOptions}
          values={workspace.draft.galleryMediaIds}
          onToggle={(value) => workspace.toggleFieldValue("galleryMediaIds", value)}
        />
      </Stack>
    </Paper>
  );
}

function SeoFieldsSection({ workspace }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">SEO Metadata</Typography>
        <TextField
          label="Canonical URL"
          value={workspace.draft.canonicalUrl}
          onChange={(event) => workspace.changeField("canonicalUrl", event.target.value)}
        />
        <TextField
          label="SEO Title"
          value={workspace.draft.seoTitle}
          onChange={(event) => workspace.changeField("seoTitle", event.target.value)}
        />
        <TextField
          label="SEO Description"
          value={workspace.draft.seoDescription}
          onChange={(event) => workspace.changeField("seoDescription", event.target.value)}
          multiline
          minRows={3}
        />
        <TextField
          label="OpenGraph Title"
          value={workspace.draft.ogTitle}
          onChange={(event) => workspace.changeField("ogTitle", event.target.value)}
        />
        <TextField
          label="OpenGraph Description"
          value={workspace.draft.ogDescription}
          onChange={(event) => workspace.changeField("ogDescription", event.target.value)}
          multiline
          minRows={3}
        />
      </Stack>
    </Paper>
  );
}

export function BlogContentEditorPanel({ workspace }) {
  const authorOptions = optionItems(workspace.referenceOptions, "blog-authors");
  const categoryOptions = optionItems(workspace.referenceOptions, "blog-categories");
  const tagOptions = optionItems(workspace.referenceOptions, "blog-tags");
  const mediaOptions = optionItems(workspace.referenceOptions, "media-items");

  return (
    <Stack spacing={2}>
      <EditorHeader workspace={workspace} />
      {workspace.saveState.errorMessage ? <Alert severity="error">{workspace.saveState.errorMessage}</Alert> : null}
      {workspace.saveState.successMessage ? <Alert severity="success">{workspace.saveState.successMessage}</Alert> : null}
      <EssentialsSection workspace={workspace} />
      <AssignmentSection
        workspace={workspace}
        authorOptions={authorOptions}
        categoryOptions={categoryOptions}
        tagOptions={tagOptions}
      />
      <MediaSection workspace={workspace} mediaOptions={mediaOptions} />
      <SeoFieldsSection workspace={workspace} />
      <SeoPreview draft={workspace.draft} mediaOptions={mediaOptions} />
    </Stack>
  );
}
