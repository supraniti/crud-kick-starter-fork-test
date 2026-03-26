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
import { DeskSplitLayout } from "../../../frontend/src/ui/DeskSplitLayout.jsx";
import { DeskTabsCard } from "../../../frontend/src/ui/DeskTabsCard.jsx";
import { TranslatableMultilineTextField } from "../../test-modules-translations/frontend/TranslatableMultilineTextField.jsx";
import { TranslatableTextField } from "../../test-modules-translations/frontend/TranslatableTextField.jsx";
import { useTranslationFieldSupport } from "../../test-modules-translations/frontend/useTranslationFieldSupport.js";

function SummaryCard({ label, value, tone = "default", caption = "" }) {
  const color = tone === "warning" ? "warning.main" : tone === "success" ? "success.main" : "text.primary";
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

export function TaxonomyDeskHeader({ branch, categorySummary, tagSummary }) {
  const summary = branch === "tags" ? tagSummary : categorySummary;
  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          background: "linear-gradient(135deg, #10212d 0%, #3c5f71 100%)",
          color: "common.white"
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.72)" }}>
            Taxonomies
          </Typography>
          <Typography variant="h4">Taxonomy Studio</Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
            Shape the information architecture of the publication. Categories feel structural. Tags stay fast and clean.
          </Typography>
        </Stack>
      </Paper>

      <Stack sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, minmax(0, 1fr))" } }} spacing={2}>
        <SummaryCard label={branch === "tags" ? "Tags" : "Categories"} value={summary.total} />
        {branch === "tags" ? (
          <>
            <SummaryCard label="Public" value={summary.publicCount} />
            <SummaryCard label="Internal" value={summary.internal} />
            <SummaryCard label="Colored" value={summary.colored} />
            <SummaryCard label="Unused" value={summary.unused} tone={summary.unused > 0 ? "warning" : "success"} />
          </>
        ) : (
          <>
            <SummaryCard label="Root Categories" value={summary.roots} />
            <SummaryCard label="With Featured Image" value={summary.withImage} />
            <SummaryCard label="Internal" value={summary.internal} />
            <SummaryCard label="Unused" value={summary.unused} tone={summary.unused > 0 ? "warning" : "success"} />
          </>
        )}
      </Stack>
    </Stack>
  );
}

export function CategoryToolbar({ routeState, onChangeFilter, onOpenCreate, onExpandAll, onCollapseAll }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1} justifyContent="space-between" alignItems={{ lg: "center" }}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Categories</Typography>
            <Typography variant="body2" color="text.secondary">
              Browse the tree, keep the branch structure readable, and edit categories without leaving the desk.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" onClick={onOpenCreate}>New Category</Button>
            <Button variant="outlined" onClick={onExpandAll}>Expand All</Button>
            <Button variant="text" onClick={onCollapseAll}>Collapse All</Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5}>
          <TextField
            label="Search categories"
            size="small"
            value={routeState.categorySearch}
            onChange={(event) => onChangeFilter("categorySearch", event.target.value)}
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            label="Visibility"
            size="small"
            value={routeState.categoryVisibility}
            onChange={(event) => onChangeFilter("categoryVisibility", event.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="internal">Internal</MenuItem>
          </TextField>
          <TextField
            select
            label="Sort"
            size="small"
            value={routeState.categorySort}
            onChange={(event) => onChangeFilter("categorySort", event.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="tree">Tree Order</MenuItem>
            <MenuItem value="usage-desc">Most Used</MenuItem>
            <MenuItem value="name-asc">Name A-Z</MenuItem>
          </TextField>
        </Stack>
      </Stack>
    </Paper>
  );
}

function CategoryTreeRow({ row, selected, isExpanded, onToggleExpanded, onSelect }) {
  return (
    <Box
      sx={{
        p: 1.25,
        border: 1,
        borderRadius: 1.5,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? "primary.50" : "background.paper",
        cursor: "pointer",
        minWidth: 0
      }}
      onClick={() => onSelect(row)}
    >
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          {row.hasChildren ? (
            <Button
              size="small"
              variant="text"
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpanded(row.id);
              }}
              sx={{ minWidth: 0, px: 0.75, fontWeight: 700 }}
            >
              {isExpanded ? "−" : "+"}
            </Button>
          ) : (
            <Box sx={{ width: 32, display: "flex", justifyContent: "center" }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: selected ? "primary.main" : "divider"
                }}
              />
            </Box>
          )}
          <Typography variant="subtitle2">{row.name}</Typography>
          <Chip size="small" label={`${row.referenceCount} posts`} color={row.referenceCount > 0 ? "primary" : "default"} />
          <Chip size="small" label={row.visibility ?? "public"} variant="outlined" />
          {row.featuredMediaId ? <Chip size="small" label="featured image" color="secondary" /> : null}
          {row.childCount > 0 ? <Chip size="small" label={`${row.childCount} children`} variant="outlined" /> : null}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {row.path}
        </Typography>
      </Stack>
    </Box>
  );
}

