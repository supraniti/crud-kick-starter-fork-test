import { normalizeTargetConfig } from "../../test-modules-remote-ops/server/remote-ops-shared-runtime.mjs";
import {
  listEligiblePrimarySourceRecords,
  resolvePageDeliveryPayload
} from "../../test-modules-pages/server/page-delivery-runtime.mjs";
import {
  CATEGORIES_COLLECTION_ID,
  LAYOUTS_COLLECTION_ID,
  PAGES_COLLECTION_ID,
  POSTS_COLLECTION_ID,
  isPagePublished,
  isPerRecordDeploymentMode,
  cloneJsonValue,
  normalizeOptionalText,
  toTimestamp
} from "../../test-modules-pages/server/distribution-shared-runtime.mjs";
import {
  buildReaderDeferredPayload,
  buildReaderPageBootstrapPayload
} from "../../test-modules-pages/server/page-application-view-runtime.mjs";
import {
  DEFAULT_SOURCE_LOCALE,
  listSupportedTranslationLocales,
  normalizeLocaleCode
} from "../shared/translation-locale-catalog.mjs";
import {
  buildTranslationProjectionDocumentId,
  readValueAtPath,
  writeValueAtPath
} from "../shared/translation-entry.mjs";
import { TRANSLATION_UNITS_COLLECTION_ID } from "./translations-shared-runtime.mjs";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function buildEntityCompositeKey(entityType, entityId) {
  const normalizedType = normalizeOptionalText(entityType) ?? "";
  const normalizedId = normalizeOptionalText(entityId) ?? "";
  return `${normalizedType}::${normalizedId}`;
}

function createPatchPath(parentPath, segment) {
  if (typeof segment === "number") {
    return `${parentPath}[${segment}]`;
  }
  return parentPath ? `${parentPath}.${segment}` : segment;
}

function collectJsonPatches(baseValue, localizedValue, pathPrefix = "", patches = []) {
  if (JSON.stringify(baseValue) === JSON.stringify(localizedValue)) {
    return patches;
  }

  const baseIsArray = Array.isArray(baseValue);
  const localizedIsArray = Array.isArray(localizedValue);
  if (baseIsArray || localizedIsArray) {
    if (!baseIsArray || !localizedIsArray || baseValue.length !== localizedValue.length) {
      patches.push({
        path: pathPrefix,
        value: cloneJsonValue(localizedValue)
      });
      return patches;
    }
    for (let index = 0; index < localizedValue.length; index += 1) {
      collectJsonPatches(baseValue[index], localizedValue[index], createPatchPath(pathPrefix, index), patches);
    }
    return patches;
  }

  const baseIsObject = Boolean(baseValue) && typeof baseValue === "object";
  const localizedIsObject = Boolean(localizedValue) && typeof localizedValue === "object";
  if (baseIsObject && localizedIsObject) {
    const keys = new Set([...Object.keys(baseValue), ...Object.keys(localizedValue)]);
    for (const key of keys) {
      collectJsonPatches(baseValue[key], localizedValue[key], createPatchPath(pathPrefix, key), patches);
    }
    return patches;
  }

  patches.push({
    path: pathPrefix,
    value: cloneJsonValue(localizedValue)
  });
  return patches;
}

function mapPrimarySourceTypeToEntityType(primarySourceType) {
  if (primarySourceType === "blog-post") {
    return POSTS_COLLECTION_ID;
  }
  if (primarySourceType === "blog-category") {
    return CATEGORIES_COLLECTION_ID;
  }
  return null;
}

