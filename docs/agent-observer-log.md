# Agent Observer Log

## Purpose
- Capture short process and contract observations from real execution slices.
- Preserve lessons that help future agents move faster with less drift.
- This file is supplemental only. `handoff.md` remains the single live progress pointer.

## Update Rules
1. Append short dated entries after meaningful slices.
2. Keep notes process-focused: task shape, what was easy, what was hard, and what should improve in contracts/process.
3. Do not duplicate live next actions or closure evidence that belongs in `handoff.md`.

## Entries

### 2026-03-06 - Orientation Baseline
- Tasks:
  - cloned the repo into the workspace
  - mapped repo purpose, contracts, workflow, and extension order
  - installed dependencies
  - ran baseline lanes
  - exercised the live UI in Chrome
- Easy:
  - contract discovery is straightforward because the root README, command registry, and contract index agree on the core entry points
  - module manifests make capabilities, settings, runtime hooks, and collections easy to inspect quickly
  - frontend view registration and module entrypoint discovery are structured enough to follow without guesswork
- Hard:
  - the command registry app URL is stale relative to the current frontend config, which weakens first-run reliability
  - the repo baseline is close to green but not clean because server conformance currently times out in four cases on this machine
  - remotes/missions operator routes are implemented, but their discoverability in the live shell is weaker than the main module routes
- Improve:
  - keep `docs/command-registry.md` aligned with actual frontend port behavior
  - document secondary operator routes more explicitly so fresh agents know where remotes and missions live
  - keep a compact orientation snapshot in `handoff.md` after environment bring-up so later sessions do not need to rediscover the same baseline

### 2026-03-06 - Media Manager Contracting
- Tasks:
  - translated the ticket into a concrete module contract
  - resolved the delivery-scope decision by expanding active module surface to six with explicit user approval
  - identified the missing module-owned HTTP route seam as the likely first core edit
- Easy:
  - the ticket already separated stages, non-goals, and acceptance criteria cleanly enough to map into the contract template
  - the delivery-scope constraint was easy to settle once the user approved expansion instead of retirement
- Hard:
  - the repo has a strong module runtime for collections, services, persistence, and missions, but no matching server route registrar for module-owned endpoints
  - module contracts are expected by process, but there is no standing convention yet for where approved per-module contract files should live
- Improve:
  - add a documented home for approved module contracts so future agents do not improvise naming/location
  - consider formalizing module-owned HTTP route registration as a first-class runtime capability instead of rediscovering the gap per module

### 2026-03-07 - Media Manager Delivery Closure
- Tasks:
  - delivered the media-manager module across server routes, persistence, missions, frontend workspace, and tests
  - repaired isolated verification so API runners and smoke lanes stop inheriting persisted module runtime state
  - closed the loop by updating the official server-core lane and manifest to include the new regression test
- Easy:
  - once module-owned route registration existed, the media-manager feature work stayed mostly local to the module boundary
  - the repo's dynamic lane runner and quality gate made end-to-end confirmation straightforward after the state-isolation bug was fixed
- Hard:
  - explicit `null` intent was lost across a config boundary because a `??` fallback silently re-enabled the default runtime-state file
  - adding a new test file is not enough in this repo; hard-coded lane scripts and the lane manifest both need to be kept in sync or the guard never runs
  - targeted Vitest commands can behave differently from approved repo lanes under sandbox constraints, so repo-native commands are the reliable source of truth
- Improve:
  - prefer an explicit helper for option resolution when `null` is a meaningful configuration value
  - reduce reliance on duplicated hard-coded test-file lists by generating lane commands from the manifest or enforcing parity automatically
  - document which verification commands are considered authoritative when sandbox behavior differs between direct tool invocations and repo scripts

### 2026-03-07 - Media Storage Root Follow-up
- Tasks:
  - traced live uploads to a cwd-sensitive nested runtime path (`server/server/runtime/media-library`)
  - normalized the default storage root to a repo-root `media/` directory
  - added a focused regression check so default root resolution does not drift back to process-cwd behavior
- Easy:
  - the relative-path storage model already separated item metadata from absolute filesystem location, so moving the root did not require schema changes
  - the existing env override (`REFERENCE_MEDIA_LIBRARY_ROOT_DIR`) made the contract shape already compatible with a fixed default root
- Hard:
  - runtime paths defined with `path.resolve(...)` on relative strings silently depend on the current working directory, which changed between repo-root and package-root launch patterns
  - filesystem behavior was correct in tests because they override the root, while the mismatch only appeared in the live browser run
- Improve:
  - prefer module-location-anchored or repo-root-anchored runtime paths for persisted artifacts
  - include one live-run filesystem assertion in module tickets where the acceptance criteria depend on durable files, not just API records
