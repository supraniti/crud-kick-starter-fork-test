# Test Modules Blog Engagement Module Contract

## Metadata
- Contract ID: `module-contract.test-modules-engagement.v1`
- Date: `2026-03-08`
- Milestone: `blog-management-modules`
- Owner: `codex`
- Status: `approved`

## Module Brief
- Module name: `test-modules-engagement`
- Business objective: manage comments and moderation queues with deterministic approval/rejection/spam workflows.
- Primary users: editors and managing editors.
- Non-goals:
  1. Post editing.
  2. Redirect management.
  3. Media upload/storage.

## Domain Model
- Primary entities:
  - `blog-comments`
- Core fields:
  - `postId`, `parentCommentId`, `authorDisplayName`, `authorEmail`, `body`, `status`, `moderationReason`, `approvedByAuthorId`, `approvedOn`, `createdOn`, `updatedOn`
- Relations:
  - `blog-comments.postId -> blog-posts`
  - `blog-comments.parentCommentId -> blog-comments`
  - `blog-comments.approvedByAuthorId -> blog-authors`
- Validation rules:
  - `body` length policy enforced
  - `status` in `pending|approved|rejected|spam`
  - comments cannot be created for posts with `commentPolicy=closed`
  - new comment default status is `pending`

## UI Surfaces
- Routes/views:
  - comment moderation queue route
  - comment detail/thread inspection route
- CRUD interactions:
  - list/filter comments
  - approve, reject, mark spam
  - inspect thread ancestry
- Filters/search/sort needs:
  - filter by `status`, `postId`, `approvedByAuthorId`
  - search by `authorDisplayName` and body text
  - sort by `createdOn` and moderation priority
- Empty/loading/error states:
  - explicit empty moderation queue
  - deterministic policy error when post comment policy blocks creation

## Behavior Extensions
- Settings:
  - module settings may store moderation defaults if needed
- Actions:
  - approve comment
  - reject comment
  - mark comment as spam
- Jobs:
  - none in v1
- Remotes/integrations:
  - consumes `blog-posts` and `blog-authors` by reference
- Computed behavior:
  - thread display context
  - moderation queue counts by status

## Persistence And Runtime
- Storage boundaries:
  - comment data persists through module-owned collections
- Runtime contracts touched:
  - module manifest collection
  - module-owned moderation queue route view
- Determinism requirements:
  - moderation transitions update actor/time fields predictably
  - blocked comment creation returns deterministic validation response

## Security And Policy
- Access constraints:
  - editors and managing editors can moderate
  - authors may view comment activity for their own posts if surfaced, but moderation authority stays with editorial roles
- Data sensitivity:
  - commenter email is operationally sensitive
- Audit/logging requirements:
  - moderation actor and timestamp are required on approval flows

## Acceptance Criteria
1. `blog-comments` exists with deterministic moderation actions and policy enforcement.
2. Moderation queue supports approve, reject, and spam transitions from a workflow-oriented view.
3. Closed-comment posts reject comment creation deterministically.

## Out Of Scope
1. Anti-spam external services.
2. End-user notification delivery.

## Extension-Level Plan
- Level 1 changes:
  - add module manifest, comments collection, and moderation route-view declarations
- Level 2 changes:
  - implement moderation queue UI and moderation actions locally in the module
- Level 3 changes:
  - extract neutral moderation helpers only if another module proves identical needs
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
  - `pnpm test:frontend:integration:dynamic`
  - focused comment/moderation tests
- Closure lanes:
  - `pnpm quality:gate:full`
- Documentation-only note (if applicable):
  - `N/A`

## Risks And Mitigations
- Risk:
  - moderation actions could become implicit field edits with poor traceability
  - Mitigation:
    - model moderation as explicit workflow actions with actor/timestamp updates

