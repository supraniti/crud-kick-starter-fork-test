# Current State Repo Map

## Scope
- Repository: `crud-kick-starter-fork-test`
- Branch: `crud-kick-starter-fork-test`
- Purpose of this document:
  - describe the repo as it exists now
  - map runtime and operator flows in file-level detail
  - establish a stable baseline before future north-star reshaping

## Workspace Structure

### Root
- `frontend/`
  - operator React application
  - Vite dev/build surface
- `server/`
  - Fastify API
  - module discovery, runtime registration, persistence, module-owned routes
- `modules/`
  - additive business modules
  - each module owns its own manifest, optional frontend view, optional server handlers/routes/persistence
- `client-runtime/`
  - standalone browser runtime injected into deployed HTML later
  - intentionally not part of `frontend/` or `server/`
- `docs/`
  - contracts, research, archived execution plans, operating docs
- `deployment/`
  - generated static HTML output root
  - sync source for remote deployment storage
- `media/`
  - repo-root media storage for originals and derived media
- `remote-runtime/`
  - untracked remote-ops local runtime area
  - stores imported service-account key copies and simulated/local remote state
- `scripts/`
  - repo-level gate/protocol/e2e runners

### Root package orchestration
- Root scripts live in [package.json](C:/Users/cmsin/2026/crud-kick-starter-fork-test/package.json).
- Important root scripts:
  - `pnpm dev:server`
  - `pnpm dev:frontend`
  - `pnpm build:client-runtime`
  - `pnpm test:server:*`
  - `pnpm test:frontend:*`
  - `pnpm test:client-runtime`
  - `pnpm test:e2e:smoke`
  - `pnpm quality:protocol`
  - `pnpm quality:gate`
  - `pnpm quality:gate:full`
- Root quality gate executes:
  - protocol integrity
  - LOC/function-shape linting
  - targeted server/frontend lanes
  - client-runtime lanes
  - smoke lane

## Runtime Entry Points

### Server bootstrap
- Entry: [server/src/index.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/index.js)
- Flow:
  1. `buildServer()` from [server/src/app.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/app.js)
  2. Fastify created
  3. config and container manager decorated on server
  4. error handler registered
  5. route groups registered:
     - `registerSystemRoutes`
     - `registerInfraRoutes`
     - `registerReferenceDomainRoutes`
  6. server listens on configured host/port

### Reference domain bootstrap
- Entry group: [server/src/routes/reference-domain-routes.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/routes/reference-domain-routes.js)
- Flow:
  1. `createReferenceRuntimeRegistrationContextWithDefaults()` from [reference-runtime-registration-context-defaults-domain-service.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/domains/reference/runtime/services/reference-runtime-registration-context-defaults-domain-service.js)
  2. runtime context builds:
     - module registry
     - collection handler registry
     - persistence plugin registry
     - mission registry
     - service registry
     - reference options provider registry
     - validation and mutation/query infrastructure
     - repository access over persisted module state
  3. [feature-route-registration.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/routes/reference-domain-routes/feature-route-registration.js) registers:
     - metadata routes
     - module settings routes
     - collection CRUD routes
     - remotes deploy routes
     - mission routes
     - product/taxonomy reference routes
     - discovered module-owned routes

### Frontend bootstrap
- Entry: [frontend/src/main.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/main.jsx)
- Flow:
  1. boot field-type plugin discovery
  2. render `App`
  3. `App` in [frontend/src/app/App.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/app/App.jsx) chooses:
     - `LoginView` when unauthenticated
     - `AppShellLayout` when authenticated
  4. [03-use-app-controller.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/app/parts/03-use-app-controller.js) composes:
     - route parsing
     - module runtime loading
     - module state loading
     - required domain loading
     - view resolution
     - navigation handlers
  5. [04-app-shell-layout.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/app/parts/04-app-shell-layout.jsx) renders:
     - module sidebar
     - top app bar
     - optional quick actions
     - optional deploy panel
     - active module view
     - runtime settings dialog

### Frontend shell, auth, and route state
- Auth is local-shell only.
- Session storage key:
  - `crud-control.auth.v1`
  - defined in [01-app-config.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/app/parts/01-app-config.js)
- There is no React Router.
- Route state is controlled by:
  - [03-use-app-controller.helpers.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/app/parts/03-use-app-controller.helpers.js)
  - [route-state-runtime.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/runtime/view-registry/route-state-runtime.js)
- Route model:
  - pathname: `/app/:moduleSegment`
  - query params: selected module state such as filters, `pageId`, `layoutId`, `tab`
- Shell mode:
  - standard shell uses sidebar and top bar
  - immersive shell currently used by `test-modules-layouts`
  - enforced in [04-app-shell-layout.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/app/parts/04-app-shell-layout.jsx)

### Frontend view discovery
- Discovery bridge: [frontend/src/runtime/module-discovery-bridges/module-view-entrypoints.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/runtime/module-discovery-bridges/module-view-entrypoints.mjs)
- Registry surface: [frontend/src/runtime/view-registry.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/runtime/view-registry.jsx)
- Flow:
  1. Vite `import.meta.glob` eagerly loads `modules/*/frontend/**/*.{js,mjs,jsx}`
  2. modules export `registerModuleViews()`
  3. view registry normalizes route descriptors
  4. app controller resolves active module view from route + loaded module runtime items

### Client runtime bootstrap
- Entry: [client-runtime/src/browser/global-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/client-runtime/src/browser/global-runtime.mjs)
- Runtime factory: [client-runtime/src/runtime/create-client-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/client-runtime/src/runtime/create-client-runtime.mjs)
- Flow:
  1. page supplies `window.__CRUD_CLIENT_RUNTIME_CONFIG__`
  2. global installer builds runtime
  3. runtime attaches:
     - `window.dataLayer.query`
     - `window.dataLayer.installDataset`
     - `window.dataLayer.syncDataset`
     - `window.dataLayer.getDatasetStatus`
     - `window.actionLayer.dispatch`
  4. runtime composes:
     - query registry
     - action registry
     - dataset registry
     - memory/cache-storage/indexeddb/remote adapters
     - dataset manager
     - capability monitor

## Server Runtime Topology

### Runtime assembly sequence
1. [server/src/index.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/index.js) calls `buildServer()`.
2. [server/src/app.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/app.js) creates Fastify and mounts the reference-domain plugin.
3. [reference-runtime-registration-context-defaults-domain-service.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/domains/reference/runtime/services/reference-runtime-registration-context-defaults-domain-service.js) wires all default collaborators into [reference-runtime-registration-context-domain-service.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/domains/reference/runtime/services/reference-runtime-registration-context-domain-service.js).
4. Registration context does all of the following in one build sequence:
   - create in-memory reference state
   - resolve persistence mode and hydrate persisted slices
   - create repositories and job runtime
   - discover modules from `modules/*/module.json`
   - apply persisted module lifecycle state
   - register discovered handlers, persistence, missions, services, settings, routes
   - expose resolvers used by generic and module-owned routes
5. [feature-route-registration.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/routes/reference-domain-routes/feature-route-registration.js) mounts:
   - metadata routes
   - settings routes
   - generic collection routes
   - remotes deploy routes
   - mission routes
   - product/taxonomy routes
   - discovered module-owned routes

### Module discovery and lifecycle
- Main discovery runtime:
  - [server/src/core/module-registry-helpers/discovery-runtime.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/module-registry-helpers/discovery-runtime.js)
- Main lifecycle runtime:
  - [server/src/core/module-registry-helpers/lifecycle-runtime.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/module-registry-helpers/lifecycle-runtime.js)
- Discovery pattern:
  1. scan `modules/*/module.json`
  2. optionally preload field-type plugins
  3. validate manifest shape
  4. register manifest
  5. auto-install
  6. auto-enable
