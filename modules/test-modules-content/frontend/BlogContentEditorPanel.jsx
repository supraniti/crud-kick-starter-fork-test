import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { fetchReferenceCollectionItems } from "../../../frontend/src/api/reference.js";
import { buildMediaContentUrl, uploadMediaAsset } from "../../test-modules-media-manager/frontend/media-manager-api.js";
import { computeHealth } from "./publication-support.js";
import { SeoPreview, optionItems, resolveOptionLabel } from "./BlogContentPanels.jsx";
import { TranslatableMultilineTextField } from "../../test-modules-translations/frontend/TranslatableMultilineTextField.jsx";
import { TranslatableTextField } from "../../test-modules-translations/frontend/TranslatableTextField.jsx";
import { useTranslationFieldSupport } from "../../test-modules-translations/frontend/useTranslationFieldSupport.js";

const SECTION_LABELS = {
  story: "Story",
  organize: "Organize",
  media: "Media",
  seo: "SEO"
};

const SECTION_INTROS = {
  story: {
    kicker: "Writing Desk",
    description:
      "Shape the story itself here. Title, summary, and body stay together so writing remains the center of gravity."
  },
  organize: {
    kicker: "Ownership And Taxonomy",
    description:
      "Assign the people and classification that determine where this story belongs and who stands behind it."
  },
  media: {
    kicker: "Story Media",
    description:
      "Choose the images readers will see, keep gallery assets close, and upload what is missing without leaving the post."
  },
  seo: {
    kicker: "Search And Social",
    description:
      "Tune how the story appears in search results and social cards, then inspect the preview before it goes live."
  }
};

const HEALTH_LABELS = {
  title: "Title missing",
  excerpt: "Excerpt missing",
  body: "Body too short",
  seo: "SEO incomplete",
  primaryAuthor: "Primary author missing",
  categories: "Category missing",
  featuredMedia: "Featured image missing"
};

const ToggleChipField = memo(function ToggleChipField({ label, options, values, onToggle }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{label}</Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, contentBase64 = ""] = result.split(",", 2);
      resolve(contentBase64);
    };
    reader.onerror = () => reject(new Error("Failed reading file"));
    reader.readAsDataURL(file);
  });
}

function sortMediaItems(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left?.updatedOn ?? left?.createdOn ?? "") || 0;
    const rightTime = Date.parse(right?.updatedOn ?? right?.createdOn ?? "") || 0;
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return `${left?.displayName ?? ""}`.localeCompare(`${right?.displayName ?? ""}`);
  });
}

