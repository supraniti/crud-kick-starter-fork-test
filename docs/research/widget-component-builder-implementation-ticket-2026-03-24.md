# Widget/Component Builder Implementation Ticket

Date: 2026-03-24
Status: Proposed
Priority: High
Owner: Future implementation slice

## Executive Summary

Introduce a `Widget/Component Builder` as the next layer above the current Layout Builder.

Today, the layout system is structural. It knows containers, blocks, placement, and placeholder tone. It does not know how a block becomes a real reader-facing component, how that component binds to page data, or how it emits navigation and other runtime actions.

This ticket defines the next architectural layer:

- a block may host one configured widget/component instance
- that widget can render:
  - static content
  - content derived from page context
  - mixed content where static framing and dynamic values coexist
- that widget can expose typed props from a controlled component registry
- that widget can emit bounded actions through the deployed runtime

The outcome is a system where:

1. a user configures a page
2. assigns a reusable layout
3. configures the components inside that layout
4. chooses what data those components display
5. chooses what actions those components emit
6. deploys the page
7. the deployed application renders and behaves from those authored definitions

This must remain usable. Common publishing widgets must work with strong defaults and minimal operator friction.

## Why This Ticket Exists

The current system already has strong pieces, but they stop short of the actual publishing end game.

What exists today:

- reusable structural layout documents
- page records that choose a layout
- coarse page-level bindings like `hero`, `body`, and `supporting`
- deployed page runtime with `window.dataLayer` and `window.actionLayer`
- a deployed reader shell that renders pages

What is missing:

- a first-class widget/component model inside layout blocks
- a typed way to bind widget content to page context
- a clear correlation layer between page-owned queries and the fields widgets are allowed to consume
- a typed way to bind widget props to static or dynamic values
- a bounded action model for navigation and other reader interactions
- a deployment/runtime contract that renders authored widget instances instead of a mostly hardcoded reader shell

The system currently stops at structure. The ticket exists to bridge structure into authored behavior.

## Current State In The Repo

### 1. Layouts Are Structural Only

The current layout layer persists a `layoutDocument` tree with:

- container nodes
- block nodes
- placement information
- visual props like padding, gap, emphasis, min height

Relevant files:

- [layout-builder-model.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layout-builder-model.js)
- [layout-builder-palette.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-layouts/frontend/layout-builder-palette.js)

Current block language is placeholder-oriented:

- `hero`
- `text`
- `image`
- `feature`
- `cta`
- `sidebar`
- `content`

This is useful for shaping a page, but it is not a true component model.

### 2. Pages Still Bind At Section Level

Pages currently expose coarse layout bindings:

- `heroBinding`
- `bodyBinding`
- `supportingBinding`
- `sectionOrder`

Relevant files:

- [BlogDistributionPagePresentationSections.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionPagePresentationSections.jsx)
- [distribution-shared-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/distribution-shared-runtime.mjs)

That model is too broad for the requested future. It answers "which big section gets which source" but not "which component inside which block shows which field and how."

### 3. The Runtime Already Has Useful Foundations

Delivered pages already bootstrap:

- `window.dataLayer`
- `window.actionLayer`
- route and source context
- page-bound runtime slots

Relevant evidence:

- [page-client-runtime-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-client-runtime-runtime.mjs)
- [page-delivery-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-delivery-runtime.mjs)
- [m04-north-star-alignment-program.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/m04-north-star-alignment-program.md)

This is important because the widget system should build on those contracts, not bypass them.

### 4. The Deployed Reader Is Still Mostly Code-Authored

The current deployed page shell renders real pages, but it does so through a hardcoded reader application rather than authored widget instances.

Relevant files:

- [page-application-tester.global.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/browser/page-application-tester.global.js)
- [page-application-view-runtime.mjs](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/server/page-application-view-runtime.mjs)

This means:

- the runtime can read and mutate data
- but the rendered UI is still largely defined by application code, not by layout-authored component instances

