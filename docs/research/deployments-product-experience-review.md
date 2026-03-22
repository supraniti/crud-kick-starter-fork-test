# Deployments Product Experience Review

## Scope
- live route reviewed:
  - `http://localhost:3000/app/deployments`
- tabs inspected:
  - `Release`
  - `Inspect Output`
  - `History`
  - `Advanced`
- live artifacts captured:
  - `C:\Users\cmsin\2026\crud-kick-starter-fork-test\.codex-runtime\deployments-review-release.png`
  - `C:\Users\cmsin\2026\crud-kick-starter-fork-test\.codex-runtime\deployments-review-inspect.png`
  - `C:\Users\cmsin\2026\crud-kick-starter-fork-test\.codex-runtime\deployments-review-history.png`
  - `C:\Users\cmsin\2026\crud-kick-starter-fork-test\.codex-runtime\deployments-review-advanced.png`

## Main Conclusion
The page is no longer chaotic, but it is still hard to reason about as a normal user.

The problem is not missing information.

The problem is that the page still assumes the user already understands:
- what a bundle is
- what release changes actually mean
- why there are separate release, inspect, history, and advanced surfaces
- which parts are normal flow versus specialist flow

So the desk is calmer than before, but not yet truly self-explanatory.

## What The User Sees Today

### 1. Release
The release tab now has a cleaner sequence:
- `Release Shape`
- `What Will Refresh`
- `Release This Bundle`

This is directionally correct.

But it still leaves important user questions underexplained:
- why do I have more than one bundle?
- what real-world surface does each bundle own?
- what exactly will happen if I press the button?
- will this change only HTML, or also posts, taxonomies, and media?
- if one area is stale, what do I do with that information besides press release?

`What Will Refresh` is the strongest part of the current page, but it still reads like system state more than an operator brief.

### 2. Inspect Output
This tab is still too technical for the normal user.

The first thing the user sees is runtime contract material:
- datasets
- queries
- actions
- slots
- raw JSON

That is valid internal information.
It is not the first thing a normal user means by `Inspect Output`.

A user reading `Inspect Output` expects:
- what page will people open?
- what example is currently live?
- what media is expected on that page?
- what is the visible result?

Instead, the first screen is developer-facing runtime detail.

### 3. History
This tab is improved, but it still behaves more like a run ledger than a release memory.

The user likely wants to answer:
- did the last release finish?
- what bundle went live?
- when?
- what should I open now?
- what failed last time and why?

The current history screen answers some of that, but it does not yet feel like a decision aid.
It still feels like an audit list.

### 4. Advanced
This tab is correct in principle.
It is secondary.

But even here, the bundle setup is still too raw:
- target selectors
- internal target naming
- validation wording

This is acceptable for an advanced surface, but not good enough for a primary setup experience.

## The Core UX Problem
The page has structure, but not enough interpretation.

The user is still required to translate system facts into product meaning.

Examples:
- `10 outputs`
  - does that mean 10 post pages?
  - 10 category pages?
  - 10 changed pages?
  - 10 total pages?

- `0 areas changing`
  - good, but is release unnecessary?
  - is this just a rerun?
  - is something stale only locally?

- `Release This Bundle`
  - fine as a button
  - but the page still does not teach the operator what kind of mission a bundle represents

## The Most Important Design Gap
The desk still explains release from the system’s point of view.

It should explain release from the user’s point of view.

The user point of view is:
- I have a thing I want to publish
- I need to know if it is ready
- I need to know what will change
- I need one safe action
- I need a real link afterward

That should define the page.

## What Needs To Change

### 1. Make Bundles Legible
The left side should explain bundle intent, not just bundle labels.

Each bundle should clearly answer:
- what this bundle publishes
- how many outputs it owns
- whether it needs release now
- what kind of page family it affects

### 2. Turn Release Into A Brief
The release tab should feel like a release brief, not a card collection.

It should say:
- what this bundle is for
- what changed since the last release
- what will go live if the user proceeds
- what the likely next action is after completion

### 3. Redefine Inspect Output
This tab should start with visible outcome inspection.

Runtime contract and raw JSON should be secondary, probably behind deeper sections.

### 4. Make History Actionable
History should not only remember runs.
It should support decisions.

The user should be able to answer quickly:
- safe to rerun?
- last known good release?
- last failed release?
- live link from that release?

### 5. Keep Advanced Truly Secondary
The page should not emotionally depend on `Advanced` to be understood.

Advanced should help the operator when they already know what they are doing.
It should not carry the burden of explaining the main flow.
