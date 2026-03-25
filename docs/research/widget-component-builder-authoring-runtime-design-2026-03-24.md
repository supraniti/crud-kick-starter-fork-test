# Widget/Component Builder Authoring And Runtime Design

Date: 2026-03-24
Status: Proposed

## Purpose

This document translates the high-level ticket into the actual contracts that authoring, deployment, and the deployed reader should share.

It exists to prevent a common failure mode:

- a good product idea
- loose implementation
- incompatible authoring/runtime assumptions

## System Model

The future system should be understood as five layers:

1. Page definition
- what route this page represents
- what data it owns

2. Page context manifest
- what resolved data branches are available to authored widgets

3. Layout structure
- where blocks live and how they are arranged

4. Widget instances
- what each block renders and how it is configured

5. Deployed runtime
- how the live page retrieves data and executes actions

## 1. Page Definition

The page remains the owner of query intent.

This is critical.
The layout builder must not become a second query builder.

The page already owns:

- primary source
- additional data sources
- per-record vs single-page behavior
- layout choice

The widget system should consume the result of page definition, not redefine it.

## 2. Page Context Manifest

This is the new synchronization contract.

The page context manifest should answer:

- which context branches exist for this page
- which fields are bindable
- which branches are initial vs deferred
- which branches are single records vs collections
- which branches are declared vs derived
- which widget families can consume them

### Canonical Binding Namespace

The system should use one canonical binding namespace:

- `context.*`

This is the binding language visible to:

- authoring UI
- stored binding descriptors
- compiled widget contract

Current internal sources such as:

- `application.model.*`
- raw delivery `data.*`

should be treated as internal assembly layers and compiled into the canonical `context.*` namespace.

### Example: Post Detail Manifest

```json
{
  "pageKind": "content-detail",
  "primarySourceType": "blog-post",
  "branches": [
    {
      "path": "context.post",
      "kind": "record",
      "initial": true,
      "provenance": "declared",
      "bindable": true
    },
    {
      "path": "context.author",
      "kind": "record",
      "initial": true,
      "provenance": "declared",
      "bindable": true
    },
    {
      "path": "context.categories",
      "kind": "collection",
      "initial": true,
      "provenance": "declared",
      "bindable": true
    },
    {
      "path": "context.tags",
      "kind": "collection",
      "initial": true,
      "provenance": "declared",
      "bindable": true
    },
    {
      "path": "context.navigation",
      "kind": "record",
      "initial": false,
      "provenance": "derived",
      "bindable": false
    },
    {
      "path": "context.comments",
      "kind": "collection",
      "initial": false,
      "provenance": "derived",
      "bindable": false
    }
  ]
}
```

### Why This Matters

Without this manifest:

- binding UI guesses
- deployment guesses
- runtime guesses

With it:

- authoring is guided
- deployment can validate
- runtime can resolve predictably

### V1 Binding Rule

In V1, widgets may bind only to manifest branches that are:

- `provenance: declared`
- `bindable: true`

Derived runtime branches can appear in the manifest for transparency, but they should not become general-purpose widget binding inputs until their contracts are formalized.

## 3. Component Registry Model

Each widget should come from a typed registry.

### Descriptor Shape

```json
{
  "componentKey": "post-title",
  "displayName": "Post Title",
  "group": "Text",
  "wrapperKind": "primitive",
  "supportedPageKinds": ["content-detail"],
  "supportedPrimarySourceTypes": ["blog-post"],
  "contentBindings": {
    "text": {
      "valueKind": "text",
      "required": true,
      "allowedSources": ["static", "pageContext"]
    }
  },
  "propDefinitions": {
    "tag": {
      "valueKind": "enum",
      "options": ["h1", "h2", "h3"],
      "defaultValue": "h1"
    }
  },
  "actionDefinitions": {},
  "defaultBindings": {
    "text": {
      "mode": "dynamic",
      "source": "pageContext",
      "path": "post.title"
    }
  }
}
```

### Wrapper Kinds

The registry must support:

1. `primitive`
- wrapper around one design-library component

2. `composite`
- wrapper around a small authored assembly of multiple design-library pieces

Examples of composite wrappers:

- author card
- post card
- previous/next navigation
- tabs

## 4. Component Instance Model

Each block hosts one instance.

### Suggested Shape

```json
{
  "componentKey": "tabs",
  "variantKey": "default",
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
  },
  "props": {
    "variant": {
      "mode": "static",
      "value": "underlined"
    }
  },
  "actions": []
}
```

This model covers:

- static content
- dynamic content
- mixed-content widgets
- typed props
- bounded actions

### Layout Defaults And Page Overrides

The system should not force a false choice between:

- fully layout-owned widget state
- fully page-owned widget state

Recommended model:

- layout owns:
  - structure
  - default widget instances
  - default bindings
  - default props
- page may own bounded overrides for fields the registry marks as overrideable

Examples of safe page-level overrides:

- static text override
- static media override
- selected static prop override