### 5. The Gap Is Already Acknowledged In Repo Notes

Relevant repo note:

- [current-state-repo-map.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/current-state-repo-map.md) says there is no automatic server-to-client-runtime registry binding yet
- [m04-north-star-alignment-program.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/m04-north-star-alignment-program.md) explicitly notes there is currently no inner block-widget rendering

This ticket is the formal next step to close that gap.

## Problem Statement

We need to evolve from:

- layout as structure
- page as source binding
- deployed reader as hardcoded composition

Into:

- layout as structure plus widget placement
- page as context contract
- widget/component builder as the authored presentation layer
- deployed reader as a runtime that resolves authored widgets through the data/action layers

If this is solved poorly, the result will be:

- an overcomplicated authoring experience
- free-form JSON masquerading as flexibility
- brittle binding strings
- duplicated server and browser logic
- a deployed runtime that becomes harder, not easier, to extend

If this is solved well, the result will be:

- a usable widget authoring flow
- strong defaults for common publishing patterns
- typed compatibility between page kind, widget, and available context
- a deployed reader that can render authored pages without becoming a special-case maze

## Product Goal

Enable a non-technical operator to define a page using:

1. a page type and data source
2. a reusable layout
3. widgets placed into layout blocks
4. widget content and prop configuration
5. dynamic bindings to the page context
6. bounded user actions such as navigation

And have that authored definition deploy cleanly so the live page behaves according to the authored configuration.

## Non-Goals For V1

This ticket should not attempt to deliver every future idea in one pass.

Not in V1:

- arbitrary nested component trees inside a block
- custom code components authored by end users
- unrestricted expression languages
- page-specific free-form override of every component instance
- layout conditions and visibility rules across every possible dataset
- drag-and-drop block internals with multiple widgets in one block
- design-system theming overhaul

V1 should be strong, typed, and bounded.

## Core Design Principles

### 1. Keep Structure And Widgets Separate

`layoutDocument` should remain the structural source of truth.

A block should gain a single `componentInstance` or equivalent widget payload.
The block still owns placement and sizing.
The widget owns what is rendered in that block.

This keeps layout mechanics stable while adding a presentation layer.

### 2. Use A Typed Component Registry

Do not persist arbitrary component JSON.

Introduce a registry where each component wrapper declares:

- stable component key
- label
- category
- supported page kinds
- supported source types
- content slots
- prop schema
- optional action schema
- defaults
- preview summary

This keeps authoring safe, migration possible, and deployment inspectable.

### 3. Bind Data Structurally, Not As Raw Template Strings

The system needs one canonical binding namespace.

Recommendation:

- canonical authoring and compiled binding root: `context.*`
- current internal shapes like `application.model.*` or raw delivery `data.*` stay implementation details
- deployment/runtime must compile or alias current payloads into the canonical `context.*` surface

The user may see something like:

- `{{context.post.title}}`

But persisted state should be structured, not plain text templates.

Recommended persisted binding descriptor:

```json
{
  "mode": "dynamic",
  "source": "context",
  "path": "context.post.title",
  "fallback": "Untitled post"
}
```

This allows:

- validation
- migration
- preview
- compatibility checks
- better authoring UI

It also makes it possible to keep the widget builder synchronized with the page-owned query contract.
The widget is not choosing from all possible backend data.
It is choosing from the data that the current page definition already resolved into its context.

### 4. Default Aggressively

The user explicitly asked for high usability.

That means common widgets must work with almost no setup.

Examples:

- `Title` on a post page defaults to `context.post.title`
- `Featured Media` defaults to `context.post.featuredMedia`
- `Post Body` defaults to `context.post.body`
- `Category Chips` defaults to `context.post.categories`
- `Author Card` defaults to `context.author`

The operator should refine when needed, not build from nothing.

### 5. The Deployed App Must Use The Data/Action Layers

The widget system must not reintroduce a separate server-composed special rendering contract as its center of gravity.

