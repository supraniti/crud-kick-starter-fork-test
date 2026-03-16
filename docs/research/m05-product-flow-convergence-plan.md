# M05 Product Flow Convergence Plan

## Purpose
- Use the already-implemented capabilities to produce a coherent operator flow.
- Reduce reasoning load.
- Stop exposing low-level configuration and module detail as the default user experience.
- Move the system closer to the north-star product shape without throwing away the working backend/runtime capabilities.

## Source Inputs
- [current-state-repo-map.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/current-state-repo-map.md)
- `C:\Users\cmsin\OneDrive\שולחן העבודה\M04-north-start-alignment.txt`
- Live product routes inspected on `2026-03-16`:
  - `/app/system-settings`
  - `/app/remotes`
  - `/app/domains`
  - `/app/taxonomies`
  - `/app/posts`
  - `/app/pages`
  - `/app/deployments`
  - `/app/authors`

## What This Plan Is
- A forward convergence program.
- Not a recovery plan.
- Not a capability-expansion plan.
- It assumes the platform already has most of the necessary mechanics and focuses on re-expressing them as one usable product flow.

## Execution Status
- `Pass 1` is delivered.
- `Pass 2` is delivered.
- `Pass 3` is delivered.
- `Pass 4` is delivered.
- `Pass 5` is delivered.
- `Pass 6` is delivered.
- Delivered in Pass 1:
  - fixed `/app/authors`
  - expanded product-shell ownership to:
    - `Media`
    - `Taxonomies`
    - `Posts`
    - `Layouts`
    - `Pages`
  - grouped the sidebar by workflow stage:
    - `Setup`
    - `Content`
    - `Presentation`
    - `Release`
  - added shell-level route guidance:
    - current stage
    - current desk purpose
    - next-step action
- Verified:
  - focused frontend proofs passed
  - `pnpm quality:protocol` passed
  - `pnpm quality:gate:full` passed
- Delivered in Pass 3:
  - `Posts`, `Taxonomies`, and `Media` now keep remote publication/sync controls in secondary expandable sections instead of making them primary authoring surfaces
  - `Taxonomies` now reads more clearly as `Categories` plus `Tags` instead of category-first switching language
  - content desks keep the same remote mechanics, but the default operator emphasis is now on authoring and content structure first
- Verified:
  - focused frontend proofs passed
  - `pnpm lint:function-shape` passed
  - `pnpm quality:protocol` passed
  - `pnpm quality:gate:full` passed
- Delivered in Pass 2:
  - `System Settings` now reads as `Advanced Product Defaults` instead of a second setup headquarters
  - added a setup-flow card that points the normal operator path to:
    - `Remotes`
    - `Domains`
  - added a compact summary of the currently-bound product defaults
  - moved the remote target selectors and per-module save actions behind:
    - `Show Advanced Defaults`
  - kept the backend settings model intact while demoting it out of the normal setup path
- Verified:
  - focused frontend proofs passed
  - `pnpm quality:protocol` passed
  - `pnpm quality:gate:full` passed
- Delivered in Pass 4:
  - `Pages` now starts from explicit page-type choices:
    - `Standalone Page`
    - `Post Detail Template`
    - `Category Detail Template`
  - `Pages` keeps:
    - output forecast
    - delivery preview
    - deployment instances
    as the central operator surface
  - `Pages` now demotes:
    - remote overrides
    - runtime contract inspection
    - module defaults
    - delivery operations
    into secondary expandable sections
  - `Layouts` now explains the normal authoring sequence directly in the builder so the route reads as:
    - name the layout
    - build structure
    - preview structure
    - return to Pages
- Verified:
  - focused frontend proofs passed
  - `pnpm lint:function-shape` passed
  - `pnpm quality:protocol` passed
  - `pnpm quality:gate:full` passed
