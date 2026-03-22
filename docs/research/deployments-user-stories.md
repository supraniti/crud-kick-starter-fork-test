# Deployments User Stories

## Story 1: I Want To Publish The Post Pages
The user opens `Deployments` because they know their post pages are not fully live yet.

They do not want to think about projections, buckets, or target profiles.
They want to find the post release, confirm what it affects, and press one clear button.

The ideal screen tells them:
- this bundle is for post pages
- it will refresh 10 post outputs
- only page HTML is stale
- data and media are already current
- after completion, open this example post URL

The user presses release and watches a step list move.
When it finishes, the same screen rewards them with a real live link.

The user feels:
- confident before the action
- oriented during the action
- rewarded after the action

## Story 2: I Need To Know If A Release Is Even Necessary
The user opens `Deployments` and selects a bundle.

Sometimes they do not actually need to release.
They just need to know whether something changed.

The ideal screen tells them in plain language:
- this looks like a rerun
- page output is already current
- data is already current
- media is already current

The user does not have to guess whether `0 areas changing` means good or suspicious.
The page says what that means.

The user leaves with a decision:
- release now
- or do nothing

## Story 3: I Need To Understand A Failure Quickly
The user ran a release yesterday and something failed.

They return to `Deployments` today to answer:
- what failed?
- is it still broken?
- what step broke?
- what do I need to fix before trying again?

The ideal history view says:
- latest successful release
- latest failed release
- broken step name in everyday terms
- the next likely place to go:
  - Pages
  - Remotes
  - Domains

The user does not read a ledger.
They get a diagnosis.

## Story 4: I Need To Inspect What Will Go Live
The user clicks `Inspect Output` because they want to understand the visible result of release.

The ideal tab starts with:
- example public page
- example local artifact
- media used by that page
- current visible live target

Only after that, deeper technical material becomes available:
- runtime contract
- datasets
- actions
- raw JSON

The user can stop at the first layer unless they are debugging something deeper.

## Story 5: I Need To Create A New Release Bundle Without Feeling Like I’m Wiring Infrastructure
The user creates a new bundle because they added a new page family.

They should not feel like they are doing infrastructure assembly.

The ideal create flow asks in product terms:
- what is this release for?
- which page does it own?
- should it also refresh posts?
- should it also refresh taxonomies?
- which media delivery should it use?
- what public delivery should it end on?

Validation should explain mistakes in plain language:
- this delivery does not point at the selected HTML output
- this bundle is missing a required publishing target
- this page is not ready for release yet

The user should feel like they are defining a release recipe, not wiring internal services.
