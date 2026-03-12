# Posts Template Deployment Flow Plan

- Date: `2026-03-10`
- Status: `in progress - milestone 3 complete, awaiting approval`
- Scope: extend the current `test-modules-content`, `test-modules-pages`, and `test-modules-layouts` flow so one reusable page definition can deploy one HTML artifact per eligible blog post into repo-root `deployment/`, with clear operator status and deployment drift awareness.

## Intent

Build a coherent operator flow for blog-post-backed page deployment without rewriting the repo architecture.

The target flow is:

1. Operators create multiple blog posts with unique content in `test-modules-content`.
2. Operators create one reusable page definition in `test-modules-pages` that represents a post-detail page template, not one specific post.
3. Operators assign a reusable layout from `test-modules-layouts`.
4. The system makes the deployment relationship visible as part of normal authoring and publishing, not as a hidden utility.
5. The system resolves one page payload per eligible blog post and writes one HTML artifact per post into repo-root `deployment/`.
6. The operator can see when deployment is synced, stale, missing, or outdated because content, layout, or pages-module settings changed.

## Critical Product Clarification

This feature must not be designed as “there is a button somewhere that runs the whole thing”.

The correct product shape is:
- deployment is a first-class system state
- template pages have visible deployment intent and deployment health
- post edits, layout edits, and settings edits visibly affect deployment state
- operators understand what is live, what is stale, and what action is required from the normal desks they already use
- actions may still exist, but they are part of a coherent publication workflow, not the product itself

So the delivery target is not “add batch-generate button”.
It is “embed multi-post deployment into the content/pages/layouts workflow so the operator understands and controls it naturally”.

## Current State

### Content module

`test-modules-content` currently owns:
- `blog-posts`
- `blog-post-revisions`
- canonical post content, taxonomy/media references, revision history, and post lifecycle

Important current properties:
- posts have stable ids, slugs, timestamps, and publish status
- posts already carry SEO fields that can serve as page-head defaults
- content mutations do not auto-create pages anymore

### Pages module

`test-modules-pages` currently owns:
- `blog-pages`
- `blog-redirect-rules`
- page route/path
- reusable layout reference (`layoutId`)
- page-level SEO fields
- declarative data sources
- runtime script URLs
- resolved delivery payload preview
- single-page publish/write to repo-root `deployment/`

Important current properties:
- current publish flow is record-oriented: one page -> one artifact
- `primarySource` currently expects a specific record id when a source is selected
- `path` is currently a concrete path, not a pattern
- `deploymentArtifactPath` and `deploymentSyncedOn` only describe one artifact per page record
- pages-module settings exist in the manifest (`appMountTagName`) but are not surfaced in the custom Pages desk UI today

### Layouts module

`test-modules-layouts` currently owns:
- `page-layouts`
- dedicated layout builder
- reusable layout JSON documents

Important current properties:
- pages can reference layouts by `layoutId`
- delivery payload resolution already pulls `layoutDocument` into `renderModel`
- there is no clean page->layout->page round trip UX yet

### Deployment runtime

Current static HTML generation already supports:
- HTML skeleton generation
- SEO/meta injection
- configurable app mount tag from module settings
- per-page runtime script list injection
- embedded `application/json` page payload
- output under repo-root `deployment/`

Current limitation:
- deployment is centered on one page record resolving to one artifact path

## Gaps Between Current State And Target Flow

1. `blog-pages` cannot currently represent a reusable post-detail template that expands across many blog posts.
2. There is no artifact registry for one page definition generating many deployed outputs.
3. There is no stale/deployment-drift model for:
   - new eligible posts
   - edited posts
   - archived/unpublished posts
   - changed layout definitions
   - changed pages-module settings
4. The Pages desk does not expose settings or deployment state clearly enough for operators.
5. The Pages desk can select a layout, but it does not support a good route to the Layouts builder and back.
6. Current page preview is page-centric, not template-instance-centric.
7. Current deployment metadata fields only describe a single artifact path, not many generated artifacts.
8. Content, Pages, and Layouts currently do not communicate deployment impact to the operator in a coherent way.

