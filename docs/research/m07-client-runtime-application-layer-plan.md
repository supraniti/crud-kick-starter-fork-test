# M07 Client Runtime Application Layer Plan

## Purpose
- Keep `client-runtime` as the reusable engine:
  - `window.dataLayer.*`
  - `window.actionLayer.*`
- Add a second injected script that acts as a temporary application layer for deployed-page testing.
- Make the deployed page capable of exercising real remote read/write flows through the runtime contract, not through local-only shortcuts.

## What This Program Must Deliver
1. The runtime layer stays generic and reusable.
2. The application layer is a separate injected script, temporary by intent.
3. Deployed pages can visibly exercise:
   - local runtime state
   - IndexedDB install/query
   - remote published-data reads
   - at least one real write/action flow
4. The application layer talks to the runtime API, not to private page internals.
5. The public deployed page uses only deployable boundaries:
   - same-origin deployed assets
   - public remote endpoints
   - real write endpoints
   - no dependency on `127.0.0.1`

## Current State
- Delivered:
  - `client-runtime` is injected into deployed HTML.
  - `window.dataLayer` and `window.actionLayer` are available.
  - deployed HTML injects a separate `application-tester` contract and assets.
  - the tester panel renders only when `?appTester=1` or `?runtimeProbe=1` is present.
  - the tester can:
    - render a referenced image
    - read the published snapshot through `window.dataLayer.query(...)`
    - install/query that document through IndexedDB using `window.actionLayer` and `window.dataLayer`
    - when browser-delivery includes Firebase browser config and the page resolves a published Firestore descriptor:
      - read the projected Firestore document directly from the browser through the runtime layer
      - submit a pending comment directly to Firestore through the runtime action layer
- Remaining external requirement:
  - live activation of the direct-browser Firestore path needs real Firebase web-app config and Firestore security rules in the remote project.

## Required Architecture

### 1. Runtime Layer
- Ownership:
  - `client-runtime/`
- Responsibilities:
  - query execution
  - dataset install/sync
  - IndexedDB/cache/memory handling
  - action dispatch
  - remote transport
- Constraint:
  - no page-specific UI inside runtime

### 2. Application Layer
- Ownership:
  - Pages/deployment injection
- Responsibilities:
  - visible test UI
  - calls into `window.dataLayer` / `window.actionLayer`
  - renders probe/test output
  - replaceable later by real applications
- Constraint:
  - must be injected as a separate script from the runtime itself

### 3. Remote Data Boundary
- Read flows must come from one of these:
  1. same-origin deployed JSON sidecars
  2. public Firestore read if rules make it truly public
  3. a real remote HTTP API intentionally exposed for deployed pages
- Write flows must come from one of these:
  1. a bounded public app API
  2. existing comments-style write endpoint
  3. future app-owned action endpoints
- Non-acceptable boundary:
  - local backend routes on `127.0.0.1`

## Product Direction Locked By This Plan
- We are not building one monolithic injected script.
- We are building:
  - generic runtime engine
  - temporary application tester script
  - later, additional application scripts on the same runtime API

## Planned Passes

### Pass 1. Application Layer Contract
- Define the injected application-tester contract:
  - script url
  - enable/disable flag
  - visible panels/actions
  - page capability flags
- Output:
  - dedicated server/runtime contract doc
  - Pages preview surface for that contract

### Pass 2. Replace Probe With Application Tester Shell
- Replace the current ad hoc probe panel with a separate injected tester script.
- Keep it small and temporary.
- Initial tester flows:
  - render referenced image
  - show runtime availability
  - show dataset status
  - run remote read
  - run IndexedDB install/query

### Pass 3. Real Remote Read Contract
- Stop treating the same-origin sidecar as the only remote read seam.
- Add a real runtime-readable remote dataset contract for published content.
- Delivered route:
  1. direct browser Firestore when browser-delivery carries Firebase web-app config
  2. local review can still fall back to the bounded public app API path when needed