function countWords(text = "") {
  return String(text)
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function estimateReadTime(wordCount) {
  if (!wordCount) {
    return 0;
  }
  return Math.max(1, Math.round(wordCount / 220));
}

function usePostMediaGalleryState(referenceOptions) {
  const seedItems = Array.isArray(referenceOptions?.["media-items"]?.items)
    ? referenceOptions["media-items"].items
    : [];
  const [items, setItems] = useState(() => sortMediaItems(seedItems));
  const [galleryState, setGalleryState] = useState({
    open: false,
    loading: false,
    uploading: false,
    errorMessage: null,
    mode: "single",
    fieldId: "",
    title: "Choose Media"
  });

  useEffect(() => {
    if (seedItems.length === 0) {
      return;
    }
    setItems(sortMediaItems(seedItems));
  }, [seedItems]);

  const refreshItems = useCallback(async () => {
    setGalleryState((previous) => ({
      ...previous,
      loading: true,
      errorMessage: null
    }));
    try {
      const payload = await fetchReferenceCollectionItems({
        collectionId: "media-items",
        offset: 0,
        limit: 100,
        search: ""
      });
      if (!payload?.ok) {
        throw new Error(payload?.error?.message ?? "Failed to load media gallery");
      }
      setItems(sortMediaItems(payload.items ?? []));
      setGalleryState((previous) => ({
        ...previous,
        loading: false,
        errorMessage: null
      }));
    } catch (error) {
      setGalleryState((previous) => ({
        ...previous,
        loading: false,
        errorMessage: error?.message ?? "Failed to load media gallery"
      }));
    }
  }, []);

  const openGallery = useCallback(
    async ({ fieldId, mode = "single", title }) => {
      setGalleryState((previous) => ({
        ...previous,
        open: true,
        fieldId,
        mode,
        title
      }));
      if (items.length === 0) {
        await refreshItems();
      }
    },
    [items.length, refreshItems]
  );

  const closeGallery = useCallback(() => {
    setGalleryState((previous) => ({
      ...previous,
      open: false,
      errorMessage: null
    }));
  }, []);

  const uploadFile = useCallback(async (file) => {
    if (!file) {
      return null;
    }
    setGalleryState((previous) => ({
      ...previous,
      uploading: true,
      errorMessage: null
    }));
    try {
      const payload = await uploadMediaAsset({
        fileName: file.name,
        mimeType: file.type,
        contentBase64: await fileToBase64(file)
      });
      if (payload?.ok !== true || !payload?.item) {
        throw new Error(payload?.error?.message ?? "Upload failed");
      }
      setItems((previous) =>
        sortMediaItems([payload.item, ...previous.filter((item) => item.id !== payload.item.id)])
      );
      setGalleryState((previous) => ({
        ...previous,
        uploading: false,
        errorMessage: null
      }));
      return payload.item;
    } catch (error) {
      setGalleryState((previous) => ({
        ...previous,
        uploading: false,
        errorMessage: error?.message ?? "Upload failed"
      }));
      return null;
    }
  }, []);

  return {
    items,
    galleryState,
    openGallery,
    closeGallery,
    refreshItems,
    uploadFile
  };
}

function MediaPickerCard({ label, item, countLabel = "", onOpen, onClear }) {
  const previewUrl = item ? buildMediaContentUrl(item.id, item.updatedOn) : "";
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.25}>
        <Stack spacing={0.35}>
          <Typography variant="subtitle2">{label}</Typography>
          {countLabel ? (
            <Typography variant="caption" color="text.secondary">
              {countLabel}
            </Typography>
          ) : null}
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }}>
          <Avatar src={previewUrl || undefined} variant="rounded" sx={{ width: 72, height: 72, bgcolor: "grey.100" }} />
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary">
              {item?.displayName ?? "No media selected"}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button size="small" variant="outlined" onClick={onOpen}>
                Choose
              </Button>
              {item ? (
                <Button size="small" variant="text" color="inherit" onClick={onClear}>
                  Clear
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

function MediaGalleryCard({ item, selected, selectedCount, mode, onSelect }) {
  return (
    <Card variant="outlined" sx={{ borderColor: selected ? "primary.main" : "divider" }}>
      <CardActionArea onClick={() => onSelect(item.id)}>
        <Box sx={{ height: 128, overflow: "hidden", bgcolor: "grey.100" }}>
          <Box
            component="img"
            src={buildMediaContentUrl(item.id, item.updatedOn)}
            alt={item.altText || item.displayName}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Box>
        <CardContent>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" noWrap>
              {item.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {item.altText || item.category || "library"}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {selected ? (
                <Chip
                  size="small"
                  color="primary"
                  label={mode === "multi" ? "Included" : "Selected"}
                />
              ) : null}
              {mode === "multi" && selectedCount > 0 ? (
                <Chip size="small" variant="outlined" label={`${selectedCount} selected`} />
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function PostMediaPickerDialog({
  galleryState,
  items,
  selectedIds,
  onClose,
  onRefresh,
  onUploadFiles,
  onSelect
}) {
  return (
    <Dialog open={galleryState.open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{galleryState.title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
          >
            <Typography variant="body2" color="text.secondary">
              Browse the media library visually or upload a missing image without leaving the post flow.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button component="label" variant="outlined" disabled={galleryState.uploading}>
                {galleryState.uploading ? "Uploading..." : "Upload Image"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) => onUploadFiles(event.target.files)}
                />
              </Button>
              <Button variant="text" onClick={onRefresh} disabled={galleryState.loading}>
                Refresh
              </Button>
            </Stack>
          </Stack>
          {galleryState.errorMessage ? <Alert severity="error">{galleryState.errorMessage}</Alert> : null}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
              gap: 2
            }}
          >
            {items.map((item) => (
              <MediaGalleryCard
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                selectedCount={selectedIds.length}
                mode={galleryState.mode}
                onSelect={onSelect}
              />
            ))}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function EditorHeader({ workspace }) {
  const canOpenPageTemplate = Boolean(workspace.selectedPostId) && typeof workspace.openPagesDesk === "function";
  const sectionIntro = SECTION_INTROS[workspace.activeSection] ?? SECTION_INTROS.story;
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
            <Typography variant="overline" color="text.secondary">
              {sectionIntro.kicker}
            </Typography>
            <Typography variant="h5">{workspace.draft.title || "Untitled post"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {sectionIntro.description}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" onClick={() => workspace.persistPost()}>
              {workspace.saveState.saving ? "Saving..." : "Save Post"}
            </Button>
            {workspace.selectedPostId ? (
              <>
                <Button variant="outlined" onClick={() => workspace.runLifecycleAction("in-review")}>
                  Submit For Review
                </Button>
                <Button variant="outlined" onClick={() => workspace.runLifecycleAction("published")}>
                  Publish
                </Button>
              </>
            ) : null}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip
            size="small"
            label={workspace.selectedPostId ? "Saved In CMS" : "Draft Not Saved"}
            color={workspace.selectedPostId ? "success" : "default"}
          />
          <Chip size="small" label={`Status ${workspace.draft.status}`} variant="outlined" />
          <Chip size="small" label={`Focus ${SECTION_LABELS[workspace.activeSection] || "Writing"}`} variant="outlined" />
          {workspace.selectedPostDeploymentState ? (
            <Chip size="small" label={`Live ${workspace.selectedPostDeploymentState.label}`} variant="outlined" />
          ) : null}
          {workspace.primaryPublicationOutput?.publicUrl ? (
            <Button
              component="a"
              href={workspace.primaryPublicationOutput.publicUrl}
              target="_blank"
              rel="noreferrer"
              variant="text"
              size="small"
            >
              Open Live Page
            </Button>
          ) : null}
          {canOpenPageTemplate ? (
            <Button variant="text" size="small" onClick={workspace.openPagesDesk}>
              Open Page Template
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}

function WritingCanvas({ draft, changeField }) {
  const wordCount = draft.wordCount || countWords(draft.body);
  const readTimeMinutes = draft.readTimeMinutes || estimateReadTime(wordCount);
  const buildTranslationField = useTranslationFieldSupport({
    entityType: "blog-posts",
    entityId: draft.id ?? null,
    entityLabel: draft.title ?? draft.slug ?? "Post",
    sourceLocale: draft.locale ?? "en-US"
  });

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Stack spacing={0.35}>
            <Typography variant="h6">Write The Post</Typography>
            <Typography variant="body2" color="text.secondary">
              Keep the story, summary, and body in one calm composition surface.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`${wordCount} words`} variant="outlined" />
            <Chip size="small" label={`${readTimeMinutes} min read`} variant="outlined" />
          </Stack>
        </Stack>
        <TranslatableTextField
          label="Title"
          value={draft.title}
          onChange={(event) => changeField("title", event.target.value)}
          size="small"
          translationField={buildTranslationField({
            fieldPath: "title",
            fieldLabel: "Title",
            sourceValue: draft.title ?? "",
            valueKind: "text"
          })}
        />
        <TranslatableTextField
          label="Subtitle"
          value={draft.subtitle}
          onChange={(event) => changeField("subtitle", event.target.value)}
          size="small"
          translationField={buildTranslationField({
            fieldPath: "subtitle",
            fieldLabel: "Subtitle",
            sourceValue: draft.subtitle ?? "",
            valueKind: "text"
          })}
        />
        <TranslatableMultilineTextField
          label="Excerpt"
          value={draft.excerpt}
          fieldId="excerpt"
          onChangeField={changeField}
          minRows={4}
          translationField={buildTranslationField({
            fieldPath: "excerpt",
            fieldLabel: "Excerpt",
            sourceValue: draft.excerpt ?? "",
            valueKind: "rich-text"
          })}
        />
        <TranslatableMultilineTextField
          label="Body"
          value={draft.body}
          fieldId="body"
          onChangeField={changeField}
          minRows={18}
          translationField={buildTranslationField({
            fieldPath: "body",
            fieldLabel: "Body",
            sourceValue: draft.body ?? "",
            valueKind: "rich-text"
          })}
        />
      </Stack>
    </Paper>
  );
}

function resolveSelectedLabels(values = [], options = []) {
  const labelMap = new Map(options.map((option) => [option.id, option.label]));
  return (Array.isArray(values) ? values : []).map((value) => labelMap.get(value)).filter(Boolean);
}

function OrganizeWorkspace({ draft, authorOptions, categoryOptions, tagOptions, structurePanel }) {
  const coAuthorLabels = resolveSelectedLabels(draft.coAuthorIds, authorOptions);
  const categoryLabels = resolveSelectedLabels(draft.categoryIds, categoryOptions);
  const tagLabels = resolveSelectedLabels(draft.tagIds, tagOptions);
  const primaryAuthorLabel = resolveOptionLabel(authorOptions, draft.primaryAuthorId || "Unassigned");

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          xl: "minmax(0, 1.2fr) minmax(280px, 0.8fr)"
        },
        alignItems: "start"
      }}
    >
      {structurePanel}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Current Story Shape</Typography>
          <Typography variant="body2" color="text.secondary">
            Use this panel to confirm that the story has the right owner and lands in the right editorial buckets.
          </Typography>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Primary author</Typography>
            <Chip size="small" label={primaryAuthorLabel} variant="outlined" />
          </Stack>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Co-authors</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {coAuthorLabels.length > 0 ? (
                coAuthorLabels.map((label) => <Chip key={label} size="small" label={label} variant="outlined" />)
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No co-authors selected.
                </Typography>
              )}
            </Stack>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Categories</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {categoryLabels.length > 0 ? (
                categoryLabels.map((label) => <Chip key={label} size="small" label={label} variant="outlined" />)
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No categories selected yet.
                </Typography>
              )}
            </Stack>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Tags</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {tagLabels.length > 0 ? (
                tagLabels.map((label) => <Chip key={label} size="small" label={label} variant="outlined" />)
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tags selected yet.
                </Typography>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

function MediaWorkspace({ draft, mediaOptions, mediaPanel }) {
  const mediaItemsById = new Map(mediaOptions.map((option) => [option.id, option.item]));
  const featuredItem = mediaItemsById.get(draft.featuredMediaId) ?? null;
  const socialItem = mediaItemsById.get(draft.ogImageMediaId) ?? null;
  const galleryItems = (Array.isArray(draft.galleryMediaIds) ? draft.galleryMediaIds : [])
    .map((itemId) => mediaItemsById.get(itemId))
    .filter(Boolean);

  const previewImage = featuredItem ?? socialItem ?? galleryItems[0] ?? null;

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          xl: "minmax(0, 1.15fr) minmax(300px, 0.85fr)"
        },
        alignItems: "start"
      }}
    >
      {mediaPanel}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Visual Outcome</Typography>
          <Typography variant="body2" color="text.secondary">
            Check the main image, the social fallback, and whether the story gallery is empty before publishing.
          </Typography>
          <Box
            sx={{
              borderRadius: 1.5,
              overflow: "hidden",
              border: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: "grey.100",
              minHeight: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {previewImage ? (
              <Box
                component="img"
                src={buildMediaContentUrl(previewImage.id, previewImage.updatedOn)}
                alt={previewImage.altText || previewImage.displayName}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                No visual selected yet.
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              size="small"
              label={`Featured ${featuredItem?.displayName ?? "Missing"}`}
              color={featuredItem ? "success" : "warning"}
              variant={featuredItem ? "filled" : "outlined"}
            />
            <Chip
              size="small"
              label={`Social ${socialItem?.displayName ?? "Fallback / Missing"}`}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`Gallery ${galleryItems.length} item${galleryItems.length === 1 ? "" : "s"}`}
              variant="outlined"
            />
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

function SeoWorkspace({ seoPanel }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          xl: "minmax(0, 1fr)"
        },
        alignItems: "start"
      }}
    >
      {seoPanel}
    </Box>
  );
}

function PublishingRail({ draft, changeField, primaryPublicationOutput, selectedPostDeploymentState }) {
  const healthIssues = computeHealth(draft);

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Story Settings</Typography>
          <Stack spacing={1.5}>
            <TextField
              select
              size="small"
              label="Status"
              value={draft.status}
              onChange={(event) => changeField("status", event.target.value)}
            >
              {["draft", "in-review", "scheduled", "published", "archived"].map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Format"
              value={draft.format}
              onChange={(event) => changeField("format", event.target.value)}
            >
              {["article", "news", "opinion", "tutorial", "review"].map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Scheduled On"
              value={draft.scheduledOn}
              onChange={(event) => changeField("scheduledOn", event.target.value)}
              placeholder="2026-03-08T12:00:00.000Z"
            />
            <TextField
              size="small"
              label="Locale"
              value={draft.locale}
              onChange={(event) => changeField("locale", event.target.value)}
            />
            <TextField
              select
              size="small"
              label="Comment Policy"
              value={draft.commentPolicy}
              onChange={(event) => changeField("commentPolicy", event.target.value)}
            >
              {["open", "registered-only", "closed"].map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={draft.allowComments}
                  onChange={(event) => changeField("allowComments", event.target.checked)}
                />
              }
              label="Allow comments"
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <Typography variant="h6">Readiness</Typography>
          {healthIssues.length > 0 ? (
            <Alert severity="warning">
              {healthIssues.length} blocker{healthIssues.length === 1 ? "" : "s"} still need attention.
            </Alert>
          ) : (
            <Alert severity="success">This draft clears the baseline writing checks.</Alert>
          )}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {healthIssues.length > 0 ? healthIssues.map((issue) => <Chip key={issue} size="small" label={HEALTH_LABELS[issue] || issue} variant="outlined" />) : <Chip size="small" color="success" label="Ready for editorial handoff" />}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h6">Live Result</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedPostDeploymentState?.label ? `Current live posture: ${selectedPostDeploymentState.label}.` : "No public output has been linked yet."}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {primaryPublicationOutput?.publicUrl || primaryPublicationOutput?.localArtifactPath || "No linked public artifact yet."}
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}

function StructureRail({ draft, changeField, toggleFieldValue, authorOptions, categoryOptions, tagOptions, onOpenAuthors, onOpenTaxonomies }) {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
            <Typography variant="h6">Ownership And Taxonomy</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {typeof onOpenAuthors === "function" ? (
                <Button variant="text" size="small" onClick={onOpenAuthors}>
                  Open Authors
                </Button>
              ) : null}
              {typeof onOpenTaxonomies === "function" ? (
                <Button variant="text" size="small" onClick={onOpenTaxonomies}>
                  Open Taxonomies
                </Button>
              ) : null}
            </Stack>
          </Stack>
          <TextField
            select
            size="small"
            label="Primary Author"
            value={draft.primaryAuthorId}
            onChange={(event) => changeField("primaryAuthorId", event.target.value)}
          >
            {authorOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Created By"
            value={draft.createdByAuthorId}
            onChange={(event) => changeField("createdByAuthorId", event.target.value)}
          >
            {authorOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Updated By"
            value={draft.updatedByAuthorId}
            onChange={(event) => changeField("updatedByAuthorId", event.target.value)}
          >
            {authorOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <ToggleChipField
            label="Co-authors"
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
    </Stack>
  );
}

function MediaRail({ draft, mediaOptions, changeField, toggleFieldValue, onOpenMedia }) {
  const mediaItemsById = useMemo(
    () => new Map(mediaOptions.map((option) => [option.id, option.item])),
    [mediaOptions]
  );
  const mediaGallery = usePostMediaGalleryState({
    "media-items": { items: mediaOptions.map((option) => option.item) }
  });
  const featuredItem = mediaItemsById.get(draft.featuredMediaId) ?? null;
  const socialItem = mediaItemsById.get(draft.ogImageMediaId) ?? null;
  const selectedGalleryItems = (Array.isArray(draft.galleryMediaIds) ? draft.galleryMediaIds : [])
    .map((itemId) => mediaItemsById.get(itemId))
    .filter(Boolean);

  const handleSelectMedia = useCallback(
    (mediaItemId) => {
      const fieldId = mediaGallery.galleryState.fieldId;
      if (fieldId === "galleryMediaIds") {
        toggleFieldValue(fieldId, mediaItemId);
        return;
      }
      changeField(fieldId, mediaItemId);
      mediaGallery.closeGallery();
    },
    [changeField, mediaGallery, toggleFieldValue]
  );

  const handleUploadFiles = useCallback(
    async (files) => {
      const file = Array.isArray(files) ? files[0] : files?.[0];
      if (!file) {
        return;
      }
      const uploadedItem = await mediaGallery.uploadFile(file);
      if (!uploadedItem) {
        return;
      }
      const fieldId = mediaGallery.galleryState.fieldId;
      if (fieldId === "galleryMediaIds") {
        toggleFieldValue(fieldId, uploadedItem.id);
        return;
      }
      changeField(fieldId, uploadedItem.id);
      mediaGallery.closeGallery();
    },
    [changeField, mediaGallery, toggleFieldValue]
  );

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
            <Typography variant="h6">Media</Typography>
            {typeof onOpenMedia === "function" ? (
              <Button variant="text" size="small" onClick={onOpenMedia}>
                Open Media Library
              </Button>
            ) : null}
          </Stack>
          <MediaPickerCard
            label="Featured Image"
            item={featuredItem}
            onOpen={() => mediaGallery.openGallery({ fieldId: "featuredMediaId", mode: "single", title: "Choose Featured Image" })}
            onClear={() => changeField("featuredMediaId", "")}
          />
          <MediaPickerCard
            label="Social Image"
            item={socialItem}
            onOpen={() => mediaGallery.openGallery({ fieldId: "ogImageMediaId", mode: "single", title: "Choose Social Image" })}
            onClear={() => changeField("ogImageMediaId", "")}
          />
          <MediaPickerCard
            label="Gallery Media"
            item={selectedGalleryItems[0] ?? null}
            countLabel={`${selectedGalleryItems.length} selected`}
            onOpen={() => mediaGallery.openGallery({ fieldId: "galleryMediaIds", mode: "multi", title: "Manage Gallery Media" })}
            onClear={() => changeField("galleryMediaIds", [])}
          />
        </Stack>
      </Paper>
      <PostMediaPickerDialog
        galleryState={mediaGallery.galleryState}
        items={mediaGallery.items}
        selectedIds={
          mediaGallery.galleryState.fieldId === "galleryMediaIds"
            ? draft.galleryMediaIds
            : [draft[mediaGallery.galleryState.fieldId] ?? ""].filter(Boolean)
        }
        onClose={mediaGallery.closeGallery}
        onRefresh={mediaGallery.refreshItems}
        onUploadFiles={handleUploadFiles}
        onSelect={handleSelectMedia}
      />
    </Stack>
  );
}

function SeoRail({ draft, changeField, mediaOptions }) {
  const buildTranslationField = useTranslationFieldSupport({
    entityType: "blog-posts",
    entityId: draft.id ?? null,
    entityLabel: draft.title ?? draft.slug ?? "Post",
    sourceLocale: draft.locale ?? "en-US"
  });

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Search And Social</Typography>
          <TextField
            size="small"
            label="Canonical URL"
            value={draft.canonicalUrl}
            onChange={(event) => changeField("canonicalUrl", event.target.value)}
          />
          <TranslatableTextField
            size="small"
            label="SEO Title"
            value={draft.seoTitle}
            onChange={(event) => changeField("seoTitle", event.target.value)}
            translationField={buildTranslationField({
              fieldPath: "seoTitle",
              fieldLabel: "SEO Title",
              sourceValue: draft.seoTitle ?? "",
              valueKind: "text"
            })}
          />
          <TranslatableMultilineTextField
            label="SEO Description"
            value={draft.seoDescription}
            fieldId="seoDescription"
            onChangeField={changeField}
            minRows={3}
            translationField={buildTranslationField({
              fieldPath: "seoDescription",
              fieldLabel: "SEO Description",
              sourceValue: draft.seoDescription ?? "",
              valueKind: "rich-text"
            })}
          />
          <TranslatableTextField
            size="small"
            label="OpenGraph Title"
            value={draft.ogTitle}
            onChange={(event) => changeField("ogTitle", event.target.value)}
            translationField={buildTranslationField({
              fieldPath: "ogTitle",
              fieldLabel: "OpenGraph Title",
              sourceValue: draft.ogTitle ?? "",
              valueKind: "text"
            })}
          />
          <TranslatableMultilineTextField
            label="OpenGraph Description"
            value={draft.ogDescription}
            fieldId="ogDescription"
            onChangeField={changeField}
            minRows={3}
            translationField={buildTranslationField({
              fieldPath: "ogDescription",
              fieldLabel: "OpenGraph Description",
              sourceValue: draft.ogDescription ?? "",
              valueKind: "rich-text"
            })}
          />
        </Stack>
      </Paper>
      <SeoPreview draft={draft} mediaOptions={mediaOptions} />
    </Stack>
  );
}

export function BlogContentEditorPanel({
  workspace,
  activeSection = "story",
  onChangeSection = null,
  hideSectionTabs = false
}) {
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
  const storySupportPanel = (
    <PublishingRail
      draft={workspace.draft}
      changeField={workspace.changeField}
      primaryPublicationOutput={workspace.primaryPublicationOutput}
      selectedPostDeploymentState={workspace.selectedPostDeploymentState}
    />
  );
  const organizePanel = (
    <StructureRail
      draft={workspace.draft}
      changeField={workspace.changeField}
      toggleFieldValue={workspace.toggleFieldValue}
      authorOptions={authorOptions}
      categoryOptions={categoryOptions}
      tagOptions={tagOptions}
      onOpenAuthors={workspace.openAuthorsDesk}
      onOpenTaxonomies={workspace.openTaxonomiesDesk}
    />
  );
  const mediaPanel = (
    <MediaRail
      draft={workspace.draft}
      mediaOptions={mediaOptions}
      changeField={workspace.changeField}
      toggleFieldValue={workspace.toggleFieldValue}
      onOpenMedia={workspace.openMediaDesk}
    />
  );
  const seoPanel = (
    <SeoRail draft={workspace.draft} changeField={workspace.changeField} mediaOptions={mediaOptions} />
  );

  return (
    <Stack spacing={2}>
      <EditorHeader workspace={{ ...workspace, activeSection }} />
      {workspace.saveState.errorMessage ? <Alert severity="error">{workspace.saveState.errorMessage}</Alert> : null}
      {workspace.saveState.successMessage ? <Alert severity="success">{workspace.saveState.successMessage}</Alert> : null}
      {hideSectionTabs ? null : (
        <Paper variant="outlined" sx={{ px: 1.5 }}>
          <Tabs
            value={activeSection}
            onChange={(_, nextValue) => onChangeSection?.(nextValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab value="story" label="Story" />
            <Tab value="organize" label="Organize" />
            <Tab value="media" label="Media" />
            <Tab value="seo" label="SEO" />
          </Tabs>
        </Paper>
      )}

      {activeSection === "story" ? (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              xl: "minmax(0, 1.6fr) minmax(340px, 0.95fr)"
            },
            alignItems: "start"
          }}
        >
          <WritingCanvas draft={workspace.draft} changeField={workspace.changeField} />
          {storySupportPanel}
        </Box>
      ) : null}

      {activeSection === "organize" ? (
        <OrganizeWorkspace
          draft={workspace.draft}
          authorOptions={authorOptions}
          categoryOptions={categoryOptions}
          tagOptions={tagOptions}
          structurePanel={organizePanel}
        />
      ) : null}

      {activeSection === "media" ? (
        <MediaWorkspace draft={workspace.draft} mediaOptions={mediaOptions} mediaPanel={mediaPanel} />
      ) : null}

      {activeSection === "seo" ? <SeoWorkspace seoPanel={seoPanel} /> : null}
    </Stack>
  );
}