function buildTranslationUnitLocaleIndex(translationUnits = [], localeCode = DEFAULT_SOURCE_LOCALE) {
  const normalizedLocale = normalizeLocaleCode(localeCode, DEFAULT_SOURCE_LOCALE);
  const localeIndex = new Map();

  for (const unit of toArray(translationUnits)) {
    const translatedValue =
      unit && unit.translations && typeof unit.translations === "object"
        ? normalizeText(unit.translations[normalizedLocale], "")
        : "";
    if (!translatedValue) {
      continue;
    }
    const entityKey = buildEntityCompositeKey(unit.entityType, unit.entityId);
    const currentUnits = localeIndex.get(entityKey) ?? [];
    currentUnits.push({
      fieldPath: unit.fieldPath,
      sourceValue: unit.sourceValue ?? "",
      translatedValue
    });
    localeIndex.set(entityKey, currentUnits);
  }

  return localeIndex;
}

function applyUnitsToRecord(entityType, record, localeIndex) {
  if (!record || typeof record !== "object" || !record.id) {
    return record ?? null;
  }
  const entityKey = buildEntityCompositeKey(entityType, record.id);
  const matchingUnits = localeIndex.get(entityKey) ?? [];
  if (matchingUnits.length === 0) {
    return record;
  }

  let localizedRecord = cloneJsonValue(record);
  for (const unit of matchingUnits) {
    const currentValue = readValueAtPath(localizedRecord, unit.fieldPath);
    if (typeof currentValue !== "string") {
      continue;
    }
    if (currentValue !== unit.sourceValue) {
      continue;
    }
    localizedRecord = writeValueAtPath(localizedRecord, unit.fieldPath, unit.translatedValue);
  }
  return localizedRecord;
}

function localizeEmbeddedMediaSummary(value, localeIndex) {
  if (!value || typeof value !== "object") {
    return value ?? null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => localizeEmbeddedMediaSummary(item, localeIndex));
  }
  if (!value.id) {
    return value;
  }
  return applyUnitsToRecord("media-items", value, localeIndex);
}

function localizeEntityRecord(entityType, record, localeIndex) {
  const localizedRecord = applyUnitsToRecord(entityType, record, localeIndex);
  if (!localizedRecord || typeof localizedRecord !== "object") {
    return localizedRecord;
  }

  if (entityType === POSTS_COLLECTION_ID) {
    return {
      ...localizedRecord,
      featuredMedia: localizeEmbeddedMediaSummary(localizedRecord.featuredMedia, localeIndex),
      galleryMedia: toArray(localizedRecord.galleryMedia).map((item) =>
        localizeEmbeddedMediaSummary(item, localeIndex)
      )
    };
  }

  if (entityType === CATEGORIES_COLLECTION_ID) {
    return {
      ...localizedRecord,
      featuredMedia: localizeEmbeddedMediaSummary(localizedRecord.featuredMedia, localeIndex)
    };
  }

  if (entityType === "blog-authors") {
    return {
      ...localizedRecord,
      avatarMedia: localizeEmbeddedMediaSummary(localizedRecord.avatarMedia, localeIndex)
    };
  }

  return localizedRecord;
}

function readTranslatedUnitValue(localeIndex, entityType, entityId, fieldPath) {
  const matchingUnits = localeIndex.get(buildEntityCompositeKey(entityType, entityId)) ?? [];
  const matchingUnit = matchingUnits.find((unit) => unit.fieldPath === fieldPath) ?? null;
  return matchingUnit?.translatedValue ?? null;
}