## Recommended Product Model

Treat `blog-pages` as one of two things:

1. `single-page`
- current behavior
- one page record resolves to one deployed artifact

2. `per-record template`
- new behavior for this task
- one page record defines how to generate one deployed artifact per eligible source record

For the target blog flow, the operator will create a `per-record template` page for `blog-post` records.

## Assumptions To Lock For This Delivery

These are my recommended assumptions for approval:

1. Eligible source items for the new flow are `blog-posts` with `status = published`.
2. Existing `single-page` deployment semantics stay intact in this task.
   - single pages may continue to auto-sync the one artifact they own today
3. `per-record template` deployment is embedded into the page publication workflow.
   - the operator should see deployment health from the Pages desk and related desks
   - explicit actions may still exist, but the workflow is state-first, not button-first
4. Phase-1 tokenized path support is intentionally bounded.
   - allow `{slug}` and `{id}` for `blog-post` pages
   - do not add arbitrary template expressions
5. For `per-record template` pages, page-level SEO fields act as defaults/fallbacks.
   - source post SEO/title/body remain the primary source of truth for each generated post page
6. Redirect HTML generation remains out of scope.
7. No shared/core deployment abstraction is introduced.
   - this remains owned by `test-modules-pages`

## Proposed Module Boundaries

### `test-modules-content`

Keep ownership unchanged.

This module should continue to own:
- post content
- post timestamps
- post publication status
- post SEO fields
- revisions

Planned changes here should be minimal:
- expose deployment impact hints for posts when relevant
- only expose or reuse existing post data needed for deployment eligibility and instance resolution
- no deployment writer logic in content

### `test-modules-pages`

This is the main module for the task.

It should own:
- template-vs-single-page behavior
- per-record source expansion logic
- deployment planning and sync actions
- artifact registry and stale detection
- operator status surfaces
- page preview for template instances
- page/layout/settings deployment coherence
- the publication-state model for template deployments

### `test-modules-layouts`

Keep ownership unchanged.

This module should own:
- layout records
- layout builder UI
- layout document editing

Only additive work here:
- better deep-link and return flow with the Pages desk
- deployment-impact hinting when a layout is referenced by stale page templates

### Core/frontend shared runtime

Default posture: do not change core.

One possible small exception may be needed only if module-local routing proves too weak for a clean page->layout->page round trip.
If that happens, prefer a very thin route-context helper, not a structural navigation rewrite.

## Proposed Data Model

### Changes to `blog-pages`

Add the following fields to `test-modules-pages`:

1. `deploymentMode`
- enum
- values:
  - `single-page`
  - `per-record`
- default: `single-page`

2. `pathPattern`
- text
- required only when `deploymentMode = per-record`
- example: `/posts/{slug}`
- used to generate one concrete path per source record

3. `sourceSelectionMode`
- enum
- values:
  - `none`
  - `specific-record`
  - `all-records`
- default:
  - `none` when `primarySourceType = none`
  - `specific-record` for current page flows
- for the new posts template flow:
  - `primarySourceType = blog-post`
  - `sourceSelectionMode = all-records`

4. deployment summary fields on the page record
- `deploymentStatus`
  - `clean`
  - `stale`
  - `missing`
  - `error`
- `deploymentTargetCount`
- `deploymentSyncedCount`
- `deploymentStaleCount`
- `deploymentMissingCount`
- `deploymentLastRunOn`

These summary fields are recommended because they make the list/desk view legible without forcing operators into a second screen just to know if a page template is healthy.

### New collection: `page-deployment-artifacts`

Add a pages-module-owned collection to persist generated artifact state per resolved page instance.

