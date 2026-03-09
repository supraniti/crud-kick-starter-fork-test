# Test Modules Blog Distribution Module Contract

## Metadata
- Contract ID: `module-contract.test-modules-pages.v1`
- Date: `2026-03-08`
- Milestone: `blog-management-modules`
- Owner: `codex`
- Status: `approved`

## Module Brief
- Module name: `test-modules-pages`
- Business objective: manage page/publication records, redirect rules, and web-delivery policy while referencing canonical content records from `test-modules-content`.
- Primary users: editors and managing editors.
- Non-goals:
  1. Post body editing.
  2. Comment moderation.
  3. Media upload/storage.

## Domain Model
- Primary entities:
  - `blog-pages`
  - `blog-redirect-rules`
- Core fields:
  - `blog-pages`: `sourceType`, `sourcePostId`, `path`, `layoutKey`, `status`, `canonicalUrl`, `seoTitle`, `seoDescription`, `ogTitle`, `ogDescription`, `ogImageMediaId`, `scheduledOn`, `publishedOn`, `archivedOn`, `createdOn`, `updatedOn`
  - `blog-redirect-rules`: `sourcePath`, `targetPostId`, `targetUrl`, `httpCode`, `status`, `reason`, `createdOn`, `updatedOn`
- Relations:
  - `blog-pages.sourcePostId -> blog-posts`
  - `blog-pages.ogImageMediaId -> media-items`
  - `blog-redirect-rules.targetPostId -> blog-posts`
  - page/publication workflows reference `blog-posts` but do not own the canonical content body
- Validation rules:
  - unique `sourcePostId`
  - unique normalized `path`
  - `sourceType` in `blog-post`
  - page `status` in `draft|in-review|scheduled|published|archived`
  - `path` must be relative and normalized
  - unique `sourcePath`
  - either `targetPostId` or `targetUrl` must be set
  - `httpCode` in `301|302|307|308`
  - redirect `status` in `active|disabled`
  - `targetUrl` must be a valid URL when present

## UI Surfaces
- Routes/views:
  - pages overview route for publication queue and SEO/social warnings
  - redirect manager route
- CRUD interactions:
  - create/update page/publication records
  - inspect publication readiness
  - create/update/disable redirect rules
  - run publish-ready actions that coordinate with content lifecycle ownership
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
  - publish scheduled page/post pairing
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
  - page/publication data persists through `blog-pages`
  - redirect data persists through `blog-redirect-rules`
  - T01 may temporarily mirror some publication values from `blog-posts` while operator workflows are preserved
- Runtime contracts touched:
  - module manifest collections
  - module-owned pages overview and redirect-manager route views
- Determinism requirements:
  - one `blog-pages` record maps to one source post during T01
  - redirect activation must remain unique by `sourcePath`
  - publication actions must respect content lifecycle rules coordinated with `test-modules-content`

## Security And Policy
- Access constraints:
  - editors and managing editors manage redirects and scheduling actions
- Data sensitivity:
  - standard editorial metadata only
- Audit/logging requirements:
  - redirect changes and publish/schedule actions should be reproducible from persisted state

## Acceptance Criteria
1. `blog-pages` exists with deterministic source-post, path, SEO, and publication validation.
2. `blog-redirect-rules` exists with deterministic validation and activation flows.
3. Pages overview surfaces SEO/social warnings without blocking on advisory issues alone.
4. Scheduled publish flows coordinate with content lifecycle ownership without introducing duplicate content-body logic here.

## Out Of Scope
1. External CDN/search-console integrations.
2. Cross-site syndication.

## Extension-Level Plan
- Level 1 changes:
  - add module manifest, `blog-pages`, `blog-redirect-rules`, and route-view declarations
- Level 2 changes:
  - implement pages overview and redirect manager locally in the module
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
  - page/publication surfaces could duplicate content lifecycle logic owned elsewhere
  - Mitigation:
    - keep canonical content ownership in `test-modules-content`; this module coordinates and validates rather than re-owning content records

