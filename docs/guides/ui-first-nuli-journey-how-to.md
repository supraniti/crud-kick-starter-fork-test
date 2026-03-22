# UI-First How-To: Nuli Content Setup And Remote Publication

Date: 2026-03-22

## Purpose

This guide explains, in UI terms only, how to repeat the full Nuli journey inside the app:

- upload 10 media items
- create 5 authors
- create 10 categories across 3 levels
- create 10 tags
- prepare 20 published posts
- create 1 reusable layout
- create 2 published pages
- create 2 release bundles
- release to the remote
- verify remote post pages
- submit comments from a deployed page
- confirm those comments in the local app

This is written as a first-run operator guide, not a developer memo.

## Preconditions

Before starting, make sure:

1. The app opens at `http://localhost:3000/`.
2. The backend health route works at `http://127.0.0.1:3001/health`.
3. You can sign in with `LOCAL`.
4. The `merchant-guild` remote connection already exists and is validated.
5. The `Nuli2024` folder exists under the desktop and contains the 10 images used below.

## Recommended Working Order

Follow this sequence:

1. `Media`
2. `Authors`
3. `Taxonomies`
4. `Posts`
5. `Layouts`
6. `Pages`
7. `Deployments`
8. remote verification
9. remote comment submission
10. local comment review

Do not start with `Deployments`. The release room only makes sense after the content and page surfaces are already prepared.

## Media

Route:

- `/app/media`

Goal:

- upload 10 images and verify they are visible in the library

Files used from `~/Desktop/Nuli2024`:

1. `20160114_204900`
2. `20160214_201413-COLLAGE`
3. `20160226_152936`
4. `20160228_115605`
5. `20160308_105947-COLLAGE`
6. `20160309_132441`
7. `20160323_155204`
8. `20160330_135443`
9. `20160825_081617`
10. `20160927_110005(0)`

Steps:

1. Open `Media`.
2. Stay in gallery view.
3. Click the upload tile or the upload entry point in the library.
4. In the file picker, browse to `~/Desktop/Nuli2024`.
5. Select the 10 files listed above.
6. Confirm the upload.
7. Wait for the gallery to refresh.
8. Click each uploaded asset one by one and confirm the right-side editor opens.
9. In the editor, confirm the image preview loads.
10. Switch to the `Publish` tab for one asset and confirm the sync state is readable.

What to expect:

- the asset appears immediately in the library
- selecting an asset opens the right-side drawer
- the drawer shows `Preview`, `Details`, `Usage`, and `Publish`

## Authors

Route:

- `/app/authors`

Goal:

- create 5 authors

Authors created during the journey:

1. `Maya Nuli`
2. `Nuli Health Notes`
3. `Nuli Journey Editor`
4. `Nuli Morning Voice`
5. `Nuli Park Guide`

Recommended pattern for each author:

- status: `active`
- role: editorial role of your choice
- locale: keep it consistent with the rest of the content
- avatar: pick one of the uploaded Nuli images

Steps:

1. Open `Authors`.
2. Click `New Author`.
3. In the drawer, fill:
   - `Display Name`
   - `Legal Name`
   - `Status`
   - `Role`
   - `Email` if desired
   - `Website` if desired
4. Click the avatar chooser.
5. In the gallery, select one of the Nuli images.
6. Click `Create Author`.
7. Wait for the success toast.
8. Repeat for the remaining 4 authors.

Verification:

- the authors table shows all 5 new rows
- clicking a row reopens the author drawer
- filter, sort, and pagination are preserved in the URL

## Taxonomies: Categories

Route:

- `/app/taxonomies?taxonomyBranch=categories`

Goal:

- create a 10-category branch across 3 levels

Suggested structure used in the journey:

1. `Nuli Care`
2. `Health Notes` under `Nuli Care`
3. `Nuli Life`
4. `Evening Routine` under `Nuli Life`
5. `Morning Routine` under `Nuli Life`
6. `Nuli Places`
7. `Home Corners` under `Nuli Places`
8. `Park Walks` under `Nuli Places`
9. `Nuli World`
10. `Nuli Daily Life` under `Nuli World`
11. `Nuli Morning Moments` under `Nuli Daily Life`

Note:

- The journey created a clean 3-level example branch:
  - `Nuli World`
  - `Nuli Daily Life`
  - `Nuli Morning Moments`
- If you need exactly 10 categories rather than 11 labels above, remove one sibling from the structure before saving the final branch.

Steps for each category:

1. Click `New Category`.
2. In the drawer, fill:
   - `Name`
   - `Parent` if this is not a root category
   - `Visibility`
   - `Sort Order`
   - `Description`
3. Review `Path Preview`.
4. Click `Choose Image`.
5. Pick one Nuli image from the gallery.
6. Click `Create Category`.
7. Repeat until the branch is complete.