function localizePageHead(head, sourcePage, localizedPage, sourceRecord, localizedRecord, localeIndex) {
  const sourceHead = head && typeof head === "object" ? head : {};
  const nextHead = { ...sourceHead };
  const replacements = [
    {
      targetPath: "title",
      candidates: [
        [
          sourceHead?.title,
          readTranslatedUnitValue(localeIndex, PAGES_COLLECTION_ID, sourcePage?.id, "seoTitle")
        ],
        [sourcePage?.seoTitle, localizedPage?.seoTitle],
        [sourceRecord?.seoTitle, localizedRecord?.seoTitle],
        [sourcePage?.title, localizedPage?.title],
        [sourceRecord?.title, localizedRecord?.title],
        [sourceRecord?.name, localizedRecord?.name]
      ]
    },
    {
      targetPath: "description",
      candidates: [
        [
          sourceHead?.description,
          readTranslatedUnitValue(localeIndex, PAGES_COLLECTION_ID, sourcePage?.id, "seoDescription")
        ],
        [sourcePage?.seoDescription, localizedPage?.seoDescription],
        [sourceRecord?.seoDescription, localizedRecord?.seoDescription],
        [sourceRecord?.excerpt, localizedRecord?.excerpt],
        [sourceRecord?.description, localizedRecord?.description]
      ]
    },
    {
      targetPath: "openGraph.title",
      candidates: [
        [
          sourceHead?.openGraph?.title,
          readTranslatedUnitValue(localeIndex, PAGES_COLLECTION_ID, sourcePage?.id, "ogTitle")
        ],
        [sourcePage?.ogTitle, localizedPage?.ogTitle],
        [sourceRecord?.ogTitle, localizedRecord?.ogTitle],
        [sourceRecord?.title, localizedRecord?.title],
        [sourceRecord?.name, localizedRecord?.name]
      ]
    },
    {
      targetPath: "openGraph.description",
      candidates: [
        [
          sourceHead?.openGraph?.description,
          readTranslatedUnitValue(localeIndex, PAGES_COLLECTION_ID, sourcePage?.id, "ogDescription")
        ],
        [sourcePage?.ogDescription, localizedPage?.ogDescription],
        [sourceRecord?.ogDescription, localizedRecord?.ogDescription],
        [sourceRecord?.excerpt, localizedRecord?.excerpt],
        [sourceRecord?.description, localizedRecord?.description]
      ]
    }
  ];

  let localizedHead = nextHead;
  for (const replacement of replacements) {
    const currentValue = readValueAtPath(localizedHead, replacement.targetPath);
    if (typeof currentValue !== "string" || currentValue.length === 0) {
      continue;
    }
    for (const [sourceValue, translatedValue] of replacement.candidates) {
      if (
        typeof sourceValue === "string" &&
        sourceValue.length > 0 &&
        currentValue === sourceValue &&
        typeof translatedValue === "string" &&
        translatedValue.length > 0
      ) {
        localizedHead = writeValueAtPath(localizedHead, replacement.targetPath, translatedValue);
        break;
      }
    }
  }
  return localizedHead;
}

function createLocalizedHandler(handler, entityType, localeIndex) {
  if (!handler || typeof handler !== "object") {
    return handler ?? null;
  }

  return {
    ...handler,
    list: async (options = {}) => {
      const payload = await handler.list(options);
      if (!Array.isArray(payload?.items)) {
        return payload;
      }
      return {
        ...payload,
        items: payload.items.map((item) => localizeEntityRecord(entityType, item, localeIndex))
      };
    },
    findById: async (itemId) => {
      const item = await handler.findById(itemId);
      return localizeEntityRecord(entityType, item, localeIndex);
    }
  };
}

function createLocalizedCollectionRegistry(collectionHandlerRegistry, localeIndex) {
  if (!collectionHandlerRegistry || typeof collectionHandlerRegistry.get !== "function") {
    return collectionHandlerRegistry;
  }

  return {
    ...collectionHandlerRegistry,
    get(collectionId) {
      const handler = collectionHandlerRegistry.get(collectionId);
      if (collectionId === POSTS_COLLECTION_ID) {
        return createLocalizedHandler(handler, POSTS_COLLECTION_ID, localeIndex);
      }
      if (collectionId === CATEGORIES_COLLECTION_ID) {
        return createLocalizedHandler(handler, CATEGORIES_COLLECTION_ID, localeIndex);
      }
      if (collectionId === "blog-authors") {
        return createLocalizedHandler(handler, "blog-authors", localeIndex);
      }
      if (collectionId === "blog-tags") {
        return createLocalizedHandler(handler, "blog-tags", localeIndex);
      }
      if (collectionId === PAGES_COLLECTION_ID) {
        return createLocalizedHandler(handler, PAGES_COLLECTION_ID, localeIndex);
      }
      if (collectionId === "media-items") {
        return createLocalizedHandler(handler, "media-items", localeIndex);
      }
      if (collectionId === LAYOUTS_COLLECTION_ID) {
        return createLocalizedHandler(handler, LAYOUTS_COLLECTION_ID, localeIndex);
      }
      return handler;
    }
  };
}