Recommended fields:
- `pageId` -> reference `blog-pages`
- `sourceType` -> enum
- `sourceItemId` -> text
- `sourceLabel` -> text
- `resolvedPath` -> text
- `artifactRelativePath` -> text
- `status` -> enum:
  - `synced`
  - `stale`
  - `missing`
  - `orphaned`
  - `error`
- `staleReasonCodes` -> string-list optional
- `pageVersionToken` -> text
- `sourceVersionToken` -> text
- `layoutVersionToken` -> text
- `settingsVersionToken` -> text
- `payloadHash` -> text
- `htmlHash` -> text
- `lastSyncedOn` -> text
- `lastEvaluatedOn` -> text
- `lastErrorMessage` -> text optional

Why a collection is preferable here:
- one page template can generate many outputs
- operators need instance-level status
- stale detection needs persistent comparison state
- cleanup of removed/unpublished posts needs visible bookkeeping

## Proposed Runtime Design

### 1. Template instance resolution

Extend page resolution inside `test-modules-pages` with a new module-local concept:
- `resolvePageInstanceDeliveryPayload({ page, sourceRecord })`

For `single-page`:
- reuse the current `resolvePageDeliveryPayload()` behavior

For `per-record`:
- require `primarySourceType`
- enumerate eligible source items
- inject one source item at a time as the page's effective primary source
- resolve the same delivery payload shape the renderer already expects
- compute the concrete `resolvedPath` from `pathPattern`

This keeps the payload contract coherent for downstream renderers.
The difference is only how the page instance is chosen.

### 2. Eligible source enumeration

For this delivery, add a bounded enumerator:
- `blog-post` + `all-records` -> list all published posts

Do not generalize beyond approved source types in this task.
That would be T02-style expansion, not needed here.

### 3. Path pattern resolution

Add a module-local path resolver in Pages.

Phase-1 token support:
- `{slug}`
- `{id}`

Rules:
- resolved path must normalize through the existing safe path rules
- resolved path must be unique across generated artifacts for the template
- conflicts are validation failures in preview/sync

### 4. Deployment sync engine

Add a deployment sync flow for `per-record` pages:
- read current page template
- enumerate eligible source posts
- resolve one payload per post
- render one HTML artifact per post
- write/update files under `deployment/`
- upsert one `page-deployment-artifacts` record per generated artifact
- remove obsolete files/artifact records for sources that are no longer eligible
- write page summary fields after sync

Important product rule:
- this is an engine behind the workflow, not the workflow itself
- operators should experience the state of deployment first, and the action second

### 5. Stale detection

A `per-record` page becomes stale when any of these change after the last sync:
- the page template record
- the chosen layout record
- pages-module settings used by deployment
- an eligible source post
- the eligible source set itself
  - new published post
  - archived/unpublished/deleted post

Recommended implementation:
- store version tokens on each artifact record
- compute current tokens from:
  - page `updatedOn`
  - source `updatedOn`
  - layout `updatedOn`
  - hash of resolved pages-module settings relevant to deployment
- compare current tokens to stored tokens to mark `synced` or `stale`
- artifacts with no current eligible source become `orphaned` until the next sync removes them
- roll these instance states up onto the parent page template summary fields

### 6. Embedded workflow over utility action

The operator model should be:
- `Content` tells me if a deployed template depends on this post and is now stale
- `Pages` tells me whether the template deployment is healthy
- `Layouts` tells me if changing this layout affected deployed pages
- the system clearly distinguishes:
  - content saved
  - page template published
  - deployment synced
  - deployment stale

That means the UI should expose state transitions such as:
- `Template published, deployment stale`
- `3/4 deployed outputs synced`
- `1 missing output because a new eligible post exists`
- `layout changed, 4 outputs require redeploy`

There may still be actions like `Sync Deployment`, but they should appear as the natural next step in an already visible lifecycle.

## Proposed UI And Operator Flow

### Pages desk overview

Extend the Pages desk summary to show deployment coherence, not just page status.