export function CategoryTreeBrowser({
  rows,
  selectedCategoryId,
  expandedCategoryIds,
  onToggleExpanded,
  onSelect
}) {
  const hasNestedRows = rows.some((row) => row.treeDepth > 0);
  const childrenByParent = new Map();
  for (const row of rows) {
    const parentKey = row.parentCategoryId || "__root__";
    const siblings = childrenByParent.get(parentKey) ?? [];
    siblings.push(row);
    childrenByParent.set(parentKey, siblings);
  }

  function renderBranch(parentId = "__root__", depth = 0) {
    const branchRows = childrenByParent.get(parentId) ?? [];
    return branchRows.map((row) => (
      <Stack key={row.id} spacing={1}>
        <CategoryTreeRow
          row={row}
          selected={selectedCategoryId === row.id}
          isExpanded={expandedCategoryIds.has(row.id)}
          onToggleExpanded={onToggleExpanded}
          onSelect={onSelect}
        />
        {expandedCategoryIds.has(row.id) && (childrenByParent.get(row.id) ?? []).length > 0 ? (
          <Box
            sx={{
              ml: 3,
              pl: 2,
              borderLeft: 1,
              borderColor: "divider"
            }}
          >
            <Stack spacing={1}>{renderBranch(row.id, depth + 1)}</Stack>
          </Box>
        ) : null}
      </Stack>
    ));
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1">Category Tree</Typography>
          <Typography variant="body2" color="text.secondary">
            Read the hierarchy top to bottom. Open a branch to work deeper in the structure.
          </Typography>
        </Stack>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            bgcolor: "grey.50",
            borderStyle: "dashed"
          }}
        >
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Chip size="small" color="primary" label="Root" />
              <Typography variant="subtitle2">All Categories</Typography>
              <Chip size="small" variant="outlined" label={`${rows.filter((row) => row.treeDepth === 0).length} top-level`} />
              <Chip size="small" variant="outlined" label={`${rows.length} total`} />
            </Stack>
            {!hasNestedRows ? (
              <Typography variant="body2" color="text.secondary">
                All categories are currently at the top level. Assign a parent in the category drawer to create nested branches.
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nested branches already exist. Expand parents to inspect deeper levels of the structure.
              </Typography>
            )}
          </Stack>
        </Paper>
        {rows.length === 0 ? (
          <Alert severity="info">No categories match the current tree view.</Alert>
        ) : (
          <Box
            sx={{
              pl: 1.5,
              borderLeft: 2,
              borderColor: "divider"
            }}
          >
            <Stack spacing={1}>{renderBranch()}</Stack>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

export function TaxonomyPublicationStateCard({ publicationState, latestRun, targetTitle, branch, usageSummary }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1">Publication Snapshot</Typography>
          <Typography variant="body2" color="text.secondary">
            Keep the remote state visible while you work locally.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={publicationState.label} color={publicationState.tone === "success" ? "success" : publicationState.tone === "warning" ? "warning" : "default"} />
          <Chip size="small" label={`Public ${publicationState.publicCount}`} variant="outlined" />
          {latestRun?.procedureType ? <Chip size="small" label={`Last ${latestRun.procedureType} ${latestRun.status ?? "unknown"}`} variant="outlined" /> : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">{publicationState.detail}</Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={targetTitle || "No projection target selected"} variant="outlined" />
          {branch === "categories" ? (
            <Chip size="small" label={`Category Templates ${usageSummary.categoryTemplatePages}`} variant="outlined" />
          ) : (
            <Chip size="small" label={`Tag Listing Pages ${usageSummary.tagListingPages}`} variant="outlined" />
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export function TaxonomyImpactCard({ branch, usageSummary, usageRows, onOpenPosts, onOpenPages, onRefresh }) {
  const isCategories = branch === "categories";
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1">Impact Snapshot</Typography>
          <Typography variant="body2" color="text.secondary">
            See how this taxonomy branch currently affects posts and pages.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={`Posts ${usageSummary.totalPosts}`} variant="outlined" />
          <Chip
            size="small"
            label={isCategories ? `Categorized ${usageSummary.categorizedPosts}` : `Tagged ${usageSummary.taggedPosts}`}
            variant="outlined"
          />
          {isCategories ? (
            <Chip
              size="small"
              label={`Missing Categories ${usageSummary.postsMissingCategories}`}
              color={usageSummary.postsMissingCategories > 0 ? "warning" : "default"}
            />
          ) : null}
          <Chip size="small" label={`Unused ${usageSummary.unusedTerms}`} color={usageSummary.unusedTerms > 0 ? "warning" : "default"} />
        </Stack>
        {usageRows.length > 0 ? (
          <Stack spacing={0.5}>
            {usageRows.slice(0, 4).map((row) => (
              <Typography key={row.id} variant="body2" color="text.secondary">
                {row.label}: {row.actualReferenceCount} post reference{row.actualReferenceCount === 1 ? "" : "s"}
              </Typography>
            ))}
          </Stack>
        ) : null}
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button variant="text" size="small" onClick={onOpenPosts}>
            Open Posts
          </Button>
          <Button variant="text" size="small" onClick={onOpenPages}>
            Open Pages
          </Button>
          <Button variant="outlined" size="small" onClick={onRefresh}>
            Refresh
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function CategorySelectionCard({ category, outputCandidates, onOpenPages }) {
  if (!category) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1">Selected Category</Typography>
          <Typography variant="body2" color="text.secondary">
            Select a branch to inspect its path and page output.
          </Typography>
        </Stack>
      </Paper>
    );
  }
  const firstOutput = outputCandidates[0] ?? null;
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1">Selected Category</Typography>
          <Typography variant="body2" color="text.secondary">
            Current structural and public-page context for the selected branch.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={category.name ?? category.id} />
          <Chip size="small" label={category.visibility ?? "public"} variant="outlined" />
          <Chip size="small" label={category.path || "No path"} variant="outlined" />
        </Stack>
        {firstOutput ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Public URL: {firstOutput.output.publicUrl || "Not resolved yet"}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {firstOutput.output.publicUrl ? (
                <Button component="a" href={firstOutput.output.publicUrl} target="_blank" rel="noreferrer" size="small" variant="outlined">
                  Open URL
                </Button>
              ) : null}
              <Button size="small" variant="text" onClick={onOpenPages}>
                Open Pages
              </Button>
            </Stack>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No published category page template currently covers this branch.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

export function PublicationGuideCard({ scope }) {
  const label = scope === "tags" ? "Tags" : "Categories";
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1">Publication Flow</Typography>
          <Typography variant="body2" color="text.secondary">
            Publish the public {label.toLowerCase()} records that remote pages and applications depend on.
          </Typography>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap flexWrap="wrap">
          <Chip color="primary" label={`1. Pick ${label}`} />
          <Chip color="primary" label="2. Confirm target" />
          <Chip color="primary" label="3. Compare" />
          <Chip color="primary" label="4. Sync" />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Compare is your safety check. Sync is the moment the public projection becomes current.
        </Typography>
      </Stack>
    </Paper>
  );
}

export function TaxonomyContextRail({ value, onChange, tabs, content }) {
  return (
    <Stack spacing={1.5}>
      <DeskTabsCard value={value} onChange={onChange} tabs={tabs} />
      {content}
    </Stack>
  );
}

export function PublicationBranchCard({ scope, children }) {
  const label = scope === "tags" ? "Tags" : "Categories";
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Remote Publication</Typography>
            <Typography variant="body2" color="text.secondary">
              Publish the public {label.toLowerCase()} projection without leaving the taxonomy desk.
            </Typography>
          </Stack>
          <Chip size="small" color="primary" label={`${label} projection`} />
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

export function PublicationStatusCard({ publicationState, latestRun, targetTitle }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1">Current Publication State</Typography>
          <Typography variant="body2" color="text.secondary">
            See whether the remote projection is current before you run compare or sync.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={publicationState.label} color={publicationState.tone === "success" ? "success" : publicationState.tone === "warning" ? "warning" : "default"} />
          <Chip size="small" label={`Public ${publicationState.publicCount}`} variant="outlined" />
          {targetTitle ? <Chip size="small" label={targetTitle} variant="outlined" /> : null}
          {latestRun?.procedureType ? (
            <Chip size="small" label={`Last ${latestRun.procedureType} ${latestRun.status ?? "unknown"}`} variant="outlined" />
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">{publicationState.detail}</Typography>
      </Stack>
    </Paper>
  );
}

export function CategoryMainPanel({ toolbar, browser, insights }) {
  return <DeskSplitLayout sidebar={insights} main={<Stack spacing={2}>{toolbar}{browser}</Stack>} sidebarWidth={340} />;
}

export function TagsToolbar({ routeState, selectedCount, onChangeFilter, onOpenCreate, onDeleteSelected }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1} justifyContent="space-between" alignItems={{ lg: "center" }}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Tags</Typography>
            <Typography variant="body2" color="text.secondary">
              Keep tags quick to search, clean, and delete without losing sight of how many posts rely on them.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="contained" onClick={onOpenCreate}>New Tag</Button>
            <Button variant="outlined" color="error" disabled={selectedCount === 0} onClick={onDeleteSelected}>Delete Selected</Button>
          </Stack>
        </Stack>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5}>
          <TextField
            label="Search tags"
            size="small"
            value={routeState.tagSearch}
            onChange={(event) => onChangeFilter("tagSearch", event.target.value)}
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            label="Visibility"
            size="small"
            value={routeState.tagVisibility}
            onChange={(event) => onChangeFilter("tagVisibility", event.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="internal">Internal</MenuItem>
          </TextField>
          <TextField
            select
            label="Sort"
            size="small"
            value={routeState.tagSort}
            onChange={(event) => onChangeFilter("tagSort", event.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="usage-desc">Most Used</MenuItem>
            <MenuItem value="name-asc">Name A-Z</MenuItem>
            <MenuItem value="name-desc">Name Z-A</MenuItem>
            <MenuItem value="updated-desc">Newest Updated</MenuItem>
          </TextField>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function TagRosterTable({ rows, page, pageSize, totalCount, selectedTagIds, onToggleSelection, onEdit, onChangePage }) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Tag</TableCell>
              <TableCell>Color</TableCell>
              <TableCell>Visibility</TableCell>
              <TableCell align="center">Posts</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const selected = selectedTagIds.includes(row.id);
              return (
                <TableRow key={row.id} hover selected={selected} sx={{ cursor: "pointer" }} onClick={() => onEdit(row)}>
                  <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      name={`tag-selection-${row.id}`}
                      aria-label={`Select ${row.name}`}
                      checked={selected}
                      onChange={() => onToggleSelection(row.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.25}>
                      <Typography variant="subtitle2">{row.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.slug || row.id}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {row.color ? <Chip size="small" label={row.color} sx={{ bgcolor: row.color, color: "common.white" }} /> : "-"}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.visibility ?? "public"} variant="outlined" />
                  </TableCell>
                  <TableCell align="center">{row.referenceCount}</TableCell>
                  <TableCell>{row.updatedOn || row.createdOn || "-"}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={(event) => {
                      event.stopPropagation();
                      onEdit(row);
                    }}>Edit</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No tags match the current roster filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={totalCount} page={Math.max(0, page - 1)} rowsPerPage={pageSize} rowsPerPageOptions={[pageSize]} onPageChange={onChangePage} />
    </Paper>
  );
}

export function TagBatchCard({ value, onChange, onCreate, duplicatePreview }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <Typography variant="subtitle1">Quick Add Tags</Typography>
        <Typography variant="body2" color="text.secondary">
          Paste comma-separated or line-separated tag names to create them in one pass.
        </Typography>
        <TextField label="Batch input" multiline minRows={5} value={value} onChange={(event) => onChange(event.target.value)} />
        {duplicatePreview.length > 0 ? (
          <Alert severity="info">Will skip: {duplicatePreview.join(", ")}</Alert>
        ) : null}
        <Button variant="contained" onClick={onCreate}>Create Batch</Button>
      </Stack>
    </Paper>
  );
}

function FeaturedMediaCard({ item, selected, mediaContentUrlFor, onSelect }) {
  return (
    <Card variant="outlined" sx={{ borderColor: selected ? "primary.main" : "divider" }}>
      <CardActionArea onClick={() => onSelect(item.id)}>
        <Box sx={{ height: 132, background: "linear-gradient(135deg, #f2ede4 0%, #e0d5c5 100%)", overflow: "hidden" }}>
          <Box component="img" src={mediaContentUrlFor(item.id, item.updatedOn)} alt={item.altText || item.displayName} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Box>
        <CardContent>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2" noWrap>{item.displayName}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{item.altText || item.category || "library"}</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function TaxonomyFeaturedMediaDialog({ open, selectedMediaId, items, loading, uploading, errorMessage, mediaContentUrlFor, onClose, onRefresh, onUploadFiles, onSelectMedia }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Choose Category Image</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Browse the media library visually or upload a new category image without leaving the taxonomy drawer.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" component="label" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Image"}
                <input hidden type="file" accept="image/*" onChange={(event) => onUploadFiles(event.target.files)} />
              </Button>
              <Button variant="text" onClick={onRefresh} disabled={loading}>Refresh</Button>
            </Stack>
          </Stack>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
            {items.map((item) => (
              <FeaturedMediaCard key={item.id} item={item} selected={selectedMediaId === item.id} mediaContentUrlFor={mediaContentUrlFor} onSelect={onSelectMedia} />
            ))}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryFormDrawer({
  open,
  formState,
  validationErrors,
  pathPreview,
  parentCategoryOptions,
  selectedFeaturedMedia,
  mediaContentUrlFor,
  onClose,
  onChangeField,
  onOpenGallery,
  onDelete,
  onSubmit
}) {
  const previewUrl = selectedFeaturedMedia ? mediaContentUrlFor(selectedFeaturedMedia.id, selectedFeaturedMedia.updatedOn) : "";
  const buildTranslationField = useTranslationFieldSupport({
    entityType: "blog-categories",
    entityId: formState.itemId ?? null,
    entityLabel: formState.name ?? "Category",
    sourceLocale: formState.locale ?? "en-US"
  });
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Stack sx={{ width: { xs: "100vw", sm: 480 }, p: 2.5 }} spacing={2}>
        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
          <Stack spacing={0.25}>
            <Typography variant="h6">{formState.itemId ? "Edit Category" : "New Category"}</Typography>
            <Typography variant="body2" color="text.secondary">
              Define how this category sits in the tree and what its public identity will look like.
            </Typography>
          </Stack>
          <Button variant="text" onClick={onClose}>Close</Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <TranslatableTextField
              label="Name"
              size="small"
              value={formState.name ?? ""}
              error={Boolean(validationErrors.name)}
              helperText={validationErrors.name ?? "Public category label"}
              onChange={(event) => onChangeField("name", event.target.value)}
              translationField={buildTranslationField({
                fieldPath: "name",
                fieldLabel: "Name",
                sourceValue: formState.name ?? "",
                valueKind: "text"
              })}
            />
            <TextField label="Path Preview" size="small" value={pathPreview} InputProps={{ readOnly: true }} helperText="Computed from the category name and parent." />
            <TextField
              select
              label="Parent"
              size="small"
              value={formState.parentCategoryId ?? ""}
              error={Boolean(validationErrors.parentCategoryId)}
              helperText={validationErrors.parentCategoryId ?? "Optional parent branch"}
              onChange={(event) => onChangeField("parentCategoryId", event.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="">No parent</option>
              {Array.isArray(parentCategoryOptions)
                ? parentCategoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))
                : null}
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField select label="Visibility" size="small" value={formState.visibility ?? "public"} onChange={(event) => onChangeField("visibility", event.target.value)} fullWidth>
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="internal">Internal</MenuItem>
              </TextField>
              <TextField label="Sort Order" size="small" type="number" value={formState.sortOrder ?? 0} onChange={(event) => onChangeField("sortOrder", Number.parseInt(event.target.value || "0", 10) || 0)} fullWidth />
            </Stack>
            <TranslatableMultilineTextField
              label="Description"
              size="small"
              value={formState.description ?? ""}
              fieldId="description"
              onChangeField={onChangeField}
              minRows={4}
              translationField={buildTranslationField({
                fieldPath: "description",
                fieldLabel: "Description",
                sourceValue: formState.description ?? "",
                valueKind: "rich-text"
              })}
            />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Featured Image</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={previewUrl || undefined} variant="rounded" sx={{ width: 96, height: 96 }} />
              <Stack spacing={1}>
                <Typography variant="subtitle2">{selectedFeaturedMedia?.displayName ?? "No image selected"}</Typography>
                <Button variant="outlined" size="small" onClick={onOpenGallery}>Choose Image</Button>
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={onSubmit} disabled={formState.saving}>{formState.saving ? "Saving..." : formState.itemId ? "Save Category" : "Create Category"}</Button>
          {formState.itemId ? <Button variant="outlined" color="error" onClick={() => onDelete(formState.itemId)}>Delete</Button> : null}
        </Stack>

        {formState.errorMessage ? <Alert severity="error">{formState.errorMessage}</Alert> : null}
      </Stack>
    </Drawer>
  );
}

export function TagFormDrawer({ open, formState, validationErrors, onClose, onChangeField, onDelete, onSubmit }) {
  const buildTranslationField = useTranslationFieldSupport({
    entityType: "blog-tags",
    entityId: formState.itemId ?? null,
    entityLabel: formState.name ?? "Tag",
    sourceLocale: formState.locale ?? "en-US"
  });
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Stack sx={{ width: { xs: "100vw", sm: 460 }, p: 2.5 }} spacing={2}>
        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
          <Stack spacing={0.25}>
            <Typography variant="h6">{formState.itemId ? "Edit Tag" : "New Tag"}</Typography>
            <Typography variant="body2" color="text.secondary">Keep tags fast to maintain, but explicit enough to avoid naming drift.</Typography>
          </Stack>
          <Button variant="text" onClick={onClose}>Close</Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <TranslatableTextField
              label="Name"
              size="small"
              value={formState.name ?? ""}
              error={Boolean(validationErrors.name)}
              helperText={validationErrors.name ?? "Public tag label"}
              onChange={(event) => onChangeField("name", event.target.value)}
              translationField={buildTranslationField({
                fieldPath: "name",
                fieldLabel: "Name",
                sourceValue: formState.name ?? "",
                valueKind: "text"
              })}
            />
            <TextField label="Color" size="small" value={formState.color ?? ""} error={Boolean(validationErrors.color)} helperText={validationErrors.color ?? "Optional tag color such as #0f766e"} onChange={(event) => onChangeField("color", event.target.value)} />
            <TextField select label="Visibility" size="small" value={formState.visibility ?? "public"} onChange={(event) => onChangeField("visibility", event.target.value)}>
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="internal">Internal</MenuItem>
            </TextField>
            <TranslatableMultilineTextField
              label="Description"
              size="small"
              value={formState.description ?? ""}
              fieldId="description"
              onChangeField={onChangeField}
              minRows={3}
              translationField={buildTranslationField({
                fieldPath: "description",
                fieldLabel: "Description",
                sourceValue: formState.description ?? "",
                valueKind: "rich-text"
              })}
            />
            <TranslatableTextField
              label="SEO Title"
              size="small"
              value={formState.seoTitle ?? ""}
              onChange={(event) => onChangeField("seoTitle", event.target.value)}
              translationField={buildTranslationField({
                fieldPath: "seoTitle",
                fieldLabel: "SEO Title",
                sourceValue: formState.seoTitle ?? "",
                valueKind: "text"
              })}
            />
            <TranslatableMultilineTextField
              label="SEO Description"
              size="small"
              value={formState.seoDescription ?? ""}
              fieldId="seoDescription"
              onChangeField={onChangeField}
              minRows={3}
              translationField={buildTranslationField({
                fieldPath: "seoDescription",
                fieldLabel: "SEO Description",
                sourceValue: formState.seoDescription ?? "",
                valueKind: "rich-text"
              })}
            />
          </Stack>
        </Paper>

        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={onSubmit} disabled={formState.saving}>{formState.saving ? "Saving..." : formState.itemId ? "Save Tag" : "Create Tag"}</Button>
          {formState.itemId ? <Button variant="outlined" color="error" onClick={() => onDelete(formState.itemId)}>Delete</Button> : null}
        </Stack>

        {formState.errorMessage ? <Alert severity="error">{formState.errorMessage}</Alert> : null}
      </Stack>
    </Drawer>
  );
}

export function TaxonomyDeskSnackbar({ snackbarState, onClose }) {
  return (
    <Snackbar open={snackbarState.open} autoHideDuration={3500} onClose={onClose}>
      <Alert onClose={onClose} severity={snackbarState.severity} variant="filled" sx={{ width: "100%" }}>
        {snackbarState.message}
      </Alert>
    </Snackbar>
  );
}
