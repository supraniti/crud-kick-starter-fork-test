import { fetchReferenceCollectionItems } from "../../../frontend/src/api/reference.js";

export const TRANSLATION_UNITS_COLLECTION_ID = "translation-units";
export const TRANSLATIONS_MODULE_ID = "test-modules-translations";

export async function lookupTranslationUnit({ entityType, entityId, fieldPath }) {
  const response = await fetch(
    `/api/reference/modules/${TRANSLATIONS_MODULE_ID}/translation-unit?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}&fieldPath=${encodeURIComponent(fieldPath)}`,
    {
      headers: {
        Accept: "application/json"
      }
    }
  );
  return response.json();
}

export async function upsertTranslationUnit(payload) {
  const response = await fetch(`/api/reference/modules/${TRANSLATIONS_MODULE_ID}/translation-unit/upsert`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function fetchTranslationUnits(limit = 5000) {
  return fetchReferenceCollectionItems({
    collectionId: TRANSLATION_UNITS_COLLECTION_ID,
    limit
  });
}
