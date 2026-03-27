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
  Drawer,
  FormControl,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { TranslatableMultilineTextField } from "../../test-modules-translations/frontend/TranslatableMultilineTextField.jsx";
import { TranslatableTextField } from "../../test-modules-translations/frontend/TranslatableTextField.jsx";
import { useTranslationFieldSupport } from "../../test-modules-translations/frontend/useTranslationFieldSupport.js";
import { SyncPostureChip } from "../../../frontend/src/ui/SyncPostureChip.jsx";
import { SORT_OPTIONS } from "./author-desk-model.js";

function SummaryCard({ label, value, tone = "default", caption = "" }) {
  const color =
    tone === "warning" ? "warning.main" : tone === "success" ? "success.main" : "text.primary";
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ color }}>
          {value}
        </Typography>
        {caption ? (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function AuthorDeskHeader({ summary, queueState }) {
  const queueRows = Array.isArray(queueState?.items) ? queueState.items : [];
  const readyPosts = queueRows.filter((post) => post.status === "published").length;
  const needsAttention = queueRows.filter((post) => post.status !== "published").length;

  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          background: "linear-gradient(135deg, #10212d 0%, #3e5f73 100%)",
          color: "common.white"
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
            Authors
          </Typography>
          <Typography variant="h4">Author Roster</Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
            Find people quickly, inspect their publishing footprint, and update profiles without leaving the roster.
          </Typography>
        </Stack>
      </Paper>

      <Stack
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(6, minmax(0, 1fr))" } }}
        spacing={2}
      >
        <SummaryCard label="Authors" value={summary.total} />
        <SummaryCard label="Active" value={summary.active} />
        <SummaryCard label="Editors" value={summary.editors} />
        <SummaryCard label="Missing Avatars" value={summary.missingAvatar} tone={summary.missingAvatar > 0 ? "warning" : "success"} />
        <SummaryCard label="Missing Bios" value={summary.missingBio} tone={summary.missingBio > 0 ? "warning" : "success"} />
        <SummaryCard label="Attached Posts" value={summary.authoredPosts} caption={`Published ${readyPosts} · Other ${needsAttention}`} />
      </Stack>
    </Stack>
  );
}

export function AuthorDeskToolbar({
  routeState,
  localeOptions,
  selectedCount,
  onChangeFilter,
  onChangeSort,
  onOpenCreate,
  onDeleteSelected,
  onClearSelection
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ lg: "center" }}
        >
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Roster</Typography>
            <Typography variant="body2" color="text.secondary">
              Filters, sort, and page state belong to the URL so refresh returns to the same roster view.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" onClick={onOpenCreate}>
              New Author
            </Button>
            <Button variant="outlined" color="error" disabled={selectedCount === 0} onClick={onDeleteSelected}>
              Delete Selected
            </Button>
            <Button variant="text" disabled={selectedCount === 0} onClick={onClearSelection}>
              Clear Selection
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", xl: "row" }} spacing={1.5}>
          <TextField
            label="Search authors"
            size="small"
            value={routeState.search}
            onChange={(event) => onChangeFilter("search", event.target.value)}
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            label="Role"
            size="small"
            value={routeState.role}
            onChange={(event) => onChangeFilter("role", event.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {["author", "editor", "managing-editor", "guest"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            size="small"
            value={routeState.status}
            onChange={(event) => onChangeFilter("status", event.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {["active", "inactive", "blocked"].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Locale"
            size="small"
            value={routeState.locale}
            onChange={(event) => onChangeFilter("locale", event.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {localeOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Sort"
            size="small"
            value={routeState.sort}
            onChange={(event) => onChangeSort(event.target.value)}
            sx={{ minWidth: 180 }}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>
    </Paper>
  );
}

function ProfileGapChips({ profileGaps }) {
  if (!Array.isArray(profileGaps) || profileGaps.length === 0) {
    return <Chip size="small" label="Complete" color="success" variant="outlined" />;
  }

  return (
    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
      {profileGaps.map((gap) => (
        <Chip key={gap} size="small" label={gap} color="warning" />
      ))}
    </Stack>
  );
}

function AuthorAvatarCell({ row, mediaItemsById, mediaContentUrlFor }) {
  const avatarItem = mediaItemsById.get(row.avatarMediaId) ?? null;
  const imageUrl = avatarItem ? mediaContentUrlFor(avatarItem.id, avatarItem.updatedOn) : "";
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Avatar src={imageUrl || undefined}>{row.displayName.slice(0, 1).toUpperCase()}</Avatar>
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap>
          {row.displayName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {row.email}
        </Typography>
      </Stack>
    </Stack>
  );
}

export function AuthorRosterTable({
  loading,
  errorMessage,
  rows,
  page,
  pageSize,
  totalCount,
  selectedAuthorIds,
  mediaItemsById,
  mediaContentUrlFor,
  onToggleSelection,
  onEdit,
  onDelete,
  onChangePage,
  onOpenPosts
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      {errorMessage ? <Alert severity="error" sx={{ borderRadius: 0 }}>{errorMessage}</Alert> : null}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Author</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Locale</TableCell>
              <TableCell align="center">Posts</TableCell>
              <TableCell align="center">Published</TableCell>
              <TableCell align="center">Drafts</TableCell>
              <TableCell>Deployment</TableCell>
              <TableCell>Profile</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const selected = selectedAuthorIds.includes(row.id);
              return (
                <TableRow
                  key={row.id}
                  hover
                  selected={selected}
                  sx={{ cursor: "pointer" }}
                  onClick={() => onEdit(row)}
                >
                  <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelection(row.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <AuthorAvatarCell
                      row={row}
                      mediaItemsById={mediaItemsById}
                      mediaContentUrlFor={mediaContentUrlFor}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.role} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status}
                      color={row.status === "active" ? "success" : row.status === "blocked" ? "error" : "default"}
                    />
                  </TableCell>
                  <TableCell>{row.locale || "—"}</TableCell>
                  <TableCell align="center">
                    <Button size="small" onClick={(event) => {
                      event.stopPropagation();
                      onOpenPosts(row.id);
                    }}>
                      {row.totalPosts}
                    </Button>
                  </TableCell>
                  <TableCell align="center">{row.publishedPosts}</TableCell>
                  <TableCell align="center">{row.draftPosts}</TableCell>
                  <TableCell>
                    <SyncPostureChip
                      label={row.deploymentState?.label ?? "Unknown"}
                      tone={row.deploymentState?.tone ?? "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <ProfileGapChips profileGaps={row.profileGaps} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(row);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(row.id);
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No authors match the current roster filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        page={Math.max(0, page - 1)}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[pageSize]}
        onPageChange={onChangePage}
      />
    </Paper>
  );
}

function AvatarGalleryCard({ item, selected, mediaContentUrlFor, onSelect }) {
  return (
    <Card variant="outlined" sx={{ borderColor: selected ? "primary.main" : "divider" }}>
      <CardActionArea onClick={() => onSelect(item.id)}>
        <Box
          sx={{
            height: 132,
            background: "linear-gradient(135deg, #f2ede4 0%, #e0d5c5 100%)",
            overflow: "hidden"
          }}
        >
          <Box
            component="img"
            src={mediaContentUrlFor(item.id, item.updatedOn)}
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
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function AuthorAvatarGalleryDialog({
  open,
  selectedAvatarId,
  items,
  loading,
  uploading,
  errorMessage,
  mediaContentUrlFor,
  onClose,
  onRefresh,
  onUploadFiles,
  onSelectAvatar
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Choose Author Avatar</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
          >
            <Typography variant="body2" color="text.secondary">
              Browse the media library visually or upload a new portrait without leaving the author drawer.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" component="label" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Image"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) => onUploadFiles(event.target.files)}
                />
              </Button>
              <Button variant="text" onClick={onRefresh} disabled={loading}>
                Refresh
              </Button>
            </Stack>
          </Stack>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))"
              },
              gap: 2
            }}
          >
            {items.map((item) => (
              <AvatarGalleryCard
                key={item.id}
                item={item}
                selected={selectedAvatarId === item.id}
                mediaContentUrlFor={mediaContentUrlFor}
                onSelect={onSelectAvatar}
              />
            ))}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function ExpertiseTagSelector({ options, values, onToggle }) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        Expertise tags
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {options.map((tag) => {
          const selected = values.includes(tag.id);
          return (
            <Chip
              key={tag.id}
              label={tag.name ?? tag.label ?? tag.id}
              size="small"
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              onClick={() => onToggle(tag.id)}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}

export function AuthorFormDrawer({
  open,
  formState,
  validationErrors,
  expertiseTagOptions,
  selectedAvatarItem,
  mediaContentUrlFor,
  mediaItemsById,
  readSocialField,
  onClose,
  onChangeField,
  onChangeSocialLink,
  onToggleExpertiseTag,
  onOpenGallery,
  onDelete,
  onSubmit
}) {
  const avatarVersionToken =
    mediaItemsById.get(selectedAvatarItem?.id)?.updatedOn ?? selectedAvatarItem?.updatedOn ?? "";
  const avatarUrl =
    selectedAvatarItem ? mediaContentUrlFor(selectedAvatarItem.id, avatarVersionToken) : "";
  const buildTranslationField = useTranslationFieldSupport({
    entityType: "blog-authors",
    entityId: formState.itemId ?? null,
    entityLabel: formState.displayName ?? formState.legalName ?? "Author",
    sourceLocale: formState.locale ?? "en-US"
  });

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Stack sx={{ width: { xs: "100vw", sm: 480 }, p: 2.5 }} spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack spacing={0.25}>
            <Typography variant="h6">
              {formState.itemId ? "Edit Author" : "New Author"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Keep the roster visible while you update profile, role, expertise, and portrait.
            </Typography>
          </Stack>
          <Button variant="text" onClick={onClose}>
            Close
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={avatarUrl || undefined} sx={{ width: 72, height: 72 }}>
                {(formState.displayName || "?").slice(0, 1).toUpperCase()}
              </Avatar>
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  {selectedAvatarItem?.displayName ?? "No portrait selected"}
                </Typography>
                <Button variant="outlined" size="small" onClick={onOpenGallery}>
                  Choose Avatar
                </Button>
              </Stack>
            </Stack>

            <TranslatableTextField
              label="Display name"
              size="small"
              value={formState.displayName ?? ""}
              error={Boolean(validationErrors.displayName)}
              helperText={validationErrors.displayName ?? "Public author name shown on posts and pages."}
              onChange={(event) => onChangeField("displayName", event.target.value)}
              translationField={buildTranslationField({
                fieldPath: "displayName",
                fieldLabel: "Display Name",
                sourceValue: formState.displayName ?? "",
                valueKind: "text"
              })}
            />
            <TranslatableTextField
              label="Legal name"
              size="small"
              value={formState.legalName ?? ""}
              onChange={(event) => onChangeField("legalName", event.target.value)}
              translationField={buildTranslationField({
                fieldPath: "legalName",
                fieldLabel: "Legal Name",
                sourceValue: formState.legalName ?? "",
                valueKind: "text"
              })}
            />
            <TranslatableMultilineTextField
              label="Bio"
              size="small"
              value={formState.bio ?? ""}
              fieldId="bio"
              onChangeField={onChangeField}
              minRows={4}
              translationField={buildTranslationField({
                fieldPath: "bio",
                fieldLabel: "Bio",
                sourceValue: formState.bio ?? "",
                valueKind: "rich-text"
              })}
            />
            <TextField
              label="Email"
              size="small"
              value={formState.email ?? ""}
              error={Boolean(validationErrors.email)}
              helperText={validationErrors.email ?? "Primary editorial contact address."}
              onChange={(event) => onChangeField("email", event.target.value)}
            />
            <TextField
              label="Website"
              size="small"
              value={formState.websiteUrl ?? ""}
              error={Boolean(validationErrors.websiteUrl)}
              helperText={validationErrors.websiteUrl ?? "Optional public profile link."}
              onChange={(event) => onChangeField("websiteUrl", event.target.value)}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                select
                label="Role"
                size="small"
                value={formState.role ?? "author"}
                onChange={(event) => onChangeField("role", event.target.value)}
                fullWidth
              >
                {["author", "editor", "managing-editor", "guest"].map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Status"
                size="small"
                value={formState.status ?? "active"}
                onChange={(event) => onChangeField("status", event.target.value)}
                fullWidth
              >
                {["active", "inactive", "blocked"].map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Locale"
              size="small"
              value={formState.locale ?? ""}
              onChange={(event) => onChangeField("locale", event.target.value)}
            />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Social and expertise</Typography>
            <TextField
              label="X"
              size="small"
              value={readSocialField("x")}
              onChange={(event) => onChangeSocialLink("x", event.target.value)}
            />
            <TextField
              label="LinkedIn"
              size="small"
              value={readSocialField("linkedin")}
              onChange={(event) => onChangeSocialLink("linkedin", event.target.value)}
            />
            <TextField
              label="GitHub"
              size="small"
              value={readSocialField("github")}
              onChange={(event) => onChangeSocialLink("github", event.target.value)}
            />
            <ExpertiseTagSelector
              options={expertiseTagOptions}
              values={formState.expertiseTagIds ?? []}
              onToggle={onToggleExpertiseTag}
            />
          </Stack>
        </Paper>

        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={onSubmit} disabled={formState.saving}>
            {formState.saving ? "Saving..." : formState.itemId ? "Save Author" : "Create Author"}
          </Button>
          {formState.itemId ? (
            <Button variant="outlined" color="error" onClick={() => onDelete(formState.itemId)}>
              Delete
            </Button>
          ) : null}
        </Stack>

        {formState.errorMessage ? <Alert severity="error">{formState.errorMessage}</Alert> : null}
      </Stack>
    </Drawer>
  );
}

export function AuthorDeskSnackbar({ snackbarState, onClose }) {
  return (
    <Snackbar open={snackbarState.open} autoHideDuration={3500} onClose={onClose}>
      <Alert onClose={onClose} severity={snackbarState.severity} variant="filled" sx={{ width: "100%" }}>
        {snackbarState.message}
      </Alert>
    </Snackbar>
  );
}