Verification:

- the tree browser shows the nested structure
- expanding the parent rows reveals the child rows
- selecting a category shows its public context in the side rail

## Taxonomies: Tags

Route:

- `/app/taxonomies?taxonomyBranch=tags`

Goal:

- create 10 tags

Tags used in the journey:

1. `nuli-sunrise`
2. `nuli-soft-light`
3. `nuli-routine`
4. `nuli-park`
5. `nuli-sniffing`
6. `nuli-comfort`
7. `nuli-health`
8. `nuli-portrait`
9. `nuli-window`
10. `nuli-walks`

Safe creation method:

- create them one by one unless batch creation has already been verified in your current build

Steps:

1. Click `New Tag`.
2. Fill:
   - `Name`
   - `Color` if desired
   - `Visibility`
   - `Description`
   - `SEO Title`
   - `SEO Description`
3. Click `Create Tag`.
4. Repeat for the remaining 9 tags.

Verification:

- the roster table shows all 10 tags
- sorting and pagination remain in the URL

## Posts

Route:

- `/app/posts`

Goal:

- reach 20 published posts
- each post should have:
  - 1 author
  - 2 categories
  - 2 tags
  - 2 media items

Important truth:

- the workspace already contained seeded posts
- the journey used a mixed strategy:
  - create new posts where needed
  - normalize seeded posts so the final backlog met the requirement

New posts created during the journey:

1. `Nuli Journey Story 01`
2. `Nuli Journey Story 02`

Seeded posts normalized into the final published set included:

- `Remote Flow Review Post 01` through `Remote Flow Review Post 10`
- launch and rollout themed seeded posts already present in the backlog

### Create A New Post

1. Click `New Post`.
2. In the drawer, stay on `Story`.
3. Fill:
   - `Title`
   - `Subtitle`
   - `Excerpt`
   - `Body`
4. Switch to `Organize`.
5. Set:
   - `Primary Author`
   - `Categories`
   - `Tags`
6. Switch to `Media`.
7. Set:
   - `Featured Image`
   - `Social Image`
   - optional gallery items
8. Switch to `SEO`.
9. Fill:
   - `SEO Title`
   - `SEO Description`
   - `OG Title`
   - `OG Description`
10. Switch to `Publish`.
11. Set CMS status to `published`.
12. Save the post.

### Normalize An Existing Seeded Post

1. Search the post in the backlog table.
2. Click its row to open the drawer.
3. In `Story`, confirm title, excerpt, and body are acceptable.
4. In `Organize`, assign:
   - 1 author
   - 2 categories
   - 2 tags
5. In `Media`, assign:
   - featured image
   - social image
6. In `SEO`, fill any missing SEO fields.
7. In `Publish`, confirm the post is `published`.
8. Save.

### Useful Working Pattern

Because the final backlog target was `20`, the practical working loop was:

1. search for one post
2. open drawer
3. finish `Organize`
4. finish `Media`
5. finish `SEO`
6. set `published`
7. save
8. return to backlog
9. repeat

Verification:

- the backlog summary shows `Posts 20`
- the backlog summary shows `Published 20`
- each row can open:
  - the linked page
  - the live URL when available

## Layouts

Route:

- `/app/layouts`

Goal:

- create one layout with 3 columns, 2 rows, and 5 blocks

Layout used in the journey:

- title: `Nuli Editorial Grid`
- id after save: `pagelayo-002`

Steps:

1. Open `Layouts`.
2. Click the create entry point for a new layout.
3. Enter title:
   - `Nuli Editorial Grid`
4. Confirm or edit the generated key.
5. Use the canvas to build:
   - row 1 with 3 columns
   - row 2 with 2 columns
   - total 5 blocks
6. Save the layout.

Verification:

- the layout appears in the saved layouts library
- the canvas reflects the 3-column and 2-row structure

## Pages

Route:

- `/app/pages`

Goal:

- create 2 published pages using the new layout

Pages used in the journey:

1. `Nuli Post Page`
2. `Nuli Category Page`

### Post Page

Values used:

- title: `Nuli Post Page`
- layout: `Nuli Editorial Grid`
- page type: post detail / blog-post-backed template
- SEO title: `Nuli Post Page SEO`
- SEO description: `Post detail template for Nuli stories and launch notes.`
- OG title: `Nuli Post Page Social`
- OG description: `Read Nuli stories with the dedicated editorial grid post layout.`

### Category Page

Values used:

- title: `Nuli Category Page`
- layout: `Nuli Editorial Grid`
- page type: category detail / blog-category-backed template
- SEO title: `Nuli Category Page SEO`
- SEO description: `Category landing template for the Nuli content tree.`
- OG title: `Nuli Category Page Social`
- OG description: `Browse Nuli categories with the dedicated editorial grid layout.`

