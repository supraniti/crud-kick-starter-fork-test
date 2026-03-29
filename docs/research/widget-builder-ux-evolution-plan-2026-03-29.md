# Widget Builder UX Evolution Plan

Date: 2026-03-29

Related intent:
- [widget-builder-ux-intent-file-2026-03-29.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/widget-builder-ux-intent-file-2026-03-29.md)

Related assessment:
- [widget-builder-current-state-assessment-2026-03-29.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/widget-builder-current-state-assessment-2026-03-29.md)

Related ticket:
- [widget-builder-ux-evolution-ticket-2026-03-29.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/widget-builder-ux-evolution-ticket-2026-03-29.md)

## Planning standard

This plan is intentionally heavier than a normal implementation plan because the failure mode here is building more mechanics without building a better operator experience. Every phase must prove both system correctness and operator usability.

## Intent cross-check

Before freezing this plan, it was checked against the intent file on these explicit points:
- popup-based widget library remains intact
- widget library must be tile-based and visually understandable
- content / display / action props must be separated and easy to reason about
- theme/default/widget hierarchy must be visible
- built-in and remote widgets must remain MUI-based wrappers
- remote runtime must fill dynamic content from data layer
- custom widgets must be authorable and reusable
- configuration must persist in DB

The assessment added the following missing planning needs:
- broaden query/widget capability for editorial section pages
- avoid keeping Page Studio state only in local storage
- add library search/category/filtering
- add clear compatibility explanations
- add real reusable card/teaser and section widgets

## Delivery strategy

The work should be executed in seven mandatory passes.

### Pass 0. Widget system contract reframe
Goal:
- separate built-in descriptor metadata from authoring UX metadata
- prepare the system for both built-in and custom widgets without breaking current runtime

Work:
- extend widget descriptor contract with:
  - icon
  - category
  - short use case text
  - complexity label
  - recommended page kinds
  - theme-aware field metadata
  - explicit field groups: `content`, `display`, `behavior`
- define custom widget document schema
- define DB collection/storage contract for custom widgets
- define publication contract for remote runtime

Checks:
- schemas normalize cleanly
- current built-in widgets migrate without loss
- no runtime regression in current page rendering

### Pass 1. Widget library popup redesign
Goal:
- make choosing a widget fast, visual, and understandable

Work:
- replace vertical paper list with tile grid
- add category rail or chips
- add search/filter
- each tile shows:
  - icon
  - title
  - category
  - concise description
  - compatibility hint
- add sections:
  - Built-in
  - Custom
  - Recently Used
  - Suggested For This Page

Checks:
- picker is usable without prior product knowledge
- operator can identify relevant widgets visually
- incompatible widgets are either hidden or clearly explained

### Pass 2. Guided widget configurator redesign
Goal:
- make configuration linear and understandable

Work:
- redesign configurator dialog into clear grouped sections or internal stepper:
  - Overview
  - Content
  - Display
  - Behavior
  - Review
- add concise guidance copy at top of each section
- add preview chips showing data dependencies and behavior dependencies
- show live mini-preview where practical

Checks:
- changing common fields does not require reading raw binding descriptors
- operator can explain what the widget will render after reviewing the dialog

### Pass 3. Precedence and theme model
Goal:
- make style resolution predictable

Work:
- define explicit field-level precedence metadata
- add UI treatment for each configurable field:
  - inherited from theme
  - inherited from widget default
  - explicitly overridden here
- add reset-to-default / reset-to-theme actions
- ensure theme-aware widget fields are consistent between app preview and remote runtime

Checks:
- typography/color fields always expose their effective source
- Preview and remote runtime resolve the same visual field values

### Pass 4. Editorial widget vocabulary expansion
Goal:
- make realistic editorial pages buildable

Required built-in widget additions:
- section heading
- teaser card
- hero story
- compact story list
- button / CTA
- divider / spacer
- metadata strip
- newsletter or promo block
- generic collection renderer with presentation variants

Related query model work:
- support more independent list queries suitable for multi-section pages
- expose those queries cleanly in Infra

Checks:
- can recreate a meaningful subset of AP / Guardian / Verge front-page patterns
- can build both detail pages and section pages without awkward widget misuse

### Pass 5. Custom widget authoring and persistence
Goal:
- let operators build reusable widgets with the same system

Work:
- add `Custom Widgets` module or dedicated library management surface
- allow a custom widget to define:
  - metadata
  - internal layout
  - nested widget composition
  - accepted input fields
  - exposed overrides/actions
- persist custom widget documents in DB-backed collection
- surface them in the widget chooser alongside built-ins

Checks:
- operator can author one custom teaser/card widget and reuse it on another page
- custom widget survives reload and is visible from another session/process via DB-backed storage

### Pass 6. Remote/runtime publication and parity proof
Goal:
- remote deployment renders built-in and custom widgets from the same contract family

Work:
- publish built-in/custom widget registries needed by remote runtime
- ensure data-layer resolution still happens remotely for content bindings
- ensure custom widget composition is supported remotely
- ensure deployed pages do not need separate bespoke rendering rules for custom widgets

Checks:
- Preview and Live share the same widget contract behavior
- custom widget renders correctly on deployed page
- translation/theme/data-layer behavior still works through the widget runtime

### Pass 7. Usability validation and migration hardening
Goal:
- prove the system is understandable and safe to evolve

Work:
- exercise operator flows end to end:
  - choose built-in widget
  - configure content/display/behavior
  - create custom widget
  - reuse custom widget
  - deploy and verify remote parity
- migrate current widget instances to new grouped metadata model
- write recovery notes for partial migration states

Checks:
- no loss of existing pages/layouts
- new UI is visibly easier to reason about
- no critical performance regression in picker/configurator/preview

## Required documents during implementation

During execution, maintain these documents:
- pass log / findings per implementation pass
- migration notes for widget descriptor changes
- remote publication notes for custom widget deployment
- updated operator how-to once the new flow stabilizes

## Testing plan

Must include all of the following:

1. Core tests
- widget descriptor normalization/validation
- custom widget document normalization/validation
- precedence resolution
- action configuration normalization

2. Frontend integration tests
- widget library filtering and selection
- configurator grouped flow
- theme/default/override visibility
- custom widget create/edit/reuse

3. Runtime conformance tests
- built-in widget render parity
- custom widget render parity
- page data binding resolution
- remote publication consumption

4. Browser review
- use Chrome DevTools on real local routes
- inspect the actual picker and configurator surfaces
- inspect both Preview and deployed Live pages

## Implementation order rationale

The order above is intentional:
- contract first, so built-in and custom widgets have one future-proof foundation
- chooser/configurator second, because UX is the immediate product pain
- vocabulary/query expansion before custom widgets, so user-authored widgets are built on a capable base
- remote publication after custom widget documents exist, so deployment is real and not mocked

## Approval gate

Do not implement this plan until the operator approves it.

The first requested implementation proof after approval should be:
1. redesigned widget tile picker
2. redesigned configurator with explicit `Content / Display / Behavior / Review`
3. one new editorial widget family beyond current post-detail primitives