The deployed reader application should:

- read route/page/record/listing data through `window.dataLayer`
- mutate through `window.actionLayer`
- choose local or remote sources through the runtime contract

Widget rendering should be the consumer of those runtime reads.

### 6. The Page-Owned Query Must Be The Source Of Binding Truth

The original requirement is explicit: component content may derive from the page-owned query.

That means the system needs a reliable correlation model:

1. the page declares:
  - primary source
  - additional data sources
  - named slots/listings
2. runtime resolves those into page context
3. widget binding UI exposes only that context
4. deployment/runtime use the same names and paths

This is the only way to keep:

- page setup
- layout/widget authoring
- deployed rendering

in sync.

Important distinction:

- declared page-owned context:
  - primary source
  - additional data sources
  - named slots/listings
- derived runtime context:
  - navigation
  - comments
  - related content
  - breadcrumbs

V1 recommendation:

- bindable widget sources come only from declared page-owned context
- derived runtime context is not generally bindable until it becomes first-class in the manifest with explicit provenance and validation rules

This keeps V1 coherent and prevents the binding model from depending on ad hoc reader synthesis.

## Proposed Architecture

## A. New Layer: Component Registry

Introduce a new shared registry for reader-facing components.

Suggested module shape:

- shared component descriptor schema
- browser-side renderer registry
- authoring-side inspector metadata
- optional server-side compatibility helpers

Each registry entry should define:

- `componentKey`
- `displayName`
- `group`
- `description`
- `supportedPageKinds`
- `supportedPrimarySourceTypes`
- `contentBindings`
- `propDefinitions`
- `actionDefinitions`
- `defaultBindings`
- `defaultProps`
- `previewHints`
- `pageOverridePolicy`

Examples of V1 component families:

- typography
  - title
  - subtitle
  - rich text
  - eyebrow
- media
  - image
  - gallery
- taxonomy
  - category chips
  - tag chips
- people
  - author card
- navigation
  - previous/next story
  - breadcrumb
  - related stories
- listings
  - post list
  - category children list
- calls to action
  - button
  - link row

The registry must support two wrapper types:

1. single-component wrappers
- example:
  - title
  - image
  - button

2. composite/template wrappers
- example:
  - author card
  - post card
  - tabs
  - previous/next navigation

This is important because the system is not only wrapping design-library primitives.
It also needs authored templates that assemble multiple design-library parts into one configurable publishing widget.

## B. Extend Block Schema With A Single Component Instance

Each block should be able to host one widget instance.

Recommended persisted shape:

```json
{
  "component": {
    "componentKey": "post-title",
    "variantKey": "default",
    "content": {
      "text": {
        "mode": "dynamic",
        "source": "pageContext",
        "path": "post.title"
      }
    },
    "props": {
      "tag": {
        "mode": "static",
        "value": "h1"
      },
      "align": {
        "mode": "static",
        "value": "left"
      }
    },
    "actions": []
  }
}
```

Important:

- one block, one component instance in V1
- complex block content should use composite wrappers, not nested arbitrary block internals

This keeps the mental model usable.

## C. Define Page Context Contracts

The binding UI must not expose an undefined universe of possible paths.

It should expose a context tree based on the current page kind and source setup.

Examples:

### Post Detail Page

Possible context branches:

- `context.page`
- `context.post`
- `context.author`
- `context.categories`
- `context.tags`
- future derived branches after V1:
  - `context.navigation`
  - `context.related`
  - `context.commentsMeta`

### Category Detail Page

Possible context branches:

- `context.page`
- `context.category`
- `context.breadcrumbs`
- `context.children`
- `context.posts`

### Future Author Detail Page

Possible context branches:

- `context.page`
- `context.author`
- `context.posts`
- `context.categories`

This context tree should be derived from the page contract, not handwritten in each widget.

For V1, the authoritative bindable tree is:

- `context.page`
- `context.post`
- `context.author`
- `context.categories`
- `context.tags`

