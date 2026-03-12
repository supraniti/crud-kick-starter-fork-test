# Test Modules Remote Ops Step 3 Unified Provisioning Plan

## Scope
- Continue inside `test-modules-remote-ops`.
- Deliver a single coherent remote-compatibility flow for GCP that can:
  - inspect existing remote state
  - detect missing services/resources
  - detect missing permissions
  - explain how to expand permissions
  - create missing supported resources
  - warn about possible cost
  - avoid duplicate/surplus resources
- Keep the work inside strict module-local boundaries unless a genuinely reusable primitive is proven necessary.

## Boundary Rule
- GCP/remote functionality must stay inside strict module-local boundaries for:
  - readability
  - maintainability
  - agentability
  - future enhancement safety
- This is a standing implementation rule, not a refactor request.

## Current State
- Service-account-key connection works.
- Live validation works.
- Live procedures now work for:
  - Firestore compare/execute
  - storage compare/execute/restore
- The app does not yet provide a unified compatibility/provisioning procedure.
- The operator still needs to know too much about:
  - what should already exist
  - what permissions are missing
  - which missing resources can be created by the app

## Desired Product Behavior
- The operator chooses a connection and target configuration.
- The app can answer:
  1. what exists remotely right now
  2. what is missing for our supported flows
  3. what permissions are missing
  4. which missing resources the app can create
  5. what the likely cost/safeguard warnings are
  6. whether the project already has enough and should not create anything else
- The operator should not need to reason about raw GCP topology before the app explains it.

## Supported Compatibility Domains

### Firestore Projection
- Inspect:
  - Firestore API enabled
  - default database exists
- Diagnose:
  - missing API enable permission
  - missing database create permission
  - missing document read/write/delete permissions
- Provision:
  - enable API
  - create default database if absent
- Maintain:
  - never create more than the required default Firestore database

### Deployment Storage
- Inspect:
  - bucket exists
  - prefix/object state
- Diagnose:
  - missing bucket create permission
  - missing object read/write/delete permissions
- Provision:
  - create deployment bucket if absent
- Maintain:
  - only the configured bucket/prefix needed for deployment artifacts

### Media Storage
- Inspect:
  - bucket exists
  - prefix/object state
- Diagnose:
  - missing bucket create permission
  - missing object read/write/delete permissions
- Provision:
  - create media bucket if absent
- Maintain:
  - only the configured bucket/prefix needed for media artifacts

### Browser Delivery
- Inspect:
  - DNS zone
  - certificate
  - load balancer / backend bucket / URL map hints
- Diagnose:
  - missing DNS permissions
  - missing certificate permissions
  - missing compute/load-balancer permissions
- Provision:
  - later in this step; not yet executed at checkpoint start
- Maintain:
  - no duplicate browser-delivery stacks for the same configured destination

## User Procedure Goal
- `Analyze Compatibility`
  - inspect real remote state
  - build a compatibility report
- `Review Requirements`
  - existing
  - missing
  - blocked by permissions
  - provisionable now
- `Approve Provisioning`
  - explicit safeguard for cost and project-wide actions
- `Provision Missing`
  - create only missing supported resources
- `Sync And Verify`
  - run compare/execute against the now-compatible targets

## Implementation Slices

### Slice A - Compatibility Model
- create one canonical module-local GCP provisioning model
- define:
  - supported bundles
  - required APIs
  - required permissions
  - provisionable resources
  - safeguard/cost categories

### Slice B - Real Inventory
- inspect project/API/resource existence
- emit structured remote inventory for supported bundles

### Slice C - Permission Diagnostics
- turn API failures into operator-readable diagnostics
- separate:
  - missing resource
  - missing permission
  - unsupported/blocked policy

### Slice D - Provision Missing Resources
- enable APIs where allowed
- create Firestore database where absent
- create deployment/media buckets where absent
- enforce singleton hygiene

### Slice E - Cost And Safeguards
- show operator warnings before provisioning
- require explicit confirmation for:
  - project-wide actions
  - possible recurring costs
  - destructive cleanup

### Slice F - Embed Into UI
- surface the compatibility report and provisioning actions in `Remote Ops`
- keep labels/operator flow explicit

## Execution Status
- Started.
- Slice A foundation is now in the worktree:
  - `modules/test-modules-remote-ops/server/remote-ops-gcp-provisioning-model.mjs`
  - `modules/test-modules-remote-ops/server/remote-ops-provisioning-routes.mjs`
- Current route:
  - `GET /api/reference/modules/test-modules-remote-ops/gcp/provisioning-model`
- This is the canonical module-local definition for what “compatible with our flows” means on GCP.
- Slice B and Slice C are now in the worktree:
  - `modules/test-modules-remote-ops/server/remote-ops-gcp-compatibility-runtime.mjs`
  - `POST /api/reference/modules/test-modules-remote-ops/connections/:connectionId/analyze-compatibility`
- The `Remote Ops` desk now exposes `Analyze Compatibility` and renders:
  - bundle-level API state
  - missing resources
  - permission diagnostics
  - provisionable actions
  - safeguard/cost notes
- UI/test cleanup completed as part of this slice:
  - `RemoteOpsView.jsx` split into module-local panels
  - remote-ops frontend integration split into connection/target focused files
  - frontend lane manifest updated to the new files
- Slice D and Slice E are now in the worktree:
  - `modules/test-modules-remote-ops/server/remote-ops-gcp-provisioning-execution-runtime.mjs`
  - `POST /api/reference/modules/test-modules-remote-ops/connections/:connectionId/provision-missing`
- The `Remote Ops` desk now exposes:
  - safeguard confirmations
  - `Provision Missing Resources`
  - post-provision refreshed compatibility truth
- Provisioning scope currently closed:
  - enable required APIs for configured bundles
  - create missing default Firestore database for configured Firestore targets
  - create missing deployment/media buckets for configured storage targets
- Browser-delivery remains validation-only / planning-only in this step.

## Verification At This Checkpoint
- focused proof now covers:
  - provisioning model route
  - compatibility-analysis route
  - remote-ops desk compatibility action
  - lane-manifest alignment after test split
- verified:
  - `pnpm --filter server exec vitest run test/module-conformance/remote-ops.module-conformance.test.js`
  - `pnpm --filter frontend exec vitest run src/tests/app-integration/remote-ops.connections.integration.test.jsx`
  - `pnpm lint:function-shape`
  - `pnpm lint:repo-loc`
  - `pnpm test:frontend:integration:dynamic`
  - `pnpm quality:protocol`
  - `pnpm quality:gate:full`
- current repo-wide note:
  - the full gate is green again at this checkpoint

## Next Expected Step
- operator review of the Step 3 provisioning flow
- then either:
  - commit the Step 3 milestone
  - or continue into embedding the remote procedures into the real app/module flows
