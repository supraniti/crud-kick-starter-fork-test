# MG-001 Layout Builder Implementation Program

## Purpose
- Turn the current layouts module into the MG-001 canvas-first layout builder.
- Preserve the existing layout document model and page integration.
- Replace the current admin-style shell with a page-boundary-aware visual builder.

## Inputs
- [mg-001-layout-builder-planning-review.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/mg-001-layout-builder-planning-review.md)
- `C:\Users\cmsin\OneDrive\שולחן העבודה\MG-001-layout_builder.txt`
- current layouts module implementation in `modules/test-modules-layouts/frontend/`

## Non-Goals
- block content editing
- data binding
- responsive overrides
- reusable layout templates beyond structural presets
- backend persistence redesign

## Delivery Standard
- canvas-first shell
- clear page boundary
- rulers and quiet grid
- viewport width and height controls
- preset breakpoints
- zoom
- contextual insertion becoming primary over permanent sidebars
- current page-to-layout return flow remains intact
- current save/delete/persistence behavior remains intact

## Model Rule
Keep the existing model layer:
- [layout-document.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/shared/layout-document.mjs)
- [layout-builder-model.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layout-builder-model.js)

Surface work should happen primarily in:
- `modules/test-modules-layouts/frontend/LayoutsView.jsx`
- `modules/test-modules-layouts/frontend/LayoutBuilderCanvas.jsx`
- new frontend-only layout-builder shell helpers/components

## Passes

### Pass 1: Canvas Shell And Viewport System
Objective:
- make the builder read like a bounded page workspace immediately

Deliver:
- centered page area
- outside-area shading
- micro grid
- macro grid
- top ruler
- left ruler
- viewport toolbar
- width/height step controls
- viewport presets:
  - Desktop 1440
  - Laptop 1280
  - Tablet 768
  - Mobile 390
- zoom control
- root container shown as centered page container

Keep:
- existing left rail and inspector as support panels for this pass
- current drag/drop operations
- current node dialog

Exit criteria:
- opening `Layouts` feels like entering a page canvas, not a generic admin card
- viewport and zoom are usable
- page boundary is visually clear

### Pass 2: Contextual Interaction Shell
Objective:
- make on-canvas interaction primary

Deliver:
- contextual add affordances on containers
- floating selection toolbar near selected node
- hover handles and clearer selected state
- support panels demoted visually from primary canvas ownership

Exit criteria:
- normal insertion does not depend on the left rail
- selection actions are readable directly on the canvas

### Pass 3: Structural Presets And Placeholder Vocabulary
Objective:
- make the structure language match MG-001

Deliver:
- placeholder labels/types:
  - Hero
  - Text
  - Image
  - Feature
  - CTA
  - Sidebar
  - Content
- structural presets:
  - 1 column
  - 2 columns
  - 3 columns
  - sidebar + content
  - content + sidebar

Exit criteria:
- the operator can build ticket-shaped structures quickly without manual low-level setup

### Pass 4: Resize And Spatial Fidelity
Objective:
- make layout proportions easier to manipulate and understand

Deliver:
- resize handles for asymmetric columns
- width/proportion indicators
- stronger insertion and drop-position cues
- stronger hover/selected visuals

Exit criteria:
- sidebar/content and multi-column layouts feel direct, not approximate

### Pass 5: Cleanup, Integration, And Proof
Objective:
- finish the builder as the new baseline

Deliver:
- remove obsolete explanatory/admin chrome where possible
- keep page integration intact
- refresh tests around the new shell
- add proof notes to progress pointers

Exit criteria:
- builder is usable as the repo baseline for future page/presentation work
- quality gate is green

## Current Execution Status
- Pass 1: delivered on `2026-03-17`
- Pass 2: delivered on `2026-03-17`
- Pass 3: delivered on `2026-03-17`
- Pass 4: delivered on `2026-03-17`
- Pass 5: delivered on `2026-03-17`

## Pass 1 Delivered
- canvas-first shell is now the primary layout-builder surface
- added:
  - centered page boundary
  - outside-area shading
  - quiet 8px and 80px grid
  - top and left rulers
  - viewport width and height controls
  - viewport presets
  - zoom controls
- kept:
  - current layout document model
  - current save/delete flow
  - current page return flow
  - current drag/drop operations
  - current left rail and inspector as support panels
- main files:
  - [LayoutsView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutsView.jsx)
  - [LayoutBuilderCanvas.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvas.jsx)
  - [LayoutBuilderCanvasShell.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvasShell.jsx)
  - [LayoutBuilderCanvasNodes.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvasNodes.jsx)
  - [LayoutBuilderCanvasPrimitives.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvasPrimitives.jsx)
  - [layout-builder-viewport.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layout-builder-viewport.js)
- verification:
  - `pnpm --filter frontend exec vitest run src/tests/app-integration/layouts.integration.test.jsx`
  - `pnpm lint:function-shape`
  - `pnpm quality:protocol`
  - `pnpm quality:gate:full`

## Passes 2-5 Delivered
- contextual interaction shell is now primary:
  - contextual add menus on the root page and containers
  - floating node toolbar with:
    - add
    - duplicate
    - move
    - edit
    - delete
  - support panels demoted into an optional dock:
    - `Layouts`
    - `Layers`
    - `Details`
- structural preset vocabulary is now first-class:
  - `1 Column`
  - `2 Columns`
  - `3 Columns`
  - `Sidebar + Content`
  - `Content + Sidebar`
- placeholder block vocabulary is now first-class:
  - `Hero`
  - `Text`
  - `Image`
  - `Feature`
  - `CTA`
  - `Sidebar`
  - `Content`
- spatial fidelity improvements are now live:
  - width/proportion badges on nodes
  - flex-pair resize handles for row layouts
  - stronger selected and hover states
  - clearer move/drop slots
- cleanup/integration work closed:
  - removed the old `Insert`-tab-first workflow from the main builder path
  - kept save/delete/page-return integration intact
  - refreshed layout builder integration proof to the new contract
  - kept repo LOC and function-shape gates green by extracting module-local helpers
- main files:
  - [LayoutsView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutsView.jsx)
  - [LayoutBuilderCanvas.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvas.jsx)
  - [LayoutBuilderCanvasNodes.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvasNodes.jsx)
  - [LayoutBuilderCanvasPrimitives.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvasPrimitives.jsx)
  - [LayoutBuilderAddMenu.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderAddMenu.jsx)
  - [layout-builder-palette.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layout-builder-palette.js)
  - [layout-builder-advanced-model.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layout-builder-advanced-model.js)
  - [layout-builder-node-support.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layout-builder-node-support.jsx)
  - [useLayoutsWorkspace.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/useLayoutsWorkspace.js)
  - [layouts-workspace-selection-actions.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layouts-workspace-selection-actions.js)
  - [layout-document.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/shared/layout-document.mjs)
  - [layouts.integration.test.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/tests/app-integration/layouts.integration.test.jsx)
- verification:
  - `pnpm --filter frontend exec vitest run src/tests/app-integration/layouts.integration.test.jsx`
  - `pnpm lint:repo-loc`
  - `pnpm lint:function-shape`
  - `pnpm quality:protocol`
  - `pnpm quality:gate:full`
- result:
  - MG-001 is now the repo baseline for layout-builder work

## Verification Standard Per Pass
- targeted layout frontend integration tests
- `pnpm lint:function-shape`
- `pnpm quality:protocol`
- `pnpm quality:gate:full`

## Progress Pointers
- update [handoff.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/handoff.md)
- update [agent-observer-log.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/agent-observer-log.md)
- keep this file current as passes close
