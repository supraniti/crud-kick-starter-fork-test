# M04 Completion Map

## Purpose
- Lock the remaining north-star passes into one fixed sequence.
- Stop recalculating the next step on each turn.
- Define what "done" means for the current M04 product-shaping mission.

## Inputs
- [m04-north-star-alignment-program.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/m04-north-star-alignment-program.md)
- [current-state-repo-map.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/current-state-repo-map.md)
- `C:\Users\cmsin\OneDrive\שולחן העבודה\M04-north-start-alignment.txt`

## Current Position
- Completed through M04 Pass 23.
- Already achieved:
  - product shell routes and labels
  - product `System Settings`, `Remotes`, `Domains`, `Deployments`
  - managed remote target bundle
  - strict remote readiness gating
  - taxonomy remote projection
  - per-record category pages
  - page-owned remote/domain bindings
  - named deployment bundles
  - client-runtime injection into deployed HTML
  - media-aware delivery payloads
  - release observability
  - server-owned and mission-backed bundle release
  - product `Authors` and `Comments` desks
  - comment runtime contract
  - page runtime slot contracts
  - layout rendered-structure preview
  - product remotes desk
  - stricter product remotes editor surface
  - product remotes setup stages
  - Pages runtime contract preview

## Definition Of Done For M04
- Normal runtime behaves like a product CMS, not a proof-module browser.
- Remote setup is staged, product-authored, and operationally clear.
- Domain setup clearly supports:
  - owned custom domains
  - temporary GCP access URLs
  - service path visibility
- Media, taxonomies, posts, authors, comments, pages, layouts, and deployments all expose the product workflows needed for the current end-to-end chain.
- Deployments are simple to configure and release from named bundles.
- Generated HTML is injected with `client-runtime` by default and the runtime contract is observable before and after deployment.
- Deployed HTML can demonstrate:
  - delivered JSON bootstrap
  - remote query seams
  - remote action seams
  - media links
- Proof/test modules are not exposed in normal runtime except through explicit product-owned desks or test/dev-only flags.

## Remaining Pass Count
- Estimated remaining implementation passes to reach the current M04 definition of done:
  - `6` functional passes
  - `1` final hardening/closeout pass
- Total remaining passes:
  - `7`

## Locked Remaining Sequence

### Pass 22: Product Remote Setup Cards
- Objective:
  - replace generic compatibility/provisioning framing in `Remotes` with staged product-authored setup cards
- Why now:
  - this is the largest remaining operator UX gap
  - other product flows depend on clearer remote state
- Deliver:
  - staged setup cards for:
    - connection
    - project validation
    - projections
    - media storage
    - deployment storage
    - browser delivery
  - explicit next-action states
  - product-level error/help copy for missing permissions and missing services
- Exit criteria:
  - operator can understand remote readiness from `Remotes` without going to raw remote-ops mental model

### Pass 23: Product Domain Setup Hardening
- Objective:
  - make `Domains` complete for the current product slice
- Deliver:
  - clearer owned-domain entry/edit flow
  - explicit custom-domain vs temporary-domain states
  - DNS instructions grouped by provider mode:
    - GCP-managed
    - external DNS
  - per-service public path visibility:
    - html
    - media
    - remote API / Firestore-facing links where applicable
  - stronger readiness summary for HTTPS/browser-delivery stack
- Exit criteria:
  - `Domains` alone explains how content will be reached publicly and what the operator must configure externally

### Pass 24: Media Product Hardening
- Objective:
  - raise `Media` from "works" to "product-solid"
- Deliver:
  - synced / not-synced indicators per media item
  - optional remote-only media visibility
  - stronger filtering/sorting
  - multi-select and bulk sync actions
  - clearer local-vs-remote URL visibility
- Exit criteria:
  - media lifecycle is understandable and operable from one desk

### Pass 25: Posts / Taxonomies / Authors Product Hardening
- Objective:
  - complete the core authoring triangle around posts
- Deliver:
  - richer post computed properties and authoring hints
  - stricter taxonomy usage visibility on posts/pages
  - taxonomy infrastructure shaping toward future extensibility
  - author/media completeness rules kept visible from product desks
- Exit criteria:
  - posts clearly demonstrate the intended reusable content-type pattern for future types

### Pass 26: Comments Sync And Moderation Hardening
- Objective:
  - make comments look like remote-originated content with a moderation pipeline, not just another CRUD list
- Deliver:
  - stronger sync-state emphasis
  - moderation-stage clarity
  - spam/regulation-oriented workflow cues
  - clearer relationship between remote comment contracts and local moderation views
- Exit criteria:
  - comments desk reflects the actual intended lifecycle of user-generated remote content

### Pass 27: Pages / Deployments Ease-Of-Use Hardening
- Objective:
  - make page-to-release authoring more computable and easier to operate
- Deliver:
  - computable SEO defaults and previews
  - stronger designated-url / expected-html-count cues
  - clearer bundle configuration from the product `Deployments` desk
  - better page/domain/bundle relationship visibility
- Exit criteria:
  - operator can define a page and understand exactly what public outputs it will generate and release

### Pass 28: Client Runtime Product Alignment
- Objective:
  - close the gap between the injected runtime and the CMS product model
- Deliver:
  - richer CMS-configurable runtime actions beyond current page/comment/media seams
  - broader runtime inspection, not only in `Pages`
  - stronger preview of delivered runtime behavior before deployment
  - observable deployed HTML proof path for:
    - bootstrap datasets
    - queries
    - actions
    - media links
- Exit criteria:
  - `client-runtime` is no longer just injected; it is a product-observable part of the delivery chain

### Pass 29: Module Exposure And Product Finalization
- Objective:
  - make normal runtime explicitly product-first
- Deliver:
  - dev/test-only exposure policy for baseline proof modules
  - normal app runtime hides non-product module surfaces by flag
  - remove remaining product/proof surface inconsistencies
  - final UX alignment pass across product routes
- Exit criteria:
  - standard runtime feels like one product surface with bounded internal engines underneath

### Pass 30: End-To-End Closeout Hardening
- Objective:
  - finalize the current M04 slice with proof, documentation, and cleanup
- Deliver:
  - updated current-state and M04 docs
  - full end-to-end practiced flow:
    - create posts/categories/media
    - create per-record pages
    - build deployment bundle
    - release locally and remotely
    - inspect domain/public URLs
    - inspect runtime contract before and after deployment
  - final test expansion where gaps remain
  - cleanup/archive of transient planning artifacts
- Exit criteria:
  - the repo can be handed over as the current north-star-aligned baseline for the next expansion wave

## Order Lock
- Execute the remaining passes in order unless a pass reveals a hard technical blocker that makes the next pass impossible.
- Cosmetic refinements should not interrupt the sequence.
- Progress pointers must be updated after each pushed pass.

## Verification Standard Per Pass
- Minimum:
  - targeted tests for the affected slice
  - `pnpm quality:protocol`
- Default:
  - `pnpm quality:gate:full`
- Also required:
  - progress pointer update:
    - `docs/research/m04-north-star-alignment-program.md`
    - `handoff.md`
    - `docs/agent-observer-log.md`

## Fast-Execution Rule
- Do not re-plan the whole program on every turn.
- Use this file as the fixed sequence.
- Only revise this map if:
  - the north-star brief itself changes
  - a pass uncovers a structural blocker that invalidates the remaining order
