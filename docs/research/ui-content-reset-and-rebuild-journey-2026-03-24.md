# UI Content Reset And Rebuild Journey - 2026-03-24

## Mission
- clean old hand-made test content from the app
- create a fresh content set through the UI
- predict deployed page behavior before release
- deploy and compare actual behavior against that prediction

## Operating Constraints
- all content work is performed through the app UI
- no commit is made during this mission
- notes below are written from the perspective of a first operator moving through the system

## Step Log

- Verified the local app first with `pnpm review:env:verify` before touching content.
- Opened `Posts` and immediately found the active backlog still full of old launch/test stories. The table showed 20 published posts with names such as `Launch Window Update`, `Launch Rollout Story`, and many numbered variants. This made the cleanup target obvious.
- Opened `Authors` next. The roster showed 23 authors, many of them clearly synthetic proof records: `Alice Stone 989550`, `Author 361989`, `Deployment Editor`, `Distribution Editor 928325`, `Nuli Journey Editor`, and similar one-off names. The desk is usable for cleanup because it supports per-row delete and bulk selection.
- Opened `Taxonomies` in `Categories`. The tree showed a mixture of old Nuli branches, numbered release branches like `Releases 928325`, and a leftover temporary branch `Tmp Root 1774211121`. This confirmed the category structure also needs a deliberate reset.
- Opened `Taxonomies` in `Tags`. The roster showed 25 public tags, including `nuli-soft-light`, `nuli-routine`, and several numbered `Platform` tags. Again, clearly a test dataset.
- Opened `Media`. The library showed 25 assets with obvious duplication and proof leftovers. Several names are duplicated, and older proof assets like `M04 Closeout Media 01` are still mixed in with the Nuli uploads.
- Opened `Pages`. This exposed the first product inconsistency of the journey: the Pages desk currently reports `0` pages even though Layouts still shows page usage. From an operator perspective this is confusing because the product suggests no pages exist while other surfaces disagree.
- Opened `Layouts`. The route confirmed three saved layouts are still around: a malformed `Home Shell...` entry, `Nuli Editorial Grid`, and `Widget Story Shell`. The malformed repeated title is another sign that old testing data and newer builder changes have drifted.
- Cleanup conclusion before taking action: the current content set is not worth preserving as-is. The system needs a fresh editorial set with coherent naming, controlled media, clean taxonomy, and pages/layouts that can be assessed as a real publication rather than as layered proof artifacts.
- Began cleanup from the Posts roster because it is the strongest desk for bulk operations.
- Selected the first eight visible launch/test posts manually through the roster checkboxes and ran `Archive Selected`.
- Result:
  - the action succeeded and showed `Selected posts archived`
  - several records immediately changed from `published / Published in CMS` to `archived / Working draft / No page linked / Local Only`
- The cleanup also exposed a usability gap: the roster continues to mix archived and published items in the same default view after the action, so the operator has to keep steering the backlog manually instead of getting a cleaner post-action state.

- Category creation hard-blocked in the first pass: opening the drawer was fine, but typing into it collapsed the screen into a blank shell. After switching the review environment from stale xisting-dist to ite-dev, the real error became visible: a React maximum-update-depth loop in the taxonomy workspace. I paused the UI journey there and fixed the desk before continuing, because category creation is foundational for the rest of the mission.
- Environment lesson reaffirmed: when a UI bug shows only a minified React code in the review app, the right move is to restart the review environment in ite-dev mode. That matches our earlier lessons learned and immediately turned the blind error token into a usable diagnosis.
- After the taxonomy patch, the category drawer stayed open under real typing again, so the journey could continue from the UI instead of being blocked by authoring instability.

- The fixed category drawer is usable again, but the parent selector is still clumsy in practice. A simple root category create worked cleanly, but creating a child category required more than one interaction pattern. The operator intention is straightforward (choose Dispatch Notes as parent), while the actual control still feels brittle and easy to dismiss accidentally.

- Another friction point showed up in the category hierarchy flow: the parent chooser behaves more like a fragile overlay than a confident form control. Selecting a parent does work, but the control offers weak closure cues and makes it harder than necessary to know whether the choice has truly stuck before saving.

- Child-category save feedback is still incoherent. At least one attempt appeared to create the record, but the drawer did not close deterministically, and a follow-up validation state surfaced a duplicate-slug message instead of a clean success handoff. From an operator standpoint, that is confusing: the system may already have persisted the item, but the UI makes it feel like a failure.

