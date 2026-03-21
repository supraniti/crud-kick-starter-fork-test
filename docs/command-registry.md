# Command Registry

## Purpose
- Keep one canonical command map for lint, test, build, and quality verification.

## Status
- Last updated: 2026-03-20
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
- `REVIEW_ENV_START_CMD` = `pnpm review:env:start`
- `REVIEW_ENV_STOP_CMD` = `pnpm review:env:stop`
- `REVIEW_ENV_STATUS_CMD` = `pnpm review:env:status`
- `REVIEW_ENV_VERIFY_CMD` = `pnpm review:env:verify`
- `DEVELOPER_DESK_MAP_CMD` = `pnpm developer:desk-map`
- `APP_URL` = `http://localhost:3000`
- `PORTS_TO_CLEAR` = `3000,3001`

## Local App Run Quick Guide
- Default review startup on this machine:
  - `pnpm review:env:start`
- Default review shutdown:
  - `pnpm review:env:stop`
- Default review status check:
  - `pnpm review:env:status`
- Default review usability check:
  - `pnpm review:env:verify`
- Developer desk map:
  - `pnpm developer:desk-map`
- What the review launcher does:
  - clears listeners on `3000` and `3001`
  - starts backend on `127.0.0.1:3001`
  - prefers a live frontend on `localhost:3000`, then falls back to the repo-owned static frontend if needed
  - verifies:
    - frontend HTML on `localhost:3000`
    - backend health on `127.0.0.1:3001/health`
    - proxied backend JSON on `localhost:3000/api/system/ping`
    - proxied backend JSON on `localhost:3000/api/reference/modules`
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
- Treat `pnpm review:env:verify` as the truthful review contract. A healthy root page without healthy proxied API responses is not a valid review app.
- If server restart logs show `EADDRINUSE` on `127.0.0.1:3001`, do not assume the review app is healthy. A stale listener must be cleared before the run is considered valid.
- A successful `Start-Process` is not evidence that the app is live. The authoritative check is successful HTTP verification against both the frontend and the proxied API surface.
