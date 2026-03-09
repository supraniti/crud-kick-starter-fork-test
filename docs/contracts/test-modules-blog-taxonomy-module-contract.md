# Test Modules Blog Taxonomy Module Contract

## Metadata
- Contract ID: `module-contract.test-modules-taxonomy.v1`
- Date: `2026-03-08`
- Milestone: `blog-management-modules`
- Owner: `codex`
- Status: `approved`

## Module Brief
- Module name: `test-modules-taxonomy`
- Business objective: manage reusable blog tags and hierarchical categories with deterministic reference integrity.
- Primary users: editors and managing editors.
- Non-goals:
  1. Post body editing.
  2. Comment moderation.
  3. Redirect operations.

## Domain Model
- Primary entities:
  - `blog-tags`
  - `blog-categories`
- Core fields:
  - `blog-tags`: `slug`, `name`, `description`, `color`, `visibility`, `usageCount`, `seoTitle`, `seoDescription`, `createdOn`, `updatedOn`
  - `blog-categories`: `slug`, `name`, `description`, `parentCategoryId`, `path`, `depth`, `sortOrder`, `visibility`, `featuredMediaId`, `usageCount`, `createdOn`, `updatedOn`
- Relations:
  - `blog-categories.parentCategoryId -> blog-categories`
  - `blog-categories.featuredMediaId -> media-items`
  - downstream references from `blog-posts` and `blog-authors`
- Validation rules:
  - unique `slug` for both entities
  - tag `name` length `2-80`
  - category `name` length `2-120`
  - category hierarchy must reject self-parenting and cycles
  - `color` must be a hex value when present
  - `visibility` in `public|internal`

## UI Surfaces
- Routes/views:
  - tag CRUD collection route
  - category tree manager route with hierarchy-aware interactions
- CRUD interactions:
  - create/update/delete tags
  - create/update/re-parent categories
- Filters/search/sort needs:
  - tag search by `name`, `slug`, `visibility`
  - category search by `name`, `slug`, `visibility`
  - category tree ordering by `sortOrder` and path depth
- Empty/loading/error states:
  - explicit tag empty state
  - explicit category-tree empty state
  - deterministic integrity errors for invalid hierarchy edits

## Behavior Extensions
- Settings:
  - none required in v1
- Actions:
  - reorder categories
  - move category within hierarchy
- Jobs:
  - none in v1
- Remotes/integrations:
  - consumes `media-items` references only
- Computed behavior:
  - `slug` normalization
  - `path` and `depth` computed from hierarchy
  - `usageCount` derived from downstream post/author references

## Persistence And Runtime
- Storage boundaries:
  - taxonomy data persists through module-owned collections
- Runtime contracts touched:
  - module manifest collections
  - module-owned category-tree route view
- Determinism requirements:
  - hierarchy writes must be cycle-safe
  - tree rendering must come from persisted parent links and computed path data

## Security And Policy
- Access constraints:
  - editors and managing editors manage taxonomy data
- Data sensitivity:
  - standard editorial metadata only
- Audit/logging requirements:
  - hierarchy-changing actions should be reproducible from persisted state

## Acceptance Criteria
1. `blog-tags` and `blog-categories` CRUD exist with the specified validation and slug rules.
2. Category hierarchy management supports deterministic tree rendering and cycle prevention.
3. Posts and authors can reference taxonomy records without ID collision with baseline modules.

## Out Of Scope
1. External taxonomy sync.
2. Multisite taxonomy federation.

## Extension-Level Plan
- Level 1 changes:
  - add module manifest, taxonomy collections, and route-view declarations
- Level 2 changes:
  - implement tag management and category tree UI locally in the module
- Level 3 changes:
  - extract neutral hierarchy helpers only if another module proves the reuse
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
  - focused taxonomy/hierarchy tests
- Closure lanes:
  - `pnpm quality:gate:full`
- Documentation-only note (if applicable):
  - `N/A`

## Risks And Mitigations
- Risk:
  - hierarchy logic can spread into generic collection code
  - Mitigation:
    - keep hierarchy behavior in module-local views/helpers unless a neutral primitive is truly needed