- At this point the taxonomy journey split into two separate operator questions: Did the save fail? and Did the tree simply fail to reflect the saved hierarchy cleanly? I used the desk search as the fastest truth check because the tree itself was no longer a reliable immediate signal.
- Resumed the journey only after checking the review environment state directly. The important detail was not just that the app answered, but that it was running in `vite-dev` rather than the stale static `existing-dist` mode that had previously hidden real React errors behind minified tokens.
- Re-entered `Authors` and searched for `Nuli` to see what the interrupted pass had already left behind. This immediately clarified that the content reset is no longer a blank slate: there is already a partial fresh people set (`Maya Nuli`, `Nuli Journey Editor`, `Nuli Health Notes`, `Nuli Morning Voice`, `Nuli Park Guide`, and several `Nuli Journal` variants). From an operator point of view, this matters because the right move is now to normalize and complete that set, not to keep creating more near-duplicates.
- Returned to `Taxonomies -> Categories` with the fixed drawer. The tree is still visually noisy because old release branches remain mixed with the cleaner Nuli structure. The tree now stays interactive, but the content problem has shifted: the UI is no longer crashing, yet the hierarchy still carries old numbered branches whose attached archived posts keep the structure feeling contaminated.
- Opened `Releases 928325` in the category dialog to test whether true cleanup is possible. The result is encouraging: the desk does expose a direct `DELETE` action on categories. The harder issue is sequencing. Several of the old branches still show attached posts, so category cleanup is downstream of post cleanup if the operator wants the tree to become truly clean rather than cosmetically rearranged.
- Returned to `Posts` to check that assumption. The backlog now shows `Posts 20`, all archived, which means the earlier bulk archive pass succeeded but did not produce real database cleanup. The old proof stories are no longer live, but they still exist and still leak into author/category counts. From a user perspective, this is the difference between hiding clutter and actually removing it.
- Opened one archived Nuli post in the right-side post desk. The desk is solid for editing, but it still does not make destructive cleanup obvious. The primary actions are `Save Post`, `Submit For Review`, and `Publish`; delete is not surfaced where the operator naturally expects it while cleaning a backlog. That is another product gap the journey needs to keep calling out honestly.
- The post desk finally yielded one dependable end-to-end recipe: create a brand-new draft, write the story first, assign at least one category, save it once so it becomes a real record, then add media and SEO, then move it through `Submit For Review` and only then `Publish`. Anything that skips those order constraints feels brittle.
- I proved that recipe with `First Cup On The Table`. Through the UI only, I created the draft, assigned `Maya Nuli`, selected `Home Corners`, tagged it `nuli-comfort`, attached fresh uploaded media, filled SEO fields, submitted it for review, and published it. The backlog now shows it as `published`, with a real live route prepared at `/post/first-cup-on-the-table`.
- I repeated the same pattern with `Park Bench Weather Log`. This time the post used `Nuli Park Guide`, category `Park Walks`, tag `nuli-park`, and a different pair of fresh media assets. That second pass confirmed the recipe was not a fluke. The backlog now shows two truly fresh published posts.
- The most valuable usability discovery in this stage is that the product does have a coherent publish state machine, but it teaches that state machine by rejection instead of by guidance. The operator learns the flow only after seeing failures such as `Post cannot transition from 'draft' to 'published'` and `Post cannot transition from 'archived' to 'published'`.
- Another important finding: fresh drafts are much safer than recycled archived records. When I tried to repurpose `Dawn At The Window`, changing its status from `archived` in the drawer was visually possible, but the transition would not persist back into the backlog. In contrast, brand-new drafts moved through `draft -> in-review -> published` reliably. So the system currently favors clean creation over archival recovery.
- The first successful post also revealed a useful product-side signal: once published, the desk immediately showed `OPEN LIVE PAGE` and linked the record to `M04 North Star Post Page`, but still marked it `Missing Outputs`. That is good feedback for release readiness, and it gives a precise next step instead of a vague success state.

- Returned to `Authors` to continue cleanup from the real product surface instead of leaving the earlier audit theoretical. Searching for `Author` immediately isolated the numbered proof records and temporary debug author. Bulk selection plus `DELETE SELECTED` worked, but only partially: five low-risk proof authors were deleted, while four records remained because they still owned old draft posts. This is honest cleanup progress, but it also exposes the product dependency chain clearly. People cleanup is blocked by leftover post ownership, not by roster capability alone.
- Returned to `Taxonomies -> Categories` again after the author cleanup. The desk is stable enough to browse now, but the tree still shows structural contamination: clean Nuli branches such as `Nuli Places -> Home Corners / Park Walks` live alongside old release branches such as `Releases 326301`, `Releases 361989`, and `Guides 989550`. From an operator perspective the category tree is no longer crashing, but it is still not actually clean.
- Opened `Media` and used the upload flow for genuinely fresh library assets. Because the browser automation bridge cannot browse the native file picker without an exact path, I had to inspect the desktop folder location to continue the UI journey. That is not a content API shortcut; it is a limitation of the automation harness itself, and it belongs in the documentary because a real operator would not need that detour.
- Confirmed two fresh uploads cleanly in the library:
  - `20231215_132221`
  - `20230822_113914`
