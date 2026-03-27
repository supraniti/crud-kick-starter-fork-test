# Page Studio Layout Transform Design

Date: 2026-03-27
Status: Active planning pass
Canonical intent:
- [intent-file.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/intent-file.md)
- [page-studio-mui-parity-execution-plan-2026-03-27.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/page-studio-mui-parity-execution-plan-2026-03-27.md)

## Purpose

This document is the dedicated planning pass required by the intent for the most sensitive part of the program:

- Gridstack-authored editor layout
- transformed runtime layout contract
- MUI preview/live parity
- per-breakpoint persistence

The purpose is to prevent us from leaking editor implementation details into deployment and to keep `PREVIEW === LIVE` as an enforceable engineering rule instead of a visual approximation.

## Non-Negotiable Intent Rules

1. Gridstack exists for editor ergonomics only.
2. Deployed pages must render MUI components and depend on MUI.
3. Preview must use the same runtime contract as live deployment.
4. Each block must have:
- a serialized id like `B-0001`
- a unique tone in `Layout` mode only
5. Layout can vary by screen size.
6. A mobile adjustment must be saveable without mutating desktop/tablet geometry.
7. Runtime output must not depend on Gridstack CSS classes.

## Current Architecture Reality

Today the repo has:
- layout documents with container/block nodes
- widget render contracts
- a custom reader runtime
- theme and translation systems

What it does not yet have:
- an editor grid model that is explicitly separate from runtime layout output
- breakpoint inheritance rules
- a deployment-safe layout contract optimized for MUI rendering
- a parity test matrix between editor and deployed output

## Decision Summary

### 1. Two layout models, not one

We will keep two explicit representations:

1. `editorGrid`
- authoring-only
- optimized for Gridstack
- includes pixel-oriented or grid-oriented authoring metadata
- never shipped to live deployment

2. `runtimeLayout`
- deployment/preview contract
- optimized for MUI Box/Stack/Grid-like rendering via `sx`
- contains only the geometry and semantics needed for the reader
- no Gridstack class names, no drag metadata, no editor-only affordances

This is mandatory. Reusing the Gridstack model directly would violate the intent and make preview/live parity brittle.

### 2. Runtime layout will use MUI primitives with CSS Grid

We should not map Gridstack into legacy bespoke HTML containers.
We should also not force a lossy translation into MUI's old 12-column `Grid` props when CSS Grid is the closer conceptual match.

Runtime layout should use:
- MUI `Box`
- MUI `Stack`
- widget wrappers built from MUI components
- `sx`-driven CSS Grid styles for layout regions

Why:
- closest parity with Gridstack row/column placement
- easiest breakpoint-specific contract
- still fully inside the MUI runtime environment

## Canonical Data Layers

### Studio document

The `Page Studio` document owns four state groups:
- `infra`
- `layout`
- `widgets`
- `preview`

### Layout state split

`layout` must be split into:
- `editorGrid`
- `runtimeLayoutMetadata`

`editorGrid` example shape:

```json
{
  "activeBreakpoint": "desktop",
  "breakpoints": {
    "desktop": {
      "columns": 12,
      "rowHeight": 32,
      "items": [
        { "blockId": "B-0001", "x": 0, "y": 0, "w": 12, "h": 3 }
      ]
    },
    "tablet": {
      "inherits": "desktop",
      "columns": 12,
      "rowHeight": 28,
      "items": []
    },
    "mobile": {
      "inherits": "tablet",
      "columns": 12,
      "rowHeight": 24,
      "items": []
    }
  }
}
```

`runtimeLayoutMetadata` example shape:

```json
{
  "canvasMaxWidth": {
    "desktop": 1280,
    "tablet": 960,
    "mobile": 420
  },
  "gap": {
    "desktop": 3,
    "tablet": 2,
    "mobile": 1.5
  },
  "padding": {
    "desktop": 3,
    "tablet": 2,
    "mobile": 1
  }
}
```

The transformed deployment contract is derived from these two groups plus widget assignments.

## Breakpoint Model

We will use three explicit breakpoints in V1:
- `desktop`
- `tablet`
- `mobile`

All breakpoints use a 12-column authoring grid.

Reason:
- one consistent coordinate system
- easier transform logic
- easier inheritance
- smaller chance of desktop/mobile drift caused by changing the authoring math itself

The viewport preview changes size, not the underlying column count.

## Breakpoint Inheritance Rules

Every breakpoint after `desktop` may either:
- inherit the previous breakpoint exactly
- override only selected block placements

Rules:
1. `desktop` is always explicit.
2. `tablet` may inherit `desktop`.
3. `mobile` may inherit `tablet`.
4. If a block has no explicit placement at a breakpoint, runtime uses the nearest inherited placement.
5. Saving a mobile move only writes that block's `mobile` placement override.

Example:
- `B-0004` unchanged on tablet: no tablet item written
- `B-0004` changed on mobile: add one mobile item override for `B-0004`

This keeps authored state small and understandable.

## Block Identity Contract

Block ids are not random layout node ids.
They are ordered studio ids:
- `B-0001`
- `B-0002`
- `B-0003`

