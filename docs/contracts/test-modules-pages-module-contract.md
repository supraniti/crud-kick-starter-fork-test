# Test Modules Pages Module Contract

## Metadata
- Contract ID: `module-contract.test-modules-pages.v2`
- Date: `2026-03-09`
- Milestone: `pages-module-evolution`
- Owner: `codex`
- Status: `approved`

## Module Brief
- Module name: `test-modules-pages`
- Business objective: own standalone page records, redirect rules, and deterministic delivery payload resolution while consuming content and supporting entities by declarative reference.
- Primary users: editors and managing editors.
- Non-goals:
  1. Post body editing.
  2. Arbitrary query-language execution.
  3. End-user-authored frontend code.

## Domain Model
- Primary entities:
  - `blog-pages`
  - `blog-redirect-rules`
- `blog-pages` owns:
  - page identity: `title`, `path`, `status`, `layoutKey`
  - SEO/publication metadata
  - declarative source selection
  - declarative bounded data-source descriptors
  - per-page runtime script URL descriptors
  - structured layout contract
  - deterministic delivery-policy contract
  - deployment artifact tracking for published HTML output
- `blog-redirect-rules` owns:
  - redirect source path
  - target page or direct URL
  - redirect status / reason / http code

## Static Deployment Rules
- The `publish` action must generate a static HTML artifact for a page whenever the page enters or remains in `published`.
- Generated artifacts must be written under repo-root `deployment/`.
- Artifact shape:
  - `/` -> `deployment/index.html`
  - `/segment` -> `deployment/segment/index.html`
  - `/nested/segment` -> `deployment/nested/segment/index.html`
- Generated HTML must include:
  - SEO/meta tags derived from the page delivery payload
  - a globally configured app mount element tag
  - per-page runtime script tags injected in order
  - the resolved page delivery payload embedded as readable JSON in a script tag
- Redirect rules do not generate standalone HTML artifacts in this ticket.
- Deployment output must stay HTML-only; no sidecar page JSON files are part of this ticket.
- Path changes for a deployed page must remove the old artifact automatically.
- Transitioning a page out of `published` or deleting it must remove the deployed artifact automatically.

## Settings Rules
- `test-modules-pages` owns a module setting for the global app mount tag name.
- The mount tag setting must default to `app-root`.
- Per-page script URLs are page-owned data, not module settings.

## Standalone Page Rules
- A page can exist without any linked content record.
- Content creation does not imply page creation.
- Page source selection is declarative and optional.
- Page resolution may consume:
  - one `blog-post`
  - one `blog-author`
  - one `blog-category`
  - one `blog-tag`
  - bounded listings derived from author/category/tag context
- The module must reject arbitrary freeform queries or executable page logic.

## Delivery Contract Rules
- Delivery payloads are deterministic JSON.
- The same payload shape must be suitable for:
  - server HTML generation input
  - client bootstrap input
  - approved follow-up page loading by route/path
- Published HTML must embed the payload in `<script type="application/json">` form.
- Publish/version semantics for this ticket:
  - publish model: `live-reference`
  - preview model: same resolver/payload shape as delivery
  - rollback of page definitions is deferred; page records are versionable later but not snapshot-revisioned in this ticket
  - dependency keys must be exposed in the delivery payload for cache invalidation / republish logic

## Validation Rules
- unique normalized `path`
- page `status` in `draft|in-review|scheduled|published|archived`
- `path` must be relative and normalized
- `path` must not contain `.` or `..` traversal segments
- `layoutKey` must be present
- source descriptors must use only approved source kinds
- query/data-source descriptors must use only approved descriptor kinds
- listing descriptors must stay within bounded limit/sort rules
- runtime script URLs must be stored as a bounded ordered string list
- redirect rules must target either a page or a URL, not both
- redirect activation remains unique by normalized `sourcePath`

## UI Surfaces
- standalone pages desk
- page editor with route/SEO/layout/source/query controls
- delivery preview / resolved payload inspection
- deployment-aware publish/sync feedback
- redirect manager

## Persistence And Runtime
- Storage boundaries:
  - `blog-pages` persists the standalone page contract
  - `blog-redirect-rules` persists redirect rules
- Runtime contracts touched:
  - module manifest collections
  - module settings for deployment mount-tag configuration
  - module-owned pages desk and redirect-manager route views
  - module-owned delivery routes
  - module-owned static deployment writer/runtime helpers
- Determinism requirements:
  - delivery resolution must be pure from page record + referenced source state
  - follow-up navigation must reuse the same resolver contract shape

## Cross-Module Boundaries
- `test-modules-content` owns canonical posts and revisions only.
- `test-modules-pages` owns route/path, SEO, layout, page-source selection, redirect rules, and delivery payload shape.
- `test-modules-pages` may coordinate lifecycle mirroring to `blog-posts` when a page explicitly targets a post, but post creation/update must not create pages automatically.
- Static deployment stays module-local to `test-modules-pages`; no shared deployment-core abstraction is approved by this contract.

## Acceptance Criteria
1. Operators can create a page without creating content first.
2. Operators can bind a page to approved source kinds without hard post-derived coupling.
3. The module resolves deterministic delivery JSON for a page by `pageId` and by `path`.
4. Redirect rules can target standalone pages.
5. Query/data descriptors remain declarative and bounded.
6. Published pages generate repo-root static HTML artifacts with configured mount tag, script list, and embedded delivery JSON.
7. Path changes, unpublish/archive, and delete remove stale deployment artifacts automatically.

## Extension-Level Plan
- Level 1 changes:
  - evolve `blog-pages` and `blog-redirect-rules` schema
- Level 2 changes:
  - implement standalone page editor, delivery preview, and delivery routes locally in the module
- Level 3 changes:
  - extract neutral resolver helpers only if the same bounded pattern is proven twice elsewhere
- Level 4 changes (if any):
  - none approved at contract time

## Verification Lanes
- Targeted lanes:
  - focused pages module conformance tests
  - focused pages frontend integration tests
  - `pnpm test:frontend:integration:dynamic`
  - `pnpm test:server:conformance:dynamic`
- Closure lanes:
  - `pnpm quality:gate:full`

## Risks And Mitigations
- Risk:
  - page delivery can collapse back into post-derived publication logic
  - Mitigation:
    - page creation and identity stay page-owned; content no longer auto-syncs pages
- Risk:
  - data-source descriptors can become an unbounded query language
  - Mitigation:
    - allow only whitelisted descriptor kinds and source types with fixed limits/sorts