Recommended summary cards:
- published page templates
- synced deployment instances
- stale deployment instances
- missing deployment instances
- active redirects

Recommended row/list signals for each page template:
- deployment mode
- deployment status
- last sync time
- counts summary like `12 synced / 2 stale / 1 missing`

### Page editor: split into four operator sections

1. `Identity`
- title
- page kind
- page status
- deployment mode

2. `Source + Routing`
- primary source type
- source selection mode
- specific source item when applicable
- path for single-page mode
- path pattern for per-record mode
- example resolved path preview when possible

3. `Presentation`
- layout selection
- clear `Open Layout Builder` action
- clear `Return From Layout Builder` behavior
- page-level SEO defaults / runtime scripts / render policy

4. `Deployment`
- deployment status banner
- eligible source count
- generated artifact count
- stale/missing/orphaned counts
- last sync timestamp
- `Preview Sample Instance`
- contextual next step action such as `Sync Deployment`
- action wording must describe state, not just mechanics

### Template-instance preview

Current delivery preview is page-level.
For `per-record` pages, the operator also needs:
- a sample instance selector
- or a first-source preview

Recommended behavior:
- when the page is a `per-record` template, show an instance picker populated by eligible posts
- preview uses the selected source post and shows:
  - resolved payload
  - resolved output path
  - current deployment state for that instance

### Deployment instances panel

Add a secondary panel or tab to the Pages desk for `Deployment Instances`.

This should show per generated artifact:
- source post label
- resolved path
- artifact file path
- status
- stale reason if present
- last synced timestamp

This is the cleanest way to make deployment drift obvious to operators.

### Content-module awareness

Add light deployment-awareness to the Content desk for posts.

Goal:
- when an operator edits a published post that participates in one or more per-record page templates, the system should not pretend everything is fine

Recommended UI:
- a small non-blocking status surface on the post editor/detail side:
  - `Affects 1 deployed page template`
  - `Deployment stale after save`
- this is awareness only, not deployment control

### Layouts-module awareness

Add light deployment-awareness to the Layouts module.

Goal:
- if an operator changes a reusable layout used by deployed page templates, the system should show that this has deployment impact

Recommended UI:
- referenced-by summary
- affected page templates count
- stale-impact note after save

### Pages settings in the custom view

Current gap:
- the Pages desk defines module settings in the manifest but does not surface them in the custom UI

Planned fix:
- expose pages-module settings inside the Pages desk
- include deployment-relevant settings in the staleness model
- after settings change, show deployment as stale until sync is run

### Layout builder round trip

Add an explicit operator flow:
- from a selected page, click `Open Layout Builder`
- open the chosen layout in `test-modules-layouts`
- preserve return context
- show `Return To Page` in the layout builder when that context is present
- return directly to the same page record editor after saving or leaving the layout

Preferred implementation path:
- module-specific route state/query fields
- module-local route URL helpers
- avoid window-location hacks if possible
- only add a tiny core helper if module-local route plumbing cannot support this cleanly

## Proposed Server/API Additions

Within `test-modules-pages/server/routes.mjs` add new routes:

1. `POST /pages/:pageId/sync-deployment`
- explicit sync for one page record
- for `single-page`, can reuse current single artifact behavior
- for `per-record`, runs the batch deployment flow

2. `GET /pages/:pageId/deployment-summary`
- returns page-level deployment summary and counts

3. `GET /pages/:pageId/deployment-instances`
- returns artifact rows for operator visibility

4. optional: `POST /deployment/sync-stale`
- module-level convenience action
- not required for the first execution slice, but useful if the page settings change and many templates become stale

Keep current routes intact:
- `publish-now`
- `delivery`
- `delivery/resolve`

## Proposed Validation Rules

### Page record validation

For `single-page`:
- `path` required
- `pathPattern` empty
- `sourceSelectionMode` may be `none` or `specific-record`

