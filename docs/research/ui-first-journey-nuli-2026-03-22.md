# UI-Only Journey: Nuli Content Setup And Remote Publication

Date: 2026-03-22

## Mission

Use the product through the browser UI only to:

- upload 10 media items
- create 5 authors
- create 10 categories nested across 3 levels
- create 10 tags
- prepare 20 published blog posts, each with:
  - 2 tags
  - 2 categories
  - 1 author
  - 2 media items
- create 1 layout with 3 columns, 2 rows, and 5 blocks
- create 2 pages, one for posts and one for categories, both using that layout and carrying unique SEO fields
- publish and deploy everything to the remote environment
- browse remote pages and verify SEO, content data, layout data, and media references
- submit 2 comments from the remote page
- confirm those comments in the local app if the product path allows it

No scripts or API shortcuts were used for the content, configuration, layout, page, and deployment work itself. Everything operational was done through the browser UI and the live product.

## Starting State

The system was not empty.

That mattered immediately.

There were already:

- existing media
- existing authors
- existing categories and tags
- existing posts
- existing layouts
- existing pages
- existing release bundles

So the honest operator path was not "create a universe from zero."

The honest path was:

- add the new Nuli material
- normalize the seeded records where needed
- get the whole published set into a coherent released state

## What I Did

## 1. Oriented Myself In The Product

I entered the system and used the left workflow sidebar exactly the way a first-time operator would.

The route order now reads much more clearly than before:

- setup
- content
- presentation
- release

That framing helped.

The system still did not feel empty, though, and that changed the emotional tone of the work right away. Instead of feeling like a fresh setup journey, it felt like I was entering a live workspace that already had history and residue.

## 2. Uploaded 10 Media Items

I went to `Media` and uploaded 10 images from the desktop folder `Nuli2024`.

The uploaded set included:

- `20160114_204900`
- `20160214_201413-COLLAGE`
- `20160226_152936`
- `20160228_115605`
- `20160308_105947-COLLAGE`
- `20160309_132441`
- `20160323_155204`
- `20160330_135443`
- `20160825_081617`
- `20160927_110005(0)`

What worked:

- the gallery view made the library feel tangible
- upload from the same surface was the right interaction
- the right-side editor was a major improvement over the old stacked page

What was confusing:

- sync posture was not trustworthy until it was fixed earlier in the product work
- media state depended on remote run history more than a user would reasonably expect

## 3. Created 5 Authors

I went to `Authors` and created a Nuli-specific author set:

- `Maya Nuli`
- `Nuli Health Notes`
- `Nuli Journey Editor`
- `Nuli Morning Voice`
- `Nuli Park Guide`

What worked:

- the authors desk is one of the better module experiences now
- table first, drawer second, is the right pattern
- avatar picking from the media gallery fits the author workflow

What still felt slightly off:

- the system still carries old seeded records, so "my new authors" do not feel isolated enough from historical noise

## 4. Created 10 Categories Across 3 Levels

I went to `Taxonomies`, stayed on `Categories`, and built out a Nuli branch that ended up being a real 10-category structure with 3 levels.

The category set used for this journey was:

- `Nuli Care`
  - `Health Notes`
- `Nuli Life`
  - `Evening Routine`
  - `Morning Routine`
- `Nuli Places`
  - `Home Corners`
  - `Park Walks`
- `Nuli World`
  - `Nuli Daily Life`
    - `Nuli Morning Moments`

This is the cleanest part of the nested structure:

- `Nuli World`
  - `Nuli Daily Life`
    - `Nuli Morning Moments`

What worked:

- the later taxonomy redesign made the tree understandable
- once the branch was expanded, the path structure became readable

What failed or got in the way:

- earlier in the work, category editing could white-screen under some fill patterns
- until the tree redesign landed, the category structure did not look like a real tree

## 5. Created 10 Tags

I stayed in `Taxonomies`, moved to `Tags`, and created:

- `nuli-sunrise`
- `nuli-soft-light`
- `nuli-routine`
- `nuli-park`
- `nuli-sniffing`
- `nuli-comfort`
- `nuli-health`
- `nuli-portrait`
- `nuli-window`
- `nuli-walks`

What worked:

- manual tag creation was straightforward once the tags desk was cleaned up

What failed:

- batch creation silently no-op'd
- that is a bad first-run experience because the user thinks the system accepted the action

This was one of the early points where the product felt unreliable.

## 6. Prepared 20 Published Posts

This part required the most work and the most honesty.

The system already had seeded posts. I did not pretend otherwise.

The final published set was achieved by a combination of:

- creating new posts where needed
- normalizing seeded posts so they matched the mission requirements

New Nuli posts created through the UI:

- `Nuli Journey Story 01`
- `Nuli Journey Story 02`

Seeded posts that were normalized into the final published set included:

- the 10 `Remote Flow Review Post` records
- launch and release themed seeded posts already present in the workspace

For the final state, the post backlog showed:

- `Posts 20`
- `Published 20`
- `Scheduled 0`
- `Needs Release 20`

Each published post was brought into the required shape:

- 1 author
- 2 categories
- 2 tags
- 2 media items

