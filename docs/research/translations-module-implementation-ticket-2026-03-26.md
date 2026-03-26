# Translations Module Implementation Ticket

## Goal
Introduce a `Translations` module that makes authored content translatable at the field level across the application and the deployed reader.

The system must support two complementary workflows:
1. ad-hoc translation from the exact field the operator is editing
2. a dedicated one-stop `Translations` desk for auditing, editing, filtering, and completing translation coverage across the product

The deployed reader must allow locale switching without refetching HTML. Locale changes should fetch translated data through the runtime data layer, use caching and IndexedDB where appropriate, and replace only the relevant strings on the current page.

## Intent Restatement
The user intent is not generic i18n plumbing.

The intended product is:
- every authored text field that matters can carry translations
- operators do not need to leave the current editing flow just to add a translation
- there is also a central desk where all source strings and their translated values can be reviewed in one place
- deployed pages can switch locale at runtime, fetch the translated values, and update the rendered page in place
- first render HTML still contains only what is needed for the current route and current locale
- the runtime remains flexible about local datasets, cache storage, IndexedDB, and remote fetches

## Current State
The repo already contains:
- `locale` and `translationGroupId` fields on some content records, but not a field-level translation system
- a deployed reader with `window.dataLayer` and route-aware JSON navigation
- a widgetized layout system where some rendered strings are:
  - content-derived from page context
  - static inside widget bindings
- file-backed local content state and Firestore-backed published data for deployed pages

The repo does not currently contain:
- a field-level translation authority
- a one-stop translations desk
- per-field translation popup affordances in authoring forms
- deployed reader locale switching that overlays translated strings
- a published translation projection for deployed pages

## Product Requirements

### Authoring
- Operators can add translations from every content text field through a popup affordance.
- The popup must:
  - show the source locale and current source value
  - expose translated values by locale
  - warn when the source value has changed since translations were authored
  - allow save without leaving the current form
- If a record has not been saved yet, the popup must explain that the record needs an id before translations can be persisted.

### Central Desk
- A dedicated `Translations` module page must expose:
  - searchable translation units
  - filters by locale, source type, coverage state, stale state
  - per-unit edit panel
  - summary counts such as translated / missing / stale
- The desk must be useful even when the operator did not arrive from a content module.

### Supported Source Types In V1
V1 must cover the existing content surfaces that actually affect authored pages:
- Posts
- Authors
- Categories
- Tags
- Pages
- Layout static widget content
- Media authored text fields that affect presentation

### Deployed Reader
- Public pages must render the base locale from inline HTML as today.
- The reader must expose a locale switcher.
- Changing locale must:
  - stay on the current HTML document
  - fetch translation data through the reader runtime/data layer
  - cache translation results by page path + locale
  - update the current page strings in place
- Same-app navigation must preserve the chosen locale and use it on the next JSON fetches.

### Performance
- First render HTML should not inline every translation.
- Comments and other deferred data remain deferred.
- Translation fetches should be scoped to the current route context, not the whole site.
- Translation data should be storable in IndexedDB through the existing client runtime dataset model.

## Architectural Decisions

### 1. Translation Authority
Introduce a new module-backed collection of field translation entries.

One translation entry represents one source field on one entity.

Proposed record shape:
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
  "updatedOn": "..."
}
```

### 2. Translation Manifest
Create one shared manifest that defines translatable field inventory per source type.

This manifest will drive:
- central desk aggregation
- popup field metadata
- deployed translation overlay extraction
- stale-source validation

### 3. Staleness Rule
If the current source field value differs from the translation entry `sourceValue`, the entry becomes stale.

V1 reader rule:
- stale translations do not override the current source value

V1 authoring rule:
- popup and desk surface the stale state clearly

### 4. Widget Static Content
Layout static widget text is included by storing translation entries against the layout entity with deep `fieldPath` values such as:
- `layoutDocument.nodes.hero-title.componentInstance.content.text.value`
- `layoutDocument.nodes.tabs-1.componentInstance.content.tabs.0.header.value`

Dynamic widget content is translated indirectly because the underlying content records are translated.

### 5. Deployed Reader Transport
Reader locale switching will use `window.dataLayer.query` and a dedicated translation query resource.

The query result will be scoped by:
- current page path
- current locale
- current route entity references
- current page/layout identifiers for static widget strings

### 6. Published Translation Projection
Deployed translation lookups will read from a dedicated public translation projection in the same remote project used for published page data.

V1 collection name:
- `publicTranslations`

## V1 Use Cases
- Translate a post title and excerpt into French from the post editor.
- Translate category name and description from the taxonomy drawer.
- Translate author bio from the author drawer.
- Translate a static tabs header in the layout builder.
- Open the `Translations` desk and filter for all missing Hebrew translations.
- Open a deployed post page, switch locale to French, and see the title, excerpt, body-adjacent strings, taxonomy labels, author bio, and layout static strings update without a second HTML request.

## Non-Goals For V1
- machine translation
- pluralization frameworks
- fully localized route slugs
- localized widget action labels beyond stored field translations
- locale-specific layout structure divergence

## Acceptance Criteria
- A new `Translations` module exists and is reachable from the product shell.
- Operators can create and edit translations from content text fields without leaving the current form.
- Operators can review translation inventory centrally from the `Translations` desk.
- The deployed reader exposes a locale switcher and updates the page in place.
- Translation fetches use the client runtime data layer and are cacheable locally.
- Base HTML remains current-route focused and does not inline all translations.
- Stale translation entries are surfaced in authoring and ignored by the reader overlay.
