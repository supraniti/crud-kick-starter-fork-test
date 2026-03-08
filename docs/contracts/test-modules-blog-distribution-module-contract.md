# Test Modules Blog Distribution Module Contract

## Metadata
- Contract ID: `module-contract.test-modules-blog-distribution.v1`
- Date: `2026-03-08`
- Milestone: `blog-management-modules`
- Owner: `codex`
- Status: `approved`

## Module Brief
- Module name: `test-modules-blog-distribution`
- Business objective: manage redirect rules, scheduling surfaces, and SEO/social distribution policy without taking ownership away from post content storage.
- Primary users: editors and managing editors.
- Non-goals:
  1. Post body editing.
  2. Comment moderation.
  3. Media upload/storage.

## Domain Model
- Primary entities:
  - `blog-redirect-rules`
- Core fields:
  - `sourcePath`, `targetPostId`, `targetUrl`, `httpCode`, `status`, `reason`, `createdOn`, `updatedOn`
- Relations:
  - `blog-redirect-rules.targetPostId -> blog-posts`
  - scheduling and SEO views read `blog-posts` but do not own the post record
- Validation rules:
  - unique `sourcePath`
  - either `targetPostId` or `targetUrl` must be set
  - `httpCode` in `301|302|307|308`
  - `status` in `active|disabled`
  - `targetUrl` must be a valid URL when present

## UI Surfaces
- Routes/views:
  - redirect manager route
  - distribution overview route for scheduling queue and SEO/social warnings
- CRUD interactions:
  - create/update/disable redirect rules
  - inspect scheduled posts and distribution readiness
  - run publish-ready actions that coordinate with post lifecycle ownership
- Filters/search/sort needs:
  - redirect filters for `status`, `httpCode`, `targetPostId`
  - distribution filters for `status`, `scheduledOn`, SEO warning presence
  - sort by `scheduledOn`, `updatedOn`
- Empty/loading/error states:
  - explicit empty redirect registry
  - explicit empty scheduled queue
  - deterministic redirect validation errors

## Behavior Extensions
- Settings:
  - module settings may hold SEO/social warning thresholds and default social fallbacks if required
- Actions:
  - activate/disable redirect
  - publish scheduled post
  - validate distribution readiness
- Jobs:
  - schedule/publish flows may use module-local actions or missions if existing seams are sufficient
- Remotes/integrations:
  - consumes `blog-posts` and `media-items` by reference
- Computed behavior:
  - SEO/social warning summary per post
  - schedule queue readiness

## Persistence And Runtime
- Storage boundaries:
  - redirect data persists through module-owned collections
  - scheduling/SEO overview reads from `blog-posts`
- Runtime contracts touched:
  - module manifest collection
  - module-owned distribution overview and redirect-manager route views
- Determinism requirements:
  - redirect activation must remain unique by `sourcePath`
  - scheduling actions must respect post lifecycle rules owned by `test-modules-blog-content`

## Security And Policy
- Access constraints:
  - editors and managing editors manage redirects and scheduling actions
- Data sensitivity:
  - standard editorial metadata only
- Audit/logging requirements:
  - redirect changes and publish/schedule actions should be reproducible from persisted state

## Acceptance Criteria
1. `blog-redirect-rules` exists with deterministic validation and activation flows.
2. Distribution overview surfaces SEO/social warnings without blocking on advisory issues alone.
3. Scheduled publish flows coordinate with post lifecycle ownership without introducing duplicate post logic here.

## Out Of Scope
1. External CDN/search-console integrations.
2. Cross-site syndication.

## Extension-Level Plan
- Level 1 changes:
  - add module manifest, redirect collection, and distribution route-view declarations
- Level 2 changes:
  - implement redirect manager and distribution overview locally in the module
- Level 3 changes:
  - extract neutral scheduling helpers only if another module proves reuse
- Level 4 changes (if any):
  - none approved at contract time

## Core Edit Waiver (Only If Level 4 Needed)
- Why level 1/2/3 was insufficient:
  - `N/A`
- Exact core boundary touched:
  - `N/A`
- Retirement milestone:
  - `N/A`
- Owner:
  - `N/A`

## Verification Lanes
- Targeted lanes:
  - `pnpm test:server:conformance:dynamic`
  - `pnpm test:server:runtime-integration:dynamic`
  - `pnpm test:frontend:conformance:dynamic`
  - `pnpm test:frontend:integration:dynamic`
  - focused redirect/scheduling tests
- Closure lanes:
  - `pnpm quality:gate:full`
- Documentation-only note (if applicable):
  - `N/A`

## Risks And Mitigations
- Risk:
  - distribution surfaces could duplicate post lifecycle logic owned elsewhere
  - Mitigation:
    - keep post-state ownership in `test-modules-blog-content`; this module coordinates and validates rather than re-owning post records
