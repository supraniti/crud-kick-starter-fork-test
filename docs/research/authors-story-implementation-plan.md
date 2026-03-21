# Authors Story Implementation Plan

## Goal
- Turn `Authors` from a generic collection workspace with extra cards into a real author-roster desk.
- Keep the list and the editing context together.
- Preserve the user’s exact table state in the URL.

## Target User Outcome
- The user lands on `Authors` and immediately sees:
  - a purposeful roster table
  - meaningful author signals instead of raw fields
  - one-click paths to related posts
  - a calm side drawer for editing
  - a visual avatar picker that can also upload a new image

## Problems In Current State
- The desk is still anchored by `CollectionsView`, so it looks like generic CRUD with editorial cards around it.
- The list is not a bespoke author table.
- The edit flow is not a dedicated drawer.
- Avatar selection is not a gallery interaction.
- Route state does not preserve the author desk view in a way that matches the story.
- The backend enforces slug/email conflicts, but not duplicate display-name conflicts.

## This Pass

### 1. Replace The Generic Roster Surface
- Keep the current author data source.
- Replace `CollectionsView` on the product `Authors` route with:
  - a custom filter/sort toolbar
  - a custom roster table
  - bulk selection and bulk delete

### 2. Preserve View State In The URL
- Persist in route/query state:
  - search
  - role
  - status
  - locale
  - sort
  - page
  - selected author or create mode
- Refreshing the page should preserve the current author view.

### 3. Add A Real Author Drawer
- Row click opens an author drawer.
- The list stays visible behind it.
- The drawer owns:
  - display name
  - legal name
  - bio
  - email
  - website
  - social links
  - role
  - status
  - locale
  - expertise tags
  - avatar

### 4. Add A Visual Avatar Picker
- Replace raw avatar reference selection with:
  - gallery preview
  - choose existing image
  - upload a new image from the same drawer

### 5. Expose Linked Post Signals
- Every author row should show:
  - total posts
  - published posts
  - draft or non-published posts
  - profile gaps such as missing avatar or missing bio
- Clicking the post signal should open `Posts` already narrowed to that author.

### 6. Tighten Validation
- Add backend conflict for duplicate display names.
- Add client-side validation for:
  - required name
  - duplicate name
  - invalid email
  - invalid website URL
- Saving should be blocked when the custom form is clearly invalid.

## Proof Standard
- Product route:
  - `/app/authors`
- Focused proofs:
  - product editorial integration
  - editorial/taxonomy module conformance
- Manual review should confirm:
  - URL-backed filter/sort/page state
  - row click opens drawer
  - create opens drawer
  - avatar gallery appears
  - upload from drawer works locally
  - post count opens `Posts` filtered to that author

## Out Of Scope For This Pass
- Full server-side sorting/pagination for very large author sets
- Multi-author relationship editing inside the posts desk
- Advanced delete impact modal beyond the current conflict/error posture

## Review Stop
- Stop with code uncommitted.
- Leave the local app reviewable.