function buildLocalizedPayload(payload, localeIndex) {
  const primarySourceType = normalizeText(payload?.page?.primarySourceType, "");
  const primaryEntityType = mapPrimarySourceTypeToEntityType(primarySourceType);
  const sourcePage = payload?.page ?? null;
  const sourcePrimaryRecord = payload?.data?.primary?.record ?? null;
  const localizedPage = sourcePage ? localizeEntityRecord(PAGES_COLLECTION_ID, sourcePage, localeIndex) : sourcePage;
  const localizedPrimaryRecord =
    primaryEntityType && sourcePrimaryRecord
      ? localizeEntityRecord(primaryEntityType, sourcePrimaryRecord, localeIndex)
      : sourcePrimaryRecord;

  return {
    ...payload,
    page: localizedPage,
    head: localizePageHead(
      payload?.head ?? {},
      sourcePage,
      localizedPage,
      sourcePrimaryRecord,
      localizedPrimaryRecord,
      localeIndex
    ),
    data: {
      ...(payload?.data && typeof payload.data === "object" ? payload.data : {}),
      primary: payload?.data?.primary
        ? {
            ...payload.data.primary,
            record: localizedPrimaryRecord
          }
        : payload?.data?.primary,
      categoryPosts: toArray(payload?.data?.categoryPosts).map((entry) => ({
        ...(entry && typeof entry === "object" ? entry : {}),
        record: localizeEntityRecord(POSTS_COLLECTION_ID, entry?.record, localeIndex)
      }))
    }
  };
}

async function listTranslationUnits(collectionHandlerRegistry) {
  const handler = collectionHandlerRegistry?.get?.(TRANSLATION_UNITS_COLLECTION_ID);
  if (!handler || typeof handler.list !== "function") {
    return [];
  }
  const payload = await handler.list({
    limit: 5000,
    offset: 0
  });
  return Array.isArray(payload?.items) ? payload.items : [];
}

function resolveRouteSourceLocale(payload = {}, bootstrapDocument = null) {
  const explicitPageLocale = normalizeOptionalText(payload?.page?.locale);
  if (explicitPageLocale) {
    return explicitPageLocale;
  }
  const model = bootstrapDocument?.model ?? null;
  if (model?.kind === "post-detail") {
    return normalizeOptionalText(model?.post?.locale) ?? DEFAULT_SOURCE_LOCALE;
  }
  if (model?.kind === "category-detail") {
    return normalizeOptionalText(model?.category?.locale) ?? DEFAULT_SOURCE_LOCALE;
  }
  return DEFAULT_SOURCE_LOCALE;
}

function buildTranslationOverlayDocument({
  pagePath,
  pageId,
  primarySourceType,
  localeCode,
  sourceLocale,
  bootstrapPatches,
  deferredPatches
}) {
  const normalizedPath = normalizeText(pagePath, "/");
  const normalizedLocale = normalizeLocaleCode(localeCode, DEFAULT_SOURCE_LOCALE);
  return {
    id: buildTranslationProjectionDocumentId(normalizedPath, normalizedLocale),
    cacheKey: `${normalizedPath}::${normalizedLocale}`,
    path: normalizedPath,
    pageId: pageId ?? null,
    primarySourceType: primarySourceType ?? "none",
    locale: normalizedLocale,
    sourceLocale: normalizeLocaleCode(sourceLocale, DEFAULT_SOURCE_LOCALE),
    bootstrapPatches,
    deferredPatches,
    updatedOn: toTimestamp()
  };
}