Category-detail context remains a follow-on expansion, not part of the first delivery slice.

## D. Define Binding Source Modes Explicitly

The system should not treat every value as the same kind of binding.

Recommended source modes:

### 1. Static
- operator types or selects the value directly
- example:
  - button label
  - heading tag
  - tab header text

### 2. Page Context
- value comes from the current page-owned query context
- example:
  - `context.post.title`
  - `context.post.featuredMedia`
  - `context.author.bio`

### 3. Library Reference
- value comes from a library-owned selection flow
- example:
  - media picked from the media library
  - reusable icon or asset later if supported

### 4. Slot Or Listing Context
- value comes from a named listing or nested item context
- example:
  - each item in a declared page-owned listing
  - each tab body record in a tabs widget when that widget introduces item scope

These source modes should be visible in the authoring UI because they imply different controls and validation paths.

## E. Separate Content Binding From Prop Binding

These are related, but they are not the same problem.

### Content Binding

This answers:

- what text, image, list, or record does the component show?

Examples:

- title text
- image source
- tabs headers
- posts list items

### Prop Binding

This answers:

- how does the component behave or appear?

Examples:

- heading tag
- max item count
- image crop mode
- tab style
- button tone

V1 recommendation:

- allow static props broadly
- allow dynamic props only where clearly necessary and safe

Examples of allowed dynamic props in V1:

- `image.altText`
- `link.href`
- `badge.label`

Avoid turning every prop into an expression surface immediately.

## F. Support Mixed Static And Dynamic Components

Some widgets are not purely static and not purely dynamic.

Example: `Tabs`

- tab headers may be manually authored static text
- tab body content may come from dynamic page context

Example authored shape:

```json
{
  "componentKey": "tabs",
  "props": {
    "variant": {
      "mode": "static",
      "value": "underlined"
    }
  },
  "content": {
    "tabs": [
      {
        "header": {
          "mode": "static",
          "value": "Overview"
        },
        "body": {
          "mode": "dynamic",
          "source": "pageContext",
          "path": "post.excerpt"
        }
      },
      {
        "header": {
          "mode": "static",
          "value": "Author"
        },
        "body": {
          "mode": "dynamic",
          "source": "pageContext",
          "path": "author.bio"
        }
      }
    ]
  }
}
```

This mixed model is essential.
If the system only handles fully static or fully dynamic widgets, it will miss many real publishing components.

## G. Add A Bounded Action Model

Some widgets do more than display data.

Examples:

- next story
- previous story
- open category page
- open author page
- open related story
- submit comment
- maybe refresh current slot later

Recommendation:

Represent actions as typed descriptors, not handwritten code.

Example:

```json
{
  "actionKey": "navigate",
  "target": {
    "mode": "dynamic",
    "source": "pageContext",
    "path": "navigation.next.path"
  }
}
```

Or:

```json
{
  "actionKey": "navigateToBoundPage",
  "targetEntity": "category",
  "source": {
    "mode": "dynamic",
    "source": "pageContext",
    "path": "categories.0"
  }
}
```

This action model should not be treated as a direct synonym for `window.actionLayer`.

Instead, the system should introduce a reader action bridge:

- navigation actions:
  - handled by the reader shell/navigation controller
  - use `window.dataLayer` + history state updates
- mutation actions:
  - dispatched through `window.actionLayer`

This matters because same-app reader navigation already behaves differently from true mutations.

## H. Introduce A Compiled Render Contract

Authoring data will be rich and ergonomic.
Deployment data must be efficient and deterministic.

That suggests a compiled seam:

1. authoring layer stores:
  - layout structure
  - component configs
  - binding descriptors

2. deployment preparation compiles that into:
  - runtime-friendly render instructions
  - required slot and query declarations
  - page-context compatibility output

3. deployed reader interprets that contract through the data layer

This avoids shipping heavy authoring metadata when simpler compiled instructions will do.

