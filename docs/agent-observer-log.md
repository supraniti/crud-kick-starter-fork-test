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

### 2026-03-09 - T02 Standalone Pages Kickoff
- Tasks:
  - audited the T01 `Pages` module against the standalone-pages ticket
  - identified the exact post-derived coupling points in schema, routes, UI, and tests
  - updated the contracts and handoff before implementation so T02 has an explicit repo-level target
- Easy:
  - the repo already supports structured descriptors through `structured-object` and `structured-object-array`, so standalone page contracts can stay module-local
  - module-owned custom route views and module-owned HTTP routes are already present, so a standalone pages desk does not require broad core work
- Hard:
  - the T01 coupling is deep: content mutation hooks, content-editor save flow, pages schema, pages workspace composition, and conformance tests all still assume one page per post
  - the previous T01 contract file name (`blog-distribution`) was already conceptually stale for the new standalone-pages target
- Improve:
  - when a module changes from transitional to long-term ownership, rename or replace the module contract immediately so later sessions do not inherit stale terminology
  - record coupling points before implementation whenever a ticket explicitly asks to reverse a previous transition model

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

### 2026-03-07 - Blog Ticket Reset
- Tasks:
  - reviewed the abandoned blog implementation
  - extracted postmortem artifacts and a restart plan
  - stashed the implementation so only recovery docs remain visible
  - re-ran baseline validation after the stash
- Easy:
  - the bad pattern was obvious once the delta was inventoried: too much code landed in a new shared server blog layer instead of module-local surfaces
  - the ticket itself was still clear enough to rewrite as a clean restart plan
- Hard:
  - the repo’s raw `pnpm test` and the official gate do not currently tell the same story on the cleaned baseline
  - once the blog code was stashed, baseline failures remained in module-id alignment and boolean-filter expectations, so the repo is not fully green from the committed state alone
- Improve:
  - require an explicit capability-gap audit before any Level 3 or Level 4 work starts
  - require a per-ticket checkpoint that lists every existing non-module file touched, so architectural drift is visible before it spreads
  - treat “baseline green before feature work” as a hard preflight, not an assumption

### 2026-03-08 - Blog Restart Preflight And Contract Recovery
- Tasks:
  - fixed the baseline frontend conformance mismatch around generic boolean filters
  - re-ran the official frontend conformance lane and full quality gate to restore a green starting point
  - wrote the blog module-set contract, five per-module contracts, and a capability-gap audit
- Easy:
  - once the baseline was checked against the committed media-manager/core tests, the boolean-filter failure was clearly an outdated conformance expectation rather than a code regression
  - the repo already has the key module seams needed for blog delivery: custom route views, module-owned routes, missions, field-type plugins, and reference UI controls
- Hard:
  - additive module work will necessarily touch a small number of core/runtime discovery tests because they currently hard-code the six-module active surface
  - `date-time` is a real cross-module data-model gap, but it should not trigger a new shared primitive until a slice proves the simpler module-owned approach is insufficient
- Improve:
  - keep active-surface expectations in one generated source instead of repeating exact module counts in discovery tests
  - add a documented decision path for introducing new neutral field types so agents do not guess between module-local text handling and premature core extraction

### 2026-03-08 - Blog Slice A Delivery
- Tasks:
  - delivered `test-modules-editorial` and `test-modules-taxonomy` additively
  - updated runtime discovery and module-id artifacts for the expanded active module surface
  - added focused server/frontend tests and reran the full release gate
- Easy:
  - the repo’s generated collection handlers and module-owned custom route views were enough for the initial blog slices without any new shared core primitive
  - namespaced internal IDs (`blog-*`) cleanly avoided the earlier collision pattern with permanent baseline modules
- Hard:
  - the authoritative server conformance lane depends on `REFERENCE_MODULE_ID_TRANSLATION_MODE=dual-compat`; running the lane raw without that env still produces distracting legacy-alias noise
  - expanding the active module surface pushed several ephemeral-server conformance tests past the default `5s` test budget even though the runtime behavior was still correct
