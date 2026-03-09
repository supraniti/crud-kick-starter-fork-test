# Blog Ticket Restart Plan

Date: 2026-03-07
Ticket: `C:\Users\cmsin\OneDrive\שולחן העבודה\blog-management-modules-agent-ticket.md`
Status: reset-ready

## Ground Rules
- The five permanent baseline modules stay in the repo.
- `test-modules-media-manager` stays as additive infrastructure.
- The abandoned implementation is parked in `stash@{0}` with message:
  - `stash aborted blog ticket implementation`
- Do not resume the stashed code wholesale.
- Do not introduce a new shared `server/src/domains/reference/blog` layer unless a true Level 3 shared primitive is proven.

## Current Baseline Truth After Stash
- Worktree intent:
  - only recovery docs and progress-pointer updates should remain visible
- `pnpm test` on the cleaned baseline is not green
  - raw server failures are tied to current module-id/settings/lifecycle expectations when raw `pnpm test` is run without the dynamic lane environment alignment
  - raw frontend failure is tied to collection-filter payload expectations around unset boolean filters
- `pnpm quality:gate:full` on the cleaned baseline is also not green
  - server core/conformance/runtime steps passed
  - current failure is `lane-frontend-conformance`
  - failing test:
    - `frontend/src/tests/module-conformance/collections-crud.lifecycle.module-conformance.test.jsx`
  - failing assertion:
    - workspace request includes `featured: ""` when the existing test expects unset boolean filters to be omitted

## Required Restart Order

### Phase 0 - Baseline Preflight
1. Decide whether to land baseline-only fixes before blog work.
2. If yes, keep them in a separate slice from the blog ticket:
   - settle the boolean-filter contract for unset booleans
   - decide whether raw `pnpm test` must align with dynamic-lane/env behavior, or whether only contract lanes are authoritative
3. Re-run the official baseline verification after that isolated slice.

### Phase 1 - Contracts First
1. Create five module contracts from `docs/templates/module-contract.md`.
2. Create one coordinating module-set note that records cross-module invariants and shared decisions.
3. Record explicit additive coexistence in the contract notes.
4. Lock internal ID strategy up front.

## Recommended Internal ID Strategy
- Use namespaced internal collection IDs to avoid collisions with the permanent baseline modules:
  - `blog-authors`
  - `blog-posts`
  - `blog-post-revisions`
  - `blog-tags`
  - `blog-categories`
  - `blog-comments`
  - `blog-redirect-rules`
- UI labels can still present plain language:
  - Authors
  - Posts
  - Post Revisions
  - Tags
  - Categories
  - Comments
  - Redirect Rules

### Phase 2 - Capability Gap Audit
1. Map every ticket field requirement to existing repo capability.
2. Reuse existing field/runtime primitives first.
3. Confirm these existing capabilities before coding:
   - `url`
   - `structured-object`
   - `structured-object-array`
   - module-local routes
   - module-local missions
   - generic collection CRUD/query behavior
4. Audit only the true gaps:
   - date-time policy details
   - rich-text editing/storage choice
   - revision compare/restore UX shape
   - category hierarchy UI behavior
5. If a gap is real, request the smallest reusable primitive possible.

### Phase 3 - Implementation Slices

#### Slice A - Editorial + Taxonomy Foundation
- Deliver:
  - `test-modules-editorial`
  - `test-modules-taxonomy`
- Focus:
  - manifests
  - collection schemas
  - seed state
  - module-local views for editorial overview and category tree if needed
- Constraint:
  - no shared server blog domain extraction

#### Slice B - Content Module
- Deliver:
  - `test-modules-content`
- Focus:
  - posts
  - revisions
  - post editor
  - revision timeline/restore
- Constraint:
  - keep logic module-local first

#### Slice C - Engagement Module
- Deliver:
  - `test-modules-engagement`
- Focus:
  - comments
  - moderation queue
  - approve/reject/spam actions

#### Slice D - Distribution Module
- Deliver:
  - `test-modules-pages`
- Focus:
  - redirects
  - SEO/social policy surfaces
  - schedule/publish flows
  - missions or actions only if module-local seams already support them

#### Slice E - Hardening
- Deliver only after the above is stable:
  - bulk actions
  - audit traces
  - import/export scaffolding
  - localization/translation grouping refinements

## Core-Edit Guardrails
- No module deletions.
- No baseline test rewrites as part of feature delivery.
- No global runtime default changes just to hide additive coexistence issues.
- No Level 4 core edits without:
  - proof that Level 1/2 failed
  - explicit waiver note in the contract
  - smallest possible boundary

## Verification Plan
- During implementation:
  - `pnpm test:server:conformance:dynamic`
  - `pnpm test:server:runtime-integration:dynamic`
  - `pnpm test:frontend:conformance:dynamic`
  - `pnpm test:frontend:integration:dynamic`
  - new focused blog tests only in lane-owned locations
- Closure:
  - `pnpm quality:gate:full`

## Practical Guidance For The Next Agent
- Treat the stashed prototype as a requirements notebook, not as the codebase to revive.
- Start by writing contracts and a capability-gap table.
- Keep shared code inside module folders unless repetition is proven twice and stable.
- Reuse media-manager by reference only; do not duplicate media storage/upload concerns.

