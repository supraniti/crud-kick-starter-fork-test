# M06 Directive And Review Findings

## Date
- `2026-03-16`

## Directive
- Re-review the current product against:
  - [current-state-repo-map.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/current-state-repo-map.md)
  - [m05-product-flow-convergence-plan.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/m05-product-flow-convergence-plan.md)
  - `C:\Users\cmsin\OneDrive\שולחן העבודה\M04-north-start-alignment.txt`
- Treat the next work as a serious product-usability correction, not a shallow fix batch.
- Reflect on why the prior implementation only partially matched the intended product flow.
- Produce a readable plan and execute it until the system is genuinely closer to the intended operator flow.

## Explicit User Findings
1. `Pages` can enter an infinite redirect loop when switching selected pages.
2. `Deployments` reports:
   - `Stored service-account key file is missing. Choose the JSON key file again to re-import it.`
   - but does not show a clear recovery path in the product flow.
3. `Deployments` is still overloaded and hard to reason about.
4. This overload pattern exists across the product:
   - tables
   - lists
   - forms
   - long single-column surfaces
5. The system still needs a direct link between content or page records and the actual deployment URL:
   - preview is preferred
   - a URL is the minimum

## Re-Read Of The Product Intent
- The problem is not mainly missing capability.
- The problem is still product fluency.
- The likely empty-system user journey is:
  1. configure remote/provider and optional domain
  2. create media, taxonomies, authors, posts
  3. create a layout
  4. create a posts page
  5. create a categories page
  6. run deployment
  7. see what is deployed and what is not
  8. browse the remote or local output

## Current Re-Review Summary
- `Remotes`
  - has the core mechanics
  - still behaves too much like a staged compatibility console
  - too many setup stages remain `action-required` until manual analysis is run
- `Pages`
  - contains the needed mechanics
  - still exposes too much in one route
  - route synchronization is fragile
- `Deployments`
  - contains the release pipeline and browse links
  - still mixes:
    - readiness
    - runtime inspection
    - release history
    - observability
    - bundle setup
    - detailed operations
  - into one long surface
- direct deployment URLs already exist in some payloads and cards
  - but they are not yet prominent enough as a core operator affordance

## Why M05 Was Only Partial
- M05 improved labels, grouping, and demotion of advanced controls.
- M05 did not go far enough in:
  - screen composition
  - primary/secondary information hierarchy
  - setup-to-release choreography
  - explicit actionability when prerequisites are missing
  - stable route-state behavior in all product routes

## M06 Review Outcome
- The issues above were treated as real product-flow failures, not as isolated bug tickets.
- Delivered corrections:
  - `Pages` route-state hardening and stable page switching
  - actionable missing-key recovery guidance in `Deployments`
  - direct output/public URL surfacing in content and release routes
  - product-wide split layout and primary-tab composition for the main desks
  - smoke proof alignment with the new taxonomy workflow
- Final verification:
  - focused frontend integration bundle passed
  - `pnpm test:e2e:smoke` passed
  - `pnpm quality:gate:full` passed
