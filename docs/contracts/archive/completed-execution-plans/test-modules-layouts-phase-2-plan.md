# Test Modules Layouts Phase 2 Plan

## Metadata
- Plan ID: `layout-builder.phase-2.v1`
- Date: `2026-03-09`
- Owner: `codex`
- Status: `implemented-in-working-tree`
- Scope: `test-modules-layouts` with `test-modules-pages` consumption only

## Execution Status
- Date: `2026-03-09`
- Closure status:
  - implemented in the working tree
  - authoritative full gate passed
- Delivered phase-2 surfaces:
  - dedicated `Insert` and `Layers` left rail in `LayoutBuilderLeftRail.jsx`
  - explicit empty-state CTA for empty containers
  - insertion rails before, between, and after siblings
  - dedicated drag handles instead of full-card dragging
  - selected-node quick actions on canvas cards
  - breadcrumb/path chips in the canvas and inspector
  - model-level insertion-target semantics and focused tests
- Verification:
  - `pnpm --filter frontend exec vitest run src/tests/core/layout-builder-model.core.test.jsx src/tests/app-integration/layouts.integration.test.jsx`
    - passed
  - `pnpm test:frontend:integration:dynamic`
    - passed
  - `pnpm quality:gate:full`
    - passed
- Live browser QA:
  - verified root empty-state CTA on new layout creation
  - verified adding a third block into the middle of an existing container from an insertion rail
  - verified `Layers` selection sync updates the inspector state
  - verified selected-node quick actions appear on the active block
- Test-runtime note:
  - several existing long-path frontend integration tests needed explicit `15000ms` test timeouts once the suite grew; this was a harness-duration adjustment, not a product fallback
- Post-QA continuation:
  - a second immediate pass is still required for canvas visual density
  - screenshot review showed that the builder now inserts correctly but still reads like nested control cards instead of a spatial layout tool
  - next slice focus:
    - remove persistent id/kind/button clutter from canvas nodes
    - keep controls mostly on hover/selection
    - keep default block rendering visually empty
    - keep container rendering frame-first, not metadata-first
  - follow-up execution closure:
    - completed in the working tree on `2026-03-09`
    - desktop shell now resolves at `lg` instead of waiting for `xl`, so the builder stays in a usable three-column layout on normal desktop widths
    - left rail node rows no longer render raw node ids
    - inspector sections were collapsed into accordions and the `Layout JSON` debug surface is collapsed by default
    - inspector node actions were reduced to node removal only; add actions now stay on the canvas/left rail instead of being duplicated in every panel
    - additional screenshot evidence captured under:
      - `.codex-runtime/layout-review/step-08-live-desktop-after-layout-shell-fix.png`
      - `.codex-runtime/layout-review/step-09-new-layout-clean-shell.png`
    - focused layout integration test passed after the follow-up shell fix
    - authoritative `pnpm quality:gate:full` passed after the follow-up shell fix
  - user review correction:
    - current implementation is still not acceptable for product use
    - the remaining problem is not polish; the current spatial model is wrong
    - the next pass must be treated as a design reset, not another incremental tweak

## Purpose
- Upgrade the phase-1 layout builder from a proof-of-capability into a usable operator tool.
- Keep the problem narrow:
  - reusable layout records
  - containers and empty blocks only
  - no inner page components yet
- Improve interaction quality without changing the overall repo architecture.

## Current Phase-1 Friction
- Canvas insertion is too hard:
  - empty-container insertion depends on a narrow dashed drop strip
  - populated containers do not expose clear insert-before / insert-after affordances
  - drag intent is frequently interpreted as sibling swap/reorder instead of insertion
- Add actions are too hidden:
  - `Add Block`, `Add Grid Container`, and `Add Flex Container` only live in the right inspector
  - the builder does not expose obvious on-canvas insertion entry points
- Edit actions are too hidden:
  - selection works, but the operator has to infer that all editing lives in the inspector
  - there is no contextual quick-action surface on the selected node
- Interaction intent is overloaded:
  - the whole node card is draggable
  - click, select, and drag all compete for the same surface

## Local Technical Causes
- `LayoutBuilderCanvas.jsx` renders only one explicit `DropZone` per container before the child list.
- `resolveInsertionTarget()` falls back to parent/sibling inference when the pointer lands on a child card, so reorder wins too often over insertion intent.
- `SortableNodeCard` applies drag listeners to the full card instead of a dedicated drag handle.
- `LayoutBuilderInspector.jsx` is the only place that exposes add/remove/edit actions.

