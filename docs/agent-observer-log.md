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

### 2026-03-21 - Comments Only Became Coherent Once The Queue Took Over The Page
- Tasks:
  - replaced the old comments page that front-loaded readiness/compliance/intake cards
  - rebuilt it as:
    - queue-first page
    - compact queue signals
    - hotspot panel
    - moderation table
    - right-side comment workbench
- Easy:
  - the live route made the problem obvious immediately: the old screen talked too much before the moderator even reached the queue
  - once the design was reduced to `queue on page, one comment in drawer`, the rest of the structure followed naturally
- Hard:
  - the product route was not the same as the module view, so tracing the actual owner mattered before editing
  - the first live queue showed raw post ids in the table and hotspots; that had to be corrected with the awareness-loaded post titles before the desk felt acceptable
- Improve:
  - if the page is about moderation, the queue must visually dominate the route
  - system/explainer panels belong in the drawer or in compact secondary support, not ahead of the main operator task
  - live browser proof is the fastest way to catch when the desk is still speaking in ids instead of publication language

### 2026-03-21 - If Tabs Feel The Same, The Workspace Is Still Wrong
- Tasks:
  - revisited the Posts drawer after live product feedback that `Organize`, `Media`, and `SEO` still felt like the same edit screen
  - rebuilt the drawer so each tab owns a different workspace instead of reusing the writing canvas
- Easy:
  - the structural fix was straightforward once the real standard was stated clearly:
    - different tab = different job
    - different job = different surface
- Hard:
  - the first browser check falsely looked unchanged because the already-open route had not reloaded after the code change
  - only the refreshed live route proved the improvement:
    - `Organize` no longer showed `Write The Post`
    - `Media` no longer showed the body editor
    - `SEO` no longer showed the body editor
- Improve:
  - do not accept "different labels on the same form" as a tab system
  - when product feedback says two tabs feel the same, verify in browser before rationalizing from code
  - for high-value desks like Posts, the live route is the real acceptance surface

### 2026-03-21 - Posts Only Settled Once The Page Stopped Editing On The Page
- Tasks:
  - replaced the stacked Posts screen with a backlog page plus a dedicated right-side post drawer
  - moved publication context into the drawer instead of letting it compete with the roster
  - used the live screenshot and real browser create/edit flow as the product baseline, not only the earlier implementation plan
- Easy:
  - the story became implementable once the desk was treated like Authors structurally:
    - roster anchored on the page
    - one record opens in a side surface
    - URL keeps the selection/filter state
- Hard:
  - the first Posts rewrite still looked like a dressed-up module because it kept too much authoring and release UI on the page itself
  - one drawer action (`New Draft`) turned out to be a real usability bug during live review because the page-level `New Post` action already owns draft creation
  - the focused Posts Vitest path still hit the environment hang boundary, so live browser proof had to carry the slice
- Improve:
  - when a desk is the main product surface, insist on the live route rhythm first:
    - what stays on the page
    - what opens in a drawer
    - what belongs only in a later tab
  - treat screenshots as proof material, not decoration; the old Posts screenshot made the over-stacked problem obvious immediately
  - if one action already owns creation, do not duplicate it inside the edit surface

### 2026-03-21 - URL-Driven Desks Still Need Immediate Local UI State
- Tasks:
  - finished the Media story slice and closed the last failing integration test
  - kept the desk URL-backed for sort and detail tab state
  - rebuilt and reverified the review env before handing off the slice
- Easy:
  - the failing test pointed to the exact user-facing weakness: route-backed tabs were not visually switching in a render that did not get a parent route update
  - the media desk already had enough structure to absorb the fix without redesign
- Hard:
  - route state alone is not enough for a responsive desk when tests or some runtime situations do not immediately rerender from the new URL
- Improve:
  - when a desk owns URL state for tabs, sort, or drawers, also update the local visible state immediately and let the route catch up
  - the review stop point is stronger when it includes:
    - focused test proof
    - fresh frontend build
    - review env verify
    - one direct browser route check

### 2026-03-21 - Media Desk Needed Visible Remote Feedback At The Point Of Action
- Tasks:
  - executed the first Media follow-up pass after review
  - added remote procedure feedback to the bulk-action area and the publish tab
  - widened/regrouped the filter area into a real search/filter section
- Easy:
  - the remote support hook already exposed enough state:
    - `processing`
    - `procedureType`
    - `targetId`
    - `errorMessage`
    - `successMessage`
  - the missing piece was simply placing that state where the user actually clicks
- Hard:
  - the live browser route initially kept showing an older publish stack even though tests were green
  - restarting the review env and opening a fresh page was required to verify the actual updated desk
- Improve:
  - if a desk offers secondary remote actions from a primary workspace, show status right next to those actions
  - “button disabled” is not an explanation; every blocked remote action needs an explicit visible reason

### 2026-03-21 - Media Needed A Real Library Surface, Not A Permanent Side Stack
- Tasks:
  - finished the remaining Media passes
  - moved asset editing into a persistent right-side drawer
  - restored derivation as a first-class asset workflow
  - added gallery/list browse modes
- Easy:
  - route state already carried most of the needed semantics once `mediaView` was added
  - usage awareness and remote sync state could be reused inside the new drawer without new backend work
- Hard:
  - modal drawer behavior hid the underlying desk in tests and felt heavier than the intended sidebar workflow
  - switching to a persistent drawer solved both the product feel and the testing/accessibility mismatch
- Improve:
  - if a story says “the right side becomes a working bench”, prefer a persistent drawer/workbench over a permanent second column
  - large-library stories should get a list mode from the start, not as a late enhancement

### 2026-03-18 - Browser-Firestore Was Easier Than A Second Public Backend, But Only After Fixing The Canonical Config Path
- Tasks:
  - abandoned the Cloud Run detour for the tester path
  - moved the direct-browser Firestore contract into browser-delivery config and page payload propagation
  - split the temporary tester into three assets so the repo gates stayed green while adding the browser-firestore seam
- Easy:
  - the correct product boundary was simpler once stated clearly: public page -> runtime/action layer -> Firestore
  - existing published Firestore projection descriptors gave the page a natural document target once the browser-delivery payload actually carried the new config
- Hard:
  - the first implementation looked complete but the new Firebase fields were being dropped by `normalizeTargetConfig(...)` in remote-ops shared runtime
  - the next failure was also real: direct Firestore mode needs an actual published Firestore projection target for the page source type, not just browser config
  - the repo gates forced a real cleanup:
    - support script exceeded repo LOC
    - new helper asset exceeded function-shape by one line
    - script-url resolver exceeded complexity
- Improve:
  - when adding new target config fields, update the canonical target normalizer immediately or the UI and payload layers will silently drift apart
  - treat public-page runtime transport as a first-class delivery contract, not as a patch on top of local review behavior
  - when a temporary browser supplement grows, split assets early instead of waiting for LOC/function-shape gates to catch it

### 2026-03-17 - Runtime App Layer Works Best As A Separate Asset, Not Another Inline Probe
- Tasks:
  - replaced the idea of an inline probe UI with a separate deployed `application-tester` asset
  - kept `client-runtime` generic and moved page-visible behavior into the tester script
  - exposed the tester contract in the Pages runtime inspection surface
- Easy:
  - `crudClientRuntime.configure(...)` made it straightforward to layer tester-specific datasets/queries/actions on top of the base runtime
  - the existing published sidecar was already a valid remote seam for the first read/install flows
- Hard:
  - the page runtime contract now has two related layers, so the preview surface needed to make that split explicit instead of dumping everything under `clientRuntime`
  - preview payloads without browser delivery correctly use relative tester URLs, while deployed pages with a public URL should emit absolute ones
- Improve:
  - keep page application logic in separate deployable assets whenever the goal is replaceability
  - if a page supplement depends on runtime registries, inject a small contract and merge it through runtime configuration instead of hardcoding private browser hooks

### 2026-03-17 - Review Env Must Be A Repo Command, Not A Repeated Manual Ritual
- Tasks:
  - added a repo-owned review launcher instead of continuing to juggle one-off frontend/backend startup variants
  - locked the local review contract to:
    - backend on `127.0.0.1:3001`
    - static frontend on `localhost:3000`
    - pid tracking under `.codex-runtime`
  - documented the next client-runtime direction as an explicit M07 plan instead of keeping it in chat
- Easy:
  - once the launcher stopped trying to be clever and just spawned detached Node processes, startup became stable
  - a static frontend server is enough for review on this machine; Vite dev is not required for most inspection flows
- Hard:
  - repeated process-control drift came from treating long-running shell commands as if they were normal startup waits
  - frontend build on this machine can still fail with the known child-process boundary, so the launcher must tolerate reuse of an existing `frontend/dist`
- Improve:
  - use the repo launcher first, not as a fallback after manual attempts
  - if a launch command does not return in a few seconds, abandon that method immediately
  - review setup should prefer deterministic static serving over fragile live-dev startup when the task is browser inspection
  - health checks in the launcher must use explicit request timeouts; default `fetch()` behavior is not acceptable for local-status commands
  - `review:env:start` and `review:env:status` should be run sequentially, because parallel execution can race the pid-file write even when both services are already healthy

### 2026-03-17 - Runtime Probe Proved The Boundary, Not The Final Product Shape
- Tasks:
  - delivered a temporary deployed-page probe that:
    - renders referenced media
    - fetches a published document
    - installs/querys through IndexedDB via `client-runtime`
  - wrote the M07 plan to replace that probe with a separate application-layer tester script
- Easy:
  - the runtime/data-layer part already existed; the missing piece was a small page-owned consumer of that API
  - same-origin deployed assets are the simplest honest boundary for a live published page
- Hard:
  - the first instinct to hit local backend routes from the public page was wrong; deployed pages need deployable boundaries, not `127.0.0.1`
  - the working probe is useful, but it is still not the intended final runtime/app split
- Improve:
  - keep runtime generic and move visible behavior into replaceable app-layer scripts
  - when the target is a public deployed page, design the boundary first and only then write the browser feature

### 2026-03-17 - MG-001 Passes 2-5 Closeout
- Tasks:
  - finished the canvas interaction model instead of reverting to the old rail-first builder
  - added structural presets and placeholder block vocabulary
  - added width badges and flex resize handles for row layouts
  - demoted library/layers/details into a support dock and refreshed the focused layouts proof around the new contract
- Easy:
  - the existing layout document model was still the right core; most of the work stayed inside frontend-only shell and mutation helpers
  - once the tests were rewritten to use the real menu-based interaction model, the builder behavior was stable
- Hard:
  - the first green interaction proof still failed the full gate because two layout files crossed the repo LOC limit
  - the right fix was extraction into module-local helper files, not shrinking the builder behavior or weakening the gate
  - DOM scoping in the tests needed care because a container shell contains descendant node shells, which created duplicate toolbar selectors
- Improve:
  - when a builder moves from explicit buttons to contextual menus, rewrite the proof to the new interaction contract immediately instead of trying to preserve old selector assumptions
  - for recursive canvas DOM, give tests a stable smallest-scope lookup strategy early, or selector ambiguity will mask real regressions
  - the repo LOC gate is useful here; it forced the MG-001 implementation to stay agentable instead of turning the main builder files into monoliths

### 2026-03-17 - MG-001 Pass 1 Canvas Shell
- Tasks:
  - converted the layouts route from a stage-card view into a bounded page workspace
  - added rulers, quiet grid, viewport presets, width/height steppers, and zoom without rewriting the layout model
  - kept left rail and inspector as support panels for this pass
- Easy:
  - the existing root/container model was strong enough; the page-workspace feel was a shell problem, not a persistence problem
  - once the page boundary was rendered explicitly, the route immediately read closer to the MG-001 ticket
- Hard:
  - adding visible quick-add controls introduced selector ambiguity and also exposed a real event-bubbling bug where canvas action buttons could re-select the root after inserting into a child container
  - the first full-gate attempt timed out only because `quality:gate:full` needed a longer command timeout in this environment, not because the slice was unstable
- Improve:
  - on-canvas action buttons must stop propagation by default; otherwise selection state becomes fragile as soon as the canvas gets more interactive
  - when a builder route gains duplicated verbs like `Add Block`, give quick-action controls distinct accessible names early so tests and operators can distinguish them

### 2026-03-16 - Product Billing Surface And MG-001 Planning Review
- Tasks:
  - added a product `Billing & Usage` tab under `Remotes`
  - wired real GCP billing linkage + budgets visibility through the service-account remote
  - reviewed the next layout-builder direction from the MG-001 ticket against the current layouts module
- Easy:
  - the server-side billing slice fit cleanly inside the existing remote-ops boundary
  - the current layouts module already has the right model core for MG-001: container/block tree, nested containers, deterministic moves
- Hard:
  - the first billing proof looked fine in code but still failed repo standards:
    - function-shape gate
    - frontend proof
  - the billing test failure was misleading at first because the UI rendered, but the actual issue was a bad test helper import and overly strict text selector assumptions
  - the Desktop `design.png` turned out not to be an image at all; it was an expired-URL JSON response
- Improve:
  - for product surfaces that auto-load remote data, tie loading to the explicitly displayed entity id, not only to internal selected-state timing
  - when a new panel adds text that duplicates a tab label, expect testing-library selector collisions and use role-based assertions early
  - treat external design assets as untrusted until the file is confirmed to be a real image

### 2026-03-16 - Post-M06 Client Runtime Asset URL Fix
- Tasks:
  - fixed deployed page HTML so `client-runtime.global.js` is no longer emitted as the broken root-relative `/assets/...` path
  - restored the persisted Merchant Guild credential copy and reran both live release bundles after the app surfaced the missing-key warning again
