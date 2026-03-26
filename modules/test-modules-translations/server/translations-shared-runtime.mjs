import { badRequestWithConflicts } from "../../../server/src/domains/reference/collections/services/reference-collection-route-shared-domain-service.js";
import {
  buildTranslationUnitKey,
  normalizeOptionalText,
  parseTranslationsJson,
  serializeTranslationsJson
} from "../shared/translation-entry.mjs";

export const MODULE_ID = "test-modules-translations";
export const TRANSLATION_UNITS_COLLECTION_ID = "translation-units";
export const TRANSLATIONS_PRODUCT_BINDING_KEY = "translations-projection";
export const PUBLIC_TRANSLATIONS_COLLECTION_PATH = "publicTranslations";
export const PUBLIC_TRANSLATIONS_PROJECTION_SCOPE = "public-translations";

function toTimestamp(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeValueKind(value, fallback = "text") {
  return value === "rich-text" ? "rich-text" : fallback;
}

export function buildPreparedTranslationUnitValue(input = {}, currentItem = null) {
  const timestamp = toTimestamp();
  const translations = parseTranslationsJson(input?.translations ?? input?.translationsJson ?? currentItem?.translationsJson);
  return {
    ...(currentItem ?? {}),
    entityType: normalizeOptionalText(input?.entityType ?? currentItem?.entityType),
    entityId: normalizeOptionalText(input?.entityId ?? currentItem?.entityId),
    fieldPath: normalizeOptionalText(input?.fieldPath ?? currentItem?.fieldPath),
    fieldLabel: normalizeOptionalText(input?.fieldLabel ?? currentItem?.fieldLabel),
    entityLabel: normalizeOptionalText(input?.entityLabel ?? currentItem?.entityLabel),
    sourceLocale: normalizeOptionalText(input?.sourceLocale ?? currentItem?.sourceLocale) ?? "en-US",
    sourceValue: typeof (input?.sourceValue ?? currentItem?.sourceValue) === "string" ? input?.sourceValue ?? currentItem?.sourceValue ?? "" : "",
    valueKind: normalizeValueKind(input?.valueKind ?? currentItem?.valueKind),
    translations,
    createdOn: currentItem?.createdOn ?? normalizeOptionalText(input?.createdOn ?? currentItem?.createdOn) ?? timestamp,
    updatedOn: timestamp
  };
}

export function buildPersistedTranslationUnitBody(preparedValue = {}) {
  return {
    entityType: preparedValue.entityType,
    entityId: preparedValue.entityId,
    fieldPath: preparedValue.fieldPath,
    fieldLabel: preparedValue.fieldLabel,
    entityLabel: preparedValue.entityLabel,
    sourceLocale: preparedValue.sourceLocale,
    sourceValue: preparedValue.sourceValue ?? "",
    valueKind: preparedValue.valueKind ?? "text",
    translationsJson: serializeTranslationsJson(preparedValue.translations),
    createdOn: preparedValue.createdOn,
    updatedOn: preparedValue.updatedOn
  };
}

export function buildExposedTranslationUnit(item = null) {
  if (!item || typeof item !== "object") {
    return item ?? null;
  }
  const translations = parseTranslationsJson(item.translationsJson);
  return {
    ...item,
    translations,
    translatedLocaleCount: Object.keys(translations).length,
    translationKey: buildTranslationUnitKey(item.entityType, item.entityId, item.fieldPath)
  };
}

export async function listExistingTranslationUnits(handler) {
  const payload = await handler.list({ limit: 5000, offset: 0 });
  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function findTranslationUnitByCompositeKey(handler, { entityType, entityId, fieldPath }) {
  const wantedKey = buildTranslationUnitKey(entityType, entityId, fieldPath);
  const items = await listExistingTranslationUnits(handler);
  return items.find((item) => buildTranslationUnitKey(item.entityType, item.entityId, item.fieldPath) === wantedKey) ?? null;
}

export function buildTranslationConflict(code, message, fieldId) {
  return {
    code,
    message,
    fieldId
  };
}

export function validationFailure(reply, conflicts, code = "TRANSLATION_UNIT_VALIDATION_FAILED") {
  return {
    ok: false,
    statusCode: 400,
    payload: badRequestWithConflicts(reply, conflicts, code)
  };
}