## Research Findings
- Commercial builders consistently separate three concerns:
  - insert
  - structure/layers
  - properties
- Builder.io exposes:
  - an `Insert` tab for adding blocks
  - a `Layers` tab for hierarchy navigation and reordering
  - a visual editor with styling/options tabs
  - Sources:
    - https://www.builder.io/c/docs/insert-tab
    - https://www.builder.io/c/docs/group-locking
    - https://www.builder.io/c/docs/visual-editor
- Webflow exposes:
  - `Navigator` for hierarchy management and hard-to-select elements
  - `Quick find` to add/select without hunting through panels
  - keyboard-first selection and add flows
  - Sources:
    - https://help.webflow.com/hc/en-us/articles/33961320786451
    - https://help.webflow.com/hc/en-us/articles/33961382093587-Quick-find
- Wix exposes:
  - a `Layers` panel for selection and reordering
  - floating toolbars and right-click actions near the selected element
  - explicit container attach/drop messaging
  - Sources:
    - https://support.wix.com/en/article/wix-editor-using-the-layers-panel
    - https://support.wix.com/en/article/wix-editor-using-the-editor-tools
    - https://support.wix.com/en/article/wix-editor-adding-and-setting-up-a-strip

## Research-Derived UX Principles
1. Operators need a persistent hierarchy surface, not canvas-only selection.
2. Insert actions must be available from more than one place:
   - global insert panel
   - contextual add controls on or near the selected container
   - explicit empty-state call-to-action
3. Drag should be attached to a handle, not the entire editable card.
4. Containers need large, legible insertion targets:
   - empty-state full-container targets
   - between-item insertion rails
   - terminal insertion target at the end of a container
5. Reorder and insert need different visual affordances:
   - reorder preview
   - insert line/slot preview
6. Node editing should combine:
   - a persistent inspector for full properties
   - a local quick-actions toolbar for common actions

## Approved Direction For Phase 2
- Keep `test-modules-layouts` as the owning module.
- Keep `page-layouts` as the reusable collection.
- Keep MUI as the operator shell.
- Keep thin native HTML/CSS inside the canvas only.
- Keep the current JSON contract shape:
  - `version`
  - `rootId`
  - `nodes`
- Improve usability first; do not expand into component authoring yet.

## Phase 2 Target UX

### Builder Shell
- Left rail:
  - `Insert`
  - `Layers`
- Center:
  - canvas
- Right rail:
  - inspector
- Top bar:
  - save status
  - layout metadata
  - mode/help chips

### Insertion Model
- Empty containers get a full-area `Add first block` / `Add container` empty state.
- Populated containers get visible insertion rails:
  - before first child
  - between children
  - after last child
- Selected containers also get inline quick actions:
  - `Add Block`
  - `Add Grid`
  - `Add Flex`
- Dragging onto a container body should prefer `insert into container` over accidental sibling swap.

### Selection Model
- Click selects.
- Drag handle drags.
- Double-click on a node label opens rename.
- Breadcrumbs show parent chain for the selected node.
- Layers tree selection must stay synced with canvas selection.

### Editing Model
- Context toolbar on selected node:
  - add sibling before
  - add sibling after
  - add child
  - duplicate
  - remove
- Right inspector remains the place for:
  - layout mode
  - spacing
  - grid/flex sizing
  - labels
  - metadata

### Visual Simplicity Rules
- Canvas nodes must prioritize spatial reading over metadata.
- Default block rendering should appear mostly empty.
- Default container rendering should appear as a lightweight frame with minimal always-on copy.
- Node ids must not appear in the default canvas view.
- Kind badges/chips must not appear in the default canvas view.
- Action controls should be hidden until hover or selection whenever possible.
- Insertion affordances should stay clear, but copy should be minimized.

## Execution Slices

### Slice A: Interaction Foundations
- Introduce dedicated drag handles.
- Separate select from drag.
- Add richer drop-target semantics in the model:
  - `inside-start`
  - `inside-end`
  - `before-node`
  - `after-node`
- Add preview states for insert vs reorder.

### Slice B: Canvas Accessibility And Add Flows
- Add full-size empty-state CTA surfaces.
- Add inline insertion rails.
- Add selected-container quick-action controls directly on canvas.

### Slice C: Builder Navigation
- Add left `Layers` tree with:
  - expand/collapse
  - selection sync
  - drag reorder
  - node rename display