- Easy:
  - once the deployed page source was inspected, the bug was explicit: the asset file existed in deployment, but the emitted URL ignored the deployment bucket/prefix
  - the current saved connection already pointed at the exact missing imported key path, so restoring it was deterministic once the original download was located
- Hard:
  - the runtime contract and deployment copier were incorrectly coupled through one `assetUrl` field; the fix needed to preserve a stable deployment copy target while changing the browser-facing URL
  - the live release rehearsal was necessary because this bug only matters at the real deployed URL, not in local abstract payload inspection
- Improve:
  - treat deployed runtime assets as delivery-aware URLs, not root-relative app assets
  - for remote publishing regressions, inspect the deployed page source and network requests directly before assuming the artifact itself is missing

### 2026-03-16 - Post-M06 Browser Delivery Reality Check
- Tasks:
  - fixed the real browser-delivery bug where deployed HTML objects were uploaded as `application/octet-stream`, causing signed URLs to download instead of render
  - removed false missing-key warnings in `Deployments` that were coming from historical failed bundle runs rather than current remote state
  - replaced the weak "go to another desk" recovery behavior with an inline key re-import control on the actual deployment route
- Easy:
  - once the live signed URL was opened in the browser, the failure mode was obvious: this was not a routing problem, it was object metadata
  - the warning bug was local to one UI seam: historical `selectedBundleRuns[].summaryMessage` was being treated as current truth
- Hard:
  - the first implementation looked correct at the desk level but still failed the real product bar because it did not prove "browse the deployed page in a browser and see HTML"
  - tightening storage compare to include `contentType` immediately broke one conformance fixture, so the test had to be updated to model uploaded object metadata honestly
- Improve:
  - when preview or delivery claims browser usability, verify with a real browser-opened URL, not just API payload inspection
  - do not surface historical failure summaries as current state in product routes
  - if a recovery action belongs on the current route, keep it there; navigation advice is not a substitute for an action

### 2026-03-16 - Post-M06 Missing-Key And Broken Preview Hardening
- Tasks:
  - made `Deployments` route directly into the matching `Remotes` connection and `Connection Details` tab when the stored service-account key must be re-imported
  - stopped the page-delivery/runtime preview path from surfacing anonymous GCS object URLs as if they were valid temporary preview links
  - split the new deployment key-recovery proof into its own integration file to stay inside the repo LOC gate
- Easy:
  - the live defects were concentrated in two seams:
    - deployments-to-remotes navigation
    - gcp-temporary signed-url fallback behavior
  - the product route system already supported query-state handoff once the `Remotes` surface actually read `route.tab` / `route.focus`
- Hard:
  - the first implementation was behaviorally right but immediately tripped two repo rules:
    - frontend test file over `600` LOC
    - `page-delivery-runtime.mjs` over `600` LOC and one point over complexity
  - the safe fix was structural extraction and test-file split, not loosening the gates
- Improve:
  - when temporary preview depends on signed cloud-object URLs, treat missing signing credentials as `unavailable`, not as permission-blind fallback to raw object URLs
  - for product recovery actions, the operator should land on the exact tab and control needed; generic "open the other desk" guidance is not enough
  - when adding focused coverage to already-large integration files, split immediately rather than letting the LOC gate catch it late

### 2026-03-16 - M06 Product Usability Reset Framing
- Tasks:
  - preserved the new operator findings as a hard directive file instead of letting them live only in chat
  - re-read the current product against the north-star doc, the current-state map, and the delivered M05 plan
  - reframed the next work as a product-usability reset, not as a continuation of M05 completion claims
- Easy:
  - the gap is obvious once the live browser is compared against the intended empty-system user journey
  - the current codebase already contains most of the capability; the main mismatch is composition and route purpose
- Hard:
  - M05 improved naming and grouping enough to look close on paper while still missing the stronger screen composition and direct actionability the user actually wanted
  - the live product now has enough real data that overloaded routes can appear successful while still being hard to operate
- Improve:
  - after a convergence pass, rehearse the empty-system operator journey directly in browser before declaring the flow "done"
  - when the product problem is composition, do not let route-level capability proof stand in for route-level usability proof

### 2026-03-16 - M05 Pass 7 End-To-End Hardening
- Tasks:
  - closed the product-flow convergence program by rehearsing the live proof baseline through `Remotes`, `Pages`, and `Deployments`
  - fixed product remote health so legacy managed targets without explicit `productBindingKey` still count toward the product-owned remote bundle
  - fixed gcp-temporary page preview/media resolution so missing stored service-account key files no longer hard-fail the delivery payload
  - re-synced the saved proof pages so the persisted baseline matches the current Pages settings token instead of showing permanent stale drift
- Easy:
  - once the live APIs were queried directly, the stale-state issue was clearly a real `Pages module settings changed` drift condition, not a missing-file bug
  - the missing-key browser-delivery fix stayed bounded because the right place to degrade was the page-facing signed-url seam, not the provider runtime as a whole
- Hard:
  - the product surface mixed three different truths at once:
    - legacy managed target records
    - real live page-deployment state
    - stale in-memory runtime preview state from the open browser session
  - the Windows local review backend still required an unrestricted restart because `node --watch` hit the usual sandbox `spawn EPERM` boundary
- Improve:
  - when a product route derives managed-service readiness from persisted targets, always include a compatibility layer for earlier persisted data shapes before blaming the UI
  - for delivery preview, signed temporary URLs are an enhancement, not a hard precondition; product browseability should degrade to plain storage URLs instead of returning `500`
  - when a settings-token drift is real, re-sync the saved proof baseline rather than weakening the deployment-state evaluator
  - reloading the live browser route after backend state repair matters; open product desks can hold stale preview state even when the backend is already fixed

### 2026-03-16 - M05 Pass 6 State Visibility Across The Product
- Tasks:
  - moved release-state signals into the primary operator surfaces instead of leaving them mostly inside secondary remote/deployment panels
  - added post-level deployment-state visibility in the main Posts list plus collection-level summary cards
  - added taxonomy publication-state visibility at the main route level without forcing the operator into the remote publication drawer
  - added media-library sync summary cards and a browse-links card in Deployments
- Easy:
  - the underlying state already existed; the pass was mostly about expressing it earlier and more clearly
  - media already had a reliable item-level sync-state helper, so route-level summary was just a reducer on top of existing logic
- Hard:
  - test expectations were sensitive to duplicated labels once the same business state appeared both in the new primary summaries and the older detailed panels
  - the focused frontend proof still hit the usual Vite/esbuild sandbox boundary and needed unrestricted execution to run reliably on this machine
- Improve:
  - once a state graduates into the primary route surface, tests should stop assuming single occurrences of the same label across the whole page
  - route-level state summaries are worth adding when the backend contract is already real; this is much cheaper and safer than inventing more workflow machinery
  - state visibility should land before more setup or runtime abstraction work, because it directly reduces operator reasoning load
### 2026-03-16 - M05 Pass 5 Deployment Flow Simplification
- Tasks:
  - turned `Deployments` into a release-first route instead of a flat mix of bundle editing, per-target operations, and release execution
  - kept the primary lane centered on:
    - release readiness
    - forecast
    - runtime preview
    - footprint/cost analysis
    - release history
  - moved bundle editing/validation and detailed per-target operations into explicit secondary sections
- Easy:
  - the release pipeline already existed as one bounded action, so the main work was to make the UI express that reality instead of competing with it
  - the existing cards already separated the data well enough to reorder without widening backend ownership
- Hard:
  - the deployment tests previously asserted on validation and target-binding text as if all sections were always visible
  - product improvements that intentionally hide secondary panels need the tests to follow the new user journey, not the old DOM shape
- Improve:
  - when a route owns both orchestration and manual fallback controls, make orchestration primary and collapse the fallbacks
  - tests should assert the primary route contract first, then explicitly open secondary sections when they need to inspect detailed controls

### 2026-03-16 - M05 Pass 4 Presentation Flow Simplification
- Tasks:
  - turned `Pages` into a page-type-first route instead of a long contract-field-first editor
  - kept output forecast, delivery preview, and deployment instances central
  - demoted:
    - remote overrides
    - pages defaults
    - delivery operations
    - runtime contract inspection
    into secondary expandable sections
  - added a compact authoring-flow card to `Layouts` so the route explains its role in the broader presentation journey
- Easy:
  - the backend/data model was already flexible enough; the pass stayed almost entirely in the frontend composition layer
  - `Pages` already had the right preview/forecast panels, so the main job was reordering and visibility, not inventing new state
- Hard:
  - the existing tests assumed everything was always expanded, so the product improvement immediately required proof updates
  - `Pages` now has both a secondary section title and an inner panel title for runtime inspection, which makes role-based heading selectors ambiguous if tests stay too literal
- Improve:
  - when a route has one primary job and several operational details, keep the primary center visible and move the rest behind explicit toggles
  - if a test is validating a newly secondary panel, assert on the fields that matter after opening it rather than on duplicated heading text
  - page-type presets are a low-risk way to simplify authoring when the underlying backend contract already supports the needed shapes

### 2026-03-16 - M05 Pass 3 Content Flow Simplification
- Tasks:
  - demoted remote publication/sync panels inside:
    - `Posts`
    - `Taxonomies`
    - `Media`
    so authoring stays primary
  - made `Taxonomies` read more clearly as:
    - `Categories`
    - `Tags`
    instead of category-first switching language
  - kept the same backend mechanics and operator capabilities, but moved them into secondary expandable sections
- Easy:
  - the working remote controls were already modular panels, so the pass mostly needed better framing and default visibility instead of more runtime work
  - focused integration tests already covered the remote actions; they only needed to acknowledge the new toggle-first contract
- Hard:
  - the trick was to reduce authoring noise without silently removing capabilities; the right answer was demotion, not deletion
  - `Media` already had remote actions in both bulk controls and the dedicated remote panel, so the panel itself was the safest thing to demote first
- Improve:
  - when the operator should author first and publish second, keep remote mechanics present but secondary
  - if a module already carries both authoring and remote-operational concerns, default-collapse the operational section before inventing another product route

### 2026-03-16 - M05 Pass 2 Core Setup Flow Simplification
- Tasks:
  - demoted `System Settings` from a second setup headquarters into an advanced-defaults route
  - added an explicit setup-flow card that points the normal operator path to:
    - `Remotes`
    - `Domains`
  - added a compact summary of the currently-bound product defaults
  - hid the selector-heavy per-module settings behind a `Show Advanced Defaults` toggle
- Easy:
  - the existing workspace already exposed the right remote-health and target-binding state, so the pass stayed mostly in one product-shell view plus its focused tests
  - `selection.target` from the shared remote-health helpers was enough to summarize current defaults without widening the backend contract
- Hard:
  - the important design constraint was not capability, it was keeping the old settings model intact while clearly demoting it out of the normal setup journey
  - frontend vitest still needed escalation on this machine because Vite/esbuild child-process spawning hit the sandbox `spawn EPERM` boundary
- Improve:
  - when a route should become advanced-only, change the hero language, the first visible cards, and the default expansion state together; hiding fields alone is not enough
  - keep the normal operator journey visible as explicit steps before exposing any fallback selectors

### 2026-03-16 - M05 Pass 1 Product Information Architecture Tightening
- Tasks:
  - widened product-shell descriptor ownership from the earlier `Authors` / `Comments` surfaces to the remaining north-star desks:
    - `Media`
    - `Taxonomies`
    - `Posts`
    - `Layouts`
    - `Pages`
  - added workflow-stage metadata to product navigation
  - grouped the sidebar by:
    - `Setup`
    - `Content`
    - `Presentation`
    - `Release`
  - added shell-level route guidance so each desk now exposes:
    - current stage
    - desk purpose
    - next-step CTA
- Easy:
  - the product-shell catalog already owned the north-star navigation order, so it was the right place to attach workflow-stage metadata and next-step guidance
  - descriptor-level ownership remained the right seam for route conversion; it preserved stable route/module ids while moving control to product-shell code
- Hard:
  - a direct app-level test initially exercised the wrong mock universe; the generic reference API mock does not represent the north-star module set, so the correct proof seam was the app-shell layout with explicit product navigation items
  - widening the app controller state by even a small amount tripped the function-shape gate immediately; the right fix was another small hook extraction, not a gate exception
- Improve:
  - when the intended flow is stage-based, express the stages in the shell first; that gives every downstream desk a stable product context before deeper simplification starts
  - use descriptor ownership to convert routes without route-id churn, but keep focused proofs at the shell boundary so the product-level contract is what actually gets tested

### 2026-03-16 - Authors Route Fix And Bounded State Cleanup
- Tasks:
  - fixed the `Authors` route crash on `/app/authors`
  - added a bounded cleanup script for redundant persisted review state
  - removed old remote connections, remote targets, page artifacts, legacy pages, and stale media records while preserving the current M04 proof cohort
- Easy:
  - the render loop was not deep inside the authors workspace; it came from the shared collections domain still inferring the active module from the URL path instead of the routed module id
  - once the preserve cohort was made explicit from `m04-closeout-proof.md`, the cleanup itself could stay deterministic and API-driven
- Hard:
  - product alias routes like `/app/authors` can no longer be treated as a reliable source of module identity, so the fix had to happen in the app-shell-to-domain boundary rather than in the authors view itself
  - "clean redundant records from mongo" is risky if the actual persistence mapping is not fully explicit; the safe answer was a bounded cleanup script over supported delete seams, not blind DB mutation
- Improve:
  - any shared frontend domain that scopes by module must receive the routed module id explicitly from the app controller; path parsing is not a stable contract once product aliases exist
  - for review-environment cleanup, preserve the exercised baseline first and automate only deletions that are deterministic and explainable