async function buildLocalizedReaderDocuments({
  payload,
  localeCode,
  collectionHandlerRegistry,
  resolveSettingsRepository
}) {
  const translationUnits = await listTranslationUnits(collectionHandlerRegistry);
  const localeIndex = buildTranslationUnitLocaleIndex(translationUnits, localeCode);
  const localizedPayload = buildLocalizedPayload(payload, localeIndex);
  const localizedRegistry = createLocalizedCollectionRegistry(collectionHandlerRegistry, localeIndex);

  const [bootstrapDocument, deferredDocument] = await Promise.all([
    buildReaderPageBootstrapPayload(localizedPayload, {
      collectionHandlerRegistry: localizedRegistry,
      resolveSettingsRepository
    }),
    buildReaderDeferredPayload(localizedPayload, {
      collectionHandlerRegistry: localizedRegistry
    })
  ]);

  return {
    bootstrapDocument,
    deferredDocument
  };
}

function stripNonLocalizedBootstrapFields(baseBootstrap, localizedBootstrap) {
  return {
    base: {
      ...cloneJsonValue(baseBootstrap),
      routeManifest: null,
      theme: null,
      review: null,
      resolvedAt: null
    },
    localized: {
      ...cloneJsonValue(localizedBootstrap),
      routeManifest: null,
      theme: null,
      review: null,
      resolvedAt: null
    }
  };
}

function stripNonLocalizedDeferredFields(baseDeferred, localizedDeferred) {
  return {
    base: {
      ...cloneJsonValue(baseDeferred),
      resolvedAt: null
    },
    localized: {
      ...cloneJsonValue(localizedDeferred),
      resolvedAt: null
    }
  };
}

async function buildRouteTranslationOverlayDocument({
  payload,
  collectionHandlerRegistry,
  resolveSettingsRepository,
  localeCode
}) {
  const [baseBootstrapDocument, baseDeferredDocument, localizedDocuments] = await Promise.all([
    buildReaderPageBootstrapPayload(payload, {
      collectionHandlerRegistry,
      resolveSettingsRepository
    }),
    buildReaderDeferredPayload(payload, {
      collectionHandlerRegistry
    }),
    buildLocalizedReaderDocuments({
      payload,
      localeCode,
      collectionHandlerRegistry,
      resolveSettingsRepository
    })
  ]);

  const normalizedLocale = normalizeLocaleCode(localeCode, DEFAULT_SOURCE_LOCALE);
  const sourceLocale = resolveRouteSourceLocale(payload, baseBootstrapDocument);
  if (normalizedLocale === sourceLocale) {
    return null;
  }

  const bootstrapComparable = stripNonLocalizedBootstrapFields(
    baseBootstrapDocument,
    localizedDocuments.bootstrapDocument
  );
  const deferredComparable = stripNonLocalizedDeferredFields(
    baseDeferredDocument,
    localizedDocuments.deferredDocument
  );

  const bootstrapPatches = collectJsonPatches(
    bootstrapComparable.base,
    bootstrapComparable.localized,
    "",
    []
  ).filter((entry) => entry.path);
  const deferredPatches = collectJsonPatches(
    deferredComparable.base,
    deferredComparable.localized,
    "",
    []
  ).filter((entry) => entry.path);

  if (bootstrapPatches.length === 0 && deferredPatches.length === 0) {
    return null;
  }

  return buildTranslationOverlayDocument({
    pagePath: payload?.page?.path ?? "/",
    pageId: payload?.page?.id ?? null,
    primarySourceType: payload?.page?.primarySourceType ?? "none",
    localeCode: normalizedLocale,
    sourceLocale,
    bootstrapPatches,
    deferredPatches
  });
}