- Delivered in Pass 5:
  - `Deployments` now keeps the primary release flow centered on:
    - release readiness
    - public output forecast
    - runtime release preview
    - release footprint and cost analysis
    - release history
  - `Deployments` now demotes:
    - bundle setup
    - per-target manual compare/execute/validate controls
    into secondary expandable sections
  - the route now reads as:
    - choose or create bundle
    - inspect forecast
    - run deployment
    - inspect result
    rather than a flat operational dashboard
- Verified:
  - focused frontend proofs passed
  - `pnpm quality:protocol` passed
  - `pnpm quality:gate:full` passed
- Delivered in Pass 6:
  - `Posts` now surfaces release state in the primary desk:
    - published-with-page coverage
    - posts needing deployment
    - published posts with no page template
    - per-post impacted page and deployment chips in the main list
  - `Taxonomies` now surfaces collection-level publication state directly in the main desk:
    - no remote
    - target unvalidated
    - nothing to publish
    - not synced
    - changed locally
    - synced
  - `Media` now surfaces library-wide sync posture in the primary desk:
    - total assets
    - synced
    - changed locally
    - not synced
    - remote-only artifacts
  - `Pages` output forecast now shows the current local artifact path directly
  - `Deployments` now includes a dedicated browse-links card with:
    - local artifact path
    - public origin
    - example page URL
    - media base
- Verified:
  - focused frontend proofs passed
  - `pnpm lint:function-shape` passed
  - `pnpm quality:protocol` passed
  - `pnpm quality:gate:full` passed

## Intended Operator Flow

### Step 1: Connect the remote
Screen:
- `Remotes`

User sees:
- one primary card: `Add Remote`
- provider selector
- remote name
- GCP key file chooser
- suggested project id
- clear health status
- one managed-service checklist:
  - posts data
  - taxonomies data
  - media storage
  - html deployment
  - browser delivery

User fills:
- remote name
- provider
- key file
- optional project override

User clicks:
- `Validate Connection`
- `Prepare Services`

User learns:
- what is ready
- what is blocked by permissions
- what still needs provisioning

### Step 2: Configure delivery
Screen:
- `Domains`

User sees:
- one primary mode choice:
  - `Use My Domain`
  - `Use Temporary GCP URLs`
- linked remote
- resulting html base url
- resulting media base url
- resulting data surfaces
- DNS instructions only if custom domain is used

User fills:
- hostname if they own a domain
- DNS mode only if needed

User clicks:
- `Analyze Domain Setup`
- `Provision Domain Stack`

User learns:
- exact public origin or temporary origin
- exact DNS action if external DNS is used
- whether browser delivery is ready

### Step 3: Create the actual content
Screens:
- `Media`
- `Taxonomies`
- `Authors`
- `Posts`

User sees:
- content-first CRUD
- clear reference relationships
- sync/deploy state only as status, not as low-level setup

User does:
- uploads media
- creates categories and tags
- creates authors
- creates posts that reference media/authors/taxonomies

User learns:
- what is complete vs incomplete
- what is already synced remotely vs local-only

### Step 4: Define presentation
Screens:
- `Layouts`
- `Pages`

User sees:
- layout builder with visual preview
- simple page type choices:
  - standalone
  - post detail template
  - category detail template
- clear path pattern
- SEO defaults
- output forecast
- runtime preview

User does:
- creates one layout
- creates one posts page
- creates one categories page

User learns:
- how many files each page will generate
- example URLs
- what content source each page depends on

### Step 5: Deploy
Screen:
- `Deployments`

User sees:
- one release-oriented workflow
- selected pages
- selected domain
- selected remote
- expected outputs
- sync/deploy readiness
- run progress
- finished result with links

User clicks:
- `Run Deployment`

User learns:
- when deployment starts
- when it ends
- what succeeded
- what failed
- where to browse the result

### Step 6: Observe state everywhere
Screens:
- `Posts`
- `Taxonomies`
- `Pages`
- `Media`
- `Deployments`

User sees:
- deployed vs not deployed
- synced vs not synced
- impacted page counts
- local preview links
- remote preview links

## Current Observed State

