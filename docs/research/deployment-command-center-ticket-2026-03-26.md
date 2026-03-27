# Deployment Command Center Ticket

## Title
Simplify release UX with a global deployment command center, item-level sync posture, visible progress, and actionable failure guidance.

## Problem
Deployments are operationally strong, but the product still asks the operator to think like a release engineer. Today the user must:
- inspect one desk to understand local content state
- inspect another desk to understand page/live state
- move to Deployments to choose a bundle
- understand target health and release readiness there
- manually map all of that back to the authored items they were editing

That is the wrong product burden. The system already has a bundle release pipeline and remote sync infrastructure. The gap is orchestration and visibility.

## Product Goal
Make deployment feel like one clear product action:
- every relevant authored item shows whether it is only local, needs sync, or is already synced
- one bottom-right FAB is available everywhere in the authenticated app
- the FAB can run a full sync or a bounded sync for one published surface/bundle
- progress is always visible while the sync is running
- failures explain what broke and where the user should go next

## User Outcomes
1. While editing a post, page, media item, layout, taxonomy item, or translation row, the operator can tell whether the local state is already reflected remotely.
2. The operator does not need to navigate to Deployments to perform the common release path.
3. If deployment fails, the operator gets a concrete clue, not just a failed button.
4. Advanced release debugging still exists on the Deployments page, but the common path is available globally.

## Scope
### In Scope
- Global deployment FAB in the authenticated shell, fixed to the bottom-right corner.
- FAB actions:
  - `Sync All`
  - one action per deployment bundle, using the bundle title as the operator-facing label
- Sequential orchestration of bundle release runs using the existing mission-backed release path.
- Progress surface with:
  - overall progress
  - active bundle label
  - per-bundle result rows
  - latest failure message when present
- Actionable error guidance with a route hint such as `Open Deployments` when the common flow cannot complete.
- Per-item sync posture on the main desks for at least:
  - Posts
  - Media
  - Pages
  - Layouts
  - Translations
  - Taxonomies
- Reuse of existing deployment/source-of-truth logic where available.

### Out Of Scope
- Replacing the existing Deployments page
- Replacing the existing bundle release pipeline
- New remote procedure types
- Background browser notifications outside the app shell
- A full queue/work manager beyond the current sequential release path

## Existing System Constraints
- The release pipeline already exists and must remain canonical.
- Release bundles already define what is published.
- Remote compare/execute/validate procedures already exist and must remain canonical.
- Some desks already expose partial sync state; this work should standardize language and visibility rather than invent parallel semantics.

## Required UX
### Global Command Center
- Always visible in the authenticated shell.
- Bottom-right FAB.
- Opens a compact action menu.
- Primary action is `Sync All`.
- Secondary actions are specific bundle sync actions, for example:
  - `Sync Post Release Bundle`
  - `Sync Journal Release Bundle`
  - `Sync Category Release Bundle`
- When a sync starts, the menu gives way to a visible progress surface.

### Progress Surface
Must show:
- current mode: `Sync All` or `Sync <bundle>`
- currently running bundle title
- completed bundle count / total bundle count
- progress bar
- per-bundle outcome rows
- last failure message when any bundle fails
- direct recovery action:
  - `Open Deployments`

### Error Handling
The command center must surface at least:
- release bundle invalid
- selected page no longer published
- missing/invalid target
- missing stored key / broken remote connection
- target procedure failure
- browser delivery validation failure

The error message must keep the original server clue when possible and add a next-step hint when the route is obvious.

### Item-Level Sync Posture
The operator should see one concise posture per relevant item:
- `Local Only`
- `Needs Sync`
- `Synced`
- bounded alternatives only where semantically necessary, for example:
  - `No Page`
  - `No Remote`
  - `Unused`

Rules:
- Do not expose raw remote-procedure jargon on the main desks.
- Prefer the product language the operator cares about.
- Use existing page/media/post logic when it is already correct.

## Data/State Rules By Desk
### Posts
- Published post + impacted page templates clean -> `Synced`
- Published post + missing/stale page outputs -> `Needs Sync`
- Not published -> `Local Only`
- Published but no page template -> `No Page`

### Media
- Existing remote media target + successful execute run newer than item update -> `Synced`
- changed after last successful execute -> `Needs Sync`
- no successful execute yet -> `Needs Sync`
- no validated media target -> `No Remote`

### Pages
- Current output posture already resolves this.
- `Live` maps to `Synced`
- non-live but publishable states map to `Needs Sync`
- draft/local states map to `Local Only`

### Layouts
- If no pages use the layout -> `Unused`
- If linked published pages are stale/missing, or the layout changed after the linked page last synced -> `Needs Sync`
- If linked published pages are in sync with the saved layout -> `Synced`
- Draft/new layout with no published dependents -> `Local Only`

### Translations
- A row with no translation -> authoring coverage state remains separate from deployment state
- A translation row with translated/stale/missing coverage must also show deployment posture:
  - no successful translations projection run -> `Needs Sync`
  - translated entry changed after last successful projection -> `Needs Sync`
  - translated entry unchanged since last successful projection -> `Synced`
  - no translated value for the selected locale -> `Local Only`

### Taxonomies
- Categories/tags with public visibility should show whether their projection is synced.
- branch-level publication cards remain, but rows/branch items should also expose local vs synced posture.

## Use Cases
1. Post editor publishes a post and wants one-click release.
2. Media manager uploads a fresh hero image and wants to know whether it is already live remotely.
3. Page designer updates a page or layout and needs a direct signal that live output is now stale.
4. Translator adds a locale value and wants to know whether the deployed site already has that locale overlay.
5. Operator returns after a failure and needs one visible place to resume or inspect the issue.

## Implementation Direction
- Build a lean global deployment command center on top of the existing bundle-release pipeline.
- Keep orchestration on the client side and execute bundles sequentially.
- Use existing backend routes and mission jobs; do not create a second release pathway.
- Create a shared UI primitive for sync posture chips so wording and tones stay consistent.
- Derive per-item state from the authoritative local records plus the latest successful run timestamps already tracked by the system.

## Acceptance Criteria
1. A bottom-right deployment FAB is visible from any authenticated route.
2. The FAB offers `Sync All` and one action per bundle title.
3. `Sync All` runs all bundles sequentially and shows progress until completion or failure.
4. On failure, the command center shows the failing bundle, the server message, and an `Open Deployments` recovery action.
5. Posts, Media, Pages, Layouts, Taxonomies, and Translations show a visible sync posture on their main desk surface.
6. The posture updates after a successful sync without requiring a full browser reload.
7. Existing Deployments page behavior still works.

## Review Routes
- `/app/posts`
- `/app/media`
- `/app/taxonomies`
- `/app/layouts`
- `/app/pages`
- `/app/translations`
- FAB visible from all of the above

## Risks
- Duplicating release state rules across desks if helpers are not centralized.
- Overloading the shell with the full Deployments workspace rather than a lean command-center state.
- Showing optimistic success before the bundle runs have actually reloaded.
- Translating low-level failures badly and hiding the useful server message.

## Recommended Guardrails
- keep bundle release execution canonical
- keep per-item state derivation pure and testable
- preserve original error messages and add guidance after them, not instead of them
- review the FAB and progress UI in the browser across multiple module routes
