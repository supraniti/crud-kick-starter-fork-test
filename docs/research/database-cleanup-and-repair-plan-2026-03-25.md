## Database Cleanup And Repair Plan

### Goal

Reset the app to a coherent baseline without destroying essential infrastructure.

This pass has two parallel outcomes:

1. Remove redundant hand-made testing content and stale deployment history.
2. Fix the concrete product/runtime failures uncovered during the UI journey so the cleaned baseline actually behaves correctly.

### Actual Persistence Boundary

The current app does **not** use Mongo as the primary source of editorial content.

The active content state is file-backed generated-module persistence under:

- `server/runtime/module-data/test-modules-content-state.json`
- `server/runtime/module-data/test-modules-editorial-state.json`
- `server/runtime/module-data/test-modules-taxonomy-state.json`
- `server/runtime/module-data/test-modules-media-manager-state.json`
- `server/runtime/module-data/test-modules-layouts-state.json`
- `server/runtime/module-data/test-modules-pages-state.json`
- `server/runtime/module-data/test-modules-engagement-state.json`
- `server/runtime/module-data/test-modules-remote-ops-state.json`

Media binaries live on disk under:

- `media/originals`
- `media/derived`

Reference persistence backed by the reference runtime persistence layer must be preserved:

- remote bindings
- domain/browser-delivery setup
- module settings
- jobs/runtime persistence

That means this pass must **not** blanket-delete Mongo state or remotes persistence.

### Current State Snapshot

Current content volume before cleanup:

- posts: `22`
- authors: `20`
- tags: `29`
- categories: `31`
- media items: `36`
- layouts: `3`
- pages: `4`
- page deployment artifacts: `54`
- page deployment bundle runs: `96`
- remote operation runs: `1043`
- comments: `13`

Most of that is proof/testing residue.

### Preserve / Remove Boundary

#### Preserve

Infrastructure that must survive:

- remote connection profile `remoteco-012`
- remote target profiles `remoteta-*`
- custom domain/browser-delivery target on `fastcart.dev`
- deployment target bindings
- projection target bindings
- module settings and reference persistence documents

Clean editorial baseline to preserve:

- clean posts:
  - `blogpost-021` `First Cup On The Table`
  - `blogpost-022` `Park Bench Weather Log`
- clean authors:
  - `blogauth-014`
  - `blogauth-015`
  - `blogauth-016`
  - `blogauth-018`
  - `blogauth-021`
- clean categories:
  - `blogcate-012`
  - `blogcate-017`
  - `blogcate-018`
- clean tags:
  - `blogtags-017`
  - `blogtags-019`
- clean media:
  - `mdi-037`
  - `mdi-040`
  - `mdi-041`
  - `mdi-042`
  - `mdi-043`
  - `mdi-044`
- clean layouts:
  - `pagelayo-002`
  - `pagelayo-003`
- clean pages:
  - `blogpage-013`
  - `blogpage-015`
  - `blogpage-016`
- clean bundles:
  - `pagedepl-001`
  - `pagedepl-003`
  - `pagedepl-004`

#### Remove

Redundant testing state to remove:

- archived launch / remote-flow / proof posts
- synthetic authors and duplicate proof authors
- release/platform/tmp tags
- release/tmp/dispatch taxonomy branches not needed by the clean baseline
- synthetic M04 PNG media and duplicate/derived leftovers not used by the clean baseline
- obsolete layout `pagelayo-001`
- obsolete category page `blogpage-014`
- stale deployment artifacts
- stale bundle runs
- stale remote operation runs
- old local comments/test comments

### Structural Repairs To Implement

#### 1. Standardize The Clean Page Set

Bring the remaining pages into a coherent public contract:

- keep `/post/{slug}` as one published post-family page
- keep `/journal/{slug}` as the second published post-family page
- keep one category page family on `/category/{slug}`
- remove the obsolete `/category/{id}` page
- ensure all kept pages resolve the correct deployment/browser-delivery target ids