- Contribution types discovered from manifest runtime pointers:
  - `collectionHandlers`
  - `persistence`
  - `routes`
  - `services`
  - `missions`
  - `referenceOptionsProviders`

### Registries and shared infrastructure
- Collection handlers:
  - [collection-handler-registry.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/collection-handler-registry.js)
- Persistence plugins:
  - [persistence-plugin-registry.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/persistence-plugin-registry.js)
- Missions:
  - [mission-registry.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/mission-registry.js)
- Services:
  - [service-registry.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/service-registry.js)
- Reference option providers:
  - [reference-options-provider-registry.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/reference-options-provider-registry.js)
- Shared async jobs:
  - [async-job-runner.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/async-job-runner.js)

### Generic collection request pipeline
- Generic collection routes live in:
  - [reference-collection-route-runtime-domain-service.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/domains/reference/collections/services/reference-collection-route-runtime-domain-service.js)
- Request path:
  1. route resolves active collection definition
  2. route resolves registered handler for the collection
  3. route resolves repository through persistence plugin registry
  4. handler executes `list`, `findById`, `create`, `update`, or `removeByIndex`
  5. validation, normalization, computed fields, and mutation/query pipeline run inside the handler
  6. repository persists state
  7. optional `afterMutation` hook runs
  8. remotes deploy state is marked dirty when applicable
- Default generated collection implementation lives in:
  - [generated-proof-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime.mjs)
  - [collection-handler-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime/collection-handler-runtime.mjs)
  - [persistence-runtime-helpers.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/core/shared/capability-contracts/local-kernel/generated-proof-runtime/persistence-runtime-helpers.mjs)

### Delete dependency enforcement
- Delete dependency resolution lives in:
  - [reference-collection-delete-dependencies-domain-service.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/server/src/domains/reference/collections/services/reference-collection-delete-dependencies-domain-service.js)
- Before delete, the server scans:
  - active collection repositories
  - module settings repositories
- Policies enforced:
  - `restrict`
  - `nullify`

## Frontend Runtime Topology

### Controller-driven rendering
- The frontend controller is the real app runtime boundary.
- Main file:
  - [03-use-app-controller.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/app/parts/03-use-app-controller.js)
- Responsibilities:
  - parse route
  - load module runtime items
  - load module state
  - resolve current view registration
  - determine required frontend domains
  - create navigation handlers
  - build active module context

### Shared frontend domains
- Collections domain:
  - [useCollectionsDomain.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/domains/collections/useCollectionsDomain.js)
  - shared CRUD/filter/reference layer for collection-driven modules
- Module settings domain:
  - `frontend/src/domains/module-settings/*`
- Mission operator domain:
  - `frontend/src/domains/mission-operator/*`
- Product/taxonomy domain:
  - `frontend/src/domains/products-taxonomies/*`
- Remotes deploy domain:
  - `frontend/src/domains/remotes-deploy/*`

### View registration model
- Built-in route descriptors come from:
  - [view-descriptor-resolution.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/runtime/view-registry/view-descriptor-resolution.js)
- Module custom views come from:
  - `modules/*/frontend/view-entrypoint.jsx`
- Important current distinction:
  - Content, Taxonomy, Media Manager are still collections-domain-backed
  - Pages, Layouts, and Remote Ops are more custom and load extra support data outside the generic collection view

## Module System

### Module manifest contract
- Every module is rooted at `modules/<module-id>/module.json`.
- Common manifest surfaces:
  - `id`
  - `capabilities`
  - `runtime.collectionHandlers`
  - `runtime.persistence`
  - `runtime.routes`
  - `settings.fields`
  - `ui.navigation`
  - `ui.routeView`
  - `collections`

### How server uses modules
- Module registry and discovery live under `server/src/core/` and `server/src/domains/reference/runtime/`.
- The registration context resolves discovered module assets and wires them into:
  - collection CRUD
  - settings persistence
  - module-owned routes
  - missions
  - services
  - reference option providers

### How frontend uses modules
- Module route views are discovered from `modules/*/frontend/view-entrypoint.jsx`.
- A module view declares:
  - required frontend domains
  - route state adapter
  - render function
- Examples:
  - [modules/test-modules-content/frontend/view-entrypoint.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/view-entrypoint.jsx)
  - [modules/test-modules-pages/frontend/view-entrypoint.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/view-entrypoint.jsx)
  - [modules/test-modules-remote-ops/frontend/view-entrypoint.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/frontend/view-entrypoint.jsx)

## Active Modules

### Permanent baseline modules
- `test-modules-crud-core`
- `test-modules-relations-taxonomy`
- `test-modules-settings-policy`
- `test-modules-operations-dispatch`
- `test-modules-remotes-publish`

These remain in repo as baseline/test infrastructure and should not be removed casually.

### Feature modules currently driving the CMS/product slice
- `test-modules-editorial`
  - author management and editorial overview
- `test-modules-taxonomy`
  - category/tag management
- `test-modules-content`
  - blog posts and revisions
- `test-modules-engagement`
  - comments/moderation
- `test-modules-pages`
  - page definitions, redirects, deployment artifacts, delivery payloads
- `test-modules-layouts`
  - reusable layout documents and layout builder
- `test-modules-media-manager`
  - media upload, metadata, transformations, remote media sync
- `test-modules-remote-ops`
  - GCP connections, targets, compare/execute/restore/provisioning/browser delivery

## Core Data Stores And Generated State

### Server local persistence
- `server/runtime/module-data/*.json`
  - per-module state snapshots
  - examples:
    - `test-modules-content-state.json`
    - `test-modules-pages-state.json`
    - `test-modules-media-manager-state.json`
    - `test-modules-remote-ops-state.json`
- `server/runtime/module-runtime/reference-runtime.json`
  - runtime-level state snapshot

### Repo-root artifact stores
- `deployment/`
  - HTML artifacts generated from published pages
- `media/`
  - originals and derived media managed by media-manager

### Remote-ops local runtime
- `remote-runtime/`
  - imported service-account key copies
  - live/simulated remote-ops state
  - kept outside tracked collection rows

## End-To-End Data Flow Map

### Flow A: operator shell -> frontend domains -> server API -> module persistence
1. Operator signs in locally in `frontend`.
2. Frontend controller loads:
   - module runtime metadata
   - current route module availability
   - required domains for the selected module
3. Frontend domains call `frontend/src/api/reference.js`.
4. Server receives requests under `/api/reference/...`.
5. Reference domain routes resolve:
   - collection definition
   - collection handler
   - persistence repository
   - settings repository if needed
6. Collection handlers apply:
   - validation
   - normalization
   - computed fields
   - cross-module rules
7. Persistence plugins write updated module state to `server/runtime/module-data/*.json`.

### Flow B: content -> page template -> HTML deployment
1. Operator creates/edits posts in `test-modules-content`.
2. Posts persist in `blog-posts`; revisions persist in `blog-post-revisions`.
3. Operator creates page records in `test-modules-pages`.
4. `blog-pages` stores:
   - single-page or per-record mode
   - path/pathPattern
   - layout selection
   - SEO/runtime script URLs
   - source selection
5. `page-delivery-runtime.mjs` resolves deterministic page payloads from:
   - page record
   - selected source record
   - data-source descriptors
   - settings/browser-delivery context
6. `page-deployment-runtime.mjs` computes expected output files.
7. `page-deployment-render-runtime.mjs` renders HTML skeleton:
   - head tags
   - mount element
   - runtime scripts
   - embedded JSON payload
8. HTML writes under `deployment/`.
9. `page-deployment-artifacts` persists per-output drift/sync state.

