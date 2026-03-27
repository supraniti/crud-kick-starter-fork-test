# Page Studio Quality Recovery Pass

Date: 2026-03-27
Status: Executed
Intent authority:
- [intent-file.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/intent-file.md)
- [page-studio-mui-parity-execution-plan-2026-03-27.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/page-studio-mui-parity-execution-plan-2026-03-27.md)

## Why This Pass Happened

This pass started from explicit product rejection:
- the canvas still looked like a rounded card instead of a truthful page boundary
- preview was hard to inspect and easy to misread as broken or unscrollable
- preview layout did not match the authored layout strongly enough
- images and other widgets could overflow their assigned block area and visually destroy the page rhythm

The working rule for this pass was:
- inspect the live screen first
- take screenshots
- investigate what the screenshots are actually proving
- only then change the code

## Browser Investigation Path

### 1. Preview route before changes
Route reviewed:
- `http://localhost:3000/app/page-studio?studioMode=preview`

Artifact:
- [page-studio-preview-before-fix.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-preview-before-fix.png)

What the screenshot proved:
- the preview page was nested inside too many shell surfaces
- the page boundary looked rounded and decorative rather than literal
- a mobile viewport was being shown while the studio still rendered the desktop breakpoint
- the title and image were fighting each other because the media widget was sizing itself from aspect ratio instead of the block height contract

### 2. Layout route before changes
Route reviewed:
- `http://localhost:3000/app/page-studio?studioMode=layout`

Artifact:
- [page-studio-layout-before-fix.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-layout-before-fix.png)

What the screenshot proved:
- the authoring surface still had too much shell chrome relative to the actual page
- the square page illusion was lost inside rounded and cushioned framing
- old default story-stack geometry was still too shallow for real post content, especially on mobile

### 3. DOM/runtime inspection during preview
What I inspected directly:
- nested scroll containers
- preview local-storage document
- runtime geometry
- image/content overflow behavior

What that inspection proved:
1. The preview was still using an old seed draft from local storage.
2. The draft had `activeBreakpoint = desktop` while the operator had switched the viewport preset to mobile.
3. The media widget still rendered by width-driven aspect ratio, so it ignored the fixed block height.
4. The page itself had inner scrolling, but the overflowing widgets were visually escaping their blocks, which made the screen look like it could not scroll correctly.

## Main Decisions

### 1. Make the page boundary literal
The editor canvas must stop presenting the page like a rounded product card.

Implemented:
- square page edge
- lighter border/shadow treatment
- explicit vertical page scrolling inside the page boundary

### 2. Stop preview from lying about breakpoint vs viewport
When the operator clicks a viewport preset such as `Mobile 390`, the studio now also changes the active breakpoint to the matching authored layout.

Implemented on:
- `Layout`
- `Widgets`
- `Preview`

### 3. Make default story scenarios realistic enough for real content
The original default story-stack geometry was too shallow and made normal story content look broken.

Implemented:
- larger default story-stack heights on desktop and mobile
- larger default story-sidebar mobile heights
- migration for old default story-stack drafts that still carried the too-small geometry

### 4. Make preview inspectable, not just renderable
A scaled nested page is awkward to inspect by wheel input alone.

Implemented:
- explicit `Page scroll` controls in Preview
- `Top`
- `Mid`
- `Bottom`
- slider for scroll position

### 5. Make widgets respect their assigned block
The clearest offender was the media widget.

Implemented:
- image widget now fills the assigned block height instead of creating its own aspect-ratio box larger than the block
- runtime blocks now manage their own overflow instead of letting content visually spill across neighbors
- author/related surfaces were tightened for constrained block space

## Screenshots Captured During The Pass

### Authoring stages
- [page-studio-layout-story-stack-mobile-final.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-layout-story-stack-mobile-final.png)
  - story-stack mobile geometry after scenario and geometry corrections
