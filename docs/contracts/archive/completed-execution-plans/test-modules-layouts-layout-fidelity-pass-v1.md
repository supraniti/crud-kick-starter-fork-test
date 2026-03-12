# Test Modules Layouts Layout Fidelity Pass V1

## Metadata
- Plan ID: `plan.test-modules-layouts.layout-fidelity-pass-v1`
- Date: `2026-03-10`
- Owner: `codex`
- Status: `completed`
- Scope: `test-modules-layouts`

## Trigger
- Manual review found two concrete geometry failures in the current layouts builder:
  1. A new grid container could accept two direct blocks, but the second block was visually missing.
  2. Builder geometry did not match believable HTML semantics for flex rows; for example, a row flex container with two `50%` blocks did not reliably read like the real structure it was meant to represent.

## Delivery Goal
- Fix the current builder so the visible canvas matches the intended layout structure instead of adding editor-only distortion.
- Keep the builder immersive and MUI-owned at the shell/control level.
- Preserve the existing JSON model and module boundary.

## Locked Rules
- The builder frame may add selection chrome, but layout geometry must come from the same container/block semantics that future HTML output will use.
- Container frames must not also behave as the child layout surface.
- Flex item sizing must depend on the parent flex direction instead of using one generic width rule.

## Root Causes
1. Container layout was being applied twice:
   - once on the container frame
   - again on the inner child wrapper
   - result:
     - nested grid containers could visually collapse into misleading widths
     - child geometry no longer matched the actual layout surface
2. Flex placement styling was parent-blind:
   - row flex children were still receiving width semantics that belonged to stacked/column layouts
   - result:
     - row compositions did not read like the HTML structure they were supposed to approximate

## Retained Fix

### Container/Layout Surface Separation
- File:
  - `modules/test-modules-layouts/frontend/LayoutBuilderCanvasNodes.jsx`
- Retained change:
  - non-root container frames are now plain container surfaces
  - the actual child layout surface lives in one inner wrapper only
  - container `minHeight` is owned by the frame
  - content-area `minHeight` is derived from container padding so empty and populated states stay believable

### Parent-Aware Flex Placement
- File:
  - `modules/test-modules-layouts/frontend/layout-builder-canvas-layout.js`
- Retained change:
  - `buildPlacementStyle` now reads the actual parent container node
  - row-flex children use row semantics:
    - `width: auto`
    - `maxWidth` derived from `basis` when present
  - column-flex children remain stretched full width
  - grid items keep explicit span semantics and stretch behavior

### Wrap-Aware Percentage Rows
- Files:
  - `modules/test-modules-layouts/frontend/layout-builder-canvas-layout.js`
  - `frontend/src/tests/core/layout-builder-model.core.test.jsx`
- Trigger:
  - manual review found one remaining case after the initial fidelity pass:
    - nested `grid -> flex(row, wrap) -> two 50% blocks`
    - the builder could still wrap the second block because the gap budget was being added on top of raw percentage basis values
- Retained change:
  - row-flex sizing now groups percentage siblings into visual rows and distributes the row gap budget across those siblings proportionally
  - the important first case is now locked:
    - two `50%` siblings become `calc(50% - 10px)` when the row gap is `20px`
  - this keeps the builder surface aligned with the intended one-row composition even when `wrap` is enabled

## Manual Closure Evidence

### Grid Case
- Live browser flow:
  - created a fresh layout
  - added a new grid container
  - added two direct blocks into that grid container
- Result:
  - both blocks remained visible on the canvas
- Screenshots:
  - failure reference:
    - `.codex-runtime/layout-review/issue-grid-before.png`
  - retained-fix result:
    - `.codex-runtime/layout-review/issue-grid-two-blocks-visible-after-fix.png`

### Flex Fidelity Case
- Live browser flow:
  - created a fresh container
  - switched it to `flex`
  - changed direction to `row`
  - set both child blocks to `Flex Basis = 50%`
- Result:
  - live DOM measurement after the retained fix:
    - container width: `905px`
    - block A width: `419px`
    - block B width: `419px`
  - this is the expected side-by-side row reading for the current builder surface
- Screenshots:
  - intermediate state:
    - `.codex-runtime/layout-review/issue-flex-container-after-switch.png`
  - retained-fix result:
    - `.codex-runtime/layout-review/issue-flex-row-50-50-after-fix.png`

## Verification
- `pnpm --filter frontend exec vitest run src/tests/core/layout-builder-model.core.test.jsx`
  - passed
- `pnpm --filter frontend exec vitest run src/tests/app-integration/layouts.integration.test.jsx`
  - passed
- wrap follow-up verification:
  - `pnpm --filter frontend exec vitest run src/tests/core/layout-builder-model.core.test.jsx`
    - passed after adding the row-wrap percentage test
  - `pnpm --filter frontend exec vitest run src/tests/app-integration/layouts.integration.test.jsx`
    - passed after the wrap-aware sizing change
- `pnpm quality:gate:full`
  - passed

## Acceptance Criteria Outcome
1. A new grid container can show at least two direct blocks without one disappearing.
   - met
2. Builder geometry no longer depends on duplicate container layout wrappers.
   - met
3. A row flex container with two `50%` blocks reads as two side-by-side surfaces on the live canvas.
   - met
4. Focused layout tests still pass.
   - met
5. The full release gate still passes.
   - met
