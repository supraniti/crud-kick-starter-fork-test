# Common Tasks Playbook

## Purpose
- Provide a compact operational checklist for recurring repo workflows.

## Read First
1. `handoff.md`
2. `docs/command-registry.md`
3. `docs/core-standards.md`

## 60-Second Session Bootstrap
1. Confirm command slots in `docs/command-registry.md` are current.
2. Run lint and fast gate:
   - `pnpm lint:repo-loc`
   - `pnpm lint:function-shape`
   - `pnpm quality:gate`

## Frequent Commands
1. Lint:
   - `pnpm lint:repo-loc`
   - `pnpm lint:function-shape`
2. Fast quality gate:
   - `pnpm quality:gate`
3. Full release gate:
   - `pnpm quality:gate:full`
4. Frontend build:
   - `pnpm --filter frontend build`
5. API baseline runners:
   - `pnpm api-runner:m22 -- --no-write-reports`
   - `pnpm api-runner:m26 -- --no-write-reports`
6. Dev services:
   - `pnpm dev:server`
   - `pnpm dev:frontend`

## Manual Review App Run
1. Follow the review-start protocol in `docs/command-registry.md`; do not improvise port or host assumptions.
2. Inspect `3000` / `3001` first and reuse the existing healthy repo-owned pair when it is already valid.
3. Verify the backend with `http://127.0.0.1:3001/health` before starting the frontend handoff.
4. Verify the frontend with `http://localhost:3000` before telling the user the app is live.
5. If either check fails, inspect logs and fix the run first; do not ask the user to debug a half-live instance.
6. If reuse is not safe, stop the old pair before starting a new one.
7. Stop review processes before running `pnpm quality:gate:full`.

## When A Task Fails
1. Record exact command and error under `handoff.md` next-actions/notes before pause.
2. Classify as environment/tooling issue or product behavior issue.
3. If command changed, update `docs/command-registry.md` in the same slice.
