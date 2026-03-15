# M04 North-Star Alignment Program

## Inputs
- Current-state map:
  - [current-state-repo-map.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/current-state-repo-map.md)
- North-star brief:
  - `C:\Users\cmsin\OneDrive\שולחן העבודה\M04-north-start-alignment.txt`

## Goal
- Move the repo from the current proof-oriented module surface to a stricter product-shaped local CMS.
- Do it in bounded passes.
- Keep core/module separation readable.
- Avoid shotgun surgery.

## End-State Target
- Operator shell uses product language:
  - `System Settings`
  - `Remotes`
  - `Domains`
  - `Media`
  - `Taxonomies`
  - `Posts`
  - `Authors`
  - `Comments`
  - `Layouts`
  - `Pages`
  - `Deployments`
- Baseline proof/test modules stay in repo but are not exposed in normal app runtime.
- Remote/GCP behavior remains owned by `test-modules-remote-ops`, but is surfaced through product desks.
- Domain and deployment flows become first-class operator workflows.
- Pages, deployment artifacts, media, remote projections, and client runtime become one coherent delivery chain.

## Current-State Constraints
- Feature logic already exists, but it is distributed across proof-oriented modules:
  - `test-modules-editorial`
  - `test-modules-taxonomy`
  - `test-modules-content`
  - `test-modules-engagement`
  - `test-modules-pages`
  - `test-modules-layouts`
  - `test-modules-media-manager`
  - `test-modules-remote-ops`
- Product language does not match current shell labels.
- `Domains`, `Deployments`, and `System Settings` are not first-class desks yet.
- Several workflows exist only inside module-specific desks.
- Some capability boundaries are still intentionally narrow:
  - taxonomy/category fan-out pages
  - taxonomy remote projection
  - richer deployment pipeline orchestration
  - client-runtime injection and observation in generated HTML

## Program Structure

### Pass 1: Product Shell Alignment
- Objective:
  - change operator-facing routing and navigation to the north-star language
  - hide baseline proof/test modules from the normal shell
  - add first-class `System Settings`, `Domains`, and `Deployments` desks as product-shell views
- Boundaries:
  - do not rewrite underlying module runtimes
  - reuse existing Pages / Remote Ops / Media / Content support where possible
- Expected result:
  - product-shaped shell
  - meaningful domain/deployment/system-settings entry points

### Pass 2: Strict Settings / Remotes / Domains
- Objective:
  - simplify remote setup around the product model
  - make domain management clearer and stricter
  - make global settings more explicit and auditable
- Candidate work:
  - structured remote target auto-binding
  - health/permission summaries at the product-desk level
  - better domain readiness and DNS/TLS instruction states

### Pass 3: Deployments Pipeline Desk
- Objective:
  - raise `Deployments` from a loose collection of buttons into a product-level release pipeline
- Candidate work:
  - local HTML sync orchestration
  - projection/media/deployment remote procedure orchestration
  - browser-delivery validation as the final release step
  - pipeline readiness and run-log visibility

### Pass 4: Strict Product Remote Governance
- Objective:
  - stop product desks from behaving as if remotes are usable when the remote layer is not actually validated
- Candidate work:
  - product-shell remote health summary
  - strict gating for remote-dependent settings
  - stricter deployment pipeline readiness based on validated targets and connections
  - explicit operator messaging when remote prerequisites are missing or blocked

### Pass 5: Taxonomies / Authors / Comments Alignment
- Objective:
  - strengthen the data-type desks around the intended product model
- Candidate work:
  - taxonomy sync-state awareness
  - taxonomy projection support
  - author/media stricter authoring rules
  - comments sync + moderation pipeline emphasis

### Pass 6: Pages / Layouts / Deployments Alignment
- Objective:
  - raise Pages and Deployments from current proof level to pipeline level
- Candidate work:
  - richer page modes
  - computable SEO defaults and previews
  - deployment bundles built from pages + media + projections + domain + remote
  - layout preview of rendered base structure
  - category fan-out templates and public path resolution

### Pass 7: Client Runtime Integration
- Objective:
  - inject `client-runtime` into generated HTML by default
  - connect delivered JSON, media URLs, and remote collection contracts into runtime config
- Candidate work:
  - page render-time runtime bootstrap contract
  - preview/observe runtime from Pages
  - remote collection/query/action compatibility

## Pass 1 Scope Lock

### In scope
- Product-shell navigation catalog
- Hidden baseline-module policy for normal runtime
- Product route aliases for current feature modules
- First-class product desks:
  - `System Settings`
  - `Domains`
  - `Deployments`
- Header version display
- Documentation and progress-pointer updates