- Output:
  - runtime query definition for published document retrieval
  - application tester button that exercises it through `dataLayer.query(...)`

### Pass 4. Real Remote Write Contract
- Add one real action flow.
- First target:
  - comment creation or equivalent bounded write flow
- Requirements:
  - action definition in runtime config
  - visible tester UI control
  - remote write result displayed back in the page
  - no hidden private-local dependency

### Pass 5. Replaceable Multi-App Injection Shape
- Formalize injected app layering:
  - runtime script
  - optional tester app
  - future real apps
- Output:
  - deployment config supports one or more application-layer scripts
  - page render order is deterministic
  - runtime remains the shared base

### Pass 6. Pages Authoring And Inspection
- Extend Pages-side runtime inspection so the operator can see:
  - runtime asset
  - application-tester asset
  - query registry
  - action registry
  - remote endpoints used by the page
- Goal:
  - make the injected application contract inspectable before deployment

### Pass 7. End-To-End Proof
- Rehearse a live deployed page with:
  - image render
  - remote published data read through runtime
  - IndexedDB install/query
  - real write action
- Verify both:
  - local app preview
  - remote deployed page behavior

## Exit Criteria
- Deployed page loads:
  - runtime engine
  - separate application tester script
- Application tester can:
  - render referenced image
  - read remote data through runtime query API
  - install/query data through IndexedDB via runtime
  - dispatch at least one real remote write action
- The runtime/app split is visible in code and in injected page output.
- Pages desk can inspect the contract before deployment.

## Environment Constraint And Fix
- Review runs on this machine must stop depending on Vite dev boot.
- Stable review path is now:
  - build frontend once
  - serve `frontend/dist` through repo-owned static server on `3000`
  - run backend on `3001`
- Canonical commands:
  - `pnpm review:env:start`
  - `pnpm review:env:status`
  - `pnpm review:env:stop`

## Current Position
- Pass 1: delivered
- Pass 2: delivered
- Pass 3: delivered
- Pass 4: delivered
- Pass 5: delivered
- Pass 6: delivered
- Pass 7: delivered

## Delivered Boundary
- Deployed page output now injects:
  - `window.__CRUD_CLIENT_RUNTIME_CONFIG__`
  - `window.__CRUD_PAGE_APPLICATION_TESTER__`
  - `assets/client-runtime.global.js`
  - `assets/page-application-tester-firestore.global.js`
  - `assets/page-application-tester-support.global.js`
  - `assets/page-application-tester.global.js`
- The runtime stays generic.
- The application tester is a separate injected application-layer script.
- The application tester can:
  - render the referenced image
  - read the published snapshot through `window.dataLayer.query(...)`
  - read the Firestore-projected document directly from the browser through `window.dataLayer.query(...)` when Firebase browser config is present
  - install/query the document through IndexedDB using `window.actionLayer` and `window.dataLayer`
  - submit a real pending comment directly to Firestore through `window.actionLayer.dispatch(...)` when Firebase browser config is present
- Pages desk inspection now exposes:
  - direct Firestore URL
  - browser tester Firebase config summary
  - public published-document API path when the bounded app API route is still used
  - public comments API path when the bounded app API route is still used
  - application API origin query-param contract

## Browser-Proved Review Path
- Canonical review environment:
  - `pnpm review:env:start`
  - `pnpm review:env:status`
  - `pnpm review:env:stop`
- Canonical proof URL:
  - `http://localhost:3000/published/post/remote-flow-review-post-01/index.html?appTester=1`
- Browser-verified flows:
  - featured image render
  - published snapshot read
  - IndexedDB install/query
  - direct browser Firestore read/write is now repo-supported and contract-tested, but still depends on live Firebase config + rules for public remote proof

## Important Boundary
- The simpler delivered route is direct browser Firestore, not a second deployed backend.
- To activate that path live, the operator still needs:
  - Firebase web-app config for the chosen project
  - Firestore security rules that intentionally allow the bounded public read/write flows
- This slice delivers the runtime/app split and the direct-browser contract inside the repo.
