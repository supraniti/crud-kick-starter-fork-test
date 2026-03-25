# Widget/Component Builder Manager Brief

Date: 2026-03-24
Audience: System manager
Status: Proposed

## What This Program Is

This program extends the current Layout Builder from structural page framing into authored page composition.

Today:

- layouts define containers and blocks
- pages define source and layout
- deployed pages render through a mostly hardcoded reader shell

After this program:

- each block can host one widget/component instance
- widget content can be:
  - static
  - derived from the page-owned query context
  - mixed static and dynamic
- widget props can be configured through typed design-library wrappers
- widgets can emit bounded actions such as navigation
- deployed pages can render from authored widget definitions through the existing data/action runtime

## Why It Matters

This is the missing layer between:

- page data
- reusable layout structure
- live deployed behavior

Without it, layouts remain visual shells and the deployed application remains too hardcoded.

With it, the system moves toward the intended end state:

1. configure a page
2. choose a layout
3. configure the components inside that layout
4. bind them to the page context
5. deploy
6. get a live page that behaves according to authored intent

## What Makes This Hard

This is not a normal UI enhancement.

It is a cross-cutting program touching:

- layout persistence
- page context contracts
- authoring UX
- runtime contracts
- deployed rendering

The hardest part is not drawing components on a canvas.
The hardest part is keeping these three things in sync:

1. what the page knows
2. what the layout/component author can bind to
3. what the deployed runtime can actually resolve and render

## Recommended Product Direction

The program should be built around five firm principles:

1. one block hosts one widget instance in V1
2. widgets come from a typed registry, not free-form JSON
3. canonical binding namespace is `context.*`
4. widget binding is driven by declared page-owned query/context manifest branches
5. deployed widgets render through `window.dataLayer`, with navigation handled by a reader bridge and mutations handled by `window.actionLayer`
6. defaults must make common blog pages easy to author

## What V1 Should Deliver

The recommended first delivery is intentionally bounded:

- post-detail pages only
- a small curated widget set:
  - title
  - rich text
  - image
  - category chips
  - author card
- guided context binding
- typed static props
- a bounded action model for navigation
- no category-detail scope in the first implementation slice
- deployed rendering of that widget subset through the runtime

This is enough to prove the architecture without overcommitting the first pass.

## What Must Be Protected

The program must not:

- turn layouts into raw JSON editing
- make users write binding expressions by hand as the normal path
- bypass the existing browser data/action runtime
- explode complexity by supporting arbitrary nested widgets too early

## Main Risks

1. Overcomplicated authoring
- mitigated by defaults, presets, and guided binding

2. Binding chaos
- mitigated by a generated page context manifest and structured binding descriptors

3. Runtime drift
- mitigated by a compiled render contract between authoring and deployment

4. Primitive-only design
- mitigated by supporting both:
  - single-component wrappers
  - composite/template wrappers

## Manager Decision Points

These decisions should be considered approved before implementation begins:

1. V1 keeps one component instance per block
2. V1 supports both primitive and selected composite wrappers
3. V1 uses `context.*` as the canonical binding namespace
4. V1 uses declared page-owned query/context as the only dynamic binding surface
5. V1 keeps most props static and only allows dynamic props where clearly justified
6. V1 focuses on post-detail before broader page kinds

## Recommendation

Approve this as a multi-pass architectural program, not a small feature ticket.

The repo is ready for that work conceptually, but only if implementation follows the documented plan and does not take shortcuts around the runtime or binding model.
