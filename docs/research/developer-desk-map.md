# Developer Desk Map

Use `pnpm developer:desk-map` for the same map in the terminal.

This map exists so the next product-facing change starts from the right files and the right proofs.

## System Settings
- Route: `/app/system-settings`
- Stage: Setup
- Purpose: Advanced defaults and shared product bindings after the main remote/domain setup is already in place.
- Product surface: `frontend/src/app/product-shell/ProductSystemSettingsView.jsx`
- Module owner: Synthetic product route backed by module settings and product-shell workspace state.
- Change here:
  - default bindings and advanced product-level switches
  - setup copy and guardrails that should not live inside content desks
- Proofs:
  - `frontend/src/tests/app-integration/product-system-settings.integration.test.jsx`

## Remotes
- Route: `/app/remotes`
- Stage: Setup
- Purpose: Connect the provider, validate access, inspect readiness, and prepare managed remote services.
- Product surface: `frontend/src/app/product-shell/ProductRemotesView.jsx`
- Module owner: `modules/test-modules-remote-ops`
- Change here:
  - connection setup, validation, billing, and managed service readiness
  - remote target forms and compatibility/provisioning flows
- Proofs:
  - `frontend/src/tests/app-integration/product-remotes.integration.test.jsx`
  - `server/test/module-conformance/remote-ops.module-conformance.test.js`

## Domains
- Route: `/app/domains`
- Stage: Setup
- Purpose: Bind release output to either a real hostname or a temporary public delivery mode.
- Product surface: `frontend/src/app/product-shell/ProductDomainsView.jsx`
- Module owner: Synthetic product route backed by browser-delivery target state in `modules/test-modules-remote-ops`.
- Change here:
  - browser-delivery setup flow and domain instructions
  - delivery-mode copy, warnings, and public URL posture
- Proofs:
  - `frontend/src/tests/app-integration/product-domains.integration.test.jsx`
  - `frontend/src/tests/app-integration/remote-ops.browser-delivery.integration.test.jsx`

## Media
- Route: `/app/media`
- Stage: Content
- Purpose: Upload, curate, preview, and sync the media library without leaving the desk.
- Product surface: `modules/test-modules-media-manager/frontend/MediaManagerView.jsx`
- Module owner: `modules/test-modules-media-manager`
- Change here:
  - media gallery/table experience, metadata editing, and sync posture
  - shared media picking primitives reused by other desks
- Proofs:
  - `frontend/src/tests/app-integration/media-manager.integration.test.jsx`
  - `server/test/module-conformance/media-manager.module-conformance.test.js`

## Taxonomies
- Route: `/app/taxonomies`
- Stage: Content
- Purpose: Manage categories and tags as shared structure for posts, pages, and release flows.
- Product surface: `modules/test-modules-taxonomy/frontend/BlogTaxonomyView.jsx`
- Module owner: `modules/test-modules-taxonomy`
- Change here:
  - taxonomy discovery, editing, remote projection posture, and linked usage visibility
  - category/tag balance and future taxonomy-family expansion
- Proofs:
  - `frontend/src/tests/app-integration/products-taxonomies.integration.test.jsx`
  - `server/test/module-conformance/blog-editorial-taxonomy.module-conformance.test.js`

## Authors
- Route: `/app/authors`
- Stage: Content
- Purpose: Maintain the author roster, linked posts, and author-facing media/profile details in one place.
- Product surface: `frontend/src/app/product-shell/ProductEditorialView.jsx`
- Module owner: `modules/test-modules-editorial`
- Change here:
  - author listing, filtering, editing flows, and linked-post visibility
  - author validation and reusable author media/profile widgets
- Proofs:
  - `frontend/src/tests/app-integration/product-editorial.integration.test.jsx`
  - `server/test/module-conformance/blog-editorial-taxonomy.module-conformance.test.js`

## Posts
- Route: `/app/posts`
- Stage: Content
- Purpose: Create and revise posts with their author, taxonomy, media, and release posture visible together.
- Product surface: `modules/test-modules-content/frontend/BlogContentView.jsx`
- Module owner: `modules/test-modules-content`
- Change here:
  - post authoring surface, status, related links, and release-readiness signals
  - field validation and post-centric product flow
- Proofs:
  - `frontend/src/tests/app-integration/blog-content.integration.test.jsx`
  - `server/test/module-conformance/blog-content.module-conformance.test.js`

## Comments
- Route: `/app/comments`
- Stage: Content
- Purpose: Moderate public comment intake and keep comment state aligned with published content.
- Product surface: `frontend/src/app/product-shell/ProductModerationView.jsx`
- Module owner: `modules/test-modules-engagement`
- Change here:
  - moderation queue, approval/rejection flows, and public comment posture
  - comment-origin visibility and write-path guardrails
- Proofs:
  - `frontend/src/tests/app-integration/product-moderation.integration.test.jsx`
  - `frontend/src/tests/app-integration/blog-engagement.integration.test.jsx`
  - `server/test/module-conformance/blog-engagement.module-conformance.test.js`

## Layouts
- Route: `/app/layouts`
- Stage: Presentation
- Purpose: Design reusable page structure through the canvas-first builder.
- Product surface: `modules/test-modules-layouts/frontend/LayoutsView.jsx`
- Module owner: `modules/test-modules-layouts`
- Change here:
  - layout canvas, structural presets, contextual editing, and saved layout records
  - shared layout semantics used by pages and preview flows
- Proofs:
  - `frontend/src/tests/app-integration/layouts.integration.test.jsx`
  - `server/test/module-conformance/layouts.module-conformance.test.js`

## Pages
- Route: `/app/pages`
- Stage: Presentation
- Purpose: Turn content and layouts into deployable page definitions and per-record templates.
- Product surface: `modules/test-modules-pages/frontend/BlogDistributionView.jsx`
- Module owner: `modules/test-modules-pages`
- Change here:
  - page authoring, runtime contract preview, per-record generation, and public link posture
  - deployment bundle composition and page-specific release behavior
- Proofs:
  - `frontend/src/tests/app-integration/blog-distribution.integration.test.jsx`
  - `frontend/src/tests/app-integration/blog-distribution.per-record.integration.test.jsx`
  - `server/test/module-conformance/blog-distribution.module-conformance.test.js`

## Deployments
- Route: `/app/deployments`
- Stage: Release
- Purpose: Run release bundles, inspect readiness, and browse the resulting local and remote outputs.
- Product surface: `frontend/src/app/product-shell/ProductDeploymentsView.jsx`
- Module owner: Synthetic product route backed primarily by `modules/test-modules-pages` and `modules/test-modules-remote-ops`.
- Change here:
  - release pipeline orchestration, readiness messaging, and browseable output links
  - release observability and cross-desk deployed/synced state
- Proofs:
  - `frontend/src/tests/app-integration/product-deployments.integration.test.jsx`
  - `frontend/src/tests/app-integration/product-deployments.key-recovery.integration.test.jsx`
  - `server/test/module-conformance/blog-distribution.module-conformance.test.js`
