# Deployments Story Realignment Plan

## Goal
Turn `Deployments` from a structured release page into a self-explanatory release experience.

The user should not need prior knowledge of the system to understand:
- what bundle to choose
- what the release will affect
- whether release is necessary
- what happens when the button is pressed
- what link to inspect afterward

## Current Strengths
- the desk is no longer a flat wall of controls
- the main release tab already has the right direction:
  - `Release Shape`
  - `What Will Refresh`
  - `Release This Bundle`
- advanced controls are already demoted
- bundle history is already more compact than before

## Current Gaps
- bundles are still not legible enough as release missions
- release consequences are not explained strongly enough in product language
- `Inspect Output` starts with developer material instead of user-visible output
- `History` still reads more like logs than decisions
- bundle setup is still too target-shaped for a guided release definition flow

## Execution Plan

### Pass 1: Bundle Roster Clarity
- rewrite the left-side bundle list as mission cards instead of plain labels
- each bundle row should show:
  - page family it owns
  - output count
  - release posture:
    - needs release
    - current
    - attention needed
  - direct hint about what kind of thing will go live
- make it obvious why a user would choose bundle A instead of bundle B

### Pass 2: Release Brief Redesign
- reshape the release tab into one briefing flow
- strengthen the current sections so they answer in plain language:
  - what this release is for
  - what changed since the last release
  - whether this is a rerun or a meaningful update
  - what exactly the user should open afterward
- improve the main action area so the effect of release is clearer before the button press

### Pass 3: Inspect Output Redesign
- make the top of `Inspect Output` about visible results:
  - example live URL
  - local artifact
  - media used by the example
  - visible page promise
- move runtime contract detail below that
- demote raw JSON further so it becomes a debugging layer, not the opening view

### Pass 4: History Redesign
- turn history into a release memory, not a run ledger
- add quick understanding for:
  - last successful release
  - last failed release
  - what should be opened now
  - what failed and where to go next
- keep detailed step dumps out of the primary history path

### Pass 5: Guided Bundle Setup
- keep bundle setup in `Advanced`, but rewrite it as a guided recipe builder
- make the field labels and validation messages more product-shaped
- reduce internal target vocabulary where possible
- keep infrastructure detail available without making it the main mental model

## Validation Standard
The redesigned Deployments page should be judged by this flow:

1. open `Deployments`
2. understand which bundle to choose
3. choose one bundle
4. understand what will change
5. understand whether release is necessary
6. run the release with confidence
7. inspect the live result
8. inspect the recent release if something feels wrong

If the user still has to translate system information into product meaning at step 2, 4, or 5, the pass is not done.