### Flow C: media -> derived variants -> local media store -> remote media store
1. Operator uploads media in `test-modules-media-manager`.
2. Media routes and handlers validate file and metadata.
3. Original written under `media/originals/`.
4. Preset operations generate derived files under `media/derived/`.
5. `media-items` collection stores media metadata and derived relationships.
6. Remote media workflows in `Media Manager` call embedded remote-ops support.
7. `test-modules-remote-ops` compares local file tree against configured GCS bucket/prefix.
8. Execute sync writes/delete/restores objects based on compare policy.

### Flow D: local authoritative state -> remote projections and artifacts
1. `Remote Ops` stores:
   - connection profile
   - target profile
   - operation run history
2. Live connection uses imported service-account key reference.
3. Live targets split by kind:
   - Firestore projection
   - deployment storage
   - media storage
   - browser delivery
4. Compare builds local source state from current module data.
5. Execute pushes the delta to GCP.
6. Restore pulls remote-only state back for bounded supported flows.

### Flow E: published page/server boundary -> client runtime boundary
1. `Pages` resolves page payload in [page-delivery-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-delivery-runtime.mjs).
2. Deploy render in [page-deployment-render-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-deployment-render-runtime.mjs) emits:
   - HTML shell
   - head/meta tags
   - mount element
   - inline page payload JSON
   - runtime script URLs
3. `client-runtime/` is currently generic and separate.
4. A future deployed page can load [client-runtime.global.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/client-runtime/dist/client-runtime.global.js) and bootstrap from the embedded JSON payload.
5. There is no automatic server-to-client-runtime registry binding yet.

## Module-Owned Server Route Matrix

### Content module routes
- File:
  - [modules/test-modules-content/server/routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/server/routes.mjs)
- Route:
  - `POST /api/reference/modules/test-modules-content/posts/:postId/restore-revision`
- Purpose:
  - restore a post from a selected revision
- Request body:
  - `revisionId` required
  - `updatedByAuthorId` optional override for the restored post
  - `changeSummary` optional custom rollback summary
- Success response:
  - `{ ok, item, restoredFromRevisionId, timestamp }`
- Main failure payloads:
  - `BLOG_POST_REVISION_ID_REQUIRED`
  - `BLOG_POST_NOT_FOUND`
  - `BLOG_POST_REVISION_NOT_FOUND`
  - `BLOG_POST_REVISION_MISMATCH`
  - `BLOG_POST_RESTORE_FAILED`
  - `BLOG_POST_REVISION_RESTORE_PERSISTENCE_FAILED`
- Main flow:
  1. load post
  2. load revision
  3. validate post/revision match
  4. build restore payload from revision snapshots
  5. queue rollback revision metadata
  6. update post
  7. persist rollback revision through `afterMutation`

### Pages module routes
- File:
  - [modules/test-modules-pages/server/routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/routes.mjs)
- Routes:
  - `POST /api/reference/modules/test-modules-pages/pages/:pageId/publish-now`
  - `GET /api/reference/modules/test-modules-pages/pages/desk-items`
  - `POST /api/reference/modules/test-modules-pages/pages/:pageId/sync-deployment`
  - `GET /api/reference/modules/test-modules-pages/pages/:pageId/delivery`
  - `GET /api/reference/modules/test-modules-pages/pages/:pageId/preview-sources`
  - `GET /api/reference/modules/test-modules-pages/pages/:pageId/deployment-instances`
  - `GET /api/reference/modules/test-modules-pages/delivery/resolve`
- Purposes:
  - publish a page immediately
  - load desk rows with evaluated readiness/deployment state
  - trigger explicit local deployment sync
  - preview or resolve delivery payloads
  - list preview sources for per-record pages
  - list generated deployment instances
  - resolve by path for page delivery consumers
- Route detail:
  - `POST .../publish-now`
    - request body:
      - `updatedByAuthorId` required when the page is blog-post-backed and the source post is not already published
    - success response:
      - `{ ok, item, timestamp }`
  - `GET .../desk-items`
    - success response:
      - `{ ok, items, timestamp }`
    - notes:
      - each row is rehydrated through live deployment-state evaluation before return
  - `POST .../sync-deployment`
    - success response:
      - `{ ok, item, instances, timestamp }`
    - main failure:
      - `PAGE_DEPLOYMENT_SYNC_STATUS_INVALID`
  - `GET .../:pageId/delivery`
    - query:
      - `preview=true|false`
      - `sourceItemId` optional preview source selector for per-record pages
    - success response:
      - `{ ok, payload, timestamp }`
  - `GET .../:pageId/preview-sources`
    - success response:
      - `{ ok, items, timestamp }`
      - item shape:
        - `id`
        - `label`
        - `path`
  - `GET .../:pageId/deployment-instances`
    - success response:
      - `{ ok, item, items, timestamp }`
  - `GET .../delivery/resolve`
    - query:
      - `path` required
      - `preview` optional
    - success response:
      - `{ ok, payload, timestamp }`
    - main failures:
      - `PAGE_PATH_REQUIRED`
      - `PAGE_PATH_NOT_FOUND`
- Important publish behavior:
  - if a page is backed by a blog post, `publish-now` may first publish the backing post

### Media Manager module routes
- File:
  - [modules/test-modules-media-manager/server/routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-media-manager/server/routes.mjs)
- Routes:
  - `POST /api/reference/modules/test-modules-media-manager/media-items/uploads`
  - `PUT /api/reference/modules/test-modules-media-manager/media-items/:itemId/metadata`
  - `DELETE /api/reference/modules/test-modules-media-manager/media-items/:itemId`
  - `GET /api/reference/modules/test-modules-media-manager/media-items/:itemId/content`
- Purposes:
  - upload original media
  - update editable metadata
  - delete stored media plus metadata row
  - stream original/derived media content
- Route detail:
  - `POST .../uploads`
    - request body:
      - upload payload consumed by `createUploadedMediaItem`
      - includes file metadata plus file content payload expected by the media-library runtime
    - success response:
      - `{ ok, moduleId, collectionId, item, deploy, timestamp }`
  - `PUT .../:itemId/metadata`
    - request body:
      - only editable metadata fields are accepted:
        - `displayName`
        - `altText`
        - `description`
        - `category`
        - `usageLabels`
    - success response:
      - `{ ok, moduleId, collectionId, item, deploy, timestamp }`
    - main failures:
      - `MEDIA_METADATA_FIELDS_UNSUPPORTED`
      - `MEDIA_METADATA_EMPTY`
  - `DELETE .../:itemId`
    - success response:
      - `{ ok, moduleId, collectionId, removed: { id }, deploy, timestamp }`
    - delete path honors generic dependency restrictions/nullify rules before removing files
  - `GET .../:itemId/content`
    - returns raw file bytes with `cache-control: no-store` and the item's mime type
- Important ownership rule:
  - `media-items` generic CRUD is intentionally restricted; these routes own create/update/delete/content

### Remote Ops module routes
- File:
  - [modules/test-modules-remote-ops/server/routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/routes.mjs)
- Route groups:
  - connection routes:
    - [remote-ops-connection-routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-connection-routes.mjs)
  - target routes:
    - [remote-ops-target-routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-target-routes.mjs)
  - provisioning routes:
    - [remote-ops-provisioning-routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-provisioning-routes.mjs)
- Connection routes:
  - load/import service-account key
  - reload stored key
  - validate connection
  - analyze compatibility
- Connection route detail:
  - `POST .../connections/:connectionId/import-key-file`
    - request body:
      - `fileName`
      - `fileContent`
    - success response:
      - `{ ok, message, item, run, timestamp }`
  - `POST .../connections/:connectionId/connect`
    - request body:
      - optional `credentialPath`
    - success response:
      - `{ ok, message, item, run, timestamp }`
  - `POST .../connections/:connectionId/simulate-connect`
    - simulated-only helper
  - `POST .../connections/:connectionId/validate`
    - success response:
      - `{ ok, message, item, run, timestamp }`