async function listPublishedRoutePayloads({
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition
}) {
  const pagesHandler = collectionHandlerRegistry?.get?.(PAGES_COLLECTION_ID);
  if (!pagesHandler || typeof pagesHandler.list !== "function") {
    return [];
  }

  const pagePayload = await pagesHandler.list({
    limit: 5000,
    offset: 0
  });
  const pages = toArray(pagePayload?.items).filter(
    (page) =>
      isPagePublished(page?.status) &&
      (page?.primarySourceType === "blog-post" || page?.primarySourceType === "blog-category")
  );

  const routePayloads = [];
  for (const page of pages) {
    if (isPerRecordDeploymentMode(page?.deploymentMode)) {
      const records = await listEligiblePrimarySourceRecords(collectionHandlerRegistry, page);
      for (const record of records) {
        routePayloads.push(
          await resolvePageDeliveryPayload({
            collectionHandlerRegistry,
            page,
            sourceRecord: record,
            preview: false,
            resolveSettingsRepository,
            settingsDefinition
          })
        );
      }
      continue;
    }

    routePayloads.push(
      await resolvePageDeliveryPayload({
        collectionHandlerRegistry,
        page,
        preview: false,
        resolveSettingsRepository,
        settingsDefinition
      })
    );
  }
  return routePayloads;
}

export async function resolveLocalPublicTranslationOverlay({
  collectionHandlerRegistry,
  resolveSettingsRepository,
  settingsDefinition = null,
  pagePath,
  localeCode
}) {
  const normalizedPath = normalizeText(pagePath, "/");
  const payload = await (async () => {
    const routePayloads = await listPublishedRoutePayloads({
      collectionHandlerRegistry,
      resolveSettingsRepository,
      settingsDefinition
    });
    return routePayloads.find((entry) => normalizeText(entry?.page?.path, "/") === normalizedPath) ?? null;
  })();

  if (!payload) {
    return {
      ok: true,
      path: normalizedPath,
      locale: normalizeLocaleCode(localeCode, DEFAULT_SOURCE_LOCALE),
      items: [],
      total: 0
    };
  }

  const document = await buildRouteTranslationOverlayDocument({
    payload,
    collectionHandlerRegistry,
    resolveSettingsRepository,
    localeCode
  });
  return {
    ok: true,
    path: normalizedPath,
    locale: normalizeLocaleCode(localeCode, DEFAULT_SOURCE_LOCALE),
    items: document ? [document] : [],
    total: document ? 1 : 0
  };
}

export async function buildPublicTranslationsProjectionMap(
  collectionHandlerRegistry,
  targetProfile,
  options = {}
) {
  const collectionPath =
    normalizeTargetConfig(targetProfile.config, targetProfile.targetKind).firestoreCollectionPath ??
    "publicTranslations";
  const projectionMap = new Map();
  const routePayloads = await listPublishedRoutePayloads({
    collectionHandlerRegistry,
    resolveSettingsRepository: options.resolveSettingsRepository,
    settingsDefinition: options.settingsDefinition ?? null
  });

  const targetLocales = listSupportedTranslationLocales()
    .map((locale) => locale.code)
    .filter((localeCode) => localeCode !== DEFAULT_SOURCE_LOCALE);

  for (const payload of routePayloads) {
    for (const localeCode of targetLocales) {
      const document = await buildRouteTranslationOverlayDocument({
        payload,
        collectionHandlerRegistry,
        resolveSettingsRepository: options.resolveSettingsRepository,
        localeCode
      });
      if (!document) {
        continue;
      }
      const documentId = buildTranslationProjectionDocumentId(
        payload?.page?.path ?? "/",
        localeCode
      );
      const content = Buffer.from(JSON.stringify(document, null, 2), "utf8");
      projectionMap.set(`${collectionPath}/${documentId}.json`, {
        relativePath: `${collectionPath}/${documentId}.json`,
        absolutePath: null,
        sizeBytes: content.length,
        hash: content.toString("base64"),
        content,
        documentData: document
      });
    }
  }

  return projectionMap;
}
