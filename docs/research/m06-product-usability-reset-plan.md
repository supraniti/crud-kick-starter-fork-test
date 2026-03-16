# M06 Product Usability Reset Plan

## Purpose
- Move the product from "capable but hard to reason about" to a coherent operator flow.
- Keep the existing backend/runtime capability unless it directly blocks the intended product flow.
- Reduce low-level noise on product routes.
- Make the empty-system journey obvious and actionable.

## Inputs
- [current-state-repo-map.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/current-state-repo-map.md)
- [m05-product-flow-convergence-plan.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/m05-product-flow-convergence-plan.md)
- [m06-directive-and-review-findings-2026-03-16.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/m06-directive-and-review-findings-2026-03-16.md)
- `C:\Users\cmsin\OneDrive\שולחן העבודה\M04-north-start-alignment.txt`

## Core Judgment
- The current system mostly has the mechanics.
- The product still does not express one coherent operator journey strongly enough.
- The next work should focus on:
  - route purpose
  - layout hierarchy
  - next-step clarity
  - direct output visibility
  - stability of route selection

## Delivery Status
- Delivered on `2026-03-16`.
- Passes `1` through `7` are complete.
- Current delivered outcome:
  - `Pages` selection is stable and the route no longer loops while switching saved pages.
  - `Deployments` tells the operator exactly how to recover the missing stored-key state and where to go.
  - `Posts`, `Taxonomies`, `Media`, `Pages`, `Remotes`, `Domains`, and `Deployments` now use clearer primary tabs and split layouts instead of one uninterrupted vertical wall.
  - direct artifact/public URLs are surfaced from:
    - `Posts`
    - `Taxonomies`
    - `Pages`
    - `Deployments`
  - the product setup path now reads primarily as:
    - `Remotes`
    - `Domains`
    - then content/presentation/release routes
  - full verification is green:
    - focused frontend proofs
    - `pnpm lint:function-shape`
    - `pnpm quality:protocol`
    - `pnpm quality:gate:full`

## Target Operator Flow
1. `Remotes`
- create one GCP remote
- validate it
- prepare the standard managed services

2. `Domains`
- choose:
  - owned domain
  - or temporary remote delivery
- understand the resulting public origin immediately

3. `Media`, `Taxonomies`, `Authors`, `Posts`
- create the actual content system
- no setup noise in the main authoring lane

4. `Layouts`
- build one or more layouts
- preview the base rendered structure

5. `Pages`
- create:
  - one posts page template
  - one categories page template
- see:
  - path pattern
  - expected outputs
  - sample public URLs
  - local artifact path

6. `Deployments`
- choose bundle
- inspect the final public outcome
- run one main release action
- see completion

7. product-wide visibility
- pages, posts, taxonomies, media show:
  - synced
  - stale
  - missing
  - public URL when applicable

## Passes

### Pass 1: Stability And Immediate Actionability
- Fix the `Pages` route-selection loop.
- Make the missing-key state in `Deployments` actionable:
  - clear explanation
  - clear CTA to `Remotes`
  - clear instruction on what to click there
- Promote direct browse URLs where already known.

Exit criteria:
- switching pages is stable
- missing-key state tells the operator exactly where to go
- pages and deployments expose direct output URLs more clearly

### Pass 2: Release Route Reset
- Split `Deployments` into clearer primary sections instead of one stacked wall.
- Keep only one primary lane visible first:
  - selected bundle
  - release readiness
  - run release
  - current public output
- push history, runtime JSON, observability, and detailed target operations deeper into secondary sections or tabs.

Exit criteria:
- operator can understand the release route without reading all cards
- the first visible screen answers:
  - what bundle
  - is it ready
  - what URL will it expose
  - what should I click next

### Pass 3: Pages Route Reset
- Keep the left queue and page editor, but separate:
  - authoring
  - output preview
  - deployment status
  - advanced controls
- make per-record/public output information more prominent than raw contract detail
- keep runtime JSON and remote overrides secondary

Exit criteria:
- page switching is stable
- a page route clearly answers:
  - what page this is
  - what it will publish
  - what URL it should have
  - whether it is deployed

### Pass 4: Content Route Context Links
- `Posts`
  - surface direct affected page/public URL links when resolvable
- `Taxonomies`
  - keep categories and tags explicit
  - surface publication and page impact clearly
- `Media`
  - show local/remote/public URL state more directly

Exit criteria:
- content routes connect clearly to release outcomes
- the operator can move from content item to release artifact without guessing

### Pass 5: Setup Choreography Tightening
- simplify the normal setup path across:
  - `Remotes`
  - `Domains`
  - `System Settings`
- reduce repeated selectors and repeated explanations
- make system defaults secondary again if the normal route is already configured

Exit criteria:
- setup reads as one flow, not three competing desks

### Pass 6: Product Layout System
- introduce a more reusable product page composition pattern for the main desks:
  - hero
  - key state
  - primary workspace
  - secondary sections
- stop mixing every concern into one uninterrupted vertical stream

Exit criteria:
- main desks stop reading like long generic admin forms
- shared structure is visible across routes without flattening all of them into the same UI

### Pass 7: End-To-End Rehearsal And Closeout
- rehearse the full empty-system-to-release path again
- refresh docs and progress pointers
- verify the major product routes behave coherently in browser

Exit criteria:
- one realistic operator path works without internal repo knowledge
- docs reflect the new baseline
- full gate is green

## Execution Order
- fixed:
  1. Pass 1
  2. Pass 2
  3. Pass 3
  4. Pass 4
  5. Pass 5
  6. Pass 6
  7. Pass 7

## Closeout Notes
- This plan did not try to invent a new capability program.
- It tightened the existing product around the operator journey that already exists in the repo.
- The current delivered baseline should now be treated as the starting point for the next program, not as another pass list to reopen.

## What This Plan Will Not Do
- it will not reopen the M04/M05 capability program
- it will not add large new backend concepts unless required by the operator flow
- it will not treat raw module surfaces as the product default if a product route already exists
