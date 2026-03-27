# Page Studio Usability Replan Pass

Date: 2026-03-27
Status: Executed
Intent authority:
- [intent-file.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/intent-file.md)
- [page-studio-mui-parity-execution-plan-2026-03-27.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/page-studio-mui-parity-execution-plan-2026-03-27.md)

## Why This Pass Happened

The previous Page Studio slice was rejected on three concrete grounds:
1. layout and widget surfaces still looked rounded and decorative instead of literal page rectangles
2. preview was technically rendering, but not in a usable way because too much chrome sat above it and some drafts still opened with no widget assignments at all
3. the product still looked like it had been judged by code structure instead of by the actual screen

This pass was run from screenshots and browser state first, then code.

## What I Reviewed Before Changing Code

### 1. Existing screenshots
I re-opened and inspected:
- [page-studio-layout-story-sidebar-desktop-final.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-layout-story-sidebar-desktop-final.png)
- [page-studio-widgets-story-sidebar-final.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-widgets-story-sidebar-final.png)
- [page-studio-preview-after-fix-desktop.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-preview-after-fix-desktop.png)
- [page-studio-preview-after-fix-mobile.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-preview-after-fix-mobile.png)

What they proved:
- too much vertical chrome above the canvas
- the builder was still shaped like stacked panels, not a studio
- widgetless scenario drafts made preview look broken even when preview code itself worked
- layout and widget frames were still too rounded

### 2. Live routes
Reviewed in Chrome DevTools:
- `http://localhost:3000/app/page-studio?studioMode=layout`
- `http://localhost:3000/app/page-studio?studioMode=widgets`
- `http://localhost:3000/app/page-studio?studioMode=preview`

What the live routes proved:
- `Story + Sidebar` could open with zero widget assignments, so Preview showed only empty block warnings
- the right rail only appeared on very wide screens because the shell switched to two-column mode too late
- auto-fit zoom was too conservative, making the page much smaller than necessary on a normal desktop

## Decisions

### 1. Move to canvas + rail, not stacked top panels
For Layout, Widgets, and Preview, the canvas now stays on the left and the controls live in a compact right rail.

### 2. Seed real starter widgets for real scenarios
`Story Stack` and `Story + Sidebar` now carry recommended widget packs so a fresh or migrated draft does not open into a blank preview.

### 3. Remove rounded block framing from Page Studio authoring surfaces
The canvas block surfaces and Gridstack item shells are now rectangular.

### 4. Make two-column mode available on a normal desktop
The rail now appears from `lg`, not only from `xl`.

### 5. Make fit zoom less timid
Fit calculations and canvas padding were reduced so the page fills the available screen more honestly.

## Main Code Changes

Main files:
- [PageStudioView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/frontend/PageStudioView.jsx)
- [PageStudioLayoutMode.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/frontend/PageStudioLayoutMode.jsx)
- [PageStudioWidgetsMode.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/frontend/PageStudioWidgetsMode.jsx)
- [PageStudioPreviewMode.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/frontend/PageStudioPreviewMode.jsx)
- [page-studio-widget-seeds.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/shared/page-studio-widget-seeds.mjs)
- [page-studio-layout-mode.css](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/frontend/page-studio-layout-mode.css)
- [LayoutBuilderCanvasShell.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvasShell.jsx)
- [LayoutBuilderCanvasPrimitives.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvasPrimitives.jsx)

## Browser Walkthrough After The Rewrite

### 1. Layout mode
Route:
- `http://localhost:3000/app/page-studio?studioMode=layout`

What I verified:
- the right rail is visible on a normal desktop width
- blocks render as rectangular layout geometry, not rounded cards
- `Story + Sidebar` still loads as the active scenario
- the canvas now occupies the dominant portion of the route

Artifacts:
- [page-studio-layout-final-review.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-layout-final-review.png)

### 2. Widgets mode
Route:
- `http://localhost:3000/app/page-studio?studioMode=widgets`

What I verified:
- the current scenario opened with assigned widgets instead of empty blocks
- the rail shows usable state immediately:
  - assignment count
  - breakpoint picker
  - starter-widget action
  - block list
  - selected-block actions
- widget frames are rectangular and readable

Artifacts:
- [page-studio-widgets-replan-pass-2.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-widgets-replan-pass-2.png)

### 3. Preview mode on desktop
Route:
- `http://localhost:3000/app/page-studio?studioMode=preview`

What I verified:
- preview shows real rendered content, not empty fallback blocks
- the right rail shows route and preview inputs without pushing preview below the fold
- the page is materially larger and readable on a normal desktop

Artifacts:
- [page-studio-preview-replan-pass-2.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-preview-replan-pass-2.png)

### 4. Preview mode on mobile and bottom scroll
What I did:
- switched Preview to `Mobile 390`
- used the `Bottom` page-scroll action

What I verified:
- breakpoint switched correctly to the mobile authored layout
- inner page scroll moved to the lower part of the page
- the right rail stayed usable while the preview remained visible

Artifacts:
- [page-studio-preview-mobile-bottom-final.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-preview-mobile-bottom-final.png)

### 5. Reset Draft recovery path
What I did:
- clicked `Reset Draft` from Preview

What I verified:
- the draft reset back to a usable story configuration
- the preview stayed populated with real content
- the route did not fall back to empty geometry

Artifact:
- [page-studio-preview-reset-draft-proof.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-preview-reset-draft-proof.png)

## What Improved

1. Layout, Widgets, and Preview now read like one studio instead of stacked forms.
2. Preview is visible and useful immediately on the reviewed route.
3. The right rail appears at realistic desktop sizes.
4. Scenario drafts no longer look broken simply because no starter widgets were applied.
5. Rectangular layout/widget framing now matches the user's stated expectation.

## What Is Still Outside This Pass

1. The global app shell header still consumes some height above the studio.
2. `Preview === Live` end-to-end still depends on the separate deployed-reader migration already tracked in the broader Page Studio program.
3. Theme-driven runtime widgets may still use rounded cards if the chosen theme says so. This pass corrected the studio authoring surfaces, not the theme system itself.

## Validation Counted

- `pnpm --filter frontend build`
- `pnpm --filter frontend test -- src/tests/core/page-studio-document.core.test.jsx src/tests/core/page-studio-layout-transform.core.test.jsx src/tests/core/page-studio-layout-editing.core.test.jsx src/tests/core/page-studio-preview-data.core.test.jsx src/tests/core/view-registry.descriptor.core.test.jsx`
- `pnpm quality:protocol`
- `pnpm review:env:verify`

## Conclusion

This pass corrected the concrete failures that made Page Studio feel unusable:
- the canvas now dominates
- the rails are visible and compact
- starter scenarios are no longer widgetless
- preview is visible and scrollable
- the main authoring surfaces are rectangular

This is a substantial usability recovery, driven from actual screenshots and browser review rather than from code assumptions.
