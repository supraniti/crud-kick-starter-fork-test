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

### 2026-03-15 - M04 Server-Owned Bundle Release And Root Alignment
- Tasks:
  - moved deployment-bundle release execution behind a Pages-owned module route
  - extracted reusable remote target procedures so release execution could reuse bounded remote logic instead of browser-side orchestration
  - fixed the env-aware local-root contract between Pages, Media Manager, and Remote Ops so simulated release tests stop reading repo-root artifacts accidentally
- Easy:
  - the bundle contract was already explicit enough that server-side revalidation could reuse the same target/page compatibility checks as save-time validation
  - remote procedure extraction stayed bounded inside `test-modules-remote-ops`, which kept the new server-owned release route from duplicating compare/execute logic
- Hard:
  - the generated collection handler update contract requires both `body` and `value`; missing `value` does not fail loudly at the API boundary, it explodes later in the generic state helper
  - simulated roots had drifted apart: Pages used env-aware deployment roots, Media could capture its root at import time, and Remote Ops was still reading repo-root folders; that mismatch only became obvious under the full conformance gate
  - deterministic target ids mean simulated remote roots must be cleaned deliberately in tests or old artifacts bleed into later conformance runs
- Improve:
  - when wrapping generated collection handlers, treat `{ body, value, item }` as an atomic update contract and reuse one prepared payload for both
  - avoid import-time filesystem-root constants for operator-controlled/sandbox-controlled paths; use resolver functions at call time instead
  - when simulated remotes persist by deterministic target id, test fixtures should clear those roots before assertions so local reruns stay trustworthy

### 2026-03-14 - M04 Taxonomy Projection And Category Fan-Out
- Tasks:
  - extended the M04 product-shell program from post-only remotes into taxonomy-aware release governance
  - added managed category/tag Firestore projections and embedded taxonomy compare/sync UI
  - raised pages from post-only per-record templates to post-or-category per-record templates with generated path resolution
- Easy:
  - the remote target model was already bounded around explicit projection scopes, so adding category/tag projections stayed inside `test-modules-remote-ops`
  - the page deployment/render pipeline was already generic enough to carry category payloads once source eligibility and validation were widened
- Hard:
  - “per-record page template” support was narrower than it first looked because the real coupling lived in validation, readiness messaging, preview-source enumeration, and path follow-up resolution, not just the editor dropdown
  - the environment still requires deliberate escalation for focused frontend/server Vitest commands because sandbox worker spawning fails with `spawn EPERM`
- Improve:
  - when a flow advertises a generated public path in its payload, add an explicit test proving the matching route can resolve it; otherwise the contract can look complete while the follow-up path is dead
  - product-bundle growth should be kept in one bounded owner (`test-modules-remote-ops`) so later north-star passes do not duplicate remote-binding logic across desks

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

### 2026-03-09 - Layout Builder Phase 1 Planning
- Tasks:
  - audited the current `test-modules-pages` layout surface before starting implementation
  - confirmed that the repo currently has only page-inline `layoutModel` editing and no reusable layout asset/module
  - stopped at the requested approval boundary after capturing the recommended design direction in `handoff.md`
- Easy:
  - the current standalone-pages architecture already makes the right separation visible: pages should consume layout definitions, not necessarily own reusable layout assets
  - the repo already has enough module-local UI/runtime seams to add a new additive module without needing core changes first
- Hard:
  - current `layoutModel` is already part of the live page contract and delivery pipeline, so a reusable-layout module needs an explicit compatibility bridge instead of a blind replacement
  - MUI gives a strong operator shell but not the drag/resizable interaction engine, so dependency choice is a real design decision, not a minor implementation detail
- Improve:
  - for interaction-heavy tickets, lock the dependency policy at design time; smooth drag/resize should not be attempted ad hoc if a proven library is the better fit
  - when a future reusable asset is already implied, bias early toward a referenced module boundary instead of deepening page-inline structures

### 2026-03-09 - Layout Builder Phase 1 Execution
- Tasks:
  - added additive module `test-modules-layouts` with the `page-layouts` collection and dedicated builder route
  - wired `test-modules-pages` to consume reusable layouts through `layoutId`
  - extended the page delivery payload so reusable layouts resolve as `layoutDocument`
  - reran the full repo gate and then performed a live browser pass over `Layouts` and `Pages`
- Easy:
  - the pages module already had a clean compatibility seam for keeping inline `layoutModel` while adding referenced reusable layouts
  - once the reusable layout record was saved, the page delivery preview made the integration truth obvious immediately because `layoutId`, `layoutDocument`, and the layout dependency key all surfaced in one place
- Hard:
  - modules rendered from outside `frontend/` cannot rely on sibling `frontend/node_modules` package resolution automatically, so the new `@dnd-kit/*` imports needed explicit Vite aliases
  - the repo’s authoritative server-conformance truth still depends on `REFERENCE_MODULE_ID_TRANSLATION_MODE=dual-compat`; raw lane commands without that env remain noisy and can waste time if treated as primary evidence
  - live browser QA needed escalated dev-server startup because Vite and `node --watch` hit Windows `spawn EPERM` inside the sandbox
- Improve:
  - whenever a frontend dependency is introduced for code that lives outside the `frontend/` root, verify module resolution from the actual importer path before assuming the install is enough
  - for this repo, capture “raw lane may be noisy, full gate is authoritative” directly in the progress pointer whenever a new session starts heavy verification
  - when using browser automation on MUI forms, prefer field-specific selection and keyboard replacement over repeated fill calls, because some controls append rather than replace under automation

### 2026-03-09 - Review App Run Discipline
- Tasks:
  - tightened the repo guidance for manual review app startup after repeated friction around frontend host binding, sandbox startup, and stale listener reuse
  - updated the command registry, common-tasks playbook, and delivery contract so review runs are verified before being handed to the user
- Easy:
  - the failure pattern is consistent on this machine: API health is reliable on `127.0.0.1:3001`, while the frontend should be treated as `http://localhost:3000`
  - once the rules are explicit, the correct operator flow is simple: clear ports, boot backend, verify health, boot frontend, verify HTML
- Hard:
  - a successful process spawn can look like success even when the live review instance is half-broken because a stale backend listener is still serving requests or the frontend only binds on `localhost`
  - repeated live-review work is where sandbox `spawn EPERM` noise and stale port ownership are most likely to waste time
- Improve:
  - never announce a review URL until both backend and frontend answer over HTTP
  - treat `localhost:3000` and `127.0.0.1:3001/health` as separate verified endpoints with different reliability characteristics on this machine
  - if review startup behavior changes later, update `docs/command-registry.md` immediately in the same slice instead of letting the next session rediscover it

### 2026-03-09 - Layout Builder Phase 2 Research
- Tasks:
  - reviewed the first live layout-builder pass against operator feedback
  - audited the current canvas/inspector implementation to confirm the exact causes of the insertion and discoverability problems
  - researched common builder UX patterns from Builder.io, Webflow, and Wix before writing the next plan
  - wrote the hard-file improvement plan in `docs/contracts/archive/completed-execution-plans/test-modules-layouts-phase-2-plan.md`
- Easy:
  - the reported friction aligns directly with the current implementation shape: one narrow container drop strip, full-card drag listeners, and inspector-only actions
  - the external tools are consistent about the right answer: insert surface, layers surface, inspector surface, and contextual actions
- Hard:
  - the current phase-1 builder technically works, which can hide how much usability debt is packed into the interaction model
  - drag-and-drop builders fail when insert and reorder share the same ambiguous hover surface; that distinction has to become a first-class model concern, not just a visual tweak
- Improve:
  - when building operator tooling with spatial interaction, treat discoverability and insertion semantics as core acceptance criteria, not polish
  - sketch the focused tests before implementation so regressions in insert/reorder intent are caught early
  - if a builder needs commercial-grade usability, start from the shell pattern used by mature products instead of inventing a custom surface from scratch

### 2026-03-09 - Layout Builder Phase 2 Execution
- Tasks:
  - implemented the phase-2 usability pass inside `test-modules-layouts`
  - added model-level insertion target semantics, then refactored the canvas around them
  - introduced a left `Insert` / `Layers` rail, explicit insertion rails, empty-state CTAs, drag handles, and selected-node quick actions
  - reran focused tests, the frontend integration lane, and the full release gate
  - completed live browser QA against the running app
