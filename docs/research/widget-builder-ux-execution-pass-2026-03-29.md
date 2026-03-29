# Widget Builder UX Execution Pass - 2026-03-29

## Intent Authority
- `docs/research/widget-builder-ux-intent-file-2026-03-29.md`
- `docs/research/widget-builder-ux-evolution-plan-2026-03-29.md`

## Objective
Execute the approved widget-builder UX evolution plan until the system supports:
- a real widget library chooser in popup form
- understandable widget configuration flow
- explicit theme/default/widget precedence
- persisted reusable custom widgets
- shared runtime parity between app preview and deployed page rendering

## Implemented

### 1. Custom Widget Persistence
- Added DB-backed `page-custom-widgets` support in `test-modules-page-studio`.
- Introduced:
  - custom widget handler runtime
  - collection/runtime registration
  - persistence plugins
  - custom widget document schema
  - composition helpers
  - custom widget library helpers

### 2. Widget Library UX
- Reworked the shared widget schema to carry library-facing metadata:
  - `icon`
  - `libraryCategory`
  - `useCase`
  - `complexity`
  - `keywords`
  - editor grouping/preference metadata
- Replaced the old flat chooser with a tile/grid library that supports:
  - search
  - categories
  - built-in editorial widgets
  - saved custom widgets
  - widget templates

### 3. Widget Configuration UX
- Reworked the shared widget inspector into staged tabs:
  - `Overview`
  - `Content`
  - `Display`
  - `Behavior`
  - `Review`
- Kept the hierarchy explicit:
  - theme baseline
  - widget defaults
  - per-instance overrides
- Preserved bounded actions for widgets like buttons/navigation affordances.

### 4. Page Studio Custom Widget Authoring
- Added `Save Canvas As Custom Widget`.
- Selecting a saved custom widget now creates a `custom-widget` runtime instance with persisted identity props.
- Per-widget save remains supported as template mode for legacy/simple reuse.

### 5. Legacy Layouts Support
- Legacy `Layouts` route now loads the shared custom widget library and exposes it in the block edit dialog.
- Result: saved custom widgets are reusable outside Page Studio as required.

### 6. Preview/Live Runtime Support
- Local Preview/runtime now recursively renders custom widget compositions.
- Deployed MUI reader now receives `customWidgetsById` and can render the same compositions remotely.
- Compatibility validation now resolves referenced custom widgets correctly during page save/release.

## Live Blocker Found During Execution
- The live journal route still fell back to the old reader path.
- Root cause:
  - standalone `page-mui-reader.global.js` crashed before bridge registration
  - browser error: `process is not defined`
- Fix:
  - added explicit production define in `frontend/scripts/build-page-mui-reader.mjs`

## Release / Proof
- Rebuilt:
  - `pnpm --filter frontend build`
- Reran release:
  - bundle `pagedepl-003`
  - run `pagedepl-182`

## Proof Results

### Local Page Studio
- Script: `.codex-runtime/page-studio-custom-widget-proof.cjs`
- Result:
  - `CUSTOM_WIDGET_PRESENT 1`
- Meaning:
  - the saved custom widget composition rendered inside Page Studio Preview

### Legacy Layouts
- Script: `.codex-runtime/layouts-custom-widget-selection-proof.cjs`
- Result:
  - `MATCH_COUNT 4`
- Meaning:
  - custom widgets/templates are visible and selectable in the shared popup

### Live Remote
- Script: `.codex-runtime/inspect-live-journal-custom-widget-proof.cjs`
- Route:
  - `https://fastcart.dev/journal/first-cup-on-the-table?cb=custom-widget-proof-20260329b`
- Result:
  - unsupported-widget warning no longer present
  - duplicated story/author structure visible on the live page
- Screenshot:
  - `.codex-runtime/live-journal-custom-widget-proof.png`

## Validation
- `pnpm --filter frontend build`
- `frontend\\node_modules\\.bin\\vitest.CMD run frontend/src/tests/core/page-studio-custom-widget-document.core.test.jsx`
- `server\\node_modules\\.bin\\vitest.CMD run server/test/core/page-studio-custom-widget-document.core.test.js server/test/core/page-widget-render-contract.custom-widget.core.test.js`
- `pnpm --filter server exec vitest run test/module-conformance/blog-distribution.module-conformance.test.js`
- `pnpm quality:protocol`
- `pnpm review:env:verify`

## Truthful Conclusion
- The widget-builder UX evolution slice reached live custom-widget parity.
- Built-in and custom widgets now share the same authoring/runtime story across:
  - Page Studio
  - legacy Layouts
  - local Preview
  - deployed MUI reader