- [page-studio-layout-story-sidebar-desktop-final.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-layout-story-sidebar-desktop-final.png)
  - story-sidebar desktop scenario after applying a real editorial split
- [page-studio-widgets-story-sidebar-final.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-widgets-story-sidebar-final.png)
  - widgets mode showing the empty block frames for the story-sidebar scenario
- [page-studio-widget-picker-final.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-widget-picker-final.png)
  - widget-library popup, proving the authoring path from block to widget

### Preview stages
- [page-studio-preview-before-fix.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-preview-before-fix.png)
  - rejected state used as the baseline for comparison
- [page-studio-preview-after-fix-desktop.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-preview-after-fix-desktop.png)
  - corrected desktop preview with the page boundary rendered more truthfully
- [page-studio-preview-after-fix-mobile.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-preview-after-fix-mobile.png)
  - corrected mobile preview with the mobile breakpoint actually selected
- [page-studio-preview-after-fix-mobile-bottom.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/.codex-runtime/page-studio-preview-after-fix-mobile-bottom.png)
  - lower-page inspection using the new preview scroll controls

## What Changed In Code

Main files:
- [LayoutBuilderCanvasShell.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvasShell.jsx)
- [PageStudioPreviewMode.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/frontend/PageStudioPreviewMode.jsx)
- [PageStudioLayoutMode.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/frontend/PageStudioLayoutMode.jsx)
- [PageStudioWidgetsMode.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/frontend/PageStudioWidgetsMode.jsx)
- [PageStudioView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/frontend/PageStudioView.jsx)
- [page-studio-layout-scenarios.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-page-studio/shared/page-studio-layout-scenarios.mjs)

## What Went Well In This Pass

1. Screenshot-led review immediately exposed problems that sounded subjective in chat but were structurally real in the UI.
2. The shared canvas shell was the right leverage point for fixing the misleading rounded-page presentation.
3. The scenario-first layout model was strong enough to absorb more realistic content heights without changing the overall authoring contract.
4. Adding explicit preview-scroll controls turned an ambiguous interaction problem into an inspectable product feature.

## What Is Better Now

1. The page boundary reads as a page, not a rounded card.
2. Mobile preview now really uses the mobile authored layout when the operator chooses the mobile preset.
3. The default story scenarios can hold real post content more honestly.
4. The preview can be inspected from top to bottom without fighting nested scroll containers.
5. Media no longer bursts outside its assigned block just because its width implied a taller aspect box.

## What Is Still Below The Bar

1. `Preview === Live` is still not fully true end to end.
- Local preview is now much closer to the intent.
- The deployed reader still needs to migrate onto this same MUI runtime path.

2. Widget authoring is still popup-heavy.
- It is usable now.
- It is not yet as fluid or as obvious as the intent requires.

3. Preview still exposes shell chrome before the page.
- It is leaner than before.
- It is not yet the most production-like page-inspection surface we can deliver.

4. Frontend bundle size is growing.
- `vite build` still warns about large chunks.
- This is not a blocker for the pass, but it is a real future pressure point.

## Validation Counted

- `pnpm --filter frontend build`
- `pnpm --filter frontend test -- src/tests/core/page-studio-document.core.test.jsx src/tests/core/page-studio-layout-transform.core.test.jsx src/tests/core/page-studio-layout-editing.core.test.jsx src/tests/core/page-studio-preview-data.core.test.jsx src/tests/core/view-registry.descriptor.core.test.jsx`
- `pnpm quality:protocol`
- `pnpm review:env:verify`

## Conclusion

This pass materially improved the Page Studio route by removing misleading page framing, correcting breakpoint/view behavior, making default editorial scenarios more realistic, and making preview inspectable from top to bottom.

It is a strong recovery pass.
It is not the end of the Page Studio program.
The remaining hard boundary is still the same one stated in the intent:
- the deployed live reader must move onto the same MUI runtime so preview and live stop being two different systems.
