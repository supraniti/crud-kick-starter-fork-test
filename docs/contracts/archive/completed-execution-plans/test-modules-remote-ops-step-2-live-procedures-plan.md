# Test Modules Remote Ops Step 2 Live Procedures Plan

## Scope
- Continue from the approved service-account Step 1 milestone.
- Deliver real operator-controlled live remote procedures for:
  - Firestore projection push/update
  - deployment storage sync
  - media storage sync
  - bounded restore/repair flows
- Keep the work module-local inside `test-modules-remote-ops` before embedding it elsewhere.

## Current State
- Real service-account connection works.
- Real project validation works.
- Real target validation works.
- Current live target failure inspection proved the runtime is wired:
  - connection `remoteco-012` validated successfully against project `merchant-guild`
  - target `remoteta-002` failed because the configured bucket `media-bucket` is missing or inaccessible to the service account
- Simulated compare / execute / restore already exist and provide:
  - run history
  - compare summaries
  - bounded restore semantics
- Live compare / execute / restore are now implemented for the approved scope:
  - Firestore projection:
    - compare
    - execute
  - deployment storage:
    - compare
    - execute
    - restore
  - media storage:
    - compare
    - execute
    - restore
- Browser-delivery targets remain validation-only.

## Goal
Deliver the first real operator-usable remote procedure milestone:
- compare local prepared state with live remote state
- show create / update / delete / restore counts before execution
- execute bounded remote pushes intentionally
- verify the result through updated compare summaries and run history

## Product Intent
- This is not hidden sync.
- This is not best-effort automation.
- The operator should be able to:
  - validate a real target
  - compare local and remote
  - understand the planned changes
  - execute intentionally
  - verify the new remote state

## Live Target Scope

### 1. Firestore projection
- Source:
  - locally prepared published projection data
- Compare:
  - local projected documents vs remote Firestore documents under the configured collection path
- Execute:
  - create missing documents
  - update changed documents
  - optionally delete remote-only documents when policy allows
- Verify:
  - fresh compare returns `clean`

### 2. Deployment storage
- Source:
  - local repo-root `deployment/`
- Compare:
  - local files vs remote bucket objects under configured prefix
- Execute:
  - upload missing files
  - overwrite changed files
  - optionally delete remote-only objects when policy allows
- Verify:
  - fresh compare returns `clean`

### 3. Media storage
- Source:
  - local repo-root `media/`
- Compare:
  - local files vs remote bucket objects under configured prefix
- Execute:
  - upload missing files
  - overwrite changed files
  - optionally delete remote-only objects when policy allows
- Verify:
  - fresh compare returns `clean`

### 4. Bounded restore / repair
- Scope in this milestone:
  - storage targets only
  - pull remote-only or changed objects back into local bounded paths
- Out for now:
  - Firestore pull-back into authoring collections

## Guardrails
- No raw service-account JSON in collections.
- Compare must run before execute when target policy requires it.
- Delete operations stay opt-in through policy and visible counts.
- Browser-delivery targets remain validation-only in this milestone.
- Firestore restore into local authoring state remains out of scope.

## Data And Runtime Shape

### Compare summary
- state:
  - `clean`
  - `drift`
  - `error`
- counts:
  - `createCount`
  - `updateCount`
  - `deleteCount`
  - `localOnlyCount`
  - `remoteOnlyCount`
- evidence:
  - sample keys / document paths / object names

### Operation runs
- must record real live procedures too:
  - `compare`
  - `execute`
  - `restore`
- summaries must reflect actual remote changes, not simulated placeholders

### Local preparation model
- Firestore projection should remain locally shaped before remote push.
- Deployment sync should mirror the existing `deployment/` folder.
- Media sync should mirror the existing `media/` folder.

## Planned Slices

### Slice A - Live adapter boundary
- keep simulated adapter for safe tests and non-live flows
- add live adapter procedures for:
  - Firestore compare / execute
  - storage compare / execute / restore

