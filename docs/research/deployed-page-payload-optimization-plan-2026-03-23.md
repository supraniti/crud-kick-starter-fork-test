# Deployed Page Payload Optimization Plan (2026-03-23)

## Goal
Reduce the deployed HTML payload to only the data required for first render, keep post-render and navigation data fetchable on demand, and establish a route/navigation contract that still works as the content graph becomes more complex.

## Current Implementation Status
- Implemented:
  - Tier 1 initial application payload in deployed HTML
  - enriched published projections for posts/pages/categories
  - public `application-view` route locally and in the public page API
  - client-side deferred hydration and same-app JSON navigation hooks in the reader shell
- Verified:
  - focused blog-distribution conformance
  - `quality:protocol`
  - `review:env:verify`
- Still separate from this repo pass:
  - redeploying the public page API and page bundles so the live domain starts serving the new contract

## Current Over-Fetch
The current deployed HTML embeds a server-built application model that precomputes adjacent and related navigation by loading whole collections:
- all published posts
- all categories
- published pages for link resolution

That makes the first HTML heavier than necessary and ties reader navigation to server-side precomputation instead of a reusable client-side view contract.

## Target Shape
### Tier 1: First Render
Embed only what is required to paint the current page immediately.

For a post page:
- page id, path, primary source type
- head fields needed for current page title/description/canonical
- current post body and display fields
- current author summary needed for the author card
- current categories and tags needed for visible chips
- directly referenced media needed for hero/gallery
- comment capability metadata only
- lightweight breadcrumb data

Explicitly exclude from Tier 1:
- whole post collection
- whole category collection
- precomputed related stories
- previous/next story resolution
- child category discovery
- comments collection items
- full debug-only structures unless debug mode requests them

### Tier 2: Deferred After First Paint
Fetch data that improves the page after it is already readable.

Examples:
- approved comments for the current post
- previous/next story
- related by author/category/tag
- category child branches
- category story list when it is not already in current payload

The contract should let each page kind declare which deferred blocks it can hydrate.

### Tier 3: Client-Side Route Change
Navigating from one post/category page to another should not fetch HTML again.

Flow:
1. intercept same-app reader links
2. fetch a published application-view JSON document
3. update the in-memory model
4. re-render the reader shell
5. update `history.pushState`
6. refresh deferred sections for the new route

## Long-Term Contract
### 1. Enrich Firestore Projection Documents
Published Firestore documents must be rich enough to render a page from one document fetch.

Post projection should carry:
- title, subtitle, excerpt, body
- publish/update/read-time fields
- primary author summary
- category summaries
- tag summaries
- directly referenced media summaries
- comment policy fields

Page projection should carry:
- path
- primary source type
- deployment mode
- path pattern
- primary source binding

Category/tag projection should carry:
- current-page display fields
- enough identity/path data to build chips and branch links

### 2. Add a Dedicated Public `application-view` Route
This route should return a lean reader-facing JSON view, not the full delivery payload.

Response shape should be stable across transports:
- page summary
- head summary
- initial model
- deferred sections
- resolved timestamp

The route may assemble deferred sections from projected Firestore collections.

### 3. Keep HTML and JSON Contracts Aligned
The server-side initial HTML payload and the public `application-view` response should share the same model shape.

This avoids two different reader contracts:
- first load from HTML
- later load from JSON

## Safe Implementation Order
### Pass 1
- shrink the initial server-built application model
- stop embedding collection-derived related/adjacent sections in HTML
- keep comments deferred

### Pass 2
- enrich Firestore projection documents for posts/pages/categories/tags
- make projected docs sufficient for current-page render

### Pass 3
- add public `application-view` JSON route
- support both local review and deployed public service

### Pass 4
- reader shell hydrates deferred sections after first paint
- reader shell intercepts internal links and uses JSON navigation

### Pass 5
- move more reader-only debug material behind explicit debug mode
- measure and reduce first payload further if render model/debug payload still dominates

## Maintainability Rules
- do not hardcode blog-post assumptions into the navigation core; page kind drives section hydration
- keep initial model and deferred sections separate in code and transport
- prefer projected reader documents over reconstructing from raw collections in the browser
- route changes must reuse the same render function as first load
- comments remain a separate dataset and should not bloat the primary page document
- future complex references should be added first to projection documents, then exposed through the same application-view contract

## Expected First Delivery From This Plan
- smaller initial HTML payload for post pages
- comments still loaded after render
- related/adjacent sections loaded after render instead of being embedded
- client-side post/category navigation without refetching HTML
- a path to keep richer future references inside the same three-tier model
