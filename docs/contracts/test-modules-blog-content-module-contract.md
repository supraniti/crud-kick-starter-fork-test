# Test Modules Blog Content Module Contract

## Metadata
- Contract ID: `module-contract.test-modules-content.v1`
- Date: `2026-03-08`
- Milestone: `blog-management-modules`
- Owner: `codex`
- Status: `approved`

## Module Brief
- Module name: `test-modules-content`
- Business objective: manage canonical blog content records and deterministic revision history while coordinating with page/publication records for web-delivery concerns.
- Primary users: authors, editors, and managing editors.
- Non-goals:
  1. Comment moderation.
  2. Redirect registry ownership.
  3. Long-term ownership of route, SEO, or redirect storage.
  4. Media upload/storage implementation.

## Domain Model
- Primary entities:
  - `blog-posts`
  - `blog-post-revisions`
- Core fields:
  - `blog-posts`: `slug`, `title`, `subtitle`, `excerpt`, `body`, `status`, `format`, `primaryAuthorId`, `coAuthorIds`, `categoryIds`, `tagIds`, `featuredMediaId`, `galleryMediaIds`, `allowComments`, `commentPolicy`, `readTimeMinutes`, `wordCount`, `locale`, `translationGroupId`, `createdByAuthorId`, `updatedByAuthorId`, `createdOn`, `updatedOn`
  - `blog-post-revisions`: `postId`, `revisionNumber`, `titleSnapshot`, `subtitleSnapshot`, `excerptSnapshot`, `bodySnapshot`, `taxonomySnapshot`, `mediaSnapshot`, `seoSnapshot`, `statusSnapshot`, `changeSummary`, `source`, `isAutosave`, `changedByAuthorId`, `changedOn`, `contentHash`
- Relations:
  - post author references -> `blog-authors`
  - post taxonomy references -> `blog-tags`, `blog-categories`
  - post media references -> `media-items`
  - revision post reference -> `blog-posts`
  - revision actor reference -> `blog-authors`
  - publication/page coordination -> `blog-pages.sourcePostId`
- Validation rules:
  - unique post `slug`
  - `title` length `5-180`
  - `subtitle` max `220`
  - `excerpt` max `600`
  - `body` stored as sanitized HTML and must satisfy minimum content policy
  - `status` in `draft|in-review|scheduled|published|archived`
  - `format` in `article|news|opinion|tutorial|review`
  - `primaryAuthorId` must reference an active author
  - `categoryIds` must contain at least one category
  - publication-specific route/SEO/schedule fields are coordinated with `test-modules-pages`

## UI Surfaces
- Routes/views:
  - posts workspace route
  - custom post editor route
  - revision timeline and compare/restore route
- CRUD interactions:
  - create/update/archive posts
  - edit post content, taxonomy, authors, media, and T01-compatible publication inputs
  - inspect revisions and restore a selected revision
- Filters/search/sort needs:
  - quick filters for `status`, `format`, `primaryAuthorId`, `categoryIds`, `locale`
  - content-health indicators for missing SEO/taxonomy/media essentials
  - sort by `updatedOn`, `scheduledOn`, `publishedOn`
- Empty/loading/error states:
  - explicit empty state for no posts
  - explicit revision empty state
  - deterministic lifecycle validation errors

## Behavior Extensions
- Settings:
  - module settings may hold default comment policy and editor defaults if required
- Actions:
  - submit for review
  - publish
  - schedule
  - archive
  - restore revision
- Jobs:
  - publication/scheduling coordination may be implemented here or coordinated with `test-modules-pages`, but canonical content ownership stays here
- Remotes/integrations:
  - consumes authors, taxonomy, media, and redirect coordination by reference
- Computed behavior:
  - `slug` normalization
  - `wordCount` and `readTimeMinutes`
  - deterministic revision number and content hash

## Persistence And Runtime
- Storage boundaries:
  - post and revision data persist through module-owned collections
  - T01 may retain compatibility mirrors for publication fields while `blog-pages` becomes the emerging page/publication record
  - no binary storage in this module
- Runtime contracts touched:
  - module manifest collections
  - module-owned editor and revision route views
  - module-owned actions or missions only if lifecycle flow needs them
- Determinism requirements:
  - every content mutation produces deterministic revision history according to contract rules
  - revision restore must not mutate unrelated records
  - lifecycle transitions must enforce explicit gate rules
  - page-sync compatibility during T01 must be deterministic and one-to-one per post

## Security And Policy
- Access constraints:
  - authors can create drafts and edit assigned content
  - editors and managing editors can review, publish, schedule, archive, and restore revisions
- Data sensitivity:
  - standard editorial content only
- Audit/logging requirements:
  - revision history is the primary audit surface for content changes

## Acceptance Criteria
1. `blog-posts` and `blog-post-revisions` exist with the specified field coverage and workflow validation.
2. Post editor supports rich body editing, taxonomy/author/media assignment, and T01-compatible publication editing in a workflow-oriented view.
3. Revision history is deterministic, queryable, and restorable.
4. `blog-posts` no longer act as the only effective storage surface for route/SEO/publication concerns during T01.

## Out Of Scope
1. Public-site rendering.
2. External WYSIWYG plugin ecosystem.

## Extension-Level Plan
- Level 1 changes:
  - add module manifest, post/revision collections, and route-view declarations
- Level 2 changes:
  - implement editor, lifecycle actions, and revision workflows locally in the module
- Level 3 changes:
  - extract a neutral rich-text or revision helper only if another module proves the reuse
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
  - focused post/revision tests
- Closure lanes:
  - `pnpm quality:gate:full`
- Documentation-only note (if applicable):
  - `N/A`

## Risks And Mitigations
- Risk:
  - revision logic can sprawl into a shared blog service layer
  - Mitigation:
    - keep revision creation/restore logic module-local first and extract only if reuse becomes real
- Risk:
  - editor complexity can overwhelm generic CRUD surfaces
  - Mitigation:
    - use module-owned custom views for editor and revision workflows
 - Risk:
  - T01 compatibility can leave publication ownership ambiguous
  - Mitigation:
    - treat any duplicated publication fields in `blog-posts` as temporary mirrors while `blog-pages` becomes the durable page/publication surface

