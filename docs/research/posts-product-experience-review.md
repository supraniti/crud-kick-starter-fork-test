# Posts Product Experience Review

## Research Basis
This review is based on:
- the current posts story:
  - [04-posts.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/product-stories/04-posts.md)
- the author story and author desk as the stronger current reference:
  - [01-authors.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/product-stories/01-authors.md)
  - [AuthorDeskView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-editorial/frontend/AuthorDeskView.jsx)
  - [AuthorDeskPanels.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-editorial/frontend/AuthorDeskPanels.jsx)
- the current posts implementation in the worktree:
  - [BlogContentView.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentView.jsx)
  - [BlogContentPanels.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentPanels.jsx)
  - [BlogContentEditorPanel.jsx](C:/Users/cmsin/2026/crud-kick-starter-fork-test/modules/test-modules-content/frontend/BlogContentEditorPanel.jsx)
- live browser inspection on `http://localhost:3000/app/posts`
- a live create-post flow on `http://localhost:3000/app/posts?postMode=create&postsSection=authoring&postEditorSection=writing`
- captured research artifacts:
  - `C:\Users\cmsin\2026\crud-kick-starter-fork-test\.codex-runtime\posts-desk-current.png`
  - `C:\Users\cmsin\2026\crud-kick-starter-fork-test\.codex-runtime\posts-desk-current.snapshot.txt`

## The Review Story
The user enters the system and looks to the left. The sidebar feels like a publication control center. Each module has a name and an icon that tells the user what kind of work lives there. The user picks `Posts` because this is the desk where stories are actually shaped and sent toward publication.

On the posts page, the first thing the user sees is a real editorial roster. It looks like a publication desk, not a generic content registry. The list is a table because the user needs to scan many stories quickly. Titles are prominent. Status is obvious. The author is visible. The primary category is visible. The user can see when a post is scheduled, when it was last changed, whether it is ready, and whether it is already live or still waiting for release.

The table does not dump every internal detail on the screen. It shows what an editor actually needs in order to make decisions. One row should tell the user enough to answer practical questions: What is this story? Who owns it? Is it ready? Is it published? Is it live? Does it still need media or SEO? If the post already has a public page or output, there should be a direct link right there in the row or in a nearby action. If it still needs deployment, the table should say that plainly.

The user can paginate the roster. They can search it, filter it, and sort it. They can narrow it to drafts, in-review stories, scheduled stories, published stories, archived stories, one author, one category, one tag, stories missing images, stories missing SEO, stories not yet live, and stories that are already available to the public. When the user refreshes, nothing is lost. The exact list state survives because search, filters, pagination, sort order, and the open story all belong to the URL.

The user can do bulk work from the roster. They can select several posts and archive them together, restore them together, or delete drafts that should not exist anymore. These bulk actions are visible, deliberate, and safe. If the operation is risky, the screen says so before it happens.

When the user clicks a row, the posts desk shifts into an editing experience designed for writing. This is the most important difference between Posts and lighter desks such as Authors. The post body is not a side field. It is the heart of the screen. The user should feel like they have entered a writing desk. The title, subtitle, excerpt, and body live together in a calm center. The user can stay focused there for a long time without feeling drowned in little controls.

The rest of the post still matters, but it should arrive at the right time and in the right place. The author, co-authors, categories, tags, featured image, gallery, comment policy, publish timing, SEO, and social metadata are all close enough to support the writing flow. They are not scattered into other modules, and they are not dumped all at once in a way that competes with the writing surface. The screen should feel ordered.

Media selection should feel natural here. If the user wants to add a featured image, they open a gallery widget. They can browse visually. They can choose an existing image. If the correct image is missing, they can upload it right there from the file system and continue without leaving the post. The same flow should work for the social image and the gallery. The user should never feel that media is a separate technical chore.

Relationships should also feel visible and meaningful. If the user assigns an author, they should immediately understand which person is attached to the story. If they choose categories and tags, they should understand the organizational shape of the post. If there is a prepared public page for this post, they can jump to it directly. If there is no page yet, that is obvious. If the post is published in the CMS but not yet live on the web, that difference is clearly visible.