### 2026-03-16 - M05 Product Flow Convergence Framing
- Tasks:
  - stopped execution framing and rewrote the next-step planning around product-flow convergence rather than "recovery"
  - inspected live product routes plus code/docs together before proposing the next program
  - wrote a forward plan that starts from the existing capabilities and focuses on simplifying the operator journey
- Easy:
  - the repo already has strong baseline docs and the live app exposes enough of the current product shell to inspect the real operator burden directly
  - the current mismatch is clearer in browser snapshots than in code alone; seeing the long mixed-purpose desks made the next program obvious
- Hard:
  - it is easy to slide into capability-gap language because the codebase still exposes many raw internal seams, but that was not the user's framing
  - the right plan needed to distinguish between:
    - missing capability
    - missing product coherence
- Improve:
  - when the user is describing product fluency, do not translate it into bugfix/recovery language
  - anchor the next program in the intended operator journey first, then map the current route/code mismatches against that journey

### 2026-03-15 - M04 Comments Sync And Moderation Hardening
- Tasks:
  - hardened the product `Comments` desk so it reads as remote-originated intake moving through a moderation pipeline instead of just another CRUD collection
  - added explicit visibility for the current runtime contract seam:
    - dataset
    - query
    - action
    - backing GET/POST routes
  - added compliance/lifecycle cues without widening the backend comment schema
- Easy:
  - the existing engagement schema and handler already modeled the real moderation rules, so the pass could stay frontend-first and product-first
  - the post collection already carried the comment-policy fields needed to explain which published posts can actually feed the queue
- Hard:
  - the first product proof failed on two small but real issues:
    - JSX literal arrow tokens inside inline text
    - a now-duplicated `Open Authors` button selector
  - the real constraint was not backend capability; it was preserving bounded ownership while making the remote/runtime relationship explicit enough for operators
- Improve:
  - when a product pass is about lifecycle clarity, prefer explicit contract and stage visibility over inventing new persistence flags that do not yet exist
  - once a product surface repeats navigation labels across cards, integration tests should move to `getAllByRole(...)[n]` or scoped queries immediately

### 2026-03-15 - M04 Pages And Deployments Ease-Of-Use Hardening
- Tasks:
  - added Pages-side output forecasting so operators can see expected html counts, SEO, and public URL samples before deployment
  - added bundle-side public-output forecasting so product `Deployments` explains the selected release as one public outcome instead of only as a target matrix
  - tightened the pass until it satisfied both the repo-shape gate and the full release gate
- Easy:
  - the needed data already existed in the current page draft, delivery payload, deployment-instance list, and browser-delivery descriptor
  - the right product seam was read-only forecasting; no backend contract widening was needed
- Hard:
  - the first implementation passed the visual goal but tripped function-complexity and hook-length limits immediately
  - after the refactor, the focused product proof still failed because the new hook was exported from the helpers file while the workspace imported from the support file
  - the remaining test failures were exact-text assumptions, not product regressions
- Improve:
  - when a pass is mostly computed presentation, split the pure forecasting helpers early instead of waiting for `lint:function-shape` to force the extraction
  - when moving a hook/helper across the product-shell files, verify the import barrel immediately; those failures look like runtime regressions but are only wiring mistakes
  - prefer sentence-level or regex assertions for summary cards that prefix business values with labels like `SEO title:` or `Example public URL:`

### 2026-03-15 - M04 Client Runtime Product Alignment
- Tasks:
  - extended generated page runtime contracts so the action layer now carries runtime-local refresh actions in addition to the existing remote comment submission action
  - added a product-owned runtime preview on the `Deployments` route so runtime inspection is no longer confined to the Pages desk
  - verified the slice through client-runtime package tests, Pages server conformance, product deployments integration, and the full release gate
- Easy:
  - the right contract expansion was already latent in the existing datasets and follow-up routes; no new backend API had to be invented
  - product `Deployments` already had the selected page/bundle context, so runtime preview was mostly an async fetch/composition problem
- Hard:
  - the first runtime-contract implementation silently dropped the new page/media refresh actions whenever comments were enabled because the comments branch overwrote the previously assembled actions array
  - the first async preview hook import used the wrong barrel and failed at runtime even though the logic itself was correct
  - package/runtime work and product-surface work had to land together; doing only one side would have left the pass half-real
- Improve:
  - when enriching generated runtime contracts, preserve earlier registries when feature branches merge; action/query/dataset arrays are easy to clobber accidentally
  - if a pass adds a new product preview for an existing contract, mock the contract owner module directly in integration tests instead of rebuilding the payload through generic APIs
  - runtime-local actions are a good bounded way to make the action layer richer without fabricating new remote mutations

### 2026-03-15 - M04 Posts Taxonomies Authors Hardening
- Tasks:
  - tightened the post authoring loop by surfacing author/category/media/SEO/body readiness directly beside the content editor
  - added taxonomy usage visibility that reads across posts and pages so category/tag readiness is visible from the taxonomy desk instead of being inferred manually
  - tightened the product `Authors` desk with assignment coverage so author completeness is visible as a release-quality concern, not only as a roster concern
- Easy:
  - the product-shell route graph already existed, so the new readiness panels could navigate operators into `Authors`, `Taxonomies`, `Media`, and `Pages` without new routing work
  - posts/pages usage awareness stayed frontend-local because the generic collection APIs already exposed enough information for bounded usage summaries
- Hard:
  - the first pass added just enough coverage to push `blog-content.integration` over the repo LOC gate; the right fix was to tighten the new proof rather than spread the feature across more files unnecessarily
  - taxonomy usage summaries need to be useful without pretending to be a full analytics system; the right bounded shape was counts, missing assignments, top references, and page/template visibility
- Improve:
  - when a product-hardening pass introduces cross-module readiness, expose the actionable destinations in the same panel so the operator can repair the issue immediately
  - for north-star product passes, prefer compact targeted proofs over expanding already-near-threshold integration files with verbose setup

### 2026-03-15 - M04 Media Product Hardening
- Tasks:
  - hardened the media desk so local library operations and remote-state interpretation happen from one surface instead of splitting the operator between gallery and remote panels mentally
  - added per-item sync posture, bulk selection, artifact-link visibility, and remote-only compare-summary visibility without widening provider/runtime ownership outside the media module plus embedded remote support
  - stabilized the media integration proof after the new bulk panel introduced duplicate remote-action labels and the focused remote test proved slightly too tight on timeout
- Easy:
  - the existing embedded remote-ops support already exposed enough target/run state to compute item-level sync posture and artifact links without any backend change
  - artifact-link visibility stayed bounded because browser-delivery and storage target descriptors already existed; the media desk only needed to compose them
- Hard:
  - a seemingly small bulk-action panel created an ambiguous `Compare Remote` selector that broke the existing remote-media integration proof immediately
  - the focused remote-media test was functionally green but intermittently exceeded its old 15s budget once the view grew; the right fix was clearer button labels plus a realistic timeout, not weaker assertions
- Improve:
  - when adding new product-surface buttons near an older embedded panel, keep the operator labels semantically distinct so proof selectors stay stable
  - if a product pass adds view weight but preserves the same workflow, widen test budgets deliberately instead of waiting for isolated runs to flake

### 2026-03-15 - M04 Product Domain Setup Hardening
- Tasks:
  - turned the product `Domains` route from a thin browser-target wrapper into a domain-first setup surface
  - reused the existing browser-delivery descriptor and compatibility bundle instead of inventing a second domain model in the product shell
  - kept provider/runtime/provisioning ownership inside `test-modules-remote-ops` while making the operator view center on:
    - owned custom domain vs temporary access
    - DNS provider work
    - linked HTML/media/data surfaces
    - HTTPS stack readiness
- Easy:
  - the existing browser-delivery compatibility report already carried the right high-value details:
    - delivery reports
    - DNS instructions
    - name servers
    - missing resources
    - provisionable actions
  - the selected browser-delivery target already implied the correct connection, so the main product gap was view composition, not new backend state
- Hard:
  - the desk legitimately repeats some values across summary and service-path sections, so strict single-match text assertions became brittle and had to be rewritten to tolerate repeated business labels
  - keeping the desk product-first without widening module logic required resisting the temptation to duplicate browser-delivery compatibility rules in the frontend
- Improve:
  - when a product desk wraps a lower-level target type, make the product surface domain-first and let the raw editor remain secondary
  - repeated operator-facing values are normal once a surface has both summary and detail panels; integration tests should use tolerant repeated-text or scoped queries from the start

### 2026-03-15 - M04 Product Remote Setup Cards
- Tasks:
  - replaced the product `Remotes` route's dependence on the raw compatibility/provisioning panels with explicit setup-stage cards
  - kept provider/runtime/provisioning ownership inside `test-modules-remote-ops`
  - widened the provisioning callback to support bundle-scoped action ids so one product stage can provision only its own ready resources
- Easy:
  - the remote compatibility model already had the right bundle ids:
    - `firestore-projection`
    - `media-storage`
    - `deployment-storage`
    - `browser-delivery`
  - the product route already had the right workspace hook; the gap was presentation and scoping, not another API
- Hard:
  - widening `provisionSelectedConnectionCompatibility` introduced a React event leak on the raw module button because the click event became the first argument; the fix was to wrap the module button call explicitly
  - the product route's selected-connection hydration is still looser than ideal; render against an effective routed/first connection immediately and keep syncing the real workspace selection underneath
- Improve:
  - when a product desk consumes a generic module API, let the product surface scope execution by bundle/action ids instead of reproducing generic reports wholesale
  - if a callback starts accepting optional arguments, audit existing JSX call sites for bare `onClick={fn}` usage before trusting the tests
  - keep product-stage rendering keyed off real bundle reports and managed targets, not duplicated status heuristics

### 2026-03-15 - M04 Pages Runtime Contract Inspection
- Tasks:
  - added a dedicated Pages-side runtime-contract inspection panel instead of forcing operators to read the injected `client-runtime` contract out of the raw delivery JSON textarea
  - kept the feature fully frontend-local because the delivered payload already contained the contract; the missing piece was visibility, not another API
  - extended the existing Pages delivery-preview integration proof so the runtime panel is verified through the same authoring flow operators already use
- Easy:
  - the page delivery payload already exposed `runtime.clientRuntime`, so the panel only needed to summarize and render an existing contract
  - the existing `pages overview renders ... previews delivery json` proof was already the right scenario to extend; no new harness was necessary
- Hard:
  - this machine still needs escalated frontend Vitest runs whenever Vite/esbuild child-process spawning crosses the sandbox boundary
  - the right product call was to expose both summaries and raw JSON; summary-only would hide detail, but raw-JSON-only would keep the north-star operator problem unsolved
- Improve:
  - when a delivery contract already exists but operators cannot reason about it, add an inspection surface before inventing more contract complexity
  - keep runtime-contract visibility tied to the delivery preview so Pages remains the single authoring desk for page payload, runtime bootstrap, and deployment inspection

### 2026-03-15 - M04 Product Remotes Surface Tightening
- Tasks:
  - tightened the product remotes route so it no longer presents the broad module-grade connection editor as the primary operator form
  - kept the same remote-ops workspace and provisioning behavior underneath, but added a stricter `product` surface mode to the shared connection editor
  - proved the tightened surface by asserting the normal product route hides module-only fields while preserving the managed-remote workflow
- Easy:
  - the existing shared connection editor was already the right seam; adding a surface mode avoided duplicating remote logic in the product shell
  - the product remotes integration test already had a realistic selected-connection scenario, so extending it to assert field suppression stayed cheap
- Hard:
  - the first proof tried to assert on the new metadata card title, but selected-connection draft hydration can lag behind the status summary; the stable contract is field suppression and action availability, not that transient subpanel timing
  - tightening the surface without widening the remote module required discipline: the right move was conditional rendering inside the shared editor, not a forked product-only form
- Improve:
  - when a product route wraps a lower-level module editor, prefer a bounded `surface` mode over duplicating the form; it keeps provider/runtime behavior in one owner
  - product-shell tests should assert durable operator contracts first:
    - hidden fields
    - available actions
    - managed-service framing
    before asserting on secondary metadata details that may hydrate one render later

### 2026-03-15 - M04 Product Remotes Desk
- Tasks:
  - replaced the raw `/app/remotes` module surface with a product-owned remotes desk at the frontend descriptor boundary
  - kept all provider/runtime behavior inside `test-modules-remote-ops` while reframing the operator experience around one selected remote, managed target coverage, compatibility status, and recent runs
  - added a focused product-shell integration proof instead of relying on the older raw remote-ops desk coverage
- Easy:
  - the existing descriptor override seam was already proven by the product-owned `Authors`, `Comments`, `Domains`, and `Deployments` desks, so claiming `test-modules-remote-ops` at the same boundary was straightforward
  - the module-local remote workspace already exposed the right state shape for a thin product view, so no new backend API was needed
- Hard:
  - the first implementation assumed the workspace still exposed `sortedRuns`; the real public hook contract exposes `runs`, so the failure was a view-to-hook contract mismatch, not a runtime bug
  - the first test assertion used `getByText(\"Posts Projection\")`, but the new product desk intentionally repeats some target names across managed-target and recent-run surfaces; the proof had to move to non-unique-safe assertions
- Improve:
  - when building thin product-shell views on top of module-local hooks, treat the hook return shape as the only contract and avoid reaching for pre-refactor internal property names
  - product-shell integration tests should expect repeated business labels once the desk has both summary and detail surfaces; use role/scoped queries or tolerant repeated-text assertions from the start

### 2026-03-15 - M04 Layout Render Preview
- Tasks:
  - added a rendered base-structure preview to the Layouts builder without widening the Pages/runtime surface
  - paired the visual preview with a semantic structure-markup outline so the operator can inspect both shape and implied html
  - proved the preview through the live layouts integration flow instead of a unit-only helper test
