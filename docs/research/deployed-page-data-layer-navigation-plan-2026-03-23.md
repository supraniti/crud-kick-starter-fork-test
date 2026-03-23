# Deployed Page Data-Layer Navigation Plan (2026-03-23)

## Directive

The deployed reader application must use the existing browser data/action runtime as its data bridge.

That means:

- the application script does not fetch server-built page views as its primary read path
- the application script reads through `window.dataLayer`
- mutations go through `window.actionLayer`
- the data layer decides whether the answer comes from:
  - embedded HTML bootstrap JSON
  - IndexedDB
  - Cache Storage
  - remote Firestore or public service transport
- first load and later in-page navigation use the same query model

This plan replaces the recent `application-view` direction as the main architecture.

## What Was Wrong With The `application-view` Direction

The `application-view` slice did improve payload size, but it violated the intended boundary.

Why it is the wrong center of gravity:

1. It moved page-read composition back to the server.
- the application script stopped being a consumer of the data layer
- it became a thin shell around a special server endpoint

2. It created a parallel reader contract.
- initial HTML payload contract
- `application-view` JSON contract
- this makes the data layer less central, not more central

3. It weakens the runtime's value.
- the runtime should be the place where local-first vs remote decisions happen
- `application-view` bypasses that by returning already-shaped page models

4. It does not scale elegantly for richer references.
- every new page kind or deferred block pressures the server view route
- the application becomes dependent on server-composed reader models instead of queryable domain data

So the correction is not a small patch.
The correction is to restore the data layer as the read authority.

## North-Star Outcome

A deployed page should behave like this:

1. HTML loads.
2. Browser runtime boots.
3. Application script asks the data layer for the current route/page state.
4. The runtime answers from embedded bootstrap data when possible.
5. The application renders immediately.
6. After first paint, the application asks the data layer for deferred data like comments and related content.
7. When the reader clicks another internal page:
- no HTML refetch
- no special page-view endpoint
- the application asks the data layer for the new route's data
- the runtime resolves it from local storage or remote transport
- the application re-renders and updates the URL

The application script stays replaceable.
The data/action runtime stays stable.

## Core Principles

1. One read bridge
- reader application reads through `window.dataLayer.query(...)`
- no special server-composed page-view API as the primary page-read path

2. One mutation bridge
- comments and future reader mutations go through `window.actionLayer.dispatch(...)`

3. One domain model across transports
- embedded bootstrap JSON
- IndexedDB cache
- remote Firestore documents
- optional public service fallback
must all resolve to the same domain shapes

4. First render uses route-local data only
- only what is needed to paint the current route belongs in HTML

5. Deferred data is explicit
- comments
- adjacent routes
- related content
- category listings
must be separate from the first-render core

6. Navigation is data retrieval, not HTML retrieval
- route transition is an application concern using the data layer
- not a document navigation and not a special page-view shortcut

7. Storage must become keyed and reusable
- route-by-path
- record-by-id
- collection-slice-by-parent
not just whole-dataset installs of large arrays

## Reader Data Tiers

## Tier 1: First Render

This is the minimum route-local bootstrap needed to display the page as currently displayed.

For a post page, Tier 1 must include:

- route identity
  - current path
  - page id
  - page kind
  - primary source type
  - primary record id
- head identity
  - title
  - description
  - canonical
  - OG values needed for debug/review display
- current post display data
  - title
  - subtitle
  - excerpt
  - body
  - publish/update timestamps
  - read time / word count if rendered
- current layout/render data for this route only
  - layout id/key
  - only the current page's layout model or compiled slot instructions
- visible author summary
  - name
  - slug/id
  - avatar summary if shown
  - bio/role if shown
- visible categories and tags
  - ids
  - labels
  - slugs / paths when available
- directly visible media summaries
  - featured media
  - gallery media referenced on this page
- comment capability metadata only
  - enabled true/false
  - policy
  - post id

Tier 1 must explicitly exclude:

- whole posts collection
- whole categories collection
- whole tags collection
- precomputed related posts
- precomputed previous/next navigation
- comment items
- child category listings not yet visible
- debug payloads that are not required for reader render

For a category page, Tier 1 must include:

- current category identity and display data
- breadcrumb chain for the current category only
- current page layout/render data
- enough summary data for the immediately visible page chrome

Tier 1 should be stored in HTML as route-local bootstrap documents and installed into the runtime at boot.

## Tier 2: Deferred After First Paint

These are useful immediately after render, but should not block first paint.

Examples:

- approved comments for the current post
- previous/next post links
- more from this author
- related by category
- related by tag
- child categories
- posts in the current category
- author-post lists

The application script should request these through the data layer after the initial route render completes.

## Tier 3: Route Transition

These are the reads needed when moving from one internal page to another without HTML reload.

Examples:

- route document by path
- primary record by route
- route-local layout/render document
- visible taxonomy/media summaries for the target route
- then deferred blocks for the target route

