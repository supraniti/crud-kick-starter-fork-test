# Translations Module Implementation Plan

## Goal
Deliver a `Translations` module that adds field-level translation authoring across the CMS and route-scoped locale switching on deployed pages without refetching HTML.

## V1 Scope
V1 covers:
- Posts
- Authors
- Categories
- Tags
- Pages
- Media presentation text
- Layout static widget text

V1 does not cover:
- localized slugs or route structures
- machine translation
- locale-specific layout structure divergence
- translating arbitrary system chrome

## Product Decisions

### Canonical model
- Translation authority lives in a dedicated module-backed collection.
- One translation entry represents one source field on one entity.
- Source fields remain authoritative in their home collections.
- Translation entries never mutate source records directly.

### Entry shape
```json
{
  "id": "translationu-001",
  "entityType": "blog-posts",
  "entityId": "blogpost-005",
  "fieldPath": "title",
  "fieldLabel": "Title",
  "entityLabel": "First Cup On The Table",
  "sourceLocale": "en-US",
  "sourceValue": "First Cup On The Table",
  "translations": {
    "fr-FR": "Premier cafe sur la table",
    "he-IL": "הכוס הראשונה על השולחן"
  },
  "stale": false,
  "updatedOn": "..."
}
```

### Staleness
- `sourceValue` is copied from the source record field when the translation entry is saved.
- If current source value no longer matches `sourceValue`, the entry is stale.
- V1 reader ignores stale translated values.
- App surfaces stale state in popup and central desk.

### Field inventory
A shared translation field manifest defines which fields are translatable and how to read/write them.

Manifest responsibilities:
- field labels
- supported source locales/target locales
- source collection ids
- read path from entity record
- write path for widget static bindings
- whether field is plain text or rich text
- whether field affects deployed pages

### Popup authoring model
- Every supported text field gets a translation affordance.
- Clicking it opens a translation dialog.
- If entity id is missing, dialog is read-only and explains save-first requirement.
- Saving translations does not navigate away and does not require visiting the central desk.

### Central desk model
The `Translations` desk is inventory-first.
It loads source entities + translation entries and derives units with status:
- translated
- missing
- stale
- untranslated-for-locale

### Reader locale switching model
- Initial HTML remains current-route and current-locale focused.
- Reader locale menu writes active locale into runtime state.
- Locale switching uses `window.dataLayer.query`.
- Query key is route-scoped: `path + locale + relevant entity ids + page/layout ids`.
- Overlay is applied in memory to the current application model.
- Same-app navigation preserves chosen locale and requests translated route overlays for the new path.

### Translation sources in deployed reader
- content-derived strings are translated from translation entries for the bound source fields
- layout static widget strings are translated from layout translation entries keyed by deep field paths
- comments remain deferred and can later use the same model, but are not required for V1

## Passes

### Pass 1. Shared authority and manifest
Implement:
- `test-modules-translations` module
- translation entry schema + handler wrapper
- translation field manifest for V1 entities
- shared helpers to derive stale state and merge/update entries
- reference route/view registration

Validation:
- server conformance for create/update/stale rules
- local desk can list translation entries

### Pass 2. Ad-hoc translation popup
Implement reusable frontend pieces:
- `TranslationFieldButton`
- `TranslationDialog`
- `TranslatableTextField`
- `TranslatableMultilineTextField`
- `useTranslationFieldSupport`

Integrate into covered authoring flows:
- Posts
- Authors
- Categories / Tags
- Pages
- Media authored text fields
- Layout static widget binding editor

Validation:
- browser review that popup opens from real forms
- save-first warning on unsaved records
- ad-hoc translation writes persist

### Pass 3. Central Translations desk
Implement:
- `/app/translations`
- searchable/filterable inventory
- locale, source type, coverage, stale filters
- edit panel / drawer
- summary metrics

Validation:
- central desk shows missing vs translated vs stale correctly
- edits from desk update same entry shape used by popup

### Pass 4. Published translation projection and reader contract
Implement:
- public translation projection builder
- route-scoped translation fetch endpoint for local and public app API
- client runtime query definitions for reader translations
- reader locale switcher and model overlay application
- same-app navigation retains locale

Validation:
- locale switch uses JSON only, not HTML
- translation results can persist in dataset storage
- stale translations are ignored on reader

### Pass 5. Live review and polish
Implement/fix from product review:
- locale menu placement and clarity
- missing translation empty states
- performance regressions
- visual issues on deployed reader

Validation:
- local review env
- live `fastcart.dev` deployment via public API + bundle rerun
- DevTools network proof

## Technical Seams

### New module
- `modules/test-modules-translations/`
- collection id candidate: `translation-units`

### Shared manifest/helpers
- `modules/test-modules-translations/shared/translation-field-manifest.mjs`
- `modules/test-modules-translations/shared/translation-entry.mjs`
- `modules/test-modules-translations/shared/translation-locale-catalog.mjs`

### Authoring popup frontend
- `modules/test-modules-translations/frontend/TranslationDialog.jsx`
- `modules/test-modules-translations/frontend/TranslatableTextField.jsx`
- `modules/test-modules-translations/frontend/TranslatableMultilineTextField.jsx`
- `modules/test-modules-translations/frontend/useTranslationFieldSupport.js`

### Reader/runtime
- `modules/test-modules-pages/server/page-client-runtime-runtime.mjs`
- `modules/test-modules-pages/server/page-application-view-runtime.mjs`
- `modules/test-modules-pages/server/page-public-application-routes-runtime.mjs`
- `modules/test-modules-pages/public-app-api/src/index.mjs`
- `modules/test-modules-pages/browser/page-reader.global.js`
- `client-runtime/src/query/query-executor.mjs` only if query definition semantics need extension

## Performance Rules
- do not inline full translation catalogs in HTML
- do not fetch site-wide translation blobs
- do not refetch HTML on locale change
- cache translation overlays by route + locale in the data layer
- keep comments deferred

## Acceptance Bar
The slice is complete only when:
1. The Translations module exists in the shell.
2. Real authoring fields can open translation popup and persist entries.
3. The central desk can audit missing/translated/stale states.
4. Deployed page exposes locale switcher.
5. Locale switching updates strings in place through `window.dataLayer`.
6. Same-app navigation preserves locale and avoids second HTML fetch.
7. Live review proves translation overlay network behavior in DevTools.
