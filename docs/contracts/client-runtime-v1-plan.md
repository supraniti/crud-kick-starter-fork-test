# Client Runtime V1 Plan

## Goal
- Deliver the first usable standalone client runtime package for remote browser execution with a thin global shell and modular internals.

## Current Repository Context
- Deployed HTML already supports:
  - mount element injection
  - runtime script URL injection
  - embedded page payload JSON
- The missing piece is the actual runtime script that consumes that payload and exposes a stable query/action contract.
- Current injected script URLs are placeholders such as `/assets/runtime/entry.js`; there is no dedicated runtime package behind them yet.

## Approved Package Direction
- Create a separate workspace package:
  - `client-runtime/`
- Package outputs:
  - source modules under `client-runtime/src/`
  - tests under `client-runtime/test/`
  - browser-ready artifact under `client-runtime/dist/`
- Keep the implementation self-owned; do not spread runtime concerns across `frontend/` or `server/`.

## Implementation Milestones

### Milestone 1
- Create package boundary and build/test wiring
- Define request/result shapes
- Implement registries and runtime core shell
- Expose global `window.dataLayer` / `window.actionLayer`
- Status:
  - completed on 2026-03-12

### Milestone 2
- Implement query/action execution core
- Add memory and remote adapters
- Add capability monitor and result metadata
- Cover policy-driven resolution in tests
- Status:
  - completed on 2026-03-12

### Milestone 3
- Implement dataset manager and IndexedDB adapter
- Implement constrained local query engine:
  - equality filters
  - range filters
  - sorting
  - paging
  - field projection
- Add Cache Storage adapter where useful
- Status:
  - completed on 2026-03-12

### Milestone 4
- Produce browser-ready artifact
- Add a minimal browser bootstrap example or smoke proof
- Wire root scripts/tests so the package is verifiable in repo workflows
- Status:
  - completed on 2026-03-12

## Key Design Decisions To Preserve
- Global API is boring; internals are modular.
- Dataset install/sync is first-class.
- IndexedDB is treated as a real query surface.
- Degraded execution is explicit and metadata-rich.
- Cache response storage and installed datasets stay distinct.

## Delivery Notes
- If browser-injection integration into page deployment is needed later, treat that as a separate follow-up slice unless it is required to prove artifact viability.
- Keep the initial artifact path simple and deterministic so later modules can point runtime script URLs at it without bespoke logic.
- Current artifact outputs:
  - `client-runtime/dist/client-runtime.global.js`
  - `client-runtime/dist/client-runtime.esm.js`
- Minimal browser proof:
  - `client-runtime/examples/basic-runtime-proof.html`
  - `client-runtime/examples/playground.html`