- Easy:
  - layout documents were already normalized enough that a static renderer could stay fully frontend-local and derive its view directly from `layoutDocument`
  - the existing layout-builder integration test already exercised a representative flex/container/block composition flow, so adding preview assertions reused a real operator scenario
- Hard:
  - preview assertions can drift if they assume seed labels survive normalization; the root label looked like `Root Container` in test fixtures, but the actual draft root still resolves to `Page`
  - `toHaveValue(expect.stringContaining(...))` is not a reliable matcher shape for multiline read-only fields here; direct value assertions are simpler and more robust
- Improve:
  - when adding inspection UI to an existing builder, prefer bounded read-only surfaces that consume normalized draft state rather than introducing a second mutation path
  - for layout/data-structure tests, assert on the normalized operator-facing output, not on fixture labels that may be transformed before render

### 2026-03-15 - M04 Release Observability And Cost Surfacing
- Tasks:
  - added product-level release observability on top of the deployment bundle pipeline
  - reused embedded Remote Ops compatibility analysis instead of duplicating provisioning/cost logic inside product Deployments
  - tightened a fragile deployment integration test after the new observability card introduced duplicate visible bundle titles
- Easy:
  - the existing compatibility report structure was already rich enough to drive cost-warning, missing-resource, and provisionable-action summaries without changing server contracts
  - keeping the new logic in a pure `product-deployment-release-observability` helper made the product desk change bounded and testable
- Hard:
  - adding summary UI can quietly break text-based integration selectors; once the same bundle title appeared in both the sidebar and the new card, loose `getByText(...)` assertions became ambiguous
  - frontend architecture lint still matters late in a pass; the first observability helper version worked but exceeded the repo complexity ceiling by one point
- Improve:
  - prefer role-based selectors for product-shell workflow tests whenever summary cards can repeat business labels from sidebars or editors
  - when reusing remote compatibility in product desks, keep caching/report lookup centralized in the embedded support hook so future desks do not fork their own remote analysis state
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

### 2026-03-15 - M04 Author And Moderation Product Views
- Tasks:
  - replaced the raw module route surfaces for `test-modules-editorial` and `test-modules-engagement` with product-shell views at the frontend descriptor boundary
  - kept the route/module ids stable while upgrading the actual operator experience for `Authors` and `Comments`
  - surfaced stricter cross-module readiness in `Authors`:
    - missing author
    - missing categories
    - short body
    - missing featured media
    - missing author avatar coverage
  - surfaced stricter moderation framing in `Comments`:
    - moderator coverage
    - pending moderation backlog
    - missing moderator attribution
    - direct navigation back into `Posts` and `Authors`
- Easy:
  - the registry already allowed product descriptors to claim the same module ids before module entrypoints register, so the override seam was clean
  - reusing `useEditorialOverview` and `useBlogEngagementWorkspace` avoided inventing another data-access layer
- Hard:
  - the first proof landed inside the big view-registry core test file and tripped the repo LOC gate; the correct fix was moving the new proof into its own focused test file
  - frontend vitest still requires escalation on this machine whenever the Vite/esbuild child-process boundary is involved
- Improve:
  - when product-shell alignment should preserve route stability, prefer descriptor-level overrides over route-id churn
  - do not let proof additions bloat already-near-threshold test files; create a fresh focused test file immediately when the repo-shape gate is close

### 2026-03-15 - M04 Injected Runtime Comment Contracts
- Tasks:
  - extended Pages delivery so published post pages emit a real comments query/action contract for injected `client-runtime`
  - taught the runtime transport to normalize collection-shaped remote query results
  - taught the request resolver to distinguish rooted path expressions from literal strings, which made declarative query params like `status=approved` actually possible
- Easy:
  - the comments seam was already real in the repo, so the runtime contract could point at existing engagement routes instead of inventing new APIs
  - using browser-delivery `publicOrigin` as the runtime remote base was the right bounded improvement over relying only on `window.location.origin`
- Hard:
  - the first runtime change double-applied `responsePath` for remote queries and broke the existing page-refresh proof immediately
  - the second failure showed that `context.primaryRecordId` was not visible where the declarative resolver expected it; the fix belonged in the shared adapter boundary, not in every emitted contract
  - literal-string support was missing entirely from the remote resolver, which made static query params impossible until the resolver stopped treating every string as a path expression
- Improve:
  - when a declarative config format grows from demos into real product contracts, prove literal values and context-bound values in the same package test pass
  - keep product-authored runtime contracts tied to routes the repo already owns; otherwise the north-star work drifts into aspirational pseudo-APIs

### 2026-03-15 - M04 Page-Bound Runtime Slots
- Tasks:
  - generalized delivered page runtime contracts so resolved page bindings become reusable `client-runtime` slots instead of leaving the runtime almost entirely hardcoded
  - allowed per-record page data sources to inherit the active primary record when `itemId` is intentionally left empty
  - proved category templates can now bind current-category post listings and emit those listings into both the delivery payload and runtime contract
- Easy:
  - the repo already had a strong page follow-up route, so slot refresh could stay page-owned instead of introducing new cross-module read APIs
  - the runtime contract already knew the resolved bindings; turning them into datasets/queries was mostly a mapping problem
- Hard:
  - page validation still required `itemId` on every data source, so the runtime improvement alone was insufficient until the save-time contract matched the delivery-time behavior
  - array-valued slots needed collection normalization to stay coherent between local IndexedDB reads and remote refreshes
- Improve:
  - whenever per-record runtime behavior depends on implicit primary-record inheritance, enforce the same rule in both validation and delivery resolution immediately
  - page-defined data bindings are the right seam for injected runtime expansion; continue extending there before inventing free-form runtime config UIs

# 2026-03-15 - M04 Goals Vs Current State Review

- `handoff.md` had stale last-commit metadata after the latest M04 passes; update progress pointers as soon as a pass is pushed, not only when a code slice feels "final".
- The active decision seam after Pass 21 is no longer shell naming or bundle plumbing. It is product-operator quality:
  - staged service setup in `Remotes`
  - richer client-runtime contracts and inspection
  - live cost data only after the setup/runtime chain is stronger
- Freeze the remaining M04 order into one durable map so future turns stop re-deriving the sequence from scratch:
  - [m04-completion-map.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/m04-completion-map.md)

### 2026-03-15 - M04 Product-First Exposure Finalization
- Tasks:
  - hid developer lifecycle/module controls from normal runtime and made them explicitly opt-in
  - added module maturity to runtime/navigation payloads so the frontend can reason about proof posture explicitly
  - removed the remaining operator-facing `Remote Ops`/`Pages Desk` wording leaks from product routes
- Easy:
  - the main product shell already concentrated the leak into one header button and one dialog, so the actual exposure fix stayed bounded
  - route segments were already product-safe; most remaining inconsistencies were copy-level, not routing-level
- Hard:
  - frontend vitest on this machine still needs escalation because Vite/esbuild child-process spawning fails inside the sandbox
  - a simple label cleanup created duplicate `Open Pages` buttons in one content proof, so the test had to target the right button rather than assuming uniqueness
- Improve:
  - expose developer-only runtime controls by explicit mode, never as part of the default operator chrome
  - when product cleanup renames generic buttons, immediately rerun the focused screen proofs because duplicate labels are easy to introduce

### 2026-03-15 - M04 Closeout Hardening
- Tasks:
  - practiced the full north-star slice against the live app and real `merchant-guild` project
  - normalized the proof cohort to exactly `10` published posts and paired them with `10` categories, `10` tags, and `10` dedicated media items
  - created the post/category per-record pages and released them through named bundles
  - fixed `gcp-temporary` delivery so private GCS deployment/media objects resolve through signed URLs instead of inaccessible raw storage URLs
- Easy:
  - the product bundle wiring was already strong enough that once the cohort was normalized, the release chain mostly behaved exactly as designed
  - the live remote setup work from earlier passes paid off; provisioning the missing buckets and binding product settings took one bounded step
- Hard:
  - the original `gcp-temporary` implementation validated shape only and produced raw `storage.googleapis.com` URLs that failed with `AccessDenied`
  - the correct fix was not in the UI; it belonged in the server-side browser-delivery boundary so delivery payloads and media descriptors emit signed object URLs
  - one external verification attempt failed for the wrong reason because the PowerShell check assumed string content instead of binary-safe inspection
- Improve:
  - do not treat remote/browser-delivery validation as sufficient proof; always retrieve at least one real HTML object and one real media object before calling the slice closed
  - when temporary delivery depends on private cloud objects, never expose a fake stable `publicOrigin`; emit signed object URLs and state the limitation plainly

### 2026-03-16 - M06 Product Usability Reset
- Tasks:
  - hardened product-route stability and removed the `Pages` selection loop
  - rewired the main desks toward split layout + primary tabs instead of one stacked column
  - made missing stored-key guidance in `Deployments` actionable
  - surfaced direct output/public URLs as first-class operator artifacts in content and release routes
  - aligned the smoke lane with the new taxonomy product flow
- Easy:
  - the repo already had the needed mechanics; most of the work was hierarchy, route-state, and screen composition rather than backend invention
  - a small shared UI pattern (`DeskSplitLayout`, `DeskTabsCard`) gave the main desks a consistent structure quickly
- Hard:
  - the real stability seam was not only browser behavior but proof upkeep; route resets broke a smoke assertion and two large files crossed the LOC gate at the same time
  - frontend checks on this machine still need escalation whenever Vite/esbuild child processes or Playwright are involved
- Improve:
  - when a route reset changes the product meaning of a desk, update the smoke lane in the same pass instead of treating it as separate polish
  - keep large route-reset slices honest with the full gate before calling them done; the browser can look coherent while one proof still encodes the old workflow

### 2026-03-16 - Temporary Delivery Must Be Real Delivery
- Tasks:
  - replaced the `gcp-temporary` mental model from signed private-object links to clean provider URLs backed by public-readable deployment/media buckets
  - fixed the compatibility layer so `public-read` browser-delivery actions require only the storage permissions they actually use
  - repaired the persisted `merchant-guild` service-account import after the runtime credential copy had gone missing
  - provisioned public object read on the live deployment/media buckets through the app's own provisioning route
  - reran the live post/category release bundles and verified the resulting URLs render as HTML in-browser
- Easy:
  - the existing provisioning executor already knew how to set bucket IAM; the real defect was only in the action-availability calculation
  - once the bucket IAM and object metadata were both correct, the clean provider URLs worked immediately
- Hard:
  - earlier passes had normalized on signed URLs as an acceptable temporary contract, which was the wrong product bar
  - the persisted live connection looked healthy in JSON state while its copied key file was actually missing on disk, so the live proof had to repair the credential seam before anything else could proceed
- Improve:
  - do not call browser delivery done until the URL shown in the product desk is the same URL that renders in a browser
  - when a temporary-delivery mode exists, make it operationally real and visibly different from the owned-domain path, not a hidden signed-link escape hatch

### 2026-03-17 - Runtime Probe Must Use A Deployed Boundary
- Tasks:
  - finished the temporary deployed-page probe so the live published post page can render an image, fetch a remote published document, and install it into IndexedDB through `client-runtime`
  - replaced the broken localhost/backend probe transport with a same-origin deployed JSON sidecar next to each published HTML artifact
  - reran the live posts release bundle and verified the public storage page in the browser with the probe enabled
- Easy:
  - once the probe stopped depending on localhost, the rest of the runtime contract already worked; `client-runtime` install/query behavior was fine
  - the deployed page already carried enough content/media context to build a useful remote-side probe payload
- Hard:
  - the first deployed probe looked partially right but was architecturally wrong because an HTTPS GCS page cannot rely on `127.0.0.1:3001`
  - browser caching obscured the script-fix verification until the page was re-opened with a cache-busting query string
- Improve:
  - for deployed HTML, never route runtime probes through local dev infrastructure unless the page itself is served from that same local origin
  - when verifying public storage objects, always use a cache-busting query once after redeploy so stale inline scripts do not masquerade as a bad release

### 2026-03-18 - M07 Application Layer Must Stay Separate From Runtime
- Tasks:
  - kept `client-runtime` as the reusable data/action layer
  - added a separate injected application tester on top of it
  - exposed public app API routes for published-document Firestore reads and public comment creation
  - added a repo-owned review launcher so the local published-page proof no longer depends on ad hoc startup patterns
- Easy:
  - the runtime contract was already close; the missing piece was a thin application layer plus a public API seam
  - the local published-page review path worked well once the repo served `frontend/dist` and `deployment/` deterministically on `3000`
- Hard:
  - the saved live connection lost its copied service-account key repeatedly, so Firestore reads through the public app API failed until the key was re-imported through the supported route
  - the real browser boundary matters: a public `https://storage.googleapis.com/...` page cannot call `http://127.0.0.1:3001`, so the honest proof path is the locally served published page until a public HTTPS app API host exists
  - `scripts/review-env.mjs` originally hung because health checks had no request timeout and `start`/`status` were being run in parallel
- Improve:
  - for public-page application logic, separate three concerns explicitly:
    - generic runtime engine
    - temporary application layer
    - public API boundary
  - repo-owned review launchers need hard timeouts and a single canonical sequence or they will regress into process-control guesswork

### 2026-03-18 - Dynamic Server Conformance Needs Per-File Isolation
- Tasks:
  - fixed the dynamic server conformance lane that had been called out as still tripping the full gate
  - updated the lane runner so server conformance files execute one-at-a-time in separate child processes instead of one shared Vitest process
  - reran the full release gate outside the sandbox to verify the real outcome
