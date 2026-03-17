# MG-001 Layout Builder Planning Review

## Inputs
- Ticket:
  - `C:\Users\cmsin\OneDrive\שולחן העבודה\MG-001-layout_builder.txt`
- Visual reference:
  - `C:\Users\cmsin\OneDrive\שולחן העבודה\design.png`
  - current file contents are not an image; the file contains:
    - `{"detail":"Invalid signature or expired URL"}`
  - planning below uses the ticket plus current repo state, not the missing visual reference

## Target Read

MG-001 is asking for a **layout-only visual canvas**.

The intended editor is:
- canvas-first
- page-boundary-aware
- viewport-aware
- contextual
- structural

It is not asking for:
- block content editing
- a sidebar-heavy admin form
- a WordPress-style control panel builder

The intended mental model is:
- page
  - container
    - block
    - container
      - block

The intended operator flow is:
1. open the builder
2. see a clear page canvas
3. add containers and placeholder blocks
4. drag them predictably
5. understand page width, height, and structure visually
6. adjust viewport/zoom
7. keep editing on-canvas, with contextual controls

## Current Repo State

### What already exists

The repo already has a real layouts module with:
- reusable layout records
- normalized container/block tree state
- nested containers
- grid and flex container modes
- drag/drop move and reorder
- left-rail hierarchy
- node editing dialog
- selected-node inspector
- rendered structural preview
- page-to-layout and layout-to-page return flow

Main files:
- [LayoutsView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutsView.jsx)
- [LayoutBuilderCanvas.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvas.jsx)
- [LayoutBuilderLeftRail.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderLeftRail.jsx)
- [LayoutBuilderInspector.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderInspector.jsx)
- [LayoutBuilderNodeDialog.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderNodeDialog.jsx)
- [layout-builder-model.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layout-builder-model.js)
- [layout-document.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/shared/layout-document.mjs)
- [test-modules-layouts-module-contract.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/contracts/test-modules-layouts-module-contract.md)

### What the current builder is actually optimized for

Current builder is optimized for:
- deterministic structure editing
- safe nested container modeling
- page-integration with reusable layouts
- admin-style editing with persistent rails and inspector

It is not optimized for:
- immersive canvas-first authoring
- viewport/page-boundary simulation
- contextual edit controls replacing permanent chrome

## Exact Match vs MG-001

### Already aligned

These requirements are already materially present:
- layout tree is container/block based
- blocks are structural placeholders
- nested containers are supported
- drag/drop exists
- selected vs non-selected states exist
- rendered structure preview exists
- JSON layout tree state already exists
- DOM/CSS rendering model already exists

### Partially aligned

These exist, but not in the requested product form:
- drag/drop:
  - exists
  - but current affordances are still admin-builder style, not canvas-first and obvious enough
- visual hierarchy:
  - exists
  - but current layout still depends on left rail + inspector to understand structure
- container/block editing:
  - exists through node dialog + inspector
  - but MG-001 wants contextual on-canvas editing as the primary experience
- layout presets:
  - current grid/flex behavior can represent several requested structures
  - but they are not exposed as explicit operator-facing structural layout presets

### Missing relative to MG-001

These are the main missing pieces:

1. Canvas shell
- no top ruler
- no left ruler
- no dual micro/macro grid system
- no clear page-width/page-height/outside-area shading model
- no explicit centered page boundary visualization

2. Viewport system
- no viewport width/height controls
- no desktop/laptop/tablet/mobile presets
- no viewport label like `1200 x 800`

3. Zoom
- no canvas zoom control

4. Contextual editing model
- current builder still has permanent left rail and permanent inspector
- MG-001 explicitly prefers contextual controls over permanent sidebars
- current insert flow is tab/rail oriented, not contextual `+` menus near targets

5. Structural block catalog
- current model knows `container` and `block`
- MG-001 wants explicit structural placeholder types:
  - Hero
  - Text
  - Image
  - Feature
  - CTA
  - Sidebar
  - Content
- these can still be opaque placeholders, but the builder needs that vocabulary

6. Layout preset vocabulary
- missing explicit presets:
  - 1 column
  - 2 columns
  - 3 columns
  - sidebar + content
  - content + sidebar

