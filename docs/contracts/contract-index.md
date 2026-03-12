# Contract Index

## Purpose
- Define the active delivery contracts and the exact machine-read artifacts used by quality and runtime checks.

## Active Contracts
1. `docs/contracts/delivery-scope-contract.md`
2. `docs/contracts/quality-gate-contract.md`
3. `docs/contracts/blog-management-module-set-contract.md`
4. `docs/contracts/test-modules-remote-ops-module-contract.md`
5. `docs/contracts/client-runtime-contract.md`

## Active Artifacts
1. `docs/contracts/artifacts/server-lane-manifest-v1.json`
2. `docs/contracts/artifacts/frontend-lane-manifest-v1.json`
3. `docs/contracts/artifacts/module-id-alias-map-v1.json`
4. `docs/contracts/artifacts/deterministic-replay-results.json`

## Contract Usage
- `scripts/protocol-integrity-check.mjs` verifies that all active contracts and artifacts exist and are referenced here.
- `scripts/quality-gate.mjs` enforces delivery checks and executes runtime/test verification lanes.
- Module-specific delivery contracts for active tickets may live alongside these files even when only the coordinating module-set contract is indexed here.

