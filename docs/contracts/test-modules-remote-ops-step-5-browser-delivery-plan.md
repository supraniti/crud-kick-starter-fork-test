# Test Modules Remote Ops Step 5 Browser Delivery Plan

## Metadata
- Plan ID: `plan.test-modules-remote-ops.step-5-browser-delivery.v1`
- Date: `2026-03-12`
- Owner: `codex`
- Status: `completed`

## Goal
- Deliver a bounded browser-delivery workflow that the operator can actually use now:
  - enter the domain they want to use
  - choose between `custom-domain` and `gcp-temporary`
  - see exact DNS instructions when using a custom domain
  - see the temporary GCP-hosted URLs when using GCP-hosted access
  - have generated page HTML become domain-aware from the configured browser-delivery target

## Explicit Scope
- Stay inside:
  - `modules/test-modules-remote-ops/`
  - `modules/test-modules-pages/`
- Allow only narrow root/doc updates needed for tests/progress pointers.
- Do not introduce broad shared/core abstractions for domain management.

## Product Decision
- This step does **not** attempt full load-balancer/CDN execution.
- This step does deliver:
  1. browser-delivery target configuration for:
     - `custom-domain`
     - `gcp-temporary`
  2. operator instructions for custom-domain DNS
  3. surfaced GCP temporary URLs
  4. public-delivery readiness checks for linked deployment/media buckets
  5. domain-aware page rendering based on the selected Pages browser-delivery target

## Supported Modes

### Mode A - Custom Domain
- Operator enters a hostname.
- The app computes the public origin from the hostname.
- The app shows DNS instructions for the current supported direct-storage path.
- The app warns when the linked deployment target shape does not fit that path:
  - deployment bucket does not match hostname
  - deployment prefix is non-empty
  - bucket website/public-read requirements are not met

### Mode B - GCP Temporary
- The app derives public URLs from the linked deployment/media storage targets.
- The app shows the exact temporary URLs/operators can open.
- Generated page canonical/public URLs use the GCP temporary origin/path.

## Data Model Changes
- Extend `browser-delivery` target config with:
  - `accessMode`
  - `dnsMode`
  - `deploymentTargetProfileId`
  - `mediaTargetProfileId`
- Keep existing future-facing fields:
  - `hostname`
  - `dnsZone`
  - `certificateName`
  - `urlMapHint`

## Runtime Changes

### Remote Ops
- Add a module-local browser-delivery report runtime that resolves:
  - linked deployment/media targets
  - effective public origins
  - exact temporary URL bases
  - custom-domain DNS instructions
  - readiness/warning state
- Extend compatibility analysis to include:
  - public-read readiness
  - deployment bucket website readiness
  - custom-domain shape warnings
- Extend provisioning execution for the bounded supported path:
  - configure deployment bucket website main page suffix where needed
  - configure public object readability for linked deployment/media buckets where operator-confirmed and allowed

### Pages
- Resolve the selected browser-delivery target from Pages module settings.
- Use the resolved public origin when building deployment payload/head defaults.
- Add public URL metadata into the deployed payload.
- Prefer browser-delivery-derived canonical URL when page-level canonical is absent.

## UI Changes

### Remote Ops
- Browser-delivery target editor gains:
  - access mode
  - DNS mode
  - linked deployment target
  - linked media target
- Show:
  - public origin preview
  - exact DNS record instructions
  - GCP temporary URLs
  - readiness warnings
  - bounded provisioning actions

### Pages
- Show which browser-delivery target is active through settings.
- Make public URL/domain awareness visible in the deployment surface.

## Verification Plan
1. Focused server conformance for remote ops.
2. Focused frontend integration for remote ops browser-delivery UX.
3. Focused page deployment proof for canonical/public URL generation.
4. `pnpm quality:protocol`
5. `pnpm quality:gate:full`

## Review Proof
- Start the app and verify:
  1. operator can choose custom domain vs GCP temporary
  2. operator can see DNS instructions
  3. operator can see temporary URLs
  4. deployed page HTML reflects the configured public origin

## Delivered
- `Remote Ops` browser-delivery targets now support:
  - `accessMode = custom-domain | gcp-temporary`
  - `dnsMode = external | gcp-managed`
  - linked deployment/media target profiles
- `Remote Ops` now shows:
  - public origin preview
  - example page URL
  - temporary deployment/media URLs
  - exact DNS record instructions for the current direct-storage path
  - readiness warnings and bounded provisioning actions
- `Pages` now reads the selected browser-delivery target through module settings and makes generated output domain-aware:
  - delivery payload JSON includes public and temporary URL metadata
  - canonical URL resolves from browser-delivery when present
  - deployed HTML carries the same browser-delivery-aware canonical/public contract
- Discovered module routes now receive `resolveSettingsRepository`, so module-owned route handlers can resolve module settings consistently.

## Delivered Contract Boundary
- Supported now:
  - direct-storage custom-domain instructions
  - direct-storage GCP temporary URLs
  - public-read / website-shape readiness diagnostics for linked storage targets
  - bounded provisioning for the direct-storage path
  - domain-aware Pages payloads and deployed HTML
- Explicitly not delivered in this step:
  - full load balancer / CDN execution
  - full certificate / DNS orchestration
  - HTTPS custom-domain claims beyond a separate future delivery stack

## Verification Result
- `pnpm quality:protocol`
- `pnpm quality:gate:full`
- Focused conformance proof includes:
  - `server/test/module-conformance/blog-distribution.module-conformance.test.js`
  - `server/test/module-conformance/remote-ops.module-conformance.test.js`
- Live proof completed on the local review environment:
  - page delivery API payload became browser-delivery-aware
  - per-record Pages sync rewrote existing artifacts after browser-delivery settings changed
  - deployed HTML for `posts/{slug}` reflected the selected public origin and temporary media base

## Environment Lesson
- On this machine, the long frontend integration lane is sensitive to an active manual review pair on `3000/3001`.
- Close the live review processes before `pnpm quality:gate:full`, then rerun the lane in a clean state.
