# Test Modules Remote Ops Step 1 Real Connect Plan

## Scope
- Continue `Step 1` from `C:\Users\cmsin\OneDrive\שולחן העבודה\gcp-remote-operations-agent-ticket.md`
- Deliver a real operator-reviewable GCP connection and validation flow built around a local service-account key file
- Stop for review once the operator can load a local key file, validate real project access, and validate real target readiness

## Goal
Deliver the first meaningful real-GCP milestone:
- real service-account key loading from a local machine file chooser/import flow
- local metadata-first connection persistence
- real access-token exchange against Google APIs
- real project validation
- real target validation against GCP APIs/resources

This milestone is about trust and readiness, not full real remote execution yet.

## Why This Slice Exists
- The earlier simulated kitchensink was useful as internal groundwork.
- OAuth-first recovery was technically valid but wrong for the actual product use case.
- The local operator app should act through a stable GCP service identity controlled by the operator, not through per-user app OAuth setup.

## Milestone Boundary
### In
- service-account-key connection mode as the Step 1 primary path
- local JSON key-file import into a module-owned untracked runtime area
- JSON credential validation and metadata extraction
- real access-token exchange using the service-account key
- real validation for:
  - project reachability
  - Firestore target readiness
  - storage target readiness
  - optional browser-delivery resource existence when configured
- operator-facing missing-resource / missing-permission diagnostics
- UI changes needed to make the real flow coherent

### Out
- full real compare/execute/push for Firestore
- full real deployment/media sync execution
- automated remote resource creation
- Step 2 embedding into `Pages`, `Content`, `Media Manager`

## Working Decisions
- Primary auth path is `service-account-key` only for Step 1.
- The operator stores the JSON key file locally and chooses it from the app.
- The app imports the chosen key into a module-owned untracked runtime area and stores only the resulting reference plus extracted metadata in collection rows.
- Raw key JSON must not be stored in collection rows.
- Connection profiles remain metadata-first and store:
  - credential path hint
  - extracted service-account metadata
  - selected project identity
  - validation summaries
- Existing simulated compare/execute flows remain available as groundwork until real execution replaces them.

## Data And Runtime Shape
### Connection profile
- owns:
  - profile name
  - environment label
  - credential path hint
  - service account email
  - service account key id
  - selected project id / project number / display name
  - status and validation summary
- does not persist raw private key data

### Local runtime
- no token/session collections
- access tokens are obtained on demand from the referenced service-account key file
- local runtime storage remains module-owned and untracked only where procedure state requires it

### Routes
- `POST /connections/:id/connect`
  - reloads and validates the already imported local key file
  - extracts service-account metadata
  - suggests project id from the key file when the profile has none
- `POST /connections/:id/import-key-file`
  - imports the chosen JSON key file into the module-owned runtime area
  - validates credential shape
  - extracts service-account metadata
  - suggests project id from the key file when the profile has none
- `POST /connections/:id/validate`
  - exchanges the JWT bearer assertion for an access token
  - validates selected project access
- `POST /targets/:id/validate`
  - validates Firestore / storage / browser-delivery targets live when `adapterMode=live-gcp`

## Planned Slices
### Slice A - Contracts And Status Pointers
- update hard plan and handoff to make the service-account-first milestone explicit
- update module contract to remove OAuth-first language

### Slice B - Service Account Runtime
- add local key-file loading and JSON validation
- add JWT bearer assertion signing and token exchange
- add metadata extraction helpers

### Slice C - Connection Procedures
- repurpose connect to `Save & Load Key`
- validate project access with the loaded service account
- keep connection state metadata-first

### Slice D - Live Target Validation
- Firestore target:
  - validate Firestore API/database reachability
- deployment/media storage target:
  - validate bucket reachability and permissions
- browser-delivery target:
  - validate configured DNS zone / certificate existence when configured
- keep diagnostics explicit and operator-readable

### Slice E - UI And Review Flow
- replace OAuth setup with a service-account setup card
- expose file chooser flow, stored key reference, extracted service-account metadata, and project validation state
- make the flow read naturally:
  - create/select service account in GCP
  - download the JSON key
  - choose JSON key file
  - validate connection

### Slice F - Verification
- focused server conformance for service-account connect/validate and live target validation
- focused frontend integration for the service-account operator flow
- full repo gate
- stop for review once the operator can use the real path cleanly

## Review Success Criteria
1. The operator can create or edit a connection profile and choose a local Google service-account JSON key file directly from the UI.
2. Choosing the key file imports it into the module-owned runtime area, proves the file is a valid service-account credential, and extracts the service-account metadata.
3. The desk shows the suggested project id and allows operator override before validation.
4. `Validate Connection` proves the app can obtain an access token and reach the selected GCP project.
5. Target validation performs real GCP checks and returns meaningful diagnostics.
6. The operator is not required to configure an OAuth client or consent screen to review the feature.

## Deferred After This Milestone
- real Firestore execute/push
- real deployment sync execute
- real media sync execute
- bounded real restore/repair flows
- embedding remote awareness into `Pages`, `Content`, `Media Manager`

## Current Execution Snapshot
- Date: `2026-03-11`
- Status:
  - implemented in the working tree
  - focused server conformance green
  - focused frontend integration green
  - full gate green after the service-account rewrite
- Implemented files of note:
  - `modules/test-modules-remote-ops/server/remote-ops-service-account-auth-runtime.mjs`
  - `modules/test-modules-remote-ops/server/remote-ops-live-validation-runtime.mjs`
  - `modules/test-modules-remote-ops/server/remote-ops-connection-routes.mjs`
  - `modules/test-modules-remote-ops/frontend/RemoteOpsConnectionSetupCard.jsx`
  - `modules/test-modules-remote-ops/frontend/RemoteOpsView.jsx`
  - `modules/test-modules-remote-ops/frontend/useRemoteOpsConnectionProcedures.js`
  - `frontend/src/tests/app-integration/remote-ops.integration.test.jsx`
  - `server/test/module-conformance/remote-ops.module-conformance.test.js`
- Verified so far:
  - focused server conformance
    - passed
  - focused frontend integration
    - passed
  - `pnpm lint:function-shape`
    - passed
  - `pnpm quality:gate:full`
    - passed
- Current UX correction:
  - the earlier path-textbox model was replaced with a real JSON key-file chooser
  - the app now imports the chosen credential into a module-owned untracked runtime area and keeps collections metadata-only