- Easy:
  - once the runner isolated each server file, the gate env already supplied the correct translation mode (`dual-compat`)
- Hard:
  - sandboxed Vitest reproduction was noisy because Windows `spawn EPERM` obscured the actual gate behavior
  - the earlier failure signature looked like a route/state bug, but the decisive fix was lane isolation, not route surgery
- Improve:
  - keep dynamic server lanes file-isolated when tests use global request clients or long-lived runtime state
  - verify the real gate profile outside the sandbox before diagnosing a lane as still broken

### 2026-03-18 - Public Tester Needed Cache Discipline, Not Another Firestore Hack
- Tasks:
  - versioned the injected deployed-page runtime/tester asset URLs
  - added deployment-storage cache-control metadata so public HTML and JSON sidecars revalidate while versioned JS stays cacheable
  - reran the live category/posts release bundles after restoring and revalidating the saved Merchant Guild service-account key
  - verified the fresh public tester URL shows the current application-tester UI and no longer exposes the old direct-Firestore flow
- Easy:
  - the source/runtime contracts were already correct; the stale behavior came from old cached public HTML and asset URLs
  - once deployment HTML emitted versioned asset URLs, the current local artifact immediately reflected the right tester contract
- Hard:
  - the exact old public tester URL had already been cached externally, so it could continue to serve stale HTML even after the bucket object was updated
  - restarting the review backend invalidated the copied service-account key reference, which blocked the live bundle release until the key was re-imported
  - the public Firestore tester still requires a reachable application API origin; direct Firestore from a public storage page remains the wrong boundary
- Improve:
  - temporary review/test URLs should be versioned explicitly when the page behavior itself is expected to change rapidly
  - public object caching and browser object caching are separate problems; fix both the storage metadata and the surfaced review URL contract

### 2026-03-18 - Public Runtime Interaction Needs A Hosted API, Not Localhost
- Tasks:
  - added `applicationApiOrigin` to browser-delivery target config and surfaced it in the product/browser-delivery flow
  - updated the deployed application-tester contract so it can distinguish:
    - `local-cms-public-routes`
    - `deployed-public-service`
  - added a standalone stateless public page API service under `modules/test-modules-pages/public-app-api/`
  - added `scripts/deploy-public-page-api.mjs` to build/push/deploy that service
  - verified the standalone service locally against the real `merchant-guild` project for:
    - Firestore published document reads
    - public comment creation
- Easy:
  - the public page contract already carried enough information to make the hosted service stateless:
    - `projectId`
    - `collectionPath`
    - `documentId`
  - once the tester could read a default API origin from the delivery contract, the page no longer needed localhost query parameters conceptually
- Hard:
  - the current GCP service account still lacks `run.services.create`, so the hosted public API cannot be deployed yet
  - the original local-server route could not simply be "hosted" because it depended on local CMS state and local collection handlers
- Improve:
  - for public deployed application behavior, never treat `127.0.0.1` as anything more than a development harness
  - keep public-page APIs stateless and deployment-contract-driven so they can actually live outside the local CMS process

### 2026-03-20 - Review Env Must Proxy Backend APIs Or The App Is Fake-Healthy
- Tasks:
  - diagnosed the local review app failure where `http://localhost:3000/` returned the shell but product routes still showed `API disconnected` and `FRONTEND_VIEW_REGISTRATION_MISSING`
  - confirmed the real symptom by checking `http://localhost:3000/api/system/ping` and `http://localhost:3000/api/reference/modules`
  - both were returning frontend HTML instead of backend JSON
  - patched the static review frontend to proxy `/api`, `/health`, and `/ready` to `127.0.0.1:3001`
  - refreshed `handoff.md` so the next turn starts from the correct boundary
- Easy:
  - once the proxied endpoints were checked directly, the problem was obvious: this was an HTTP-path bug, not a React/module-registration bug
- Hard:
  - process liveness was misleading because `3000` returned `200` while serving the wrong content type for API paths
  - Windows sandbox restrictions (`spawn EPERM`) still block reliable in-sandbox `vite build` / `vite dev`, so the launcher can look healthy while actually falling back to stale assets
  - stale listeners on `3000` / `3001` made launcher pid files untrustworthy until the bound ports were checked directly
- Improve:
  - never treat `200 OK` on the frontend root as sufficient proof that the review app is usable
  - the minimum validation for this repo is:
    - `localhost:3000/api/system/ping` returns backend JSON
    - `localhost:3000/api/reference/modules` returns backend JSON
    - browser shell shows `API connected`
  - every shell command should keep an explicit timeout; no long open-ended waits

### 2026-03-20 - Developer Story Needs Repo-Level Orientation, Not More Memory
- Tasks:
  - turned the developer product story into an implementation plan
  - added a checked-in developer desk map plus a terminal command for it
  - extended the review launcher with a dedicated `verify` command and stronger startup verification
- Easy:
  - the current product shell already exposes a stable desk set, so mapping route -> surface -> proof was mostly a matter of making that knowledge explicit
- Hard:
  - the repo had enough launcher history that `review:env:start` and `review:env:status` looked useful while still leaving a gap in truthful usability verification
- Improve:
  - when a story says "the developer should know where to look", implement that as a repo artifact, not tribal memory
  - keep the local review contract executable: one command should tell the truth about whether the app is actually reviewable

### 2026-03-21 - Sync Posture Must Use Real Run History, Not The First Page
- Tasks:
  - fixed the Media desk follow-up where every asset still showed `Not Synced` after a successful remote sync
  - confirmed the immediate status-string mismatch (`success` vs `succeeded`) and fixed that
  - found the deeper live bug: embedded remote support only loaded the first page of `remote-operation-runs`
  - updated the remote support loader to page through the run collection and return the full history for desk consumers
  - tightened the Media desk filter layout so search/filter/sort controls collapse across more breakpoints instead of forcing a wide single row
- Easy:
  - once the live APIs were inspected directly, the persisted media execute runs were obvious and the sync resolver could be reproduced outside the UI
- Hard:
  - the browser kept showing stale `Not Synced` posture until the review env was restarted, because the frontend process was still serving the pre-patch transformed module graph
  - test mocks around publish links were too tightly coupled to descriptor details, which masked the actual sync-history regression
- Improve:
  - for any desk that derives status from operational history, load the complete relevant history or page it explicitly; do not assume one collection response is exhaustive
  - when the live browser and a local reproduction disagree, verify the served frontend bundle before changing more logic

### 2026-03-21 - Taxonomies Needed A Real Split Between Structure And Cleanup
- Tasks:
  - replaced the old generic taxonomy manage surface with a route-backed desk
  - made categories tree-driven with drawer editing and image picking
  - made tags table-driven with batch creation and bulk deletion
  - kept publication and page-impact visibility present without letting them dominate the desk
- Easy:
  - the existing taxonomy handlers already enforced the right data rules, so the main work stayed in route state, browser structure, and workspace orchestration
  - the Authors drawer and gallery patterns transferred cleanly into taxonomy editing
- Hard:
  - the current collections-domain contract is collection-at-a-time, so the desk had to switch active collection cleanly while still feeling like one product surface
  - the focused vitest path was not trustworthy in this environment because the frontend test invocation hit the known Windows sandbox boundary and then hung instead of failing cleanly
- Improve:
  - stories that describe two related but different tools should not be implemented as one generic tab plus a different label
  - when the test runner boundary is noisy, use build + review-env + direct browser route checks as the honest interim proof instead of pretending the automated test result is clean

### 2026-03-21 - Taxonomy Review Follow-Up Needed More Structure, Not More Cards
- Tasks:
  - responded to user review that the category tree still did not read like a tree, the publication flow was still unclear, and the page still felt noisy
  - added an explicit category-root frame so the hierarchy reads like a tree even when all current categories are top-level
  - reduced simultaneous side widgets by turning category/tag context into a single-tabbed side rail
  - simplified publication into a sequence:
    - flow summary
    - current state snapshot
    - target compare/sync controls
- Easy:
  - the underlying taxonomy workspace already had enough state to support a cleaner presentation without changing handlers
- Hard:
  - the sample review data currently has all categories at the root level, so the tree UI had to explain why the structure is shallow instead of pretending deep branches exist
  - the taxonomy frontend vitest run still timed out in this environment, so route verification had to rely on build + review env + browser inspection again
- Improve:
  - when users say a surface feels noisy, remove simultaneous decisions before adding more explanation
  - a tree UI must visually teach the hierarchy state, including the case where no nested branches exist yet

### 2026-03-21 - Posts Needed Route State And Native Media More Than More Forms
- Tasks:
  - turned the Posts desk state into a URL-backed contract:
    - filters
    - selected post
    - main desk tab
    - editor tab
  - expanded the post filters to reflect actual editorial work:
    - category
    - tag
    - readiness
    - live state
  - replaced raw media selects with gallery-based picking plus upload inside the post flow
  - added a state strip in the editor so the user can see saved/CMS/live posture immediately
- Easy:
  - the existing content desk already had solid post editing, revision restore, and release-context internals, so the main work stayed in desk orchestration and editor UX
- Hard:
  - the first live browser reload produced a white screen because `BlogContentView` had hooks after an early return
  - the focused Vitest path hit the same Windows `spawn EPERM` boundary again and could not be counted
- Improve:
  - when a desk already has good internals, move it toward the story by making state explicit and persistent before rewriting deeper infrastructure
  - white-screen browser checks need to happen before any “ready for review” claim, especially after route-state changes

### 2026-03-21 - Posts Story Needed A Structural Rewrite, Not More Widgets
- Tasks:
  - replaced the earlier incremental Posts pass with a roster-first editorial desk
  - moved the authoring flow to a writing-first layout with a contextual right rail
  - contained the roster height so the list and the writing desk can coexist in one working screen
- Easy:
  - the existing post save/revision/release infrastructure was already solid enough to preserve while replacing the surface
- Hard:
  - the first attempt still looked like generic module CRUD with more filters, which failed the story bar
  - the browser review made it obvious that the roster needed its own internal scroll or it would recreate the same stacked-page problem
- Improve:
  - when a story says the body is the center of gravity, design around that sentence first and only then arrange the supporting controls
  - roster-first desks still need viewport discipline; a good table can become bad if it steals the whole page height

### 2026-03-21 - Posts Needed A Product Review, Not Another Blind UI Pass
- Tasks:
  - paused implementation to inspect the live Posts desk again in the browser
  - ran a real create-post flow from the current UI
  - compared the live desk against the Posts story, the Authors story, and the developer story
  - wrote a narrative product review and a corrected realignment plan before any further implementation
- Easy:
  - the core mismatch became obvious once the create flow was exercised live: the desk still leads with system structure instead of editorial rhythm
- Hard:
  - it is easy to keep improving visible structure while still missing the deeper product question of what the user is actually trying to do in sequence
- Improve:
  - when the user says the desk is not usable, stop implementing and rewrite the product understanding first
  - use live flow evidence, not only component reasoning, before deciding the next pass

### 2026-03-22 - Layouts Needed Starter Frames To Be Real, Not Decorative
- Tasks:
  - fixed the new-layout initialization path so starter frames actually seed the canvas instead of collapsing back to an empty draft
  - added publishing-oriented starter presets and richer on-canvas placeholder language
  - reworked the left rail into a real library with starter frames first, then saved layouts and page-usage awareness
  - kept the details dock restrained with basics, page impact, selected-node controls, and demoted advanced material
  - updated the focused Layouts integration test to the new product language and quieter dock model
- Easy:
  - the existing builder model was already strong; most of the work stayed in workspace initialization and the product surface around it
- Hard:
  - the starter-frame bug came from the creation-mode effect resetting every new draft on render, which erased the seeded frame immediately after click
  - the first focused test run surfaced real regressions instead of environment noise:
    - duplicate React keys in starter chips
    - stale test expectations for `New Layout`
    - assumptions that the old always-visible preview/markup still existed
- Improve:
  - when a story says “start from something sensible,” the one-click frame action must be tested live before the slice is considered real
  - a calmer dock means tests should be updated to the calmer information architecture, not force the product back toward the old always-open surface

### 2026-03-22 - Layouts Needed A Real Dock, Not A Canvas-Covering Overlay
- Tasks:
  - changed the Layouts support surface so desktop uses a true docked column while smaller screens still use an overlay
  - fixed a follow-up regression where both mobile and desktop dock variants existed in the DOM at once, duplicating controls and breaking focused tests
- Easy:
  - the underlying canvas logic did not need to change; the issue was entirely in route shell composition
- Hard:
  - CSS-only `display: none` was not enough because the hidden dock still existed for testing and accessibility queries, so the responsive split had to become a real runtime branch
- Improve:
  - when replacing overlays with docked panels, test both the live browser and the focused DOM queries because hidden duplicates can quietly corrupt the desk contract

### 2026-03-22 - Pages Needed A Publishing Backlog, Not A Stack Of Module Settings
- Tasks:
  - replaced the old stacked Pages surface with a backlog-first desk that starts from page type and publishing promise
  - moved page editing into a right-side workbench with distinct jobs:
    - `Promise`
    - `Preview`
    - `Output`
    - `Structure`
    - `Advanced`
  - rewrote the roster rows to show the things a publisher actually needs:
    - what kind of page this is
    - what source it draws from
    - how many outputs it will generate
    - what public pattern it promises
    - whether it is live or still needs work
  - kept redirects as a separate top-level concern instead of mixing them into the page promise flow
- Easy:
  - the underlying page delivery and preview infrastructure was already strong, so the main work stayed in information architecture and route-backed desk behavior