- A third upload (`20240104_192059(0)`) was accepted by the browser bridge, but the library did not surface it clearly in the visible gallery slice afterward. That is another desk-level usability problem: upload acknowledgment is weaker than the operator needs when the library is already busy.
- Tried to continue the fresh-post set with a new story, `Rain On The Window Rail`, and hit the same drawer fragility uncovered earlier in the mission. Direct field fill spilled text across neighboring inputs. Then the long body input jammed the browser automation session badly enough that the DevTools tab had to be recovered. The unsaved draft was lost. This is exactly why the documentary keeps emphasizing that the stable creation recipe is not just a preference, it is a survival rule.
- At that point I made a pragmatic mission decision: stop gambling on more fragile long-form drafts and use the two already clean published posts as the comparison set for the page/layout/release phase. That keeps the mission moving while staying honest about where the product becomes unreliable.
- Returned to `Pages` and reopened the post templates. This is where the comparison target became concrete:
  - `M04 North Star Post Page` stayed on `/post/{slug}`
  - `Nuli Post Page` was reassigned to `/journal/{slug}`
- Inside `Nuli Post Page`, changed the layout record from `Nuli Editorial Grid` to `Widget Story Shell`. After save, the workbench finally surfaced the useful widget compatibility view instead of the earlier generic warning. This was the first point in the whole journey where the page/layout/widget system felt internally coherent.
- Opened the `Preview` tab for `Nuli Post Page` and used it as the pre-release truth source. The preview resolved against `First Cup On The Table` and clearly showed what the custom page was supposed to publish:
  - path pattern `/journal/{slug}`
  - public URL `https://fastcart.dev/journal/first-cup-on-the-table`
  - widget-authored layout with breadcrumbs, post title, featured media, category chips, author card, a static library image, story body, tabs, adjacent navigation, and related stories
- Opened `Layouts` directly on `Widget Story Shell` to make sure the custom route also used one of the truly new uploads rather than only older proof images. Edited the `Static Library Media` block and switched its library source from `mdi-015` to `20231215_132221` (`library:mdi-042`). The selected-node detail surface reflected that new media binding immediately, which is the clearest proof that the layout now incorporates the fresh asset set.
- Entered `Deployments` only after the page contracts looked sane. The release room was much calmer than the content desks. It already separated the two post bundles:
  - `M04 Posts Release Bundle` for `/post/{slug}`
  - `Nuli Posts Release Bundle` for `/journal/{slug}`
- Pre-release prediction before pressing release:
  - `/post/{slug}` should behave as the predefined post surface
  - `/journal/{slug}` should behave as the custom widget-authored post surface
  - initial load on either route should fetch one HTML document, the shipped reader assets, and then only the additional JSON needed after first paint
  - same-app navigation from post to post or post to category should not fetch a second HTML document; it should use JSON only and update the URL/history
  - category and breadcrumb links should stay on `fastcart.dev`
  - comments should appear through their own secondary read, not block first render
- Ran `M04 Posts Release Bundle`. The release succeeded and the room showed a complete progress audit:
  - posts projection sync
  - categories projection sync
  - tags projection sync
  - media sync
  - HTML deployment
  - browser-delivery validation
- Ran `Nuli Posts Release Bundle` immediately after. That release also completed cleanly and the bundle card changed to `Current`.

## Deployment Comparison

### Predicted Reader Transport
- first page load:
  - one HTML document
  - shipped reader/runtime assets
  - image/media requests needed for the first screen
  - secondary reader data fetched after paint
- post -> post navigation:
  - no second HTML document
  - JSON only for the next route
- post -> category navigation:
  - no second HTML document
  - JSON only for the next route

### Actual Deployed Result
- checked predefined route:
  - `https://fastcart.dev/post/first-cup-on-the-table`
- checked custom route:
  - `https://fastcart.dev/journal/first-cup-on-the-table`
- checked predefined same-app navigation:
  - `https://fastcart.dev/post/first-cup-on-the-table`
  - then `https://fastcart.dev/post/park-bench-weather-log`
  - then `https://fastcart.dev/category/park-walks`

### Actual Network On `/post/first-cup-on-the-table`
- document:
  - `GET https://fastcart.dev/post/first-cup-on-the-table`
- runtime assets:
  - `client-runtime.global.js`
  - `page-application-tester-firestore.global.js`
  - `page-application-tester-support.global.js`
  - `page-application-tester.global.js`
- media:
  - featured image
  - static library image
- follow-up:
  - `GET https://page-public-api-55mmummvaa-uc.a.run.app/reader/deferred?path=%2Fpost%2Ffirst-cup-on-the-table`
- extra noise:
  - `GET https://fastcart.dev/favicon.ico` returned `404`

