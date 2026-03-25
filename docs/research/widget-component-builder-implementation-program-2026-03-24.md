# Widget/Component Builder Implementation Program

Date: 2026-03-24
Status: Proposed
Depends on:
- [widget-component-builder-implementation-ticket-2026-03-24.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/widget-component-builder-implementation-ticket-2026-03-24.md)
- [widget-component-builder-authoring-runtime-design-2026-03-24.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/widget-component-builder-authoring-runtime-design-2026-03-24.md)

## Program Goal

Implement a widget/component builder on top of the current layout and page system so authored page components can bind to page-owned context and render through the deployed runtime.

## Program Rules

1. No free-form JSON as the normal operator path
2. One block hosts one widget instance in V1
3. Canonical binding namespace is `context.*`
4. All dynamic binding must come from declared page-owned context manifest branches
5. Deployed rendering must stay data-layer driven
6. Navigation requires an explicit reader action bridge
7. Implementation must proceed in bounded passes with reviewable vertical value

## Delivery Shape

The program should be delivered in seven passes.

## Pass 0: Foundations And Contracts

### Objective

Create the new shared schemas and registry foundations without yet changing the live authoring flow.

### Deliver

- shared `component descriptor` schema
- shared `content binding descriptor` schema
- shared `prop descriptor` schema
- shared `action descriptor` schema
- shared `component instance` schema
- shared `page context manifest` schema
- seed component registry for V1 widgets

### Candidate Files

New:

- `modules/test-modules-layouts/shared/widget-component-schema.mjs`
- `modules/test-modules-layouts/shared/widget-component-registry.mjs`
- `modules/test-modules-pages/shared/page-context-manifest-schema.mjs`
- `modules/test-modules-pages/shared/widget-binding-namespace.mjs`

Update:

- [layout-document.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/shared/layout-document.mjs)
- [distribution-shared-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/distribution-shared-runtime.mjs)

### Validation

- schema normalization tests
- invalid registry definitions fail fast
- old layout documents still load without component instances

## Pass 1: Page Context Manifest

### Objective

Create the correlation layer between page-owned query setup and widget binding.

### Deliver

- page context manifest generation from:
  - primary source
  - additional data sources
  - existing page-bound slots/listings
- initial manifest support for:
  - post-detail
- manifest exposure in Pages for inspection
- manifest provenance per branch:
  - declared
  - derived
  - deferred

### Candidate Files

New:

- `modules/test-modules-pages/server/page-context-manifest-runtime.mjs`

Update:

- [page-delivery-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-delivery-runtime.mjs)
- [page-client-runtime-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-client-runtime-runtime.mjs)
- [BlogDistributionView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionView.jsx)

### Validation

- manifest is deterministic for the same page definition
- manifest only exposes legal context branches
- post-detail manifest includes:
  - `context.post`
  - `context.author`
  - `context.categories`
  - `context.tags`
- V1 bindable branches are only those marked `declared`

## Pass 2: Layout Persistence And Block Widget Ownership

### Objective

Teach blocks to own widget instances without destabilizing the structural layout model.

### Deliver

- block `componentInstance` persistence
- normalization and cloning support
- migration compatibility for existing layouts
- visual indication on the canvas that a block has a widget assigned
- bounded page override seam in schema for future/selected fields

### Candidate Files

Update:

- [layout-document.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/shared/layout-document.mjs)
- [layout-builder-model.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layout-builder-model.js)
- [LayoutBuilderCanvasPrimitives.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderCanvasPrimitives.jsx)
- [LayoutBuilderInspector.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderInspector.jsx)

### Validation

- existing layouts still render
- new widgetized layouts save/load correctly
- removing a widget leaves the block intact
- overrideable field metadata persists without requiring page-level use yet

## Pass 3: Widget Studio Authoring UI

### Objective

Turn the block inspector into a widget configuration surface.

### Deliver

- choose widget from curated library
- show widget description and default binding summary
- configure static props
- configure content sources:
  - static
  - page context
  - media library
- configure bounded actions where supported
- canvas preview with realistic sample values
- source picker explicitly distinguishes:
  - static
  - page context
  - media library

### Candidate Files

New:

- `modules/test-modules-layouts/frontend/LayoutBuilderWidgetInspector.jsx`
- `modules/test-modules-layouts/frontend/LayoutBuilderBindingPicker.jsx`
- `modules/test-modules-layouts/frontend/LayoutBuilderComponentLibrary.jsx`

Update:

- [LayoutBuilderInspector.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutBuilderInspector.jsx)
- [LayoutsView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/LayoutsView.jsx)
- [useLayoutsWorkspace.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/useLayoutsWorkspace.js)

### Validation

- user can assign `Title` widget and bind to `context.post.title`
- user can assign `Image` widget and choose:
  - media library source
  - dynamic `context.post.featuredMedia`
