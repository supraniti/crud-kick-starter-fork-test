import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { DeskTabsCard } from "../../../frontend/src/ui/DeskTabsCard.jsx";
import { BlogTaxonomyRemoteProjectionPanel } from "./BlogTaxonomyRemoteProjectionPanel.jsx";
import {
  CategoryFormDrawer,
  CategoryMainPanel,
  CategorySelectionCard,
  CategoryToolbar,
  CategoryTreeBrowser,
  PublicationBranchCard,
  PublicationGuideCard,
  PublicationStatusCard,
  TagBatchCard,
  TagFormDrawer,
  TagRosterTable,
  TagsToolbar,
  TaxonomyContextRail,
  TaxonomyDeskHeader,
  TaxonomyImpactCard,
  TaxonomyDeskSnackbar,
  TaxonomyFeaturedMediaDialog,
  TaxonomyPublicationStateCard
} from "./TaxonomyDeskPanels.jsx";
import { useTaxonomyDeskWorkspace } from "./useTaxonomyDeskWorkspace.js";
import { buildTagBatchCandidates } from "./taxonomy-desk-model.js";

const CATEGORIES_COLLECTION_ID = "blog-categories";
const TAGS_COLLECTION_ID = "blog-tags";

export function BlogTaxonomyView({
  activeModuleLabel,
  collectionsDomain,
  moduleSettingsDomain = null,
  navigate = null,
  route = {}
}) {
  const workspace = useTaxonomyDeskWorkspace({
    collectionsDomain,
    moduleSettingsDomain,
    navigate,
    route
  });
  const tagBatchPreview = buildTagBatchCandidates(workspace.tagBatchInput, workspace.allTags)
    .duplicateNames
    .slice(0, 6);
  const [categoryContextTab, setCategoryContextTab] = useState("selected");
  const [tagContextTab, setTagContextTab] = useState("publication");
  const parentCategoryOptions = (workspace.fullCategoryRows.length > 0 ? workspace.fullCategoryRows : [])
    .filter((row) => row.id !== workspace.formState.itemId)
    .map((row) => ({
      id: row.id,
      label: `${"— ".repeat(row.treeDepth)}${row.name}`
    }));

  return (
    <Stack spacing={2}>
      <TaxonomyDeskHeader
        branch={workspace.activeBranch}
        categorySummary={workspace.categorySummary}
        tagSummary={workspace.tagSummary}
      />

      <DeskTabsCard
        value={workspace.routeState.branch}
        onChange={workspace.handleSelectBranch}
        tabs={[
          { value: "categories", label: "Categories" },
          { value: "tags", label: "Tags" },
          { value: "publication", label: "Remote Publication" }
        ]}
      />

      {workspace.routeState.branch === "categories" ? (
        <CategoryMainPanel
          browser={
            <CategoryTreeBrowser
              rows={workspace.categoryRows}
              selectedCategoryId={workspace.selectedCategory?.id ?? ""}
              expandedCategoryIds={new Set(workspace.routeState.categorySearch ? workspace.categoryRows.map((row) => row.id) : workspace.routeState.categoryExpanded.length > 0 ? workspace.routeState.categoryExpanded : workspace.categoryRows.filter((row) => row.treeDepth === 0).map((row) => row.id))}
              onToggleExpanded={workspace.handleToggleExpanded}
              onSelect={workspace.handleOpenEditCategory}
            />
          }
          toolbar={
            <CategoryToolbar
              routeState={workspace.routeState}
              onChangeFilter={workspace.handleCategoryFilterChange}
              onOpenCreate={workspace.handleOpenCreateCategory}
              onExpandAll={workspace.handleExpandAll}
              onCollapseAll={workspace.handleCollapseAll}
            />
          }
          insights={
            <Stack spacing={1.5}>
              {workspace.termsErrorMessage ? <Alert severity="error">{workspace.termsErrorMessage}</Alert> : null}
              <TaxonomyContextRail
                value={categoryContextTab}
                onChange={setCategoryContextTab}
                tabs={[
                  { value: "selected", label: "Selected" },
                  { value: "impact", label: "Impact" },
                  { value: "publication", label: "Publication" }
                ]}
                content={
                  categoryContextTab === "impact" ? (
                    <TaxonomyImpactCard
                      branch="categories"
                      usageSummary={workspace.usageAwareness.usageSummary}
                      usageRows={workspace.usageAwareness.usageRows}
                      onOpenPosts={workspace.openPosts}
                      onOpenPages={workspace.openPages}
                      onRefresh={workspace.usageAwareness.reload}
                    />
                  ) : categoryContextTab === "publication" ? (
                    <TaxonomyPublicationStateCard
                      publicationState={workspace.publicationState}
                      latestRun={workspace.projectionLatestRun}
                      targetTitle={workspace.projectionTarget?.title ?? ""}
                      branch="categories"
                      usageSummary={workspace.usageAwareness.usageSummary}
                    />
                  ) : (
                    <CategorySelectionCard
                      category={workspace.selectedCategory}
                      outputCandidates={workspace.selectedCategoryOutputs}
                      onOpenPages={workspace.openPages}
                    />
                  )
                }
              />
            </Stack>
          }
        />
      ) : null}

      {workspace.routeState.branch === "tags" ? (
        <Stack spacing={2}>
          <TagsToolbar
            routeState={workspace.routeState}
            selectedCount={workspace.selectedTagIds.length}
            onChangeFilter={workspace.handleTagFilterChange}
            onOpenCreate={workspace.handleOpenCreateTag}
            onDeleteSelected={workspace.handleBulkDeleteTags}
          />
          {workspace.termsErrorMessage ? <Alert severity="error">{workspace.termsErrorMessage}</Alert> : null}
          <CategoryMainPanel
            browser={
              <TagRosterTable
                rows={workspace.pagedTagRows.rows}
                page={workspace.pagedTagRows.page}
                pageSize={workspace.pagedTagRows.pageSize}
                totalCount={workspace.tagRows.length}
                selectedTagIds={workspace.selectedTagIds}
                onToggleSelection={workspace.handleToggleTagSelection}
                onEdit={workspace.handleOpenEditTag}
                onChangePage={workspace.handleTagPageChange}
              />
            }
            toolbar={
              <TaxonomyContextRail
                value={tagContextTab}
                onChange={setTagContextTab}
                tabs={[
                  { value: "publication", label: "Publication" },
                  { value: "impact", label: "Impact" },
                  { value: "batch", label: "Batch" }
                ]}
                content={
                  tagContextTab === "impact" ? (
                    <TaxonomyImpactCard
                      branch="tags"
                      usageSummary={workspace.usageAwareness.usageSummary}
                      usageRows={workspace.usageAwareness.usageRows}
                      onOpenPosts={workspace.openPosts}
                      onOpenPages={workspace.openPages}
                      onRefresh={workspace.usageAwareness.reload}
                    />
                  ) : tagContextTab === "batch" ? (
                    <TagBatchCard
                      value={workspace.tagBatchInput}
                      onChange={workspace.setTagBatchInput}
                      onCreate={workspace.handleCreateTagBatch}
                      duplicatePreview={tagBatchPreview}
                    />
                  ) : (
                    <TaxonomyPublicationStateCard
                      publicationState={workspace.publicationState}
                      latestRun={workspace.projectionLatestRun}
                      targetTitle={workspace.projectionTarget?.title ?? ""}
                      branch="tags"
                      usageSummary={workspace.usageAwareness.usageSummary}
                    />
                  )
                }
              />
            }
            insights={null}
          />
        </Stack>
      ) : null}

      {workspace.routeState.branch === "publication" ? (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Stack spacing={0.35}>
                <Typography variant="h6">Projection Scope</Typography>
                <Typography variant="body2" color="text.secondary">
                  Switch between categories and tags when you need to inspect the exact remote projection state.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  variant={workspace.publicationScope === "categories" ? "contained" : "outlined"}
                  onClick={() => workspace.handleSelectPublicationScope("categories")}
                >
                  Categories
                </Button>
                <Button
                  variant={workspace.publicationScope === "tags" ? "contained" : "outlined"}
                  onClick={() => workspace.handleSelectPublicationScope("tags")}
                >
                  Tags
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <PublicationGuideCard scope={workspace.publicationScope} />

          {moduleSettingsDomain ? (
            <CategoryMainPanel
              toolbar={
                <PublicationStatusCard
                  publicationState={workspace.publicationState}
                  latestRun={workspace.projectionLatestRun}
                  targetTitle={workspace.projectionTarget?.title ?? ""}
                />
              }
              browser={
                <PublicationBranchCard scope={workspace.publicationScope}>
                  <BlogTaxonomyRemoteProjectionPanel
                    activeCollectionId={workspace.publicationScope === "tags" ? TAGS_COLLECTION_ID : CATEGORIES_COLLECTION_ID}
                    moduleSettingsDomain={moduleSettingsDomain}
                    navigate={navigate}
                  />
                </PublicationBranchCard>
              }
              insights={
                <Alert severity="info">
                  Keep everyday category and tag work on the other tabs. Use this branch only when you need to compare or sync the public projection.
                </Alert>
              }
            />
          ) : (
            <Alert severity="info">Remote publication settings are not available on this route.</Alert>
          )}
        </Stack>
      ) : null}

      <CategoryFormDrawer
        open={workspace.isCategoryDrawerOpen}
        formState={workspace.formState}
        validationErrors={workspace.categoryValidationErrors}
        pathPreview={workspace.categoryPathPreview}
        parentCategoryOptions={parentCategoryOptions}
        selectedFeaturedMedia={workspace.selectedFeaturedMedia}
        mediaContentUrlFor={workspace.mediaContentUrlFor}
        onClose={workspace.handleCloseCategoryDrawer}
        onChangeField={workspace.handleCategoryFieldChange}
        onOpenGallery={workspace.featuredMediaGallery.openGallery}
        onDelete={workspace.handleDeleteCategory}
        onSubmit={workspace.handleSubmitCategory}
      />

      <TagFormDrawer
        open={workspace.isTagDrawerOpen}
        formState={workspace.formState}
        validationErrors={workspace.tagValidationErrors}
        onClose={workspace.handleCloseTagDrawer}
        onChangeField={workspace.handleTagFieldChange}
        onDelete={workspace.handleDeleteTag}
        onSubmit={workspace.handleSubmitTag}
      />

      <TaxonomyFeaturedMediaDialog
        open={workspace.featuredMediaGallery.galleryState.open}
        selectedMediaId={workspace.formState.featuredMediaId ?? ""}
        items={workspace.featuredMediaGallery.mediaItems}
        loading={workspace.featuredMediaGallery.galleryState.loading}
        uploading={workspace.featuredMediaGallery.galleryState.uploading}
        errorMessage={workspace.featuredMediaGallery.galleryState.errorMessage}
        mediaContentUrlFor={workspace.mediaContentUrlFor}
        onClose={workspace.featuredMediaGallery.closeGallery}
        onRefresh={workspace.featuredMediaGallery.refreshMediaItems}
        onUploadFiles={workspace.handleUploadFeaturedMedia}
        onSelectMedia={workspace.handleSelectFeaturedMedia}
      />

      <TaxonomyDeskSnackbar snackbarState={workspace.snackbarState} onClose={workspace.handleCloseSnackbar} />
    </Stack>
  );
}
