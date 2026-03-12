# Client Runtime Contract

## Objective
- Deliver a standalone browser runtime package that can be injected into deployed HTML and expose a stable global query/action API without coupling the implementation to the existing `frontend/` or `server/` libraries.

## Delivery Surface
- `client-runtime/`
- minimal root-script changes required to build/test the package
- minimal contract/handoff updates required to keep the work compact-safe

## Public Contract
- Global shell:
  - `window.dataLayer.query(request)`
  - `window.dataLayer.installDataset(request)`
  - `window.dataLayer.syncDataset(request)`
  - `window.actionLayer.dispatch(request)`
- The public contract must stay thin and stable.
- Internal logic must run through a runtime instance, not directly through `window`.

## Core Boundaries
- Queries and actions are separate concerns.
- Policy selection must live in registries/runtime configuration, not in app-specific UI code.
- IndexedDB is a queryable local source for installed datasets, not just a key-value cache.
- Cached response mode and installed dataset mode must remain explicit and separate.
- The package must degrade cleanly when network, Cache Storage, or IndexedDB are unavailable.

## Package Boundary
- The runtime lives in its own workspace package under `client-runtime/`.
- It may share zero runtime code with `frontend/` or `server/` unless a later contract explicitly approves extraction.
- Any browser-ready artifact must be produced from this package, not handcrafted inside page deployment code.

## V1 Scope
- Query registry
- Action registry
- Memory adapter
- Remote transport adapter
- IndexedDB adapter with meaningful local query support
- Cache Storage adapter where available
- Dataset manager with install/sync/status metadata
- Capability/connectivity monitor
- Result metadata for every query/action
- Browser-ready global runtime artifact

## V1 Policy Scope
- Query policies:
  - `remote-only`
  - `cache-first`
  - `network-first`
  - `local-first`
  - `local-only`
- Action policies:
  - `remote-required`
  - `remote-with-local-update`

## V1 Non-Goals
- generalized offline action queue
- collaborative conflict resolution
- advanced relational planner
- CRDT/merge engine
- browser-delivery integration into deployed pages as part of the initial scaffold unless required to prove the artifact path

## Verification Requirements
- package-level focused tests must cover:
  - registry-driven query resolution
  - action dispatch behavior
  - dataset install/sync metadata
  - IndexedDB local query behavior
  - degraded execution behavior
  - global shell exposure
- the package must have an explicit build step that produces a browser-ready artifact

## Active Plan Pointer
- Execution plan:
  - `docs/contracts/client-runtime-v1-plan.md`
