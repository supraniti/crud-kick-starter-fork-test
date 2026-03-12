# Test Modules Remote Ops Step 1 Plan

## Scope
- Deliver Milestone 1 from `C:\Users\cmsin\OneDrive\שולחן העבודה\gcp-remote-operations-agent-ticket.md`
- Stop for approval after the kitchensink remote-ops surface is usable and verified

## Goal
Build a dedicated operator desk that proves the approved remote-ops product model:
- connect
- validate
- compare
- execute
- verify
- restore

without embedding the workflows into `Pages`, `Content`, or `Media Manager` yet.

## Working Assumptions
- Step 1 uses a simulated GCP adapter
- simulated remote state is stored locally and untracked
- the operator workflow and procedure semantics must still be real

## Planned Slices

### Slice A - Contract And Module Surface
- add `test-modules-remote-ops` module contract
- add module directory and manifest
- update delivery scope and active module discovery expectations
- update progress pointers

### Slice B - Data Model And Runtime Foundations
- declare:
  - `remote-connection-profiles`
  - `remote-target-profiles`
  - `remote-operation-runs`
- add collection handlers for:
  - ids
  - timestamps
  - normalized summaries
- add module-local simulated remote-state root helpers

### Slice C - Procedure Routes
- add module-owned routes for:
  - connection validation
  - target validation
  - compare
  - execute smoke flow
  - restore smoke flow
- record results in `remote-operation-runs`

### Slice D - Kitchensink UI
- MUI custom desk with:
  - connection profiles
  - target profiles
  - validation status
  - compare summary
  - execute/restore actions
  - run history
- clearly label simulated adapter boundaries

### Slice E - Verification And Milestone Checkpoint
- add focused tests
- exercise live UI flows
- update handoff with:
  - what is real
  - what is simulated
  - what remains for Step 2
- stop for approval

## Success Criteria For Milestone 1
1. The remote-ops module is discoverable and usable from the app shell.
2. A connection profile can be created and validated.
3. A target profile can be created for:
   - Firestore projection
   - deployment storage
   - media storage
4. Compare flows show planned creates/updates/deletes against simulated remote state.
5. Execute flows persist run history and update simulated remote state.
6. At least one restore flow works against simulated remote state.
7. The UX is coherent enough to review before Step 2 embedding begins.

## Explicit Deferred Work
- Pages integration
- Media Manager integration
- Content integration
- configuration/settings embedding outside the remote-ops desk
- real GCP auth and real cloud resource calls

## Checkpoint Status
- Status: completed in the working tree and fully verified on March 11, 2026
- Milestone decision: stop here for approval before Step 2 embedding work

## Delivered At This Checkpoint
- additive module `test-modules-remote-ops`
- collections:
  - `remote-connection-profiles`
  - `remote-target-profiles`
  - `remote-operation-runs`
- simulated operator procedures:
  - connect
  - validate
  - compare
  - execute
  - restore
- supported Step 1 target kinds:
  - Firestore projection
  - deployment storage
  - media storage
  - browser delivery validation
- kitchensink custom desk with:
  - connection profile management
  - target profile management
  - validation state
  - compare summary
  - execute/restore controls
  - run history
- active-module discovery, alias-map, and lane manifests updated for the new module
- focused server/frontend verification coverage added for remote-ops

## Verification At This Checkpoint
- `pnpm lint:function-shape`
- `pnpm --filter server test -- test/module-conformance/remote-ops.module-conformance.test.js`
- `pnpm --filter frontend test -- src/tests/app-integration/remote-ops.integration.test.jsx`
- `pnpm --filter server test -- test/core/reference-module-id-translation.core.test.js test/core/reference-slice.runtime-discovery.core.test.js`
- `pnpm quality:gate:full`
- `pnpm quality:protocol`

## Step 2 Starting Point
- Keep `test-modules-remote-ops` as the proving ground and supporting operator desk.
- Embed validated procedures into:
  - `Pages`
  - `Content`
  - `Media Manager`
  - configuration/settings flows
- Do not replace the explicit operator procedure model with hidden automatic sync.
