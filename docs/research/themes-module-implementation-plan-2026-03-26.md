# Themes Module Implementation Plan

## Intent
Implement a real Themes system that:
- owns reusable theme records
- resolves a global default vs per-page override
- injects the resolved theme into first-render page HTML
- lets the deployed reader apply the theme on initial load and same-app navigation

## Delivery Order
### Pass 1: Theme Authority
Build the new `Themes` module and seed five predefined themes.

Deliver:
- `test-modules-themes` module
- `page-themes` collection
- theme record schema
- seeded predefined themes
- one global default

Validation:
- module loads in navigation
- theme list is populated on first run
- exactly one theme is default global

### Pass 2: Theme Desk
Build the authoring desk with:
- theme list/sidebar
- editor panels for:
  - fonts
  - colors
  - typography
  - spacing
  - screen profile
- live preview

Validation:
- edit/save cycle works
- preview updates immediately

### Pass 3: Pages Integration
Replace raw `themeKey` text entry in Pages with real theme selection and inheritance messaging.

Deliver:
- `Use global default` vs `Select theme`
- theme option list from Themes module
- page draft/persist support

Validation:
- page can inherit default
- page can explicitly choose a theme

### Pass 4: Reader Theme Runtime
Resolve theme during page payload assembly and make the reader apply it.

Deliver:
- resolved theme document in page payload
- font declarations and CSS variables in reader
- reader-side reapply on same-app navigation

Validation:
- live page uses theme immediately
- post-to-post navigation preserves or switches theme correctly

### Pass 5: Responsive Theme Preview
Expose desktop/tablet/mobile preview toggles in Themes desk and map them to runtime tokens.

Validation:
- preview reacts to breakpoint switch
- theme overrides are represented in payload/runtime

## This Execution Turn
This turn will execute Pass 1 plus the minimum runtime seam for Pass 3/4:
1. create Themes module
2. seed five themes
3. wire Pages theme selection to real theme options
4. resolve page/global theme in page payload
5. make the reader consume resolved theme variables

That gives the feature a working vertical slice instead of just a desk with no public effect.

## Data Model
### Collection
`page-themes`

### Record Fields
- `title`
- `themeKey`
- `summary`
- `status`
- `isGlobalDefault`
- `themeDocumentJson`
- `createdOn`
- `updatedOn`

### Validation Rules
- `themeKey` unique
- only one `isGlobalDefault === true`
- theme document must normalize successfully

## Theme Document V1
### Fonts
- heading family
- body family
- source kind: `google | custom`
- optional custom font declarations

### Colors
- `primary`
- `secondary`
- `accent`
- `surface`
- `background`

Derived:
- text
- muted
- line
- soft accent

### Typography
Per screen:
- `h1`
- `h2`
- `h3`
- `body`
- `caption`

### Spacing
Per screen:
- `pageGutter`
- `sectionGap`
- `blockGap`
- `radius`

## File Targets
### New Module
- `modules/test-modules-themes/module.json`
- `modules/test-modules-themes/server/*`
- `modules/test-modules-themes/frontend/*`
- `modules/test-modules-themes/shared/*`

### Pages Integration
- `modules/test-modules-pages/frontend/BlogDistributionPagePresentationSections.jsx`
- `modules/test-modules-pages/frontend/page-workspace-support.js`
- `modules/test-modules-pages/server/*`

### Reader Integration
- `modules/test-modules-pages/browser/page-reader.global.js`
- `modules/test-modules-pages/browser/page-application-tester.global.js`

### Product Shell
- `frontend/src/app/product-shell/product-view-descriptors.jsx`

## Validation Strategy
### Fast Proofs
- focused server conformance around Pages
- focused frontend build
- `pnpm quality:protocol`
- `pnpm review:env:verify`

### Functional Proofs
- Themes route appears
- seeded themes visible
- Pages theme selector shows themes
- deployed/local page payload carries resolved theme document
- live or local page variables visibly change with theme selection

## Open Design Decisions Kept Explicit
- V1 custom fonts will start as URL-backed declarations, not file uploads
- theme document authority stays local/runtime-owned, not published to Firestore
- theme application is page-level, not per-widget

## Exit Condition For This Turn
This turn is successful when:
1. docs are saved
2. Themes module exists and seeds five themes
3. Pages can choose actual themes
4. reader payload resolves current page theme
5. reader applies that theme to rendered page styling
