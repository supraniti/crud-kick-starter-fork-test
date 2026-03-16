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
import { memo, useMemo, useState } from "react";
import { SeoPreview, optionItems } from "./BlogContentPanels.jsx";
import { StableMultilineTextField } from "./StableMultilineTextField.jsx";
import { BlogContentDeploymentImpactPanel } from "./BlogContentDeploymentImpactPanel.jsx";
import { BlogContentRemoteProjectionPanel } from "./BlogContentRemoteProjectionPanel.jsx";
import { BlogContentAuthoringReadinessPanel } from "./BlogContentAuthoringReadinessPanel.jsx";

const ToggleChipField = memo(function ToggleChipField({ label, options, values, onToggle }) {
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
});

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
          Content
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
        <StableMultilineTextField
          label="Excerpt"
          value={workspace.draft.excerpt}
          fieldId="excerpt"
          onChangeField={workspace.changeField}
          minRows={3}
        />
        <StableMultilineTextField
          label="Body (Sanitized HTML)"
          value={workspace.draft.body}
          fieldId="body"
          onChangeField={workspace.changeField}
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

function AssignmentSectionComponent({
  authorOptions,
  categoryOptions,
  tagOptions,
  draft,
  changeField,
  toggleFieldValue
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Assignment + Taxonomy</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Primary Author"
            value={draft.primaryAuthorId}
            onChange={(event) => changeField("primaryAuthorId", event.target.value)}
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
            value={draft.createdByAuthorId}
            onChange={(event) => changeField("createdByAuthorId", event.target.value)}
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
            value={draft.updatedByAuthorId}
            onChange={(event) => changeField("updatedByAuthorId", event.target.value)}
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
          values={draft.coAuthorIds}
          onToggle={(value) => toggleFieldValue("coAuthorIds", value)}
        />
        <ToggleChipField
          label="Categories"
          options={categoryOptions}
          values={draft.categoryIds}
          onToggle={(value) => toggleFieldValue("categoryIds", value)}
        />
        <ToggleChipField
          label="Tags"
          options={tagOptions}
          values={draft.tagIds}
          onToggle={(value) => toggleFieldValue("tagIds", value)}
        />
      </Stack>
    </Paper>
  );
}

const AssignmentSection = memo(AssignmentSectionComponent, (previousProps, nextProps) => {
  const previousDraft = previousProps.draft;
  const nextDraft = nextProps.draft;
  return (
    previousProps.authorOptions === nextProps.authorOptions &&
    previousProps.categoryOptions === nextProps.categoryOptions &&
    previousProps.tagOptions === nextProps.tagOptions &&
    previousProps.changeField === nextProps.changeField &&
    previousProps.toggleFieldValue === nextProps.toggleFieldValue &&
    previousDraft.primaryAuthorId === nextDraft.primaryAuthorId &&
    previousDraft.createdByAuthorId === nextDraft.createdByAuthorId &&
    previousDraft.updatedByAuthorId === nextDraft.updatedByAuthorId &&
    previousDraft.coAuthorIds === nextDraft.coAuthorIds &&
    previousDraft.categoryIds === nextDraft.categoryIds &&
    previousDraft.tagIds === nextDraft.tagIds
  );
});

function MediaSectionComponent({ draft, mediaOptions, changeField, toggleFieldValue }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Media + Comment Policy</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Featured Media"
            value={draft.featuredMediaId}
            onChange={(event) => changeField("featuredMediaId", event.target.value)}
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
            value={draft.ogImageMediaId}
            onChange={(event) => changeField("ogImageMediaId", event.target.value)}
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
            value={draft.commentPolicy}
            onChange={(event) => changeField("commentPolicy", event.target.value)}
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
              checked={draft.allowComments}
              onChange={(event) => changeField("allowComments", event.target.checked)}
            />
          }
          label="Allow Comments"
        />
        <ToggleChipField
          label="Gallery Media"
          options={mediaOptions}
          values={draft.galleryMediaIds}
          onToggle={(value) => toggleFieldValue("galleryMediaIds", value)}
        />
      </Stack>
    </Paper>
  );
}

const MediaSection = memo(MediaSectionComponent, (previousProps, nextProps) => {
  const previousDraft = previousProps.draft;
  const nextDraft = nextProps.draft;
  return (
    previousProps.mediaOptions === nextProps.mediaOptions &&
    previousProps.changeField === nextProps.changeField &&
    previousProps.toggleFieldValue === nextProps.toggleFieldValue &&
    previousDraft.featuredMediaId === nextDraft.featuredMediaId &&
    previousDraft.ogImageMediaId === nextDraft.ogImageMediaId &&
    previousDraft.commentPolicy === nextDraft.commentPolicy &&
    previousDraft.allowComments === nextDraft.allowComments &&
    previousDraft.galleryMediaIds === nextDraft.galleryMediaIds
  );
});

function SeoFieldsSectionComponent({ draft, changeField }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Search + Social Defaults</Typography>
        <TextField
          label="Canonical URL"
          value={draft.canonicalUrl}
          onChange={(event) => changeField("canonicalUrl", event.target.value)}
        />
        <TextField
          label="SEO Title"
          value={draft.seoTitle}
          onChange={(event) => changeField("seoTitle", event.target.value)}
        />
        <StableMultilineTextField
          label="SEO Description"
          value={draft.seoDescription}
          fieldId="seoDescription"
          onChangeField={changeField}
          minRows={3}
        />
        <TextField
          label="OpenGraph Title"
          value={draft.ogTitle}
          onChange={(event) => changeField("ogTitle", event.target.value)}
        />
        <StableMultilineTextField
          label="OpenGraph Description"
          value={draft.ogDescription}
          fieldId="ogDescription"
          onChangeField={changeField}
          minRows={3}
        />
      </Stack>
    </Paper>
  );
}