- Target routes:
  - validate target
  - compare target
  - execute target
  - restore target
  - validate browser-delivery target
- Target route detail:
  - `POST .../targets/:targetId/validate`
    - success response:
      - `{ ok, message, item, run, timestamp }`
  - `POST .../targets/:targetId/compare`
    - success response:
      - `{ ok, message, item, run, timestamp }`
  - `POST .../targets/:targetId/execute`
    - blocks if `policy.requireDryRunFirst` is true and no compare has run yet
    - success response:
      - `{ ok, message, item, run, timestamp }`
    - main failure:
      - `REMOTE_OPS_COMPARE_REQUIRED`
  - `POST .../targets/:targetId/restore`
    - success response:
      - `{ ok, message, item, run, timestamp }`
  - `POST .../targets/:targetId/seed-remote-extra`
    - simulated-only smoke helper for storage targets
- Provisioning routes:
  - inspect provisioning model
  - analyze project compatibility
  - provision missing supported resources
- Provisioning route detail:
  - `GET .../gcp/provisioning-model`
    - success response:
      - `{ ok, message, model, timestamp }`
  - `POST .../connections/:connectionId/analyze-compatibility`
    - success response:
      - `{ ok, message, report, run, timestamp }`
  - `POST .../connections/:connectionId/provision-missing`
    - request body:
      - `confirmedSafeguardIds`
      - `actionIds`
    - success response:
      - `{ ok, message, report, run, executedActions, timestamp }`
    - main failure:
      - `REMOTE_OPS_GCP_SAFEGUARD_CONFIRMATION_REQUIRED`

## Operator Workflow Catalog

### Route state behavior
- Content:
  - post selection is local state, not URL-synced
- Taxonomy:
  - collection/filter state is collections-domain-driven
- Pages:
  - `pageId` is route-synced
  - tab is local state only
- Layouts:
  - `layoutId` is route-synced
  - return route info can come from `Pages`
- Remote Ops:
  - `tab` is route-synced
  - incoming `targetId` and `connectionId` deep links are consumed
  - later selections do not fully write back to route state

## Screen And Workflow Catalog

### 1. Editorial
- Route: `/app/test-modules-editorial`
- Frontend entry:
  - [modules/test-modules-editorial/frontend/view-entrypoint.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-editorial/frontend/view-entrypoint.jsx)
- Main screen:
  - `BlogEditorialView.jsx`
- Current purpose:
  - manage authors
  - provide editorial overview/assignment context used by content
- Main implementation:
  - [BlogEditorialView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-editorial/frontend/BlogEditorialView.jsx)
  - [useEditorialOverview.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-editorial/frontend/useEditorialOverview.js)
- Collection ownership:
  - `blog-authors`
- Current flow detail:
  1. module uses `collectionsDomain`
  2. list/edit authors with generic collection CRUD
  3. overlay editorial summary/assignment calculations in the custom view
  4. resulting author records become reference options in Content and Pages
- Visible inputs and controls:
  - summary cards:
    - `Total Authors`
    - `Active Roster`
    - `Desk Editors`
    - `Guest Contributors`
  - queue controls:
    - `Status`
    - `Primary Author`
    - `Readiness`
    - `Refresh Queue`
  - author form labels:
    - `Display Name`
    - `Legal Name`
    - `Bio`
    - `Avatar Media`
    - `Email`
    - `Website URL`
    - `Social Links`
    - `Role`
    - `Status`
    - `Locale`
    - `Expertise Tags`
  - hidden from the generic form/list:
    - `Slug`
    - `Created On`
    - `Updated On`
    - `Last Published On`

### 2. Taxonomy
- Route: `/app/test-modules-taxonomy`
- Frontend entry:
  - [modules/test-modules-taxonomy/frontend/view-entrypoint.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-taxonomy/frontend/view-entrypoint.jsx)
- Main screen:
  - `BlogTaxonomyView.jsx`
- Current purpose:
  - create/edit categories
  - create/edit tags
  - provide taxonomy references used by content/pages
- Main implementation:
  - [BlogTaxonomyView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-taxonomy/frontend/BlogTaxonomyView.jsx)
  - [useTaxonomyWorkspace.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-taxonomy/frontend/useTaxonomyWorkspace.js)
- Collection ownership:
  - `blog-tags`
  - `blog-categories`
- Current flow detail:
  1. switch between tags and categories
  2. generic collection CRUD handles persistence
  3. taxonomy view adds category tree and summary behavior
  4. categories and tags become references for Content and Pages
- Visible inputs and controls:
  - top switcher:
    - `Category Tree`
    - `Tags`
  - tag form labels:
    - `Name`
    - `Description`
    - `Color`
    - `Visibility`
    - `SEO Title`
    - `SEO Description`
  - category form labels:
    - `Name`
    - `Description`
    - `Parent Category`
    - `Sort Order`
    - `Visibility`
    - `Featured Media`
  - category tree panel:
    - shows `path`
    - shows `depth`
    - shows `visibility`
    - shows `featured media` flag
  - hidden from schema-driven forms:
    - tag:
      - `Slug`
      - `Usage Count`
      - `Created On`
      - `Updated On`
    - category:
      - `Slug`
      - `Path`
      - `Depth`
      - `Usage Count`
      - `Created On`
      - `Updated On`

### 3. Content
- Route: `/app/test-modules-content`
- Main view:
  - [BlogContentView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentView.jsx)
- Main workspace hook:
  - [useBlogContentWorkspace.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/useBlogContentWorkspace.js)
- Supporting files:
  - [BlogContentEditorPanel.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentEditorPanel.jsx)
  - [BlogContentPanels.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentPanels.jsx)
  - [BlogContentRemoteProjectionPanel.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentRemoteProjectionPanel.jsx)
  - [BlogContentDeploymentImpactPanel.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentDeploymentImpactPanel.jsx)
  - [blog-content-deployment-awareness.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/blog-content-deployment-awareness.js)
- Visible panels:
  - post list
  - summary cards
  - content filter bar
  - editor panel
  - revision panel
  - deployment impact panel
  - remote projection panel
- Main operator flow:
  1. open `Content`
  2. select existing post or `New`
  3. fill title/body/status/format
  4. choose primary author, categories, tags, featured media, gallery media
  5. edit SEO mirrors still present on post
  6. save
  7. review revisions and restore if needed
  8. compare/sync Firestore projection via embedded remote panel
- Visible inputs and actions:
  - filters:
    - `Search`
    - `Status`
    - `Format`
    - `Primary Author`
  - main fields:
    - `Title`
    - `Subtitle`
    - `Excerpt`
    - `Body (Sanitized HTML)`
    - `Status`
    - `Format`
    - `Scheduled On`
    - `Locale`
    - `Primary Author`
    - `Created By`
    - `Updated By`
  - relation/media fields:
    - `Co-Authors`
    - `Categories`
    - `Tags`
    - `Featured Media`
    - `OpenGraph Image`
    - `Gallery Media`
  - comment/settings fields:
    - `Comment Policy`
    - `Allow Comments`
  - SEO fields:
    - `Canonical URL`
    - `SEO Title`
    - `SEO Description`
    - `OpenGraph Title`
    - `OpenGraph Description`
  - content actions:
    - `Save Post`
    - `New Draft`
    - `Submit for Review`
    - `Schedule`
    - `Publish`
    - `Archive`
    - `Restore Selected Revision`
    - `Open Pages Desk`
  - remote projection actions:
    - `Save Content Settings`
    - `Validate Target`
    - `Compare Projection`
    - `Sync Projection`
    - `Open Remote Ops`