- user can assign a composite widget like `Author Card`
- guided binding always resolves against canonical `context.*` paths

## Pass 4: Pages Compatibility And Authoring Guardrails

### Objective

Make Pages aware of layout widget requirements and unresolved bindings.

### Deliver

- page studio shows widget inventory for selected layout
- compatibility warnings:
  - unsupported page kind
  - missing required context branch
  - unresolved binding
- validation lifecycle rules:
  - layout save: schema only
  - page save: warnings allowed on drafts
  - preview: blocks unresolved required bindings
  - publish/deployment: hard block
- clear distinction between:
  - page config
  - layout widget config
- page no longer relies conceptually on only `hero/body/supporting`

### Candidate Files

Update:

- [BlogDistributionView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionView.jsx)
- [page-workspace-support.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/page-workspace-support.js)
- [BlogDistributionPagePresentationSections.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionPagePresentationSections.jsx)

New:

- `modules/test-modules-pages/frontend/PageWidgetCompatibilityPanel.jsx`

### Validation

- selecting a post page with a post widget layout shows green compatibility
- selecting an incompatible page kind shows clear warnings
- unresolved bindings are visible before deployment
- the page studio can show whether an issue is warning-only or deployment-blocking

## Pass 5: Compiled Render Contract

### Objective

Compile authored widget definitions into a runtime-friendly render contract.

### Deliver

- compile page + layout + widget instances into:
  - resolved render instruction tree
  - binding requirements
  - initial vs deferred widget hints
- declared vs derived branch provenance
- keep first render slim
- preserve relationship to page context manifest

### Candidate Files

New:

- `modules/test-modules-pages/server/page-widget-render-contract-runtime.mjs`

Update:

- [page-delivery-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-delivery-runtime.mjs)
- [page-deployment-render-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-deployment-render-runtime.mjs)
- [page-application-view-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-application-view-runtime.mjs)

### Validation

- first render includes only current-route widget inputs
- compiled contract references page context manifest paths
- compiled contract preserves canonical `context.*` binding paths
- contract is inspectable from Pages/Deployments in review mode

## Pass 6: Deployed Reader Widget Rendering

### Objective

Replace the first hardcoded reader slice with authored widget rendering through the runtime.

### Deliver

V1 widget set:

- title
- rich text
- image
- category chips
- author card

Reader behavior:

- current route reads through `window.dataLayer`
- same-app route changes re-render widget tree without new HTML
- navigation actions go through an explicit reader navigation bridge
- mutation actions go through `window.actionLayer`

### Candidate Files

Update:

- [page-application-tester.global.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/browser/page-application-tester.global.js)
- [page-application-tester-support.global.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/browser/page-application-tester-support.global.js)
- [client-runtime/src](C:/Users/cmsin/2026/crud-kick-starter-fork-test/client-runtime/src)

New:

- `modules/test-modules-pages/browser/page-widget-renderer.global.js`
- `modules/test-modules-pages/browser/page-widget-registry.global.js`
- `modules/test-modules-pages/browser/page-widget-action-bridge.global.js`

### Validation

- post detail page renders from authored widget contract
- internal post navigation does not fetch new HTML
- widget tree updates from new route context
- local-first/runtime behavior still holds

## Pass 7: Composite Widgets And Navigation Surfaces

### Objective

Expand from primitive wrappers into selected composite blog widgets.

### Deliver

Composite V1.5 candidates:

- previous/next navigation
- post card
- breadcrumb
- tabs
- related stories

The `tabs` case is especially important because it proves mixed static/dynamic configuration.

### Candidate Files

Extend the registry and renderer surfaces from earlier passes.

### Validation

- collection/repeater contract exists with:
  - `context.item`
  - `context.index`
  - item key path
  - empty state
- author can configure static tab headers with dynamic tab body bindings
- navigation widget emits valid route transitions
- post pages can be assembled from curated widget sets
- category-detail expansion can begin only after the post-detail slice is stable

## Recommended Implementation Order By Risk

1. Pass 0
2. Pass 1
3. Pass 2
4. Pass 3
5. Pass 4
6. Pass 5
7. Pass 6
8. Pass 7

This keeps the risk order correct:

- contracts first
- authoring second
- deployment/runtime bridge third
- broader widget expressiveness last

## Test Strategy

### Required proof types

1. schema/conformance tests
2. layout authoring integration tests
3. page compatibility tests
4. deployed reader runtime tests
5. live browser verification on deployed pages

### Minimum acceptance proof

- one post page assembled from authored widgets
- same-app reader navigation works through runtime data reads
- no raw JSON editing needed for the common path

## Exit Criteria For Program Start

Implementation should begin only when these are accepted:

1. block hosts one widget instance in V1
2. canonical binding namespace is `context.*`
3. widget bindings come only from declared page context manifest branches
4. deployed runtime remains data/action-layer driven
5. composite wrappers are allowed but curated
6. V1 scope is post-detail first