Tier 3 must reuse the same query model as Tier 1 and Tier 2.
The only difference is the requested route path.

## Intended Query Model

The application script should stop thinking in terms of "fetch page view".
It should think in terms of domain reads.

Suggested query families:

### Route queries
- `route.current`
- `route.byPath`

Purpose:
- resolve the route shell
- identify page kind
- identify primary record
- identify layout/render binding

### Primary content queries
- `record.current`
- `record.byRoute`
- `post.byId`
- `category.byId`
- later:
  - `author.byId`
  - `tag.byId`

Purpose:
- retrieve the current record needed for render
- keep record fetching separate from route resolution

### Render/layout queries
- `layout.current`
- `layout.byPageId`

Purpose:
- load only the current layout/render instructions
- keep layout retrieval explicit instead of hiding it inside a page-view response

### Listing/navigation queries
- `navigation.adjacentByRecord`
- `listing.byAuthor`
- `listing.byCategory`
- `listing.byTag`
- `category.children`

Purpose:
- deferred sections
- next/previous routes
- related content

### Comments queries
- `comments.byPost`

Purpose:
- post-render comment list retrieval
- local-first if installed, otherwise network-first

### Media queries
- `media.byId`
- `media.byIds`

Purpose:
- support pages whose primary docs carry only media ids or partial summaries
- allow richer future media behavior without bloating route docs

## Runtime Storage Direction

This is the most important technical change for maintainability.

The current runtime works best when a dataset is installed or synced as a whole unit.
That is useful, but not sufficient for route-by-route application navigation at scale.

The next direction should add keyed reader stores.

## Needed storage shapes

### 1. Route store
Keyed by path.

Stores:
- route identity
- page id
- page kind
- primary source type
- primary record id
- layout binding
- visible head fields
- route-local visible references

Example key:
- `/post/remote-flow-review-post-01`
- `/category/releases`

### 2. Record stores
Keyed by record id or slug depending on projection discipline.

Stores:
- post documents
- category documents
- author documents
- tag documents

### 3. Listing stores
Keyed by parent identity and query intent.

Examples:
- `author:blogauth-003:recent-posts`
- `category:blogcate-002:posts`
- `tag:blogtags-001:posts`
- `post:blogpost-005:related-by-category`

### 4. Comments store
Keyed by post id.

Example:
- `post:blogpost-005:approved-comments`

## Why keyed stores matter

Without keyed stores, the system drifts toward one of two bad states:

1. embed too much data in HTML
2. keep adding special server-composed JSON endpoints

Keyed stores let the runtime answer:
- current route from bootstrap
- next route from IndexedDB if already visited
- remote fetch only for the missing route record/listing

That is the maintainable middle path.

## Transport Strategy

The runtime should support multiple transports behind the same query names.

### Embedded bootstrap transport
Used only for the current document at first load.

Purpose:
- zero-latency first render
- no network required to paint current page

### IndexedDB transport
Used whenever a route/record/listing was previously installed or hydrated.

Purpose:
- fast repeat navigations
- local-first behavior
- explicit install/sync visibility

### Cache Storage transport
Optional support for remote JSON response caching where appropriate.

Purpose:
- cheap repeated reads for route or listing responses
- degrade gracefully when unavailable

### Remote Firestore transport
Preferred remote truth for published reader data when browser-firestore mode is enabled.

Purpose:
- read projected route and record docs directly
- read comments directly when policy allows

### Public service transport
Fallback when browser-firestore is not the chosen delivery mode.

Purpose:
- expose the same documents and listings through a public API
- preserve query shape even when transport changes

## Important boundary

Transport changes must not change application query names.
The application should not care whether data came from:
- bootstrap JSON
- IndexedDB
- Firestore
- public service

That decision belongs in the runtime config and policy layer.

## Projection Direction In Firestore

Published data should be projected as reader-facing domain documents, not as heavy page views.

## Proposed projection families

### `publishedRoutes`
Keyed by route path or a deterministic encoded path id.

Fields:
- path
- page id
- page kind
- primary source type
- primary record id
- layout id/key
- head summary
- visible reference ids and minimal summaries
- breadcrumb summary if required for first paint

This becomes the route lookup document.

### `publishedPosts`
Keyed by post slug or post id, but be consistent.

Fields:
- current post display fields
- author reference and summary
- category references and summaries
- tag references and summaries
- visible media references and summaries
- comment policy
- SEO/debug-facing identity fields if needed by the app

### `publishedCategories`
Fields:
- current category display fields
- parent id
- breadcrumb support fields
- featured media summary if rendered

### Later families
- `publishedAuthors`
- `publishedTags`
- listing/projection docs for author/category/tag related slices if runtime cost requires them

## What not to project

Do not project server-composed page application views as the main artifact.
Project domain documents and route documents.
The application should compose the page from queries.

## Application Script Responsibilities

