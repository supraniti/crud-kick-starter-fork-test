import { Alert, Stack } from "@mui/material";
import {
  AuthorAvatarGalleryDialog,
  AuthorDeskHeader,
  AuthorDeskSnackbar,
  AuthorDeskToolbar,
  AuthorFormDrawer,
  AuthorRosterTable
} from "./AuthorDeskPanels.jsx";
import { useAuthorDeskWorkspace } from "./useAuthorDeskWorkspace.js";

export function AuthorDeskView({ navigate = null, route = {}, collectionsDomain }) {
  const workspace = useAuthorDeskWorkspace({
    collectionsDomain,
    route,
    navigate
  });

  return (
    <Stack spacing={2}>
      <AuthorDeskHeader summary={workspace.summary} queueState={workspace.queueState} />

      <AuthorDeskToolbar
        routeState={workspace.routeState}
        localeOptions={workspace.localeOptions}
        selectedCount={workspace.selectedAuthorIds.length}
        onChangeFilter={workspace.handleFilterChange}
        onChangeSort={workspace.handleSortChange}
        onOpenCreate={workspace.handleOpenCreate}
        onDeleteSelected={workspace.handleBulkDelete}
        onClearSelection={workspace.handleClearSelection}
      />

      {workspace.queueState.errorMessage ? (
        <Alert severity="warning">
          Post assignment counts could not be refreshed. The roster remains editable, but linked post totals may be incomplete.
        </Alert>
      ) : null}
      {workspace.deploymentPagesState.errorMessage ? (
        <Alert severity="warning">
          Deployment posture could not be refreshed. Author sync badges may be incomplete until page state reloads.
        </Alert>
      ) : null}

      <AuthorRosterTable
        loading={workspace.loadingAuthors}
        errorMessage={workspace.authorErrorMessage}
        rows={workspace.pagedRows.rows}
        page={workspace.pagedRows.page}
        pageSize={workspace.pagedRows.pageSize}
        totalCount={workspace.visibleRows.length}
        selectedAuthorIds={workspace.selectedAuthorIds}
        mediaItemsById={workspace.mediaItemsById}
        mediaContentUrlFor={workspace.mediaContentUrlFor}
        onToggleSelection={workspace.handleToggleAuthorSelection}
        onEdit={workspace.handleOpenEdit}
        onDelete={workspace.handleDeleteSingle}
        onChangePage={workspace.handlePageChange}
        onOpenPosts={workspace.openPostsForAuthor}
      />

      <AuthorFormDrawer
        open={workspace.isDrawerOpen}
        formState={workspace.formState}
        validationErrors={workspace.validationErrors}
        expertiseTagOptions={workspace.expertiseTagOptions}
        selectedAvatarItem={workspace.selectedAvatarItem}
        mediaContentUrlFor={workspace.mediaContentUrlFor}
        mediaItemsById={workspace.mediaItemsById}
        readSocialField={workspace.readSocialField}
        onClose={workspace.handleCloseDrawer}
        onChangeField={workspace.handleFieldChange}
        onChangeSocialLink={workspace.handleSocialLinkChange}
        onToggleExpertiseTag={workspace.handleToggleExpertiseTag}
        onOpenGallery={workspace.openGallery}
        onDelete={workspace.handleDeleteSingle}
        onSubmit={workspace.handleSubmit}
      />

      <AuthorAvatarGalleryDialog
        open={workspace.mediaGallery.galleryState.open}
        selectedAvatarId={workspace.formState.avatarMediaId ?? ""}
        items={workspace.mediaGallery.mediaItems}
        loading={workspace.mediaGallery.galleryState.loading}
        uploading={workspace.mediaGallery.galleryState.uploading}
        errorMessage={workspace.mediaGallery.galleryState.errorMessage}
        mediaContentUrlFor={workspace.mediaContentUrlFor}
        onClose={workspace.mediaGallery.closeGallery}
        onRefresh={workspace.refreshMediaItems}
        onUploadFiles={workspace.handleUploadAvatar}
        onSelectAvatar={workspace.handleSelectAvatar}
      />

      <AuthorDeskSnackbar
        snackbarState={workspace.snackbarState}
        onClose={workspace.handleCloseSnackbar}
      />
    </Stack>
  );
}
