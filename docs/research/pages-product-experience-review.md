# Pages Product Experience Review

## Why This Review Exists
The current `Pages` pass is an improvement over the old stacked module surface, but it is still not aligned with the intended desk behavior.

The key issue is not styling.

The key issue is that the edit flow still feels like a broad systems workbench instead of a focused page editor that opens from a clean backlog.

## Research Basis
- live browser review on:
  - `http://localhost:3000/app/pages`
  - `http://localhost:3000/app/pages?pageId=blogpage-014&pageWorkbenchTab=promise`
- current page screenshot:
  - `C:\Users\cmsin\2026\crud-kick-starter-fork-test\.codex-runtime\pages-desk-review-current.png`
- current code:
  - [BlogDistributionView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionView.jsx)
  - [BlogDistributionPageEditorSections.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionPageEditorSections.jsx)
  - [BlogDistributionPageFlowSections.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-pages/frontend/BlogDistributionPageFlowSections.jsx)
- target story:
  - [07-pages.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/product-stories/07-pages.md)

## What The Current Desk Gets Right
- the route starts from a backlog instead of a long form
- page type and output count are visible
- live vs stale posture is visible
- redirects are no longer mixed into the main page backlog
- the editor is technically in a side window, not inline on the page body

## What Still Feels Wrong

### 1. The editor window is still too broad
The side window is carrying too many different kinds of work at once:
- creation
- page type selection
- source selection
- output inspection
- layout decisions
- SEO
- advanced bindings

This makes the whole editor feel like a general page-control panel instead of a calm page-editing flow.

### 2. The tabs are not different enough in purpose
The current tabs are:
- `Promise`
- `Preview`
- `Output`
- `Structure`
- `Advanced`

They sound different, but they do not create a clean mental model for the operator.

The user still has to inspect too much before understanding:
- what this page is
- what it will generate
- what they are supposed to edit here
- when they should care about delivery details

### 3. Page type selection is in the wrong place for existing pages
Inside the open editor, the operator sees the big `Page Type` chooser again.

That makes sense when creating a page.
It is noise when editing an existing page.

For an existing page, the user wants:
- a clear summary of what this page already is
- the fields that matter for improving it
- a few safe actions

They do not want to feel like they are re-answering the original creation question every time they open the drawer.

### 4. The desk still exposes too much system thinking
Even after the rewrite, the editing flow still leans too much on:
- deployment mode
- source type
- path patterns
- remote bindings
- module defaults

Those things exist, but they should not dominate the editing window.

The story says the user wants to:
- decide what kind of page this is
- choose the layout
- set the public pattern
- preview a real example
- understand if it is live

The current flow still asks the user to think too much like a system operator.

### 5. Creation is not focused enough
The main page currently has three create buttons:
- `New Standalone`
- `New Post Template`
- `New Category Template`

That part is good.

But once creation starts, the editor still opens with a broad promise screen rather than a clearly staged creation flow.

It should feel more like:
1. choose the page type
2. choose source/layout/path basics
3. save the page
4. then refine preview/SEO/output

### 6. Backlog and editor are still competing for attention
The page underneath remains visually busy while the editor is open.

That makes the route feel like:
- backlog
- summary cards
- toolbar
- table
- plus a heavy editor

all at once.

Technically this is a sidebar flow.
Product-wise it still feels crowded.

## What The User Should Feel Instead
When the user is on the backlog:
- they are scanning page promises
- they are choosing which page to open
- they are not already editing

When the user opens a page:
- the editor becomes the primary context
- it should feel like a focused page studio
- each tab should answer a different question clearly

## Correct Direction
The desk should become two cleaner experiences:

### 1. Pages Backlog
Purpose:
- manage many page promises

It should do these jobs:
- scan page promises
- filter/sort/paginate
- create a new page quickly
- show live/stale/missing posture
- jump to the public output when available

### 2. Page Studio
Purpose:
- edit one page calmly in a side window

It should do these jobs:
- make identity/layout/path/source obvious
- preview a real output example
- explain live output state
- keep advanced delivery/runtime material secondary

## Bottom Line
The current pass is structurally better than the old desk, but it is not yet at the story bar.

The next pass should not be a tweak pass.

It should be a realignment pass that narrows the editor, gives each tab a stronger job, and makes the side window feel like a focused page studio instead of a compact control center.
