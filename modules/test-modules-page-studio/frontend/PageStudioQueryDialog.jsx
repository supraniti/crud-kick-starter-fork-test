import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import {
  buildPageStudioQueryDefinition,
  PAGE_STUDIO_QUERY_DEFINITIONS,
  resolvePageStudioQueryDefinition
} from "../shared/page-studio-queries.mjs";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function createPostDetailStarterQueries(queryParams = []) {
  const slugParamId = queryParams.find((entry) => entry?.id === "slug")?.id ?? queryParams[0]?.id ?? "slug";
  return [
    buildPageStudioQueryDefinition("primary-post-by-param", {
      id: "primary-post",
      label: "Primary Post",
      paramId: slugParamId
    }),
    buildPageStudioQueryDefinition("related-posts-by-author", {
      id: "related-author",
      label: "More From This Author"
    }),
    buildPageStudioQueryDefinition("related-posts-by-category", {
      id: "related-category",
      label: "More From This Category"
    }),
    buildPageStudioQueryDefinition("related-posts-by-tag", {
      id: "related-tag",
      label: "More Like This"
    })
  ];
}

function createCategoryDetailStarterQueries(queryParams = []) {
  const slugParamId = queryParams.find((entry) => entry?.id === "slug")?.id ?? queryParams[0]?.id ?? "slug";
  return [
    buildPageStudioQueryDefinition("primary-category-by-param", {
      id: "primary-category",
      label: "Primary Category",
      paramId: slugParamId
    }),
    buildPageStudioQueryDefinition("posts-by-category", {
      id: "category-posts",
      label: "Category Posts",
      bindAs: "categoryPosts",
      limit: 12
    })
  ];
}