- Hard:
  - the first browser review exposed that even a better roster can still feel bad if column sizing forces horizontal overflow, so the table had to be tightened and allowed to wrap instead of assuming a large desktop
  - the focused Pages Vitest path is still not trustworthy in this Windows environment because direct frontend test execution continues to hit the known `spawn EPERM` boundary
- Improve:
  - for publishing desks, explain the operator contract before showing advanced bindings; the drawer tabs must each have a clearly different job
  - when a route depends on navigation helpers, keep a safe local fallback path so isolated renders and non-router review flows can still exercise the desk truthfully

### 2026-03-22 - Pages Needed Another Product Review Before More Code
- Tasks:
  - reviewed the live Pages route again after user feedback that the route still feels like too much table, form, and system material at once
  - captured a fresh screenshot of the backlog state and reopened the current drawer flow
  - compared the live route to the Pages story and wrote a new experience review plus a realignment plan
- Easy:
  - once the drawer was judged as a product surface instead of a technical container, the main mismatch became obvious quickly: it is still carrying too many jobs
- Hard:
  - a sidebar can still feel wrong if creation, editing, live posture, preview, and advanced delivery all compete in the same drawer contract
- Improve:
  - treat creation flow and edit flow as different experiences when the page-type decision only matters at creation time
  - when a user says a drawer still feels unusable, stop adding tabs and rewrite the editing contract first

### 2026-03-22 - Pages Needed A Real Page Studio, Not A Wider Workbench
- Tasks:
  - realigned the Pages drawer into two different experiences:
    - create flow:
      - `Page Type`
      - `Basics`
    - existing-page studio:
      - `Basics`
      - `Preview`
      - `Live`
      - `More`
  - moved layout into the basics flow
  - moved live posture and delivery mechanics into their own tab
  - demoted page-type changes and advanced controls into `More`
- Easy:
  - the existing preview and delivery components were already good enough once they were placed under clearer jobs
- Hard:
  - two real live regressions appeared immediately in browser review:
    - `PageTypeSection` missing import
    - `PageIdentitySection` missing import
  - the focused Pages Vitest path still timed out even with a hard two-minute limit, so the proof had to stay browser-first
- Improve:
  - when changing a drawer contract, do a live create-flow pass before claiming success; missing imports in secondary paths are easy to miss in build-only review
  - a drawer can only feel calm when each tab answers one question cleanly instead of mixing creation, editing, and delivery in the same space

### 2026-03-22 - Pages Needed Clean Route Teardown And Real Live Links
- Tasks:
  - fixed the lingering Pages route leak so closing the drawer returns the desk to `/app/pages` instead of leaving stale workbench/create query state behind
  - surfaced `Open Live` actions directly in the backlog when a real public example URL can be resolved for the page promise
  - re-validated the full browser flow:
    - backlog
    - open page
    - close page
    - create flow
    - live tab
- Easy:
  - the live-link part was already supported by shared page-public-link utilities once the backlog started passing the right source and fallback target context
- Hard:
  - the route leak was not a simple URL bug; app route state and browser URL were drifting differently, so the fix had to explicitly realign both back to the backlog contract
  - the focused Pages Vitest lane still timed out with a hard limit, so browser truth remained the only honest proof for this slice
- Improve:
  - backlog close behavior matters as much as create/edit behavior; if a studio drawer cannot leave the route clean, the desk still feels unfinished
  - when a story calls for direct public links, surface them from the backlog itself instead of making the operator open the page first just to discover the live URL

### 2026-03-22 - Deployments Needed To Become A Release Room
- Tasks:
  - rewrote the Deployments story into an implementation plan focused on the operator questions that matter before release
  - changed the main release tab to follow one sequence:
    - `Release Shape`
    - `What Will Refresh`
    - `Release This Bundle`
  - simplified release history into a `Recent Releases` surface
  - demoted remote cost and provisioning details into `Inspect Output`
- Easy:
  - the underlying release engine and browse-link resolution were already strong, so the improvement came mostly from reframing and composition instead of backend work
- Hard:
  - the first focused Deployments proof still failed because the test was asserting against one long text sentence instead of the real browse-link contract; the correct fix was updating the assertion to the link `href`, not weakening the UI
  - the browser route initially kept showing stale copy because the review app was serving old frontend output; a bounded rebuild plus restart was needed before the live review matched the code
- Improve:
  - release desks should be judged by the operator questions they answer before the main button, not by how much runtime detail they can expose
  - when proof depends on a live built frontend, rebuild and restart before trusting browser review; otherwise code truth and screen truth diverge

### 2026-03-22 - Deployments Needed A User-Centered Review Before More Code
- Tasks:
  - stopped implementation after user feedback that the route is still hard to reason about
  - inspected every Deployments tab live:
    - `Release`
    - `Inspect Output`
    - `History`
    - `Advanced`
  - captured fresh screenshots of each tab state
  - wrote a product-experience review, user stories, and a realignment plan
- Easy:
  - the strongest finding was obvious once the whole route was inspected end to end: the problem is not missing data, it is that the page still assumes bundle literacy and release-model literacy
- Hard:
  - the route now has enough structure that the remaining issues are more subtle; the desk looks calmer, but still forces the user to translate system facts into product meaning
- Improve:
  - when a user says “I don’t know what I’m supposed to know or do here,” stop measuring progress by reduced clutter alone and rewrite the decision model itself
  - for release surfaces, inspect all tabs before planning changes; otherwise the page can improve locally while still failing as a whole experience

### 2026-03-22 - Deployments Needs A Full User-Reasoning Review Before More Code
- Tasks:
  - performed a full live inspection of the Deployments desk across:
    - `Release`
    - `Inspect Output`
    - `History`
    - `Advanced`
  - captured fresh route screenshots for the review pass
  - wrote a user-perspective experience review and a new story realignment plan instead of continuing to patch the UI blindly
- Easy:
  - once every tab was reviewed in order, the main problem was clear quickly: the route is not underpowered, it is mixing four jobs too tightly
- Hard:
  - the route now has better structure than before, which makes the remaining flaws subtler; the real problem is not one broken card, but that the desk still does not teach the user which decision each tab is for
- Improve:
  - when a user says `I cannot tell what I am supposed to know or do`, stop optimizing widgets and rewrite the route around decisions, not sections
  - release routes should separate:
    - decision
    - action
    - inspection
    - recovery
    before they try to expose every valid technical surface

### 2026-03-22 - Deployments Realignment Needed The Last Old Surfaces Rewritten Too
- Tasks:
  - finished the approved Deployments realignment instead of stopping at the first calmer release tab
  - rewrote the bundle sidebar into mission cards with:
    - posture
    - output count
    - page family
    - path pattern
  - rewrote advanced setup/recovery into:
    - `Release Recipe`
    - `Recovery Tools`
  - changed advanced field labels from target wiring language into release language
  - tightened the recovery cards so each one says what it repairs and which desk it relates to
  - reran focused Deployments proofs and rechecked the live route
- Easy:
  - the release/history/inspect structure was already close enough that the real gain came from rewriting the remaining old sidebar and advanced surfaces
- Hard:
  - one new sidebar composition introduced invalid nested typography structure inside `ListItemText`; the focused test exposed it immediately and the fix was to make the secondary container render as `div`
  - the focused test also failed because it still matched the old overly-specific bundle button name; that had to be updated to the new mission-card accessible label instead of forcing the UI back to the old structure
- Improve:
  - when realigning a route, do not leave the sidebar or advanced editor speaking the old vocabulary; one stale surface can make the whole page still feel incoherent
  - focused integration tests are especially valuable on product-language refactors because they catch both structural DOM mistakes and accessibility-name drift before browser review

### 2026-03-22 - System Settings Needed Fewer Groups And Clearer Inheritance
- Tasks:
  - rewrote System Settings away from repeated setup messaging and into a quieter fallback-default desk
  - merged setup truth and remote readiness into one calmer card
  - replaced long binding summaries with three product groups:
    - public page defaults
    - published data defaults
    - media library default
  - kept advanced selectors hidden by default and relabeled them in product language
  - added effect and override notes so the operator can understand inheritance before saving
- Easy:
  - the backend settings model already supported the real fallback groups; the main issue was presentation and duplication, not missing persistence
- Hard:
  - the old desk repeated the same truth in multiple cards, so improving it required deleting and regrouping, not decorating
  - the published-data defaults live across two modules, so one calmer product section still had to save both settings domains coherently
- Improve:
  - rare-use desks should shrink until they tell one truth clearly instead of explaining the same thing three times
  - if a screen is about inheritance, every section should say both effect and override, otherwise users cannot trust what they are changing

### 2026-03-22 - Remotes Needed One Board And One Repair Surface
- Tasks:
  - rewrote `Remotes` away from control-panel summaries and into a connection-plus-readiness desk
  - added a product-owned connections sidebar and connection repair panel
  - rewrote setup into a six-part readiness board with product language instead of target jargon
  - centralized `Analyze Readiness` and `Prepare Missing Pieces`
  - fixed prepared-piece counting to use distinct managed bindings instead of raw target rows
- Easy:
  - the repo already had the core compatibility and provisioning signals; the real job was translating and regrouping them into one readable product surface
- Hard:
  - the route was carrying a stale internal tab even on a clean URL, so deterministic browser review needed an explicit `?tab=setup` entry point
  - the focused proof had to be updated for multiple text collisions caused by using the same product labels in both tabs and section headings
- Improve:
  - when a route owns both setup and repair, connection repair must stay on the same desk; sending the user elsewhere destroys the point of the product surface
  - count user-visible publishing pieces, not raw target rows, or the whole readiness story immediately loses trust

### 2026-03-22 - Domains Needed To Start With Reader Truth, Not Delivery Jargon
- Tasks:
  - replaced the old `Domain Delivery Desk` shape with a `Public Address Desk`
  - moved overview/setup/detail into a cleaner split:
    - `What Readers See`
    - `Go Live`
  - removed inline target editing from the main surface and moved creation/editing into a right-side drawer
  - rewrote the sidebar to list public addresses as testing vs live, not as raw target rows
- Easy:
  - the underlying browser-delivery descriptor already knew enough to build a good reader-facing truth surface once the desk stopped leading with provider vocabulary
- Hard:
  - the first partial pass improved wording without fixing the real structural issue: the old page was still a target editor wearing product labels
  - the drawer flow needed explicit draft defaults for browser-delivery targets or new-address creation would fall back to the generic remote-target contract
- Improve:
  - for public-facing desks, lead with what a reader can open today and only then explain how to bring it live
  - if the product standard says create/edit belongs in a drawer, do not leave a raw inline editor behind just because the backend model already exists

### 2026-03-22 - UI-Only Journey Surfaced Real Product Gaps, Not Just Data Entry Steps
- Tasks:
  - executed a full first-run content journey through the browser UI only:
    - media upload
    - author creation
    - nested categories
    - tags
    - post normalization/publishing
    - layout creation
    - page creation
    - release bundle creation
    - remote release
    - remote verification
    - remote comment submission
  - documented the full journey in:
    - `docs/research/ui-first-journey-nuli-2026-03-22.md`
- Easy:
  - the improved desks made the main route order usable enough that the full journey could actually be completed without falling back to scripts for the authoring and release work
  - remote publishing and the temporary application tester both worked well enough to prove real remote reads and writes from the deployed page
- Hard:
  - seeded state meant the journey was never truly “empty system” and had to be documented honestly as normalization plus creation, not pure creation from zero
  - post pagination still lies through the URL, which forced search-driven workarounds and weakened trust in the backlog
  - the remote published page is still mostly blank visually, so proof required direct browser inspection of `#page-data`, meta tags, and media references
  - the remote comment flow succeeded, but the local moderation desk did not show those comments because the public deployed flow writes to `publicComments` while the desk reads `blog-comments`
- Improve:
  - full-journey operator tests are exposing the real product truth faster than isolated module polish
  - if the deployed page publishes correctly but does not render visibly for a reader, the system is still short of the real product bar
  - public comment intake and local moderation must converge on one source of truth or the workflow will continue to feel broken even when both halves work independently

### 2026-03-22 - Journey Follow-Up Closed The First Real Product Seams
- Tasks:
  - wrote the first-run operator guide in:
    - `docs/guides/ui-first-nuli-journey-how-to.md`
  - wrote the hard execution plan for the journey issues in:
    - `docs/research/ui-first-journey-fix-plan-2026-03-22.md`
  - wrote the deployed-page application-layer plan in:
    - `docs/research/deployed-page-application-script-plan-2026-03-22.md`
  - implemented the comment-product convergence path:
    - remote `publicComments` can now be imported into local `blog-comments`
    - the `Comments` desk exposes that intake visibly
  - fixed the user-facing hardshifts found during the journey:
    - posts pagination lying through the URL
    - post drawer stale state on reopen
    - taxonomy batch create silently no-oping
    - taxonomy category drawer instability from stale route state
- Easy:
  - the right seam to fix was not Firestore itself but the product boundary between remote public intake and the local moderation queue
  - once the moderation desk owned the intake visibly, the mismatch stopped feeling mysterious
- Hard:
  - stale listeners on `3000` and `3001` initially masked the new code with old behavior
  - the review env had to be verified against actual port ownership before trusting browser results
  - direct frontend Vitest remains unreliable on this Windows setup, so browser proof and server conformance were the honest primary evidence
- Improve:
  - for future full-journey passes, always treat remote-to-local convergence as a first-class acceptance point
  - never trust `review:env:start` alone when the observed browser behavior contradicts the expected code path; verify the ports and refresh from live state