### Out of scope
- category/template fan-out
- taxonomy Firestore projection
- full deployment pipeline redesign
- client-runtime injection
- deep remote/GCP redesign

## Pass 1 Design

### Navigation model
- Keep server module ids unchanged.
- Use frontend product-route descriptors and route aliases for operator-facing URLs.
- Use route segments for clean URLs:
  - `/app/posts`
  - `/app/authors`
  - `/app/taxonomies`
  - `/app/comments`
  - `/app/media`
  - `/app/remotes`
  - `/app/layouts`
  - `/app/pages`
  - `/app/system-settings`
  - `/app/domains`
  - `/app/deployments`

### Visibility model
- Baseline proof/test modules remain discoverable by runtime internals.
- Normal shell sidebar filters them out.
- Product desks and feature desks remain visible.

### Product desks
- `System Settings`
  - aggregate current cross-module persisted settings:
    - Pages
    - Content
    - Media
- `Domains`
  - focused browser-delivery desk on top of Remote Ops browser-delivery targets
- `Deployments`
  - focused orchestration desk on top of:
    - Pages local deployment sync
    - content projection target
    - media remote target
    - deployment remote target
    - browser-delivery validation target

## Verification Strategy
- Targeted frontend integration:
  - shell routing/navigation
  - synthetic product views
  - changed route aliases
- Broader frontend integration if shell changes ripple
- `pnpm quality:protocol`
- escalate to `pnpm quality:gate:full` once pass is stable