const SeoFieldsSection = memo(SeoFieldsSectionComponent, (previousProps, nextProps) => {
  const previousDraft = previousProps.draft;
  const nextDraft = nextProps.draft;
  return (
    previousProps.changeField === nextProps.changeField &&
    previousDraft.canonicalUrl === nextDraft.canonicalUrl &&
    previousDraft.seoTitle === nextDraft.seoTitle &&
    previousDraft.seoDescription === nextDraft.seoDescription &&
    previousDraft.ogTitle === nextDraft.ogTitle &&
    previousDraft.ogDescription === nextDraft.ogDescription
  );
});

function RemotePublicationSection({ open, onToggle, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Remote Publication</Typography>
            <Typography variant="body2" color="text.secondary">
              Write and revise the post here first. Expand this section only when you need to inspect or drive the secondary Firestore publication flow from the Posts desk.
            </Typography>
          </Stack>
          <Button variant="outlined" onClick={onToggle}>
            {open ? "Hide Remote Publication" : "Show Remote Publication"}
          </Button>
        </Stack>
        {!open ? (
          <Alert severity="info">
            Remote publication is secondary to authoring. Release execution still belongs to Deployments.
          </Alert>
        ) : null}
        {open ? children : null}
      </Stack>
    </Paper>
  );
}

export function BlogContentEditorPanel({ workspace }) {
  const [remoteOpen, setRemoteOpen] = useState(false);
  const authorOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "blog-authors"),
    [workspace.referenceOptions]
  );
  const categoryOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "blog-categories"),
    [workspace.referenceOptions]
  );
  const tagOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "blog-tags"),
    [workspace.referenceOptions]
  );
  const mediaOptions = useMemo(
    () => optionItems(workspace.referenceOptions, "media-items"),
    [workspace.referenceOptions]
  );

  return (
    <Stack spacing={2}>
      <EditorHeader workspace={workspace} />
      <BlogContentDeploymentImpactPanel
        impactedTemplates={workspace.deploymentAwareness.impactedTemplates}
        loading={workspace.deploymentAwareness.state.loading}
        errorMessage={workspace.deploymentAwareness.state.errorMessage}
        onOpenPages={workspace.openPagesDesk}
      />
      <BlogContentAuthoringReadinessPanel
        draft={workspace.draft}
        authorOptions={authorOptions}
        categoryOptions={categoryOptions}
        tagOptions={tagOptions}
        mediaOptions={mediaOptions}
        deploymentAwareness={workspace.deploymentAwareness}
        onOpenAuthors={workspace.openAuthorsDesk}
        onOpenTaxonomies={workspace.openTaxonomiesDesk}
        onOpenMedia={workspace.openMediaDesk}
        onOpenPages={workspace.openPagesDesk}
      />
      <RemotePublicationSection open={remoteOpen} onToggle={() => setRemoteOpen((value) => !value)}>
        <BlogContentRemoteProjectionPanel
          latestRun={workspace.remoteProjectionLatestRun}
          moduleSettingsDomain={workspace.moduleSettingsDomain}
          onCompare={() =>
            workspace.remoteOpsSupport.compareTarget(
              workspace.moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? ""
            )
          }
          onExecute={() =>
            workspace.remoteOpsSupport.executeTarget(
              workspace.moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? ""
            )
          }
          onOpenRemoteOps={workspace.openRemoteOpsTarget}
          onSaveSettings={workspace.saveModuleSettings}
          onValidate={() =>
            workspace.remoteOpsSupport.validateTarget(
              workspace.moduleSettingsDomain?.moduleSettingsState?.draftValues?.remoteProjectionTargetProfileId ?? ""
            )
          }
          post={workspace.selectedPost}
          procedureState={workspace.remoteOpsSupport.procedureState}
          selectedTarget={workspace.remoteProjectionTarget}
          targetOptions={workspace.remoteProjectionTargets}
        />
      </RemotePublicationSection>
      {workspace.saveState.errorMessage ? <Alert severity="error">{workspace.saveState.errorMessage}</Alert> : null}
      {workspace.saveState.successMessage ? <Alert severity="success">{workspace.saveState.successMessage}</Alert> : null}
      <EssentialsSection workspace={workspace} />
      <AssignmentSection
        authorOptions={authorOptions}
        categoryOptions={categoryOptions}
        tagOptions={tagOptions}
        draft={workspace.draft}
        changeField={workspace.changeField}
        toggleFieldValue={workspace.toggleFieldValue}
      />
      <MediaSection
        draft={workspace.draft}
        mediaOptions={mediaOptions}
        changeField={workspace.changeField}
        toggleFieldValue={workspace.toggleFieldValue}
      />
      <SeoFieldsSection draft={workspace.draft} changeField={workspace.changeField} />
      <SeoPreview draft={workspace.draft} mediaOptions={mediaOptions} />
    </Stack>
  );
}
