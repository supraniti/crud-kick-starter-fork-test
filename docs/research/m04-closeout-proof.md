# M04 Closeout Proof

## Scope
- Date: `2026-03-15`
- Goal:
  - exercise the current north-star slice end to end on the live local app and the real `merchant-guild` GCP project
- Status:
  - completed

## Remote Baseline
- Connection:
  - `remoteco-012`
  - `Connection test`
  - service account: `merchant-guild@appspot.gserviceaccount.com`
  - project: `merchant-guild`
- Managed targets used:
  - posts projection: `remoteta-003`
    - Firestore path: `publishedPosts`
  - categories projection: `remoteta-016`
    - Firestore path: `publicCategories`
  - tags projection: `remoteta-017`
    - Firestore path: `publicTags`
  - deployment storage: `remoteta-018`
    - bucket: `merchant-guild-dev-deployment-679134333951`
    - prefix: `site`
  - media storage: `remoteta-019`
    - bucket: `merchant-guild-dev-media-679134333951`
    - prefix: `library`
  - browser delivery: `remoteta-020`
    - access mode: `gcp-temporary`
    - stack mode: `direct-storage`
    - dns mode: `external`

## Seeded Content Cohort
- Published posts:
  - `blogpost-005` through `blogpost-014`
  - final published count: `10`
- Archived out of the release cohort:
  - `blogpost-015`
  - `blogpost-016`
  - `blogpost-017`
  - `blogpost-018`
- Categories bound across the cohort:
  - `blogcate-001` through `blogcate-010`
- Tags bound across the cohort:
  - `blogtags-001` through `blogtags-010`
- Media created for the closeout:
  - `mdi-005` through `mdi-014`
  - display names:
    - `M04 Closeout Media 01`
    - `M04 Closeout Media 02`
    - `M04 Closeout Media 03`
    - `M04 Closeout Media 04`
    - `M04 Closeout Media 05`
    - `M04 Closeout Media 06`
    - `M04 Closeout Media 07`
    - `M04 Closeout Media 08`
    - `M04 Closeout Media 09`
    - `M04 Closeout Media 10`

## Page And Bundle Contract
- Post page:
  - `blogpage-013`
  - title: `M04 North Star Post Page`
  - `primarySourceType = blog-post`
  - `path = /post`
  - `pathPattern = /post/{slug}`
  - published
- Category page:
  - `blogpage-014`
  - title: `M04 North Star Category Page`
  - `primarySourceType = blog-category`
  - `path = /category`
  - `pathPattern = /category/{id}`
  - published
  - extra page data source:
    - `posts-by-category`
    - bound as `categoryPosts`
- Release bundles:
  - `pagedepl-001`
    - `M04 Posts Release Bundle`
  - `pagedepl-002`
    - `M04 Categories Release Bundle`

## Exercised Flow
1. Recovered the real service-account credential copy for `remoteco-012`.
2. Revalidated the live GCP connection.
3. Provisioned the missing dev deployment/media buckets.
4. Bound product module settings to the managed target bundle.
5. Normalized the release cohort to exactly `10` published posts.
6. Created `10` closeout media items and assigned one unique media item to each post.
7. Assigned one category and one tag per published post across the `001..010` taxonomy range.
8. Created and published the post and category per-record pages.
9. Created the two named release bundles.
10. Ran both release pipelines end to end.
11. Verified local deployment output, remote projections, remote storage sync, page delivery payloads, and temporary-access retrieval.

## Release Results
- `pagedepl-001` `M04 Posts Release Bundle`
  - completed
  - step count: `12/12 success`
  - local HTML synced
  - posts projection synced
  - categories projection synced
  - tags projection synced
  - media synced
  - HTML deployment synced
  - browser-delivery validation succeeded
- `pagedepl-002` `M04 Categories Release Bundle`
  - completed
  - step count: `12/12 success`
  - second pass verified the projection/media targets were already clean
  - category HTML fan-out synced

## Local Output Proof
- Post outputs:
  - [deployment/post/remote-flow-review-post-01/index.html](C:/Users/cmsin/2026/crud-kick-starter-fork-test/deployment/post/remote-flow-review-post-01/index.html)
  - [deployment/post/remote-flow-review-post-10/index.html](C:/Users/cmsin/2026/crud-kick-starter-fork-test/deployment/post/remote-flow-review-post-10/index.html)
- Category outputs:
  - [deployment/category/blogcate-001/index.html](C:/Users/cmsin/2026/crud-kick-starter-fork-test/deployment/category/blogcate-001/index.html)
  - [deployment/category/blogcate-010/index.html](C:/Users/cmsin/2026/crud-kick-starter-fork-test/deployment/category/blogcate-010/index.html)
- Local media:
  - [mdi-005-m04-closeout-media-01.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/media/originals/mdi-005-m04-closeout-media-01.png)
  - [mdi-014-m04-closeout-media-10.png](C:/Users/cmsin/2026/crud-kick-starter-fork-test/media/originals/mdi-014-m04-closeout-media-10.png)

## Delivery And Runtime Proof
- Post delivery resolve route used for proof:
  - `/api/reference/modules/test-modules-pages/delivery/resolve?path=/post/remote-flow-review-post-01`
- Verified delivery payload now emits:
  - `accessMode = gcp-temporary`
  - `publicOrigin = null`
  - signed `publicUrl` for the deployed HTML object
  - signed media `temporaryUrl` values
  - signed `head.canonicalUrl`
  - signed `head.openGraph.imageUrl`
- Important rule:
  - `gcp-temporary` no longer claims a stable public origin
  - it yields signed object URLs for private GCS objects

## External Retrieval Proof
- Verified by direct external request:
  - signed post page URL returned `200`
  - signed media URL returned `200`
- Sample verified status snapshot:
  - page:
    - `StatusCode = 200`
    - `ContentType = application/octet-stream`
  - media:
    - `StatusCode = 200`
    - `Length = 68`

## Remote Inspection Links
- Firestore:
  - `https://console.cloud.google.com/firestore/databases/-default-/data?project=merchant-guild`
- Deployment bucket:
  - `https://console.cloud.google.com/storage/browser/merchant-guild-dev-deployment-679134333951?project=merchant-guild`
- Media bucket:
  - `https://console.cloud.google.com/storage/browser/merchant-guild-dev-media-679134333951?project=merchant-guild`

## Regeneration Paths
- To regenerate a current public page URL:
  - call Pages delivery resolve for a concrete path, for example:
    - `/api/reference/modules/test-modules-pages/delivery/resolve?path=/post/remote-flow-review-post-01`
- To regenerate a current public category URL:
  - `/api/reference/modules/test-modules-pages/delivery/resolve?path=/category/blogcate-001`
- To regenerate current public media URLs:
  - inspect the `media.items[*].temporaryUrl` descriptors in the same delivery payload

## Closeout Result
- The current M04 slice now proves the full bounded chain:
  - local authored content
  - local page fan-out
  - bundle-based release
  - Firestore projection
  - remote media sync
  - remote HTML sync
  - temporary browser-facing access through clean GCP provider URLs backed by public-readable deployment/media buckets