- Easy:
  - the biggest UX fix was also the simplest structural one: stop routing add actions back to the root container after selecting a block
  - once insertion rails existed, the builder immediately felt more predictable because the operator could aim at a location instead of aiming at an interpretation
- Hard:
  - `dnd-kit` made drag handles straightforward, but it still required an explicit insertion-target model to distinguish insert-from-reorder cleanly
  - the expanded frontend suite exposed several pre-existing tests that were only failing because their default `5000ms` timeout was no longer realistic under the heavier integration load
  - the function-shape contract forced a second cleanup pass on `useLayoutsWorkspace.js`, which was correct; the hook had become too large during the first UX implementation pass
- Improve:
  - when a UX ticket changes interaction semantics, add model tests first; it sharply reduces UI debugging time
  - if a growing integration suite starts tripping default per-test timeouts, pin explicit long-test budgets close to the affected tests instead of waiting for lane flake
  - browser QA is still necessary even after green integration tests for spatial UIs; the rails/empty-state improvements were much easier to judge live than from snapshots alone

### 2026-03-09 - Layout Builder Visual-Density Finding
- Tasks:
  - reran a fresh browser flow specifically to inspect the user-reported “too much text/buttons inside containers and blocks” problem
  - captured screenshots at four points under `.codex-runtime/layout-review/`
- Easy:
  - the issue is obvious once the builder is viewed as a layout tool instead of a form tool: the canvas is still full of metadata chrome
- Hard:
  - phase 2 fixed insertion and discoverability, but it did not yet change the deeper visual model; nodes still behave like mini inspector cards
  - the density compounds sharply with nesting because every container repeats labels, chips, ids, drag affordances, quick actions, empty-state copy, and insertion copy
- Improve:
  - the next pass should reduce persistent chrome inside canvas nodes and make the canvas mostly geometric
  - ids should likely disappear from default canvas view
  - most buttons should move to hover/selection-only affordances or the side rails, leaving only the minimum spatial cues visible by default

### 2026-03-09 - Layout Builder Visual-Density Follow-Up
- Tasks:
  - converted the builder shell to a normal-desktop three-column layout instead of waiting for the `xl` breakpoint
  - collapsed the inspector into accordions and hid `Layout JSON` by default
  - removed raw node ids from the layers rail and removed duplicated add controls from the inspector
  - reran focused layout verification and the full repo gate
  - captured follow-up screenshots showing the cleaner shell and fresh-layout empty state
- Easy:
  - once the layout shell stayed three-column on `lg`, the builder became much easier to evaluate because the canvas, left rail, and inspector were finally visible together at the same time
  - moving debug-heavy content behind accordions delivered a large usability gain without changing the underlying layout model at all
- Hard:
  - the first post-edit frontend test failure was misleading; the actual issue was not behavior but the test environment hitting Windows `spawn EPERM`, so the targeted integration check needed an escalated rerun to get a real signal
  - a visually cleaner builder can still feel broken if the shell collapses into one long column; page composition mattered almost as much as the node chrome itself
- Improve:
  - for any future spatial builder work, evaluate the shell at realistic content widths before assuming the breakpoint plan is sound
  - keep debug JSON and low-value metadata available but collapsed by default; always-on debug surfaces are high-noise in operator tools
  - when a frontend test suddenly “fails fast” after a UI refactor on this machine, separate real product regressions from sandbox `spawn EPERM` noise before changing code

### 2026-03-09 - Layout Builder Review Rejection
- Tasks:
  - captured the fact that the manual review still rejected the builder despite the green gates
  - reframed the next step as a design reset rather than more incremental polish
- Easy:
  - the rejection reasons are concrete and defensible: width usage, non-container-looking containers, and scrambled insertion readability
- Hard:
  - passing mechanics and tests created a false sense of progress; the builder still lacked a coherent spatial product vision
  - the current implementation optimized local interactions before the overall page model was convincing
- Improve:
  - for visual-authoring tools, do not trust “green tests + somewhat improved interaction” as a sign that the product direction is right
  - establish the target visual model first: what the full page should look like when it already contains several blocks and containers
  - if the operator cannot look at the canvas and immediately understand containment, hierarchy, and available actions, the design is not ready for implementation


### 2026-03-09 - Layout Builder Replacement Reset
- Tasks:
  - replaced the rejected layout-builder shell/canvas direction with a dedicated immersive builder route and a page-stage-first canvas
  - finished the canvas split under the repo LOC cap, then rebuilt the stage so new layouts start with a full-width empty-page CTA and sections render as actual containing surfaces
  - closed the last browser-found layout bug where empty grid sections were inheriting grid body layout and collapsing their empty state into a narrow column
  - reran focused layout tests, `pnpm quality:protocol`, and the authoritative full gate
- Easy:
  - once the builder was treated as a page-stage editor instead of an admin-card editor, the right default shapes became obvious: full-width sections, mostly-empty blocks, stage-owned top-level add actions
  - screenshot review was decisive; it immediately exposed the remaining mistakes that tests would not have called out clearly
- Hard:
  - the generic `shell.mode = immersive` support validated at the route-descriptor layer but still did not surface reliably in the live layouts route, so the delivery needed a pragmatic route-level fallback in `AppShellLayout` to guarantee the full-width builder surface now
  - running review instances on this machine still requires strict port discipline; a stale `3000` listener silently pushed Vite onto another port until the ports were cleared explicitly
- Improve:
  - for spatial tooling, verify the dedicated-shell behavior in the browser before assuming route metadata is enough; width ownership is part of the product, not a minor shell detail
  - empty container states should never render through the same grid/flex body layout that is meant for populated children; treat empty-body rendering as its own layout mode
  - when tests are green but screenshots still look wrong, trust the screenshots and keep iterating before calling the UI usable

### 2026-03-09 - Review Pair Reuse Rule
- Tasks:
  - tightened the manual-review startup rule so future runs inspect `3000` / `3001` first, reuse a healthy repo-owned pair when safe, and otherwise stop the old pair before starting a new one
- Easy:
  - the right discipline was already obvious from the failures; it just needed to be made explicit in the run docs instead of rediscovered ad hoc
- Hard:
  - this machine makes a simple review start look noisier than it is because stale listeners and sandbox `spawn EPERM` can mask whether the app is actually live
- Improve:
  - treat review-process ownership as part of the task, not cleanup after the task

### 2026-03-09 - Layout Builder Improvement Pass V1 Audit
- Tasks:
  - reran the layouts builder live after the initial layouts-module baseline was committed
  - built a fresh multi-block layout and captured screenshots specifically to judge container readability, drag behavior, and edit affordances
  - audited the current layouts builder code to connect the observed friction back to concrete seams before writing the next plan
  - wrote the hard-file execution plan in `docs/contracts/archive/completed-execution-plans/test-modules-layouts-improvement-pass-v1.md`
- Easy:
  - the naming problem is mechanical and clear; `section` still leaks across canvas, insert rail, and inspector copy
  - the fixed inspector-only editing problem is also clear; the UI has no in-context edit surface for a selected node
- Hard:
  - the screenshot review exposed a more serious issue than the original operator notes alone: populated grid containers can visually devolve into overlapping child cards and control chrome, which means the pass must fix layout structure rather than just tweak labels and buttons
  - the current drag implementation still resolves most drop intent from a single `overId`, which is too weak for reliable in-container reorder once multiple siblings exist
- Improve:
  - for spatial tooling, always validate populated states with at least two siblings and one nested container before calling the canvas usable
  - never let persistent footer controls share the same visual plane as child layout content; action chrome should not compete with containment
  - if drag/drop behavior depends on inferring intent from a hovered node id alone, the model is probably under-specified

### 2026-03-09 - Layout Builder Improvement Pass V1 Delivery
- Tasks:
  - replaced operator-facing `section` wording with `container` across the layouts module UI
  - moved node editing into a module-local MUI dialog so edits can be observed without losing the selected node on canvas
  - removed selected-container footer actions and reduced always-on canvas chrome
  - strengthened drag/move target resolution in the layout builder model and workspace
  - lowered default block placeholder height and retuned the canvas so populated containers stop visually collapsing around oversized placeholder cards
  - reran focused layouts tests, then the full repo gate
- Easy:
  - the naming cleanup and footer-action removal immediately improved readability because the builder stopped describing containers as “sections” while also fighting its own canvas with extra button rows
  - moving node settings into a dialog was a better fit than continuing to stuff more behavior into the inspector
