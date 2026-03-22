# Pages Story Implementation Plan

## Goal
- Rebuild `Pages` into a page-promise desk instead of a stacked systems form.
- Make the operator understand:
  - what kind of page they are making
  - how many outputs it will create
  - what those outputs look like
  - whether they are already live

## Product Shape
- backlog-first roster on the main page
- one `New Page` entry point from the backlog
- right-side page studio for one page at a time
- separate create flow inside the drawer:
  - `Page Type`
  - `Basics`
- calmer edit tabs for existing pages:
  - `Basics`
  - `Preview`
  - `Live`
  - `More`

## Implementation Rules
- keep the existing page persistence, preview, deployment, and runtime contract mechanics
- rewrite the desk composition, not the underlying page engine
- keep redirects as a secondary route tab
- creation and editing are not the same experience:
  - page type belongs to creation
  - live posture belongs to existing pages
- use product language:
  - `page type`
  - `output promise`
  - `public pattern`
  - `live`
  - `needs attention`

## Deliverables
- route-backed pages toolbar state
- editorial/page roster table
- staged create drawer
- basics-first edit drawer
- clearer live/output status and live-link surface:
  - backlog `Open Live` links when a real public example is available
  - drawer `Open Live URL` action in the live tab
- clean route teardown back to `/app/pages` when the drawer closes
- advanced controls demoted behind `More`

## Validation
- `pnpm --filter frontend build`
- `pnpm quality:protocol`
- `pnpm review:env:verify`
- focused Pages integration proof when the environment allows it