## What already exists
- Remote validation and provisioning exist.
- Domain/temporary delivery support exists.
- Taxonomies support both categories and tags in code and UI.
- Posts/Pages/Layouts/Media/Deployments all have working flows.
- Deployment bundles and remote sync are real.
- Per-record pages exist for both posts and categories.

## Main product mismatches

### 1. The flow is fragmented across too many surfaces
- Core setup is split between:
  - `Remotes`
  - `Domains`
  - `System Settings`
  - module-level remote selectors
- Release flow is split between:
  - `Pages`
  - `Deployments`
  - `Posts`
  - `Taxonomies`
  - `Media`

### 2. Too much low-level configuration is still exposed
- `System Settings` currently exposes remote target selectors and per-module save actions for:
  - pages delivery
  - posts projection
  - categories projection
  - tags projection
  - media sync
- `Domains` still embeds raw target editing.
- `Pages` still exposes remote binding overrides, module settings, deployment controls, browser-delivery validation, payload preview, and runtime contract in one long surface.
- `Deployments` still exposes bundle editing plus per-target compare/execute cards in one screen.

### 3. Product routes are inconsistent
- Some north-star routes are true product-owned surfaces:
  - `System Settings`
  - `Remotes`
  - `Domains`
  - `Deployments`
  - `Authors`
  - `Comments`
- Other routes are still mostly raw module views with a relabeled navigation entry:
  - `Media`
  - `Taxonomies`
  - `Posts`
  - `Layouts`
  - `Pages`
- This inconsistency is one of the main reasons the system feels hard to reason about.

### 4. Taxonomy is implemented more clearly than it is expressed
- The codebase already supports:
  - `blog-categories`
  - `blog-tags`
  - remote categories projection
  - remote tags projection
  - category page fan-out
- But the product expression still reads category-first, not taxonomy-system-first.

### 5. State is visible, but not expressed in a guided way
- There is already a lot of state:
  - validated
  - stale
  - missing
  - clean
  - synced
  - ready
  - blocked
- But the operator still has to infer:
  - what matters now
  - what the next step is
  - which screen owns the next action

### 6. One route is currently broken
- This blocker is closed.
- `/app/authors` no longer crashes.
- The root fix was passing the routed module id into the collections domain instead of inferring it from the URL path.

## Design Decisions For Convergence

### 1. Product flow wins over module exposure
- The operator should think in:
  - setup
  - content
  - presentation
  - deployment
- Not in:
  - target profiles
  - module settings repositories
  - internal route ownership

### 2. Setup should happen once
- Remote and domain setup should be primary configuration surfaces.
- Downstream desks should mostly consume those bindings, not re-ask for them.

### 3. Advanced controls should be demoted
- Low-level target editors and override selectors should move to:
  - advanced sections
  - secondary drawers
  - debug/operator surfaces
- They should not define the normal journey.

### 4. Each route should have one main job
- `Remotes`: connect and prepare infrastructure
- `Domains`: choose public delivery mode and domain behavior
- `Media`: manage media and remote media state
- `Taxonomies`: manage categories/tags and their remote publication state
- `Authors`: manage authors
- `Posts`: manage posts
- `Layouts`: define structure
- `Pages`: define transformations from content to HTML
- `Deployments`: run releases and inspect outcomes
- `System Settings`: advanced defaults and global behavior only

### 5. Deployment should feel like one action
- The system already has the mechanics.
- The UI should make deployment read as:
  - choose what is being released
  - run deployment
  - inspect result
- Not as many compare/sync rituals spread across multiple desks.

## Execution Plan

## Pass 1: Product Information Architecture Tightening
Objective:
- make every north-star route read as a product route first
- remove mixed mental models

Main work:
- define route purpose for each north-star desk
- convert remaining module-first routes into product-first shells
- fix `/app/authors` crash
- remove obvious duplicate or dead explanatory text

Exit criteria:
- every sidebar route has a clear single purpose
- `Authors` route is stable
- product shell no longer feels half product / half raw module

Status:
- delivered on `2026-03-16`

## Pass 2: Core Setup Flow Simplification
Objective:
- make setup understandable on an empty system

