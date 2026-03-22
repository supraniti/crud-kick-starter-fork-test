# Deployments Story Implementation Plan

## Goal
- Turn `Deployments` into a release room instead of a page full of target controls.
- Let the operator answer four questions quickly:
  - what bundle is about to go live
  - what will refresh in this release
  - whether everything is ready
  - what link should be opened after completion

## Product Shape
- bundle selector on the left
- one release story in the main column:
  - `Release Shape`
  - `What Will Refresh`
  - `Release This Bundle`
- secondary tabs for:
  - `Inspect Output`
  - `History`
  - `Advanced`

## Implementation Rules
- keep the existing release engine, bundle persistence, runtime preview, and target operations
- simplify the product surface, not the underlying release mechanics
- the main route must explain release in product language:
  - `bundle`
  - `what will refresh`
  - `live URL`
  - `recent release`
- remote cost and provisioning detail belongs in `Inspect Output`, not in the release story
- setup and per-target operations stay in `Advanced`

## Deliverables
- release-room hero and route purpose
- cleaner bundle sidebar labels
- release shape card with direct browse links
- refresh-impact card that explains whether this is a rerun or a meaningful update
- one strong release action with visible progress
- calmer history surface that answers:
  - what went live last time
  - did it finish
- advanced/setup controls preserved but demoted

## Validation
- `pnpm --filter frontend build`
- `pnpm quality:protocol`
- `pnpm review:env:verify`
- focused Deployments integration proof when the environment allows it