- Improve:
  - make the dynamic lane runner print its required translation mode more explicitly so raw lane runs fail less opaquely
  - centralize slow conformance timeout policy for temp-module/ephemeral-server tests instead of rediscovering it after each module-surface expansion

### 2026-03-08 - Blog Slice B Delivery
- Tasks:
  - delivered `test-modules-content` additively
  - added module-local post/revision behavior, including revision restore through a module-owned route
  - updated active-surface artifacts and reran the full release gate
- Easy:
  - the repo already had the right seams for content ownership once the work stayed module-local: wrapped collection handlers, module-owned routes, and custom route views were enough
  - focused server/frontend tests were effective at catching restore-route payload drift before the full gate
- Hard:
  - the first working version still violated the repo’s architectural lint contracts because the view, workspace hook, and server helpers were too large and too branch-heavy
  - `repo-loc` and `function-shape` failures arrived after behavior was correct, so architectural compliance had to be treated as part of feature completion, not polish
- Improve:
  - design large module slices against lint boundaries from the start by planning smaller files and helper seams before the first implementation pass
  - when a module owns both workflow UI and route logic, budget time for a second pass that reduces decision density without widening the core surface

### 2026-03-08 - Blog Slice C Delivery
- Tasks:
  - delivered `test-modules-engagement` additively
  - added module-local moderation behavior for `blog-comments`
  - updated active-surface artifacts and reran the full release gate
- Easy:
  - moderation behavior fit cleanly into module-local collection-handler wrapping and a custom route view without any new core primitive
  - focused frontend integration coverage caught the queue/detail workflow cheaply before the full gate
- Hard:
  - raw server conformance output is still noisy when the repo-specific module-id translation mode is not active, which makes local diagnosis look worse than the authoritative gate result
  - UI assertions that rely on broad repeated text are fragile once the workflow view contains summary cards and repeated status labels
- Improve:
  - keep integration tests anchored to explicit labels or roles instead of repeated free text whenever a workflow screen includes dashboards and detail panes
  - document the authoritative module-id translation mode closer to the dynamic conformance commands so ad hoc runs do not mislead future agents

### 2026-03-08 - Blog Slice D Delivery
- Tasks:
  - delivered `test-modules-pages` additively
  - added module-local redirect validation, publish-now coordination, and a custom distribution workspace
  - reran the full release gate to close the five-module blog ticket surface
- Easy:
  - distribution ownership fit cleanly once the module limited itself to redirect rules plus coordination with `blog-posts`, instead of trying to re-own post lifecycle or SEO persistence
  - the repo-native quality gate was a reliable closure mechanism even when direct single-file vitest commands were noisy in the sandbox
- Hard:
  - the failing redirect-rule test came from an interaction between module-local conflict logic and the shared URL field plugin default of `\"\"`, which produced a false positive “both targets set” state
  - direct `pnpm --filter server exec vitest run ...` remained unreliable here because of sandbox worker spawning, so targeted diagnosis had to happen through in-memory server reproduction plus the authoritative gate
- Improve:
  - when module-local validation sits on top of shared field-type plugins, treat plugin default values as part of the contract instead of assuming `undefined`/`null`
  - keep a small reproducible inline-server debugging pattern handy for route/handler issues, because it is more reliable in this environment than ad hoc single-file vitest runs

### 2026-03-08 - Blog Manual QA Closure
- Tasks:
  - reran the actual operator flows in the live browser across editorial, taxonomy, content, media, and distribution
  - converted live findings into focused module-local fixes
  - reran targeted tests and the full release gate after the browser pass
- Easy:
  - the live browser was the fastest way to separate real workflow defects from static code-review anxiety; several issues became obvious in minutes once the flows were exercised
  - the module boundaries held: every production-relevant fix from this pass stayed in blog/media module code or in one small generic filter-label surface
- Hard:
  - UI automation via devtools was less reliable for MUI form fields than direct DOM event dispatch, so validating the real flows still required some low-level interaction work
  - create-flow state bugs can hide behind successful persistence; the post was saved correctly, but the operator experience still failed because selection handoff raced the collection reload
  - a full release gate can fail for environment reasons after product behavior is already green; here the smoke lane failed only because the live review server still owned `3001`
