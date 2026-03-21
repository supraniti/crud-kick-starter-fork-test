# Taxonomies Story Implementation Plan

## Goal
Turn Taxonomies into a purpose-built desk where categories feel structural, tags feel lightweight, and remote publication stays visible without dominating the work.

## Current Gaps
- Categories and tags still share a generic CRUD surface.
- The category tree is informative but not operational.
- Tag cleanup is slow and form-heavy.
- Featured images for categories are not visual.
- URL state does not preserve the full desk context.

## Delivery Shape

### 1. Route-backed taxonomy desk
- Add desk route state for:
  - active branch
  - category search/filter/selection/expanded branches
  - tag search/filter/sort/page/selection
  - create/edit drawer state
- Keep refresh behavior stable.

### 2. Categories as structure
- Replace generic category management with a category tree browser.
- Show:
  - hierarchy
  - usage counts
  - visibility
  - featured image state
  - child counts
- Create and edit categories in a drawer.
- Show path preview before save.
- Use a gallery-driven featured image picker with upload support.

### 3. Tags as lightweight cleanup work
- Replace generic tag editing with a fast roster.
- Show:
  - name
  - color
  - visibility
  - usage count
  - last update
- Support:
  - search
  - filter
  - sort
  - pagination
  - bulk delete
  - quick batch creation
- Edit tags in a drawer.

### 4. Keep publication and page impact visible
- Preserve projection readiness.
- Preserve usage visibility across posts and pages.
- Preserve direct category output links.
- Keep publication as a dedicated tab rather than burying it inside the main authoring flows.

## Implementation Notes
- Reuse the existing taxonomy handlers and validation rules.
- Reuse embedded remote ops support and taxonomy usage awareness.
- Reuse page output resolution for category page links.
- Keep the product shell and module route mounted on the same desk component.

## Review Standard
- Categories and tags must no longer feel like the same tool.
- Refresh must preserve meaningful desk context.
- Featured category media must be visual.
- The desk must remain compatible with existing taxonomy publication and usage flows.
