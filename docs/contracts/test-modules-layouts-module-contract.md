# Test Modules Layouts Module Contract

## Metadata
- Contract ID: `module-contract.test-modules-layouts.v1`
- Date: `2026-03-09`
- Milestone: `pages-layout-builder-phase-1`
- Owner: `codex`
- Status: `approved`

## Module Brief
- Module name: `test-modules-layouts`
- Business objective: own reusable layout definitions and the dedicated operator layout-builder surface consumed by `test-modules-pages`.
- Primary users: editors and managing editors.
- Non-goals:
  1. Block content authoring.
  2. Responsive breakpoint editing.
  3. Frontend presentation code authoring.
  4. Shared/core layout runtime extraction.

## Domain Model
- Primary entities:
  - `page-layouts`
- `page-layouts` owns:
  - reusable layout identity and summary metadata
  - structured layout JSON documents
  - operator-facing layout-builder state for phase 1
  - reusable container/block tree definitions referenced by pages

## Phase 1 Scope
- Operators can create, rename, duplicate, update, and delete reusable layout records.
- Each layout is a tree of containers and empty blocks.
- Each container uses one layout mode:
  - `grid`
  - `flex`
- The builder supports:
  - drag/drop reordering and moving nodes between containers
  - add/remove node actions
  - inspector-driven sizing and container configuration
  - a single desktop canvas model
- Explicitly deferred:
  - responsive breakpoint editors
  - block content binding
  - user-authored JS/CSS
  - arbitrary pixel-precise freeform canvas placement

## JSON Contract Rules
- Layout documents must be deterministic JSON.
- Layout documents must use stable node ids.
- Layout documents must use a normalized tree shape:
  - `version`
  - `rootId`
  - `nodes`
- Node types:
  - `container`
  - `block`
- Container fields:
  - `layoutMode`
  - `props`
  - `children`
- Block fields:
  - `placement`
  - `props`
- `grid` placement uses span-based coordinates:
  - `x`
  - `y`
  - `w`
  - `h`
- `flex` placement uses order/basis growth fields:
  - `order`
  - `basis`
  - `grow`
  - `shrink`

## UI Surface Rules
- The builder must live on a dedicated route owned by `test-modules-layouts`.
- MUI owns the operator shell:
  - app bar
  - inspector panels
  - lists
  - dialogs
  - action controls
- The canvas itself may use thin native HTML/CSS for the rendered layout structure.
- Native HTML controls must not replace existing MUI form controls.
- Smooth drag/drop behavior is required; do not hand-roll a fragile pointer engine when a bounded dependency is approved.
- Builder geometry must mirror the intended layout/output geometry as closely as possible:
  - container frames must not distort the actual child layout surface
  - flex and grid sizing rules must read like the eventual HTML structure, not like editor-only placeholder cards

## Dependency Rules
- Approved phase-1 interaction dependency:
  - `@dnd-kit/core`
  - `@dnd-kit/sortable`
  - `@dnd-kit/utilities`
- No broader layout-builder framework is approved by default.

## Cross-Module Boundaries
- `test-modules-layouts` owns reusable layout records and the builder UI.
- `test-modules-pages` owns page identity, source selection, SEO, delivery payloads, redirects, and deployment.
- `test-modules-pages` may reference `page-layouts` through `layoutId`.
- `test-modules-pages` may continue to read legacy inline `layoutModel` as a compatibility fallback until migration is complete.
- No shared/core layout service is approved at contract time.

## Validation Rules
- layout title required
- layout key required and unique
- layout document required
- root node must exist and be a `container`
- every referenced child id must resolve to an existing node
- container children cannot contain duplicates
- cycles are invalid
- grid placement values must stay within bounded positive integer ranges
- flex placement values must stay within bounded ranges

## Acceptance Criteria
1. Operators can manage reusable layout records from a dedicated layouts module.
2. Operators can build nested grid/flex layouts visually through drag/drop plus inspector controls.
3. Layout state round-trips as deterministic JSON.
4. `test-modules-pages` can reference a reusable layout record by id.
5. Existing pages without `layoutId` keep working through inline `layoutModel` fallback.

## Phase 2 Continuation
- The approved phase-1 scope is intentionally minimal and not yet commercial-grade.
- The next usability-focused improvement plan lives in:
  - `docs/contracts/archive/completed-execution-plans/test-modules-layouts-phase-2-plan.md`
- The current post-baseline usability execution plan lives in:
  - `docs/contracts/archive/completed-execution-plans/test-modules-layouts-improvement-pass-v1.md`
  - `docs/contracts/archive/completed-execution-plans/test-modules-layouts-improvement-pass-v2.md`
  - `docs/contracts/archive/completed-execution-plans/test-modules-layouts-layout-fidelity-pass-v1.md`

## Verification Lanes
- Targeted:
  - focused layouts module conformance tests
  - focused layouts/pages frontend integration tests
  - `pnpm test:frontend:integration:dynamic`
  - `pnpm test:server:conformance:dynamic`
- Closure:
  - `pnpm quality:gate:full`