For `per-record`:
- `primarySourceType` required and cannot be `none`
- `sourceSelectionMode` must be `all-records`
- `pathPattern` required
- `primarySource.itemId` must be empty
- current phase only allows `primarySourceType = blog-post`
- page-level SEO inputs are treated as defaults, not strict per-instance overrides

### Deployment sync validation

Before writing any file:
- all resolved output paths must be unique
- all output paths must pass safe-path validation
- selected layout must exist when `layoutId` is set
- all runtime script URLs must be normalized/valid by current rules

## Proposed Execution Slices

### Slice A - Contract + data model groundwork

Goal:
- make the data model capable of representing single-page vs per-record page templates

Work:
- update pages-module contract
- extend `blog-pages` schema
- add `page-deployment-artifacts` collection
- add normalization/validation rules
- keep current single-page behavior working

Acceptance:
- create/update page template record without regressing current pages

### Slice B - Template instance resolution + preview

Goal:
- resolve one page payload per eligible post without writing files yet

Work:
- add `resolvePageInstanceDeliveryPayload`
- add eligible post enumeration
- add `pathPattern` resolution
- add sample-instance preview in Pages UI

Acceptance:
- one `posts page` can preview at least two distinct post instances with different resolved payloads and output paths

### Slice C - Deployment artifact registry + embedded status model

Goal:
- make deployment state visible and trustworthy before the final UX polish

Work:
- implement artifact registry
- roll artifact state up to page-template summary state
- detect stale/missing/orphaned outputs from posts/layouts/settings changes
- expose meaningful page-level deployment status

Acceptance:
- edit one post and the related page template visibly becomes stale without guessing
- add one new eligible post and the template visibly becomes missing/out-of-date before sync

### Slice D - Deployment sync execution

Goal:
- make the system actually generate/update/remove the HTML outputs coherently

Work:
- implement sync route
- implement artifact write/update/remove logic
- keep page summary fields updated after sync
- keep current single-page publish flow intact

Acceptance:
- create two posts + one page template -> sync writes two HTML files
- add one new published post -> sync writes a third file
- archive one post -> sync removes obsolete file and artifact row

### Slice E - Desk UX coherence + cross-module awareness

Goal:
- make the feature operable and intuitive across the system

Work:
- deployment summary cards
- per-instance status list
- settings surface in Pages desk
- content awareness surface for impacted post edits
- layout awareness surface for referenced layouts
- layout builder deep-link and return flow
- deployment-state wording and actions

Acceptance:
- operator can move from page -> layout -> page without losing context
- operator can see that settings change makes deployment stale
- operator can inspect why a deployment is stale or missing
- post/layout edits expose deployment impact without forcing the operator to discover it accidentally

### Slice F - Verification + browser scenarios

Goal:
- prove the end-to-end flow in the browser and lock it in tests

Work:
- targeted server tests for template expansion, path validation, artifact sync/remove, and stale detection
- frontend integration tests for page template editing and deployment status
- manual browser flow with screenshots and generated files under `deployment/`
- full `pnpm quality:gate:full`

## Planned Verification Scenarios

### Server/runtime

1. One per-record page template + two published posts -> two artifacts and two artifact records.
2. Draft post is excluded from generation.
3. New published post appears as missing/stale until sync, then gets a new artifact.
4. Archived/unpublished post removes artifact on sync.
5. Layout updated after sync marks dependent artifacts stale.
6. Pages-module settings updated after sync marks dependent artifacts stale.
7. Duplicate resolved paths fail before writing artifacts.

### Frontend/integration

1. Create page template for `blog-post` with `all-records` mode.
2. Select layout and open builder from page editor.
3. Return from builder to the same page.
4. Preview a specific source instance.
5. Trigger sync and see status counts change.
6. Edit a post and confirm the related page deployment becomes stale.
7. Edit a referenced layout and confirm dependent template deployment becomes stale.

### Manual browser proof

