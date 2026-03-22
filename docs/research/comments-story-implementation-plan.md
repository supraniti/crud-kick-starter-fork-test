# Comments Story Implementation Plan

## Story Bar
- The page must feel like a moderation queue.
- The moderator should scan, filter, sort, paginate, and bulk-act from the main page.
- A selected comment should open a contextual workbench, not another pile of cards.
- The workbench should separate:
  - comment and post context
  - moderation decision
  - lifecycle/history
- Refresh must preserve queue state and the selected comment through the URL.

## Current Problems
- The live route is overloaded with readiness, compliance, and remote-contract cards before the actual queue.
- The queue is a stack of comment cards instead of a strong moderation table.
- The selected comment details compete with thread and system cards in one long column.
- The broader signals exist, but they crowd the page instead of supporting moderation.

## Implementation Shape
1. Route-backed desk state
- search
- status
- post
- moderator
- sort
- page
- selected comment
- active drawer tab

2. Queue-first page
- compact queue health and discussion hotspots
- search/filter/sort controls
- moderation table
- bulk actions

3. Right-side moderator drawer
- `Context`
- `Moderate`
- `History`

4. Safe actions
- single comment approve/reject/spam
- bulk approve/reject/spam
- visible success/error feedback

## Acceptance Bar
- A moderator can open `/app/comments`, narrow the queue, refresh, and keep the same view.
- The page reads like moderation work, not runtime plumbing.
- A selected comment shows enough context to make a real moderation decision.
- Different drawer tabs do different jobs.