- Data dependencies:
  - reads authors from `blog-authors`
  - reads categories from `blog-categories`
  - reads tags from `blog-tags`
  - reads media from `media-items`
  - reads deployment-awareness from Pages
  - writes `blog-posts` and `blog-post-revisions`
- Server implementation:
  - [collection-handlers.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/server/collection-handlers.mjs)
  - [content-handler-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/server/content-handler-runtime.mjs)
  - [content-revision-meta-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/server/content-revision-meta-runtime.mjs)
  - [routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/server/routes.mjs)
- Runtime detail:
  - generic CRUD owns main post persistence
  - content handler enforces workflow rules and relation normalization
  - `afterMutation` appends revision rows
  - custom restore route rebuilds post state from revision snapshots

### 4. Pages
- Route: `/app/test-modules-pages`
- Main view:
  - [BlogDistributionView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionView.jsx)
- Main workspace hook:
  - [useBlogDistributionWorkspace.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/useBlogDistributionWorkspace.js)
- Supporting files:
  - [blog-distribution-workspace-support.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/blog-distribution-workspace-support.js)
  - [BlogDistributionPageEditorSections.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionPageEditorSections.jsx)
  - [BlogDistributionDeploymentPanels.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionDeploymentPanels.jsx)
  - [BlogDistributionRemotePanels.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionRemotePanels.jsx)
  - [blog-distribution-redirect-workspace.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/blog-distribution-redirect-workspace.js)
- Main tabs:
  - `Pages Overview`
  - `Redirect Manager`
- Main editor surfaces:
  - page queue/list
  - page editor
  - data sources
  - SEO + delivery
  - pages runtime settings
  - remote deployment panel
  - browser delivery panel
  - deployment instances
  - delivery payload preview
  - redirect list/editor
- Main operator flow for single page:
  1. open `Pages`
  2. click `New Page`
  3. set `Deployment Mode = single-page`
  4. set `Path`
  5. set `Page Kind`
  6. optional primary source
  7. choose layout record or inline layout model fields
  8. set SEO + runtime script URLs
  9. save page
  10. publish page
  11. inspect delivery preview and deployment status
- Main operator flow for post template fan-out:
  1. create page
  2. set `Deployment Mode = per-record`
  3. set `Primary Source Type = blog-post`
  4. set `Source Selection = all-records`
  5. set `Path Pattern`, usually `/posts/{slug}`
  6. choose layout
  7. save and publish
  8. preview a concrete source record
  9. sync local deployment
  10. sync remote deployment via embedded remote panel
- Visible inputs and actions:
  - page identity:
    - `Page Title`
    - `Deployment Mode`
    - `Path` or `Template Path`
    - `Status`
    - `Scheduled On`
  - source section:
    - `Page Kind`
    - `Primary Source Type`
    - `Source Selection`
    - `Primary Source`
    - `Path Pattern`
  - presentation/navigation:
    - `Open Layouts`
    - `Edit Selected Layout`
  - data source editor:
    - `Key`
    - `Kind`
    - `Source Type`
    - `Bind As`
    - `Source Item`
    - `Limit`
    - `Sort Key`
    - `Direction`
    - `Add Data Source`
    - `Remove`
  - SEO + delivery:
    - `Canonical URL`
    - `SEO Title`
    - `OpenGraph Image`
    - `SEO Description`
    - `OpenGraph Title`
    - `OpenGraph Description`
    - `Runtime Script URLs`
  - readiness/deploy controls:
    - `Publishing Actor`
    - `Sync Deployment`
    - preview source selector for per-record templates
  - runtime settings:
    - `App Mount Tag Name`
    - `Remote Deployment Target`
    - `Remote Browser Delivery Target`
    - `Save Settings`
  - remote deployment/browser-delivery actions:
    - `Validate Target`
    - `Compare Remote`
    - `Sync Remote Deployment`
    - `Validate Browser Delivery`
    - `Open Remote Ops`
  - top action bar:
    - `Create Page` or `Save Page`
    - `New Draft`
    - `Publish Page` or `Publish Template`
- Current collection ownership:
  - `blog-pages`
  - `blog-redirect-rules`
  - `page-deployment-artifacts`
- Server implementation:
  - [distribution-page-handler-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/distribution-page-handler-runtime.mjs)
  - [page-delivery-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-delivery-runtime.mjs)
  - [page-deployment-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-deployment-runtime.mjs)
  - [page-deployment-render-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-deployment-render-runtime.mjs)
  - [page-deployment-state-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-deployment-state-runtime.mjs)
  - [page-settings-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-settings-runtime.mjs)
- Runtime detail:
  - page desk does not use generic list rendering
  - it hydrates pages, redirects, supporting references, layout references, deployment state, and remote target context
  - `publish-now` may publish the source post before publishing the page
  - delivery preview can resolve either draft preview or published delivery form
  - deployment sync writes local HTML and updates deployment artifact rows
  - browser-delivery target selected in module settings flows into payload/head/canonical URL generation

### 5. Layouts
- Route: `/app/test-modules-layouts`
- Main view:
  - [LayoutsView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutsView.jsx)
- Builder surfaces:
  - left rail
  - canvas
  - inspector
  - node dialog
- Supporting files:
  - [LayoutBuilderCanvas.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvas.jsx)
  - [LayoutBuilderLeftRail.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderLeftRail.jsx)
  - [LayoutBuilderInspector.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderInspector.jsx)
  - [LayoutBuilderNodeDialog.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderNodeDialog.jsx)
  - [layout-builder-model.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layout-builder-model.js)
- Current operator flow:
  1. open `Layouts`
  2. create or select layout
  3. add containers and blocks
  4. move/reorder/edit via node dialog
  5. save layout
  6. if opened from `Pages`, use `Return To Page`
- Visible inputs and actions:
  - shell actions:
    - `New Layout`
    - `Create Layout` or `Save Layout`
    - `Delete Layout`
    - `Return To Page` when entered from `Pages`
  - left rail:
    - `Layouts`
    - `Insert`
    - `Layers`
  - node dialog fields:
    - `Page Label` or `Container Label`
    - `Block Label`
    - `Container Layout`
    - `Gap`
    - `Padding`
    - `Min Height`
    - `Columns`
    - `Auto Rows`
    - `Direction`
    - `Wrap`
    - `Grid Width`
    - `Grid Height`
    - `Flex Basis`
    - `Grow`
    - `Shrink`
  - node dialog actions:
    - `Delete Node`
    - `Done`
- Current role:
  - own reusable layout documents only
  - `Pages` references layouts by `layoutId`
- Server shape:
  - no module-owned routes
  - generic CRUD on `page-layouts`
  - layout validation/normalization handled in module collection handlers

### 6. Media Manager
- Route: `/app/test-modules-media-manager`
- Main view:
  - [MediaManagerView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-media-manager/frontend/MediaManagerView.jsx)
- Current panels:
  - gallery
  - selected preview
  - metadata editor
  - operations panel
  - remote media sync panel
- Supporting files:
  - [useMediaManagerWorkspace.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-media-manager/frontend/useMediaManagerWorkspace.js)
  - [MediaManagerRemotePanel.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-media-manager/frontend/MediaManagerRemotePanel.jsx)
- Main operator flow:
  1. open `Media Manager`
  2. upload file
  3. select item
  4. edit display name / alt text / description / category / usage labels
  5. run preset such as `Web Optimized`
  6. compare/sync/restore remote media via embedded remote panel
