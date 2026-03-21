# Media Story Implementation Plan

## Goal

Turn the current Media desk from a capable operations surface into a clearer visual library that:

- feels like the main place to work with assets
- keeps upload and metadata editing immediate
- shows where an asset is used across the product
- keeps publish and sync state visible without making remote controls the main experience
- preserves the current working media routes and remote sync behavior

## Current Gaps

- The desk is already visual, but it still reads like a stack of tool panels.
- The active asset is not part of the URL.
- Sort and detail-tab state are not part of the URL.
- The screen does not answer the key question: where is this asset used?
- The right bench is split into technical tabs instead of a clearer user-facing flow.
- The library cards do not surface usage or content-readiness strongly enough.

## First Pass Outcome

The first pass delivered:

- route-backed library state
- usage awareness across the CMS
- a clearer `Preview / Details / Usage / Publish` structure
- an upload tile inside the gallery

But review found real product gaps:

- remote sync actions are not giving strong visible success/failure feedback
- the image-derivation workflow was buried and therefore feels removed
- filter controls are too narrow for comfortable use
- gallery and editor on the same canvas still feel cramped
- large-library browsing needs a table/list option
- the desk still reads as one long stacked workspace instead of a tighter asset workflow

So this plan now becomes a multi-pass Media convergence plan, not a single-pass finish.

## Revised Priorities

### 1. Restore confidence in remote publish actions

The desk must make sync execution obvious:

- remote compare/sync/restore must surface visible pending, success, and error state
- the operator should not need to infer whether anything happened
- the publish area should show the last meaningful result near the action that caused it

### 2. Bring back asset-processing as a first-class capability

The media-processing workflow was not removed from the repo, but it was demoted too far into `Details`.

The next pass should restore it as an explicit asset action:

- show available derivation actions clearly
- keep the current mission infrastructure
- leave room for more presets later
- show derived outputs and job state in a way that feels like part of the library workflow

### 3. Split browsing from editing

The desk should stop asking the user to scan a gallery and edit metadata in the same cramped column flow.

The likely direction is:

- library browsing as the primary surface
- asset editor in a drawer/dialog/workbench that opens from selection
- the editor can still contain:
  - metadata
  - usage
  - publish
  - derivation actions

### 4. Support more than one library view

The library should support:

- gallery view for visual browsing
- table/list view for large libraries

Both views should preserve the same selection, filters, route state, and editor behavior.

### 5. Make filters readable and comfortable

The filter bar needs a stronger layout:

- wider selectors
- clearer labels
- enough width to understand each control at a glance
- better grouping between search, filters, and sort

## Next Pass

### Pass A. Remote feedback + filter ergonomics

- surface visible remote sync status and outcomes
- widen and regroup filters
- make publish actions easier to read

### Pass B. Editor split + derivation workflow

- move asset editing into a drawer/workbench
- restore derivation controls as obvious asset actions
- keep usage/publish inside that editor flow

### Pass C. Gallery/list dual view

- add gallery/list toggle
- build a large-library-friendly list/table presentation
- preserve shared route/selection state

## Completion State

The Media story implementation is now complete in the worktree for review.

Delivered:

- Pass A
  - visible remote sync readiness, processing, success, and error feedback
  - clearer filter layout and wording
- Pass B
  - editor moved into a persistent right-side asset drawer
  - variant generation restored as a first-class asset workflow
  - metadata, usage, and publish controls kept inside the asset editor
- Pass C
  - gallery view for visual browsing
  - list view for larger libraries
  - shared route state for:
    - selected asset
    - active editor tab
    - active library view
    - filters
    - sort

## Current Working Facts

- The derivation infrastructure still exists.
- The mission path still exists.
- The current repo still supports presets such as:
  - `thumbnail`
  - `web-optimized`
- What changed was UI emphasis, not backend removal.

## This Pass

### 1. Route-backed media desk state

Persist the working library state in the route:

- `search`
- `status`
- `category`
- `isDerived`
- `mediaSort`
- `mediaId`
- `mediaTab`

This keeps refresh and back/forward navigation aligned with the current library view.

### 2. Media usage awareness

Add a usage-awareness layer that reads:

- authors
- posts
- categories
- pages

and builds a media usage map so the selected asset can show:

- how many posts use it
- whether it is used by an author avatar
- whether it is used by category records
- whether it appears inside page records

### 3. Desk simplification

Keep the library/grid on the left and a workbench on the right, but reshape the right side into:

- `Preview`
- `Details`
- `Usage`
- `Publish`

This keeps the screen easier to reason about than the older technical tab list.

### 4. Library card improvements

Each media card should better answer:

- what is this
- is it synced
- is it used
- does it need attention

### 5. Upload flow visibility

Keep the existing upload button, and also place an upload tile inside the gallery so adding a new asset feels like part of the library itself.

## Exit Criteria

- `/app/media` shows a visual library with a built-in upload tile
- selected asset and active library controls survive refresh through the URL
- selected asset shows usage across the CMS
- usage rows are clickable and open the best matching desk route
- publish/sync controls remain available, but secondary
- focused media integration proof passes
- local review env shows the new desk live

## Non-Goals

- no remote architecture change
- no new server API
- no media binary storage change
- no commit before review