1. Create 3 posts with distinct titles/slugs/body.
2. Create one reusable layout.
3. Create one page template with:
   - deployment mode `per-record`
   - primary source type `blog-post`
   - source selection mode `all-records`
   - path pattern `/posts/{slug}`
4. Confirm the template shows expected eligible source count before sync.
5. Sync deployment.
6. Verify 3 HTML files exist in `deployment/posts/...`.
7. Edit one post.
8. Verify the related template shows stale deployment before sync.
9. Edit the layout.
10. Verify the same template still clearly shows deployment drift.
11. Sync again and confirm updated artifacts + refreshed status.

## Out Of Scope

- arbitrary query language or executable page logic
- redirect HTML generation
- content snapshot publishing / release snapshots
- multi-site or locale-aware deployment expansion
- generic non-blog per-record templates beyond the bounded source types above
- client-side runtime rendering changes beyond the existing payload/HTML contract

## Risks And Mitigations

### Risk: too much generalization too early
- Mitigation:
  - only support `blog-post` per-record expansion in this delivery
  - keep tokenized path patterns bounded
  - do not invent a generic query language here

### Risk: deployment metadata sprawls into core
- Mitigation:
  - keep artifact registry and sync engine fully inside `test-modules-pages`

### Risk: operator confusion between single-page and per-record flows
- Mitigation:
  - explicit `deploymentMode`
  - mode-specific validation and UI wording
  - dedicated deployment summary section in the Pages desk
  - content/layout awareness surfaces so deployment state does not only live in one module

### Risk: page-level SEO overrides every generated post identically
- Mitigation:
  - treat page SEO as defaults/fallbacks for template pages
  - keep post SEO/title/body as the primary per-instance head source

## Approval Request

If this plan is approved, I will execute it with this priority:

1. schema and contract groundwork in `test-modules-pages`
2. per-record page instance resolution and preview
3. artifact registry and embedded status model
4. deployment sync execution
5. pages/content/layouts UX coherence and route round trip
6. full verification and browser proof

Recommended assumptions to approve as written:
- eligible source posts are `published` only
- single-page flow stays intact
- per-record templates are embedded into the system workflow, not presented as a detached utility
- phase-1 path tokens are `{slug}` and `{id}` only
- page SEO on templates is fallback/default, not forced override

## Milestone 1 Checkpoint

### Delivered

1. `blog-pages` now supports bounded template semantics:
   - `deploymentMode`
   - `sourceSelectionMode`
   - `pathPattern`
2. `page-deployment-artifacts` is declared as the pages-owned collection reserved for the later sync-state slice.
3. Pages validation now preserves current `single-page` behavior while allowing:
   - `single-page` + `specific-record`
   - `per-record` + `blog-post` + `all-records`
4. Delivery preview now supports template-instance preview:
   - one per-record page template can preview a concrete generated post page by `sourceItemId`
   - resolved page path now comes from `pathPattern`
5. The Pages desk now exposes and edits:
   - deployment mode
   - source selection mode
   - path pattern
   - per-record preview source picker
   - page-level deployment summary fields

### Verified

- `pnpm --filter frontend exec vitest run src/tests/app-integration/blog-distribution.integration.test.jsx`
  - passed on `2026-03-10`
- `pnpm --filter server exec vitest run test/module-conformance/blog-distribution.module-conformance.test.js`
  - passed on `2026-03-10`
- `pnpm lint:function-shape`
  - passed on `2026-03-10`

### Not Yet Delivered

1. Artifact-registry population and per-generated-file sync truth.
2. Embedded stale/missing/orphaned drift model that reacts to post/layout/settings changes.
3. Pages desk workflow for actual multi-artifact sync closure.
4. Cross-module deployment-awareness surfaces in `Content` and `Layouts`.
5. Page -> layout builder -> same page return flow.

### Next Slice After Approval

1. Populate `page-deployment-artifacts` during per-record sync.
2. Compute page-level deployment summary counts from artifact truth.
3. Surface stale/missing/synced state in the Pages desk as the main workflow state.