- Visible inputs and actions:
  - main actions:
    - `Upload Image`
    - `Refresh`
  - gallery filters:
    - `Search`
    - `Status`
    - `Category`
    - `Asset Type`
  - metadata fields:
    - `Display Name`
    - `Alt Text`
    - `Description`
    - `Category`
    - `Usage Labels`
  - local media actions:
    - `Save`
    - `Web Optimized`
    - `Thumbnail`
    - `Delete`
  - remote media actions:
    - `Save Media Settings`
    - `Validate Target`
    - `Compare Remote`
    - `Sync Remote Media`
    - `Restore Missing Local File`
    - `Open Remote Ops`
- Local storage:
  - originals and derivatives in `media/`
- Server implementation:
  - [routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-media-manager/server/routes.mjs)
  - [missions.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-media-manager/server/missions.mjs)
  - media-library runtime under:
    - `modules/test-modules-media-manager/server/media-library/`
- Runtime detail:
  - upload route creates original file plus metadata row
  - metadata route updates editable metadata only
  - mission route flow is used for derived image compression presets
  - content route serves actual file bytes from local media store
  - embedded remote panel drives GCS compare/sync/restore through Remote Ops

### 7. Remote Ops
- Route: `/app/test-modules-remote-ops`
- Main view:
  - [RemoteOpsView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/frontend/RemoteOpsView.jsx)
- Main tabs:
  - `Connections`
  - `Targets`
  - `Runs`
- Supporting files:
  - [useRemoteOpsWorkspace.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/frontend/useRemoteOpsWorkspace.js)
  - [useRemoteOpsConnectionProcedures.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/frontend/useRemoteOpsConnectionProcedures.js)
  - [RemoteOpsConnectionPanels.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/frontend/RemoteOpsConnectionPanels.jsx)
  - [RemoteOpsTargetPanels.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/frontend/RemoteOpsTargetPanels.jsx)
  - [remote-ops-workspace-support.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/frontend/remote-ops-workspace-support.js)
- Connection flow:
  1. create connection profile
  2. choose service-account JSON key file
  3. app copies it into local untracked runtime area
  4. extracted metadata fills:
     - service account email
     - key id
     - suggested project
  5. validate connection
  6. analyze compatibility
- Visible connection inputs and actions:
  - `Profile Name`
  - `Environment Label`
  - `Project ID`
  - `Region`
  - `Credential Label`
  - `Choose JSON Key File`
  - `Stored Key File`
  - `Create Connection` or `Save Connection`
  - `Save & Load Key`
  - `Reload Stored Key`
  - `Validate Connection`
  - `Analyze Compatibility`
- Target types:
  - `firestore-projection`
  - `deployment-storage`
  - `media-storage`
  - `browser-delivery`
- Target procedures:
  - validate
  - compare
  - execute
  - restore
  - analyze compatibility
  - provision missing supported resources
- Visible target inputs and actions:
  - common:
    - `Target Title`
    - `Connection Profile`
    - `Target Kind`
    - `Adapter Mode`
  - Firestore:
    - `Projection Scope`
    - `Firestore Collection Path`
  - storage:
    - `Bucket Name`
    - `Prefix`
    - `Local Root Hint`
  - browser delivery:
    - `Access Mode`
    - `Stack Mode`
    - `DNS Mode`
    - `Hostname`
    - `Deployment Target`
    - `Media Target`
    - `DNS Zone`
    - `Certificate Name`
    - `URL Map Hint`
  - policy toggles:
    - `Allow remote deletes`
    - `Allow restore`
    - `Require compare before execute`
  - target actions:
    - `Create Target` or `Save Target`
    - `Validate Target`
    - `Compare`
    - `Execute Sync`
    - `Restore From Remote`
    - `Seed Remote Extra`
  - connection-level provisioning actions:
    - safeguard confirmations
    - `Provision Missing Resources`
- Server implementation:
  - [remote-ops-route-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-route-runtime.mjs)
  - [remote-ops-service-account-auth-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-service-account-auth-runtime.mjs)
  - [remote-ops-gcs-signed-url-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcs-signed-url-runtime.mjs)
  - [remote-ops-live-validation-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-live-validation-runtime.mjs)
  - [remote-ops-live-firestore-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-live-firestore-runtime.mjs)
  - [remote-ops-live-storage-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-live-storage-runtime.mjs)
  - [remote-ops-gcp-compatibility-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-compatibility-runtime.mjs)
  - [remote-ops-gcp-provisioning-execution-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-provisioning-execution-runtime.mjs)
  - browser-delivery runtimes:
    - [remote-ops-gcp-browser-delivery-compatibility-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-browser-delivery-compatibility-runtime.mjs)
    - [remote-ops-gcp-browser-delivery-stack-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-browser-delivery-stack-runtime.mjs)
    - [remote-ops-gcp-browser-delivery-provisioning-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-browser-delivery-provisioning-runtime.mjs)
- Runtime detail:
  - connection data persists metadata only; raw key JSON is copied into `remote-runtime/` and referenced
  - live compare/execute uses service account credentials directly
  - simulated adapters still exist for bounded smoke/helper cases
  - embedded remote support in other modules uses this module as the single remote-control backend
- Browser delivery target currently supports:
  - `gcp-temporary`
  - `custom-domain`
  - `direct-storage`
  - `https-load-balancer`
  - `gcp-managed` or external DNS instructions
  - in `gcp-temporary` mode with private buckets, Pages now emits signed page/media URLs rather than pretending the raw `storage.googleapis.com` path is anonymously usable

### 8. Engagement
- Route: `/app/test-modules-engagement`
- Frontend entry:
  - [modules/test-modules-engagement/frontend/view-entrypoint.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-engagement/frontend/view-entrypoint.jsx)
- Main view:
  - [BlogEngagementView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-engagement/frontend/BlogEngagementView.jsx)
- Main purpose:
  - moderate comments against posts and authors already managed by Content and Editorial
- Current flow detail:
  1. open `Engagement`
  2. filter the queue by `Search`, `Status`, `Post`, and `Moderator`
  3. pick a comment from the moderation queue
  4. inspect the thread context and detail panel
  5. choose moderator
  6. enter optional moderation reason
  7. run `Approve`, `Reject`, or `Mark Spam`
- Visible inputs and controls:
  - queue filters:
    - `Search`
    - `Status`
    - `Post`
    - `Moderator`
    - `Clear Filters`
  - moderation detail:
    - `Moderator`
    - `Moderation Reason`
  - actions:
    - `Approve`
    - `Reject`
    - `Mark Spam`
  - summary cards:
    - `Total Comments`
    - `Pending Review`
    - `Approved`
    - `Flagged`

## Deployment And Remote Execution Call Chains

### Pages delivery resolution chain
1. Caller hits one of:
   - `GET /pages/:pageId/delivery`
   - `GET /delivery/resolve?path=...`
2. [routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/routes.mjs) loads the page and decides preview vs published delivery path.
3. [page-delivery-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-delivery-runtime.mjs) builds:
   - primary source descriptor
   - additional data-source descriptors
   - resolved data payload
   - render model from `page-layouts`
   - follow-up routes
   - dependency/versioning keys
4. Pages settings are loaded through [page-settings-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-settings-runtime.mjs).
5. Browser-delivery state is applied through [browser-delivery-reference-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/browser-delivery-reference-runtime.mjs), adding:
   - `publicOrigin`
   - `publicUrl`
   - `publicMediaBaseUrl`
   - temporary deployment/media URLs
   - signed temporary object URLs for page and media access when `gcp-temporary` is backed by private GCS buckets
6. Response returns `{ ok, payload, timestamp }`.

### Pages local deployment sync chain
1. Caller triggers `POST /pages/:pageId/sync-deployment`.
2. Route checks page exists and `status = published`.
3. [page-deployment-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-deployment-runtime.mjs) chooses:
   - single-page artifact write
   - per-record artifact fan-out
