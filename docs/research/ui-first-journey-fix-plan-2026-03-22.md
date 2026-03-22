# UI-First Journey Fix Plan

Date: 2026-03-22

## Scope

This plan addresses the real product mismatches and hardshifts exposed by the UI-only Nuli journey.

It does not try to redesign the whole product again.

It fixes the parts that broke trust during the journey:

1. remote public comments did not appear in the local moderation desk
2. tag batch creation could silently no-op
3. category editing could destabilize the route/drawer flow
4. post pagination did not behave reliably from the user point of view
5. closing the post drawer could leave stale editor state behind

## Evidence

Primary documentary:

- [ui-first-journey-nuli-2026-03-22.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/ui-first-journey-nuli-2026-03-22.md)

Most important product gap from that journey:

- the deployed public comment flow wrote to remote `publicComments`
- the local moderation desk read local `blog-comments`
- the operator expectation was one coherent queue

That mismatch must be fixed at the product seam, not explained away.

## Execution Order

## Pass 1. Comment Product Convergence

Goal:

- make remote public comments visible in the local `Comments` desk

Approach:

1. add a server-side sync/import route that:
   - resolves the active browser-delivery target
   - resolves the remote GCP project and public comments collection path
   - reads public comments from Firestore
   - imports missing entries into local `blog-comments`
2. call that import from the local moderation desk on load and on demand
3. reload the moderation collection after import
4. show clear sync feedback in the desk

Acceptance:

- the two remote comments from the journey appear in the local queue
- repeat imports do not duplicate the same comments

## Pass 2. Tag Batch Creation Trust

Goal:

- batch creation must either create tags or tell the operator exactly what happened

Approach:

1. harden batch result accounting
2. verify created count after reload
3. show a success or partial-failure summary:
   - created
   - skipped
   - failed
4. add focused proof around batch input

Acceptance:

- batch create can no longer silently do nothing while looking successful

## Pass 3. Category Drawer Stability

Goal:

- category editing must not destabilize the route or white-screen the desk

Approach:

1. tighten route-to-form synchronization
2. reset drawer-local state deterministically on open/close
3. guard against invalid selected category transitions
4. add focused coverage for create -> edit -> close transitions

Acceptance:

- repeated open/edit/close cycles do not white-screen

## Pass 4. Posts Pagination Truth

Goal:

- changing pages in the post backlog must visibly change the roster

Approach:

1. reproduce the exact route-state path
2. harden page derivation and visible row slicing
3. clamp invalid page state after filter changes and reloads
4. add a focused proof for page 1 -> page 2 behavior

Acceptance:

- the URL and the visible backlog stay in agreement

## Pass 5. Post Drawer Cleanup

Goal:

- closing the post drawer must leave the route and editor state clean

Approach:

1. explicitly reset transient editor dialogs and gallery state on close
2. clear stale drawer-local state after successful save and close
3. verify the route returns to the clean backlog URL

Acceptance:

- close does not leave stale modal/editor remnants behind

## Verification

Minimum proof before review:

1. focused frontend and server proofs for the touched paths
2. local review env verification
3. manual browser pass on:
   - `/app/comments`
   - `/app/taxonomies?taxonomyBranch=tags`
   - `/app/taxonomies?taxonomyBranch=categories`
   - `/app/posts`
4. update:
   - [handoff.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/handoff.md)
   - [agent-observer-log.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/agent-observer-log.md)

## Out Of Scope

This plan does not attempt:

- a new product redesign pass for comments, taxonomy, or posts
- a new deployment architecture
- a new remote commenting model

It is intentionally about fixing the concrete gaps the UI-only journey exposed.
