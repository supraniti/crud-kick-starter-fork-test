import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Typography
} from "@mui/material";

const TAGS_COLLECTION_ID = "blog-tags";
const CATEGORIES_COLLECTION_ID = "blog-categories";

export function BlogTaxonomyUsagePanel({
  activeCollectionId,
  usageState,
  usageSummary,
  usageRows,
  onOpenPosts,
  onOpenPages,
  onRefresh
}) {
  const isCategories = activeCollectionId === CATEGORIES_COLLECTION_ID;
  const title = isCategories ? "Posts + Category Pages" : "Posts + Tag Listings";

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
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              Taxonomies stay meaningful only when their usage across posts and page templates is visible.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="text" onClick={onOpenPosts}>
              Open Posts
            </Button>
            <Button variant="text" onClick={onOpenPages}>
              Open Pages
            </Button>
            <Button variant="outlined" size="small" onClick={onRefresh}>
              Refresh Usage
            </Button>
          </Stack>
        </Stack>

        {usageState.errorMessage ? <Alert severity="error">{usageState.errorMessage}</Alert> : null}
        {usageState.loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading taxonomy usage...
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={`Posts ${usageSummary.totalPosts}`} variant="outlined" />
          <Chip
            size="small"
            label={isCategories ? `Categorized Posts ${usageSummary.categorizedPosts}` : `Tagged Posts ${usageSummary.taggedPosts}`}
            variant="outlined"
          />
          {isCategories ? (
            <Chip size="small" label={`Posts Missing Categories ${usageSummary.postsMissingCategories}`} color={usageSummary.postsMissingCategories > 0 ? "warning" : "default"} />
          ) : null}
          <Chip size="small" label={`Referenced Terms ${usageSummary.referencedTerms}`} color={usageSummary.referencedTerms > 0 ? "success" : "default"} />
          <Chip size="small" label={`Unused Terms ${usageSummary.unusedTerms}`} color={usageSummary.unusedTerms > 0 ? "warning" : "default"} />
          <Chip
            size="small"
            label={
              isCategories
                ? `Category Templates ${usageSummary.categoryTemplatePages}`
                : `Tag Listing Pages ${usageSummary.tagListingPages}`
            }
            variant="outlined"
          />
          {isCategories ? (
            <Chip size="small" label={`Category Listing Pages ${usageSummary.categoryListingPages}`} variant="outlined" />
          ) : null}
        </Stack>

        <Alert severity={usageSummary.unusedTerms > 0 ? "info" : "success"}>
          {isCategories
            ? "Use this surface to keep category assignments, category fan-out pages, and category-driven listing pages aligned."
            : "Use this surface to see whether tags are actually consumed by posts and whether any page contracts currently depend on tag-driven listings."}
        </Alert>

        {usageRows.length > 0 ? (
          <Stack spacing={0.75}>
            {usageRows.map((row) => (
              <Typography key={row.id} variant="body2" color="text.secondary">
                {row.label}: {row.actualReferenceCount} post reference{row.actualReferenceCount === 1 ? "" : "s"} • recorded usage {row.recordedUsageCount}
              </Typography>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
