# Delivery Scope Contract

## Objective
- Keep the repository delivery-ready with only active runtime, tests, and docs.

## Included Delivery Surfaces
- `server/`
- `frontend/`
- `modules/`
- `e2e/`
- `scripts/`
- `docs/contracts/`

## Exclusion Rules
- Archive-only folders are not allowed in active delivery scope.
- Historical protocol trees are not allowed in active delivery scope.
- Any artifact without active runtime/test/contract usage must be removed.

## UI Boundary Rules
- Default to the existing MUI component surface and established MUI-based patterns.
- Do not introduce native HTML controls in place of existing MUI components unless the user gives explicit approval first.
- Do not introduce shared/core frontend component refactors as part of feature work unless the user gives explicit approval first.

## Module Scope
- Active module surface is limited to:
  - `modules/test-modules-crud-core`
  - `modules/test-modules-relations-taxonomy`
  - `modules/test-modules-settings-policy`
  - `modules/test-modules-operations-dispatch`
  - `modules/test-modules-remotes-publish`
  - `modules/test-modules-media-manager`
  - `modules/test-modules-blog-content`
  - `modules/test-modules-blog-distribution`
  - `modules/test-modules-blog-engagement`
  - `modules/test-modules-blog-editorial`
  - `modules/test-modules-blog-taxonomy`