What worked:

- the later post redesign made the roster and drawer much calmer
- separate tabs for story, organize, media, SEO, and publish were a real improvement

What failed or got in the way:

- post pagination is still broken
  - `postPage=2` changes the URL
  - the visible backlog still shows page one
- closing the post drawer sometimes leaves stale modal state behind
- some text fields persisted more reliably when typed like a human than when filled broadly

Why this matters:

- this is the most important desk in the system
- when it is unstable, the whole product feels unstable

## 7. Created A New Layout

I went to `Layouts` and created a new layout named:

- `Nuli Editorial Grid`

Saved result:

- layout id: `pagelayo-002`
- key: `layout-nuli-editorial-grid`

The actual canvas structure I created was:

- row 1: three columns
- row 2: two columns
- total blocks: 5

This matched the mission request of:

- 3 columns
- 2 rows
- 5 blocks

What worked:

- the canvas-first layout builder is much more understandable now
- docking the side support area instead of letting it cover the canvas was the right change

What failed or confused me:

- the layout key field behaved badly when I tried to replace its content with a simple fill action
- it appended instead of cleanly replacing
- I had to use a more human input pattern:
  - select all
  - type again

This is the kind of thing a normal user experiences as "the form is fighting me."

## 8. Created Two Pages Using The New Layout

I went to `Pages` and created:

### `Nuli Post Page`

- page id: `blogpage-015`
- type: post template
- path pattern: `/post/{slug}`
- layout: `Nuli Editorial Grid`

SEO and social fields:

- canonical: `https://example.com/post/{slug}`
- SEO title: `Nuli Post Page SEO`
- SEO description: `Post detail template for Nuli stories and launch notes.`
- OG title: `Nuli Post Page Social`
- OG description: `Read Nuli stories with the dedicated editorial grid post layout.`

### `Nuli Category Page`

- page id: `blogpage-016`
- type: category template
- path pattern: `/category/{slug}`
- layout: `Nuli Editorial Grid`

SEO and social fields:

- canonical: `https://example.com/category/{slug}`
- SEO title: `Nuli Category Page SEO`
- SEO description: `Category landing template for the Nuli content tree.`
- OG title: `Nuli Category Page Social`
- OG description: `Browse Nuli categories with the dedicated editorial grid layout.`

What worked:

- the revised Pages flow is much better with:
  - backlog first
  - creation in a staged drawer
  - editing in a calmer page studio

What still felt weak:

- until a page is actually published, its outcome messaging is harder to trust than it should be

## 9. Created New Release Bundles

I went to `Deployments`, moved into the guided release recipe flow, and created two new bundles:

### `Nuli Posts Release Bundle`

Bound to:

- page: `Nuli Post Page`
- posts data target: `Merchant Guild Posts Projection`
- categories data target: `Categories Projection`
- tags data target: `Tags Projection`
- media target: `Media Library`
- public HTML target: `HTML Deployment`
- public delivery: `Primary Domain`

### `Nuli Categories Release Bundle`

Bound to:

- page: `Nuli Category Page`
- categories data target: `Categories Projection`
- posts data target: `Merchant Guild Posts Projection`
- tags data target: `Tags Projection`
- media target: `Media Library`
- public HTML target: `HTML Deployment`
- public delivery: `Primary Domain`

What worked:

- the release room is much more understandable now than it used to be

What still felt wrong:

- the bundle setup does not infer the obvious target set from the page choice
- I still had to wire too much by hand for a common path

## 10. Released Both Bundles To Remote

I ran the release pipeline for both bundles from the UI.

### Category release

Observed completion:

- `Release pipeline completed for 'Nuli Categories Release Bundle'`
- last completion seen:
  - `2026-03-22T18:03:28.214Z`

### Post release

Observed completion:

- `Release pipeline completed for 'Nuli Posts Release Bundle'`
- last completion seen:
  - `2026-03-22T18:04:11.529Z`

The release steps shown by the UI completed across:

- local HTML sync
- posts compare and sync
- categories compare and sync
- tags compare and sync
- media compare and sync
- HTML deployment compare and sync
- browser delivery validation

What worked:

- release completion and state are now visible enough to trust

What still needs work:

- a first-time user still needs to think harder than they should about what a bundle is

## Remote Page Verification

## What I Expected

I expected to open a remote page and see a readable article using the page template and layout.

## What Actually Happened

The remote page was reachable and the published contract was present, but the visual page rendering was still mostly blank.

Visually, the page was basically:

- a very empty page shell
- sometimes only a `main` element

So the only truthful way to validate the remote output was:

- open the real remote page
- inspect the page source and runtime data in the browser
- verify the published contract from the actual deployed page

That means the deployment path is real, but the reader-facing page experience is still incomplete.

## 10 Remote Post Pages Verified

I verified these 10 remote post pages from the actual deployed site:

1. `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/launch-window-update/index.html`
2. `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/launch-checklist-for-platform-release-updated-989550/index.html`
3. `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/launch-rollout-story/index.html`
4. `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/launch-window-update-928325/index.html`
5. `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/launch-window-361989/index.html`
6. `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/launch-window-update-401913/index.html`
7. `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/launch-window-update-442933/index.html`
8. `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/launch-window-update-555350/index.html`
9. `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/remote-flow-review-post-01/index.html`
10. `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/remote-flow-review-post-02/index.html`

For all 10, I confirmed on the deployed page that:

- the SEO title was present
- the SEO description was present
- the post content JSON existed in `#page-data`
- the page referenced the post template page:
  - `blogpage-015`
- the page referenced the intended layout:
  - `pagelayo-002`
- the deployed payload included attached media references

Common verified values:

- page title:
  - `Nuli Post Page SEO`
- page description:
  - `Post detail template for Nuli stories and launch notes.`
- page id:
  - `blogpage-015`
- layout id:
  - `pagelayo-002`

Representative media verification:

- launch pages referenced:
  - `mdi-028`
  - `mdi-035`
- `Remote Flow Review Post 01` referenced:
  - `mdi-028`
  - `mdi-005`
- `Remote Flow Review Post 02` referenced:
  - `mdi-028`
  - `mdi-006`

Representative content verification:

- `postJsonPresent: true`
- `layoutJsonPresent: true`
- post record present under:
  - `data.primary.record`
- page layout contract present under:
  - `page.layoutModel`
- media references present under:
  - `media.items`
  - `media.referencedIds`

Important note:

The layout contract is present, but what the deployed page exposes today is a lighter page layout model, not a fully reader-visible rendering of the canvas layout. So the data proves the publication contract, but the visual page still under-delivers.

## Remote Comment Submission

I used the deployed remote page tester on:

- `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/launch-checklist-for-platform-release-updated-989550/index.html?appTester=1`

The tester page showed:

- the featured image
- published snapshot controls
- Firestore document load through the public app API
- IndexedDB install
- comment submission controls

I submitted two comments from the remote page.

### Comment 1

- author: `Runtime Tester`
- email: `tester@example.com`
- body: `Runtime tester submission from the temporary application layer.`
- created id:
  - `n9L6Bf50IYYUumEijU8f`
- status:
  - `pending`

### Comment 2

- author: `Remote Reader Two`
- email: `remote.reader.two@example.com`
- body: `Second remote comment submitted during the first-run journey review.`
- created id:
  - `7cDOEk6UautaZ42HrRG3`
- status:
  - `pending`

What worked:

- the remote page could submit both comments successfully
- the public app API responded with success
- comment creation was real, not mocked

## Local Comment Visibility Result

This is where the mission exposed a real product mismatch.

After the two remote comments were successfully created, I went to the local `Comments` desk to confirm them.

What I saw:

- the queue still showed the older seeded moderation records
- the queue counts did not reflect the two new remote comments
- searching by:
  - `Remote Reader Two`
  - comment body text
- returned no results

So the truthful result is:

- remote comment creation worked
- local comment visibility in the moderation desk did **not** work for those two newly submitted public comments

## Why Code Inspection Became Necessary

I only inspected code when the product stopped making sense from the UI alone.

Two cases forced that:

### 1. Remote comments versus local moderation

The UI said remote comments should land in the queue.

But the queue did not show them.

I inspected the relevant code and found the mismatch:

- the deployed public comment path writes to:
  - `publicComments`
- the local moderation desk reads:
  - `blog-comments`

So the two remote comments were successfully created, but not in the store the local moderation desk currently watches.

This is not an operator mistake.
It is a product gap.

### 2. Remote page rendering

The remote pages opened successfully, but the visible page was almost blank.

To verify whether publication had actually worked, I had to inspect the deployed page payload and meta tags directly in the browser.

That inspection proved:

- SEO tags exist
- content JSON exists
- layout JSON exists
- media references exist

So again, the system contract is present, but the visual outcome still falls short of what a user expects when they "open a published page."

## What Worked Well

- media upload from the library
- authors drawer workflow
- improved taxonomy tree
- layout builder after the docked-sidebar fix
- page creation flow after the realignment
- release bundle execution from the release room
- remote page contract generation
- remote comment submission through the deployed tester

## What Failed Or Caused Friction

- tag batch create silently no-ops
- category editing can white-screen
- post pagination is broken
- post drawer close behavior is unreliable
- some post fields are more reliable with human typing than broad fill actions
- release recipe setup still asks for too much manual wiring
- published remote pages still do not render like fully reader-facing articles
- remote public comments do not show up in the local moderation desk

## Final Outcome

Completed through the UI:

- 10 media items uploaded
- 5 authors created
- 10 categories created in a 3-level nested branch
- 10 tags created
- 20 published posts prepared with the requested relationships
- 1 new layout created:
  - `Nuli Editorial Grid`
  - `pagelayo-002`
- 2 new pages created:
  - `Nuli Post Page`
  - `Nuli Category Page`
- both pages published and released to remote
- 10 remote post pages verified for SEO and published contract
- 2 remote comments submitted successfully

Not completed as originally intended because of a product mismatch:

- those 2 remote comments were **not visible** in the local `Comments` desk

That last point is not a documentation issue.
It is a real gap in the current system behavior.