Main work:
- keep remote setup in `Remotes`
- keep delivery setup in `Domains`
- shrink `System Settings` into advanced defaults instead of target binding headquarters
- remove repeated target selection from downstream desks wherever product defaults already exist
- express one setup progression:
  - connect remote
  - prepare services
  - choose domain mode
  - verify delivery

Exit criteria:
- a new operator can set up remote + domain without visiting multiple unrelated forms
- core setup no longer requires understanding target kinds or module settings

Status:
- delivered on `2026-03-16`

## Pass 3: Content Flow Simplification
Objective:
- make authoring and asset creation feel straightforward

Main work:
- `Media`
  - make sync state primary
  - reduce low-level remote noise
- `Taxonomies`
  - explicit tabs for categories and tags
  - make future taxonomy extensibility visible in structure
  - keep projection status as secondary state, not setup burden
- `Authors`
  - keep as regular data type
- `Posts`
  - keep editor centered on content authoring
  - keep readiness and dependencies visible
  - remove unnecessary setup/config from the main authoring surface

Exit criteria:
- content creation is understandable without first learning deployment internals
- categories and tags are clearly both part of Taxonomies

Status:
- delivered on `2026-03-16`

## Pass 4: Presentation Flow Simplification
Objective:
- make layout/page authoring feel like defining presentation, not operating internals

Main work:
- `Layouts`
  - keep builder + preview
  - reduce non-essential noise
- `Pages`
  - page type first:
    - post detail
    - category detail
    - standalone
  - move low-level fields and overrides into advanced sections
  - make forecast and preview central
  - keep runtime contract visible but secondary

Exit criteria:
- a user can create a posts page and a categories page without understanding internal remote binding structure
- output count and example URL are obvious

Status:
- delivered on `2026-03-16`

## Pass 5: Deployment Flow Simplification
Objective:
- make release execution the natural final step of the operator journey

Main work:
- `Deployments`
  - make bundle/release selection primary
  - keep one main CTA: `Run Deployment`
  - move per-target operational controls into advanced/detail sections
  - show progress, completion, and resulting links clearly
- reduce deployment controls on non-deployment routes

Exit criteria:
- deployment reads as one coherent workflow
- the user does not need to jump between multiple desks to complete a release

Status:
- delivered on `2026-03-16`

## Pass 6: State Visibility Across The Product
Objective:
- make “what is deployed/synced/not deployed/not synced” obvious everywhere it matters

Main work:
- posts:
  - impacted/deployed page state
- taxonomies:
  - category/tag deployment and projection state
- pages:
  - local deploy state
  - remote deploy state
- media:
  - local/remote sync state
- deployments:
  - final release result and browse links

Exit criteria:
- the user can understand release state without reading raw run history

Status:
- delivered on `2026-03-16`

## Pass 7: End-To-End Hardening
Objective:
- stabilize and prove the converged flow

Main work:
- fix flow-breaking bugs
- tighten tests to match the intended product journey
- refresh docs and live review data
- rehearse the full empty-system-to-release path

Exit criteria:
- the product flow can be exercised from setup to remote browseability
- docs and tests reflect the converged flow, not the previous fragmented model

## Priority Order
1. Pass 1: Product Information Architecture Tightening
2. Pass 2: Core Setup Flow Simplification
3. Pass 3: Content Flow Simplification
4. Pass 4: Presentation Flow Simplification
5. Pass 5: Deployment Flow Simplification
6. Pass 6: State Visibility Across The Product
7. Pass 7: End-To-End Hardening

## Estimated Number Of Passes
- `7` execution passes to reach the next coherent product baseline
- this assumes no major backend capability invention is needed
- this program is mainly about:
  - expression
  - simplification
  - routing
  - state visibility
  - guided flow

## First Discussion Topics
- whether `System Settings` should shrink to advanced defaults
- whether downstream module-level remote target selectors should disappear from the normal flow
- whether `Deployments` should become the single release owner
- whether `Pages` should become page-type-first instead of contract-field-first
