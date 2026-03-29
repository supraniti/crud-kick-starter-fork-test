# Page Studio Completion Plan

Date: 2026-03-29

Intent authority:
- `intent-file.md`

Rule for this plan:
- This is not a polish plan.
- Every item below is required for intent compliance.
- No pass is complete unless the live route and the deployed route both prove it.

## Current truth

The current Page Studio foundation is real, but the task is not complete.

The remaining must-finish gaps are:

1. `Infra` is still partly placeholder-driven.
- Query popup does not exist.
- SEO popup does not exist.
- Theme picker is still a raw key field.
- Query definitions are not yet the actual source of preview context.

2. `Layout`, `Widgets`, and `Preview` do not yet share one full authoritative studio contract.
- `Widgets` and `Preview` are much closer now.
- `Layout` still uses its own Gridstack surface and must match the same frame contract precisely.
- Preview data is still partly inferred from route/source type instead of the authored query contract.

3. Widget actions are not implemented.
- The schema supports them.
- The inspector explicitly says they are deferred.
- The runtime currently handles navigation through ad-hoc code, not authored widget actions.

4. `PREVIEW === LIVE` is still false.
- Studio preview renders with React + MUI.
- Deployed pages still render through the plain DOM reader in `page-reader.global.js`.
- That violates the intent rule of one runtime/CSS environment.

5. Client selection is not yet a real deployment/runtime switch.
- The selector exists in Studio.
- It is not yet used to choose the deployed reader client.

## Completion bar

This task is complete only when all of the following are true:

1. `Infra`
- Route path and params are editable.
- Query authoring is done through a real popup.
- SEO authoring is done through a real popup.
- Theme selection uses a real theme picker.
- Client selection is real and persisted.

2. `Layout`
- Gridstack authoring remains editor-only.
- The authored geometry transforms deterministically into the runtime layout contract.
- Breakpoint overrides persist per breakpoint.
- The visible page frame uses the full available builder space.

3. `Widgets`
- One widget per block.
- Widget picker is popup-based.
- Widget config is popup-based.
- Widget props can be static or dynamic.
- Widget actions can be authored for bounded cases.

4. `Preview`
- Uses the authored query contract, not route guessing.
- Uses the same widget renderer family as live.
- Supports preview param changes from Infra-defined params.

5. `Live`
- Deployed pages can run the MUI reader client.
- The MUI reader client uses the same widget/theme rendering family as Studio preview.
- Same-app navigation still uses data-layer fetching and does not refetch HTML.
- Locale/comments/navigation remain functional on the MUI reader path.

## Execution order

### Pass 1: Make Infra real

Deliver:
- query popup
- SEO popup
- theme picker dialog
- authored query definitions with real structure

Implementation details:
- extend `page-studio-document.mjs` query definitions beyond `id/label/sourceType/summary`
- add:
  - `kind`
  - `bindAs`
  - `paramBindings`
  - `itemId`
  - `sortKey`
  - `sortDirection`
  - `limit`
- support V1 query kinds:
  - `primary-post-by-slug`
  - `primary-category-by-slug`
  - `posts-by-category`
  - `posts-by-tag`
  - `posts-by-author`
- create:
  - `PageStudioQueryDialog.jsx`
  - `PageStudioSeoDialog.jsx`
  - `PageStudioThemeDialog.jsx`
- keep the main Infra screen summary-first and dialog-driven

Proof:
- query list on Infra is no longer placeholder text
- SEO tags edit through a popup
- theme selection is visual, not a raw key input

### Pass 2: Make preview context query-driven

Deliver:
- preview model built from authored query definitions
- page context manifest driven from those query outputs
- support both post-detail and category-detail in Studio

Implementation details:
- extend `page-studio-preview-model.mjs`
- stop inferring primary source only from route text
- map query outputs into canonical context:
  - `context.page`
  - `context.post` / `context.category`
  - `context.author`
  - `context.categories`
  - `context.tags`
  - derived navigation/related/comments branches
- keep `context.*` the single binding namespace

Proof:
- changing query configuration changes preview output
- changing slug param swaps the resolved record through the query contract
- category route preview works, not only post-detail

### Pass 3: Finish widget actions

Deliver:
- authorable action config for bounded widget actions

V1 action types:
- navigate to previous post
- navigate to next post
- navigate to primary category
- navigate to author page
- navigate to bound record path
- emit named event

Implementation details:
- extend widget inspector to edit actions for components that declare `actionDefinitions`
- keep actions bounded and typed
- store action descriptors on `componentInstance.actions`
- make preview runtime execute those actions

Proof:
- action-capable widgets can be configured in Widgets mode
- preview navigation uses authored action descriptors, not one-off widget code paths

### Pass 4: Replace the split live reader path

Deliver:
- new MUI reader bundle for deployed pages
- same widget/theme rendering family as Studio preview

Implementation details:
- build a standalone browser bundle for the MUI reader
- reuse:
  - `PageStudioRuntimeCanvas`
  - `page-studio-widget-renderer.jsx`
  - `page-studio-theme-runtime.js`
  - shared widget context/binding helpers
- adapt live payload consumption to the existing published page payload shape
- support:
  - first render from inline payload
  - same-app navigation through the data layer
  - translation overlays
  - comments

Deployment contract:
- Pages with `mui-reader` selected load the MUI reader asset
- legacy/test reader remains available for the other client options

Proof:
- deployed page loads the MUI reader asset
- DOM structure and styling match Studio Preview materially
- navigation still stays HTML-free

### Pass 5: Final parity pass

Deliver:
- Studio preview and deployed live route proven against the same example pages

Proof matrix:
- `Infra`
- `Layout`
- `Widgets`
- `Preview`
- deployed live page

Required review:
- inspect live routes in Chrome DevTools
- compare screenshots from:
  - Layout
  - Widgets
  - Preview
  - deployed page
- verify:
  - page frame
  - spacing
  - media sizing
  - typography
  - widget order
  - navigation behavior
  - locale behavior
  - comments behavior

## Validation checklist

Code validation:
- targeted frontend core tests
- targeted server conformance for page payload/runtime
- `pnpm --filter frontend build`
- `pnpm quality:protocol`
- `pnpm review:env:verify`

Browser validation:
- `http://localhost:3000/app/page-studio?studioMode=infra`
- `http://localhost:3000/app/page-studio?studioMode=layout`
- `http://localhost:3000/app/page-studio?studioMode=widgets`
- `http://localhost:3000/app/page-studio?studioMode=preview`
- deployed page on `fastcart.dev`

## Delivery rule

Do not call this task complete until:
- the placeholder language is removed from Infra
- widget actions are real
- deployed live page is on the MUI reader path
- the same authored example is visually and behaviorally aligned between Preview and Live