- Hard:
  - the full gate initially failed for a non-layout reason: two `blog-content` integration tests were simply under-budgeted once the heavier frontend integration lane ran end to end
  - browser tooling confirmed the layout direction was better, but it also exposed that test-only success would still miss spatial readability issues unless screenshots were part of the acceptance loop
- Improve:
  - when a UX-heavy slice changes the cost profile of the frontend test lane, be ready to separate real behavior regressions from timeout-budget issues quickly
  - for future builder work, keep the inspector as secondary support and resist letting it become the primary editing surface again
  - screenshot review remains mandatory for spatial tooling even after green integration and gate runs

### 2026-03-10 - Layout Builder Improvement Pass V2 Start
- Tasks:
  - opened a fresh hard-file plan in `docs/contracts/archive/completed-execution-plans/test-modules-layouts-improvement-pass-v2.md`
  - reframed the pass around explicit live-browser scenario completion instead of test-only confidence
  - audited the current canvas/model code before editing
- Easy:
  - the core failure is specific now: explicit between-child drop slots were removed from the canvas while the model still depends on weak hovered-node inference
- Hard:
  - prior passes already looked “partially improved,” so the real discipline problem is resisting another premature success call before the layout builder can complete complex scenarios end to end
- Improve:
  - for visual-authoring tools, require named browser scenarios and screenshot evidence as part of the acceptance contract, not just as optional QA
  - if the operator says a flow is still almost impossible to run, treat that as a functional defect even when underlying tests are green

### 2026-03-10 - Layout Builder Improvement Pass V2 Mid-Run
- Tasks:
  - replayed the builder flows in the live browser and captured the exact nested-overflow failure with screenshots
  - fixed a real grid-model defect where container-height normalization ran after repacking, but sibling positions were not repacked again
  - added model coverage for both nested height growth and sibling reflow after that growth
  - compacted nested empty-container copy after the live screenshots confirmed that instructional text itself was consuming the node space
- Easy:
  - the screenshot made the overlap cause legible immediately once the layout data was inspected; this was a placement-order bug, not a vague CSS problem
- Hard:
  - one structural fix was not enough: growing the container span without repacking the siblings simply moved the bug from “wrong height” to “wrong vertical placement”
  - visual-authoring surfaces punish explanatory text much faster than normal admin UIs; the copy was technically helpful but functionally harmful once the node space shrank
- Improve:
  - when node size is user-controlled, treat in-node copy as a scarce resource; default to structure-first visuals and move help text outward
  - for any auto-layout normalization, verify both the resized node and its affected siblings; fixing only one side of the relationship is not enough

### 2026-03-10 - Layout Builder Improvement Pass V2 Closure
- Tasks:
  - kept the isolated browser session alive long enough to build real structures instead of stopping at screenshot inspection
  - found the actual “narrow block” root cause: layout placement was applied to an inner box while the sortable wrapper was the real grid/flex child
  - removed the duplicate block-level sortable wrapper, moved placement to the real sortable child, reran the live scenarios, and closed the pass with the full gate
- Easy:
  - once one block was given a distinct label (`Content BlockD`), reorder truth became obvious immediately in both the layers panel and the live status region
  - the edit dialog remains the right UX choice; it made container rename/layout switching and block sizing changes easy to observe on canvas
- Hard:
  - repeated default labels make browser QA much weaker than it looks; identical “Content Block” rows hide reorder outcomes unless at least one node is made distinct
  - a builder can pass tests and still be visually wrong if the direct layout child is not the same element that receives placement rules
- Improve:
  - for spatial UIs, always verify which actual DOM node participates in grid/flex layout before styling descendants; wrapper depth matters
  - when manual QA depends on order changes, label at least one node distinctly before judging reorder behavior
  - keep isolated browser contexts for drag-heavy review; shared mouse interference wastes time and muddies the signal

### 2026-03-10 - Layout Builder Layout Fidelity Pass V1
- Tasks:
  - reproduced the two remaining manual-review geometry complaints in the live builder:
    - second direct block disappearing in a new grid container
    - row-flex layouts drifting away from believable HTML structure
  - separated the container frame from the actual child layout surface
  - made flex item placement parent-aware and reran the full gate
- Easy:
  - once the browser flow was reduced to one fresh grid container plus two direct blocks, the failure was narrow and easy to diagnose
  - live DOM measurement made the flex result objective; after both blocks were set to `50%`, the numbers immediately showed whether the row was believable
- Hard:
  - the remaining grid bug looked like a child-placement problem at first, but the real issue was the frame still behaving like a second layout wrapper
  - “accurate to HTML” is not a cosmetic note; it forces the builder to stop layering editor structure on top of the actual layout semantics
- Improve:
  - for visual builders, treat the frame/content split as an architectural boundary, not a styling preference
  - if the product promise is “this is what the HTML structure will feel like,” parent-aware layout semantics must be locked in code and tests early
  - keep screenshot evidence for both the failing and fixed states; it shortens future regressions dramatically

### 2026-03-10 - Layout Builder Wrap Follow-up
- Tasks:
  - traced the remaining manual-review complaint to the `row + wrap + percentage siblings` variant rather than the plain row-flex case
  - updated row-flex sizing so percentage siblings share the row gap budget instead of paying the full gap on top of raw percentage basis values
  - locked the case in the focused layout model test
- Easy:
  - once the operator named `wrap` explicitly, the remaining geometry bug narrowed from “flex fidelity” to one specific row-sizing rule
- Hard:
  - raw CSS percentage basis plus `gap` is not the same thing as operator intent; if the builder models it naively, a visually obvious two-column row can still wrap
- Improve:
  - when operators describe layout issues, pay attention to the exact container mode toggles; `row` and `row + wrap` are materially different products
  - for visual builders, percentage row semantics should be tested with gap on, not only with gap-neutral cases

### 2026-03-10 - Posts Template Deployment Flow Planning
- Tasks:
  - inspected the current `content`, `pages`, and `layouts` module contracts plus the actual page-delivery/page-deployment/page-workspace runtime files before planning
  - confirmed the real gap is not HTML generation itself; it is the missing one-template-to-many-artifacts model plus missing deployment-drift visibility
  - wrote the hard-file plan at `docs/contracts/archive/completed-execution-plans/test-modules-pages-posts-template-deployment-flow-plan.md`
  - updated `handoff.md` so the task can survive compaction before any code work starts
- Easy:
  - the repo boundaries are good enough for this feature; the clean center of gravity is clearly `test-modules-pages`, not a new shared deployment core
- Hard:
  - current Pages behavior mixes three concerns that now need to be disentangled cleanly in the design:
    - standalone single-page publishing
    - reusable per-record page templates
    - deployment-state observability
  - the current custom Pages desk hides module settings even though settings already participate in deployed HTML, which would make staleness around settings invisible unless the UI is fixed as part of the plan
- Improve:
  - when a feature depends on operator trust in deployment state, plan the status model and drift model before writing routes; retrofitting status after artifacts exist usually produces messy UX
  - keep template expansion bounded and declarative; do not let a straightforward posts-page flow turn into a premature generic query engine

### 2026-03-10 - Posts Template Deployment Flow Planning Clarification
- Tasks:
  - tightened the plan after operator clarification that the target is not a detached generation button, but a coherent embedded workflow
  - rewrote the plan to center deployment state, drift visibility, and cross-module awareness instead of action-first mechanics
- Easy:
  - the current repo shape supports this direction well because `content`, `pages`, and `layouts` already have clear ownership boundaries
- Hard:
  - it is easy to design this feature as a technically correct batch route and still miss the product intent entirely; the hard part is making deployment feel native to the system rather than bolted on
- Improve:
  - when the operator says “this should be embedded in the system,” translate that immediately into state surfaces, drift signals, and cross-module awareness, not just different button wording

### 2026-03-10 - Posts Template Deployment Flow Milestone 1
- Tasks:
  - implemented the first bounded slice of per-record page templates inside `test-modules-pages`
  - added the data model for `deploymentMode`, `sourceSelectionMode`, `pathPattern`, and deployment summary fields
  - added template-instance preview support so a single page template can preview a concrete generated post page by source item
  - repaired a server-default regression where missing `sourceSelectionMode` started rejecting old single-page page creation
  - repaired a malformed conformance test insertion before closing the milestone checkpoint