- Improve:
  - add at least one explicit “create new record stays selected after save” integration test pattern to module-first workflow tickets where a custom editor owns selection state
  - when a ticket requires live browser review, document whether the final gate should run with the review app stopped to avoid rediscovering smoke-lane port conflicts

### 2026-03-08 - Repo Wiring And UI Boundary Correction
- Tasks:
  - corrected the git remote model so the working repo now uses `origin=crud-kick-starter-fork-test` and `upstream=crud-kick-starter`
  - audited a typing-latency issue in the live blog-content editor with Chrome tracing
  - reverted an unapproved shared-frontend performance refactor and recorded the boundary in the active contracts
- Easy:
  - the machine already had valid git credentials through Git Credential Manager, so the new repo could be created and wired without losing any local commits
  - Chrome tracing made the responsiveness issue concrete quickly by isolating repeated MUI reflow work during typing
- Hard:
  - repo identity and remote wiring are separate concerns; a folder name that looks like a fork is not enough, and I failed to normalize the remote model early
  - performance pressure can tempt a shared UI refactor too early; that crossed the approval boundary before it was explicitly granted
- Improve:
  - normalize fork/upstream remote wiring immediately after cloning when the task explicitly starts from a forking workflow
  - treat native-HTML substitutions and shared/frontend performance refactors as explicit-approval items, not implementation discretion

### 2026-03-08 - Blog Content Typing-Latency Closure
- Tasks:
  - closed the live typing-latency issue in `test-modules-content` without crossing the new UI boundary rules
  - kept the fix entirely module-local and MUI-only
  - verified the retained fix with a focused frontend test, a full release gate, and a local Chromium Event Timing probe
- Easy:
  - once the trace clearly pointed at repeated MUI `TextareaAutosize` work, the right containment strategy was narrow: stop unrelated multiline fields from rerendering on every title keystroke
  - the module already had enough local seams to isolate the fix without touching shared/frontend core
- Hard:
  - responsiveness work invites broad refactors; keeping the change inside one module required deliberate restraint after the earlier approval-boundary mistake
  - Chrome tracing gave the diagnosis, but the devtools transport was not stable enough for final measurement, so closure evidence had to come from a local Chromium Event Timing probe instead
- Improve:
  - for future workflow-heavy MUI editors, treat rerender containment as a first-class design concern before reaching for shared abstractions
  - when a performance issue is under investigation, record both the approved boundary and the measurement method early so a later session does not restart the wrong class of fix

### 2026-03-08 - T01 Module Realignment Start
- Tasks:
  - started the architectural realignment from the delivered blog module surface toward the future content/pages direction
  - locked the smallest safe migration assumptions before code changes
  - recorded the transition plan in `handoff.md` so later sessions do not reopen the naming/ownership debate
- Easy:
  - the future ownership split is clear conceptually: editorial, taxonomy, content, engagement, pages
  - the existing codebase already isolates most behavior module-locally, so the migration can happen without inventing a shared blog core
- Hard:
  - the current implementation still has publication concerns embedded in `blog-posts`, so a clean ownership shift cannot happen in one move without either compatibility shims or a much larger workflow rewrite
  - module ids, folder names, tests, manifests, route paths, and runtime-state artifacts are all coupled, so even “just renaming modules” is a repo-wide change
- Improve:
  - for future architecture tickets, lock the target naming and transitional-compatibility policy before the first implementation ticket starts
  - when a future platform direction is already known, bias earlier tickets toward future-safe generic naming so the repo does not need a second round of module-surface migration

### 2026-03-08 - T01 Realignment Verification Pass
- Tasks:
  - completed the generic module-surface rename in the working tree
  - introduced `blog-pages` and wired the first page/publication sync path from content mutations
  - reran the full release gate until the T01 worktree was green
- Easy:
  - the existing module seams were strong enough to add `blog-pages` and retarget the module ids without inventing a shared blog core
  - the repo-wide rename was noisy but mechanically straightforward once the active-surface tests and lane manifests were updated together
