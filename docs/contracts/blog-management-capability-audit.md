# Blog Management Capability Audit

## Metadata
- Date: `2026-03-08`
- Ticket: `C:\Users\cmsin\OneDrive\שולחן העבודה\blog-management-modules-agent-ticket.md`
- Status: `implementation-ready`

## Existing Capabilities Confirmed

### Shared Collection Field Support
- Native/shared field support already exists for:
  - `text`
  - `number`
  - `boolean`
  - `enum`
  - `enum-multi`
  - `reference`
  - `reference-multi`
  - `url`
  - `date`
  - `structured-object`
  - `structured-object-array`
- Evidence:
  - `frontend/src/runtime/shared-capability-kernel/collection-field-type-plugin-registry.mjs`
  - `server/src/core/shared/capability-contracts/local-kernel/collection-field-type-plugin-registry.mjs`
  - baseline module manifests in `modules/test-modules-*`

### Module-Owned Extension Seams
- Custom module route views are supported through `ui.routeView.kind=custom` with frontend entrypoints.
- Module-owned HTTP routes are supported through `runtime.routes`.
- Module-owned missions are supported through `runtime.missions`.
- Module-owned field type plugin registration is supported through `server/field-type-plugins.mjs`.

### Reference And Hierarchy Support
- Self-reference is already viable through `reference` fields pointing at the same collection.
- Conditional reference options and visibility are already supported through `referenceUi.optionsFilter` and `referenceUi.visibleWhen`.
- Inline create for references is already supported.
- This is sufficient for:
  - category parent selection
  - author/tag/category/media cross-links
  - guided editorial forms

## Real Gaps

### Gap 1: No Built-In `date-time` Field Type
- Current shared registry exposes `date`, not `date-time`.
- Blog requirements use timestamp-style fields widely:
  - `createdOn`
  - `updatedOn`
  - `lastPublishedOn`
  - `scheduledOn`
  - `publishedOn`
  - `archivedOn`
  - `changedOn`
  - `approvedOn`
- Initial delivery choice:
  - store timestamp values as ISO strings in module-owned data
  - render/edit them through module-owned custom views first
- Escalation threshold:
  - if module-owned timestamp handling becomes repetitive across two slices or blocks required filtering/editing UX, introduce one neutral shared `date-time` field type plugin as a controlled Level 3 extraction

### Gap 2: No Built-In Rich Text Editor Primitive
- There is no shared rich-text editor/runtime primitive in the current repo.
- Initial delivery choice:
  - keep `blog-posts.body` as sanitized HTML text
  - implement the editor in the module-owned content view
- Core impact:
  - none required initially

### Gap 3: No Built-In Revision Compare/Restore UI
- Revision support must be delivered as a module-owned workflow.
- Initial delivery choice:
  - implement revision timeline, snapshot comparison, and restore actions inside `test-modules-content`
- Core impact:
  - none required initially

### Gap 4: No Built-In Hierarchy Tree Manager UI
- Self-reference exists, but hierarchy visualization/management is not a generic shared surface.
- Initial delivery choice:
  - implement category tree management as a module-owned custom route view in `test-modules-taxonomy`
- Core impact:
  - none required initially

## Capability Mapping By Ticket Area

| Ticket Area | Existing Support | Initial Delivery Choice |
| --- | --- | --- |
| authors | generic collections + references + custom views | module-local editorial UI |
| posts | generic collections + references + custom views | module-local editor UI |
| revisions | generic collections + custom views | module-local revision timeline/restore |
| tags | generic collections | standard CRUD + module-local polish |
| categories hierarchy | self-reference + conditional reference UI | module-local tree manager |
| comments moderation | generic collections + custom views | module-local moderation queue |
| page/publication records | generic collections + references + custom views | introduce `blog-pages` in `test-modules-pages` with T01 compatibility mirroring from content |
| redirect rules | generic collections + `url` type | collection CRUD + module-local overview |
| SEO/social fields | `text`, `url`, `reference`, `structured-object` available | move toward `blog-pages` ownership while preserving T01-compatible post editing |
| scheduling | custom views + actions/missions available | coordinate through module-local pages/content actions with transitional mirrors |
| media integration | existing `media-items` collection | reference only; no media reimplementation |

## Approved Initial Delivery Posture
1. Start with module manifests, collections, and custom route views.
2. Keep workflow logic inside the owning module unless reuse is proven twice.
3. Avoid any new shared `blog` domain under `server/src/domains/reference/`.
4. Treat `date-time` as the only likely future shared primitive candidate, and only after a concrete slice proves the need.

