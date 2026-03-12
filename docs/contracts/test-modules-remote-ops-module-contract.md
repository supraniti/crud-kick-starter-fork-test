# Test Modules Remote Ops Module Contract

## Metadata
- Contract ID: `module-contract.test-modules-remote-ops.v2`
- Date: `2026-03-11`
- Milestone: `gcp-remote-ops-step-1`
- Owner: `codex`
- Status: `approved`

## Module Brief
- Module name: `test-modules-remote-ops`
- Business objective: provide a dedicated operator-first surface for remote connection setup, resource validation, compare/diff workflows, and controlled sync/deploy/restore procedures for the approved GCP direction.
- Primary users: operators, editors, and technical administrators managing remote delivery and projection targets.
- Non-goals:
  1. Making GCP the authoring source of truth.
  2. Hidden automatic sync or background reconciliation.
  3. Full production-grade domain orchestration in Step 1.
  4. Hosted-server auth patterns as the default implementation path.

## Domain Model
- Primary entities:
  - `remote-connection-profiles`
  - `remote-target-profiles`
  - `remote-operation-runs`
- `remote-connection-profiles` owns:
  - provider and environment identity
  - auth mode
  - project selection metadata
  - credential path reference and extracted service-account metadata
  - connection state and validation summary
  - operator-facing warnings and last-validated timestamps
- `remote-target-profiles` owns:
  - target kind:
    - `firestore-projection`
    - `deployment-storage`
    - `media-storage`
    - `browser-delivery`
  - connection-profile binding
  - provider-specific config
  - compare/delete/restore policy
  - last compare summary
  - last validation summary
- `remote-operation-runs` owns:
  - procedure type:
    - `connect`
    - `validate`
    - `compare`
    - `execute`
    - `restore`
  - target scope metadata
  - dry-run vs execute intent
  - planned/actual counts
  - warning/error summaries
  - result status and timestamps

## Step 1 Runtime Rules
- Step 1 is allowed to use a hybrid adapter model:
  - real service-account-key connection and live validation against GCP
  - simulated compare/execute/restore flows until the real procedure paths replace them
- Any simulated boundary must be explicit in UI and handoff.
- Step 1 remote-state simulation must stay local and untracked.
- Step 1 must support:
  - real connection-profile key loading and validation
  - real target-profile validation
  - compare flows
  - execute smoke flows
  - bounded restore smoke flows
- Step 1 execution must prove:
  - real service-account connect semantics
  - real validation semantics for Firestore and storage targets
  - Firestore projection push semantics in the simulated lane
  - deployment folder reconciliation semantics in the simulated lane
  - media target reconciliation semantics in the simulated lane

## UI Surfaces
- dedicated remote-ops desk via module custom route
- connection-profile management
- target-profile management
- validation summary and warning surfaces
- compare/diff workspace
- execute/restore action panels
- operation-run history

## Behavior Extensions
- optional module settings are allowed only for module-global simulation/runtime tuning
- route-level procedures are module-owned:
  - load key / connect connection
  - validate connection
  - validate target
  - compare target
  - execute target procedure
  - restore target scope
- Step 1 UI must remain MUI-first and visually explain whether a flow is simulated or real

## Persistence And Runtime
- Storage boundaries:
  - collections persist profile and run history
  - simulated remote state lives outside collection storage in a module-owned local runtime area
  - raw service-account JSON must not be stored in collection rows
- Runtime contracts touched:
  - module manifest collections
  - module-owned route view
  - module-owned server routes
  - module-owned collection handlers and persistence plugins
- Determinism requirements:
  - compare results must be reproducible from local authoritative state plus current simulated remote state
  - execute/restore summaries must be recorded in `remote-operation-runs`

## Security And Policy
- connection material stored in collections must remain metadata-first; store path/reference and extracted metadata, not the raw key payload
- the UI must clearly warn that the service-account key file is sensitive and must stay outside the repo
- destructive remote-delete or local-restore actions must require explicit operator confirmation

