# Posts Story Implementation Plan

## Status
- Delivered in the worktree.
- Not committed.
- This is now a completed implementation plan plus execution record for the current Posts story slice.

## Goal
Turn `Posts` into a real editorial workspace.

The desk should let an operator:
- scan a strong editorial roster
- open one post without losing list context
- write in a calm composition surface
- manage structure, media, and SEO without leaving the writing flow
- understand saved, published, and live state without guesswork

## Implemented Shape
### 1. Editorial backlog on the page
- full-width roster table stays on the page
- the backlog is the first thing the operator sees
- row data is editorial-first:
  - story
  - author
  - status
  - page
  - live posture
  - updated time
- row actions include:
  - open page
  - open live URL when available
- filters and pagination live in the URL:
  - search
  - status
  - author
  - category
  - tag
  - needs-attention
  - live state
  - sort
  - page

### 2. Single-post work in a drawer
- clicking a row opens a right-side drawer instead of stacking the editor on the page
- the drawer keeps six focused tabs:
  - `Story`
  - `Organize`
  - `Media`
  - `SEO`
  - `Publish`
  - `Revisions`
- create flow uses the same drawer via `New Post`

### 3. Writing-first authoring surface
- title, subtitle, excerpt, and body stay together in the main writing surface
- support controls stay in the right rail and change by tab
- story view keeps only what supports writing immediately:
  - save
  - publish / submit for review when relevant
  - saved / CMS / live posture
  - live URL

### 4. Publication context inside the drawer
- publication no longer competes with the backlog on the page
- the `Publish` tab explains:
  - where the story stands
  - what still needs attention
  - which pages can show it
  - whether reader data sync is current
- language was simplified away from module jargon where possible

## Key Files
- [BlogContentView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentView.jsx)
- [BlogContentPanels.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentPanels.jsx)
- [BlogContentEditorPanel.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentEditorPanel.jsx)
- [BlogContentAuthoringReadinessPanel.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentAuthoringReadinessPanel.jsx)
- [BlogContentDeploymentImpactPanel.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentDeploymentImpactPanel.jsx)
- [BlogContentRemoteProjectionPanel.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentRemoteProjectionPanel.jsx)
- [blog-content-desk-model.js](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/blog-content-desk-model.js)
- [blog-content.integration.test.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/frontend/src/tests/app-integration/blog-content.integration.test.jsx)

## Proof Artifacts
- Current-state research screenshot:
  - `C:\Users\cmsin\2026\crud-kick-starter-fork-test\.codex-runtime\posts-desk-current.png`
- Final-state screenshot:
  - `C:\Users\cmsin\2026\crud-kick-starter-fork-test\.codex-runtime\posts-desk-final.png`
- Final-state snapshot:
  - `C:\Users\cmsin\2026\crud-kick-starter-fork-test\.codex-runtime\posts-desk-final.snapshot.txt`

## Verification Counted
- `pnpm --filter frontend build`
- `pnpm quality:protocol`
- `pnpm review:env:start`
- `pnpm review:env:verify`
- live browser walkthrough on:
  - `http://localhost:3000/app/posts`
  - open published story row
  - inspect `Story` and `Publish` tabs
  - open `New Post` drawer

## Important Boundary
- focused Posts Vitest is still unreliable in this environment and hit the known timeout/hang boundary even after the test file was realigned
- I did not count that path as proof
- the honest proof for this slice is:
  - build
  - review env verify
  - live browser inspection