The compiled contract should also preserve a stable relationship between:

- page-owned slots and listings
- widget binding descriptors
- widget renderer inputs

So the deployed reader is not guessing how to reconcile authored binding with runtime data.

It should also preserve the canonical binding namespace, so compiled widget instructions still target `context.*` even if the underlying runtime payload is assembled from different internal sources.

## Authoring Experience Design

## 1. Layout Builder Must Become A Widget Studio, Not Only A Block Studio

Today the layout canvas is structural.
In V1 of this ticket, each selected block should support:

- choose widget/component
- view default data source
- override content binding
- configure props
- configure actions if the widget supports them
- preview realistic data output on canvas

The operator should not be forced to visit raw JSON for normal configuration.

## 2. Component Selection Must Feel Curated

Do not present a giant undifferentiated list.

Use categories like:

- Text
- Media
- Content
- Navigation
- Taxonomy
- Social
- Utility

Each option should say:

- what it does
- which pages it works on
- what it defaults to

## 3. Data Binding Must Be Guided

The binding experience is one of the hardest parts of this ticket.

Recommendation:

- show the widget field being configured
- show available context tree
- allow click-to-select path
- show preview value when available
- show fallback behavior

Example UX:

- Field: `Text`
- Current source: `Post title`
- Raw path: `context.post.title`
- Preview: `Remote Flow Review Post 01`
- Override button: `Choose Another Source`

This is much better than exposing a raw string input first.

The UI should make the source category obvious:

- `Static Value`
- `Page Context`
- `Media Library`
- `Listing Item`

So the operator understands what kind of decision they are making.

## 4. Common Widgets Must Be One-Click

For common page types, the operator should not start from empty blocks.

Examples:

### Post Page Starter

Suggested default blocks:

- Title
- Subtitle
- Featured Media
- Metadata Row
- Body
- Category Chips
- Author Card
- Previous/Next Navigation
- Comments

Each should already be prebound to the post context.

### Category Page Starter

Suggested default blocks:

- Category Title
- Category Description
- Breadcrumb
- Child Categories
- Post Listing

This is how usability is preserved.

## 5. Page Studio Must Explain Compatibility

When a page chooses a layout, the system should surface:

- which widgets are inside the layout
- whether current page context satisfies their bindings
- which bindings are defaulted
- which bindings are unresolved

This is essential to avoid "looks fine in layout builder, breaks at deployment" failures.

The system should also define exactly when incompatibilities block work:

- layout save:
  - block only invalid widget schema
  - do not block unresolved page-specific bindings because layout may not yet be attached to a page
- page save:
  - allow draft save with warnings
  - surface unresolved required bindings clearly
- preview:
  - block if the selected sample page context cannot satisfy required widget bindings
- publish/deployment:
  - hard block on unresolved required widget bindings

## Runtime And Deployment Design

## 1. Continue To Use `window.dataLayer` As Read Authority

The widget system should not bypass the runtime.

Reader widgets should ask for:

- current route data
- deferred comments
- listings
- navigation
- media by id or ids

Through the runtime query model.

The runtime should still decide:

- inline bootstrap
- IndexedDB
- Cache Storage
- remote Firestore
- optional public service fallback

## 2. Expand Page Context From Existing Page-Bound Slots

The repo already has page-bound slot contracts.
This should be the natural seam for widget binding.

Instead of binding widgets to arbitrary backend endpoints, widgets should bind to:

- the resolved page context
- named slots/listings the page contract declares

This keeps widget authoring aligned with page definitions.

This is also the place to formalize the "page-owned query" idea from the original directive.
Pages already own source selection and data source binding.
The widget builder should consume the resulting context, not reopen backend query design inside the layout editor.

## 3. First Render Must Stay Slim

Only current-route data required for visible widgets should be embedded into HTML.

Do not regress into:

- full posts collection
- full categories collection
- heavy server-composed reader blobs for convenience

