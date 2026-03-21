# Developer Story Implementation Plan

## Goal
- Turn the developer story into an actual repo contract instead of a vague aspiration.
- Make it faster for an agent developer to answer four questions truthfully:
  - what desk owns the product surface I need to change
  - where does the module-owned behavior live
  - what is the smallest proof I should run
  - how do I know the local review app is real

## Target State
- A developer starts from one story, one desk map, one truthful review command, and one small proof.
- The repo makes the boundary visible between:
  - product-shell surface
  - module-owned behavior
  - shared infra
- The local review environment stops claiming success unless:
  - the frontend serves HTML
  - the backend health endpoint is healthy
  - proxied API calls on `localhost:3000` return backend JSON

## Scope
- This plan only covers the developer story.
- It does not yet redesign any product desk.
- It creates the tools and documentation that make the later desk stories cheaper and safer to implement.

## Implementation Phases

### Phase 1: Orientation Contract
- Deliver a desk map that ties every product desk to:
  - route
  - owning view
  - owning module or synthetic product route
  - likely change locations
  - nearest focused proofs
- Expose that map both as:
  - checked-in docs
  - a repo command for fast lookup

### Phase 2: Truthful Review Contract
- Extend the repo-owned review launcher so it can verify actual usability, not just open ports.
- Add one command that tells the truth about the review app:
  - `pnpm review:env:verify`
- Verification must fail if:
  - `localhost:3000` serves non-HTML
  - `127.0.0.1:3001/health` is unhealthy
  - `localhost:3000/api/system/ping` does not return backend JSON
  - `localhost:3000/api/reference/modules` does not return backend JSON

### Phase 3: Developer Starting Point Docs
- Refresh the command registry so the default developer flow is obvious:
  - start review env
  - verify review env
  - consult desk map
  - run the nearest focused proof before the full gate

### Phase 4: Progress Pointer Discipline
- Record the new developer contract in:
  - `handoff.md`
  - `docs/agent-observer-log.md`

## Review Standard
- This slice is only complete when a reviewer can:
  - open the plan
  - open the desk map
  - run one command to verify the review app
  - see that the command would have caught the recent fake-healthy launcher failures

## This Slice
- Implement Phase 1 through Phase 4.
- Stop for review without commit.

## Next Likely Developer-Story Follow-Ups
- Add a focused proof map grouped by desk and change type.
- Add a lightweight change-placement guide:
  - product surface change
  - module behavior change
  - shared primitive change
- Add a generated inventory of module collections/settings ownership if desk work starts drifting into guesswork again.
