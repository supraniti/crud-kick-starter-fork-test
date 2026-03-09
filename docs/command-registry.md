# Command Registry

## Purpose
- Keep one canonical command map for lint, test, build, and quality verification.

## Status
- Last updated: 2026-03-09
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
- Manual review startup protocol on this machine:
  - inspect `3000` / `3001` first; if the existing pair already belongs to this repo and both endpoints verify healthy, reuse it instead of spawning another pair
  - clear listeners on `3000` and `3001` first if a previous review run or smoke lane may still be alive
  - start backend first and wait for a healthy response from `http://127.0.0.1:3001/health`
  - start frontend second and verify `http://localhost:3000` returns HTML before telling the user the app is live
  - do not announce a review URL until both checks succeed
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
- Prefer `127.0.0.1:3001/health` only for the API health check. Do not mirror that host choice onto the frontend URL.
- Reuse a healthy verified `3000` / `3001` pair from this repo when possible; otherwise stop it before starting a fresh pair.
- Clear listeners on `3000` and `3001` before starting a fresh review session if a previous app or smoke run may still be alive.
- Do not leave the review app running before `pnpm quality:gate:full`; the smoke lane boots its own server pair and will fail if `3001` is already occupied.
- If you capture logs under `.codex-runtime`, use unique timestamped filenames per run. Reusing the same redirected log path can leave a stale file handle behind and break the next launch.
- If Vite boot fails with sandbox-style `spawn EPERM`, rerun the app start outside the sandbox; this repo’s frontend boot path relies on child-process spawning through Vite/esbuild.
- If server restart logs show `EADDRINUSE` on `127.0.0.1:3001`, do not assume the review app is healthy. A stale listener must be cleared before the run is considered valid.
- A successful `Start-Process` is not evidence that the app is live. The authoritative check is successful HTTP verification against both the frontend and the API.
