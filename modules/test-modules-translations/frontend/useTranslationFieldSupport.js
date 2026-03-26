import { useCallback } from "react";
import { normalizeLocaleCode } from "../shared/translation-locale-catalog.mjs";

function normalizeEntityType(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function normalizeEntityLabel(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "Record";
}

export function useTranslationFieldSupport({
  entityType,
  entityId,
  entityLabel,
  sourceLocale = "en-US"
}) {
  return useCallback(
    ({ fieldPath, fieldLabel, sourceValue, valueKind = "text" }) => ({
      entityType: normalizeEntityType(entityType),
      entityId: entityId ?? null,
      entityLabel: normalizeEntityLabel(entityLabel),
      fieldPath,
      fieldLabel,
      sourceValue: typeof sourceValue === "string" ? sourceValue : "",
      sourceLocale: normalizeLocaleCode(sourceLocale),
      valueKind
    }),
    [entityId, entityLabel, entityType, sourceLocale]
  );
}
