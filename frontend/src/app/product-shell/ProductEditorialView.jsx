import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useMemo } from "react";
import { CollectionsView } from "../../ui/CollectionsView.jsx";
import { useEditorialOverview } from "../../../../modules/test-modules-editorial/frontend/useEditorialOverview.js";

const HIDDEN_FIELD_IDS = new Set(["slug", "createdOn", "updatedOn", "lastPublishedOn"]);

function SummaryCard({ label, value, tone = "default" }) {
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
          color={tone === "attention" ? "warning" : tone === "ready" ? "success" : "default"}
          sx={{ alignSelf: "flex-start" }}
        />
      </Stack>
    </Paper>
  );
}

function buildVisibleSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  return {
    ...schema,
    fields: (schema.fields ?? []).filter((field) => !HIDDEN_FIELD_IDS.has(field.id))
  };
}

function hasLongBody(post) {
  return typeof post?.body === "string" && post.body.trim().length >= 120;
}

function hasCategories(post) {
  return Array.isArray(post?.categoryIds) && post.categoryIds.length > 0;
}

function hasPrimaryAuthor(post) {
  return typeof post?.primaryAuthorId === "string" && post.primaryAuthorId.length > 0;
}

function hasFeaturedMedia(post) {
  return typeof post?.featuredMediaId === "string" && post.featuredMediaId.length > 0;
}

function buildQueueDiagnostics(items = []) {
  return {
    ready: items.filter((item) => hasPrimaryAuthor(item) && hasCategories(item) && hasLongBody(item)).length,
    needsAttention: items.filter((item) => !(hasPrimaryAuthor(item) && hasCategories(item) && hasLongBody(item))).length,
    missingAuthor: items.filter((item) => !hasPrimaryAuthor(item)).length,
    missingCategories: items.filter((item) => !hasCategories(item)).length,
    shortBody: items.filter((item) => !hasLongBody(item)).length,
    missingFeaturedMedia: items.filter((item) => !hasFeaturedMedia(item)).length
  };
}

function buildAuthorCoverage(authors = []) {
  return {
    active: authors.filter((item) => item.status === "active").length,
    editors: authors.filter((item) => item.role === "editor" || item.role === "managing-editor").length,
    guests: authors.filter((item) => item.role === "guest").length,
    missingAvatar: authors.filter((item) => !item.avatarMediaId).length
  };
}

function buildAuthorAssignmentCoverage(authors = [], posts = []) {
  const authoredPostsById = new Map();
  const publishedPostsById = new Map();
  const attentionPostsById = new Map();

  for (const post of posts) {
    const authorId = typeof post?.primaryAuthorId === "string" ? post.primaryAuthorId : "";
    if (!authorId) {
      continue;
    }
    authoredPostsById.set(authorId, (authoredPostsById.get(authorId) ?? 0) + 1);
    if (post.status === "published") {
      publishedPostsById.set(authorId, (publishedPostsById.get(authorId) ?? 0) + 1);
    }
    if (!(hasPrimaryAuthor(post) && hasCategories(post) && hasLongBody(post) && hasFeaturedMedia(post))) {
      attentionPostsById.set(authorId, (attentionPostsById.get(authorId) ?? 0) + 1);
    }
  }

  return authors
    .map((author) => ({
      id: author.id,
      displayName: author.displayName ?? author.id,
      authoredPosts: authoredPostsById.get(author.id) ?? 0,
      publishedPosts: publishedPostsById.get(author.id) ?? 0,
      attentionPosts: attentionPostsById.get(author.id) ?? 0,
      missingAvatar: !author.avatarMediaId,
      inactiveWithAssignments: author.status !== "active" && (authoredPostsById.get(author.id) ?? 0) > 0
    }))
    .sort(
      (left, right) =>
        right.authoredPosts - left.authoredPosts ||
        right.publishedPosts - left.publishedPosts ||
        left.displayName.localeCompare(right.displayName)
    );
}

function resolveAuthorLabel(item, authorsById) {
  const explicitLabel =
    typeof item?.primaryAuthorIdTitle === "string" && item.primaryAuthorIdTitle.length > 0
      ? item.primaryAuthorIdTitle
      : null;
  if (explicitLabel) {
    return explicitLabel;
  }
  const author = authorsById.get(item?.primaryAuthorId);
  return author?.displayName ?? item?.primaryAuthorId ?? "unassigned";
}

function resolveCategorySummary(item) {
  if (Array.isArray(item?.categoryIdsTitles) && item.categoryIdsTitles.length > 0) {
    return item.categoryIdsTitles.join(", ");
  }
  return Array.isArray(item?.categoryIds) && item.categoryIds.length > 0 ? item.categoryIds.length : 0;
}