#### 2. Keep Reader Navigation Inside The Current Page Family

Current problem:

- same source type can resolve to multiple published pages
- link building currently prefers the first matching page by source type
- that causes adjacent/related/navigation links to jump across page families

Repair:

- when building reader navigation/related links, prefer the currently resolved page id first
- if the current page family can resolve the target record, stay in that family
- only fall back to another published page family if the current family cannot resolve the target

This must be fixed in both:

- local server-side reader model assembly
- deployed public app API reader model assembly

#### 3. Fix Deferred Reader Resolution For Custom Paths

Current problem from the journey:

- `/journal/{slug}` returned `404` on deferred reader fetch

Repair:

- ensure the published pages projection contains the clean retained page set
- ensure custom-path page matching works against the retained pages after cleanup
- validate `/journal/...` bootstrap and deferred fetches after redeploy

#### 4. Fix Comments Loading On Public Post Pages

Current problem from the journey:

- `/post/...` stayed on `Loading comments...`

Repair:

- validate the post-detail model always exposes comment target metadata
- validate runtime augment always registers the comments query/action path for deployed pages
- verify first render and same-app navigation both refresh comments

#### 5. Remove Easy Runtime Noise

Repair:

- stop `favicon.ico` from 404ing on deployed pages
- make the retained baseline smaller by clearing excessive deployment/run history

### Execution Plan

#### Pass A. Content Cleanup Script

Write a deterministic cleanup script that:

- reads the module-data JSON state files
- filters each collection to the approved baseline
- rewrites dangling references
- normalizes counters
- clears stale artifacts/runs/comments

This script must preserve:

- remotes/domain target state
- bundle target bindings on kept bundles

#### Pass B. Media Filesystem Cleanup

After state cleanup:

- remove media files for deleted media items from `media/originals`
- remove derived directories/files for deleted sources
- keep only files referenced by preserved media items

#### Pass C. Reader / Page Contract Repairs

Code changes:

- page-family-aware link resolution
- custom-path deferred resolution validation
- comments loading reliability
- favicon handling

#### Pass D. Remote Reconciliation

After local cleanup and code fixes:

- restart/verify the local review env
- rerun the kept release bundles
- let projection/media/html sync remove stale remote objects/documents

Bundles to rerun:

- `pagedepl-001`
- `pagedepl-003`
- `pagedepl-004`

#### Pass E. Validation

Local validation:

- review env healthy
- local Posts / Media / Pages / Deployments / Comments load
- retained records show only the clean baseline

Focused automated validation:

- `pnpm quality:protocol`
- focused module conformance where the code changes land
- review env verification

Live validation:

- `https://fastcart.dev/post/first-cup-on-the-table`
- `https://fastcart.dev/post/park-bench-weather-log`
- `https://fastcart.dev/journal/first-cup-on-the-table`
- `https://fastcart.dev/category/home-corners`
- `https://fastcart.dev/category/park-walks`

Expected transport:

- first load: document + runtime assets + reader bootstrap/deferred JSON
- in-family navigation: JSON only, no second HTML document
- comments: comments query resolves on first post render and after in-page navigation

### Acceptance Criteria

The pass is complete when all of the following are true:

1. Old launch/proof/testing content is gone from the local app.
2. The remaining local content set is coherent and intentionally curated.
3. The retained pages/layouts/bundles point to the active remote/browser-delivery targets.
4. `/journal/...` no longer 404s on deferred reader loading.
5. `/post/...` comments no longer stall on `Loading comments...`.
6. In-page navigation stays inside the current page family when appropriate.
7. Old remote deployment/projection artifacts are removed by the retained release bundles.
8. `fastcart.dev` renders the cleaned baseline correctly.

### Non-Goals

This pass is not a new content-authoring mission.

It does not:

- rebuild all editorial content from scratch through the UI
- redesign authoring desks again
- change the remote/domain architecture
- replace the deployed reader with a different app model
