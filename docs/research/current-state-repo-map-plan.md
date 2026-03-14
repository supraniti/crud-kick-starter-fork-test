# Current State Repo Map Plan

## Purpose
- Produce a durable current-state document that explains the repo as it exists today, before future north-star reshaping.
- Keep the document implementation-oriented:
  - where code lives
  - how runtime pieces call each other
  - which operator workflows exist today
  - which capability gaps remain

## Deliverables
1. `docs/research/current-state-repo-map.md`
   - repo structure
   - runtime architecture
   - module-by-module capability map
   - operator workflow catalog
   - remote/GCP flow map
2. `handoff.md`
   - active continuation pointer for future passes
3. `docs/agent-observer-log.md`
   - process notes and documentation-specific lessons

## Coverage Standard
- No semantic filler.
- Every section must answer:
  - what exists
  - where it exists
  - what calls it
  - what data comes in
  - what data goes out
  - how an operator exercises it
- When a capability is only partial, say so directly.

## Planned Passes
1. Pass 1
   - workspace structure
   - runtime entrypoints
   - server/frontend/client-runtime flow maps
   - active module inventory
   - current operator workflows
2. Pass 2
   - expand cross-module data propagation details
   - add exact route/method matrices for module-owned server routes
   - add collection/settings/target-field references where needed
   - status: complete
   - completed in current worktree:
     - server runtime topology
     - frontend shell/runtime topology
     - module-owned route matrix for content/pages/media-manager/remote-ops
     - deeper operator workflow notes for Editorial/Taxonomy/Content/Pages/Layouts/Media Manager/Remote Ops
     - field inventory for active feature modules
3. Pass 3
   - tighten deployment/browser-delivery/public-URL contract details
   - tighten remote/GCP compare/execute/restore procedure maps
   - add exact route payload expectations and response shapes where useful
   - status: complete
   - completed in current worktree:
     - route-level request/response summaries for Content, Pages, Media Manager, and Remote Ops custom APIs
     - deployment call chain mapping
     - remote compare/execute/restore/provisioning call chain mapping
     - browser-delivery HTTPS stack call chain mapping
     - explicit screen/input/action inventory for the major module desks

## Active Constraints
- Keep new documentation under `docs/research/` unless a later contract says otherwise.
- Do not rewrite runtime architecture for the doc; describe what exists now.
- Leave unrelated untracked files untouched:
  - `25344`
  - `3124`
  - `PLACEHOLDER`
