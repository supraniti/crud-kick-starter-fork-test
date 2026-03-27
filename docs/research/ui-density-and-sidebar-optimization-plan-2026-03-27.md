# UI Density And Sidebar Optimization Plan

## Goal

Make the application feel cleaner, leaner, and more space-efficient without harming readability or discoverability.

Two user-facing outcomes are required:

1. The sidebar becomes narrower and can collapse from `icon + text` into `icon only`, with clear tooltip support.
2. The application adopts a consistently compact visual density so work surfaces waste less space.

## Current Findings

### Shell

- The main shell layout lives in:
  - `frontend/src/app/parts/04-app-shell-layout.jsx`
- The sidebar component lives in:
  - `frontend/src/ui/ShellViews.jsx`
- The sidebar is currently fixed at `240px`.
- It renders text-first buttons with no compact/collapsed mode.
- The shell header and shell content areas use generous padding.

### Density

- There is no obvious global MUI `ThemeProvider` density layer currently governing component defaults.
- Many components already use `size="small"`, but the app still feels large because:
  - panel paddings are roomy
  - header spacing is roomy
  - buttons and cards are inconsistent
  - tables and control bars still carry large gaps
- The real issue is not just control size. It is accumulated spacing and shell proportions.

## Design Direction

### Sidebar

Introduce a two-state sidebar:

- `expanded`
  - narrow but readable
  - icon + label
- `collapsed`
  - icon only
  - label exposed through tooltip

Target behavior:

- desktop:
  - persistent sidebar with collapse toggle
- smaller widths:
  - default to collapsed if needed
- state should persist locally so the app remembers the user preference

### Density

Apply a shell-level compact density system instead of trying to manually shrink every screen independently.

That means:

- default smaller MUI control sizes
- tighter default spacing in common shell primitives
- smaller card/paper padding in shared surfaces
- tighter table row density where already used as backlog/queue/roster surfaces

The rule is:

- shrink structure first
- shrink controls second
- keep writing areas and critical editors readable

## Scope

### In scope

- app shell sidebar width and collapsed mode
- shell header spacing
- shell content padding
- shared compact theme/defaultProps layer
- high-traffic shared surfaces:
  - buttons
  - chips
  - text fields
  - selects
  - tabs
  - tables
  - dialog chrome
  - papers/cards used as framing containers
- focused cleanup on the busiest desks if global compacting still leaves obvious waste:
  - Posts
  - Pages
  - Media
  - Taxonomies
  - Deployments

### Out of scope

- redesigning workflows
- changing information architecture
- changing widget/layout feature behavior
- aggressive visual restyling

## Implementation Strategy

### Pass 1: Compact Theme Infrastructure

Create a shell-level MUI theme layer with compact defaults.

Add or wire:

- `ThemeProvider`
- compact component defaults for:
  - `MuiButton`
  - `MuiIconButton`
  - `MuiTextField`
  - `MuiFormControl`
  - `MuiSelect`
  - `MuiChip`
  - `MuiTabs`
  - `MuiTab`
  - `MuiTable`
  - `MuiTableCell`
  - `MuiDialog`
  - `MuiPaper`
  - `MuiCard`

Expected effect:

- a large part of the app gets smaller without per-screen rewrites

### Pass 2: Sidebar Collapse

Refactor `ModuleSidebar` in `frontend/src/ui/ShellViews.jsx`.

Add:

- `expandedWidth`
- `collapsedWidth`
- local persisted collapse state
- collapse toggle control
- icon-only rendering in collapsed mode
- tooltips for every module item in collapsed mode
- stage labels hidden or simplified in collapsed mode

Adjust shell layout in:

- `frontend/src/app/parts/04-app-shell-layout.jsx`

Expected effect:

- more horizontal workspace
- faster scanning
- less visual heaviness

### Pass 3: Shell Chrome Tightening

Tighten:

- header paddings
- content paddings
- quick action panel spacing
- deploy/status utility spacing

Expected effect:

- more usable vertical space before touching desk-specific internals

### Pass 4: High-Traffic Surface Audit

Review the main routes and reduce obvious spacing waste where global defaults are not enough.

Priority surfaces:

- Posts
- Pages
- Media
- Taxonomies
- Deployments

Typical changes:

- reduce `Paper`/`Card` padding
- tighten filter bars
- tighten chip groups
- reduce toolbar height
- tighten drawer headers and tab bars

### Pass 5: Responsive Check

Verify:

- collapsed sidebar behavior on narrower widths
- no label clipping in compact controls
- no unusable dense text in authoring drawers

## Acceptance Criteria

The slice is complete when all of the following are true:

1. The sidebar can switch between:
   - icon + text
   - icon only
2. In collapsed mode:
   - every item still communicates via tooltip
   - active state is still obvious
3. The application shell visibly uses less horizontal and vertical space.
4. Common controls render in compact mode by default.
5. Tables, drawers, and filter bars on major routes feel denser without becoming hard to use.
6. No major route becomes clipped, broken, or unreadable.

## Risks

### Risk: Global density makes editors too cramped

Mitigation:

- keep textareas/editors and large composition surfaces explicitly roomier where needed

### Risk: Collapsed sidebar hides workflow meaning

Mitigation:

- preserve strong active state
- use tooltips
- keep a clear collapse toggle

### Risk: Global MUI overrides create regressions

Mitigation:

- introduce the theme layer first
- then patch only the screens that need exceptions

## File Targets

Primary:

- `frontend/src/app/parts/04-app-shell-layout.jsx`
- `frontend/src/ui/ShellViews.jsx`

Likely shell/theme wiring targets:

- app root / shell bootstrap file that can host `ThemeProvider`

Likely audit targets:

- `frontend/src/app/product-shell/*`
- `modules/test-modules-pages/frontend/*`
- `modules/test-modules-content/frontend/*`
- `modules/test-modules-media-manager/frontend/*`
- `modules/test-modules-taxonomy/frontend/*`

## Execution Order

1. introduce compact theme layer
2. implement sidebar collapse
3. tighten shell chrome
4. audit high-traffic desks
5. validate desktop + narrower widths

## Definition Of Done

This mission is done when the app feels materially lighter at first glance, gains horizontal space through a collapsible sidebar, and no longer looks oversized by default across the main working routes.