- Hard:
  - a one-line workspace regression (`posts` returned from the wrong variable after the publication-merge refactor) only surfaced in the frontend integration lane, not earlier
  - the full gate failed once for a purely environmental reason because a stale local `node` process was still listening on `3001`, blocking the smoke runner
  - the current T01 work is only a partial ownership move: `blog-pages` is real, but publication fields are still mirrored from `blog-posts`, so the architectural finish line is still ahead
- Improve:
  - when a workspace hook starts merging two sources of truth, add a focused assertion that the raw support collections and merged output are both returned intact
  - treat smoke-lane port ownership as part of the verification protocol whenever a local review server may have been run earlier in the day
  - record partial-ownership states explicitly in the contracts/handoff so later sessions do not mistake a compatibility mirror for the final intended boundary

### 2026-03-08 - T01 Page-Backed Editor Slice
- Tasks:
  - made the content editor load `blog-pages` explicitly
  - added a page-only `Page Path` field and saved the page record alongside post saves
  - updated the content integration tests and reran the full gate
- Easy:
  - the repo already had enough module-local seams to add page-aware editing without a shared/frontend refactor or any new core route primitive
  - keeping post writes intact while adding explicit page writes was a safe way to advance the ownership boundary without destabilizing revisions or lifecycle tests
- Hard:
  - `useBlogContentWorkspace.js` was already near the repo LOC ceiling, so the page-support slice required extracting a new module-local helper instead of simply appending more logic
  - full-gate failures after the code was green were environmental again: a stale `node` process reoccupied `3001` and had to be cleared before smoke could run
- Improve:
  - when a module-local workspace is already near the LOC cap, assume the next capability slice will need a helper file before coding starts
  - where compatibility mirrors are intentional, prefer introducing a page-only field like `path` early because it proves the new ownership boundary with less ambiguity than mirroring an existing SEO field

### 2026-03-08 - T01 Ownership Hardening And Closure
- Tasks:
  - hardened the content-to-page sync so operator-edited page path and page SEO values survive later post mutations
  - added focused server conformance coverage for the preserved page-ownership boundary
  - reran the full release gate and closed T01 with the compatibility-mirror status made explicit in `handoff.md`
- Easy:
  - once `blog-pages` already existed and the content editor was explicitly reading/writing it, the correct hardening move was narrow: preserve page-owned route and SEO during `afterMutation` sync instead of widening the runtime
  - a single focused conformance test expressed the intended T01 boundary better than more contract prose alone
- Hard:
  - a seemingly small preservation tweak pushed `buildPageValue` over the repo function-complexity cap, so even the hardening step had to be shaped around repo lint constraints
  - the first full-gate rerun failed for a purely environmental reason because a stale listener was still bound to `127.0.0.1:3001`, blocking the smoke lane boot
- Improve:
  - when a migration relies on compatibility mirrors, add an explicit test for “source-of-truth values survive mirror-driven sync” as soon as the first mirror is introduced
  - treat smoke-lane port ownership as part of the closure checklist, not cleanup work after the fact

### 2026-03-09 - T02 Standalone Pages Delivery
- Tasks:
  - finished the standalone-pages shift so page records are created from the pages desk and are no longer derived from content creation
  - delivered page-owned primary-source/data-source descriptors plus deterministic delivery payload routes inside `test-modules-pages`
  - split the oversized pages frontend/server files into module-local siblings so the standalone-pages work clears the repo LOC/function-shape rules
  - reran the targeted standalone-pages integration test, the smoke lane, and the full repo gate lanes
- Easy:
  - the repo already had the right module-local seams for this architecture; the pages desk, module-owned routes, and module-owned runtime helpers were enough without broad core work
  - once the manifest issue was fixed, the standalone-pages model fit cleanly into the existing collection/runtime surface
- Hard:
  - the first server-side failures were misleading because the real blocker was manifest discovery: `test-modules-pages` was invalid and not loading at all
  - the full release gate now fails only at the final smoke step because `127.0.0.1:3001` ends up occupied by a `node --watch src/index.js` parent and `node src/index.js` child before Playwright starts, even though `pnpm test:e2e:smoke` passes when run directly after clearing that listener
  - keeping the pages files within repo shape limits required a real structural split, not just incremental edits