- Add left `Insert` panel with:
  - block
  - grid container
  - flex container
- Optional keyboard search within the insert panel.

### Slice D: Editing UX
- Add contextual selected-node toolbar.
- Add breadcrumbs.
- Improve inspector grouping and wording.
- Make node actions discoverable without depending on the inspector alone.

## Test-First Strategy

### Model Tests
- `layout-builder-model` should gain focused unit tests for:
  - insert before first child
  - insert between children
  - insert after last child
  - move between containers
  - invalid descendant drop rejection
  - duplicate/clone semantics once added

### App Integration Tests
- create layout and add multiple blocks into the same container
- insert a block between two existing siblings
- move a block from one container to another
- use the layers tree to select a nested node
- use on-canvas quick action to add a child block
- verify drag handle is required for dragging and click still selects

### Manual Review Checklist
- can add first block without hunting for the inspector
- can add second and third blocks into the same container without precision-drop frustration
- can see where a dragged node will land before drop
- can edit the selected block/container without guessing where controls live
- can understand hierarchy from the layers panel alone

## Acceptance Criteria
1. A container can accept multiple blocks without precision-drop friction.
2. Operators can add nodes without relying solely on the right inspector.
3. Operators can distinguish selection, insertion, and reorder visually.
4. A persistent layers/navigation surface exists and stays synced with the canvas.
5. Phase-2 passes focused model tests, focused frontend integration tests, and the full repo gate.
6. The builder shell keeps canvas, insert/layers rail, and inspector simultaneously visible on normal desktop widths without forcing a single-column page.
7. Containers must read as real containing surfaces, not narrow lines or slivers.
8. The builder route must dedicate effectively the full available workspace width to layout editing, rather than behaving like a standard admin form page.

## Rejection Notes
- Date: `2026-03-09`
- Manual review outcome:
  - rejected
- Reasons:
  - the builder still uses too little of the available page width
  - container creation does not produce a visually credible containing surface
  - insertion/reorder intent is still too scrambled to read at a glance
- Reset direction:
  - stop treating the current canvas as the base to cosmetically improve
  - design from the target state first:
    - what a full page with several containers should look like
    - what the operator clicks to add, select, move, and resize
    - how empty vs populated containers should differ visually
  - use real-builder reference patterns as the primary guide before more implementation

## Non-Goals
- block inner content
- responsive breakpoint editing
- arbitrary freeform positioning
- page rendering/runtime component logic
- shared/core frontend refactors without explicit approval

## Replacement Reset Closure
- Date: `2026-03-09`
- Status:
  - implemented in the working tree
  - authoritative full gate passed after the replacement pass
  - this section supersedes the earlier phase-2 interim state that was later rejected in manual review
- Delivered replacement direction:
  - builder now uses a dedicated immersive route surface instead of sharing the normal admin-shell width budget
  - page stage is now the primary object on the canvas, with top-level add actions owned by the stage header
  - fresh layouts open with a full-page empty-state CTA
  - sections render as large framed containing surfaces instead of narrow rectangles
  - blocks render as mostly-empty placeholders so spatial reading wins over metadata chrome
  - drag remains handle-only
  - root-level duplicate add controls were removed after browser QA showed they were redundant noise
- Live QA findings closed in this slice:
  - the earlier empty-section collapse was caused by applying grid body layout to an empty container body; the fix was to switch empty bodies to a full-width neutral layout state
  - immersive width was not actually taking effect from descriptor metadata during live QA, so the current delivery includes a route-level fallback for `test-modules-layouts` in `AppShellLayout`
- Screenshot evidence:
  - `.codex-runtime/layout-review/step-12-immersive-shell-applied.png`
  - `.codex-runtime/layout-review/step-13-empty-stage-usable.png`
  - `.codex-runtime/layout-review/step-15-empty-section-fixed.png`
- Verification after the replacement pass:
  - `pnpm lint:function-shape`
    - passed
  - `pnpm --filter frontend exec vitest run src/tests/core/layout-builder-model.core.test.jsx src/tests/app-integration/layouts.integration.test.jsx`
    - passed
  - `pnpm quality:protocol`
    - passed
  - `pnpm quality:gate:full`
    - passed
- Current judgment:
  - the builder now has a coherent spatial model for this modest phase-1 purpose
  - remaining future work should build on this reset, not resurrect the earlier crowded card-based canvas