function EditorialDependenciesCard({ diagnostics, onOpenPosts, onOpenTaxonomies, onOpenMedia }) {
  const severity = diagnostics.needsAttention > 0 ? "warning" : "success";
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
          >
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Authoring Readiness</Typography>
              <Typography variant="body2" color="text.secondary">
                The author desk now surfaces cross-module blockers instead of acting like roster work is isolated.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="text" onClick={onOpenPosts}>
                Open Posts
              </Button>
              <Button variant="text" onClick={onOpenTaxonomies}>
                Open Taxonomies
              </Button>
              <Button variant="text" onClick={onOpenMedia}>
                Open Media
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`Ready posts: ${diagnostics.ready}`} color={diagnostics.ready > 0 ? "success" : "default"} />
            <Chip size="small" label={`Needs attention: ${diagnostics.needsAttention}`} color={diagnostics.needsAttention > 0 ? "warning" : "default"} />
            <Chip size="small" label={`Missing author: ${diagnostics.missingAuthor}`} variant="outlined" />
            <Chip size="small" label={`Missing categories: ${diagnostics.missingCategories}`} variant="outlined" />
            <Chip size="small" label={`Short body: ${diagnostics.shortBody}`} variant="outlined" />
            <Chip size="small" label={`Missing featured media: ${diagnostics.missingFeaturedMedia}`} variant="outlined" />
          </Stack>

          <Alert severity={severity}>
            {severity === "warning"
              ? "Posts still fail the baseline editorial readiness checks. Clear the blockers before treating the roster as release-ready."
              : "The current posts pass the baseline author/category/body checks."}
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
}