### Slice B - Firestore live compare and execute
- list remote documents under configured collection path
- normalize local projection documents into the same comparison shape
- execute create/update/delete operations intentionally
- keep delete optional by policy

### Slice C - Storage live compare and execute
- list remote objects under bucket + prefix
- compare against local file inventory for:
  - `deployment/`
  - `media/`
- execute upload/update/delete intentionally

### Slice D - Storage restore
- allow bounded pull from remote object target into local path root
- surface overwrite warnings clearly

### Slice E - UX hardening
- remove misleading placeholder defaults for live targets such as:
  - `deployment-bucket`
  - `media-bucket`
- show stronger config diagnostics:
  - missing real bucket
  - missing Firestore path
  - placeholder-looking configuration
- keep live-vs-simulated messaging explicit

### Slice F - Verification
- focused server conformance for live compare / execute / restore
- focused frontend integration for the real operator flows
- full repo gate

## Review Success Criteria
1. A validated live Firestore target can compare against real remote documents.
2. A validated live Firestore target can push creates/updates from the app.
3. A validated live storage target can compare against real remote bucket state.
4. A validated live storage target can upload/update files from the app.
5. A validated live storage target can perform at least one bounded restore/repair flow.
6. Run history and compare summaries reflect real remote work.
7. The operator can tell the difference between:
   - target misconfiguration
   - missing permission
   - real drift
   - clean state

## Known Risks
- Firestore document-shaping drift if the local prepared projection is not normalized before compare.
- Large storage targets may need sampling/summary limits in the UI to stay usable.
- Placeholder defaults currently make live targets look more configured than they are.

## Next Approval Boundary
- Live Firestore + storage compare/execute/restore are reviewable in `test-modules-remote-ops`.
- Stop for operator review before embedding these procedures into `Pages`, `Content`, and `Media Manager`.

## Execution Status - 2026-03-12
- Review-ready in the working tree.
- Delivered runtime files:
  - `modules/test-modules-remote-ops/server/remote-ops-live-google-runtime.mjs`
  - `modules/test-modules-remote-ops/server/remote-ops-live-firestore-runtime.mjs`
  - `modules/test-modules-remote-ops/server/remote-ops-live-storage-runtime.mjs`
  - `modules/test-modules-remote-ops/server/remote-ops-live-runtime.mjs`
  - `modules/test-modules-remote-ops/server/remote-ops-target-routes.mjs`
- Delivered UX adjustments:
  - live Firestore/storage targets now expose real compare/execute actions
  - live storage targets now expose restore
  - placeholder live defaults were tightened:
    - Firestore path defaults to `publishedPosts`
    - bucket/domain fields no longer pretend to be configured
- Important fix discovered during closure:
  - nested storage compares were not propagating the requested hash algorithm through recursive file collection
  - retained fix lives in `modules/test-modules-remote-ops/server/remote-ops-simulated-target-runtime.mjs`
- Focused verification completed:
  - `pnpm --filter server exec vitest run test/module-conformance/remote-ops.module-conformance.test.js`
    - passed
  - `pnpm --filter frontend exec vitest run src/tests/app-integration/remote-ops.integration.test.jsx`
    - passed
  - `pnpm lint:function-shape`
    - passed
  - `pnpm quality:protocol`
    - passed
- Repo-wide note:
  - `pnpm quality:gate:full` is not green at this checkpoint
  - current red lane is outside remote-ops:
    - frontend integration timeouts / harness issues in:
      - `src/tests/app-integration/app-shell-routing.actions.integration.test.jsx`
      - `src/tests/app-integration/blog-content.integration.test.jsx`
      - `src/tests/app-integration/blog-distribution.integration.test.jsx`
      - `src/tests/app-integration/layouts.integration.test.jsx`
      - `src/tests/app-integration/module-lifecycle-collection-availability.integration.test.jsx`
      - `src/tests/app-integration/products-taxonomies.integration.test.jsx`