Saving should feel safe and fast. The user saves the post and gets a clear success or failure signal. If the form is invalid, the problem is shown where it happened and saving is blocked. If the title or slug collides in a way that breaks the editorial model, the user learns that before the save completes. If the body is too thin, if required taxonomy is missing, if the story has no image, or if SEO is incomplete, the desk says so in plain language.

Revision history should be trustworthy. The user can inspect earlier versions, understand what changed, and restore a revision without feeling like they are taking a blind risk. If a revision is restored, the desk should make the action feel precise and reversible, not dramatic.

The publishing path should feel humane. The user sees the difference between:
- saved locally in the CMS
- published in the CMS workflow
- actually live through a page and a deployment

That distinction matters. A user should never have to guess whether a story is only saved, officially published, prepared for a page, synced remotely, or really live for readers.

When the posts desk is right, a user can spend real editorial time there. They can scan the story backlog, open one story, write, enrich it with media and taxonomy, save it, publish it, inspect its public outcome, and move to the next story without feeling like they are wrestling the system.

## What The Current Desk Still Gets Wrong
1. It is still too eager to expose system state before editorial intent.
- The user sees summary cards, projection state, release posture, and many filters before they feel the post workflow itself.
- The screen explains system structure faster than it supports writing.

2. The roster is stronger than before, but it is not yet a great editorial table.
- It still misses some of the most practical columns and actions an editor would expect.
- It does not yet feel like a place to manage many stories over time.
- There is no true bulk workflow on posts yet.
- There is no row-level direct public link/action in the roster itself.

3. The writing desk still reads too much like a rearranged settings form.
- The body is visible, which is better, but the surrounding experience is still too abstract.
- Terms like `Publishing Basics`, `Public Outcome`, and readiness chips still feel like internal tooling language more than editorial language.
- The user is still being asked to interpret the system instead of simply writing and publishing.

4. The distinction between needed and unneeded information is still off.
- Some operational information arrives too early.
- Some essential editorial cues are still too weak.
- Example: who the assigned author really is, whether the story already has a public page, whether a live URL exists, and what exact next step is needed are still not surfaced in the clearest possible way.

5. The create-post flow still feels thin at the moment of creation.
- The user clicks `New Draft` and lands in a mostly empty form with system-oriented side information.
- The screen does not yet guide the user through the first decisions in a particularly humane way.
- It does not yet feel like the system is helping them start a story.

6. The release context is still too module-shaped.
- The information exists, but the flow is still oriented around internal concepts such as projection targets and page impact panels.
- That may be correct internally, but it is not yet translated into the clearest product language.

7. The desk still lacks one obvious rhythm.
- The best desks have a very clear answer to: what do I do first, what do I do next, and what do I do when I am done?
- Posts still feels like several reasonable surfaces placed together, not yet one unmistakable editorial rhythm.

## What The Authors Desk Gets Right That Posts Still Does Not
1. Authors has one job.
- The author roster feels like a roster.
- The edit drawer feels like editing a person.
- The desk does not compete with itself.

2. Authors preserves list context better.
- The roster remains the anchor.
- Editing happens in a drawer, not as a parallel competing surface.

3. Authors shows relationship counts in a useful way.
- The user can see post counts and jump to related work.
- Posts does not yet express its own relationships with the same clarity.

4. Authors feels more deliberate about what belongs on the main screen.
- Posts is still over-explaining system mechanics.

## Product Direction Implied By This Review
The Posts desk should probably split more clearly into two modes:
1. editorial roster mode
- scan, search, filter, sort, bulk manage, jump to live output
2. writing mode
- focused story editing with supportive context and minimal operational noise

That does not mean separate products. It means a stronger editorial rhythm.

The desk should answer these questions without effort:
- Which stories need me right now?
- Which stories are blocked, and by what?
- Which story is open?
- What is the next meaningful thing to do on it?
- Is it only saved, published, or truly live?
- Can I get to the live page immediately?

## Standard For The Next Implementation Pass
The next Posts pass should not be another styling pass.
It should be a product-structure pass.

Success means:
- the roster feels like a newsroom backlog
- opening a post feels like entering a writing desk
- the user can understand saved vs published vs live without translation
- media, taxonomy, and SEO support the story without overwhelming it
- the desk finally feels like one place to manage post work instead of a set of connected panels