- Easy:
  - once the product slice was constrained to “represent template semantics and preview one concrete generated instance,” the pages module stayed well bounded
  - keeping old single-page behavior as an invariant made the correct server default obvious: missing source-selection must still normalize to `specific-record` for normal page flows
- Hard:
  - the subtle regression came from an apparently harmless fallback value; defaulting a missing enum to `none` changed product behavior for every existing single-page content-detail route
  - test-file surgery is easy to get wrong under iterative patching; a syntactically valid but structurally broken test file can still waste time and weaken trust
- Improve:
  - when extending enums in an existing flow, protect the old implicit default explicitly in code and tests
  - after inserting a new focused test into a long file, re-open the surrounding region immediately instead of trusting the patch result

### 2026-03-10 - Posts Template Deployment Flow Milestone 2
- Tasks:
  - implemented per-record deployment sync truth in `test-modules-pages` through `page-deployment-artifacts`
  - split the expanding deployment runtime and Pages desk files before the repo LOC gate became the blocker
  - added a deployment-instances surface so the operator can inspect output-level status instead of only page-level summaries
  - fixed the split frontend-test support so each integration file owns its own API mock while still reusing shared fixtures
- Easy:
  - once the page template model was in place, per-output truth fit cleanly into a pages-owned artifact collection without touching core
  - the operator-facing summary shape became obvious after the artifact rows existed: synced/stale/missing counts belong both in summary cards and in queue rows
- Hard:
  - the first frontend split was brittle because the shared support file also owned the `vi.mock`, and that broke once the integration tests were divided into two files
  - live drift truth had to normalize template/layout/settings tokens carefully; small `null` vs empty-string differences made freshly synced outputs look stale
- Improve:
  - when splitting Vitest files, keep the shared fixtures shared but keep the module mock local to each test file unless there is a proven common harness
  - if a feature is explicitly workflow-first, make the operator-visible status surface part of the same implementation slice as the runtime truth; doing the runtime first and the UX later weakens the product signal

### 2026-03-10 - Posts Template Deployment Flow Milestone 3
- Tasks:
  - added a thin `route` / `navigate` seam for custom module views instead of introducing a larger routing abstraction
  - wired Pages -> Layouts -> Pages round-trip behavior into the custom desks
  - surfaced deployment-impact awareness in `Content` and `Layouts`
  - surfaced deployment-relevant module settings directly inside the custom Pages desk
  - repaired the last Pages integration test by making it follow the real selection flow before asserting layout-edit actions
  - trimmed two function-shape regressions that appeared after the new route-aware view wiring
- Easy:
  - the product boundary was still clean: `Pages` remained the owner of deployment truth while `Content` and `Layouts` only needed lightweight awareness panels
  - the failing test was not a product defect; it was an overly eager assertion that skipped the real row-selection step
- Hard:
  - route-aware custom views are deceptively small changes; even a thin seam can trip shape-lint if the controller and workspace files are already near their limits
  - the right UX here was not “more actions everywhere”; it was using routing context to preserve operator continuity between desks
- Improve:
  - when adding cross-desk navigation, update the tests to follow the actual operator click path instead of relying on implicit selection
  - thin shared seams are worth the effort, but they still need immediate gate discipline because they touch high-centrality files

### 2026-03-11 - Pages Desk Deployment Truth Fix
- Tasks:
  - reproduced the live mismatch where `Sync Deployment` wrote the correct HTML files and per-output rows showed `synced`, but the Pages desk row still showed `stale`
  - traced the mismatch to the Pages desk loading list-shaped collection rows instead of canonical page records for live deployment evaluation
  - added a Pages-owned `desk-items` route and switched the custom desk loader to use it first
- Easy:
  - the deployment-instance route already proved the evaluator was correct; the problem was which page shape fed that evaluator
- Hard:
  - the stale state was not a runtime write failure; it was a read-model bug caused by denormalized label fields like `layoutTitle` contaminating version-token comparisons
  - because the generated HTML files were already correct, it was easy to chase the wrong side of the system
- Improve:
  - when a custom desk owns workflow truth, prefer a desk-owned read model instead of assuming the generic collection list shape is stable enough for derived-status logic
  - when a mismatch appears between row summaries and instance details, compare the exact record shapes entering each evaluator before changing write logic

### 2026-03-11 - GCP Sync Research Memo
- Tasks:
  - converted the first-pass GCP service discussion into a hard memo before context compaction
- Easy:
  - the current repo/product shape strongly suggests a one-way projection model rather than dual-write
- Hard:
  - the dangerous part of this discussion is choosing infrastructure before locking authority and sync-direction rules
- Improve:
  - when discussing cloud integrations, capture service recommendation and operating procedure in the same memo so later sessions do not lose the rationale and jump straight to implementation

### 2026-03-11 - GCP Sync Research Memo Follow-up
- Tasks:
  - refined the GCP direction after operator input
  - shifted the default remote DB recommendation toward Firestore
  - reframed deployment/media around one storage+CDN platform with controlled operator workflows
- Easy:
  - once the operator clarified that sync should be structured and human-controlled, the correct model stopped looking like background automation and started looking like explicit reconciliation tooling
- Hard:
  - it is easy to say “single solution” and accidentally collapse distinct operational domains that still need different lifecycle and access rules
- Improve:
  - in future architecture discussions, separate “single platform” from “single bucket/single resource” early; those are not the same decision

### 2026-03-11 - GCP Sync Research Memo Local App Update
- Tasks:
  - updated the memo after clarifying that the product runs locally for now, likely inside Electron
  - shifted the auth recommendation accordingly toward installed-app OAuth
- Easy:
  - once the runtime assumption became “local operator app,” the auth recommendation became much clearer
- Hard:
  - cloud-auth advice changes significantly depending on whether code runs locally, on GCP, or on an external server; mixing those cases leads to bad defaults
- Improve:
  - lock the runtime/deployment assumption early in future cloud discussions before recommending auth and IAM patterns

### 2026-03-11 - GCP Sync Memo Completion
- Tasks:
  - rewrote the memo into one final recommendation document instead of leaving it as layered discussion notes
  - captured the operator-driven procedure model and the two-step implementation strategy
- Easy:
  - once the product was framed as a local operator tool, the correct center of gravity became clear: connection profiles, validation, diff, explicit execution, and verification
- Hard:
  - the tricky part was separating “single cloud platform” from “single storage target” without losing the user’s simplicity goal
  - it was also important to keep the memo future-flexible without accidentally broadening the first implementation into infrastructure orchestration
- Improve:
  - for future research tickets, rewrite exploratory memos into one final recommendation before handoff; accumulated research notes age badly and make the next ticket harder to write cleanly

### 2026-03-11 - GCP Remote Operations Ticket
- Tasks:
  - converted the approved memo into an executable implementation ticket
  - aligned the ticket with the user's requested two-step rollout:
    - kitchensink first
    - embedded workflows second
- Easy:
  - once the memo was normalized, the ticket structure followed naturally from the approved operating model
- Hard:
  - the important discipline was not letting the ticket drift into broad cloud orchestration; it needed to stay product-centered and module-first
- Improve:
  - when a user explicitly wants staged delivery, encode the milestone approval gates directly into the ticket so the execution phase does not skip them later

### 2026-03-11 - Remote Ops Step 1 Milestone 1
- Tasks:
  - implemented the additive `test-modules-remote-ops` kitchensink module
  - added simulated connection, validation, compare, execute, and restore procedures
  - wired focused server/frontend tests plus discovery/manifest updates
  - closed the final repo gate blocker by splitting the simulated target/diff runtime into a helper module
- Easy:
  - the product model was already clear from the memo and ticket: explicit operator procedures, simulated adapter, module-local surface
  - once the collections and route seams existed, the UI flow followed the same compare/execute/verify pattern cleanly
- Hard:
  - the sharp edge was not business logic; it was contract pressure:
    - active-module discovery expectations
    - alias-map counts
    - lane manifests
    - repo LOC ceilings
  - splitting the runtime late introduced two validator regressions (`ensureDir`, `pathExists`) that were easy to miss because only one focused server branch used them
- Improve:
  - when extracting helpers to satisfy repo-shape contracts, rerun the narrowest failing procedure test immediately before trusting broader green signals
  - for future additive modules, treat alias-map/lane-manifest/discovery updates as part of the first slice rather than cleanup at the end