4. For per-record mode:
   - [page-deployment-state-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-deployment-state-runtime.mjs) loads:
     - eligible source records
     - existing `page-deployment-artifacts`
     - settings/layout/page version tokens
   - resolved source entries are created
   - duplicate resolved paths are detected
   - each source becomes `synced`, `missing`, `stale`, `error`, or later `orphaned`
5. [page-deployment-render-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-deployment-render-runtime.mjs):
   - resolves final page payload
   - injects browser-delivery contract
   - renders HTML head/meta/canonical
   - injects mount tag
   - injects `application/json` payload script
   - injects runtime script URLs
   - writes `deployment/<path>/index.html`
6. Artifact rows are upserted in `page-deployment-artifacts`.
7. Final response returns updated page row plus deployment instances.

### Remote target compare/execute/restore chain
1. Caller triggers target route:
   - validate
   - compare
   - execute
   - restore
2. [remote-ops-target-routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-target-routes.mjs) loads:
   - target profile
   - linked connection profile
3. Route dispatches by `adapterMode`:
   - `simulated-gcp` -> simulated runtime files
   - `live-gcp` -> [remote-ops-live-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-live-runtime.mjs)
4. Live dispatch further branches by `targetKind`:
   - Firestore -> [remote-ops-live-firestore-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-live-firestore-runtime.mjs)
   - deployment/media storage -> [remote-ops-live-storage-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-live-storage-runtime.mjs)
   - browser delivery -> compare returns validation-only clean state; execute is unsupported
5. Route updates target row:
   - validation summary
   - compare summary
   - target status
   - `lastValidatedOn` / `lastComparedOn`
6. Route writes a `remote-operation-runs` row for every procedure.
7. Response returns the updated target item plus the run row.

### GCP compatibility and provisioning chain
1. Caller triggers:
   - `POST /connections/:connectionId/analyze-compatibility`
   - `POST /connections/:connectionId/provision-missing`
2. [remote-ops-provisioning-routes.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-provisioning-routes.mjs) loads:
   - connection profile
   - all target profiles linked to that connection
3. [remote-ops-gcp-compatibility-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-compatibility-runtime.mjs):
   - loads the project through the service-account token
   - tests project-level IAM permissions
   - inspects required APIs
   - inspects Firestore database existence
   - inspects storage buckets and bucket-level sync permissions
   - delegates browser-delivery analysis to [remote-ops-gcp-browser-delivery-compatibility-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-browser-delivery-compatibility-runtime.mjs)
   - returns bundle-level state:
     - `compatible`
     - `action-required`
     - `blocked`
4. `provision-missing` then calls [remote-ops-gcp-provisioning-execution-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-provisioning-execution-runtime.mjs):
   - enforces safeguard confirmations
   - filters requested action ids
   - enables APIs
   - creates default Firestore database
   - creates buckets
   - applies direct-storage website/public-read actions
   - delegates HTTPS delivery stack actions
   - reruns compatibility until no more ready actions remain or the iteration cap is hit
5. Route writes a run row and returns:
   - next compatibility report
   - executed action list

### Browser-delivery HTTPS stack chain
1. Browser-delivery target in `Remote Ops` uses:
   - `accessMode = custom-domain`
   - `stackMode = https-load-balancer`
2. Compatibility analysis delegates to:
   - [remote-ops-gcp-browser-delivery-compatibility-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-browser-delivery-compatibility-runtime.mjs)
3. That runtime:
   - reads linked deployment/media storage targets
   - builds a delivery descriptor through [browser-delivery-support.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/shared/browser-delivery-support.mjs)
   - inspects optional APIs:
     - `dns.googleapis.com`
     - `certificatemanager.googleapis.com`
     - `compute.googleapis.com`
   - inspects direct-storage linked bucket readiness or HTTPS stack readiness depending on mode
   - returns DNS instructions, temporary URLs, public URLs, and warnings
4. Provisioning delegates HTTPS actions to [remote-ops-gcp-browser-delivery-provisioning-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-browser-delivery-provisioning-runtime.mjs).
5. That runtime resolves managed names through [remote-ops-gcp-browser-delivery-stack-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-remote-ops/server/remote-ops-gcp-browser-delivery-stack-runtime.mjs) and executes:
   - managed zone
   - DNS authorization
   - managed certificate
   - certificate map
   - certificate map entry
   - global address
   - deployment/media backend buckets
   - URL map
   - target HTTPS proxy
   - forwarding rule
   - DNS A record
   - DNS authorization record
6. `Pages` does not own this infrastructure logic. It only consumes the resolved browser-delivery contract through settings.

## Current Remote/GCP Capabilities

### Firestore projection
- Implemented in `test-modules-remote-ops`
- Current proven source scopes:
  - `published-blog-posts`
  - `published-pages`
- Current embedded caller:
  - `Content`
- End-to-end live-proven:
  - compare local posts against Firestore
  - push create/update/delete according to target policy
- Current bounded scope:
  - not an arbitrary collection mirror
  - source scope is chosen through `projectionScope`

### Deployment storage
- Local source:
  - repo-root `deployment/`
- Current embedded caller:
  - `Pages`
- End-to-end live-proven:
  - compare local deployment tree with GCS bucket/prefix
  - sync objects

### Media storage
- Local source:
  - repo-root `media/`
- Current embedded caller:
  - `Media Manager`
- End-to-end live-proven:
  - compare media tree with GCS bucket/prefix
  - sync objects
  - restore missing local file from remote

### Browser delivery
- Current caller:
  - `Remote Ops`
  - consumed by `Pages`
- Current behavior:
  - target definition
  - validation
  - compatibility analysis
  - bounded provisioning for direct-storage and HTTPS load-balancer stack
  - temporary URL previews
  - DNS instructions
  - public URL contract injected into page payload/rendering
  - signed temporary page/media URLs injected into delivered payloads when temporary mode uses private GCS storage

## Exercised M04 Closeout Proof

### Live proof baseline
- Detailed record:
  - [m04-closeout-proof.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/m04-closeout-proof.md)
- Exercised on `2026-03-15` against:
  - local app runtime
  - real GCP project `merchant-guild`

### Practiced chain
1. validated the service-account-backed GCP connection
2. provisioned missing deployment/media buckets
3. normalized the release cohort to `10` published posts
4. created `10` closeout media items
5. assigned one category, one tag, and one media item per published post
6. created and published:
   - one post per-record page
   - one category per-record page
7. created and ran two named release bundles
8. verified:
   - local HTML output
   - Firestore projections
   - remote deployment/media storage sync
   - delivery payload/runtime contract
   - signed temporary access to remote HTML and media

### Practiced artifact set
- Posts page:
  - `blogpage-013`
  - `/post/{slug}`
  - `10` local/remote HTML outputs
- Category page:
  - `blogpage-014`
  - `/category/{id}`
  - `10` local/remote HTML outputs
- Release bundles:
  - `pagedepl-001`
  - `pagedepl-002`

## Active Module Field Inventory

### Editorial
- Collection `blog-authors`
  - `displayName`
  - `slug`
  - `legalName`
  - `bio`
  - `avatarMediaId`
  - `email`
  - `websiteUrl`
  - `socialLinks`
  - `role`
  - `status`
  - `locale`
  - `expertiseTagIds`
  - `createdOn`
  - `updatedOn`
  - `lastPublishedOn`

### Taxonomy
- Collection `blog-tags`
  - `name`
  - `slug`
  - `description`
  - `color`
  - `visibility`
  - `usageCount`
  - `seoTitle`
  - `seoDescription`
  - `createdOn`
  - `updatedOn`
