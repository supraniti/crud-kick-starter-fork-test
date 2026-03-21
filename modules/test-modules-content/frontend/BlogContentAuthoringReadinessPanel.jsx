import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { computeHealth } from "./publication-support.js";
import { resolveOptionLabel } from "./BlogContentPanels.jsx";

function createStatusChip(label, ready) {
  return (
    <Chip
      size="small"
      label={label}
      color={ready ? "success" : "warning"}
      variant={ready ? "filled" : "outlined"}
    />
  );
}

function resolveListLabels(values = [], options = []) {
  return Array.isArray(values) && values.length > 0
    ? values.map((value) => resolveOptionLabel(options, value)).join(", ")
    : "None selected";
}

export function BlogContentAuthoringReadinessPanel({
  draft,
  authorOptions,
  categoryOptions,
  tagOptions,
  mediaOptions,
  deploymentAwareness,
  onOpenAuthors,
  onOpenTaxonomies,
  onOpenMedia,
  onOpenPages
}) {
  const healthIssues = computeHealth(draft);
  const hasPrimaryAuthor = typeof draft?.primaryAuthorId === "string" && draft.primaryAuthorId.length > 0;
  const hasCategories = Array.isArray(draft?.categoryIds) && draft.categoryIds.length > 0;
  const hasFeaturedMedia = typeof draft?.featuredMediaId === "string" && draft.featuredMediaId.length > 0;
  const hasSeo = !healthIssues.includes("seo");
  const hasBody = !healthIssues.includes("body");
  const impactedTemplates = deploymentAwareness?.impactedTemplates ?? [];
  const attentionCount = [
    !hasPrimaryAuthor,
    !hasCategories,
    !hasFeaturedMedia,
    !hasSeo,
    !hasBody
  ].filter(Boolean).length;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ md: "center" }}
        >
          <Stack spacing={0.25}>
            <Typography variant="h6">Before You Publish</Typography>
            <Typography variant="body2" color="text.secondary">
              These are the essentials this story still needs before publication feels complete.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="text" onClick={onOpenAuthors}>
              Authors
            </Button>
            <Button variant="text" onClick={onOpenTaxonomies}>
              Taxonomies
            </Button>
            <Button variant="text" onClick={onOpenMedia}>
              Media
            </Button>
            <Button variant="text" onClick={onOpenPages}>
              Pages
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {createStatusChip(hasPrimaryAuthor ? "Primary Author Ready" : "Primary Author Missing", hasPrimaryAuthor)}
          {createStatusChip(hasCategories ? "Categories Ready" : "Categories Missing", hasCategories)}
          {createStatusChip(hasFeaturedMedia ? "Featured Media Ready" : "Featured Media Missing", hasFeaturedMedia)}
          {createStatusChip(hasSeo ? "SEO Ready" : "SEO Incomplete", hasSeo)}
          {createStatusChip(hasBody ? "Body Length Ready" : "Body Too Short", hasBody)}
          <Chip size="small" label={`Impacted Pages ${impactedTemplates.length}`} variant="outlined" />
        </Stack>

        <Alert severity={attentionCount > 0 ? "warning" : "success"}>
          {attentionCount > 0
            ? `${attentionCount} essential area${attentionCount > 1 ? "s still need" : " still needs"} attention before this story is truly ready.`
            : "This story clears the baseline checks for author, taxonomy, media, SEO, and body length."}
        </Alert>

        <Stack spacing={0.75}>
          <Typography variant="body2" color="text.secondary">
            Primary author: {hasPrimaryAuthor ? resolveOptionLabel(authorOptions, draft.primaryAuthorId) : "Not assigned"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Categories: {resolveListLabels(draft.categoryIds, categoryOptions)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tags: {resolveListLabels(draft.tagIds, tagOptions)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Featured media: {hasFeaturedMedia ? resolveOptionLabel(mediaOptions, draft.featuredMediaId) : "None selected"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Social image: {draft.ogImageMediaId ? resolveOptionLabel(mediaOptions, draft.ogImageMediaId) : "Falls back to the featured image or none"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pages that can show this story: {impactedTemplates.length > 0 ? impactedTemplates.map((page) => page.title ?? page.id).join(", ") : "No published page currently depends on this post"}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
