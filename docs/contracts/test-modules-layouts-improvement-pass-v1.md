# Test Modules Layouts Improvement Pass V1

## Metadata
- Plan ID: `plan.test-modules-layouts.improvement-pass-v1`
- Date: `2026-03-09`
- Owner: `codex`
- Status: `implemented`
- Scope: `test-modules-layouts`

## Trigger
- Operator feedback after the initial layouts baseline was positive on visual direction but explicit that the builder is still not usable enough.
- The improvement pass is focused on usability, observability, and editing flow quality, not on expanding the layout language beyond empty blocks and nested containers.

## Browser Audit Findings
- Date: `2026-03-09`
- Live review route:
  - `http://localhost:3000/app/test-modules-layouts`
- Screenshot evidence:
  - `.codex-runtime/layout-review/improvement-pass-initial.png`
  - `.codex-runtime/layout-review/improvement-pass-empty-section.png`
  - `.codex-runtime/layout-review/improvement-pass-two-blocks.png`
  - `.codex-runtime/layout-review/improvement-pass-nested-container.png`
- Confirmed failures:
  1. Drag and drop inside populated containers is unreliable because drop intent is ambiguous and the current model mostly resolves to "after hovered node".
  2. The builder still uses `section` language in the canvas, insert rail, inspector, and labels even though the domain model is `container`.
  3. Editing remains inspector-bound; operators cannot adjust a block/container while keeping the affected node in view.
  4. Populated grid containers can become visually confusing because container actions and children compete for the same vertical space.
  5. The current selected-container footer actions add clutter and can visually collide with child content instead of reinforcing containment.
  6. Canvas nodes still expose too much chrome for a spatial tool; the layout is not readable enough at a glance once nesting increases.

## Code Audit Findings
- `modules/test-modules-layouts/frontend/LayoutBuilderCanvasNodes.jsx`
  - still renders `Section`, `Add Section`, and `Empty Section`
  - keeps selected-container actions inline on the canvas header and footer instead of moving settings into a focused edit surface
  - container body uses a single droppable body and sortable children without explicit between-sibling intent markers
- `modules/test-modules-layouts/frontend/useLayoutsWorkspace.js`
  - drag end resolves only `activeId` and `overId`
  - there is no richer transient drag target model for `before`, `after`, `inside-start`, `inside-end`
- `modules/test-modules-layouts/frontend/layout-builder-model.js`
  - raw node-id drops resolve to `after hovered node`, which is too weak for predictable in-container reorder
- `modules/test-modules-layouts/frontend/LayoutBuilderInspector.jsx`
  - remains the primary editing surface for selected nodes; it does not support in-context editing while the node stays visible on the canvas
- `modules/test-modules-layouts/frontend/LayoutBuilderLeftRail.jsx`
  - also still exposes `section` wording and action labels

## Design Direction
- Keep the immersive builder shell and the left `Layouts / Insert / Layers` rail.
- Make the canvas more literal:
  - containers should read as real rectangles with child space inside them
  - blocks should read as empty placeholders
  - actions should mostly appear on hover or selection
- Keep the right inspector for:
  - layout record metadata
  - debug JSON
  - optional secondary details
- Move node editing into a module-local MUI dialog opened from a small settings icon on the selected or hovered node chrome.
- Remove the selected-container footer actions entirely.
- Keep root-level top bar actions, but rename them to `Add Container`, `Add Block`, and `Add Flex Container` only where needed.

## Target Interaction Model

### Naming
- `section` becomes `container` everywhere in operator-facing layouts module UI unless the text is specifically describing a future page section concept outside the builder.
- Grid containers are still grid containers; the term `container` remains primary.

### Canvas
- Root stage remains full width.
- Containers render with:
  - subtle frame
  - light background
  - minimum believable height
  - header chrome only on hover/selection
- Blocks render as simple empty rectangles with minimal label text.
- Populated containers must auto-expand to fit children and must not visually clip or overlap child content with control chrome.

### Reorder / Move
- Reorder inside a container must use explicit insertion intent:
  - before child
  - after child
  - into empty container
  - append to container end
- Drag handles remain required for dragging.
- The visual drop preview must show a clear insertion line or slot, not rely on the user inferring where the hovered node will land.

### Editing
- A node settings icon on the node chrome opens a MUI dialog.
- The dialog owns:
  - label
  - layout mode
  - spacing
  - size
  - placement
  - delete action
- The dialog must preserve the node’s canvas visibility while editing.
- The right inspector remains for layout record fields and secondary reference/debug surfaces, not as the only node editor.