Dynamic bindings should stay layout-owned in V1 to keep the model coherent.

## 5. Binding Source Modes

Not every value should be edited in the same way.

### Static

User types or selects the value directly.

Examples:

- title text override
- heading tag
- tabs header labels

### Page Context

User selects from the page context manifest.

Examples:

- `context.post.title`
- `context.post.featuredMedia`
- `context.author.bio`

### Media Library

User opens the media picker and chooses an asset.

Examples:

- static image widget
- default fallback image

### Listing Item Context

Used inside list-like or repeated widgets.

Examples:

- each related post card
- each category child tile
- each tab body record if a tabs widget later supports repeated dynamic tabs

For repeating widgets, item-scope should still stay inside the canonical binding namespace:

- `context.item`
- `context.index`

## 6. Prop Model

Props should remain typed and constrained.

### Allowed prop value kinds

- text
- rich text
- number
- boolean
- enum
- media reference
- route reference

### Dynamic props

Dynamic props should be allowed only when the component definition explicitly opts in.

Examples that may be safe:

- image alt text
- link href
- button visibility label

Examples that should not become dynamic too early:

- complex style objects
- arbitrary spacing maps
- nested layout props

## 7. Action Model

Actions should be typed descriptors that map to the deployed action layer.

### V1 action families

- navigate
- navigate to previous/next post through the reader navigation bridge
- navigate to first category
- open author page when author pages exist
- mutate through action layer only when a true mutation exists

### Suggested action descriptor

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

### Why Typed Actions Matter

If actions become free-form expressions or scripts, the reader runtime becomes unsafe and impossible to reason about.

### Navigation Bridge

The runtime needs an explicit bridge between widget actions and actual route changes.

Recommendation:

- navigation actions are handled by a reader navigation bridge
- that bridge:
  - resolves target route data through `window.dataLayer`
  - updates history state
  - triggers widget tree re-render
- `window.actionLayer` remains for true mutations and bounded side effects

This keeps navigation honest to the current runtime reality instead of pretending every action is already an action-layer dispatch.

## 8. Authoring UX Model

### Block Inspector Flow

When the user selects a block:

1. see whether the block already has a widget
2. choose or replace the widget
3. see what the widget is for
4. see what it defaults to
5. configure content
6. configure props
7. configure actions if supported
8. preview realistic output

### Content Binding Picker

The binding picker should show:

- field being configured
- source mode tabs:
  - `Static`
  - `Page Context`
  - `Media Library`
- context tree when relevant
- preview value when relevant
- fallback value when relevant

The normal path should be click-driven.
Raw path editing can exist only as an advanced escape hatch if needed.

## 9. Deployment Compilation

Authoring data should compile into a lighter runtime contract.

### Authoring contract contains

- layout structure
- widget instance data
- binding descriptors
- prop values
- action descriptors

### Runtime contract contains

- current route render instructions
- required context branches
- initial vs deferred widget hints
- minimal data needed for first render
- enough metadata to re-render on route change
- provenance and bindability metadata where needed for review/debug

The runtime contract should not ship editor-only labels or field metadata.

## 10. Deployed Reader Flow

### First load

1. HTML loads
2. runtime boots
3. widget renderer receives:
  - compiled widget contract
  - initial page context
4. initial widgets render
5. deferred widgets ask the data layer for secondary data

### Same-app navigation

1. user clicks internal route link
2. reader action navigates in-app
3. reader navigation bridge resolves new route context
4. widget renderer receives new route context
5. widget tree re-renders
6. deferred widgets refresh for the new route

No new HTML document is required for same-app transitions.

## 11. Default Sets

To keep usability high, page starters should come with widget defaults.

### Post page default set

- title
- subtitle
- featured image
- metadata row
- rich text body
- category chips
- author card
- previous/next navigation
- comments

### Category page default set

- breadcrumb
- category title
- category description
- child categories
- post listing

These defaults should be registry-backed, not special-case hardcoding in the layout UI.

These full default sets are the north-star page assemblies, not the required V1 delivery set.

## 12. Initial Widget Set Recommendation

V1 should start with:

- title
- rich text
- image
- category chips
- author card

V1.5 can add:

- post card
- breadcrumb
- previous/next navigation
- tabs
- category-detail widgets

## 12A. Repeater And Composite Contract

Before list-like and composite widgets expand, the system should define:

- `collectionSource`
- `itemScopeRoot`
  - recommended: `context.item`
- `itemKeyPath`
- `emptyState`
- `itemRendererKey` or equivalent bounded renderer selection

Without this, list widgets will become inconsistent across:

- posts
- children
- related content
- tabs with repeated records

## 13. Review Checklist Before Implementation

The implementation team should confirm these before coding:

1. Page context manifest is the only dynamic binding surface
2. One block hosts one widget instance in V1
3. Primitive and composite wrappers share one registry shape
4. Deployed reader remains data/action-layer driven
5. Navigation has an explicit reader bridge
6. Authoring defaults are part of the design, not an afterthought
