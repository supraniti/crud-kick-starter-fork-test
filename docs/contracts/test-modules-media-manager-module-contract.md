# Test Modules Media Manager Module Contract

## Metadata
- Contract ID: `module-contract.test-modules-media-manager.v1`
- Date: `2026-03-06`
- Milestone: `media-manager-module`
- Owner: `codex`
- Status: `approved`

## Module Brief
- Module name: `test-modules-media-manager`
- Business objective: provide a first-class media library module that owns local uploads, metadata curation, and deterministic image operations while exposing referenceable media records to the rest of the runtime.
- Primary users: operators and editors who need to upload, organize, preview, and reuse media assets.
- Non-goals:
  1. Article-specific authoring flows.
  2. Cloud object storage integrations.
  3. Enterprise DAM workflow features beyond local-library CRUD and image operations.

## Domain Model
- Primary entities:
  - `media-items`: original and derived media assets stored as referenceable records.
  - shared mission job state for operation execution history and terminal outcomes.
- Core fields:
  - `media-items`: `displayName`, `storageKey`, `relativePath`, `mimeType`, `fileSizeBytes`, `mediaKind`, `width`, `height`, `status`, `altText`, `description`, `category`, `usageLabels`, `isDerived`, `sourceMediaId`, `operationPreset`, `createdOn`, `updatedOn`
  - mission job payload/output: `mediaItemId`, `preset`, terminal job `status`, `jobId`, `derivedMediaId`, `failureReason`, `createdAt`, `finishedAt`
- Relations:
  - `media-items.sourceMediaId -> media-items` for derived assets only
- Validation rules:
  - Stage 1 uploads accept image files only: `image/jpeg`, `image/png`, `image/webp`
  - Stage 1 max upload size is `8 MiB`
  - `displayName` must be non-empty after upload normalization
  - `altText` max length `240`, `description` max length `500`
  - derived assets must reference a valid source media item
  - image operations are limited to supported image originals

## UI Surfaces
- Routes/views:
  - module-owned custom route view for `/app/test-modules-media-manager`
  - media-first workspace with upload panel, filter bar, gallery grid, preview/details panel, and operations panel
- CRUD interactions:
  - upload original asset
  - browse originals and derived assets
  - edit metadata in-place for a selected asset
  - request derived image operations
  - delete derived assets directly and delete original assets only when lifecycle policy allows
- Filters/search/sort needs:
  - text search across `displayName` and `title`
  - filters for `status`, `category`, `mediaKind`, `isDerived`
  - sort by `updatedOn`, `createdOn`, `displayName`
- Empty/loading/error states:
  - explicit empty state with upload call to action
  - deterministic upload validation errors
  - deterministic operation status and failure messaging

## Behavior Extensions
- Settings:
  - no end-user configurable module settings in v1; upload and operation policy is module-owned and deterministic
- Actions:
  - upload asset
  - update metadata
  - delete asset
  - request image compression preset
- Jobs:
  - module-owned missions create and track image compression jobs for derived outputs using the shared mission jobs runtime
- Remotes/integrations:
  - none in v1
- Computed behavior:
  - normalized display title after upload
  - preview and download URLs derived from stored asset identity
  - derived asset linkage and operation-state summaries

## Persistence And Runtime
- Storage boundaries:
  - binary assets live under `server/runtime/media-library/`
  - metadata persists through module-owned collection repositories
  - operation outcomes persist through shared mission job state
- Runtime contracts touched:
  - module manifest and module-local runtime entrypoints
  - module-local collection handlers, persistence plugins, services, missions, and frontend route entrypoint
  - one shared route-registration extension point for module-owned HTTP endpoints
- Determinism requirements:
  - reject unsupported MIME types and oversize payloads with explicit error envelopes
  - never trust client-provided storage paths
  - serve assets only from within the configured media-library root
  - Stage 3 is image-only in v1
  - deleting an original asset is restricted while derived children exist; deleting a derived asset removes only the derived file and its record

## Security And Policy
- Access constraints:
  - media management routes stay under the reference-domain auth posture already used by the application shell
  - upload and asset-serving endpoints must enforce path traversal protection
- Data sensitivity:
  - treat uploaded binaries and metadata as operator-managed but non-secret content
- Audit/logging requirements:
  - record operation failures in shared mission/job state
  - keep deterministic error codes for upload and operation failures

## Acceptance Criteria
1. A module named `test-modules-media-manager` is discovered, installable, and enabled through current runtime flows.
2. Stage 1 upload works end-to-end: accepted image lands in `server/runtime/media-library/`, metadata record is created, and the item appears in the media-first UI.
3. Other modules can reference `media-items` using standard reference fields.
4. Stage 2 metadata fields are editable, validated, and filterable from the media workspace.
5. Stage 3 image operations create deterministic job state, visible progress/status, and derived asset tracking.
6. Delete behavior follows the lifecycle policy documented in this contract.

## Out Of Scope
1. Non-image upload support in v1.
2. Video trimming or other video-specific operations.
3. External storage backends.

## Extension-Level Plan
- Level 1 changes:
  - add the `test-modules-media-manager` manifest, collections, mission definitions, and custom route-view declaration
- Level 2 changes:
  - implement module-local storage helpers, upload handlers, metadata flows, missions, and media-first frontend surfaces
- Level 3 changes:
  - extract only neutral shared helpers if upload-route or asset-serving duplication becomes real across modules
- Level 4 changes (if any):
  - add a narrow reusable runtime hook for module-owned HTTP route registration because the current runtime lacks any module route registrar

## Core Edit Waiver (Only If Level 4 Needed)
- Why level 1/2/3 was insufficient:
  - the current runtime can discover module collections, services, persistence, missions, and frontend views, but it cannot register module-owned HTTP routes required for upload and media serving
- Exact core boundary touched:
  - module manifest runtime normalization and reference-runtime route-registration flow
- Retirement milestone:
  - retire this waiver after module-owned HTTP routes are formalized as a standard shared capability with at least one additional consumer
- Owner:
  - `delivery-maintenance`

## Verification Lanes
- Targeted lanes:
  - `pnpm test:server:conformance:dynamic`
  - `pnpm test:server:runtime-integration:dynamic`
  - `pnpm test:frontend:conformance:dynamic`
  - `pnpm test:frontend:integration:dynamic`
  - focused media upload/storage/metadata/operations tests
- Closure lanes:
  - `pnpm quality:gate:full`
- Documentation-only note (if applicable):
  - `N/A`

## Risks And Mitigations
- Risk:
  - module-owned upload routes require a new server runtime seam and can drift into product-specific core logic
  - Mitigation:
    - keep the seam generic, manifest-driven, and limited to route registration only
- Risk:
  - image operations can introduce flaky or platform-sensitive behavior
  - Mitigation:
    - scope Stage 3 to deterministic image presets and cover status transitions with targeted tests
- Risk:
  - browser UX can regress into generic table CRUD instead of a media-first workspace
  - Mitigation:
    - use a custom module route view and validate live upload/browse/preview flows in the browser before closure
