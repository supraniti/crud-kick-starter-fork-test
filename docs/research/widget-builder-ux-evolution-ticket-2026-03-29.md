# Widget Builder UX Evolution Ticket

Date: 2026-03-29

Related intent:
- [widget-builder-ux-intent-file-2026-03-29.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/widget-builder-ux-intent-file-2026-03-29.md)

Related assessment:
- [widget-builder-current-state-assessment-2026-03-29.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/widget-builder-current-state-assessment-2026-03-29.md)

## Problem statement

Widget configuration in the current builder is technically functional but product-wise underpowered. It does not yet provide a clear, friendly, or scalable authoring experience for operators who need to build rich editorial pages and reusable design systems.

The system already has the foundations of a widget runtime:
- MUI-based widget wrappers
- canonical `context.*` data bindings
- content / prop / action definitions
- remote rendering by widget key + props

However, the operator experience is still too abstract, too list-driven, and too narrow in capability for the stated end goal.

## Goal

Turn widget authoring into a clear product system that lets an operator:
1. browse a visually understandable widget library
2. choose a widget in a popup
3. configure it with a straightforward stepwise flow
4. understand the precedence between theme defaults, widget defaults, and widget-specific overrides
5. bind content cleanly to page-owned Infra data
6. configure behavior/actions where relevant
7. create custom widgets and reuse them later as first-class library entries
8. deploy those built-in and custom widgets so remote pages render the same MUI widget runtime
9. persist all relevant authored configuration in the database

## User stories

1. As a page builder, I want to open a widget picker and immediately understand what each widget is for, so I can choose confidently.

2. As a page builder, I want content, display, and action settings clearly separated, so I do not have to infer the authoring flow.

3. As a page builder, I want to see which values come from theme defaults, widget defaults, or my explicit override, so typography and color decisions stay predictable.

4. As a page builder, I want widgets to read dynamic content directly from my page-owned queries, so Preview and Live use the same data contract.

5. As a page builder, I want to build a custom editorial widget once and reuse it later, so I can create a growing design library instead of repeating manual block-level work.

6. As a deployed-site reader, I want remote pages to render the same widget wrappers and behavior the editor showed, so Preview and Live remain consistent.

## Scope

### In scope
- redesign widget picker into a categorized grid/tile chooser in a popup
- redesign widget configurator into a guided structure
- explicit theme/default/instance precedence UX
- expand built-in widget inventory toward editorial composition
- define custom widget document model and persistence
- define remote/runtime support for custom widgets
- define database persistence model for widget library artifacts and widget instances

### Out of scope for this ticket
- arbitrary user-authored React code
- arbitrary third-party component ingestion
- raw HTML widgets as the primary abstraction

## Product requirements

### 1. Widget library UX
- shown in a popup
- grid of tiles, not only a vertical list
- each tile has:
  - icon
  - title
  - concise use-case description
  - category or type label
- library supports:
  - categories
  - search
  - optionally quick filters such as `Content`, `Navigation`, `Collection`, `Media`, `Custom`

### 2. Straightforward configuration flow
The configurator should present a clear progression:
1. Identity
- chosen widget
- description
- compatibility note

2. Content
- page data bindings from Infra
- static/manual values
- library/media picks where relevant

3. Display
- typography, layout, density, color, visual variants
- clear fallback to theme/default when not explicitly overridden

4. Behavior
- navigation targets
- emitted events
- widget-specific behavior toggles

5. Review
- concise summary of what this widget will render and what it depends on

### 3. Precedence model
The system must make the following order explicit:
1. Theme defaults
2. Widget descriptor defaults
3. Widget instance overrides

Where a field is inherited, pinned, or overridden should be visible in the UI.

### 4. Runtime consistency
- built-in widgets remain MUI wrappers or MUI compositions
- custom widgets are built from the same authoring/runtime contract
- remote deployment receives widget name + normalized props/bindings/actions
- remote runtime resolves dynamic content from the data layer at render time

### 5. Custom widgets
A custom widget must support:
- name
- icon
- category
- description
- versionable document structure
- its own layout/body made with the same builder tools
- nested built-in widgets under a controlled composition model
- later reuse in page builder widget library

### 6. Persistence
The following must persist in DB-backed documents:
- widget library metadata
- custom widget definitions
- page widget instances
- widget-specific overrides
- widget-category/icon metadata
- future migration metadata/version markers

## Technical requirements

### Built-in widget contract
Every built-in widget descriptor should expose:
- stable widget key
- icon key
- category
- title
- description
- content schema
- display schema
- action schema
- default props
- theme-aware field metadata
- compatibility rules
- remote runtime renderer key

### Custom widget contract
Every custom widget document should expose:
- stable custom widget id
- display metadata
- internal composition tree
- accepted input schema
- exposed content/display/action slots
- preview hints
- persistence version
- publication metadata for remote use

### Remote deployment requirements
Deployment must publish enough data for remote runtime to:
- load built-in widget registry metadata
- load published custom widget definitions
- render custom widgets from the same MUI widget runtime family
- resolve dynamic content through the data layer for the current route

## Acceptance criteria

1. Widget chooser is a tile/grid popup with icons and categories.
2. Widget configuration is clearly divided into content, display, behavior, and review.
3. The precedence model is visible and understandable.
4. Operators can configure dynamic content without reading raw binding internals.
5. Operators can create and reuse custom widgets.
6. Widget configuration and custom widgets persist to DB-backed records.
7. Remote deployment renders built-in and custom widgets consistently from the same contract family.
8. The flow feels suitable for real editorial page assembly, not just proof-of-concept detail pages.
