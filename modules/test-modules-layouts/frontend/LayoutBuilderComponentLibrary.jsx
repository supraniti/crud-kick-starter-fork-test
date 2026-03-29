import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Icon,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function buildLegacyEntry(descriptor = {}) {
  return {
    libraryKey: descriptor.componentKey,
    componentKey: descriptor.componentKey,
    displayName: descriptor.displayName,
    icon: descriptor.icon ?? "widgets",
    libraryCategory: descriptor.libraryCategory ?? descriptor.group ?? "General",
    group: descriptor.group ?? "General",
    description: descriptor.description ?? "Curated widget wrapper",
    useCase: descriptor.useCase ?? descriptor.description ?? "Reusable page widget",
    complexity: descriptor.complexity ?? "basic",
    originLabel: "Built-in",
    sourceLabel: descriptor.wrapperKind ?? "primitive",
    disabled: false,
    disabledReason: ""
  };
}

function normalizeSections({ sections = [], components = [] }) {
  if (Array.isArray(sections) && sections.length > 0) {
    return sections
      .map((section) => ({
        id: normalizeText(section.id, "section"),
        label: normalizeText(section.label, "Widgets"),
        entries: Array.isArray(section.entries) ? section.entries : []
      }))
      .filter((section) => section.entries.length > 0);
  }

  const entries = Array.isArray(components) ? components.map(buildLegacyEntry) : [];
  return entries.length > 0
    ? [
        {
          id: "widgets",
          label: "Widget Library",
          entries
        }
      ]
    : [];
}

function matchesSearch(entry, searchText) {
  if (!searchText) {
    return true;
  }
  const haystack = [
    entry.displayName,
    entry.description,
    entry.useCase,
    entry.libraryCategory,
    entry.group,
    entry.complexity,
    ...(Array.isArray(entry.keywords) ? entry.keywords : [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchText);
}

function deriveCategories(sections = []) {
  const categories = new Set();
  for (const section of sections) {
    for (const entry of section.entries) {
      categories.add(normalizeText(entry.libraryCategory, "General"));
    }
  }
  return ["All", ...[...categories].sort((left, right) => left.localeCompare(right))];
}

function WidgetTile({
  entry,
  selected = false,
  onSelectComponent
}) {
  return (
    <Paper
      variant="outlined"
      square
      sx={{
        p: 1.5,
        height: "100%",
        display: "grid",
        gap: 1,
        borderColor: selected ? "primary.main" : "divider",
        backgroundColor: selected ? "rgba(37,99,235,0.06)" : "background.paper",
        opacity: entry.disabled ? 0.64 : 1
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            display: "grid",
            placeItems: "center",
            backgroundColor: selected ? "primary.main" : "action.hover",
            color: selected ? "primary.contrastText" : "text.primary",
            flexShrink: 0
          }}
        >
          <Icon fontSize="small">{entry.icon ?? "widgets"}</Icon>
        </Box>
        <Stack spacing={0.15} minWidth={0}>
          <Typography variant="subtitle2" noWrap>
            {entry.displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {entry.originLabel ?? "Built-in"} · {entry.sourceLabel ?? entry.group ?? "Widget"}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
        <Chip size="small" label={entry.libraryCategory ?? entry.group ?? "General"} />
        <Chip size="small" variant="outlined" label={entry.complexity ?? "basic"} />
      </Stack>

      <Typography variant="body2" color="text.secondary">
        {entry.description ?? "Reusable page widget"}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {entry.useCase ?? "Choose the widget, then configure content, display, and behavior."}
      </Typography>

      {entry.disabled && entry.disabledReason ? (
        <Typography variant="caption" color="warning.main">
          {entry.disabledReason}
        </Typography>
      ) : null}

      <Button
        variant={selected ? "contained" : "outlined"}
        size="small"
        disabled={entry.disabled}
        onClick={() => onSelectComponent?.(entry)}
        sx={{ alignSelf: "flex-start", mt: "auto" }}
      >
        {selected ? "Using This Widget" : "Choose Widget"}
      </Button>
    </Paper>
  );
}

export function LayoutBuilderComponentLibrary({
  sections = [],
  components = [],
  selectedLibraryKey = "",
  selectedComponentKey = "",
  onSelectComponent
}) {
  const [searchValue, setSearchValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const normalizedSections = useMemo(
    () => normalizeSections({ sections, components }),
    [components, sections]
  );
  const categories = useMemo(() => deriveCategories(normalizedSections), [normalizedSections]);
  const normalizedSearch = searchValue.trim().toLowerCase();

  const visibleSections = useMemo(
    () =>
      normalizedSections
        .map((section) => ({
          ...section,
          entries: section.entries.filter((entry) => {
            const categoryMatches =
              categoryFilter === "All" ||
              normalizeText(entry.libraryCategory, "General") === categoryFilter;
            return categoryMatches && matchesSearch(entry, normalizedSearch);
          })
        }))
        .filter((section) => section.entries.length > 0),
    [categoryFilter, normalizedSearch, normalizedSections]
  );

  if (normalizedSections.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1.5}>
      <Stack spacing={1}>
        <Typography variant="subtitle1">Widget Library</Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a widget tile first. Then configure its content, display, behavior, and overrides.
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
        <TextField
          size="small"
          fullWidth
          label="Search widgets"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Icon fontSize="small">search</Icon>
              </InputAdornment>
            )
          }}
        />
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {categories.map((category) => (
            <Chip
              key={category}
              label={category}
              color={categoryFilter === category ? "primary" : "default"}
              variant={categoryFilter === category ? "filled" : "outlined"}
              onClick={() => setCategoryFilter(category)}
            />
          ))}
        </Stack>
      </Stack>

      {visibleSections.length > 0 ? (
        visibleSections.map((section) => (
          <Stack key={section.id} spacing={1}>
            <Typography variant="subtitle2">{section.label}</Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))"
                },
                gap: 1.25
              }}
            >
              {section.entries.map((entry) => {
                const isSelected =
                  normalizeText(selectedLibraryKey || selectedComponentKey) ===
                  normalizeText(entry.libraryKey ?? entry.componentKey);
                return (
                  <WidgetTile
                    key={entry.libraryKey ?? entry.componentKey}
                    entry={entry}
                    selected={isSelected}
                    onSelectComponent={onSelectComponent}
                  />
                );
              })}
            </Box>
          </Stack>
        ))
      ) : (
        <Paper variant="outlined" square sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No widgets match the current search or category filter.
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}