- Improve:
  - when a new module “does not work,” check runtime discovery diagnostics before debugging feature behavior; invalid manifests can hide the real problem completely
  - for large module-local desks, plan the helper-file split before crossing the LOC cap instead of treating the split as cleanup after behavior work lands

### 2026-03-09 - T02 Smoke-Lane Closure
- Tasks:
  - closed the remaining release-gate caveat after T02 by hardening the smoke runner itself
  - added a preflight cleanup in `scripts/e2e-smoke-runner.mjs` so stale repo listeners on `3000` / `3001` are cleared before Playwright starts
  - reran `pnpm test:e2e:smoke` and then `pnpm quality:gate:full` without manual cleanup between them
- Easy:
  - once the failure was isolated to stale repo listeners, the right fix was in the smoke runner, not in the pages feature
  - replaying the full gate after the runner fix gave a decisive closure signal immediately
- Hard:
  - the flake looked like a product problem at first, but it was really an environment ownership issue across test steps
  - the lingering server shape on Windows was slightly deceptive because the live listener was the child `node src/index.js` process while the real root cause was the `node --watch src/index.js` parent
- Improve:
  - test runners that own web-server boot should also own stale-port cleanup for their known app ports
  - when a full gate fails only at the final environment-dependent lane, prove the suspected fix by replaying the entire gate, not just the failing lane in isolation

### 2026-03-09 - T03 Static Deployment Publish Surface
- Tasks:
  - extended `test-modules-pages` so publish now materializes repo-root static HTML under `deployment/`
  - kept the deployment writer and cleanup behavior entirely module-local to the pages module
  - added pages-module settings for the global mount tag and page-owned script-list configuration
- Easy:
  - the existing standalone-page delivery payload was already the right input for HTML generation, so no new shared resolver layer was needed
  - collection-handler `afterMutation` was enough to keep deployment add/update/remove behavior attached to page state without introducing a core deployment service
- Hard:
  - direct single-file vitest runs remain unreliable on this machine because of Windows `spawn EPERM`, so focused validation still has to flow through the repo-authoritative lanes
  - deployment cleanup needs delete-time state, which is not available in the generic `afterMutation` payload; the safe path was capturing removed-page snapshots in the module-local handler wrapper
- Improve:
  - whenever a module owns durable filesystem artifacts, define the repo-root path helper and path-traversal rule in the same slice instead of treating path safety as later cleanup
  - document earlier that direct vitest entrypoints are non-authoritative here so future agents do not burn time retrying the same noisy commands

### 2026-03-09 - T03 Static Deployment Closure
- Tasks:
  - closed the pages deployment slice under the authoritative full gate
  - fixed page-publish coordination so blog-post-backed pages can publish from a draft source post without weakening the generic content-module lifecycle rules
  - normalized cleared page deployment metadata back to `null` on reads so archived/unpublished pages expose a stable contract
  - replaced the flaky Windows listener probe in the smoke runner with a netstat-based cleanup path that actually sees and clears stale repo `node` listeners
- Easy:
  - once the failure surface was isolated, the right fixes stayed module-local: route-side publish coordination, page-handler read normalization, and smoke-runner cleanup
  - the standalone-page delivery payload remained the single source for both deployment HTML and verification expectations
- Hard:
  - the initial smoke-runner cleanup looked correct on paper but was blind on this machine because `Get-NetTCPConnection` / `Get-CimInstance` did not return usable listener/process data
  - text-backed optional metadata fields (`deploymentArtifactPath`, `deploymentSyncedOn`, lifecycle timestamps) round-tripped as empty strings through the generic collection layer, so the module had to define its own exposed null-shape explicitly
- Improve:
  - on Windows, if a runner must own stale-port cleanup, verify the listener probe against `netstat` early instead of assuming the higher-level cmdlets are reliable
  - for modules that use generic text fields as nullable metadata, normalize the exposed read contract in the module handler immediately so tests and UI do not inherit blank-string ambiguity

