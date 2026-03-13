# Test Modules Remote Ops Step 6 Browser Delivery Stack Plan

## Metadata
- Plan ID: `plan.test-modules-remote-ops.step-6-browser-delivery-stack.v1`
- Date: `2026-03-13`
- Owner: `codex`
- Status: `completed`

## Goal
- Extend browser-delivery from direct-storage instructions into a real managed HTTPS delivery stack while keeping all provider logic inside `test-modules-remote-ops`.
- Keep `Pages` as a consumer of the resolved delivery contract, not an owner of GCP infrastructure logic.

## Scope
- Stay inside:
  - `modules/test-modules-remote-ops/`
  - `modules/test-modules-pages/`
  - focused tests
  - progress pointers / contracts
- Avoid new shared/core remote abstractions unless a missing primitive is proven.

## Product Direction
- Browser delivery remains one target kind with two operator-facing access modes:
  - `gcp-temporary`
  - `custom-domain`
- `custom-domain` now splits into two stack paths:
  - `direct-storage`
  - `https-load-balancer`
- The app must help the operator understand:
  - what resources already exist
  - what resources are missing
  - what permissions are missing
  - what DNS changes are needed
  - what public URLs will result

## Step 6 Delivery Intent
1. Add an explicit browser-delivery stack mode.
2. Keep existing direct-storage path intact.
3. Add a real HTTPS stack path with:
   - global address
   - backend bucket(s)
   - URL map
   - HTTPS proxy
   - forwarding rule
   - certificate DNS authorization
   - Certificate Manager certificate
4. Support both DNS modes:
   - `external`
   - `gcp-managed`
5. Keep provisioning minimum-footprint:
   - only create resources required by configured live browser-delivery targets
   - do not create duplicate singleton-style resources for the same target

## Config / Contract Changes
- Extend browser-delivery config with:
  - `stackMode`
- Keep existing target-owned fields:
  - `hostname`
  - `dnsMode`
  - `dnsZone`
  - `certificateName`
  - `urlMapHint`
  - linked deployment/media target ids
- Derive secondary resource names from the target config instead of widening the operator form unless needed.

## Important Runtime Rules
- `https-load-balancer` requires the linked deployment target to be path-compatible with page delivery.
- Initial bounded rule:
  - deployment storage prefix must be empty for clean page routing
- Media routing can use the linked media prefix as its public path segment.
- Browser-delivery target validation remains target-local.
- Compatibility analysis / provisioning remain connection-local but must report browser-delivery resource truth precisely.

## Provisioned Resource Set
- Required APIs:
  - `compute.googleapis.com`
  - `certificatemanager.googleapis.com`
  - `dns.googleapis.com` only when `dnsMode = gcp-managed`
- Browser-delivery stack resources:
  - DNS managed zone when `dnsMode = gcp-managed`
  - DNS authorization
  - Google-managed certificate
  - global static IP
  - deployment backend bucket
  - optional media backend bucket
  - URL map
  - HTTPS target proxy
  - global forwarding rule
- DNS records:
  - `external`: show exact required records, validate only
  - `gcp-managed`: create/update the required records in the managed zone

## UI Surfaces
- `Remote Ops` browser-delivery target editor gains:
  - stack mode selector
- Browser-delivery panels must show:
  - stack mode
  - public origin
  - public media base when available
  - exact DNS instructions
  - DNS authorization record when certificate is pending
  - linked-resource compatibility warnings
  - missing permissions and create-ready actions

## Pages Consumption
- `Pages` must consume the resolved browser-delivery state and expose:
  - `publicOrigin`
  - `publicUrl`
  - `publicMediaBaseUrl`
  - temporary deployment/media URLs
- Canonical URL should prefer the managed HTTPS origin when the stack is ready.

## Verification Plan
1. Focused remote-ops server conformance for:
   - HTTPS browser-delivery compatibility
   - provisioning execution
   - DNS instruction/report generation
2. Focused remote-ops frontend integration for:
   - stack mode editing
   - preview/report rendering
3. `pnpm quality:protocol`
4. `pnpm quality:gate:full`

## Expected Review Outcome
- Operator can configure:
  - temporary GCP access
  - direct-storage custom-domain
  - HTTPS load-balancer custom-domain
- Operator can see exactly what still blocks the HTTPS stack:
  - permissions
  - DNS records
  - resource compatibility
- Operator can provision supported GCP-managed delivery resources from the app.

## Closure Notes
- Delivered in the current worktree on `2026-03-13`.
- Repo verification:
  - `pnpm lint:repo-loc`
  - `pnpm lint:function-shape`
  - `pnpm quality:gate:full`
  - `pnpm quality:protocol`
- Live review summary:
  - `Remote Ops` target editor correctly flips preview/instructions between `direct-storage` and `https-load-balancer`
  - `Pages` delivery payload resolves browser-delivery metadata from the selected target, including public origin/public URL and media base when available
