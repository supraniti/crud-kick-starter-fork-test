# Blog Management Module Set Contract

## Metadata
- Contract ID: `module-set-contract.blog-management.v1`
- Date: `2026-03-08`
- Milestone: `blog-management-modules`
- Owner: `codex`
- Status: `approved`

## Scope
- Deliver an additive five-module blog-management set that coexists with the permanent baseline modules and `test-modules-media-manager`.
- Do not remove, rename, or retire the existing baseline modules to make room for this work.
- Reuse existing media-manager capabilities by reference only.

## Additive Module Surface
1. `test-modules-blog-content`
2. `test-modules-blog-taxonomy`
3. `test-modules-blog-editorial`
4. `test-modules-blog-engagement`
5. `test-modules-blog-distribution`

## Permanent Baseline Protection
- The following modules are permanent repo fixtures and must remain active throughout this ticket:
  - `test-modules-crud-core`
  - `test-modules-relations-taxonomy`
  - `test-modules-settings-policy`
  - `test-modules-operations-dispatch`
  - `test-modules-remotes-publish`
  - `test-modules-media-manager`
- Collision resolution for this ticket must happen through namespacing, ownership boundaries, or route/view choices. Module removal is not an allowed tactic.

## Internal ID Strategy
- Use namespaced internal collection IDs to avoid collisions with the permanent baseline modules:
  - `blog-authors`
  - `blog-posts`
  - `blog-post-revisions`
  - `blog-tags`
  - `blog-categories`
  - `blog-comments`
  - `blog-redirect-rules`
- UI labels may use plain-language labels such as `Authors`, `Posts`, and `Categories`.

## Cross-Module Ownership Map
- `test-modules-blog-editorial`
  - owns `blog-authors`
  - owns editorial overview and assignment surfaces
- `test-modules-blog-taxonomy`
  - owns `blog-tags`
  - owns `blog-categories`
- `test-modules-blog-content`
  - owns `blog-posts`
  - owns `blog-post-revisions`
  - owns post editor and revision history workflows
- `test-modules-blog-engagement`
  - owns `blog-comments`
  - owns moderation queue and moderation actions
- `test-modules-blog-distribution`
  - owns `blog-redirect-rules`
  - owns scheduling, SEO/social policy surfaces, and redirect workflows

## Shared Decisions Locked For Implementation
- Rich text storage format:
  - sanitized HTML stored on `blog-posts.body` and revision snapshots
- Workflow permissions:
  - authors can create drafts and edit content assigned to them
  - editors and managing-editors can review, publish, schedule, archive, and moderate
- SEO policy:
  - warnings in UI for advisory SEO issues
  - blocking validation only for hard field/data-integrity rules
- Comment moderation default:
  - new comments start as `pending`
  - posts with `commentPolicy=closed` reject new comment creation
- Media integration:
  - use references to `media-items` only
  - do not add upload/storage logic in any blog module

## Cross-Module Invariants
- `blog-posts.primaryAuthorId`, `coAuthorIds`, `createdByAuthorId`, and `updatedByAuthorId` reference `blog-authors`.
- `blog-posts.categoryIds` reference `blog-categories`.
- `blog-posts.tagIds` and `blog-authors.expertiseTagIds` reference `blog-tags`.
- `blog-posts.featuredMediaId`, `galleryMediaIds`, and `ogImageMediaId` reference `media-items`.
- `blog-post-revisions.postId` references `blog-posts`.
- `blog-comments.postId` references `blog-posts`.
- `blog-comments.approvedByAuthorId` references `blog-authors`.
- `blog-redirect-rules.targetPostId` references `blog-posts`.
- No module may create a second copy of shared blog business logic under `server/src/domains/reference/blog`.

## Module-First Delivery Rules
- Prefer Level 1 manifest/schema declaration and Level 2 module-local adapters/views first.
- Shared primitive extraction is allowed only after repetition is proven twice and the extracted boundary is neutral.
- No Level 4 core edit is approved at contract time.
- If a core gap is discovered, record a narrow waiver in the specific module contract before implementation crosses that boundary.
- Keep blog UI work on the existing MUI component surface unless the user explicitly approves a different boundary.
- Native HTML controls are not allowed in place of existing MUI components without explicit user approval.
- Shared/core frontend refactors for performance or ergonomics require explicit user approval before implementation.

## Implementation Order
1. `test-modules-blog-editorial`
2. `test-modules-blog-taxonomy`
3. `test-modules-blog-content`
4. `test-modules-blog-engagement`
5. `test-modules-blog-distribution`

## Verification Plan
- During implementation:
  - `pnpm test:server:conformance:dynamic`
  - `pnpm test:server:runtime-integration:dynamic`
  - `pnpm test:frontend:conformance:dynamic`
  - `pnpm test:frontend:integration:dynamic`
  - focused blog tests added only where ownership is clear
- Closure:
  - `pnpm quality:gate:full`

## Risks And Controls
- Risk:
  - blog feature pressure can tempt a shared `blog` core layer too early
  - Control:
    - keep behavior module-local unless a neutral third-copy extraction is proven
- Risk:
  - collection and route collisions with baseline modules
  - Control:
    - namespaced internal IDs and additive module coexistence are mandatory
- Risk:
  - schedule, revision, and moderation flows may require custom UI beyond generic CRUD
  - Control:
    - use module-owned route views instead of forcing generic tables to absorb workflow complexity