Widget configuration should influence what the page considers "first-render required" versus "deferred".

## 4. Defer Expensive Or Secondary Widgets

Not every widget belongs in first paint.

Examples that can be deferred:

- comments list
- related stories
- previous/next navigation if not required immediately
- category post listings on secondary tabs

This suggests a widget-level or region-level hydration priority:

- `initial`
- `deferred`

V1 should likely keep this simple and explicit.

## 5. In-Page Navigation Must Remain JSON-Driven

The recent reader work already moved toward in-page route changes using the data layer.

The widget builder must align with that:

- internal route changes should load the new route data through the runtime
- widget tree re-renders from the new route context
- HTML should not be refetched for same-app navigation

## Suggested Data Model Changes

## Layout Record

Keep:

- `layoutDocument`

Extend block nodes to include:

- `componentInstance`

Potential future extension:

- `renderHints`

## Page Record

Keep:

- page kind
- primary source
- data sources
- layout selection

Evolve:

- move away from long-term dependence on `heroBinding/bodyBinding/supportingBinding`
- preserve them only as compatibility and migration inputs until widget-bound layouts replace them
- introduce a bounded page-level widget override seam for explicitly overrideable fields

Recommended V1 override policy:

- layout owns structure and default widget configuration
- page may override only fields the registry marks as `pageOverrideable`
- dynamic bindings remain layout-owned in V1
- safe page overrides may include:
  - static text overrides
  - static media overrides
  - selected static prop overrides

This keeps reusable layouts practical without opening full per-page widget rewriting immediately.

## New Shared Schemas

Introduce:

- `component descriptor`
- `component prop descriptor`
- `content binding descriptor`
- `action descriptor`
- `compiled widget render contract`
- `page context manifest`

The `page context manifest` should be the inspectable document that answers:

- which named context branches exist for this page
- which fields are safe to bind
- which branches are initial vs deferred
- which branches are declared vs derived
- which widgets can legally consume them

## Migration Strategy

This cannot be a big-bang rewrite.

## Phase 1: Schema And Registry Foundation

Deliver:

- component registry
- block `componentInstance` schema
- content-binding descriptor schema
- prop/action schema foundations

No need to replace live reader rendering yet.

## Phase 2: Authoring UI For A Small Widget Set

Deliver in Layouts:

- pick widget for a block
- configure static props
- choose content source from guided context tree
- preview widget output on canvas

Start with a small set:

- Title
- Rich Text
- Image
- Category Chips
- Author Card

## Phase 3: Page Compatibility And Validation

Deliver in Pages:

- show layout widget inventory
- show unresolved bindings
- validate page/layout/widget compatibility

## Phase 4: Runtime Rendering Bridge

Deliver:

- compiled render contract from page + layout + widget config
- browser renderer that renders those widget instances through the data layer

Initially, support only a subset of widgets/page kinds.

## Phase 5: Replace Hardcoded Reader Sections Gradually

Move the deployed reader from hardcoded page composition to authored widget composition in controlled slices:

- post title/media/body
- taxonomy chips
- author card
- navigation
- comments
- category lists

## Phase 6: Expand Widget Set And Actions

Add:

- listings
- tabs
- richer navigation patterns
- explicit reader actions

## Risks And Failure Modes

### 1. Overexposing Raw Complexity

If the authoring UI exposes too much schema detail, the product will become unusable.

Mitigation:

- defaults
- curated widget families
- guided binding selection
- progressive disclosure

### 2. Stringly-Typed Binding Hell

If bindings are mostly stored as raw text paths, validation and migration will become painful.

Mitigation:

- structured binding descriptors
- validated path picker
- page context manifest generated from the page contract

### 3. Server/Browser Contract Drift

If authoring, deployment, and reader runtime all invent their own render meanings, the system will fracture.

Mitigation:

- one registry
- one compiled render contract
- one runtime read bridge

### 4. Page Kind Compatibility Problems