function EditorialCoverageCard({ coverageRows }) {
  const missingAvatarCount = coverageRows.filter((row) => row.missingAvatar).length;
  const inactiveAssignedCount = coverageRows.filter((row) => row.inactiveWithAssignments).length;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1">Assignment Coverage</Typography>
            <Typography variant="body2" color="text.secondary">
              Keep author workload, publishing coverage, and avatar/media gaps visible from the roster desk.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`Missing avatars ${missingAvatarCount}`} color={missingAvatarCount > 0 ? "warning" : "default"} />
            <Chip size="small" label={`Inactive with assignments ${inactiveAssignedCount}`} color={inactiveAssignedCount > 0 ? "warning" : "default"} />
          </Stack>

          <Stack spacing={1}>
            {coverageRows.slice(0, 6).map((row) => (
              <Paper key={row.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    <Typography variant="subtitle2">{row.displayName}</Typography>
                    <Chip size="small" label={`Assigned ${row.authoredPosts}`} variant="outlined" />
                    <Chip size="small" label={`Published ${row.publishedPosts}`} variant="outlined" />
                    <Chip size="small" label={`Needs attention ${row.attentionPosts}`} color={row.attentionPosts > 0 ? "warning" : "default"} />
                    {row.missingAvatar ? <Chip size="small" label="Missing avatar" color="warning" /> : null}
                    {row.inactiveWithAssignments ? <Chip size="small" label="Inactive with assignments" color="warning" /> : null}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function EditorialQueueCard({
  authors,
  queueState,
  queueFilters,
  filteredQueueItems,
  onChangeFilter,
  onRefresh,
  authorsById,
  computeReadiness
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
          >
            <Stack spacing={0.25}>
              <Typography variant="subtitle1">Editorial Queue</Typography>
              <Typography variant="body2" color="text.secondary">
                Assignment and readiness snapshot pulled from published module state.
              </Typography>
            </Stack>
            <Button variant="outlined" onClick={onRefresh}>
              Refresh Queue
            </Button>
          </Stack>

          {queueState.errorMessage ? <Alert severity="error">{queueState.errorMessage}</Alert> : null}
          {!queueState.available && !queueState.errorMessage ? (
            <Alert severity="info">
              Queue data activates when the Posts module is installed and available.
            </Alert>
          ) : null}

          {queueState.available ? (
            <>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
                <TextField
                  select
                  label="Status"
                  size="small"
                  value={queueFilters.status}
                  onChange={(event) => onChangeFilter("status", event.target.value)}
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
                  label="Primary Author"
                  size="small"
                  value={queueFilters.primaryAuthorId}
                  onChange={(event) => onChangeFilter("primaryAuthorId", event.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {authors.map((author) => (
                    <MenuItem key={author.id} value={author.id}>
                      {author.displayName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Readiness"
                  size="small"
                  value={queueFilters.readiness}
                  onChange={(event) => onChangeFilter("readiness", event.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="needs-attention">Needs Attention</MenuItem>
                </TextField>
              </Stack>

              {queueState.loading ? (
                <Typography variant="body2" color="text.secondary">
                  Loading queue...
                </Typography>
              ) : null}

              {filteredQueueItems.length === 0 && !queueState.loading ? (
                <Typography variant="body2" color="text.secondary">
                  No posts match the current editorial filters.
                </Typography>
              ) : null}

              <Stack spacing={1.5}>
                {filteredQueueItems.slice(0, 8).map((item) => (
                  <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                        <Typography variant="subtitle2">{item.title ?? item.slug ?? item.id}</Typography>
                        <Chip size="small" label={item.status ?? "draft"} />
                        <Chip
                          size="small"
                          label={computeReadiness(item)}
                          color={computeReadiness(item) === "ready" ? "success" : "warning"}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Primary author: {resolveAuthorLabel(item, authorsById)} | Categories:{" "}
                        {resolveCategorySummary(item)} | Featured media: {hasFeaturedMedia(item) ? "ready" : "missing"}
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ProductEditorialView({ navigate = null, collectionsDomain }) {
  const workspace = useEditorialOverview({ collectionsDomain });
  const visibleSchemaState = useMemo(
    () => ({
      ...collectionsDomain.collectionSchemaState,
      collection: buildVisibleSchema(collectionsDomain.collectionSchemaState.collection)
    }),
    [collectionsDomain.collectionSchemaState]
  );
  const authorsById = useMemo(
    () => new Map(workspace.authors.map((author) => [author.id, author])),
    [workspace.authors]
  );
  const queueDiagnostics = useMemo(
    () => buildQueueDiagnostics(workspace.queueState.items),
    [workspace.queueState.items]
  );
  const coverage = useMemo(() => buildAuthorCoverage(workspace.authors), [workspace.authors]);
  const assignmentCoverage = useMemo(
    () => buildAuthorAssignmentCoverage(workspace.authors, workspace.queueState.items),
    [workspace.authors, workspace.queueState.items]
  );

  function openRoute(moduleId) {
    if (typeof navigate !== "function") {
      return;
    }
    navigate({ moduleId }, { replace: false });
  }

  return (
    <Stack spacing={2}>
      <Card
        variant="outlined"
        sx={{
          p: 2,
          background: "linear-gradient(135deg, #111827 0%, #134e4a 100%)",
          color: "common.white"
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.75)" }}>
            Authors
          </Typography>
          <Typography variant="h4">Editorial Control Desk</Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
            Maintain the roster, expose post readiness blockers, and keep author-linked media and taxonomy ownership visible.
          </Typography>
        </Stack>
      </Card>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" } }}
      >
        <SummaryCard label="Total Authors" value={workspace.summary.total} />
        <SummaryCard label="Active Roster" value={coverage.active} />
        <SummaryCard label="Desk Editors" value={coverage.editors} />
        <SummaryCard
          label="Guest Contributors"
          value={coverage.guests}
          tone={coverage.guests > 0 ? "attention" : "default"}
        />
        <SummaryCard
          label="Missing Avatars"
          value={coverage.missingAvatar}
          tone={coverage.missingAvatar > 0 ? "attention" : "ready"}
        />
      </Stack>

      <EditorialDependenciesCard
        diagnostics={queueDiagnostics}
        onOpenPosts={() => openRoute("test-modules-content")}
        onOpenTaxonomies={() => openRoute("test-modules-taxonomy")}
        onOpenMedia={() => openRoute("test-modules-media-manager")}
      />

      <EditorialCoverageCard coverageRows={assignmentCoverage} />

      <EditorialQueueCard
        authors={workspace.authors}
        queueState={workspace.queueState}
        queueFilters={workspace.queueFilters}
        filteredQueueItems={workspace.filteredQueueItems}
        onChangeFilter={(fieldId, value) =>
          workspace.setQueueFilters((previous) => ({
            ...previous,
            [fieldId]: value
          }))
        }
        onRefresh={workspace.reloadQueue}
        authorsById={authorsById}
        computeReadiness={workspace.computeReadiness}
      />

      <CollectionsView
        workspaceLabel="Author Roster"
        collectionsState={collectionsDomain.collectionsState}
        activeCollectionId={collectionsDomain.activeCollectionId}
        isCollectionAvailable={collectionsDomain.isActiveCollectionAvailable}
        unavailableMessage={
          collectionsDomain.isActiveCollectionAvailable
            ? null
            : collectionsDomain.activeCollectionUnavailableMessage
        }
        onSelectCollection={collectionsDomain.handleSelectCollection}
        schemaState={visibleSchemaState}
        itemsState={collectionsDomain.collectionItemsState}
        referenceOptionsState={collectionsDomain.referenceOptionsState}
        filterState={collectionsDomain.collectionFilterState}
        onChangeFilter={collectionsDomain.handleCollectionFilterChange}
        onClearFilter={collectionsDomain.handleClearCollectionFilters}
        formState={collectionsDomain.collectionFormState}
        onChangeForm={collectionsDomain.handleCollectionFormChange}
        onSubmitForm={collectionsDomain.handleSubmitCollectionForm}
        onEditItem={collectionsDomain.handleEditCollectionItem}
        onDeleteItem={collectionsDomain.handleDeleteCollectionItem}
        onResetForm={collectionsDomain.handleResetCollectionForm}
        inlineCreateState={collectionsDomain.inlineCreateState}
        onInlineCreateReference={collectionsDomain.handleInlineCreateReference}
        onInlineCreateFormChange={collectionsDomain.handleInlineCreateFormChange}
        onCloseInlineCreate={collectionsDomain.handleCloseInlineCreate}
        onSubmitInlineCreate={collectionsDomain.handleSubmitInlineCreate}
        onRunCollectionErrorAction={collectionsDomain.handleRunCollectionErrorAction}
      />
    </Stack>
  );
}