### 2026-03-22 - Deployed Pages Stopped Being Blank Shells
- Tasks:
  - executed the deployed-page application-layer plan from:
    - `docs/research/deployed-page-application-script-plan-2026-03-22.md`
  - added a server-side application view-model layer for page payloads
  - added public comments listing to both the local public routes and the Cloud Run public page API
  - rewrote the injected page application script into a reader-facing shell with:
    - post rendering
    - category rendering
    - gallery rendering
    - comment loading/submission
    - optional review/debug overlay behavior
  - fixed deployment render so generated artifacts preserve the application payload layer
  - fixed runtime asset versioning so remote deployed assets invalidate when the browser scripts change
  - reran local artifact generation and live remote release bundles
- Easy:
  - once the browser script had a client-side fallback model, the rendered page became resilient even when the richer application envelope was absent
  - local and remote comment submission both proved the public interaction path cleanly after the runtime augment was rewired
- Hard:
  - the first implementation had a circular import from `page-application-view-runtime` back into `page-delivery-runtime`
  - the first browser boot path had multiple contract mismatches:
    - wrong IIFE close
    - wrong helper argument order
    - wrong runtime global assumption
  - remote pages stayed stale even after release because the asset version token only changed when the page payload changed, not when the browser asset changed
  - the long-running review backend briefly contradicted the passing server proof until the env was restarted and the artifacts were regenerated
- Improve:
  - any deployed-page feature must be proven twice:
    - against the local published page
    - against the real remote deployed page
  - browser asset URLs must always version against asset content, not only page state
  - deployment render and delivery resolve paths must be kept structurally aligned or one side will silently lag behind the other

### 2026-03-23 - Stale Port Owners Hid The Real Fix
- Tasks:
  - traced the user-reported regression on remote comments and missing page links back to the live surfaces
  - proved the managed launcher and the actual `3000/3001` port owners had diverged
  - updated `scripts/review-env.mjs` so Windows listener discovery uses `Get-NetTCPConnection` before the older `netstat` fallback
  - updated `frontend/src/app/product-shell/ProductModerationView.jsx` so public comment intake refreshes on:
    - first mount
    - focus
    - visibility return
    - a 20-second interval
  - reran:
    - `blogpage-013` sync
    - `blogpage-014` sync
    - `pagedepl-001` release
    - `pagedepl-002` release
- Verified:
  - the remote deployed post now shows real navigation and category links
  - a new remote comment submitted after the rerelease was imported automatically into the local moderation queue as `pending`
- Improve:
  - a healthy review env is not the same thing as the correct review env; port ownership must match the launcher’s pids
  - comment-intake convergence must keep refreshing while the moderation desk is open, not only when it first mounts

### 2026-03-23 - Temporary GCS Needs index.html, Domains Should Not
- Tasks:
  - traced the remaining broken deployed-page links after the comment fix
  - proved the live temporary browser-delivery target was still `gcp-temporary` with no hostname
  - confirmed the remote reader page needs `.../index.html` links on raw `storage.googleapis.com/.../site` delivery
  - implemented delivery-aware page-link normalization in:
    - `modules/test-modules-pages/browser/page-application-tester.global.js`
    - `modules/test-modules-pages/frontend/page-public-link-support.js`
    - `modules/test-modules-pages/frontend/page-output-forecast-support.js`
  - kept the server-side application payload patch in `modules/test-modules-pages/server/page-application-view-runtime.mjs`
- Verified:
  - `pnpm --filter frontend build`
  - `pnpm quality:protocol`
  - fresh remote browser proof on:
    - `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/remote-flow-review-post-01/index.html?cb=20260323-0801`
  - confirmed live links now include `/index.html` on:
    - breadcrumbs
    - category chips
    - next-story
    - related-story cards
- Improve:
  - temporary provider-owned object delivery and custom-domain route delivery are different contracts; the URL builder must model both explicitly
  - page-output forecasts and the deployed reader app must share the same public-link rule or the app will lie about what is actually browseable

### 2026-03-23 - fastcart.dev Exposed The Real Browser-Delivery Provisioning Gaps
- Tasks:
  - configured the live `Primary Domain` target in the UI for:
    - hostname `fastcart.dev`
    - `gcp-managed` DNS
    - `https-load-balancer`
  - proved the initial browser-delivery compatibility flow could now surface disabled API actions after the earlier API-action patch
  - used the product flow to enable:
    - `dns.googleapis.com`
    - `certificatemanager.googleapis.com`
    - `compute.googleapis.com`
  - widened long-running operation polling in:
    - `remote-ops-gcp-provisioning-execution-runtime.mjs`
    - `remote-ops-gcp-browser-delivery-gcp-runtime.mjs`
  - fixed HTTPS browser-delivery compatibility so inspect-permission failures no longer hide create actions
  - narrowed each HTTPS browser-delivery action to the exact permission it needs instead of the whole provision bundle
- Verified:
  - direct compatibility analysis now reports:
    - APIs enabled
    - browser-delivery resources as `unknown` when inspect access is missing
    - per-resource provision actions with precise missing permissions
- Findings:
  - the previous model had two separate product bugs:
    - false timeout while enabling APIs on a fresh project
    - false “everything blocked” state because every stack action was checked against the full browser-delivery provision permission bundle
  - after those fixes, the remaining blocker is real IAM, not app logic
  - the service account currently lacks create rights for the load-balancer / certificate / DNS stack, so the app cannot yet create the Cloud DNS zone and therefore cannot yet show the exact authoritative name servers for `fastcart.dev`
- Improve:
  - inspect permissions and create permissions must never be conflated in provisioning UX
  - long-running GCP service-activation flows need much wider polling windows than ordinary CRUD actions
  - do not tell the operator to change registrar name servers until the managed zone actually exists and the app can show the exact assigned `nameServers`

### 2026-03-23 - fastcart.dev Reached Real GCP Browser-Delivery Provisioning
- Tasks:
  - fixed HTTPS browser-delivery URL map creation so it supports a prefixed deployment bucket instead of requiring the deployment target prefix to be empty
  - fixed HTTPS URL map creation to send the required top-level default backend bucket
  - fixed HTTPS proxy creation to attach the certificate map on create
  - hardened the live Google API client so non-JSON upstream error bodies no longer explode as JSON parser crashes
  - provisioned the remaining `fastcart.dev` browser-delivery resources against live GCP:
    - URL map
    - HTTPS proxy
    - HTTPS forwarding rule
    - managed-zone A record
    - certificate authorization CNAME
- Verified:
  - `pnpm --filter server exec vitest run test/module-conformance/remote-ops.module-conformance.test.js`
  - `pnpm quality:protocol`
  - `pnpm review:env:verify`
  - live compatibility analysis now reports:
    - browser-delivery resources present
    - only certificate `PROVISIONING` remains as a warning
    - authoritative Cloud DNS name servers are available in the report
- Findings:
  - the earlier “empty deployment prefix required” warning was product debt, not a true platform limit
  - the app’s local review environment can still lose the copied service-account file across backend restarts, so live remote work must re-check the stored credential path after each restart
  - `fastcart.dev` is not publicly live yet because the registrar is still delegated to:
    - `ns-cloud-b1.googledomains.com.`
    - `ns-cloud-b2.googledomains.com.`
    - `ns-cloud-b3.googledomains.com.`
    - `ns-cloud-b4.googledomains.com.`
  - GCP assigned a different authoritative set for the managed zone:
    - `ns-cloud-e1.googledomains.com.`
    - `ns-cloud-e2.googledomains.com.`
    - `ns-cloud-e3.googledomains.com.`
    - `ns-cloud-e4.googledomains.com.`
- Improve:
  - browser-delivery provisioning tests must cover real Compute API field requirements, not just mocked happy-path acceptance
  - the review env should not report a healthy remote setup if the copied credential file is missing on disk
  - when using `gcp-managed` DNS, the product should surface a stronger registrar-delegation warning as soon as the managed zone exists and the current nameservers do not match

### 2026-03-23 - Domain Onboarding Became A Real Product Flow
- Tasks:
  - added local recovery copies for imported service-account keys so missing copied key files can self-heal
  - rewrote the Domains `Go Live` route into a 3-step product flow:
    - product-owned Google setup
    - registrar delegation step
    - public HTTPS readiness
  - changed action language from generic infrastructure verbs to domain-specific actions:
    - `Analyze Domain State`
    - `Prepare This Domain On Google`
  - moved saved real-domain targets directly into the `Go Live` context after save
  - re-imported the current `merchant-guild` key through the Remotes UI and revalidated the connection so the live desk could be rechecked
- Verified:
  - server conformance for remote ops passed with the new credential self-recovery proof
  - Domains integration test passed against the new nameserver-guidance flow
  - frontend build, protocol checks, and review env verification all passed
  - live Domains UI now shows:
    - `ns-cloud-e1` to `ns-cloud-e4` nameservers
    - Google-managed A and certificate DNS records
    - explicit guidance not to create manual registrar A/CNAME records
- Findings:
  - the biggest operator confusion in this flow was not GCP complexity; it was the app mixing:
    - what the product owns
    - what the registrar owner still has to do
  - a saved validated connection is not enough if the copied key file disappears later; the app needs recovery at the credential layer
  - once the nameservers are visible in the Domains desk, the remaining external state is easy to explain and verify

### 2026-03-23 - Fixed Custom-Domain Delivery And Stopped Tests From Wiping Live Credentials
- Tasks:
  - fixed the `fastcart.dev` live reader path so deployed post/category pages render with working domain-local navigation
  - fixed the public comments GET path on the deployed page so it no longer 404s
  - isolated remote-ops conformance from the real `remote-runtime/remote-ops-live` folders so local validation no longer deletes live credentials and recovery files
- Verified:
  - `https://fastcart.dev/post/remote-flow-review-post-01` renders and its internal links stay on `fastcart.dev`
  - `https://fastcart.dev/category/blogcate-001` renders with working post/category links
  - runtime assets load through the domain with `200`
  - public comments listing request returns `200`
  - focused remote-ops conformance passed after isolation changes
  - `review:env:verify` and `quality:protocol` passed
  - `remoteco-012` and `remoteta-020` validate successfully after restart
- Findings:
  - the blank custom-domain page was two separate failures layered together:
    - broken asset rewrite semantics in the HTTPS load balancer
    - stale cached asset URLs reused after the delivery origin changed
  - the “missing key file” churn was not random; the remote-ops conformance suite was deleting the real live runtime folders in its cleanup phase
  - browser-delivery validation should not depend on manually persisted GCP resource-name fields when those names are deterministic from the configured hostname

### 2026-03-23 - Split First Paint From Deferred Reader Data
- Tasks:
  - wrote the payload-optimization hard plan in:
    - `docs/research/deployed-page-payload-optimization-plan-2026-03-23.md`
  - slimmed the server-built page application model so initial HTML only carries current-page render data
  - added a dedicated reader-facing `application-view` JSON route locally and in the public page API
  - enriched published Firestore projection documents with author/category/tag/media summaries so JSON-only route changes can render without fetching new HTML
  - taught the browser reader shell to:
    - boot from the initial model
    - hydrate deferred reader blocks after first paint
    - intercept same-app links and navigate by JSON + `history.pushState`
  - aligned the local and public reader contracts on top-level `pagePath`
- Verified:
  - `node --check` passed on the touched browser/server/public-api files
  - focused blog-distribution conformance passed after the local/public contract mismatch was corrected
  - `quality:protocol` passed
  - `review:env:verify` passed
- Findings:
  - the heavy reader payload problem was not only “too much HTML”; it was also a projection-shape problem
  - if published post/category docs are too thin, the client either over-fetches whole collections or falls back to HTML reloads
  - local module public routes and the public Cloud Run API must stay shape-compatible, otherwise the reader shell ends up with transport-specific branching again
  - the right proof is two-layered:
    - initial payload contains empty deferred blocks
    - `application-view` returns the hydrated adjacent/related model on demand

### 2026-03-23 - Reframed Reader Optimization Around The Data Layer
- Task:
  - stopped the optimization rollout and rewrote the direction as a hard architecture plan in:
    - `docs/research/deployed-page-data-layer-navigation-plan-2026-03-23.md`
- Why:
  - the `application-view` path improved payload size but violated the intended system shape
  - it moved reader composition back to a server-built page-view contract instead of using the existing browser data/action runtime as the read/mutation bridge
- Corrected direction:
  - application script reads through `window.dataLayer`
  - application script writes through `window.actionLayer`
  - the runtime decides bootstrap JSON vs IndexedDB vs Cache Storage vs Firestore/public service
  - first render uses only current-route bootstrap data
  - deferred blocks and internal navigation use the same query families
- Key design conclusions:
  - a future-proof solution needs keyed route/record/listing datasets in the client runtime
  - published reader data should be projected as domain documents and route documents, not server-composed page views
  - mutable global context is not enough for route transitions; navigation queries should become param-first
- Verification:
  - reviewed the client-runtime contract, runtime plan, playground proof, current page-runtime generator, and recent page-delivery plans before writing the new plan
- Result:
  - this was a plan-only architecture correction slice with no new runtime or page-delivery implementation beyond docs/pointer updates

### 2026-03-23 - Delivered Data-Layer Reader Navigation On The Live Domain
- Task:
  - executed the data-layer reader plan instead of continuing the rejected `application-view` architecture
- Implementation:
  - extended `client-runtime` with:
    - `upsertDataset(...)`
    - remote-on-empty-local fallback
    - nested dot-path local filters
    - remote-result persistence into datasets
  - replaced the page reader contract with dataset/query families:
    - `reader-page-bootstrap`
    - `reader-page-deferred`
    - `readerPage.current`
    - `readerPage.byPath`
    - `readerDeferred.byPath`
  - added matching local/public reader routes:
    - `/api/reference/modules/test-modules-pages/public/reader/bootstrap`
    - `/api/reference/modules/test-modules-pages/public/reader/deferred`
    - public API:
      - `/reader/bootstrap`
      - `/reader/deferred`
  - reduced inline HTML payload to current-route bootstrap data only
  - rewrote the browser page shell to:
    - read through `window.dataLayer`
    - fetch deferred reader data after paint
    - change post/category routes through JSON + `history.pushState`
