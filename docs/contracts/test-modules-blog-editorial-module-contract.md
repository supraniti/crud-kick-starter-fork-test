# Test Modules Blog Editorial Module Contract

## Metadata
- Contract ID: `module-contract.test-modules-blog-editorial.v1`
- Date: `2026-03-08`
- Milestone: `blog-management-modules`
- Owner: `codex`
- Status: `approved`

## Module Brief
- Module name: `test-modules-blog-editorial`
- Business objective: manage author records and give editors an assignment-oriented overview of blog content ownership and review readiness.
- Primary users: authors, editors, and managing editors.
- Non-goals:
  1. Post body editing.
  2. Comment moderation.
  3. Redirect management or media upload.

## Domain Model
- Primary entities:
  - `blog-authors`
- Core fields:
  - `slug`, `displayName`, `legalName`, `bio`, `avatarMediaId`, `email`, `websiteUrl`, `socialLinks`, `role`, `status`, `locale`, `expertiseTagIds`, `createdOn`, `updatedOn`, `lastPublishedOn`
- Relations:
  - `blog-authors.avatarMediaId -> media-items`
  - `blog-authors.expertiseTagIds -> blog-tags`
  - assignment views read `blog-posts` but do not own them
- Validation rules:
  - unique `slug`
  - unique active `email`
  - `displayName` length `2-120`
  - `legalName` length `2-160` when present
  - `bio` max `5000`
  - `websiteUrl` must be a valid URL when present
  - `role` in `author|editor|managing-editor|guest`
  - `status` in `active|inactive|blocked`

## UI Surfaces
- Routes/views:
  - author CRUD collection route
  - editorial overview route with quick filters for post status, assignee, and review readiness
- CRUD interactions:
  - create/update/block author records
  - assign or inspect content ownership via editorial overview actions
- Filters/search/sort needs:
  - search by `displayName`, `email`, and `slug`
  - filter by `role`, `status`, `locale`, `expertiseTagIds`
  - editorial overview filters for `primaryAuthorId`, `status`, and assignment gaps
- Empty/loading/error states:
  - explicit empty state for author roster
  - explicit overview state when no posts match the editorial queue

## Behavior Extensions
- Settings:
  - module settings may store editorial defaults such as default locale and assignment dashboard preferences if required
- Actions:
  - block/unblock author
  - open assigned draft/review work
- Jobs:
  - none in v1
- Remotes/integrations:
  - consumes `blog-posts`, `blog-tags`, and `media-items` by reference
- Computed behavior:
  - `slug` normalization
  - `lastPublishedOn` derived from owned/primary published posts

## Persistence And Runtime
- Storage boundaries:
  - author data persists through module-owned collection configuration
  - no binary storage in this module
- Runtime contracts touched:
  - module manifest collections
  - module-owned editorial overview route view
- Determinism requirements:
  - blocking an author must not mutate post history
  - assignment views must derive from current persisted post state without hidden fallbacks

## Security And Policy
- Access constraints:
  - authors can view and edit only their permitted editorial fields
  - editors and managing editors can manage author status and assignment surfaces
- Data sensitivity:
  - author emails are operationally sensitive but not secret material
- Audit/logging requirements:
  - status and assignment actions should be traceable through deterministic collection updates or action logs

## Acceptance Criteria
1. `blog-authors` CRUD exists with the specified validation and media/tag references.
2. Editorial overview shows assignment-oriented post queues without owning the post storage.
3. Author role and status rules are enforced consistently in create/update flows.

## Out Of Scope
1. RBAC framework expansion beyond current module/runtime posture.
2. External identity-provider sync.

## Extension-Level Plan
- Level 1 changes:
  - add module manifest, `blog-authors` collection, and route-view declarations
- Level 2 changes:
  - implement author management and editorial overview UI locally in the module
- Level 3 changes:
  - extract a neutral overview helper only if a second module needs the same workflow lens
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
  - `pnpm test:frontend:conformance:dynamic`
  - focused author/editorial tests
- Closure lanes:
  - `pnpm quality:gate:full`
- Documentation-only note (if applicable):
  - `N/A`

## Risks And Mitigations
- Risk:
  - editorial overview could drift into a second post-management surface
  - Mitigation:
    - keep author ownership and assignment lens here; keep full post editing in `test-modules-blog-content`
