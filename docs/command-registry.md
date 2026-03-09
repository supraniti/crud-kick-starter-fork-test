# Command Registry

## Purpose
- Keep one canonical command map for lint, test, build, and quality verification.

## Status
- Last updated: 2026-03-08
- Owner: delivery-maintenance
- Confidence: verified against current repo scripts

## Command Slots
- `LINT_CMD` = `pnpm lint:repo-loc && pnpm lint:function-shape`
- `TYPECHECK_CMD` = `N/A (no standalone typecheck lane in this repo)`
- `TEST_FAST_CMD` = `pnpm quality:gate`
- `TEST_FULL_CMD` = `pnpm quality:gate:full`
- `BUILD_CMD` = `pnpm --filter frontend build`
- `QUALITY_GATE_CMD` = `pnpm quality:gate:full`
- `DUPLICATION_CHECK_CMD` = `N/A (no dedicated duplication scanner; enforce via lint/function-shape + review)`
- `DEV_SERVER_CMD` = `pnpm dev:server`
- `DEV_FRONTEND_CMD` = `pnpm dev:frontend`
- `APP_URL` = `http://localhost:3000`
- `PORTS_TO_CLEAR` = `3000,3001`

## Local App Run Quick Guide
- Start backend first:
  - `pnpm dev:server`
- Start frontend second:
  - `pnpm dev:frontend`
- Open the app at:
  - `http://localhost:3000`
- Health check the API at:
  - `http://127.0.0.1:3001/health`

## Run Notes
- Prefer `localhost:3000` for the frontend URL. On this machine, Vite bound reliably to `localhost`; direct `127.0.0.1:3000` checks were not consistently usable during review runs.
- Clear listeners on `3000` and `3001` before starting a fresh review session if a previous app or smoke run may still be alive.
- Do not leave the review app running before `pnpm quality:gate:full`; the smoke lane boots its own server pair and will fail if `3001` is already occupied.
- If you capture logs under `.codex-runtime`, use unique timestamped filenames per run. Reusing the same redirected log path can leave a stale file handle behind and break the next launch.
- If Vite boot fails with sandbox-style `spawn EPERM`, rerun the app start outside the sandbox; this repo’s frontend boot path relies on child-process spawning through Vite/esbuild.