## Progress Markers
- `2026-03-14`
  - program doc created
  - Pass 1 selected as active implementation pass
  - Pass 1 completed in worktree:
    - product-shell navigation alignment
    - synthetic `System Settings`, `Domains`, `Deployments`
    - route aliases and north-star labels
  - Pass 2 completed in worktree:
    - validated GCP connection auto-prepares the managed product target bundle
    - module settings auto-bind to prepared targets
    - domains desk shows current public origin / temp URLs / linked services / DNS guidance
  - Pass 3 completed in worktree:
    - deployments desk runs the bounded release pipeline:
      - local HTML sync
      - posts projection compare/execute
      - media compare/execute
      - HTML deployment compare/execute
      - browser-delivery validation
    - smoke lane aligned to the product shell routes and desks
  - Pass 4 completed in worktree:
    - `System Settings` now surfaces product-level remote readiness:
      - validated connection count
      - usable target count by service kind
      - explicit "unlock remotes first" operator messaging
    - remote-dependent selectors now stay locked until a validated remote exists
    - `Deployments` pipeline readiness now distinguishes:
      - ready
      - missing
      - blocked
      - optional
    - configured-but-unvalidated remote targets now block the release pipeline instead of failing later
  - Pass 5 completed in worktree:
    - managed product remote bundle now prepares and binds:
      - posts projection
      - categories projection
      - tags projection
      - deployment storage
      - media storage
      - browser delivery
    - taxonomy module now owns product-bound settings for:
      - remote categories projection target
      - remote tags projection target
    - taxonomy desk now exposes embedded compare/sync flows for:
      - categories projection
      - tags projection
    - product shell now treats categories and tags as required release-pipeline inputs:
      - `System Settings` exposes separate taxonomy projection selectors
      - `Deployments` compares and syncs categories/tags before media/html
  - Pass 6 completed in worktree:
    - pages now support per-record templates for:
      - `blog-post`
      - `blog-category`
    - per-record category templates now:
      - preview eligible public categories
      - generate one output path per category
      - sync local deployment outputs
      - surface deployment instances
    - page delivery path resolution now resolves published per-record templates by generated public path
      - this closes the earlier hole where `/posts/{slug}` payload follow-up routes were emitted but not actually resolvable
  - Pass 7 completed in worktree:
    - page-owned remote bindings now exist directly on `blog-pages`:
      - `remoteDeploymentTargetProfileId`
      - `remoteBrowserDeliveryTargetProfileId`
    - Pages desk now exposes explicit page-owned remote binding selectors instead of relying only on Pages module defaults
    - Pages desk remote compare/validate panels now show whether the effective binding comes from:
      - selected page override
      - Pages module default
    - product `Deployments` now prefers page-owned deployment/browser bindings over module defaults when a specific page is selected
    - synced per-record HTML now uses the same browser-delivery resolution path as preview/delivery APIs
      - module-default browser-delivery bindings and page-owned overrides now both emit domain-aware HTML consistently
  - Pass 8 completed in worktree:
    - deployment bundles are now first-class persisted records in `page-deployment-bundles`
    - each bundle explicitly binds:
      - one published page
      - posts projection target
      - categories projection target
      - tags projection target
      - media target
      - HTML deployment target
      - browser-delivery target
    - product `Deployments` now releases from the selected bundle instead of from looser page/default selection
    - bundle editing now constrains each selector to typed compatible validated targets:
      - posts projection only shows `published-blog-posts`
      - categories projection only shows `public-blog-categories`
      - tags projection only shows `public-blog-tags`
      - media/deployment/browser fields only show matching validated target kinds
    - release-pipeline readiness now starts from:
      - deployment bundle present
      - published page bound by the bundle
      - validated typed targets bound by the bundle
  - Pass 9 completed in worktree:
    - generated page payloads now emit a client-runtime bootstrap contract:
      - runtime asset url
      - bootstrap dataset list
      - page-current query definition
      - inline-json-script dataset definition bound to `page-data`
      - delivery-aware runtime context
    - generated HTML now injects:
      - `window.__CRUD_CLIENT_RUNTIME_CONFIG__`
      - `/assets/client-runtime.global.js`
    - page deployment sync now writes the runtime artifact into the deployment root:
      - `deployment/assets/client-runtime.global.js`
    - `client-runtime` now supports declarative inline-json-script dataset bootstrapping and auto-installs configured bootstrap datasets on global install
  - Pass 10 completed in worktree:
    - delivered page payloads now resolve referenced media ids into first-class media descriptors:
      - public url
      - temporary url
      - local content url
      - preferred url
    - delivered page data now includes companion resolved media objects next to media-id fields:
      - `featuredMediaId` -> `featuredMedia`
      - `galleryMediaIds` -> `galleryMedia`
      - `avatarMediaId` -> `avatarMedia`
      - `ogImageMediaId` -> `ogImageMedia`
    - delivered payloads now expose a top-level media registry:
      - `media.items`
      - `media.byId`
      - `media.referencedIds`
    - generated HTML now writes `og:image` using the resolved media url instead of the raw media id
    - injected `client-runtime` config now bootstraps a second local dataset from delivered media:
      - `page-media`
      - `media.list`
      - `media.byId`
    - injected `client-runtime` config now includes a bounded product-authored remote refresh seam for delivered pages:
      - `page.currentRemote`
      - `page-payload.remoteSync`
      - `page-media.remoteSync`
      - same-origin/default-origin remote base resolution in the browser bootstrap
  - Pass 11 completed in worktree:
    - deployment bundle releases now persist first-class run history in `page-deployment-bundle-runs`
    - each bundle run records:
      - bundle/page snapshot
      - trigger mode
      - started/finished timestamps
      - per-step status and message
      - completed/failed counts
    - product `Deployments` now validates the selected bundle contract before save and before release:
      - published page required
      - typed target kind required
      - expected projection scope required
      - shared validated remote connection required across the bundle
      - browser-delivery linkage must match the selected deployment/media targets
    - product `Deployments` now surfaces:
      - bundle validation card
      - completed release count
      - failed release count
      - selected bundle release history
    - the release pipeline now writes bundle-run records as it progresses instead of only exposing transient UI state
  - Pass 12 completed in worktree:
    - server-side bundle contract enforcement now wraps `page-deployment-bundles` inside `test-modules-pages`
    - create/update routes for deployment bundles now reject invalid contracts even when the frontend validation is bypassed:
      - page required
      - page must exist
      - page must be published
      - each bound remote target must exist
      - each bound remote target must be validated
      - each bound remote target must have the expected target kind
      - posts/categories/tags projection targets must use the expected projection scope
      - all selected targets must share one validated remote connection
      - browser-delivery target linkage must match the selected deployment/media targets when declared
    - the validation boundary stays module-local:
      - `test-modules-pages` owns the contract
      - generic reference collection routes stay unchanged
    - the product Deployments desk is no longer the only place that knows what a valid deployment bundle is
  - verification for the active worktree:
    - `pnpm quality:gate:full` passed
    - `pnpm quality:protocol` passed

## Active Gap After Current Passes
  - Product shell is now closer to the north star, but several north-star behaviors are still pending:
    - remote billing/cost summaries are not surfaced yet
    - author/comment product-shell alignment is still thinner than posts/taxonomies/pages/media
    - remote/public delivery still needs stronger final-contract alignment around broader runtime remote contracts and bundle observability
    - generated HTML now boots `client-runtime`, and delivered pages can re-sync their page/media datasets, but richer product-authored query/action contracts are still not emitted from local CMS configuration
    - bundle save contracts are now enforced server-side, but bundle-driven release mission hardening is still thinner than the stricter persisted bundle contract
