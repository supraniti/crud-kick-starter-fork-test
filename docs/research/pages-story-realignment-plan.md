# Pages Story Realignment Plan

## Why The Current Pass Stops Here
The current `Pages` rewrite moved the desk in the right direction, but it still does not satisfy the intended product story.

The main miss is that the editor window is still too broad and too system-shaped.

The next pass should narrow the side window into a true page studio.

## Product Goal
Make `Pages` feel like:
- a clean backlog of page promises
- plus a focused side editor for one page at a time

The operator should be able to:
1. scan the backlog
2. create or open one page
3. edit that page in a calm side window
4. preview a real output
5. understand whether it is live
6. close the editor and return to the exact same backlog view

## Correct Product Shape

### 1. Pages Backlog
Purpose:
- manage many pages at once

Jobs:
- show only the most useful columns
- preserve search/filter/sort/page state in the URL
- make `New Page` feel simple
- provide direct open actions
- provide direct public-link actions when available

The backlog should stay readable when the editor is closed.

### 2. Page Studio Drawer
Purpose:
- edit one page in a focused side window

The drawer should become clearly staged.

Recommended tabs:
- `Basics`
- `Preview`
- `Live`
- `More`

Reasoning:
- `Basics`:
  - page type summary
  - title
  - layout
  - public pattern
  - source
- `Preview`:
  - sample record selector
  - output forecast
  - rendered/public example links
- `Live`:
  - current live posture
  - local artifact
  - public output links
  - release blockers
- `More`:
  - SEO
  - advanced sources
  - remote overrides
  - runtime contract

This gives each tab a stronger job and keeps advanced material out of the main editing rhythm.

## Specific Changes To Make

### Pass A - Backlog Simplification
- reduce roster columns to the ones a publisher actually needs
- move any secondary details into subtext inside the main cells instead of new columns
- tighten row actions:
  - `Open`
  - `Open Live`
  - optional source/layout jump inside the drawer, not in the roster
- collapse the summary cards if they compete too much with the table at common viewport sizes

### Pass B - Drawer Realignment
- replace `Promise / Output / Structure / Advanced` with the clearer drawer model
- make `Basics` the default tab
- show a short fixed summary bar at the top of the drawer:
  - page type
  - live posture
  - output count
  - public pattern
- hide page-type chooser for existing pages
- keep type selection only in the new-page flow

### Pass C - New Page Flow
- introduce a dedicated create state inside the drawer
- first screen in create mode:
  - choose page type
- second step:
  - choose source/layout/path basics
- save
- then land the user in the normal page studio tabs

This avoids reusing the existing-page editor as a creation wizard.

### Pass D - Live And Preview Clarity
- make sample preview selection obvious
- show one real example URL prominently
- show one local artifact path prominently
- show one clear next action when the page is not live
- keep remote/delivery mechanics as support information, not the core story

### Pass E - Cleanup
- review every field in the drawer and remove or demote anything that does not serve:
  - page definition
  - preview
  - live understanding
- ensure the page behind the drawer does not visually compete too much while editing

## Non-Goals
- no rewrite of the underlying page engine
- no rewrite of redirects
- no rewrite of page persistence or preview generation
- no adding more tabs or more panels just because the data exists

## Validation Standard
The next Pages pass should be judged by live browser use first.

Minimum review flow:
1. open `Pages`
2. understand the backlog quickly
3. create a new page from the backlog
4. land in a calm editor drawer
5. set page basics without feeling like a system operator
6. preview a real example
7. understand whether the page is live
8. close the drawer and return to the exact same backlog state

If the route still feels like table + forms + system controls all fighting for attention, the pass is not done.
