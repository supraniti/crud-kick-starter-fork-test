# Deployed Page Application Script Plan

Date: 2026-03-22

## Purpose

Plan the application-layer script that is injected into deployed pages in addition to the existing:

- data layer client runtime
- action layer client runtime

This script is the actual reader-facing application shell.

The data layer and action layer stay generic.
The application script turns the delivered JSON into a real page.

## Target Outcome

A deployed page should no longer feel like:

- HTML shell
- raw payload
- runtime contract

It should feel like a real site page that can:

- render the story
- render the layout regions
- render media
- render taxonomy and author context
- move between adjacent pages
- load comments
- submit comments
- progressively refresh content through the runtime

## Design Principles

1. The application script is replaceable.
- it is one application implementation on top of a stable runtime API

2. The data layer remains the source of read truth.
- local-first when appropriate
- remote when necessary

3. The action layer remains the source of mutation truth.
- comment submission
- local install/sync
- later reader interactions

4. The application script should render from delivered JSON first.
- no blocking remote fetch is required just to paint the page

5. Remote reads enrich, not unblock, the base page.

## Runtime Inputs The Script Should Consume

1. page payload JSON
- page summary
- head model
- render model
- resolved primary record
- supporting datasets

2. client runtime contract
- queries
- datasets
- actions

3. delivery context
- canonical URL
- media base
- public route context

## Core Features

## 1. Reader-Facing Content Rendering

The script should render:

- page title
- post title
- subtitle
- excerpt
- body
- featured image
- gallery media
- author name and avatar
- category chips/links
- tag chips/links
- published date and update date

This must be rendered from the delivered JSON immediately.

## 2. Layout-Aware Region Rendering

The script should read the delivered layout model and map content into named regions.

At minimum:

- main story area
- supporting column
- media area
- metadata band

The layout JSON should be visible in a controlled debug mode, not as the default reader experience.

## 3. Reader Navigation

For a post page:

- previous post
- next post
- author page
- primary category page
- breadcrumb to parent category when available

For a category page:

- parent category
- child categories
- posts in this category
- return to top-level category landing when relevant

For an author page:

- author bio
- author avatar
- authored posts list
- links back to categories represented in those posts

## 4. Comments Experience

The application script should:

- load comments for the current post
- show comment count
- render the comment list
- render comment status messaging if moderation is enabled
- submit new comments through the action layer
- refresh the comment list after submit

Nice extension:

- optimistic pending insert with explicit “awaiting moderation” label

## 5. Local Reader Data Features

Use the data layer to make the page feel alive:

- install the delivered document into IndexedDB
- allow local-first re-read
- allow explicit refresh from remote
- show last synced timestamp in debug mode

This gives the runtime real value beyond static HTML.

## 6. Related Content

The script should render:

- related posts by shared category
- related posts by shared tags
- more from this author

These can begin as simple runtime queries against the published datasets.

## 7. Media Presentation

The script should:

- render responsive featured media
- render gallery media as a strip or lightbox-ready list
- prefer resolved public media URLs
- gracefully handle missing media

## 8. SEO And Social Confidence

The application script should not own the meta tags, but it should expose a debug inspector in non-reader mode that shows:

- current title
- current description
- OG title
- OG description
- canonical URL
- page id
- layout id

This is useful for operational review without turning the page into a raw payload dump.

## Application Surfaces

## A. Reader Mode

Default.

Shows:

- polished content page
- navigation
- media
- comments

Does not show:

- raw JSON
- runtime query details
- dataset internals

## B. Review Mode

Enabled by query param or config flag.

Shows:

- small inspector panel
- page id
- layout id
- data freshness
- direct links to payload sections
- runtime actions like refresh/install

This replaces the current rough tester feeling with something more product-complete.

## C. Debug Mode

Strictly for development and deep investigation.

Shows:

- layout JSON
- rendered payload JSON
- runtime datasets
- executed query results

This should stay hidden from normal operators and readers.

## Suggested Phases

## Phase 1. Reader Shell

Deliver:

- story rendering
- media rendering
- author/taxonomy chips
- basic layout slotting

## Phase 2. Navigation

Deliver:

- previous/next post
- author page links
- category navigation

## Phase 3. Comments

Deliver:

- comment list
- submit form
- post-submit refresh

## Phase 4. Related Content

Deliver:

- more from author
- related by tag/category

## Phase 5. Review Overlay

Deliver:

- review inspector
- refresh/install actions
- payload/debug links

## Needed Contracts

Before implementation, confirm the delivered payload can provide or derive:

1. adjacent-post navigation inputs
2. author page path inputs
3. category page path inputs
4. comment query inputs
5. related-content query inputs

If those are missing, extend the payload contract first instead of teaching the application script to guess.

## Completion Bar

The deployment should be considered complete when a remote reader can open a post page and experience:

1. a real rendered page
2. visible author and taxonomy context
3. working next/previous navigation
4. working category and author routes
5. visible comments and comment submission
6. related content
7. optional review overlay for operators

At that point, the injected application script has turned the deployment from a proof shell into a usable site surface.
