# Page Studio Professional Polish Pass

Date: `2026-03-28`

## Scope
- Follow-up polish after the first usable `Page Studio` slice.
- Focus on continuity, immersive behavior, real user flows, and screenshot-backed review.

## Evidence Reviewed
- `.codex-runtime/page-studio-layout-pre-polish-review.png`
- `.codex-runtime/page-studio-widgets-pre-polish-review.png`
- `.codex-runtime/page-studio-preview-pre-polish-review.png`
- `.codex-runtime/page-studio-iteration1-preview.png`
- `.codex-runtime/page-studio-iteration2-reload-clean.png`
- `.codex-runtime/page-studio-iteration2-loaded-clean.png`
- `.codex-runtime/page-studio-final-preview-switch.png`
- `.codex-runtime/page-studio-final-preview-loaded.png`

## What Was Actually Wrong
1. Mode switching still felt like routing, not like one studio changing state.
2. The immersive route still showed normal shell chrome before the view registry settled.
3. A second tab could drift stale because draft changes were only local to one studio instance.
4. Viewport and zoom continuity were weak because each stage owned its own canvas state.
5. Preview looked broken if reviewed too early, and that made it easy to misjudge whether the issue was rendering or just dataset hydration.

## Iteration 1
### Changes
- switched `Page Studio` mode changes to local studio state plus URL replacement, instead of treating each mode switch like a route navigation event
- kept visited stages mounted and cross-faded them
- added storage-event draft sync across tabs
- hid outer app chrome for the immersive `Page Studio` route
- added stable status chips in the studio header:
  - route path
  - breakpoint
  - scenario
  - widget count
  - client

### Result
- mode switches no longer trigger the same full-page churn feeling
- the studio keeps more continuity during state changes
- the outer shell no longer wastes space on this route

## Iteration 2
### Changes
- shared canvas state across `Layout`, `Widgets`, and `Preview`:
  - viewport
  - zoom level
  - fit/manual mode
- shared selected block continuity between `Layout` and `Widgets`
- normalized right-rail widths across the three modes
- suppressed false module-view fallback during immersive-route hydration by not rendering the active view surface until module loading finishes
- treated `/app/page-studio` as immersive from the requested route, not only after the view registration finishes loading

### Result
- canvas continuity improved materially
- reload now presents:
  - loading-only
  - then studio
  - not loading -> false fallback -> studio
- layout/widgets/preview now behave more like one working surface

## User Flows Reviewed
1. Hard reload on:
- `http://localhost:3000/app/page-studio?studioMode=widgets`

Observed:
- first paint: `Loading modules...`
- resolved paint: immersive `Page Studio`
- no normal shell chrome once the route is recognized

2. Mode switching on one studio instance:
- `Widgets -> Layout -> Preview`

Observed:
- same route family remained in context
- same breakpoint remained selected
- zoom stayed materially aligned after rail-width normalization
- selected block continuity held from `Widgets` to `Layout`

3. Preview hydration

Observed:
- preview did issue dataset fetches for:
  - posts
  - authors
  - categories
  - tags
  - media
  - themes
- preview reached a real rendered post after those requests settled

## Validation Counted
- `pnpm --filter frontend build`
- `pnpm --filter frontend test -- src/tests/app-integration/app-shell-layout.product-flow.integration.test.jsx src/tests/core/page-studio-document.core.test.jsx src/tests/core/page-studio-layout-transform.core.test.jsx src/tests/core/page-studio-layout-editing.core.test.jsx src/tests/core/page-studio-preview-data.core.test.jsx src/tests/core/view-registry.descriptor.core.test.jsx`
  - executed outside sandbox because of the known local Windows `spawn EPERM` boundary
- `pnpm quality:protocol`
- `pnpm review:env:verify`

## Remaining Truth
- `Page Studio` is significantly better than the prior pass.
- The overall program is still not complete until deployed live rendering uses this exact MUI runtime path end to end.
- That is outside this polish slice.