### 2026-03-11 - Remote Ops Real Connect Reset
- Tasks:
  - re-scoped Step 1 after operator feedback that the simulated kitchensink was not a meaningful review surface
  - promoted the next milestone to real Google auth, project discovery, and live target validation
- Easy:
  - the operator feedback was correct and specific: the missing value was not another mock flow, it was trust against a real project
- Hard:
  - the tempting mistake here is to keep layering more simulated UX because the groundwork already exists; that would waste time and still not make the feature reviewable
- Improve:
  - for cloud/integration work, a milestone is only truly reviewable once the operator can exercise it against a real remote system, even if later execute flows remain simulated

### 2026-03-11 - Remote Ops Real Connect Implementation
- Tasks:
  - implemented real installed-app OAuth with PKCE, local live-session storage, project discovery, and live target validation inside `test-modules-remote-ops`
  - split the remote-ops server routes and frontend workspace again to stay inside repo LOC and function-shape boundaries while the live-connect slice grew
  - verified the live-connect frontend flow and then narrowed the remaining failures to the focused server conformance harness
- Easy:
  - once the live/simulated boundary was made explicit (`live-gcp` vs `simulated-gcp`), the product behavior became much easier to express cleanly
  - the frontend flow was straightforward after the popup callback and project-loading routes existed
- Hard:
  - the remaining failures are not reproducing in direct one-off server diagnostics, which means the hard part is now harness-specific behavior rather than obvious product logic
  - cloud-integration slices hit repo-shape contracts fast; route/workspace files became too large before the feature was even finished
- Improve:
  - for integration-heavy modules, keep route-group and hook-helper extraction ahead of time instead of waiting for LOC lint to force the split
  - when a focused test fails but the same flow works in a direct server repro, record that divergence immediately in `handoff.md`; it changes the debugging strategy from “fix runtime” to “fix harness assumptions”

### 2026-03-11 - Remote Ops Real Connect Verification Closure
- Tasks:
  - closed the remaining focused server conformance failures for the real-connect milestone
  - reran the full repo gate outside the sandbox and got a clean pass
- Easy:
  - once the failing tests were treated as isolation issues instead of feature issues, the fix path was narrow and clear
- Hard:
  - deterministic ids plus persisted local runtime state are a dangerous combination in module-conformance tests; the product was right, but the harness was lying
  - a hybrid simulated/live feature needs the activation boundary to be explicit in code, not inferred from a single metadata field
- Improve:
  - any future module that persists local runtime state outside collections should have test-harness cleanup built in from the first conformance test
  - when a feature can operate in both simulated and live modes, gate the live path on actual live credentials/state, not on configuration intent alone

### 2026-03-11 - Remote Ops Real Connect UX Recovery
- Tasks:
  - reclassified the real-connect milestone from “green and reviewable” to “technically green but operator-rejected”
  - locked the next recovery slice around connection usability rather than more backend capability
- Easy:
  - the operator feedback was precise; the missing value is not more auth mechanics, it is a usable setup procedure
- Hard:
  - a technically correct OAuth flow is still a product failure if the first required field depends on outside Google-console knowledge that the desk does not explain
- Improve:
  - for external-service integrations, “review-ready” must mean the operator can reasonably complete the first-run setup from the UI with bounded, explicit instructions

### 2026-03-11 - Remote Ops Real Connect UX Recovery Closure
- Tasks:
  - delivered the missing operator setup surface for Google auth
  - converted the connection procedure from “know the magic field” into a visible ordered flow
  - reran the full repo gate after the recovery slice
- Easy:
  - once the problem was framed correctly, the right solution was mostly UX and workflow wiring, not more auth plumbing
- Hard:
  - even a good backend milestone is still unusable if the first-run setup assumes provider knowledge the UI never teaches
- Improve:
  - for any external-auth flow, the setup card should exist in the first reviewable slice, not as a follow-up repair

### 2026-03-11 - Remote Ops First-Run Usability Tightening
- Tasks:
  - removed the stale-profile-first landing by making fresh browser sessions open in `New Connection Profile` mode
  - reset stale validation state when connection inputs or project selection change
  - auto-selected the obvious discovered project after Google project loading
- Easy:
  - once the desk opened in a clean new-profile state, the rest of the setup sequence read much more naturally
- Hard:
  - existing saved test profiles can pollute the perception of a workflow even when the underlying connect implementation is already correct
- Improve:
  - operator-first integrations should default to a clean creation flow and treat existing test/demo records as optional context, not the starting state

### 2026-03-11 - GCP Auth Direction Correction
- Tasks:
  - corrected the GCP auth architecture after clarifying that the app should act through a stable service identity on the operator's machine
  - updated the research memo and handoff to treat service-account credentials as the main connection path
  - rewrote the Desktop implementation ticket to match the service-account-first architecture
- Easy:
  - once the use case was stated precisely, the service-account fit was direct
- Hard:
  - it is easy to confuse delegated end-user OAuth with “local app does work for me on my cloud account”
- Improve:
  - separate these design questions early:
    - who is the operational identity
    - where the credential lives
    - what the user-facing connection flow should be

### 2026-03-11 - Remote Ops Service-Account Step 1 Closure
- Tasks:
  - replaced the OAuth-first operator flow with a service-account-key connection path
  - implemented local key-file loading, metadata extraction, JWT bearer token exchange, live project validation, and live target validation
  - rewrote the focused frontend and server tests to guard the real service-account procedure instead of the deprecated popup flow
  - reran the full repo gate after the auth reset
- Easy:
  - once the auth model matched the real use case, the operator flow became much simpler and the tests became easier to reason about
- Hard:
  - the main risk was leaving mixed OAuth and service-account assumptions across UI, routes, and tests; the reset only became trustworthy after every layer said the same thing
  - frontend integration mocks needed to return fresh array copies so selection effects behaved like the real API instead of sticking on stale references
- Improve:
  - when an auth architecture is corrected, rewrite the entire user procedure and focused tests in the same pass; partial migration leaves a deceptive green surface
  - for local credential flows, prefer metadata-first collection storage and explicit warnings about sensitive files from the first usable milestone

### 2026-03-11 - Remote Ops Service-Account Key Chooser
- Tasks:
  - replaced the brittle path textbox flow with a real JSON key chooser
  - added a backend import route that copies the chosen file into a module-owned untracked runtime area
  - rewrote the focused frontend/server tests to guard the chooser/import flow instead of the old path string
- Easy:
  - once the boundary was clear, the backend model was straightforward: import file, validate JSON, store only the resulting reference plus metadata
- Hard:
  - a normal browser cannot safely hand the app a reusable absolute local path, so “proper input” needed to mean import semantics, not just a prettier text field
- Improve:
  - for local-file-backed credentials, design the storage contract around import/reference from the start; path-textbox workflows are fragile and poor UX in browser-hosted apps

### 2026-03-11 - Remote Ops Live Target Inspection
- Tasks:
  - inspected the first real saved live connection/target state after operator review
  - verified that the current target issue is a real remote config/permission failure, not a broken validation route
  - translated the operator’s next requirement into a dedicated live-procedures plan
- Easy:
  - once the saved rows and run history were inspected directly, it was obvious the runtime was already hitting GCP correctly
- Hard:
  - placeholder defaults like `media-bucket` are acceptable in simulated mode but actively misleading in live mode
- Improve:
  - live target forms should not seed placeholder bucket names that look deployable; they should force explicit real configuration or visibly mark the fields as placeholders

### 2026-03-12 - Remote Ops Live Procedures Closure
- Tasks:
  - replaced the live compare/execute/restore placeholders with real Firestore and storage procedure runtimes
  - exposed the live procedure controls in the kitchensink UI instead of keeping them artificially disabled
  - added focused server/frontend proof for live Firestore push and live storage sync/restore
  - fixed a real nested-file hash bug discovered while proving live storage sync
- Easy:
  - once the service-account validation path already existed, the live procedure layer had a clean place to attach
- Hard:
  - storage compare looked correct at the top level but was wrong for nested files because the recursive hash collector silently dropped the requested algorithm/encoding
  - repo-wide gate review can get polluted by unrelated existing integration timeouts, so the checkpoint needed a clear distinction between remote-ops proof and unrelated red lanes
