# UI Journey Documentary - 2026-03-22

## Mission
- Create media, authors, taxonomies, posts, layout, pages, publish/deploy, validate remote pages, add remote comments, and confirm comments in the local app.
- Constraint: all product actions must be done through the UI only.

## Journey Log

### Step 1 - Environment And Entry
- The app was already up and `review:env:verify` passed.
- Entered the app at `System Settings` because the current session restores the last route instead of landing on a neutral home screen.
- First impression: the session continuity is useful, but a first-time user could be mildly confused by landing mid-flow instead of on a clear home desk.
- Media source folder resolved to `C:\Users\cmsin\OneDrive\שולחן העבודה\Nuli2024`.

### Step 2 - Uploading Media
- I started in `Media` because later author and post flows need assets to exist first.
- The first visit showed a blocking alert: `Collection 'media-items' is unavailable.`
- A hard refresh fixed it immediately, which strongly suggests a route/bootstrap race instead of a true module outage.
- I then uploaded ten distinct source files from `Nuli2024` through the visible upload controls only.
- Distinct uploaded source names observed in the grid:
  - `20160214_201413-COLLAGE`
  - `20160226_152936`
  - `20160228_115605`
  - `20160308_105947-COLLAGE`
  - `20160309_132441`
  - `20160323_155204`
  - `20160330_135443`
  - `20160825_081617`
  - `20160927_110005(0)`
  - `20170709_163840`
- What worked:
  - the upload controls are discoverable
  - the grid updates without leaving the page
- What failed or confused me:
  - the upload flow appears to create duplicate media rows for several uploads
  - after upload, the asset editor kept focusing an older image instead of the newly uploaded one
  - at least one upload operation reported failure in the automation tool while the UI still created the new row, which points to an inconsistent upload trigger contract in the page
- User-level conclusion:
  - the library is functional, but the upload UX is not trustworthy enough yet. A user can continue, but they cannot be confident that one upload equals one created item.