- Debugging findings:
  - the first live rollout still behaved like the old system because the shipped `client-runtime.global.js` bundle had not been rebuilt
  - the symptom was precise:
    - `readerPage.byPath` returned an empty local dataset hit instead of falling through to remote
  - rebuilding with `pnpm build:client-runtime` fixed the shipped runtime logic
  - a second bug remained in click handling:
    - internal links could still fall through to full document navigation
  - moving the interception handler to `document` capture fixed the live route transition
- Live verification:
  - on `https://fastcart.dev/post/remote-flow-review-post-01?...`
    - initial page uses the slim bootstrap payload
    - `window.dataLayer.query({ resource: 'readerPage', query: 'byPath', ... })` now returns remote documents for other post/category paths
    - clicking `Next Story` updates to `/post/remote-flow-review-post-02` without a second HTML document request
    - clicking `Primary Category` updates to `/category/releases-928325` without a second HTML document request
  - refreshed all live page-family bundles after the runtime rebuild:
    - `M04 Posts`
    - `M04 Categories`
    - `Nuli Posts`
    - `Nuli Categories`
- Verified:
  - `pnpm build:client-runtime`
  - `pnpm quality:protocol`
  - `pnpm review:env:verify`
  - `pnpm --filter server exec vitest run test/module-conformance/blog-distribution.module-conformance.test.js`
- Widget/Component Builder research pass completed.
- Reviewed current seams before proposing the ticket:
  - structural layout persistence in `layoutDocument`
  - coarse page bindings (`hero/body/supporting`)
  - page-bound runtime slot contracts
  - deployed reader application still authored mostly in browser code
- Strong architectural conclusion:
  - this should not be implemented as "more props on blocks"
  - it needs a new typed presentation layer between page context and deployed runtime
- Ticket written in:
  - `docs/research/widget-component-builder-implementation-ticket-2026-03-24.md`
- Ticket recommends:
  - typed component registry
  - one component instance per block in V1
  - structured binding descriptors instead of raw template strings
  - bounded action descriptors
  - compiled render contract
  - data-layer-driven deployed rendering
  - phased migration away from hardcoded reader sections
- Widget/Component Builder document set completed.
- The research pass was re-reviewed against the original product directive before finalizing the implementation program.
- Main alignment additions in the final document set:
  - page-owned query correlation is now a named architectural requirement
  - binding source modes are explicitly separated:
    - static
    - page context
    - media library
    - listing item context
  - composite/template wrappers are now a first-class part of the registry model, not a later accidental extension
  - the `tabs` mixed static/dynamic case is explicitly modeled in the design docs
- Pre-implementation docs now cover three levels:
  - manager brief
  - implementation program
  - authoring/runtime design contract
- No implementation code started in this slice.
- Widget/Component Builder docs were revised after review findings.
- Architectural clarifications now locked in the docs:
  - canonical binding namespace is `context.*`
  - current `application.model.*` and raw payload bags are internal assembly layers only
  - V1 bindable sources are only declared page-owned context branches
  - derived runtime branches can exist in the manifest but are not general-purpose V1 widget inputs
  - action model now includes a reader navigation bridge separate from `window.actionLayer`
  - bounded page-level override seam added so reusable layouts stay practical
  - V1 scope aligned to post-detail only
- Widget/Component Builder Pass 0 implemented.
- Contracts established in code:
  - canonical binding namespace: `context.*`
  - page context manifest schema with declared/derived provenance
  - widget/component descriptor schema
  - widget component instance normalization
  - seeded V1 registry entries:
    - post-title
    - post-rich-text
    - media-image
    - category-chips
    - author-card
- Structural layout documents now support block-owned `componentInstance` values without breaking legacy layouts.
- Validation behavior added at the layout-document level for invalid block component instances.
- Focused proofs passed after rerunning outside the sandbox because Vitest worker spawn still hits the known local `EPERM` boundary inside the sandbox.
- Widget/Component Builder Pass 1 implemented.
- New runtime seam:
  - `modules/test-modules-pages/server/page-context-manifest-runtime.mjs`
- The delivery/runtime contract now exposes a canonical manifest for widget binding:
  - root payload:
    - `pageContextManifest`
    - `pageContextManifestIssues`
  - client runtime:
    - `runtime.clientRuntime.contextManifest`
- Architectural decision held in code:
  - the manifest is deterministic for the page contract
  - it is not allowed to drift with whichever record happened to load
- V1 bindable post-detail surface now resolves to:
  - `context.page`
  - `context.post`
  - `context.author`
  - `context.categories`
  - `context.tags`
- Derived transparency branches are present but not bindable:
  - `context.navigation`
  - `context.related`
  - `context.commentsMeta`
- Pages review surface updated:
  - `BlogDistributionRuntimeContractPanel.jsx`
  - now shows:
    - context branch counts
    - bindable branches
    - derived branches
    - resolved manifest JSON
- Focused proofs:
  - core contract test now proves deterministic post-detail manifest generation
  - blog distribution conformance now proves the page payload and client-runtime contract carry the canonical manifest
- Verification completed:
  - `pnpm --filter frontend test -- src/tests/core/widget-component-contracts.core.test.jsx`
  - `pnpm --filter server test -- test/module-conformance/blog-distribution.module-conformance.test.js`
  - `pnpm --filter frontend build`
  - `pnpm quality:protocol`
  - `pnpm review:env:start`
  - `pnpm review:env:verify`

### 2026-03-24 - Widget Builder Only Became Reviewable After Verifying The Authoring Surface And The Live Reader Together
- Tasks:
  - finished the Widget/Component Builder passes through live delivery
  - repaired the public page API packaging so the deployed reader service could import the new page runtime helpers
  - reran the live M04 post/category releases and validated both the local authoring flow and the real `fastcart.dev` reader
- Easy:
  - once the layout route was opened directly with the target `layoutId`, the authored widget tree made the product state obvious immediately
  - the live reader network proof was crisp: one initial document, then JSON-only route changes through the reader bridge
- Hard:
  - direct SPA route state on the Pages desk is still less trustworthy to verify than the Layouts route because the drawer/portal state does not always show cleanly in the devtools accessibility snapshot
  - the public API deploy initially failed because the Docker build context only copied the service folder while the new runtime imports reached into shared/server files outside that subtree
  - the known Windows sandbox `spawn EPERM` boundary still affects focused frontend Vitest runs, so the correct move was to rerun those proofs outside the sandbox instead of pretending the failure was product-related
- Improve:
  - for authored presentation work, always verify both sides:
    - the authoring surface that defines the contract
    - the live reader that consumes it
  - if a deployable service starts importing shared runtime code, move the Docker build context decision into the feature slice immediately or deployment will lag behind the repo state
  - for SPA verification, trust the route whose visible canvas reflects the authored state most directly; here that was Layouts, not the Pages drawer snapshot
### 2026-03-24 - Layouts Review Surfaced Two Real Product Gaps: Shell Routing And Dynamic Binding Discoverability
- Tasks:
  - restored the normal workflow shell on the Layouts route
  - made widget dynamic binding understandable from the authoring surface instead of assuming the operator would infer it
- Easy:
  - the shell regression was concrete and easy to prove once the live route was opened: no sidebar meant Layouts was still forcing immersive mode
  - a small, explicit authoring rule at the top of the page closed a large part of the confusion immediately
- Hard:
  - the dynamic-binding problem was not a missing runtime capability; it was a discoverability failure, which is slower to diagnose because the data already existed in the system
  - the new focused proof initially failed for the wrong reason: duplicated MUI label text in the dialog, not a bad product behavior
- Improve:
  - when a feature depends on a dialog-level workflow, add one top-level sentence on the main desk telling the operator where that workflow begins
  - do not leave module routes on hardcoded shell exceptions once the product expects cross-module navigation
  - when adding UI proofs around MUI forms, assert the actual control (`getByLabelText`) rather than raw repeated text nodes
### 2026-03-25 - UI Content Reset And Deploy Compare Exposed Real Product Gaps In Cleanup, Authoring, And Reader Consistency
- Tasks:
  - continued the UI-only cleanup/content rebuild mission
  - pushed the fresh post set through page/template reassignment and live deployment
  - compared predicted reader transport with real deployed behavior
- Easy:
  - the release room was the strongest surface in the product; both post bundles ran cleanly and exposed real progress detail
  - once `Nuli Post Page` was moved to `/journal/{slug}` and attached to `Widget Story Shell`, the Pages preview became a trustworthy planning surface
- Hard:
  - true cleanup is still not realistically supported by the product; posts can be archived and some authors can be deleted, but ownership chains keep old proof records alive across modules
  - post authoring remains fragile under long-form input and can still jam the session badly enough to lose an unsaved draft
  - the deployed reader is not internally consistent yet:
    - `/post/...` comments stay in loading
    - `/journal/...` deferred reader fetch returns `404`
    - the predefined route does not render the same way for every record
- Improve:
  - cleanup needs a first-class destructive workflow that reconciles posts, authors, taxonomies, and pages together instead of forcing operators to discover dependencies through failed deletes
  - public routes should not ship tester assets by default
  - deployment validation should include route-specific deferred reads and comment loads, not only bundle completion
  - page-template forecasting should use live examples that stay aligned with the actual generated records after release
### 2026-03-25 - Reader Optimization Needed A Hybrid Contract, Not Just A Smaller Inline Payload
- Tasks:
  - removed the fully inlined route-family contract from deployed HTML
  - kept enough inline route knowledge to support first render and same-family post navigation
  - added a deployment-owned page-contract manifest asset for cross-family navigation
  - verified the new transport live on `fastcart.dev`
- Easy:
  - once the backend was actually restarted, the generated HTML made the payload shift obvious: only the current page retained `layout` and `pageContextManifest`, while the other route entries became lightweight
  - same-family post navigation was already structurally compatible with the data-layer model once the current page contract stayed inline
- Hard:
  - the first release check was misleading because the old backend process was still emitting stale HTML; the live page looked wrong even though the repo diff was correct
  - a first pass at the manifest query produced a malformed `?v=... ?scope=current` asset URL because a versioned asset path was mixed with query-parameter templating
  - the correct architecture was not “inline everything” or “fetch everything”; it had to be:
    - current page contract inline
    - lightweight route index inline
    - full route contract fetched only when the route family changes
- Improve:
  - for deployment-facing work, never trust a rerun until the backend process itself is known to be fresh
  - when a static asset path already carries a version query, do not layer additional declarative query params onto it
  - route-family navigation requirements should be reasoned from actual user flows:
    - post -> post should not need the full cross-family contract
    - post -> category can pay that cost once and then cache it
### 2026-03-25 - Public Routes Needed A Distinct Reader Asset Contract, Even Before A Deeper Runtime Cleanup
- Tasks:
  - removed tester-named assets from default live page delivery
  - kept the current reader behavior intact by renaming the shipped public assets rather than redesigning the reader boot sequence in the same pass
  - stopped shipping the Firestore helper on deployed-public-service routes where it is unused
- Easy:
  - the actual public issue was concrete and measurable in network traces: the live route loaded three `page-application-tester*` assets by name
  - changing the emitted asset contract and the inclusion rule for the Firestore helper closed the live issue without destabilizing reader navigation
- Hard:
  - the code is still structurally centered on the older `applicationTester` contract naming, so the live/public cleanup had to stop at the delivery boundary instead of pretending the full internal naming debt was gone
  - the right scope here was delivery cleanup, not a full reader/tester runtime split
- Improve:
  - separate “public contract cleanliness” from “internal module naming cleanup”; both matter, but they are not the same-sized task
  - keep using live network traces as the acceptance source for shipped-page asset hygiene
### 2026-03-25 - Widgetized Layout Review Needed A Presentation Pass, Not Another Data Pass
- Tasks:
  - compared the authored `Widget Story Shell` in the Layouts desk with the deployed `park-bench-weather-log` page on `fastcart.dev`
  - confirmed the contract and node tree were already present in the browser, so the mismatch was visual composition rather than missing widget data
  - found two concrete causes:
    - every block used the same generic wrapper treatment
    - column flex containers still applied `flex-basis` on the vertical axis, which made each child consume the full container height
  - added semantic reader classes from layout node labels, placeholder types, emphasis, and widget keys
  - shifted widget shells to more appropriate defaults:
    - breadcrumbs/title/body/category chips/related stories plain
    - author/navigation/tabs soft surfaced
    - media blocks visually prominent without filename captions
  - corrected column flex child placement so stored `basis` values become width instead of height
  - reran `Post Release Bundle`, `Journal Release Bundle`, and `Category Release Bundle`
- Easy:
  - the live contract inspection made it obvious the renderer already had the right tree; the failure was presentation semantics, not missing route data
  - fresh isolated browser contexts were the reliable way to prove new public asset versions after redeploy
- Hard:
  - an intermediate live check was misleading because the page reused cached asset URLs; the DOM still showed the old broken height behavior until a fresh isolated context loaded the new asset version
  - text-only snapshots understated the visual issue; bounding-box inspection exposed the real bug immediately by showing every root child at the full root height
- Improve:
  - for widgetized reader regressions, inspect both the rendered DOM tree and actual element geometry before assuming the data contract is wrong
  - flex placement in authored layout systems must be axis-aware; stored `basis` means width in row layouts but cannot be applied blindly in column layouts
  - public layout review should always include a fresh-browser verification path so asset-cache reuse does not fake a failed redeploy