- Improve:
  - whenever a compare routine depends on a shared recursive helper, add at least one nested-path proof case immediately
  - when a milestone is review-ready but the full gate is red outside the slice, record the exact failing files so the next session does not conflate product regressions with harness debt

### 2026-03-12 - Remote Ops Unified Provisioning Direction
- Tasks:
  - converted the remote-ops goal from “validate and sync targets” to “make the remote compatible with our full supported flows”
  - locked the new boundary rule that all remote/GCP logic should stay inside strict module-local files/folders unless a reusable primitive is genuinely proven
  - started Slice A with a canonical GCP provisioning model and route
- Easy:
  - the right first move was a canonical model, not another UI guess
- Hard:
  - provisioning design can sprawl into core abstractions quickly if the file/module boundaries are not stated explicitly before coding
- Improve:
  - for infrastructure-heavy features, start with one module-local compatibility model that names resources, permissions, and safeguard rules before wiring inventory/provisioning logic

### 2026-03-12 - Remote Ops Unified Provisioning Compatibility Analysis
- Tasks:
  - implemented a real module-local GCP compatibility report instead of another static/procedural guess
  - split the remote-ops desk and test files while adding the new analysis surface so the module stayed inside repo shape constraints
  - proved the new slice with focused server/frontend checks before looking at the broader gate
- Easy:
  - the provisioning model paid off immediately; once the canonical bundle/permission/resource model existed, the analysis runtime stayed coherent
- Hard:
  - the repo-wide gate still carries unrelated frontend integration failures, so it is important to distinguish “remote-ops slice is green” from “repo gate is green”
  - UI/test splitting is not optional in this repo; if it is left until the end of an infra-heavy slice, shape contracts become the real blocker
- Improve:
  - for future remote/provider work, pair every new backend capability with a module-local operator report in the same slice; backend-only milestones are hard to evaluate
  - when a slice is green but the repo gate is red elsewhere, write the exact failing files into the handoff immediately so the next session does not waste time rediscovering them

### 2026-03-12 - Remote Ops Unified Provisioning Execution
- Tasks:
  - added the connection-scoped `provision-missing` flow with explicit safeguard confirmation
  - kept provisioning strictly inside `test-modules-remote-ops` and limited it to supported resources that are actually configured
  - closed the full repo gate again after the provisioning/UI/test changes
- Easy:
  - the compatibility report made a good execution boundary; once the ready-now actions were explicit, provisioning logic stayed narrow
- Hard:
  - provisioning cannot trust a single report pass when APIs are disabled, because the missing resource behind that API is invisible until the API is enabled
  - if bundles with no live targets are treated like missing infrastructure, the product starts recommending unnecessary resource creation and violates the minimum-footprint rule
- Improve:
  - for provider provisioning flows, build the runtime around iterative `analyze -> act -> re-analyze` rather than a single static action list
  - treat `not configured` as a first-class state in operator tooling; otherwise compatibility UIs naturally drift toward over-provisioning

### 2026-03-12 - Remote Ops Live Rehearsal Findings
- Tasks:
  - rehearsed the real browser/operator flow against the `merchant-guild` GCP project instead of trusting the green automated slice
  - fixed a real live-only failure in browser-delivery permission diagnostics
  - proved Firestore live compare/execute end to end and captured the real storage IAM blocker
- Easy:
  - once the service-account connection was valid, the Firestore live path exercised cleanly: validate -> compare -> execute -> clean
- Hard:
  - a single invalid provider permission string (`certificatemanager.certificates.*`) collapsed the whole compatibility report even though the rest of the live runtime was fine
  - storage provisioning can look like a product bug when it is actually a real IAM boundary; the UI currently proves the block but does not yet turn it into strong operator guidance
- Improve:
  - every provider/infrastructure milestone needs one real browser rehearsal before being called review-ready; synthetic tests were not enough to catch the bad Certificate Manager permission ids
  - blocked live bundles should explain the next operator action in role/permission terms, not only echo the raw missing permission names

### 2026-03-12 - Remote Ops Live Rehearsal After IAM Update
- Tasks:
  - reran the real `merchant-guild` flow after the operator granted the precise storage/datastore/service-usage roles
  - proved provisioning + sync for both deployment storage and media storage against real GCP buckets
  - exercised a real bounded media restore from GCP back to the local `media/` root
- Easy:
  - once IAM was correct, the compatibility model behaved as intended: missing buckets moved from blocked/permission noise to `action-required` with ready-now create actions
  - the same workflow shape held across Firestore, deployment storage, and media storage
- Hard:
  - target-level screens can stay stale after connection-level provisioning until the operator re-validates the target; the product truth was right, but the desk state needed one more explicit refresh step
  - a live-only restore defect survived the green tests because nested storage object names were encoded incorrectly in the JSON API path
- Improve:
  - after any provisioning action, refresh or guide the operator back into target-level validation explicitly so the desk cannot look stale when the remote is actually fixed
  - keep all provider path-building logic covered with nested-key proofs; live storage APIs are unforgiving about object-name encoding details

### 2026-03-12 - Remote Ops Step 4 Embedding Start
- Tasks:
  - closed the kitchensink milestone with a real commit/push
  - started the embedding slice with a dedicated hard plan instead of continuing ad hoc from Step 3 notes
- Easy:
  - the right Step 4 rule is clear: embedded modules consume remote-ops state/actions, but remote-ops keeps ownership of provider logic
- Hard:
  - the integration risk now is duplication, not missing capability; `Pages`, `Content`, and `Media Manager` already have their own local-state workflows and it is easy to smear remote logic across them if the contract is not explicit first
- Improve:
  - whenever a dedicated operations module graduates into product embedding, write the “owner vs consumer” boundary first and keep it visible in handoff/plan files before touching UI code

### 2026-03-12 - Remote Ops Step 4 Embedding Closure
- Tasks:
  - embedded remote compare/execute/restore workflows into Pages, Content, and Media Manager without moving GCP/provider logic out of `test-modules-remote-ops`
  - closed the full repo gate after fixing contract-shape issues discovered only during final verification
- Easy:
  - the module-local helper boundary worked; once embedded modules only consumed target/run/procedure helpers, the provider ownership line stayed clean
- Hard:
  - async operator procedures made the first integration tests too optimistic; the tests had to follow the real sequence (`compare`, wait, then `execute`/`restore`) instead of clicking through instantly
  - repo-shape contracts became real blockers at the end of the slice:
    - a Pages test file crossed the 600-line limit
    - runtime discovery still expected only the old module-settings owners
- Improve:
  - when embedding procedure-driven flows, write the tests in operator sequence from the start instead of relying on simultaneous clicks
  - when a slice adds settings capability to a module, update runtime-discovery expectations in the same pass; otherwise the final gate fails late for a predictable reason

### 2026-03-12 - Live Embedded Remote Flow Rehearsal
- Tasks:
  - exercised the real `Pages`, `Content`, and `Media Manager` remote workflows against `merchant-guild` using the embedded desks, not just `Remote Ops`
  - proved local fan-out of 10 published post pages, remote deployment sync, Firestore projection sync, and media sync
- Easy:
  - once the target bindings were in place, the embedded desks were workable and the remote state changes were legible without dropping into provider-specific code paths
  - deployment and media storage behaved predictably as mirror-style object targets
- Hard:
  - Firestore looked "synced" at first but still kept two stale remote-only documents because the target policy had `allowDeletes: false`
  - that was not a runtime failure; it was a target-policy truth that had to be corrected in `Remote Ops`
- Improve:
  - embedded desks should surface destructive-sync policy more explicitly when a compare result contains only deletes, otherwise the operator can misread "execute succeeded" as "remote is now clean"
  - live rehearsal remains the fastest way to find these workflow-level gaps; tests alone would not have exposed the operator confusion around policy-vs-sync-result

### 2026-03-12 - Client Runtime M03 Kickoff
- Tasks:
  - read `C:\Users\cmsin\OneDrive\שולחן העבודה\M03-client-script.md`
  - mapped the existing page-deployment/runtime-script seam before choosing package boundaries
  - opened a new contract and execution plan for a standalone `client-runtime/` package
- Easy:
  - the repo already has the right HTML seam: deployed pages inject mount tags, runtime script URLs, and the page payload JSON
- Hard:
  - the current delivery contract did not permit a new top-level package until it was explicitly formalized
