# Test Modules Remote Ops Step 4 Embedded Flows Plan

## Scope
- Continue from the committed remote-ops milestone:
  - `2a43114 feat: add remote ops gcp workflows`
- Embed the proven remote procedures into real module workflows without moving provider/runtime logic out of `test-modules-remote-ops`.
- Keep the remote-ops module as the owner of:
  - GCP connection profiles
  - target profiles
  - compatibility analysis
  - provisioning
  - compare / execute / restore runtimes

## Current State
- `test-modules-remote-ops` is now real for the supported scope:
  - service-account-key connection
  - compatibility analysis
  - provisioning for Firestore default database and storage buckets
  - live Firestore compare/execute
  - live deployment/media compare/execute/restore
- Real browser rehearsal already proved:
  - Firestore projection push
  - deployment bucket creation + sync
  - media bucket creation + sync
  - bounded media restore
- Existing product modules still depend on local-only deployment/media/content awareness:
  - `test-modules-pages` owns page deployment state and sync to local `deployment/`
  - `test-modules-content` exposes page/deployment impact, but not remote projection state
  - `test-modules-media-manager` owns local media files, but not remote media target state

## Goal
Make remote operations feel native inside the real authoring/publishing workflows:
- `Pages`
  - choose the active deployment/browser-delivery targets that matter to page flows
  - see remote deployment status next to local deployment status
  - compare and execute remote deployment intentionally from the page workflow
- `Content`
  - see whether published content is stale against the selected Firestore target
  - route directly into the relevant remote-ops procedure context
- `Media Manager`
  - see whether local media is stale against the selected media target
  - compare / execute / restore in bounded scope from the media workflow

## Boundary Rules
- No new shared/core provider layer.
- No duplication of compare/execute logic in `Pages`, `Content`, or `Media Manager`.
- Embedded modules may:
  - select or reference remote target profiles
  - read run/compare summaries exposed by remote-ops
  - trigger module-owned remote-ops routes/procedures
- Embedded modules must not own:
  - raw service-account credential handling
  - GCP API calls
  - provisioning models
  - storage / Firestore compare algorithms

## Product Intent
- Remote procedures should become part of the real workflow, not a detached kitchensink-only capability.
- The operator should understand:
  - local state
  - remote state
  - drift
  - next action
without leaving the relevant module unless deeper remote inspection is required.

## Planned Embedded Surfaces

### 1. Pages
- Add module-settings awareness for:
  - active deployment remote target profile
  - active browser-delivery target profile
- In the page workflow:
  - show remote deployment status beside local deployment status
  - allow compare / execute against the selected deployment target
  - show latest remote run summary
  - route into `Remote Ops` when deeper target/config work is required
- Out for this slice:
  - browser-delivery execute/provision, since that runtime is still validation-only

### 2. Content
- Add a compact projection-impact panel for published content:
  - selected Firestore target
  - drift / clean / not-configured state
  - route to remote compare/execute
- Keep projection preparation inside the existing content/pages publication model.

### 3. Media Manager
- Add a remote media panel:
  - selected media target
  - current compare summary
  - compare / execute / restore actions
  - route to `Remote Ops` for target/config details
- Keep file operations local-first; remote sync remains operator-triggered.

## Implementation Slices

### Slice A - Shared integration contract
- Add one module-local remote-ops integration helper surface:
  - read connection/target profiles
  - load latest compare/run summaries
  - trigger target compare/execute/restore routes
- Keep this inside `test-modules-remote-ops/frontend` and `test-modules-remote-ops/server` if server helper routes are needed.

### Slice B - Pages embedding
- Add deployment target selection to Pages settings/desk workflow.
- Surface remote deployment panel in the Pages custom view.
- Support:
  - compare remote deployment
  - execute remote deployment sync
  - view last run / last compare state
  - route to remote-ops target context

### Slice C - Content embedding
- Add Firestore projection awareness for published posts.
- Surface:
  - selected Firestore target
  - stale/clean/not-configured state
  - entrypoint into compare/execute

### Slice D - Media Manager embedding
- Add media target selection and remote panel.
- Support:
  - compare
  - execute sync
  - restore bounded remote-only file(s)

### Slice E - Verification
- Targeted frontend integration for:
  - pages remote deployment surface
  - content projection surface
  - media remote sync surface
- Targeted server/runtime checks if new bridging routes are added
- Full gate before declaring the slice done

## Review Success Criteria
1. `Pages` shows remote deployment state using a selected remote target.
2. `Pages` can trigger compare/execute for remote deployment from its own workflow.
3. `Content` shows published-content projection staleness against a selected Firestore target.
4. `Media Manager` shows remote media state and can trigger compare/execute/restore.
5. All GCP/provider logic remains owned by `test-modules-remote-ops`.
6. The operator can still route into `Remote Ops` for deeper diagnostics instead of losing access to the dedicated desk.

## Open Constraint
- Browser-delivery remains validation-only.
- Step 4 must not pretend to fully embed CDN/domain execution before that runtime exists.

## Execution Status - 2026-03-12
- Started after commit/push of the remote-ops milestone.
- First task in progress:
  - map the cleanest integration seams in `Pages`, `Content`, and `Media Manager`

## Execution Status - 2026-03-12 Step 4 Closed
- Completed the embedded-flow slice inside the intended module boundaries.
- Implemented module-local remote-ops frontend support in:
  - `modules/test-modules-remote-ops/frontend/useEmbeddedRemoteOpsSupport.js`
- Embedded remote procedures into:
  - `test-modules-pages`
    - deployment target selection
    - browser-delivery target selection
    - compare / execute / validate actions from the Pages desk
  - `test-modules-content`
    - Firestore projection target selection
    - compare / execute actions from the Content desk
  - `test-modules-media-manager`
    - media target selection
    - compare / execute / restore actions from the Media desk
- Route-aware `Remote Ops` target context is now reachable from each embedded surface.
- During closure, fixed two verification-shape issues that mattered to repo contracts:
  - moved the new Pages embedded-remote test into its own file to restore the 600-line LOC contract
  - updated `server/test/core/reference-slice.runtime-discovery.core.test.js` so runtime module-settings ownership matches the new `Content` and `Media Manager` settings capability
- Final verification:
  - focused embedded frontend integration slice passed
  - `pnpm quality:gate:full` passed
- Current state:
  - Step 4 is complete in the worktree
  - browser-delivery remains validation-only by design
  - app pair is not intentionally running
  - next action is commit/push or live review