## Milestone 2 Checkpoint

### Delivered

1. `test-modules-pages` now persists per-record deployment truth in `page-deployment-artifacts`.
2. Per-record sync now:
   - enumerates eligible published `blog-post` records
   - resolves one payload and one output path per post
   - writes one HTML artifact per post
   - upserts one artifact row per generated output
   - removes obsolete artifact rows/files for deleted page records
3. Live deployment-state evaluation now rolls instance truth back onto the page template record:
   - `clean`
   - `stale`
   - `missing`
   - `error`
4. Deployment drift is now visible when:
   - a published source post changes
   - a new published source post becomes eligible
   - the template/layout/settings tokens differ from the last sync
5. Pages desk now treats deployment state as first-class workflow information:
   - summary cards for synced/stale/missing outputs
   - per-page queue counts
   - deployment instances panel with per-output status
   - explicit `Sync Deployment` action only as the natural next step after visible drift
6. Template preview remains instance-aware:
   - preview source picker
   - resolved output path per previewed source item

### Verified

- `pnpm --filter server exec vitest run test/module-conformance/blog-distribution.module-conformance.test.js`
  - passed on `2026-03-10`
- `pnpm --filter frontend exec vitest run src/tests/app-integration/blog-distribution.integration.test.jsx src/tests/app-integration/blog-distribution.per-record.integration.test.jsx`
  - passed on `2026-03-10`
- `pnpm quality:gate:full`
  - passed on `2026-03-10`
- `pnpm quality:protocol`
  - passed on `2026-03-10`

### Not Yet Delivered

1. Cross-module deployment-awareness surfaces in `test-modules-content`.
2. Cross-module deployment-awareness surfaces in `test-modules-layouts`.
3. Page -> layout builder -> same page return flow.
4. Pages-desk module-settings surface for deployment-impact visibility.

### Next Slice After Approval

1. Add cross-module stale-impact awareness in `Content` and `Layouts`.
2. Add a direct page -> layout -> page round trip.
3. Surface deployment-relevant Pages settings inside the custom Pages desk.

## Milestone 3 Checkpoint

### Delivered

1. `test-modules-pages` now surfaces deployment-relevant module settings directly inside the custom Pages desk.
2. `test-modules-pages` now supports a real page -> layout builder -> same page return flow through route-aware custom views.
3. `test-modules-layouts` now shows deployment-impact awareness for the selected reusable layout:
   - referenced page-template count
   - clean/stale/missing deployment counts
   - explicit `Return To Page` action when entered from Pages
4. `test-modules-content` now shows deployment-impact awareness for published blog posts:
   - impacted standalone/per-record pages
   - direct route to the Pages desk for the first affected template
5. The shared frontend seam stayed thin:
   - custom module views now receive `route` and `navigate`
   - no broad routing rewrite was introduced

### Verified

- `pnpm --filter frontend exec vitest run src/tests/app-integration/blog-content.integration.test.jsx src/tests/app-integration/blog-distribution.integration.test.jsx src/tests/app-integration/layouts.integration.test.jsx`
  - passed on `2026-03-10`
- `pnpm quality:gate:full`
  - passed on `2026-03-10`
- `pnpm quality:protocol`
  - passed on `2026-03-10`

### Current State

1. The posts-template deployment flow now has:
   - per-record page templates
   - artifact-level deployment truth
   - Pages desk deployment workflow
   - deployment settings visibility in Pages
   - layout round-trip flow
   - cross-module impact hints in Content and Layouts
2. No app pair is intentionally running after verification.
3. The worktree is intentionally dirty with Milestone 3 and is ready for operator review.

### Remaining Closure Work

1. Run live browser QA of the end-to-end operator flow across:
   - Content
   - Pages
   - Layouts
   - local `deployment/`
2. Tighten any product gaps discovered in that live rehearsal before commit.