A widget valid on post pages may be meaningless on category pages.

Mitigation:

- registry-declared compatibility
- page-level validation
- template defaults by page kind

### 5. Free-Form Actions Becoming Unsafe

If actions are too open-ended, the deployed reader becomes a scripting surface.

Mitigation:

- bounded action descriptors
- registry-defined supported actions
- action-layer mapping only

## Open Questions Requiring Deliberate Product Decisions

These should be reviewed before implementation begins.

### 1. Are Widget Configurations Layout-Owned Only In V1?

Recommendation:

- yes for V1
- page can choose the layout, but not arbitrarily override each widget instance yet

Reason:

- reduces combinatorial complexity
- keeps layouts meaningfully reusable

Future possibility:

- page-level overrides for specific safe fields

### 2. Do We Allow Dynamic Props In V1?

Recommendation:

- only for clearly bounded fields
- keep most props static in V1

Reason:

- dynamic content is already the complex problem
- dynamic props can easily double that complexity

### 3. Do We Support Repeating/List Widgets In V1?

Recommendation:

- yes, but in a bounded way
- support list widgets where the registry defines the item renderer

Reason:

- post listings and category lists are core blog needs
- but arbitrary nested repeaters should wait

If repeaters are accepted, they need explicit contracts for:

- item scope root
- item key path
- empty state behavior
- item renderer binding surface

### 4. How Far Do Actions Go In V1?

Recommendation:

- navigation bridge first
- comment submit only where already supported by runtime
- true mutations through action layer only
- no broad action scripting

### 5. Do We Support Composite Template Wrappers In V1?

Recommendation:

- yes
- but only for a small curated set

Initial candidates:

- author card
- post card
- previous/next navigation
- tabs

Reason:

- the directive explicitly calls for both single components and multiple-component templates
- a system limited to primitives alone will not cover real blog assembly needs

### 6. Do Authors And Tags Need First-Class Public Pages Now?

Recommendation:

- not required to start the widget builder
- but the registry/action model should assume those route types may appear later

## Acceptance Criteria

This ticket should be considered successful when the system can demonstrate all of the following:

1. A layout block can host a single widget instance.
2. The operator can choose that widget from a curated component library.
3. The operator can configure static widget props through a typed form.
4. The operator can bind widget content to a guided page context tree.
5. The layout/page combination shows compatibility and unresolved-binding warnings before deployment.
6. The deployed page renders authored widgets through the data layer, not a separate special page-view architecture.
7. First render embeds only the current route data needed for visible initial widgets.
8. Deferred widgets load through the runtime after first paint.
9. In-page internal navigation re-renders the target route using runtime reads without fetching a new HTML document.
10. Common blog page types can be built mostly from defaults without requiring raw JSON editing.
11. Widget binding options are derived from the page-owned query/context manifest, not handwritten per page or guessed in the browser.
12. The system supports both primitive wrappers and a bounded set of composite wrappers in the same registry model.
13. The implementation uses one canonical binding namespace: `context.*`.
14. Validation behavior is explicit across layout save, page save, preview, and deployment.

## Recommended First Delivery Slice

The most pragmatic first delivery should be:

1. Add registry foundation
2. Add block `componentInstance`
3. Support post-detail pages only
4. Support these widgets only:
   - Title
   - Rich Text
   - Image
   - Category Chips
   - Author Card
5. Add guided context binding for those widgets
6. Render that widget subset in deployed pages through the runtime

This slice is large but coherent, and it proves the full architecture without pretending to solve every widget family at once.

## Recommendation

Approve this as a multi-pass architectural program, not a small feature.

This is one of the deepest product/runtime changes in the system so far because it sits at the intersection of:

- layout authoring
- page modeling
- runtime contracts
- deployment rendering
- public reader behavior

The right implementation is not "more fields on blocks."
The right implementation is a typed authored presentation layer that sits cleanly between page context and deployed runtime.

That is the direction this ticket recommends.