- Collection `blog-categories`
  - `name`
  - `slug`
  - `description`
  - `parentCategoryId`
  - `path`
  - `depth`
  - `sortOrder`
  - `visibility`
  - `featuredMediaId`
  - `usageCount`
  - `createdOn`
  - `updatedOn`

### Content
- Settings
  - `remoteProjectionTargetProfileId`
- Collection `blog-posts`
  - `title`
  - `slug`
  - `subtitle`
  - `excerpt`
  - `body`
  - `status`
  - `format`
  - `primaryAuthorId`
  - `coAuthorIds`
  - `categoryIds`
  - `tagIds`
  - `featuredMediaId`
  - `galleryMediaIds`
  - `allowComments`
  - `commentPolicy`
  - `canonicalUrl`
  - `seoTitle`
  - `seoDescription`
  - `ogTitle`
  - `ogDescription`
  - `ogImageMediaId`
  - `scheduledOn`
  - `publishedOn`
  - `archivedOn`
  - `readTimeMinutes`
  - `wordCount`
  - `locale`
  - `translationGroupId`
  - `createdByAuthorId`
  - `updatedByAuthorId`
  - `createdOn`
  - `updatedOn`
- Collection `blog-post-revisions`
  - `postId`
  - `revisionNumber`
  - `titleSnapshot`
  - `subtitleSnapshot`
  - `excerptSnapshot`
  - `bodySnapshot`
  - `taxonomySnapshot`
  - `mediaSnapshot`
  - `seoSnapshot`
  - `statusSnapshot`
  - `scheduledOnSnapshot`
  - `publishedOnSnapshot`
  - `archivedOnSnapshot`
  - `changeSummary`
  - `source`
  - `isAutosave`
  - `changedByAuthorId`
  - `changedOn`
  - `contentHash`

### Engagement
- Collection `blog-comments`
  - `postId`
  - `parentCommentId`
  - `authorDisplayName`
  - `authorEmail`
  - `body`
  - `status`
  - `moderationReason`
  - `approvedByAuthorId`
  - `approvedOn`
  - `createdOn`
  - `updatedOn`

### Pages
- Settings
  - `appMountTagName`
  - `remoteDeploymentTargetProfileId`
  - `remoteBrowserDeliveryTargetProfileId`
- Collection `blog-pages`
  - `title`
  - `pageKind`
  - `primarySourceType`
  - `path`
  - `deploymentMode`
  - `sourceSelectionMode`
  - `pathPattern`
  - `layoutId`
  - `layoutKey`
  - `layoutModel`
  - `primarySource`
  - `dataSources`
  - `runtimeScriptUrls`
  - `renderPolicy`
  - `status`
  - `canonicalUrl`
  - `seoTitle`
  - `seoDescription`
  - `ogTitle`
  - `ogDescription`
  - `ogImageMediaId`
  - `scheduledOn`
  - `publishedOn`
  - `archivedOn`
  - `deploymentArtifactPath`
  - `deploymentStatus`
  - `deploymentTargetCount`
  - `deploymentSyncedCount`
  - `deploymentStaleCount`
  - `deploymentMissingCount`
  - `deploymentSyncedOn`
  - `deploymentLastRunOn`
  - `createdOn`
  - `updatedOn`
- Collection `page-deployment-artifacts`
  - `pageId`
  - `sourceType`
  - `sourceItemId`
  - `sourceLabel`
  - `resolvedPath`
  - `artifactRelativePath`
  - `status`
  - `staleReasonSummary`
  - `pageVersionToken`
  - `sourceVersionToken`
  - `layoutVersionToken`
  - `settingsVersionToken`
  - `payloadHash`
  - `htmlHash`
  - `lastSyncedOn`
  - `lastEvaluatedOn`
  - `lastErrorMessage`
  - `createdOn`
  - `updatedOn`
- Collection `blog-redirect-rules`
  - `sourcePath`
  - `targetPageId`
  - `targetUrl`
  - `httpCode`
  - `status`
  - `reason`
  - `createdOn`
  - `updatedOn`

### Layouts
- Collection `page-layouts`
  - `title`
  - `layoutKey`
  - `summary`
  - `status`
  - `rootLayoutMode`
  - `layoutDocumentJson`
  - `createdOn`
  - `updatedOn`

### Media Manager
- Settings
  - `remoteMediaTargetProfileId`
- Collection `media-items`
  - `displayName`
  - `mediaKind`
  - `mimeType`
  - `fileSizeBytes`
  - `width`
  - `height`
  - `status`
  - `altText`
  - `description`
  - `category`
  - `usageLabels`
  - `isDerived`
  - `sourceMediaId`
  - `operationPreset`
  - `storageKey`
  - `relativePath`
  - `createdOn`
  - `updatedOn`

### Remote Ops
- Collection `remote-connection-profiles`
  - `profileName`
  - `provider`
  - `environmentLabel`
  - `authMode`
  - `credentialPathHint`
  - `serviceAccountEmail`
  - `serviceAccountKeyId`
  - `projectId`
  - `projectNumber`
  - `projectDisplayName`
  - `operatorEmail`
  - `region`
  - `credentialLabel`
  - `connectionStatus`
  - `lastConnectedOn`
  - `lastValidatedOn`
  - `validationSummary`
- Collection `remote-target-profiles`
  - `title`
  - `connectionProfileId`
  - `targetKind`
  - `adapterMode`
  - `config`
  - `policy`
  - `targetStatus`
  - `lastValidatedOn`
  - `lastComparedOn`
  - `validationSummary`
  - `compareSummary`
- Collection `remote-operation-runs`
  - `title`
  - `connectionProfileId`
  - `targetProfileId`
  - `procedureType`
  - `scopeKind`
  - `direction`
  - `dryRun`
  - `status`
  - `message`
  - `summary`
  - `startedOn`
  - `finishedOn`

## Current Capability Summary

### What the repo can do now
- manage authors, categories, tags, posts, pages, layouts, media, and remote targets
- generate deterministic static HTML for pages and per-record post templates
- inject mount tag, runtime script tags, and page JSON into deployed HTML
- manage reusable layouts separately from pages
- sync published posts to Firestore
- sync deployment HTML to remote storage
- sync media files to remote storage
- restore local media from remote storage
- configure browser-delivery targets and make page output domain-aware
- provide a standalone browser client runtime package with:
  - data layer
  - action layer
  - local caching/storage
  - generic remote HTTP demo

### What is still partial or bounded
- category/tag per-record template fan-out is not delivered at the same maturity as post templates
- taxonomy projection to Firestore is not delivered
- browser delivery is GCP-bounded, not cross-provider generic
- direct-storage custom domain path is still HTTP-oriented
- north-star strictness and tighter workflow policies are not fully applied yet

## Current Documentation Sources
- active contracts:
  - [docs/contracts/contract-index.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/contracts/contract-index.md)
  - [docs/contracts/delivery-scope-contract.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/contracts/delivery-scope-contract.md)
  - [docs/contracts/quality-gate-contract.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/contracts/quality-gate-contract.md)
- key module contracts:
  - [test-modules-pages-module-contract.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/contracts/test-modules-pages-module-contract.md)
  - [test-modules-remote-ops-module-contract.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/contracts/test-modules-remote-ops-module-contract.md)
  - [test-modules-layouts-module-contract.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/contracts/test-modules-layouts-module-contract.md)
  - [client-runtime-contract.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/contracts/client-runtime-contract.md)
- GCP research:
  - [gcp-sync-services-memo.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/gcp-sync-services-memo.md)

## Residual Gaps In This Current-state Doc
- request and response payloads are summarized, not shown as full sample JSON fixtures
- generic reference-domain CRUD routes are described structurally, not enumerated endpoint-by-endpoint
- north-star future design is intentionally excluded; this doc only maps what exists now