### Observability
- Layers rail remains synced with selection.
- Selection breadcrumbs remain visible.
- Container hierarchy should be readable from canvas framing alone, with layers as the precision fallback.

## Manual Scenario Set
These scenarios must be built in the browser during execution and captured with screenshots if friction remains:

1. Simple editorial page
- root page
- 3 top-level containers
- first container with 2 blocks
- second container with nested flex container holding 2 blocks
- third container empty

2. Nested marketing page
- root page
- hero container
- content container with nested grid container
- nested grid container with 3 blocks
- supporting flex container with 2 blocks

3. Reorder stress case
- one container with 4 sibling blocks
- move last block to first
- move middle block after last
- move one block into a different container

## Execution Slices

### Slice A: Terminology And Chrome Cleanup
- Rename operator-facing `section` text to `container`.
- Remove selected-container footer actions.
- Reduce always-on node chrome further so the canvas stays mostly spatial.

### Slice B: Dialog-Based Node Editing
- Add module-local node settings dialog using MUI.
- Add small settings/edit icon to block/container chrome.
- Keep selection synced when dialog opens and closes.

### Slice C: Stronger Drag Target Model
- Reintroduce explicit drag target semantics in the canvas:
  - `before-node`
  - `after-node`
  - `inside-start`
  - `inside-end`
- Update workspace and model code so container reorders and cross-container moves become deterministic.
- Add focused tests for reorder and cross-container moves.

### Slice D: Containment And Height Corrections
- Ensure populated containers expand with content.
- Prevent child cards and control surfaces from overlapping.
- Tune grid/flex spacing so nested containers stay readable without looking like stacked admin cards.

### Slice E: Manual QA And Fit/Finish
- Build the manual scenarios above in the live browser.
- Capture screenshots for the final state and any remaining gaps.
- Update progress pointers with exact open/closed issues.

## Delivery Outcome
- Date: `2026-03-09`
- Status:
  - implemented in the working tree
  - focused tests passed
  - `pnpm quality:protocol` passed
  - `pnpm quality:gate:full` passed
- Closed work:
  - operator-facing `section` wording was replaced with `container` across the layouts module UI
  - selected-container footer action bars were removed
  - node editing moved into a module-local MUI dialog:
    - `modules/test-modules-layouts/frontend/LayoutBuilderNodeDialog.jsx`
  - drag/reorder target resolution was strengthened for same-container and cross-container moves:
    - `modules/test-modules-layouts/frontend/layout-builder-model.js`
    - `modules/test-modules-layouts/frontend/useLayoutsWorkspace.js`
  - block/container canvas chrome was simplified so the layout reads more spatially and less like stacked admin cards
  - block defaults were reduced so populated containers no longer visually collapse around oversized placeholder cards
- Verification run:
  - `pnpm lint:function-shape`
  - `pnpm quality:protocol`
  - `pnpm --filter frontend exec vitest run src/tests/core/layout-builder-model.core.test.jsx src/tests/app-integration/layouts.integration.test.jsx`
  - `pnpm --filter frontend exec vitest run src/tests/app-integration/blog-content.integration.test.jsx`
  - `pnpm quality:gate:full`
- Additional verification note:
  - the full gate initially exposed two pre-existing `blog-content` integration tests that were under-budgeted for the heavier dynamic lane; the pass closed that by raising their explicit per-test timeouts without changing product behavior
- Latest screenshot evidence:
  - `.codex-runtime/layout-review/improvement-pass-after-refactor-existing-layout.png`
  - `.codex-runtime/layout-review/improvement-pass-after-refactor-full.png`
  - `.codex-runtime/layout-review/improvement-pass-desktop-full.png`

## Test Strategy

### Model
- add tests for:
  - `resolveInsertionTarget` before/after semantics
  - move within same container to first, middle, last
  - move from one container to another
  - reject dropping into descendants

### Frontend Integration
- create layout, add multiple sibling blocks, reorder them
- move a block from one container into another container
- open node settings dialog from canvas and update the selected node
- rename container via dialog and verify canvas + layers update
- confirm the canvas does not render footer action bars for selected containers

### Manual
- complete the three manual scenarios above in the live app
- save screenshot evidence for the final pass

## Acceptance Criteria
1. In-container reorder works predictably for at least four sibling blocks.
2. Cross-container moves are deterministic and visually legible.
3. Operator-facing naming uses `container`, not `section`, across the layouts module.
4. Node editing is available from a canvas-local affordance that opens a MUI dialog.
5. Populated containers visually contain their children without footer-clutter overlap.
6. The builder remains immersive and readable while nesting increases.
7. Focused tests, relevant frontend integration tests, `pnpm quality:protocol`, and `pnpm quality:gate:full` pass.
