# Domains Story Implementation Plan

## Intent
Turn `Domains` into the desk that answers one operator question first: where can readers actually reach the site right now, and what still needs to happen before a real hostname is live.

## Problems In The Previous Desk
- It spoke in target and delivery-stack language too early.
- It mixed overview, setup, and raw editing on the same surface.
- It used an inline editor instead of the drawer pattern now established across the product.
- It repeated technical URLs without helping the operator understand what readers can open.
- It made DNS and go-live work feel like provider detail instead of a guided publishing task.

## Design Goals
- Make the left side read as `Public Addresses`, not raw targets.
- Make the main desk start with reader-facing truth.
- Separate review of public examples from go-live work.
- Move editing and creation into a right-side drawer.
- Keep advanced browser/runtime fields available, but out of the main flow.

## Planned Shape

### 1. Public Address Roster
- Sidebar lists saved public addresses.
- Each row shows:
  - address name
  - testing mode vs live domain
  - readiness state
  - current hostname or testing origin
- `New Address` opens a creation drawer.

### 2. What Readers See
- First tab explains:
  - what readers can open today
  - whether the address is still testing mode or a live domain
  - example post, category, and media links
- This tab should make the current public truth obvious without infrastructure literacy.

### 3. Go Live
- Second tab explains:
  - current public mode
  - whether pages and media are browseable
  - certificate posture
  - exact DNS records when known
  - what the operator can analyze or prepare next
- Remotes and Deployments remain linked from here when the work crosses desks.

### 4. Address Drawer
- Create and edit happen in a drawer.
- Main fields:
  - address name
  - remote connection
  - testing address vs real domain
  - hostname / DNS ownership / delivery stack when applicable
  - public HTML target
  - media target
- Advanced browser fields remain optional and collapsed.

## Verification Standard
- Focused integration test for the new public-address language and drawer flow.
- Frontend build.
- `pnpm quality:protocol`.
- Live browser review on `/app/domains`.

## Done Means
- The route no longer reads like a raw target editor.
- A user can understand current public reachability without knowing the remote model first.
- Editing happens in a drawer, not in the main desk body.
- DNS/go-live guidance is actionable and explicit.
