import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useMemo } from "react";
import { CollectionsView } from "../../../frontend/src/ui/CollectionsView.jsx";
import { useEditorialOverview } from "./useEditorialOverview.js";

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
          color={tone === "attention" ? "warning" : "default"}
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

  return Array.isArray(item?.categoryIds) && item.categoryIds.length > 0
    ? item.categoryIds.length
    : 0;
}

function EditorialQueuePanel({
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
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h6">Editorial Queue</Typography>
            <Typography variant="body2" color="text.secondary">
              Cross-module post assignment and review readiness snapshot.
            </Typography>
          </Stack>
          <Button variant="outlined" size="small" onClick={onRefresh}>
            Refresh Queue
          </Button>
        </Stack>

        {queueState.errorMessage ? <Alert severity="error">{queueState.errorMessage}</Alert> : null}
        {!queueState.available && !queueState.errorMessage ? (
          <Alert severity="info">
            Queue data activates when `blog-posts` is delivered by `test-modules-content`.
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
              {filteredQueueItems.slice(0, 6).map((item) => (
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
                      {resolveCategorySummary(item)}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function BlogEditorialView({
  activeModuleLabel,
  collectionsDomain
}) {
  const workspace = useEditorialOverview({
    collectionsDomain
  });

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

  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          background: "linear-gradient(135deg, #1f2937 0%, #5f6f52 100%)",
          color: "common.white"
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.75)" }}>
            {activeModuleLabel}
          </Typography>
          <Typography variant="h4">Author Desk</Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
            Manage the author roster now and keep the editorial queue ready for the content module.
          </Typography>
        </Stack>
      </Paper>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" } }}
      >
        <SummaryCard label="Total Authors" value={workspace.summary.total} />
        <SummaryCard label="Active Roster" value={workspace.summary.active} />
        <SummaryCard label="Desk Editors" value={workspace.summary.editors} />
        <SummaryCard
          label="Guest Contributors"
          value={workspace.summary.guests}
          tone={workspace.summary.guests > 0 ? "attention" : "default"}
        />
      </Stack>

      <EditorialQueuePanel
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