### Steps For Each Page

1. Click `New Page`.
2. In the first drawer step, choose the page type.
3. Continue to `Basics`.
4. Fill:
   - `Title`
   - path/pattern fields
   - linked layout
   - primary source type
5. Save the page.
6. Reopen the page.
7. In the drawer studio, go to `Basics` and confirm the page promise.
8. Go to `More`.
9. Fill SEO and social fields.
10. Save again.
11. Publish the page.

Verification:

- both pages appear in the backlog
- `Open Live` becomes available after release

## Deployments

Route:

- `/app/deployments`

Goal:

- create and run 2 release bundles

Bundles used in the journey:

1. `Nuli Posts Release Bundle`
2. `Nuli Categories Release Bundle`

### Posts Bundle Values

- release name: `Nuli Posts Release Bundle`
- page: `Nuli Post Page`
- posts data target: `Posts Projection`
- categories data target: `Categories Projection`
- tags data target: `Tags Projection`
- media library target: `Media Library`
- public HTML target: `Public HTML`
- public delivery: `Public Delivery`

### Categories Bundle Values

- release name: `Nuli Categories Release Bundle`
- page: `Nuli Category Page`
- categories data target: `Categories Projection`
- tags data target: `Tags Projection`
- media library target: `Media Library`
- public HTML target: `Public HTML`
- public delivery: `Public Delivery`

### Bundle Creation Steps

1. Open `Deployments`.
2. Go to `Advanced`.
3. Open `Release Recipe`.
4. Click the create entry point for a new bundle.
5. Fill the release name.
6. Select the page the bundle owns.
7. Select the required data targets.
8. Select the media target.
9. Select the public HTML target.
10. Select the public delivery target.
11. Save the recipe.
12. Repeat for the second bundle.

### Release Steps

1. Return to `Release`.
2. Select `Nuli Categories Release Bundle`.
3. Review:
   - what will refresh
   - output links
4. Click the main release action.
5. Wait until the success status appears.
6. Confirm the route reports completion.
7. Repeat for `Nuli Posts Release Bundle`.

Expected release behavior:

- local HTML sync
- posts/categories/tags compare and sync
- media compare and sync
- public HTML compare and sync

## Remote Verification

Goal:

- open remote deployed pages and confirm:
  - SEO tags
  - content JSON
  - layout JSON
  - media references

Verified remote post URLs during the journey included:

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

For each page:

1. Open the URL in the browser.
2. View source or inspect the head.
3. Confirm:
   - SEO title
   - SEO description
   - OG tags
4. Inspect `#page-data`.
5. Confirm:
   - post content data exists
   - page id is the expected page
   - layout id is the expected layout
6. Confirm the featured media or referenced media URL exists in the payload.

## Remote Comment Submission

Goal:

- submit 2 comments from the deployed page

Remote page used:

- `https://storage.googleapis.com/merchant-guild-dev-deployment-679134333951/site/post/remote-flow-review-post-01/index.html?appTester=1`

Steps:

1. Open the remote page.
2. In the tester or comment area, find the comment submit controls.
3. Enter the first comment:
   - display name: choose a human-readable name
   - email: a valid email
   - body: first review comment body
4. Submit.
5. Wait for the success result.
6. Repeat for a second comment.

Documented successful remote comment ids from the journey:

1. `n9L6Bf50IYYUumEijU8f`
2. `7cDOEk6UautaZ42HrRG3`

## Local Comment Verification

Route:

- `/app/comments`

Goal:

- confirm the new remote comments are visible in the moderation queue

Steps:

1. Return to the local app.
2. Open `Comments`.
3. Search by:
   - author display name
   - email
   - known text from the comment body
4. Confirm both comments appear in the queue.

If they do not:

- the product has a comment ingestion mismatch between the public deployed path and the local moderation desk
- that mismatch must be fixed in the product, not worked around by the operator

## Recommended Validation Checklist

Before declaring the journey complete, confirm:

1. 10 media items exist in `Media`.
2. 5 authors exist in `Authors`.
3. The category tree shows the intended nested branch.
4. 10 tags exist in `Tags`.
5. `Posts` shows `20` total and `20` published.
6. `Layouts` contains `Nuli Editorial Grid`.
7. `Pages` contains:
   - `Nuli Post Page`
   - `Nuli Category Page`
8. `Deployments` contains:
   - `Nuli Posts Release Bundle`
   - `Nuli Categories Release Bundle`
9. At least 10 remote post URLs open.
10. Remote pages show:
   - SEO tags
   - content data
   - layout data
   - media references
11. 2 remote comments can be submitted.
12. Those comments appear in the local `Comments` desk.