Rules:
1. Once assigned, a block id never changes.
2. Deleting a block does not renumber older ids.
3. New blocks append the next id.
4. Layout mode shows the color tone.
5. Widgets/Preview modes hide the tone and treat the id as authoring metadata only.

Separate from that, each block may also have an internal stable UUID later if needed for migrations, but the operator-facing id remains the serialized block id.

## Editor Grid Contract

Gridstack item fields we should persist in V1:
- `blockId`
- `x`
- `y`
- `w`
- `h`
- optional `minW`
- optional `minH`

We should not persist editor artifacts such as:
- DOM class names
- drag handles
- resize handles
- live pixel offsets
- animation state

## Transform Target Contract

Runtime contract should be a pure MUI render contract.

Example shape:

```json
{
  "contractVersion": 1,
  "breakpoints": {
    "desktop": {
      "columns": 12,
      "rowHeight": 32,
      "gap": 24,
      "padding": 24,
      "items": [
        { "blockId": "B-0001", "colStart": 1, "colSpan": 12, "rowStart": 1, "rowSpan": 3 }
      ]
    },
    "tablet": { ... },
    "mobile": { ... }
  }
}
```

Notes:
- `colStart` and `rowStart` are 1-based CSS Grid values for easier runtime emission.
- The runtime never needs `x/y/w/h` once transformed.
- The runtime also does not need Gridstack-specific breakpoint rules because inheritance is already resolved before shipping.

## Transform Algorithm

For each breakpoint:

1. Resolve inherited block placements into a fully materialized block map.
2. Sort by:
- `y`
- then `x`
- then `blockId`
3. Convert:
- `x` -> `colStart = x + 1`
- `w` -> `colSpan = w`
- `y` -> `rowStart = y + 1`
- `h` -> `rowSpan = h`
4. Emit the breakpoint grid contract.
5. Bind each emitted block to exactly one widget contract or mark it unassigned.

## Preview/Live Parity Contract

Preview and live must share:
- the same transformed runtime layout contract
- the same widget wrapper registry
- the same theme resolution
- the same locale/translation overlay path
- the same data-layer read model

Preview-only allowances:
- param editor
- debug overlays
- block-name inspection toggles

Preview-only allowances must not alter rendering math.

## Widget Placement Rules

A widget never controls layout placement.
Layout owns geometry.
Widget owns content/props/actions only.

That boundary must stay strict:
- `Layout` mode edits geometry
- `Widgets` mode edits widget assignment/configuration
- `Preview` mode renders the resolved page

## Theme Interaction Rules

Theme affects widget rendering through normal MUI theme resolution and explicit wrapper prop merge rules.
It does not mutate layout geometry.

Allowed:
- typography scale
- spacing tokens
- color palette
- border radius
- component-level default props

Not allowed:
- moving blocks
- changing grid span
- changing block coordinates

## URL Params And Data Dependencies

Infra owns:
- route pattern
- URL param declarations
- query declarations
- seo bindings
- selected client
- selected theme

Layout and widget bindings can only reference data that Infra declares available.

That means the transform contract for preview/live also needs a manifest pointer:
- which params are expected
- which data queries hydrate the page context
- which widget bindings depend on them

## Validation Rules

### Layout save
Fail save when:
- two blocks overlap in the same breakpoint after inheritance resolution
- a block is missing geometry at the root breakpoint
- block id duplicates exist
- invalid dimensions exist

### Widget save
Fail save when:
- a block receives more than one widget
- widget binding references undeclared Infra context
- action target shape is invalid

### Preview render
Warn, do not hard-fail, when:
- no data returned
- optional params absent
- widget has valid fallback content

Hard-fail preview when:
- transformed runtime contract cannot be built
- a required widget binding is unresolved with no fallback

### Deployment
Fail deployment when:
- preview/live contract serialization differs
- unresolved required widget binding remains
- route pattern and query dependencies are incompatible

## Test Matrix

### Authoring proofs
1. Add three blocks on desktop
2. Move one block on mobile only
3. Confirm desktop remains unchanged
4. Assign one widget per block
5. Open preview with sample URL params

### Runtime proofs
1. Preview desktop equals live desktop
2. Preview mobile equals live mobile
3. Post-detail route with dynamic title/media/body matches live
4. Category route with translated strings matches live

### Regression proofs
1. Gridstack classes are absent from deployed HTML
2. Runtime contract contains no editor-only metadata
3. Theme switch changes widget style but not geometry

## Open Decisions Already Settled In This Pass

1. Runtime layout primitive
- chosen: MUI `Box`/`Stack` with CSS Grid in `sx`

2. Breakpoint coordinate system
- chosen: 12 columns for desktop/tablet/mobile

3. Inheritance model
- chosen: nearest-parent override inheritance

4. Block identity
- chosen: serialized `B-0001` ids, never renumbered

## Immediate Impact On Implementation Plan

Before implementing Gridstack geometry editing, we must add:
1. shared breakpoint constants
2. serialized block id allocator
3. editor-grid schema
4. runtime-layout transform module
5. parity tests for transform output

Only then should the real `Layout` mode start accepting drag/resize edits.
