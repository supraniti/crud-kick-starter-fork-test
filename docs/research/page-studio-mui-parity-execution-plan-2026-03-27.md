# Page Studio MUI Parity Execution Plan

Date: 2026-03-27
Status: Active
Canonical intent:
- [intent-file.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/intent-file.md)
- [page-studio-layout-transform-design-2026-03-27.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/page-studio-layout-transform-design-2026-03-27.md)

## Program Goal

Deliver a new decoupled module that replaces the current split between:

- Pages authoring
- Layouts authoring
- Widget configuration
- Preview/runtime parity

with one canvas-first `Page Studio` that authors:

- infra
- layout
- widgets
- preview

and deploys to a reader that renders real MUI components so:

- editor preview matches deployed output
- deployed output is no longer a separate HTML/CSS interpretation layer
- `PREVIEW === LIVE`

The existing `Pages` and `Layouts` modules remain alive while this new module matures.

## Canonical Intent Constraints

The following are non-negotiable because they come directly from the intent file:

1. Editor and deployed page must share the MUI rendering environment.
2. The new authoring flow is an all-in-one builder with four states:
   - `Infra`
   - `Layout`
   - `Widgets`
   - `Preview`
3. Gridstack is editor ergonomics only, not deployment output.
4. Layout must persist different screen-size variants.
5. Every block gets:
   - a serialized name like `B-0001`
   - a unique tone in layout mode
6. Widget mode allows exactly one widget per block.
7. Widget config must support:
   - static values
   - dynamic values from page-owned data
   - actions
8. Theme selection must be able to override widget props.
9. Preview must let the operator change URL params and observe the exact live result.

## Current Repo Reality

### What already exists

- structural layout builder:
  - `modules/test-modules-layouts/frontend/*`
- page context manifest foundations:
  - `modules/test-modules-pages/server/page-context-manifest-runtime.mjs`
- compiled widget render contract work:
  - `modules/test-modules-pages/server/page-widget-render-contract-runtime.mjs`
- existing deployed reader:
  - `modules/test-modules-pages/browser/page-reader.global.js`
- existing widget registry/schema work:
  - `modules/test-modules-layouts/shared/widget-component-schema.mjs`
- existing themes and translations runtime:
  - `modules/test-modules-themes/*`
  - `modules/test-modules-translations/*`

### What does not satisfy the new intent

1. The current builder is split across multiple modules.
2. The current layout builder still uses support rails and dialogs rather than one all-in-one mode-based studio.
3. The current reader renders with bespoke DOM/CSS logic, not MUI component rendering.
4. The current layout model is not a true Gridstack-authored responsive grid model.
5. Current preview is not the same runtime stack as live deployment.
6. URL/query/data/SEO/client are not authored as one coherent `Infra` surface.

## Decoupled Module Decision

This will be implemented as a new module line:

- `test-modules-page-studio`

Reason:

- the current `Pages` and `Layouts` surfaces are already live and valuable
- the new studio changes the authoring model too radically to be slipped in-place safely
- both systems must coexist until the new one proves parity and usability

## Initial Plan

### Pass 0: Intent Lock + Decoupled Module Foundations

Deliver:

- canonical intent file pointer
- new module scaffold:
  - `test-modules-page-studio`
- shared studio mode model:
  - `infra`
  - `layout`
  - `widgets`
  - `preview`
- shared `page studio document` schema
- hard-coded client registry:
  - data-layer client
  - reader/test client
  - new MUI client
- placeholder route shell for the new studio

Validation:

- new route loads without breaking current app
- current modules unchanged
- studio state persists and round-trips

### Pass 1: Layout Transformation Planning Pass

This pass is intentionally planning-heavy because the intent explicitly requires it.

Deliver:

- detailed transform design from Gridstack editor model to deployment-safe MUI layout contract
- responsive breakpoint persistence model
- block identity model:
  - `B-0001`, `B-0002`, ...
- editor-only vs runtime-only class boundary
- acceptance test matrix for parity:
  - desktop
  - tablet
  - mobile
- explicit runtime primitive decision:
  - MUI `Box` / `Stack` with CSS Grid via `sx`
- explicit breakpoint inheritance rules
- explicit runtime contract shape for deployed pages

Validation:

- no implementation drift before the transform rules are written and reviewed against intent

### Pass 2: Infra Mode

Deliver:

- URL/slug editor
- query-param definition
- data query chooser popup
- SEO popup
- client chooser
- theme chooser
- page-owned context manifest preview for this studio

Validation:

- URL params can be referenced from query definitions
- SEO tags can bind to declared query fields
- selected client/theme persist in the studio document

### Pass 3: Layout Mode With Gridstack

Deliver:

- full-canvas layout mode
- FAB state switcher
- Gridstack editor integration
- block add/move/resize
- serialized block ids
- unique per-block tone
- per-breakpoint layout adjustments

Validation:

- block geometry persists per breakpoint
- Gridstack-specific classes do not leak into runtime output contract
- layout mode starts from recognizable real-life scenarios, not anonymous seed blocks
- route must be proven against multiple page archetypes before the slice counts as usable:
  - story detail
  - story with sidebar
  - category listing
  - feature landing

### Pass 4: Widgets Mode

Deliver:

- block frames with hover names
- widget picker popup
- widget config popup
- exactly one widget per block
- dynamic binding from infra-defined context
- action configuration
- theme-aware prop overrides

Validation:

- one block cannot host two widgets
- widget bindings only resolve against declared context branches

### Pass 5: MUI Reader Runtime

Deliver:

- new MUI page client
- MUI widget wrapper library for deployed rendering
- route bootstrap for current page contract + current record
- deferred data via `window.dataLayer`
- navigation/actions through `window.actionLayer`

Validation:

- deployed runtime renders MUI, not the current bespoke DOM renderer
- post/category navigation stays HTML-free

### Pass 6: Preview Equals Live

Deliver:

- preview mode reuses the same MUI reader runtime as deployment
- URL param simulator in preview
- exact same widget wrapper/render path for preview and live

Validation:

- preview and live output are structurally identical for the same page contract and data

### Pass 7: Migration And Coexistence

Deliver:

- open from existing `Pages` / `Layouts` into `Page Studio`
- coexistence guidance
- document migration boundaries

Validation:

- old routes still work
- new studio can be exercised without taking the old system offline

## Gap Review Against Intent

After comparing the initial plan against [intent-file.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/intent-file.md), the following caveats needed to be filled:

1. The initial plan did not explicitly say `Preview` must use the same client as live.
   - Added as a hard rule in Pass 6.

2. The initial plan risked treating MUI rendering as only a deployment concern.
   - Corrected: the new MUI client must power both preview and deployment.

3. The initial plan did not explicitly separate:
   - Gridstack editor classes
   - runtime layout contract
   - Added as a Pass 1 core deliverable.

4. The initial plan mentioned widgets and actions but not theme-driven prop overrides strongly enough.
   - Added to Pass 4 as a required behavior.

5. The initial plan did not explicitly call out URL params as inputs to query definitions.
   - Added to Pass 2 and its validation.

6. The initial plan did not explicitly force one block name serialization model.
   - Added to Pass 1 and Pass 3.

## Refined Plan

### Pass 1 Outcome

Pass 1 is now represented by:
- [page-studio-layout-transform-design-2026-03-27.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/page-studio-layout-transform-design-2026-03-27.md)

That planning pass settles these core decisions before geometry work:
- editor grid and runtime layout are separate contracts
- runtime uses MUI primitives with CSS Grid
- breakpoints remain a 12-column system across desktop/tablet/mobile
- breakpoint inheritance is explicit and block-local
- serialized block ids are immutable

### Refined Program Rules

1. `PREVIEW === LIVE` is not a slogan; it is the validation bar.
2. New studio preview and deployed reader must share one MUI widget runtime.
3. Layout mode is the only place where resize/move exists.
4. Widgets mode is interaction/configuration only. No geometry edits there.
5. Infra mode is the only place where URL/query/SEO/client/theme is authored.
6. Breakpoint changes must be explicit and inspectable.
7. The decoupled module must coexist with old Pages/Layouts until parity is proven.
8. Layout mode is not reviewable until it can create multiple recognizable page shapes without the user assembling everything from anonymous seed blocks.

### Additional Use Cases To Cover

1. Per-record post page with different mobile layout than desktop layout
2. Category page with query-param-driven filtering
3. SEO title bound to query result field
4. Media widget using either:
   - library media
   - query-derived media
5. Navigation widget emitting:
   - next post
   - previous post
   - link to category page
6. Theme override affecting widget typography and spacing
7. Preview with different URL params for the same page contract

### Additional Scenarios To Check

1. No data returned by a query
2. Missing URL params
3. Widget bound to a field that becomes unavailable after infra edits
4. Mobile override exists for one block but not the others
5. Theme changes after widget props were customized
6. Switching between client types in Infra

## Validation Program

Every implementation pass must include:

### Code validation

- targeted tests for the new pass
- `pnpm --filter frontend build`
- `pnpm quality:protocol`
- `pnpm review:env:verify`

### Product validation

- Chrome DevTools route review
- at least one real authoring flow proof
- if preview/live behavior changed:
  - deployed page verification
  - network verification

### Documentation

- update:
  - `handoff.md`
  - `docs/agent-observer-log.md`
- capture caveats and new constraints discovered in the pass

## First Execution Slice

Start with Pass 0, but make it useful:

- create `test-modules-page-studio`
- add studio document schema
- add mode model
- add client registry
- add route shell with:
  - one dominant canvas area
  - FAB mode switcher for:
    - Infra
    - Layout
    - Widgets
    - Preview
- keep old modules untouched

This gives the new module a real, reviewable foothold while preserving the mandatory full planning pass for the Gridstack-to-MUI transform before geometry implementation begins.

## Definition Of Done For This Program

This whole program is complete only when:

1. The new `Page Studio` is the clear preferred authoring flow.
2. Preview and live use the same MUI rendering runtime.
3. Layout mode supports responsive adjustments per screen size.
4. Widgets mode supports one-widget-per-block with data bindings and actions.
5. Infra mode owns URL/query/SEO/client/theme.
6. Deployed pages match the studio preview without CSS-environment drift.

## Progress Update - 2026-03-27 Preview Slice

Preview is no longer a placeholder state.

Delivered in the current worktree:
- real `Preview` mode on `/app/page-studio?studioMode=preview`
- front-end preview data resolver for the current supported `post-detail` route family
- real MUI render path over the authored runtime layout contract and one-widget-per-block assignments
- preview URL param editing for `slug`
- legacy draft migration away from stale `/untitled` infra defaults
- widgetized default reset flow for the `Story Stack` scenario

Verified in browser:
- `Reset Draft` now lands on a meaningful previewable story page
- changing `slug` swaps the previewed post in place
- no console errors on the reviewed route

Program boundary still unchanged:
- Preview is now MUI and useful
- deployed live still needs the later migration onto this same runtime before full `PREVIEW === LIVE` parity is achieved
