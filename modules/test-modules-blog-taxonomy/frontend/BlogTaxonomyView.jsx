import {
  Button,
  Chip,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { useMemo } from "react";
import { CollectionsView } from "../../../frontend/src/ui/CollectionsView.jsx";
import { useTaxonomyWorkspace } from "./useTaxonomyWorkspace.js";

const TAGS_COLLECTION_ID = "blog-tags";
const CATEGORIES_COLLECTION_ID = "blog-categories";
const HIDDEN_FIELD_IDS_BY_COLLECTION = Object.freeze({
  [TAGS_COLLECTION_ID]: new Set(["slug", "usageCount", "createdOn", "updatedOn"]),
  [CATEGORIES_COLLECTION_ID]: new Set([
    "slug",
    "path",
    "depth",
    "usageCount",
    "createdOn",
    "updatedOn"
  ])
});

function SummaryCard({ label, value }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4">{value}</Typography>
      </Stack>
    </Paper>
  );
}

function buildVisibleSchema(collectionId, schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const hiddenFieldIds = HIDDEN_FIELD_IDS_BY_COLLECTION[collectionId] ?? new Set();
  return {
    ...schema,
    fields: (schema.fields ?? []).filter((field) => !hiddenFieldIds.has(field.id))
  };
}

function CollectionSwitcher({ activeCollectionId, onSelectCollection }) {
  const options = [
    {
      collectionId: CATEGORIES_COLLECTION_ID,
      label: "Category Tree"
    },
    {
      collectionId: TAGS_COLLECTION_ID,
      label: "Tags"
    }
  ];

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {options.map((option) => (
        <Button
          key={option.collectionId}
          variant={activeCollectionId === option.collectionId ? "contained" : "outlined"}
          size="small"
          onClick={() => onSelectCollection(option.collectionId)}
        >
          {option.label}
        </Button>
      ))}
    </Stack>
  );
}

function CategoryTreePanel({ rows }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6">Category Tree</Typography>
        <Typography variant="body2" color="text.secondary">
          Path and depth are module-managed. The tree below reflects persisted parent links only.
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No categories yet. Create a root category to seed the tree.
          </Typography>
        ) : (
          rows.map((row) => (
            <Paper key={row.id} variant="outlined" sx={{ p: 1.5, ml: row.treeDepth * 2 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                <Typography variant="subtitle2">{row.name}</Typography>
                <Chip size="small" label={`depth ${row.depth ?? row.treeDepth}`} />
                <Chip size="small" label={row.visibility ?? "public"} />
                {row.featuredMediaId ? <Chip size="small" label="featured media" color="secondary" /> : null}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {row.path}
              </Typography>
            </Paper>
          ))
        )}
      </Stack>
    </Paper>
  );
}

export function BlogTaxonomyView({
  activeModuleLabel,
  collectionsDomain
}) {
  const workspace = useTaxonomyWorkspace({
    collectionsDomain
  });

  const visibleSchemaState = useMemo(
    () => ({
      ...collectionsDomain.collectionSchemaState,
      collection: buildVisibleSchema(
        collectionsDomain.activeCollectionId,
        collectionsDomain.collectionSchemaState.collection
      )
    }),
    [collectionsDomain.activeCollectionId, collectionsDomain.collectionSchemaState]
  );

  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          background: "linear-gradient(135deg, #102a43 0%, #486581 100%)",
          color: "common.white"
        }}
      >
        <Stack spacing={1.5}>
          <Stack spacing={0.5}>
            <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.75)" }}>
              {activeModuleLabel}
            </Typography>
            <Typography variant="h4">Taxonomy Studio</Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
              Keep tags reusable and category hierarchy deterministic before content volume grows.
            </Typography>
          </Stack>
          <CollectionSwitcher
            activeCollectionId={collectionsDomain.activeCollectionId}
            onSelectCollection={collectionsDomain.handleSelectCollection}
          />
        </Stack>
      </Paper>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" } }}
      >
        <SummaryCard label={`Total ${workspace.summary.primaryLabel}`} value={workspace.summary.total} />
        <SummaryCard
          label={collectionsDomain.activeCollectionId === TAGS_COLLECTION_ID ? "Internal Tags" : "Root Categories"}
          value={workspace.summary.secondary}
        />
        <SummaryCard
          label={collectionsDomain.activeCollectionId === TAGS_COLLECTION_ID ? "Colored Tags" : "Internal Categories"}
          value={workspace.summary.tertiary}
        />
        <SummaryCard
          label={collectionsDomain.activeCollectionId === TAGS_COLLECTION_ID ? "Unused Tags" : "Deepest Branch"}
          value={workspace.summary.quaternary}
        />
      </Stack>

      {collectionsDomain.activeCollectionId === CATEGORIES_COLLECTION_ID ? (
        <CategoryTreePanel rows={workspace.categoryTreeRows} />
      ) : null}

      <CollectionsView
        workspaceLabel="Taxonomy Workspace"
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