## Acceptance Criteria
1. A module named `test-modules-remote-ops` exists and is available in module discovery/runtime flows.
2. Operators can create remote connection profiles and remote target profiles from the dedicated desk.
3. Operators can connect through a local Google service-account key file without configuring an OAuth client or consent screen.
4. Operators can load key metadata and validate selected GCP project access from the desk.
5. Operators can validate connection and target readiness through module-owned procedures.
6. Operators can compare local vs simulated-remote state for Firestore projection, deployment storage, and media storage targets.
7. Operators can execute smoke procedures and record results in `remote-operation-runs`.
8. Operators can perform at least one bounded restore smoke flow in Step 1.
9. The UI clearly communicates warnings, counts, and mocked-vs-real boundaries.
10. Step 1 remains module-local; no broad shared/core remote-ops abstraction is introduced.

## Step 2 Review-Ready Extension
- Step 2 extends the same module-local boundary and is now review-ready in the working tree.
- Added live procedures:
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
- Browser-delivery targets remain validation-only in Step 2.
- Live procedures still obey the same operator-first rules:
  - explicit compare before execute when policy requires it
  - explicit delete opt-in through target policy
  - no hidden automation
  - run history recorded in `remote-operation-runs`

## Step 3 Boundary Extension
- The next provisioning/compatibility phase must stay strictly module-local inside `test-modules-remote-ops` unless a missing shared primitive is proven.
- Remote/GCP implementation should prefer:
  - new module-local runtime files
  - new module-local routes
  - new module-local UI sections
- Avoid broad shared/core abstractions for:
  - provisioning models
  - GCP permission diagnostics
  - compatibility analysis
  - provisioning orchestration
  until the same primitive is proven outside this module.

## Step 3 Current Extension Status
- Step 3 compatibility analysis is now implemented inside the module boundary.
- Delivered Step 3 surfaces:
  - `GET /gcp/provisioning-model`
  - `POST /connections/:connectionId/analyze-compatibility`
  - `POST /connections/:connectionId/provision-missing`
- Step 3 currently reports:
  - required API state
  - existing/missing supported resources
  - missing project/bucket permissions
  - provisionable actions
  - safeguard/cost notes
- Supported analysis bundles:
  - `firestore-projection`
  - `deployment-storage`
  - `media-storage`
  - `browser-delivery`
- Step 3 provisioning execution is now closed for the supported resource scope:
  - enable required APIs for configured bundles
  - create missing default Firestore database
  - create missing deployment bucket
  - create missing media bucket
- Step 3 must still keep browser-delivery provisioning out of execution until that runtime is explicitly delivered.
- Step 3 provisioning rules now include:
  - explicit safeguard confirmation
  - iterative enable/re-analyze/create sequencing
  - singleton-safe create behavior
  - no duplicate/surplus resource creation for supported configured flows

## Out Of Scope
1. Real hosted-server auth infrastructure.
2. Automatic background sync scheduling.
3. Full domain provisioning/orchestration.
4. Step 2 embedding into Pages, Content, Media Manager, and settings surfaces.

## Extension-Level Plan
- Level 1 changes:
  - manifest, collections, contract, progress-pointer updates
- Level 2 changes:
  - module-local handlers, module-local routes, module-local workspace, simulated remote-state adapter
- Level 3 changes:
  - extract only if the same compare/execute primitive is proven twice outside this module
- Level 4 changes (if any):
  - none approved at contract time

## Verification Lanes
- Targeted lanes:
  - focused server conformance/runtime tests for remote ops
  - focused frontend integration tests for the remote-ops desk
  - `pnpm test:frontend:integration:dynamic`
- Closure lanes:
  - `pnpm quality:gate:full`

## Risks And Mitigations
- Risk:
  - Step 1 becomes a fake static demo instead of a trustworthy procedure model
  - Mitigation:
    - compare/execute/restore must operate on persisted local and simulated-remote state, not static sample JSON
- Risk:
  - Step 1 leaks too much provider-specific behavior into shared/core surfaces
  - Mitigation:
    - keep adapters, routes, and workspace logic module-local
- Risk:
  - auth and validation claims look more real than they are in Step 1
  - Mitigation:
    - explicitly label simulated boundaries in UI, contract, and handoff