- Improve:
  - when a new library/package is introduced outside the established `frontend/`/`server/` surfaces, formalize the repo boundary first so later implementation does not look like structural drift

### 2026-03-12 - Client Runtime V1 Package Delivery
- Tasks:
  - delivered the standalone `client-runtime/` workspace package with a browser-ready global artifact
  - kept all runtime logic inside the new package boundary and only touched root workspace/gate wiring
  - switched package verification to single-process scripts because forked runners/builders hit Windows sandbox `EPERM`
  - added a static browser playground so the package can be exercised without page-deployment integration
  - added a declarative generic remote adapter path plus a JSONPlaceholder proof page for real HTTP queries/actions
- Easy:
  - the runtime design stayed clean once the package boundary was locked first
  - the existing HTML deployment seam already proves where this artifact will attach later
- Hard:
  - common JS tooling choices (`vitest`, `esbuild`) assumed process spawning that is unreliable in this environment
  - a custom single-process test harness was the pragmatic fix; fighting the sandbox would have wasted time
- Improve:
  - for future standalone packages in this repo, decide early whether the environment can tolerate worker/fork based tooling
  - keep the first package artifact and browser proof inside the package itself before integrating it into wider product flows

### 2026-03-12 - Browser Delivery Step 5 Kickoff
- Tasks:
  - converted the open “domain management” discussion into a bounded execution slice instead of jumping directly to full CDN/load-balancer orchestration
  - locked the slice to `test-modules-remote-ops` and `test-modules-pages`
- Easy:
  - the current repo already has the right ownership split:
    - remote target/provider state in `Remote Ops`
    - page output generation in `Pages`
- Hard:
  - “domain management” can easily sprawl into DNS, certificates, load balancers, CDN, public ACLs, and URL mapping all at once
  - the operator request is broader than the currently implemented GCP stack, so the first step must stay explicit about what becomes real now versus what remains future work
- Improve:
  - when a capability spans remote infrastructure and page rendering, lock the exact supported public-url model first; otherwise implementation drifts between “instructions only” and “full provisioning” without a crisp product claim

### 2026-03-13 - Browser Delivery Step 5 Closure
- Tasks:
  - finished the bounded browser-delivery/domain slice inside `test-modules-remote-ops` and `test-modules-pages`
  - made Pages delivery payloads and deployed HTML domain-aware from the selected browser-delivery target
  - fixed discovered module route context so module-owned routes can resolve module settings through `resolveSettingsRepository`
  - closed the full repo gate after verifying the environment-specific frontend lane behavior
- Easy:
  - once the browser-delivery descriptor stayed module-local, both `Remote Ops` and `Pages` could consume the same public-origin/public-url contract without inventing another shared abstraction
- Hard:
  - the subtle bug was not in Pages rendering, it was in route context composition: discovered module routes did not receive `resolveSettingsRepository`, so Pages routes silently could not see the selected browser-delivery target
  - the long frontend integration lane was red once, but the failure was environmental; an active review pair on `3000/3001` was enough to tip the machine into timeout noise
- Improve:
  - when a module-owned route needs settings, verify the discovered-route registration context explicitly instead of assuming parity with built-in routes
  - on this machine, stop the live review pair before `pnpm quality:gate:full`; otherwise the frontend integration lane can fail for capacity reasons even when the slice itself is correct

### 2026-03-13 - Browser Delivery Step 6 Start
- Tasks:
  - started the HTTPS delivery-stack evolution after closing the direct-storage/domain-aware slice
  - kept the scope bounded to `test-modules-remote-ops` and `test-modules-pages`
  - locked the next step in a dedicated hard plan before touching runtime behavior
- Easy:
  - the existing browser-delivery target already owns the right conceptual seam
- Hard:
  - the real gap is path compatibility and managed-resource lifecycle, not another auth flow
- Improve:
  - when a previous slice deliberately stops short of full infrastructure execution, start the next slice by writing the exact public URL/resource contract first so the implementation does not drift

### 2026-03-13 - Browser Delivery Step 6 Closure
- Tasks:
  - closed the HTTPS browser-delivery stack slice inside `test-modules-remote-ops`
  - split oversized Step 6 runtimes into smaller module-local helper files to satisfy repo LOC/function-shape gates
  - completed a live review of the browser-delivery editor and the resulting Pages delivery payload after the full gate passed
- Easy:
  - the operator-facing contract was easy to verify once the target editor preview was wired correctly; switching `stackMode` immediately showed whether the slice was coherent
  - keeping the provider logic bounded inside `test-modules-remote-ops` made the refactor straightforward even while the files were being split
- Hard:
  - the first structural split dropped a couple of executor/helper dependencies, so the conformance lane had to stay in the loop until the browser-delivery provisioning path was green again
  - process cleanup on this Windows machine still requires low-level `netstat`/PID handling instead of richer process introspection because some process APIs are access-restricted
- Improve:
  - when splitting large module-local runtimes, extract low-level resource operations first and leave the orchestration file last; it reduces accidental dependency loss
  - keep live review after the full gate for infrastructure-heavy slices so UI checking and structural debugging do not happen at the same time


## 2026-03-13 - Current-state documentation pass
- Started a durable repo-map/capability inventory under docs/research instead of leaving architecture understanding in handoff only.
- Pass 1 covers runtime entrypoints, active module surfaces, and current operator workflows. Future passes should deepen route-level and field-level detail instead of rewriting the document structure.

- Pass 2 on the current-state repo map added concrete server/frontend runtime topology and module-owned route matrices. Remaining work is now mostly field-level inventory and deeper deployment/remote call maps, not basic structure discovery.

- Added active-module field inventory to the current-state repo map so future planning does not have to reopen manifests just to find core entities/settings.

- Pass 3 closed the high-value remaining gaps:
  - request/response summaries for module-owned custom APIs
  - deployment/browser-delivery execution chains
  - remote compare/execute/restore/provisioning chains
  - explicit screen/input/action inventories for the operator desks
- The main lesson from this documentation pass is that the repo is already too broad to keep “current state” in transient chat memory. The research doc is now the durable baseline and future architectural work should update it deliberately instead of relying on handoff accretion.

### 2026-03-14 - M04 Product Shell And Release Pipeline
- Tasks:
  - aligned the shell to product-facing routes and synthetic desks
  - added managed target auto-preparation and module-setting auto-binding after remote validation
  - added a `Deployments` desk release pipeline that orchestrates local HTML sync plus remote projection/media/html/browser procedures
  - updated the smoke lane to assert the product shell instead of the retired proof shell
- Easy:
  - the existing module seams were strong enough for product desks to compose module-owned behavior without adding more shared backend abstraction
  - once remote validation prepared the standard bundle automatically, the downstream product desks became much simpler
- Hard:
  - most failures were contract/shape failures, not behavior failures; the right response was extraction and route-alias test updates, not feature rollback
  - route aliases changed the public shell contract in a way that immediately broke smoke expectations, so E2E needed to be treated as part of the product-shell change itself
- Improve:
  - when a synthetic desk becomes first-class, add direct integration/E2E coverage for it in the same slice
  - keep product-level orchestration in `frontend/src/app/product-shell` and leave remote/provider procedure logic inside `test-modules-remote-ops`
  - if a validated remote deterministically implies standard targets, prepare them automatically instead of asking the operator to create them manually

### 2026-03-14 - M04 Strict Product Remote Governance
- Tasks:
  - added a shared product-shell remote-health model instead of letting each desk infer readiness ad hoc
  - surfaced validated-remote and usable-target counts in `System Settings`
  - locked remote-dependent selectors until a validated remote exists
  - tightened `Deployments` pipeline readiness so configured-but-unvalidated targets block the release instead of failing late
- Easy:
  - the existing embedded remote-ops support already exposed enough state to compute strict readiness without another backend API
  - keeping the readiness logic in a small product-shell helper made it reusable across `System Settings` and `Deployments`
- Hard:
  - MUI select disabled state is rendered through `aria-disabled`, not the simple native-disabled contract the first test expected
  - the real verification friction was environmental again: frontend vitest needed escalation because the sandbox blocks Vite/esbuild child-process spawning
- Improve:
  - when product-level strictness depends on module-owned remote data, centralize the readiness rules first; otherwise different desks drift into slightly different interpretations of "usable"
  - on this machine, treat frontend vitest as a likely escalation candidate once Vite/esbuild child processes are involved

