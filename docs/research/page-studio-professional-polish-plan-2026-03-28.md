# Page Studio Professional Polish Plan

Date: `2026-03-28`

## Goal
- Raise `Page Studio` from promising prototype behavior to a more professional authoring surface.
- Improve continuity, responsiveness, and user-flow quality without drifting from [intent-file.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/intent-file.md).

## Intent Check
- Keep the studio immersive and canvas-first.
- Keep the FAB as the state switcher.
- Make `Layout`, `Widgets`, and `Preview` feel like the same authored page changing mode, not three separate screens.
- Preserve the long-term `PREVIEW === LIVE` direction.

## Review Inputs
- Live browser route review:
  - `http://localhost:3000/app/page-studio?studioMode=layout`
  - `http://localhost:3000/app/page-studio?studioMode=widgets`
  - `http://localhost:3000/app/page-studio?studioMode=preview`
- Screenshot review:
  - `.codex-runtime/page-studio-layout-pre-polish-review.png`
  - `.codex-runtime/page-studio-widgets-pre-polish-review.png`
  - `.codex-runtime/page-studio-preview-pre-polish-review.png`

## Problems To Solve
1. Mode changes feel route-driven instead of studio-driven.
- The page feels like it rerenders and scrolls up.
- Context does not feel preserved strongly enough across `Layout`, `Widgets`, and `Preview`.

2. Immersive route still leaks outer shell chrome.
- The app header still steals vertical space.
- Hard reload exposes a temporary normal-shell/fallback experience before the immersive view settles.

3. Cross-tab behavior is misleading.
- A second `Page Studio` tab can drift stale if local draft updates happen elsewhere.

4. Canvas continuity is weak.
- Same breakpoint/page can appear to jump because stage-specific viewport/zoom state is not shared strongly enough.

5. Review quality needs to stay screenshot-driven.
- Every iteration must be checked in Chrome DevTools with real route switching and visible output.

## Iteration 1
- Remove route-churn feeling from mode switching.
- Keep stage surfaces mounted once visited.
- Cross-fade stage changes instead of hard replace.
- Hide outer app chrome on immersive `Page Studio`.
- Sync draft changes across tabs through storage events.

## Iteration 2
- Share canvas state across `Layout`, `Widgets`, and `Preview`:
  - viewport
  - zoom
  - fit/manual zoom mode
- Share selected block context between `Layout` and `Widgets`.
- Normalize right-rail widths so auto-fit behavior stays steadier between stages.
- Remove false route-fallback flash during immersive-route hydration.

## Review Flows
1. Hard reload `Layout`
- Expected:
  - immersive loading only
  - no normal app chrome
  - no false `Module view unavailable`

2. Switch `Widgets -> Layout -> Preview`
- Expected:
  - same route family remains in context
  - same breakpoint remains selected
  - zoom stays materially stable
  - selected block continuity holds where relevant

3. Preview route load
- Expected:
  - preview dataset requests complete
  - real post preview appears
  - no empty preview warning after data arrives

4. Cross-tab persistence
- Expected:
  - draft changes in one tab propagate to another tab without stale divergence

## Validation
- `pnpm --filter frontend build`
- focused frontend tests for:
  - app shell layout
  - Page Studio document/layout/preview contracts
- `pnpm quality:protocol`
- `pnpm review:env:verify`

## Acceptance Bar
- `Page Studio` feels like one studio with multiple modes, not route-jumps between separate screens.
- The immersive route does not leak normal shell chrome or false fallback surfaces.
- Preview remains reliable after real mode switching.
- Browser review and screenshots support the result, not just code reasoning.
