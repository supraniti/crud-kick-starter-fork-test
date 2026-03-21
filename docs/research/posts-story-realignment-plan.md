# Posts Story Realignment Plan

## Why The Current Pass Stops Here
The current Posts implementation improved structure, but it did not yet cross the product bar described in the story.

The key mistake was treating Posts like a layout problem when it is primarily a workflow problem.

The question is not only:
- where should the panels go?

The real question is:
- what should the user do in sequence when managing story work?

## Correct Product Shape
Posts should be implemented as three tightly related but clearly different experiences.

### 1. Editorial Roster
Purpose:
- help the user manage many stories at once

It should do these jobs well:
- scan titles and ownership
- sort and filter by editorial state
- expose blocked stories clearly
- expose live/not-live state clearly
- support bulk work
- provide direct jumps to:
  - edit the story
  - open the public page/output when available
  - narrow to related author/category/tag views when useful

This surface should feel like a publication backlog.
It should not feel like a technical dataset.

### 2. Writing Desk
Purpose:
- help the user shape one story calmly

It should do these jobs well:
- keep title, subtitle, excerpt, and body at the center
- treat authorship, taxonomy, media, and SEO as support systems for the story
- explain blockers in plain language
- keep save / publish / schedule actions understandable
- show real public consequences without pulling the user into an operational tunnel

This surface should feel like editorial work, not system administration.

### 3. Publication Context
Purpose:
- explain what stands between a saved story and a live story

It should do these jobs well:
- show whether the story has a page
- show whether that page has outputs
- show whether those outputs are current
- show whether the remote projection is current
- explain the next needed action in product language

This surface should be separate enough not to pollute writing, but close enough that the user can understand the path to live publication.

## Pass Structure
### Pass A - Roster Redesign
- make the table feel like a real editorial backlog
- add the most useful columns and row actions
- add bulk actions for post work
- make roster context survive in URL state including pagination
- make the roster the obvious home for scanning many posts

### Pass B - Writing Desk Redesign
- rebuild the authoring surface around story writing, not grouped settings
- introduce clearer first-step guidance for new drafts
- reduce internal language and replace it with editorial language
- make author, taxonomy, and media feel more immediate and meaningful

### Pass C - Publication Context Redesign
- translate page/output/projection state into a simpler publication path
- distinguish saved vs published vs live in plain language
- surface the exact next action needed for a story to become live
- reduce module jargon in the release surface

### Pass D - Integration And Finish
- ensure roster -> writing -> publication feels like one coherent flow
- verify URL-backed continuity
- verify create/edit/save/publish/live inspection flows in browser
- then stop for review again

## Non-Goals For The Next Pass
- no more broad surface reshuffling without a workflow reason
- no more adding operational widgets just because the data exists
- no more treating `Posts` like a thinner version of `Pages` or `Deployments`

## Verification Standard
The next Posts implementation should be judged by live browser use first.

Minimum review flow:
1. open `Posts`
2. scan the roster and understand which stories need attention
3. filter to a smaller editorial slice
4. open one story
5. edit title/body/media/taxonomy
6. save it
7. understand whether it is only saved, published, or live
8. open the public page if available

If that flow still feels noisy, abstract, or over-technical, the pass is not done.
