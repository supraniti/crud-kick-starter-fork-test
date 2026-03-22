# Remotes Story Implementation Plan

## Goal
Turn `Remotes` into a connection and readiness desk instead of an infrastructure control panel.

## Problems Found
- The route still led with internal control-panel language.
- Managed-service counts were misleading because raw target rows were being counted instead of distinct publishing pieces.
- Readiness analysis was fragmented across repeated stage buttons.
- The connection editor exposed too much generic module setup noise.

## Product Direction
1. Make the route read as a `Remote Readiness Desk`.
2. Keep one clear connection workspace on the same desk for:
   - first-time credential import
   - validation
   - key repair
3. Make the main board answer:
   - is this remote connected
   - is it understood
   - which publishing pieces are ready
   - what still needs work
4. Keep billing visible, but secondary to connection and readiness.

## Implementation Steps
1. Replace the old connection list/editor pairing with a product-owned connection sidebar and connection panel.
2. Remove the noisy summary grid and replace it with one `Active Remote` summary card.
3. Rewrite `Setup Stages` into a `Readiness Board` with product-language stages:
   - Connection
   - Remote Access
   - Published Data
   - Media Library
   - Public HTML
   - Public Delivery
4. Centralize `Analyze Readiness` and `Prepare Missing Pieces`.
5. Keep stage-level actions only when they are truly contextual.
6. Fix managed-piece counting to use distinct product bindings.
7. Update the focused remotes proof and re-check the live route.

## Validation
- `pnpm --filter frontend build`
- `pnpm --filter frontend exec vitest run src/tests/app-integration/product-remotes.integration.test.jsx`
- `pnpm quality:protocol`
- `pnpm review:env:verify`
