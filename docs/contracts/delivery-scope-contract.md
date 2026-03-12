# Delivery Scope Contract

## Objective
- Keep the repository delivery-ready with only active runtime, tests, and docs.

## Included Delivery Surfaces
- `server/`
- `frontend/`
- `client-runtime/`
- `modules/`
- `e2e/`
- `scripts/`
- `docs/contracts/`

## Exclusion Rules
- Archive-only folders are not allowed in active delivery scope.
- Historical protocol trees are not allowed in active delivery scope.
- Any artifact without active runtime/test/contract usage must be removed.

## UI Boundary Rules
- Default to the existing MUI component surface and established MUI-based patterns.
- Do not introduce native HTML controls in place of existing MUI components unless the user gives explicit approval first.
- Do not introduce shared/core frontend component refactors as part of feature work unless the user gives explicit approval first.

## Review Run Discipline
- When a task requires live browser review, the agent must treat app startup as a verified workflow, not a best-effort launch.
- On this Windows machine, if local dev servers hit sandbox `spawn EPERM`, review startup must be run outside the sandbox.
- The agent must not say the app is live until both checks succeed:
  - `http://127.0.0.1:3001/health`
  - `http://localhost:3000`
- Frontend review URLs must use `localhost` unless a later verified command-registry update says otherwise.
- Before starting a fresh review pair, the agent must inspect `3000` / `3001` and reuse the existing verified repo-owned pair when safe.
- Before a fresh review launch, the agent must clear or account for stale listeners on `3000` and `3001`.
- Before running `pnpm quality:gate:full`, the agent must stop any manually started review app processes that occupy the repo ports.

## Module Scope
- Active module surface is limited to:
  - `modules/test-modules-crud-core`
  - `modules/test-modules-relations-taxonomy`
  - `modules/test-modules-settings-policy`
  - `modules/test-modules-operations-dispatch`
  - `modules/test-modules-remotes-publish`
  - `modules/test-modules-media-manager`
  - `modules/test-modules-content`
  - `modules/test-modules-pages`
  - `modules/test-modules-layouts`
  - `modules/test-modules-remote-ops`
  - `modules/test-modules-engagement`
  - `modules/test-modules-editorial`
  - `modules/test-modules-taxonomy`