The application script remains important, but narrower.

It should:

1. ask the data layer for the current route document
2. ask the data layer for the current primary record and visible references
3. render the current page
4. after paint, request deferred blocks
5. intercept internal route clicks
6. request the next route through the data layer
7. update URL and re-render
8. ask the action layer to submit comments

It should not:

- manually decide storage source
- know Firestore details
- know public API URL details beyond what the runtime already exposes
- compose special transport branches per page kind

## Navigation Flow

## First load

1. HTML embeds route-local bootstrap docs.
2. Runtime installs bootstrap datasets.
3. Application script calls:
- `route.current`
- `record.current`
- `layout.current`
4. Runtime answers from embedded bootstrap / installed datasets.
5. Application renders.
6. Application requests deferred blocks.

## Internal navigation

1. User clicks internal route link.
2. Application prevents document navigation.
3. Application asks the data layer for:
- `route.byPath`
- then route-driven queries for primary record and layout
4. Runtime answers:
- from IndexedDB if warm
- otherwise from remote transport and stores the result
5. Application updates UI state and `history.pushState`.
6. Application requests deferred blocks for the new route.

## Back/forward

1. `popstate` fires.
2. Application asks for the route by current path again.
3. Runtime serves from IndexedDB/memory when warm.
4. Application re-renders.

## Comments Flow

Comments should stay on the action/data runtime as well.

Read:
- `comments.byPost`

Write:
- `comments.submit`

Behavior:
- first render shows the comment shell without items if items are not local yet
- deferred read loads the approved list
- submit uses `actionLayer.dispatch`
- successful submit marks the comments dataset dirty and refreshes it

This remains compatible with:
- browser-firestore mode
- public service mode

## Runtime Evolution Needed

This plan implies runtime work, not only page-script work.

## 1. Add keyed dataset support

The runtime needs better support for:
- record maps
- route maps
- listing slices keyed by query identity

This can be introduced as an extension of dataset definitions rather than a separate runtime product.

## 2. Support query-driven local upsert

When a network-first query retrieves a route or record, the result should be storable into IndexedDB under a deterministic key.

This prevents repeated cold fetches during navigation.

## 3. Make context optional, params preferred for navigation reads

Current config relies heavily on mutable `context.*`.
That is useful for the current route, but route transitions should primarily use explicit params:

- `path`
- `recordId`
- `categoryId`
- `tagId`
- `authorId`

This reduces bugs caused by stale global context and makes navigation composable.

## 4. Keep context as the default current-route identity

Context still matters for:
- current comments submit
- current route reads without explicit params
- current page debug/review state

But it should not be the only source of truth for route transitions.

## Safe Implementation Order

## Pass 1: Architecture Reset
- freeze `application-view` as a temporary branch, not the target architecture
- write the new hard plan and acceptance contract
- define the target query families and storage shapes

## Pass 2: Projection Reshape
- add `publishedRoutes`
- slim current published post/category docs to domain-reader shape
- make route docs point to record docs instead of embedding too much cross-page material

## Pass 3: Runtime Contract Upgrade
- extend runtime dataset support for keyed route/record/listing stores
- add query result persistence for keyed remote reads
- add param-first reader queries

## Pass 4: Page Runtime Generator Rewrite
- stop emitting server-composed page-view expectations
- emit bootstrap datasets for:
  - current route
  - current primary record
  - current layout
  - directly visible references
- keep comments/deferred data out of first render payload

## Pass 5: Application Script Rewrite
- boot from `window.dataLayer.query(...)`
- render current route from queried data
- progressively hydrate deferred blocks through query families
- navigate by path using the same query model

## Pass 6: Public Transport Alignment
- make browser-firestore and public-service modes expose the same domain document shapes
- no application-level branching by transport

## Pass 7: Verification
- prove that first load renders with no special page-view fetch
- prove that post->post and post->category navigation fetch only route/record/listing JSON through data-layer queries
- prove comments and related blocks remain second-tier
- prove IndexedDB answers repeat navigations after warmup

## Acceptance Criteria

This plan is only done when all of these are true:

1. The application script renders the current page by querying the data layer, not by consuming a server-built page-view response.
2. First HTML contains only current-route bootstrap data.
3. Comments are not in first HTML.
4. Previous/next/related/category listing data are not in first HTML.
5. Internal navigation does not fetch new HTML.
6. Internal navigation uses the same data-layer query families as first load.
7. The runtime can serve a revisited route from local storage when warm.
8. Transport can switch between Firestore and public service without changing application code.
9. Future page kinds can plug into the same route/record/listing model without creating another special page-view contract.

## Immediate Implementation Guidance

When implementation resumes, do not patch the current `application-view` path further.
Use it only as a temporary compatibility bridge while the runtime-centered path is introduced.

The next code slice should start with:
- hardening the target query model
- defining route and record projection documents
- designing keyed runtime datasets

That is the right foundation for a unique system.