### Actual Network On Same-App Navigation
- post -> post:
  - `GET /reader/bootstrap?path=%2Fpost%2Fpark-bench-weather-log`
  - `GET /reader/deferred?path=%2Fpost%2Fpark-bench-weather-log`
  - no second HTML document fetch
- post -> category:
  - `GET /reader/bootstrap?path=%2Fcategory%2Fpark-walks`
  - `GET /reader/deferred?path=%2Fcategory%2Fpark-walks`
  - no second HTML document fetch

### Actual Network On `/journal/first-cup-on-the-table`
- document:
  - `GET https://fastcart.dev/journal/first-cup-on-the-table`
- runtime assets:
  - `client-runtime.global.js`
  - `page-application-tester-firestore.global.js`
  - `page-application-tester-support.global.js`
  - `page-application-tester.global.js`
- media:
  - featured image
  - static library image `20231215_132221`
- follow-up:
  - `GET https://page-public-api-55mmummvaa-uc.a.run.app/reader/deferred?path=%2Fjournal%2Ffirst-cup-on-the-table`
  - returned `404`

### Predicted Vs Actual
- Prediction confirmed:
  - same-app navigation on the deployed reader does avoid refetching HTML and uses JSON-only route hydration
  - category links and breadcrumb links stay on `fastcart.dev`
  - the custom route really does render the widget-authored library image after the layout change
- Prediction partially failed:
  - the custom `/journal/...` route cannot complete its second-tier load because `reader/deferred` returns `404`
  - the predefined `/post/...` route does not behave consistently across records
  - comments do not behave as predicted on either route

## What The Two Post Surfaces Actually Look Like

### Custom `/journal/...` Route
- rendered as the widget-authored story shell
- visible pieces:
  - breadcrumbs
  - H1 title
  - featured image
  - category chips
  - author card
  - static library image from the fresh upload
  - body/excerpt/tab section
  - comments form
- broken pieces:
  - adjacent stories stays on `Loading adjacent stories...`
  - related stories stays on `Loading related stories...`
  - root cause visible in network: deferred reader endpoint `404`

### Predefined `/post/...` Route
- mixed result
- on first hard load of `First Cup On The Table`, the route visually resembled the custom widget shell more than the expected older North Star presentation
- after same-app navigation to `Park Bench Weather Log`, the route resolved to a different, more classic post template structure with:
  - explicit blog-post meta
  - story section
  - categories/tags sections
  - adjacent navigation
  - author sidebar
- this means the so-called predefined route is not presenting a consistent single layout contract across the tested records

## Journey Summary
- The mission succeeded in producing a smaller, fresher live publication slice:
  - two clean published posts
  - a custom `/journal/{slug}` post page
  - a predefined `/post/{slug}` post page
  - a fresh custom-layout library image on the deployed custom route
- The mission did not succeed in fully cleaning the old dataset out of the database. The UI can archive and partially delete, but true cleanup is blocked by record ownership chains and by the lack of a strong destructive flow for posts and taxonomy cleanup.
- The release room is currently the strongest part of the product. Cleanup and authoring remain the weaker parts.

## What Is Going Well
- the review environment is dependable again once restarted in `vite-dev`
- the Posts desk can publish fresh drafts reliably if the operator follows the exact state-machine order
- the Pages workbench becomes useful once layout compatibility resolves
- the Layouts widget authoring surface is finally understandable when editing one concrete block at a time
- the Deployments room gives the clearest release feedback in the whole system
- same-app deployed navigation is working for the predefined route and is doing the right transport optimization

## What Is Failing
- full database cleanup is not realistically achievable from the current UI alone
- archived proof posts still poison author/category counts and cleanup dependencies
- author deletion is blocked by invisible relational cleanup work in posts
- category cleanup is still conceptually possible, but operationally poor because the tree remains mixed and branch-level deletion is downstream of post cleanup
- post draft entry remains fragile; long-form text entry can jam the session and lose the draft
- the custom `/journal/...` route is broken at the deferred reader layer (`404`)
- predefined `/post/...` rendering is inconsistent across records
- comments on `/post/...` remain stuck in `Loading comments...`

## What Is Not Performant
- public deployed pages still ship all three `page-application-tester*` assets on live reader routes; that is unnecessary weight for a real public page
- the deployed reader is still paying for a `favicon.ico` miss on `fastcart.dev`
- content cleanup requires too many manual passes across modules because counts and ownership do not reconcile quickly enough in one place
- authoring long story text through the post drawer is too fragile for confident sustained work

## What Is Not Acting As Expected
- Pages backlog `OPEN LIVE` forecasting stayed stale until after release and still favors poor sample records in some places
- the custom page preview was accurate, but the live custom page could not finish its secondary data load
- the predefined page contract did not stay visually stable from one post record to another
- media upload confirmation is weaker than it should be when the library is already populated
- layout node editing applies visibly, but the save lifecycle is still too opaque for operator confidence
