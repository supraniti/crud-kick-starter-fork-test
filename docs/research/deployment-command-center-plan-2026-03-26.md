# Deployment Command Center Plan

## Goal
Deliver one global sync surface and clear item-level local/synced posture without replacing the current release system.

## Pass 1: Shared State And Docs
- Save the ticket and this plan.
- Add a lean frontend command-center support layer that loads:
  - deployment bundles
  - bundle runs
  - published pages
- Add sequential bundle execution helpers for:
  - `Sync All`
  - `Sync Bundle`
- Normalize per-bundle progress and failure state.

## Pass 2: Global Shell FAB
- Mount a fixed bottom-right FAB in the authenticated app shell.
- Add menu actions:
  - `Sync All`
  - one per bundle title
- Add progress dialog/drawer with:
  - current label
  - overall progress
  - per-bundle outcomes
  - failure clue
  - `Open Deployments`
- Make sure the FAB is visible outside the Deployments route too.

## Pass 3: Shared Sync Posture Primitive
- Add a reusable sync-posture chip component in shared UI.
- Add a tiny resolver utility where needed so desks can map their native state into:
  - `Local Only`
  - `Needs Sync`
  - `Synced`
  - bounded special cases only when necessary

## Pass 4: Desk Integration
### Posts
- Reuse existing deployment state and map labels to the standardized chip.

### Media
- Reuse existing remote sync state and standardize presentation wording where needed.

### Pages
- Reuse existing output posture and standardize presentation wording where needed.

### Layouts
- Add a derived layout deployment posture helper using linked pages plus timestamps.
- Surface posture in the saved-layout list and/or header.

### Taxonomies
- Add a taxonomy projection posture helper using latest projection runs and item timestamps.
- Surface posture in category rows and tag rows.

### Translations
- Add translation deployment posture helper using latest successful `translations-projection` run.
- Surface posture in translation inventory rows.

## Pass 5: Validation
- Run targeted frontend/server validation.
- Start the review environment.
- Use Chrome DevTools to review:
  - FAB visibility on multiple routes
  - `Sync All` happy path
  - at least one failure/blocked path if reproducible
  - per-desk posture visibility and wording
- Refine any layout or state regressions found in the browser.

## Expected File Targets
- `docs/research/deployment-command-center-ticket-2026-03-26.md`
- `docs/research/deployment-command-center-plan-2026-03-26.md`
- `frontend/src/app/parts/04-app-shell-layout.jsx`
- new global command-center support/component files under `frontend/src/app/product-shell/`
- module desk files for Posts / Media / Pages / Layouts / Taxonomies / Translations

## Acceptance Check
- FAB always visible in authenticated shell
- command menu available from non-Deployments routes
- progress visible until finish/failure
- failures preserve server clue and suggest next route
- item-level posture visible and updated after sync
