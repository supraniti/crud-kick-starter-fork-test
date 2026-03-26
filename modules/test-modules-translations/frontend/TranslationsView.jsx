import {
  Alert,
  Box,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { fetchReferenceCollectionItems } from "../../../frontend/src/api/reference.js";
import {
  buildTranslationUnitKey
} from "../shared/translation-entry.mjs";
import {
  collectTranslatableFieldsForEntity,
  listSupportedTranslationEntityTypes,
  resolveTranslationEntityLabel,
  resolveTranslationEntityManifest
} from "../shared/translation-field-manifest.mjs";
import {
  listSupportedTranslationLocales,
  readLocaleLabel
} from "../shared/translation-locale-catalog.mjs";
import { fetchTranslationUnits } from "./api.js";
import { TranslationDialog } from "./TranslationDialog.jsx";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function buildEntityTypeLabel(entityType) {
  if (entityType === "page-layouts") {
    return "Layouts";
  }
  const manifest = resolveTranslationEntityManifest(entityType);
  return manifest?.entityLabel ?? entityType;
}

function createInventoryRowFromField(field, translationUnit, localeCode) {
  const translatedValue = translationUnit?.translations?.[localeCode] ?? "";
  const stale = Boolean(translationUnit?.sourceValue) && translationUnit.sourceValue !== field.sourceValue;
  return {
    id: buildTranslationUnitKey(field.entityType, field.entityId, field.fieldPath),
    entityType: field.entityType,
    entityId: field.entityId,
    entityLabel: field.entityLabel,
    fieldPath: field.fieldPath,
    fieldLabel: field.fieldLabel,
    sourceLocale: field.sourceLocale,
    sourceValue: field.sourceValue,
    valueKind: field.valueKind,
    translatedValue,
    translationUnit,
    status: stale ? "stale" : translatedValue ? "translated" : "missing",
    updatedOn: translationUnit?.updatedOn ?? null
  };
}

function createOrphanInventoryRow(unit, localeCode) {
  const translatedValue = unit?.translations?.[localeCode] ?? "";
  return {
    id: buildTranslationUnitKey(unit.entityType, unit.entityId, unit.fieldPath),
    entityType: unit.entityType,
    entityId: unit.entityId,
    entityLabel: unit.entityLabel ?? "Missing source record",
    fieldPath: unit.fieldPath,
    fieldLabel: unit.fieldLabel ?? unit.fieldPath,
    sourceLocale: unit.sourceLocale ?? "en-US",
    sourceValue: unit.sourceValue ?? "",
    valueKind: unit.valueKind ?? "text",
    translatedValue,
    translationUnit: unit,
    status: "orphaned",
    updatedOn: unit.updatedOn ?? null
  };
}

function summarizeRows(rows) {
  return {
    total: rows.length,
    translated: rows.filter((row) => row.status === "translated").length,
    missing: rows.filter((row) => row.status === "missing").length,
    stale: rows.filter((row) => row.status === "stale").length,
    orphaned: rows.filter((row) => row.status === "orphaned").length
  };
}

function readStatusColor(status) {
  if (status === "translated") {
    return "success";
  }
  if (status === "stale") {
    return "warning";
  }
  if (status === "orphaned") {
    return "error";
  }
  return "default";
}

function buildSearchableText(row) {
  return [
    row.entityLabel,
    row.fieldLabel,
    row.sourceValue,
    row.translatedValue,
    buildEntityTypeLabel(row.entityType)
  ]
    .map((value) => normalizeText(value))
    .join(" ")
    .toLowerCase();
}

async function fetchEntityRecords(collectionId) {
  const payload = await fetchReferenceCollectionItems({
    collectionId,
    limit: 5000
  });
  return toArray(payload?.items);
}

async function loadInventorySources() {
  const entityTypes = listSupportedTranslationEntityTypes();
  const translationUnitsPayload = await fetchTranslationUnits(5000);
  const translationUnits = toArray(translationUnitsPayload?.items);
  const sourceEntries = await Promise.all(
    entityTypes.map(async (entityType) => [entityType, await fetchEntityRecords(entityType)])
  );
  return {
    sourceRecordsByType: new Map(sourceEntries),
    translationUnits
  };
}

function createTranslationFieldFromRow(row) {
  return {
    entityType: row.entityType,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    fieldPath: row.fieldPath,
    fieldLabel: row.fieldLabel,
    sourceLocale: row.sourceLocale,
    sourceValue: row.sourceValue,
    valueKind: row.valueKind
  };
}

export function TranslationsView({ activeModuleLabel }) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [localeCode, setLocaleCode] = useState("fr-FR");
  const [sourceRecordsByType, setSourceRecordsByType] = useState(() => new Map());
  const [translationUnits, setTranslationUnits] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);

  const loadInventory = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const payload = await loadInventorySources();
      setSourceRecordsByType(payload.sourceRecordsByType);
      setTranslationUnits(payload.translationUnits);
    } catch (error) {
      setErrorMessage(error?.message ?? "Failed to load translation inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInventory();
  }, []);

  const inventoryRows = useMemo(() => {
    const rows = [];
    const unitByKey = new Map(
      translationUnits.map((unit) => [
        buildTranslationUnitKey(unit.entityType, unit.entityId, unit.fieldPath),
        unit
      ])
    );
    const matchedKeys = new Set();

    for (const entityType of listSupportedTranslationEntityTypes()) {
      const items = sourceRecordsByType.get(entityType) ?? [];
      for (const item of items) {
        const fields = collectTranslatableFieldsForEntity(entityType, item);
        for (const field of fields) {
          const key = buildTranslationUnitKey(field.entityType, field.entityId, field.fieldPath);
          const unit = unitByKey.get(key) ?? null;
          matchedKeys.add(key);
          rows.push(createInventoryRowFromField(field, unit, localeCode));
        }
      }
    }

    for (const unit of translationUnits) {
      const key = buildTranslationUnitKey(unit.entityType, unit.entityId, unit.fieldPath);
      if (matchedKeys.has(key)) {
        continue;
      }
      rows.push(createOrphanInventoryRow(unit, localeCode));
    }

    return rows;
  }, [localeCode, sourceRecordsByType, translationUnits]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return inventoryRows
      .filter((row) => (entityFilter === "all" ? true : row.entityType === entityFilter))
      .filter((row) => (statusFilter === "all" ? true : row.status === statusFilter))
      .filter((row) =>
        normalizedSearch.length === 0 ? true : buildSearchableText(row).includes(normalizedSearch)
      )
      .sort(
        (left, right) =>
          `${left.entityLabel}`.localeCompare(`${right.entityLabel}`) ||
          `${left.fieldLabel}`.localeCompare(`${right.fieldLabel}`)
      );
  }, [entityFilter, inventoryRows, searchTerm, statusFilter]);

  const summary = useMemo(() => summarizeRows(inventoryRows), [inventoryRows]);

  return (
    <Box sx={{ p: 2, display: "grid", gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary">
              {activeModuleLabel}
            </Typography>
            <Typography variant="h5">Translations Desk</Typography>
            <Typography variant="body2" color="text.secondary">
              Audit field-level translation coverage, spot stale strings, and open the same popup used inside authoring forms.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Locale"
              value={localeCode}
              onChange={(event) => setLocaleCode(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              {listSupportedTranslationLocales().map((locale) => (
                <MenuItem key={locale.code} value={locale.code}>
                  {locale.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Source Type"
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="all">All source types</MenuItem>
              {listSupportedTranslationEntityTypes().map((entityType) => (
                <MenuItem key={entityType} value={entityType}>
                  {buildEntityTypeLabel(entityType)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="translated">Translated</MenuItem>
              <MenuItem value="missing">Missing</MenuItem>
              <MenuItem value="stale">Stale</MenuItem>
              <MenuItem value="orphaned">Orphaned</MenuItem>
            </TextField>
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`Locale ${readLocaleLabel(localeCode)}`} color="primary" variant="outlined" />
            <Chip label={`${summary.translated} translated`} color="success" variant="outlined" />
            <Chip label={`${summary.missing} missing`} variant="outlined" />
            <Chip label={`${summary.stale} stale`} color="warning" variant="outlined" />
            <Chip label={`${summary.orphaned} orphaned`} color="error" variant="outlined" />
            <Chip label={`${summary.total} total`} variant="outlined" />
          </Stack>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {loading ? <Alert severity="info">Loading translation inventory...</Alert> : null}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Field</TableCell>
              <TableCell>Source Value</TableCell>
              <TableCell>Translation</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow
                key={row.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => setSelectedRow(row)}
              >
                <TableCell>
                  <Chip
                    size="small"
                    label={row.status}
                    color={readStatusColor(row.status)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="body2" fontWeight={600}>
                      {row.entityLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {buildEntityTypeLabel(row.entityType)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="body2">{row.fieldLabel}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.fieldPath}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ maxWidth: 340 }}>
                  <Typography variant="body2" noWrap title={row.sourceValue}>
                    {normalizeText(row.sourceValue, "—")}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 340 }}>
                  <Typography variant="body2" noWrap title={row.translatedValue}>
                    {normalizeText(row.translatedValue, "—")}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {normalizeText(row.updatedOn, "—")}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Alert severity="info">No translation rows matched the current filters.</Alert>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <TranslationDialog
        open={Boolean(selectedRow)}
        field={selectedRow ? createTranslationFieldFromRow(selectedRow) : null}
        onClose={() => setSelectedRow(null)}
        onSaved={() => {
          void loadInventory();
        }}
      />
    </Box>
  );
}