export function PageStudioQueryDialog({
  open,
  queryParams = [],
  initialQueries = [],
  onClose,
  onSave
}) {
  const [queries, setQueries] = useState(() => cloneJson(initialQueries));
  const [selectedQueryId, setSelectedQueryId] = useState(() => initialQueries[0]?.id ?? null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const nextQueries = cloneJson(initialQueries);
    setQueries(nextQueries);
    setSelectedQueryId(nextQueries[0]?.id ?? null);
  }, [initialQueries, open]);

  const selectedQuery = useMemo(
    () => queries.find((entry) => entry.id === selectedQueryId) ?? null,
    [queries, selectedQueryId]
  );
  const selectedDefinition = resolvePageStudioQueryDefinition(selectedQuery?.kind);

  function patchQuery(queryId, patch) {
    setQueries((current) =>
      current.map((entry) => (entry.id === queryId ? { ...entry, ...patch } : entry))
    );
  }

  function changeQueryKind(queryId, nextKind) {
    const currentEntry = queries.find((entry) => entry.id === queryId) ?? {};
    const rebuilt = buildPageStudioQueryDefinition(nextKind, {
      id: currentEntry.id,
      label: currentEntry.label,
      bindAs: currentEntry.bindAs,
      paramId: currentEntry.paramId,
      lookupField: currentEntry.lookupField,
      itemId: currentEntry.itemId,
      limit: currentEntry.limit,
      sortKey: currentEntry.sortKey,
      sortDirection: currentEntry.sortDirection
    });
    setQueries((current) => current.map((entry) => (entry.id === queryId ? rebuilt : entry)));
  }

  function addQuery(kind = PAGE_STUDIO_QUERY_DEFINITIONS[0]?.kind ?? "primary-post-by-param") {
    const nextQuery = buildPageStudioQueryDefinition(kind, {
      id: `query-${queries.length + 1}`
    });
    setQueries((current) => [...current, nextQuery]);
    setSelectedQueryId(nextQuery.id);
  }

  function removeQuery(queryId) {
    const nextQueries = queries.filter((entry) => entry.id !== queryId);
    setQueries(nextQueries);
    setSelectedQueryId(nextQueries[0]?.id ?? null);
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Page Queries</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Alert severity="info">
            Queries declared here are the page-owned data contract. Preview, bindings, and Live should all consume this same query list.
          </Alert>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const nextQueries = createPostDetailStarterQueries(queryParams);
                setQueries(nextQueries);
                setSelectedQueryId(nextQueries[0]?.id ?? null);
              }}
            >
              Post Detail Starter
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const nextQueries = createCategoryDetailStarterQueries(queryParams);
                setQueries(nextQueries);
                setSelectedQueryId(nextQueries[0]?.id ?? null);
              }}
            >
              Category Detail Starter
            </Button>
            <Button size="small" variant="contained" onClick={() => addQuery()}>
              Add Query
            </Button>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "280px minmax(0, 1fr)" },
              gap: 1.5,
              minHeight: 420
            }}
          >
            <Paper variant="outlined" square sx={{ p: 1, minHeight: 0, overflow: "auto" }}>
              <Stack spacing={0.75}>
                {queries.map((entry) => {
                  const definition = resolvePageStudioQueryDefinition(entry.kind);
                  const selected = entry.id === selectedQueryId;
                  return (
                    <Paper
                      key={entry.id}
                      variant="outlined"
                      square
                      sx={{
                        p: 1,
                        borderColor: selected ? "primary.main" : "divider",
                        bgcolor: selected ? "action.selected" : "background.paper"
                      }}
                    >
                      <Stack direction="row" spacing={0.75} alignItems="flex-start">
                        <Button
                          size="small"
                          variant={selected ? "contained" : "text"}
                          sx={{ flex: 1, justifyContent: "flex-start" }}
                          onClick={() => setSelectedQueryId(entry.id)}
                        >
                          {entry.label}
                        </Button>
                        <Tooltip title="Remove query">
                          <IconButton size="small" onClick={() => removeQuery(entry.id)}>
                            ×
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {definition.label}
                      </Typography>
                    </Paper>
                  );
                })}
                {queries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No queries yet. Add one or apply a starter pack.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>

            <Paper variant="outlined" square sx={{ p: 1.25, minHeight: 0, overflow: "auto" }}>
              {selectedQuery ? (
                <Stack spacing={1.25}>
                  <Typography variant="subtitle2">{selectedDefinition.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDefinition.summary}
                  </Typography>
                  <TextField
                    select
                    label="Query Type"
                    size="small"
                    value={selectedQuery.kind}
                    onChange={(event) => changeQueryKind(selectedQuery.id, event.target.value)}
                  >
                    {PAGE_STUDIO_QUERY_DEFINITIONS.map((definition) => (
                      <MenuItem key={definition.kind} value={definition.kind}>
                        {definition.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField
                      label="Query Id"
                      size="small"
                      value={selectedQuery.id}
                      onChange={(event) => patchQuery(selectedQuery.id, { id: event.target.value })}
                    />
                    <TextField
                      label="Label"
                      size="small"
                      value={selectedQuery.label}
                      onChange={(event) => patchQuery(selectedQuery.id, { label: event.target.value })}
                    />
                    <TextField
                      label="Bind As"
                      size="small"
                      value={selectedQuery.bindAs ?? ""}
                      onChange={(event) => patchQuery(selectedQuery.id, { bindAs: event.target.value })}
                    />
                  </Stack>
                  {selectedDefinition.category === "primary" ? (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <TextField
                        select
                        label="Route Param"
                        size="small"
                        value={selectedQuery.paramId ?? ""}
                        onChange={(event) => patchQuery(selectedQuery.id, { paramId: event.target.value })}
                        helperText="Which URL param should resolve this record?"
                      >
                        {queryParams.map((entry) => (
                          <MenuItem key={entry.id} value={entry.id}>
                            {entry.label} ({entry.id})
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        label="Lookup Field"
                        size="small"
                        value={selectedQuery.lookupField ?? "slug"}
                        onChange={(event) => patchQuery(selectedQuery.id, { lookupField: event.target.value })}
                      >
                        <MenuItem value="slug">slug</MenuItem>
                        <MenuItem value="id">id</MenuItem>
                      </TextField>
                    </Stack>
                  ) : (
                    <>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField
                          label="Pinned Item Id"
                          size="small"
                          value={selectedQuery.itemId ?? ""}
                          onChange={(event) => patchQuery(selectedQuery.id, { itemId: event.target.value })}
                          helperText="Optional. Leave blank to derive from the current primary record."
                        />
                        <TextField
                          label="Limit"
                          size="small"
                          type="number"
                          value={selectedQuery.limit ?? ""}
                          onChange={(event) => patchQuery(selectedQuery.id, { limit: Number(event.target.value) || null })}
                        />
                      </Stack>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <TextField
                          select
                          label="Sort Key"
                          size="small"
                          value={selectedQuery.sortKey ?? "publishedOn"}
                          onChange={(event) => patchQuery(selectedQuery.id, { sortKey: event.target.value })}
                        >
                          <MenuItem value="publishedOn">publishedOn</MenuItem>
                          <MenuItem value="updatedOn">updatedOn</MenuItem>
                          <MenuItem value="title">title</MenuItem>
                          <MenuItem value="name">name</MenuItem>
                        </TextField>
                        <TextField
                          select
                          label="Sort Direction"
                          size="small"
                          value={selectedQuery.sortDirection ?? "desc"}
                          onChange={(event) => patchQuery(selectedQuery.id, { sortDirection: event.target.value })}
                        >
                          <MenuItem value="desc">Descending</MenuItem>
                          <MenuItem value="asc">Ascending</MenuItem>
                        </TextField>
                      </Stack>
                    </>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select a query to configure it.
                </Typography>
              )}
            </Paper>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave(cloneJson(queries))}
        >
          Save Queries
        </Button>
      </DialogActions>
    </Dialog>
  );
}