7. Floating toolbar
- current actions live mostly in rail/inspector/dialog
- MG-001 wants floating selection toolbar near the selected block

8. Hover state and insertion clarity
- current builder has move mode and drop slots
- MG-001 wants clearer always-readable hover + selected + insertion states

9. Resizable asymmetric columns
- current flex/grid sizing model exists
- but direct drag-handle resizing for sidebar/content proportions is not exposed as the operator experience

## Main Architectural Decision

Do not replace the current model layer.

Keep:
- layout document model
- normalization
- nested container semantics
- move/add/remove/update operations

Replace or heavily reshape:
- surface chrome
- interaction shell
- insertion affordances
- viewport/page presentation

Reason:
- the model is already good enough for the requested MVP
- the main gap is interaction architecture, not persistence architecture

## Recommended Implementation Shape

### Phase 1. Canvas Shell Rewrite

Goal:
- make the builder visually read like a bounded page workspace

Deliver:
- full-width canvas shell
- darker outside area
- white page area
- micro grid
- macro grid
- top ruler
- left ruler
- viewport toolbar
- viewport presets
- zoom control

Keep from current builder:
- existing root stage content renderer
- existing layout tree model

Main expected file impact:
- `LayoutsView.jsx`
- `LayoutBuilderCanvas.jsx`
- likely new shared canvas-shell helpers/components

### Phase 2. Contextual Interaction Rewrite

Goal:
- stop making the operator depend on permanent rails for normal authoring

Deliver:
- contextual `+` insertion affordances
- floating add menu
- hover handles
- selected floating toolbar
- simpler default screen with optional supporting panels, not mandatory ones

Likely outcome:
- left rail and inspector become optional/support surfaces
- canvas becomes primary

### Phase 3. Structural Presets And Placeholder Types

Goal:
- make the structure vocabulary match the ticket

Deliver:
- placeholder block families:
  - Hero
  - Text
  - Image
  - Feature
  - CTA
  - Sidebar
  - Content
- structural layout presets:
  - 1 column
  - 2 columns
  - 3 columns
  - sidebar/content
  - content/sidebar

Important:
- these still remain structural placeholders
- this phase must not expand into content editing

### Phase 4. Resizing And Stronger Spatial Editing

Goal:
- make asymmetric structure editing feel direct

Deliver:
- resizable side columns
- clearer width indicators
- container width labels
- block ratio labels
- improved selected/hovered visuals

### Phase 5. Cleanup And Page Integration

Goal:
- preserve the current repo strengths while switching to the new builder UX

Deliver:
- page -> layout -> page roundtrip still works
- current reusable layout record flow still works
- deployment/page integration is unaffected
- tests rewritten around the new shell

## What should be removed or demoted

These current patterns conflict with MG-001 and should be demoted:
- permanent left rail as primary insertion workflow
- permanent inspector as primary editing workflow
- admin-card feel on the canvas
- explanatory copy that consumes canvas space
- any interaction that requires leaving the affected block/container to edit it

## What should stay

These are worth preserving:
- reusable layout records
- deterministic normalized JSON layout tree
- container/block semantics
- nested containers
- explicit move/add/remove/update helpers
- page return flow
- rendered structural preview support

## Practical Next Program

This should be executed as a dedicated layout-builder program, not as scattered fixes.

Recommended passes:

1. Canvas shell and viewport system
2. Contextual controls and floating actions
3. Structural presets and placeholder block vocabulary
4. Resize/selection/hover fidelity
5. Cleanup, integration, tests, and proof

## Delivery Standard

This next program should not be considered done until:
- the builder opens into a clear bounded page canvas
- the operator can add structures without relying on a permanent sidebar
- viewport and zoom are usable
- hierarchy is legible directly on the canvas
- asymmetric layouts are easy to build
- current page/layout integration still works

## Bottom Line

Current repo status:
- strong underlying model
- strong deterministic editing logic
- wrong interaction shell for MG-001

So the next layout-builder effort should be:
- a surface/interaction redesign on top of the existing model
- not a rewrite of the persistence/model core