### 2026-03-15 - M04 Page-Owned Remote Bindings
- Tasks:
  - added explicit page-owned deployment/browser target bindings on `blog-pages`
  - made Pages desk and product `Deployments` prefer page-owned bindings over Pages module defaults when a specific page is in scope
  - fixed the server-side delivery/render path so synced per-record HTML and preview/delivery APIs resolve browser-delivery metadata through the same settings path
- Easy:
  - the product/UI side was straightforward once the page model owned the two target ids directly
  - the new behavior fit naturally into existing Pages/Deployments desks by surfacing binding-source labels instead of inventing a new abstraction
- Hard:
  - the actual regression was subtle: `normalizeTrimmedText()` returns `\"\"`, so using it in a `??` fallback chain silently discarded valid module defaults
  - the failure first looked like an HTML render bug, but the real seam was settings resolution; reproducing the scenario outside vitest made that obvious
- Improve:
  - never use a non-nullable string normalizer inside fallback chains; use the optional-text normalizer when empty string must not short-circuit resolution
  - when preview and artifact HTML diverge, reproduce the same scenario through both routes first; it collapses the search space immediately

### 2026-03-15 - M04 Named Deployment Bundles
- Tasks:
  - added `page-deployment-bundles` so release ownership is a named persisted object instead of an implicit page/default selection
  - rewired product `Deployments` to release from the selected bundle
  - constrained bundle editing to typed validated targets instead of offering every remote target in every selector
- Easy:
  - the existing remote-health helper already knew how to classify validated targets, so typed selector options could stay inside the product shell without new backend APIs
  - adding a bundle collection in `test-modules-pages` kept the persistence boundary clean
- Hard:
  - the first version was behaviorally fine but failed the repo shape gate because `useProductDeploymentsWorkspace` absorbed too much orchestration
  - frontend vitest on this machine still needs escalation whenever Vite/esbuild child-process spawning trips the sandbox `spawn EPERM` boundary
- Improve:
  - when a desk shifts from implicit selection to persisted release objects, add a create-flow test in the same slice; otherwise the desk can look structurally complete while only the old happy path is covered
  - keep typed target filtering near the editor hook, not scattered through the view, so later bundle validation rules stay maintainable

### 2026-03-15 - M04 Client Runtime Injection
- Tasks:
  - connected generated page HTML to `client-runtime` instead of leaving the runtime package isolated
  - introduced a declarative inline-json bootstrap path so page payload JSON can seed a runtime dataset without inventing the final remote API contract
  - copied the built runtime asset into the deployment root so deployed HTML references a real local artifact
- Easy:
  - the existing `page-data` script tag was already the right bootstrap seam; no new page payload transport was needed
  - keeping the browser bootstrap logic inside `client-runtime/src/browser` preserved the package boundary cleanly
- Hard:
  - JSON-serialized runtime config cannot carry functions, so the runtime needed a new declarative bootstrap mode instead of just reusing `fetchInstall` closures from the demos
  - the first proof failure was not in Pages, it was in the package test harness forgetting to provide an IndexedDB-capable adapter for auto-installed datasets
- Improve:
  - when a standalone runtime package gets integrated into page delivery, prove both sides in the same slice:
    - package-level bootstrap behavior
    - deployed-page HTML contract
  - prefer declarative bootstrap descriptors over inline function generation when config must survive HTML serialization

### 2026-03-15 - M04 Media-Aware Page Delivery
- Tasks:
  - resolved media ids inside delivered page payloads into first-class media descriptors with public, temporary, local, and preferred urls
  - enriched delivered record JSON with companion media objects next to `*MediaId` and `*MediaIds` fields instead of forcing consumers to hand-resolve ids
  - extended injected `client-runtime` config so media descriptors bootstrap into a second local dataset and become queryable through `media.list` / `media.byId`
  - added a bounded remote refresh seam so delivered page and media datasets can sync from the published page follow-up route without inventing the full final runtime API yet
- Easy:
  - the existing browser-delivery payload already carried enough media-base information to build public and temporary media urls without touching remote-ops
  - keeping the enrichment inside a Pages-owned helper preserved module boundaries and avoided pushing page-shaping logic into Content or Media Manager
- Hard:
  - the first implementation was behaviorally correct but failed the function-shape gate; the fix was to split contract assembly and media-reference resolution into smaller helpers immediately
  - `og:image` had to stop using the raw media id and prefer the resolved media url, otherwise the HTML stayed domain-aware everywhere except the head tags
  - runtime remote refresh had to stay honest: the only safe product-authored seam right now is the existing page follow-up route, not a fake generic content API that does not exist yet
- Improve:
  - when payload enrichment depends on conventions like `*MediaId` and `*MediaIds`, keep the naming rule explicit in one helper instead of scattering special cases through page rendering
  - once a delivered JSON contract gets richer, wire it into the injected runtime in the same pass so the new payload shape is actually consumable
  - default browser runtime remote base resolution belongs in the bootstrap layer, not in every generated page contract

### 2026-03-15 - M04 Deployment Bundle Observability
- Tasks:
  - added persisted bundle-run history in `page-deployment-bundle-runs`
  - surfaced bundle validation and run history in the Product Deployments desk
  - blocked bundle save/release when the selected page/targets/browser linkage are not contract-coherent
  - recorded step-level run state while the release pipeline executes
- Easy:
  - the existing deployment bundle abstraction was already the right persistence boundary, so adding run history stayed module-local to Pages
  - the pipeline support file already had a clear step plan; persisting those steps only needed a small run-history helper instead of a new orchestration model
- Hard:
  - the first implementation passed behavior checks but failed the repo LOC gate; the fix was structural extraction, not feature rollback
  - the Product Deployments integration proof became flaky when the repeated selector flow was compressed too aggressively; the correct fix was restoring async option selection, not loosening assertions
- Improve:
  - when a desk grows in both behavior and diagnostics, extract view sections and test helpers in the same pass instead of waiting for the LOC gate to force it
  - keep bundle contract validation in one helper and reuse that result across save/readiness/history surfaces; otherwise the release desk will drift into parallel notions of \"valid\"

### 2026-03-15 - M04 Server-Side Bundle Contract Enforcement
- Tasks:
  - added a Pages-module server wrapper for `page-deployment-bundles`
  - moved the deployment-bundle contract from frontend-only enforcement to module-owned server enforcement
  - proved the server rejects invalid bundle saves when target kinds/scopes do not match the bundle contract
- Easy:
  - the Pages module already owned wrapped collection handlers, so the correct seam was obvious once the bundle collection existed
  - the bundle contract was already explicit in the product desk, so porting it server-side was mostly contract reuse, not new product design
- Hard:
  - the first normalization helper crossed the function-shape gate even though the behavior was right; the fix was small helper extraction, not weaker validation
  - bundle validation touches several foreign collections, so the wrapper had to stay disciplined about lookup helpers and conflict construction or it would have drifted into an ad hoc mini-runtime
- Improve:
  - once a persisted object becomes the release contract, enforce it at the module-owned server boundary in the very next pass; frontend-only validity is not an acceptable resting state
  - keep cross-collection contract constants in one shared module-local file so later bundle-driven mission work reuses the same source of truth

### 2026-03-15 - M04 Mission-Backed Bundle Release
- Tasks:
  - converted deployment-bundle release into a first-class Pages mission while keeping the existing Pages pipeline as the execution seam
  - added a shared Pages route-context helper so routes and missions resolve the same handlers/settings/runtime dependencies
  - rewired the Pages frontend support layer to submit and poll the mission job instead of assuming one synchronous route round trip
  - tightened conformance stability where the heavier release flow exposed filesystem timing races
- Easy:
  - the release pipeline was already sufficiently modular; mission registration only needed a thin wrapper around the existing executor
  - keeping the public frontend helper name stable avoided a larger product-shell refactor in the same pass
- Hard:
  - mission registrars could not previously see `collectionHandlerRegistry`, which forced a small but real core-runtime composition change before Pages could reuse its existing release code cleanly
  - the first pass looked green in focused checks but exposed a latent Windows cleanup race in simulated remote roots under the full dynamic conformance lane
- Improve:
  - when a module mission must reuse module-owned handlers, pass the real handler registry through mission registration context instead of rebuilding CRUD logic from repositories
  - when a new pass increases filesystem churn, stabilize the test helper with bounded retry/polling instead of accepting intermittent full-gate failures

