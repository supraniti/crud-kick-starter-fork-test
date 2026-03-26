# Themes Module Implementation Ticket

## Summary
Introduce a first-class `Themes` module that lets operators define reusable visual themes for deployed pages. A theme controls fonts, color palette, typography, spacing, and responsive adjustments. Themes must be previewable in the app, selectable globally or per page, and resolved into the deployed reader so the public experience reflects authored theme choices.

This is not just an admin convenience layer. It becomes a core presentation contract between:
- authoring UI
- Pages configuration
- Layout/widget rendering
- deployed reader runtime

## Problem
The current system already has a `themeKey` seam in Pages, but it is only a loose string field. There is no:
- theme authority
- reusable theme library
- global default theme
- per-page validated theme selection
- responsive theme model
- public reader theme resolution

The deployed reader still hardcodes most visual styling directly inside its stylesheet. That blocks authored visual variation and makes the `themeKey` effectively decorative.

## Goal
Provide a usable `Themes` module where an operator can:
1. create or edit multiple themes
2. start from predefined themes
3. preview the theme before publishing
4. choose one theme as the global default
5. override the global default per page
6. see the deployed page use the resolved theme automatically

## User Outcomes
### User Story: Global Brand Owner
The operator wants the whole site to share one coherent brand direction.

They should be able to:
- choose a default theme once
- know new pages inherit it automatically
- update the default theme and see deployed pages change after redeploy

### User Story: Page-Specific Campaign
The operator wants a single page family to look different from the default site look.

They should be able to:
- keep the global theme for most pages
- select a specific theme on one page
- preview the result before release
- deploy that page without affecting others

### User Story: Editorial Designer
The operator wants to experiment safely with fonts, palette, and typography rhythm.

They should be able to:
- duplicate a theme
- change fonts, colors, and type scale
- compare desktop/tablet/mobile previews
- save drafts without instantly affecting live pages

### User Story: Reader Runtime
The deployed page should:
- receive enough theme information for first render
- apply theme variables before visible content settles
- keep using the same theme while navigating within the same page family
- switch theme correctly if the next route resolves to a different page theme

## Scope
### In Scope
- new `Themes` module with custom route view
- reusable theme records
- five predefined themes seeded by default
- one global default theme
- per-page theme selection in Pages
- live preview inside the Themes module
- responsive theme configuration for at least:
  - desktop
  - tablet
  - mobile
- deployed reader consumption of resolved theme document
- theme-aware public rendering through CSS variables and typography rules

### Out Of Scope For V1
- arbitrary third-party font marketplaces beyond Google fonts and custom URLs
- full visual theme authoring for the CMS/product shell itself
- per-widget theme overrides
- automatic WCAG scoring or full design-token linting
- tenant-level theme publication to Firestore as a separate remote dataset

## Required Functionality
### 1. Theme Records
Each theme record needs:
- stable id
- `themeKey`
- title
- summary
- status
- `isDefaultGlobal`
- theme document payload
- timestamps

Only one theme may be global default at a time.

### 2. Fonts
Theme must support:
- Google fonts
- custom font declarations
- separate heading/body family choices

V1 requirements:
- a bounded set of Google font families surfaced in the UI
- custom font entries with URL-backed definitions
- reader can emit required `@import` or `@font-face` rules from the theme doc

### 3. Color System
Theme must support a bounded 4-5 color authoring model inspired by Material UI thinking.

V1 semantic color slots:
- primary
- secondary
- accent
- surface
- background

Derived tokens may then be computed for:
- text
- muted text
- lines/borders
- soft accent
- shadows

The UI should allow:
- choosing from predefined palette families
- overriding with custom colors

### 4. Typography
Theme must support:
- heading sizes
- body/caption sizes
- line heights
- spacing between major text blocks
- optional letter spacing / weight adjustments

V1 should cover at least:
- `h1`
- `h2`
- `h3`
- `body`
- `caption`

### 5. Responsive Overrides
Themes must support responsive overrides for:
- desktop
- tablet
- mobile

V1 does not need a full free-form breakpoint builder. It needs:
- three named screen profiles
- override fields for typography scale and layout spacing
- preview switching between those profiles

### 6. Live Preview
The Themes module must provide a preview surface that shows how the theme affects:
- page title
- subtitle/body text
- chips/tags
- card surfaces
- buttons/navigation affordances
- image + text composition

The preview should be:
- immediate on edit
- responsive-switch aware
- understandable without needing deployment

### 7. Global Default vs Per-Page
The system must resolve theme in this order:
1. page-specific theme
2. global default theme
3. hardcoded fallback theme

Pages UI must:
- list real theme options, not raw text only
- clearly show when a page inherits the global default
- let the operator explicitly pick a theme override

### 8. Deployed Reader Contract
The public HTML for first render must include:
- resolved theme document for the current page
- current theme key

The deployed reader must:
- write theme variables to the page shell
- load required fonts
- update theme if same-app navigation resolves a different page theme
- keep theme application independent from content fetching

## Architecture Direction
### Canonical Authority
Theme records live in the new Themes module.

Pages do not own theme definitions.
Pages only point to a theme key / theme id, or inherit global default.

### Resolved Theme Contract
At page payload build time, Pages runtime must resolve:
- selected page theme, or
- global default theme, or
- hardcoded fallback

That resolved theme document is then attached to the page payload for first render.

### Reader Runtime
Reader should not guess theme from static CSS constants alone.
Reader should apply:
- CSS variables
- font declarations
- typography sizing rules

from the resolved theme document.

### Same-App Navigation
When navigating between routes:
- content still comes from the data layer
- theme resolution should come from the route/page contract
- if theme changes, the reader reapplies theme variables without fetching a new HTML document

## Proposed Theme Document Shape
```json
{
  "version": 1,
  "themeKey": "editorial-default",
  "title": "Editorial Default",
  "fontModel": {
    "heading": {
      "source": "google",
      "family": "Fraunces"
    },
    "body": {
      "source": "google",
      "family": "Source Serif 4"
    },
    "customFonts": []
  },
  "colorModel": {
    "primary": "#8a4b22",
    "secondary": "#325c74",
    "accent": "#c98d42",
    "surface": "#fffaf2",
    "background": "#f6efe3"
  },
  "typographyModel": {
    "desktop": {
      "h1": { "fontSize": "clamp(3rem, 7vw, 5.6rem)", "lineHeight": 0.92, "fontWeight": 700 },
      "h2": { "fontSize": "2rem", "lineHeight": 1.05, "fontWeight": 700 },
      "h3": { "fontSize": "1.35rem", "lineHeight": 1.15, "fontWeight": 700 },
      "body": { "fontSize": "1.12rem", "lineHeight": 1.95, "fontWeight": 400 },
      "caption": { "fontSize": "0.9rem", "lineHeight": 1.5, "fontWeight": 500 }
    },
    "tablet": {},
    "mobile": {}
  },
  "spacingModel": {
    "desktop": { "pageGutter": 24, "sectionGap": 32, "blockGap": 16, "radius": 28 },
    "tablet": {},
    "mobile": {}
  }
}
```

## V1 Predefined Themes
The app should ship with five real theme records:
1. `editorial-default`
2. `newsprint-morning`
3. `coastal-notes`
4. `midnight-journal`
5. `signal-grid`

One must be seeded as the default global theme.

## Risks
### 1. Theme Complexity Explosion
If every visual token becomes freely editable, usability collapses.

Mitigation:
- keep V1 semantic and bounded
- offer presets first
- hide advanced settings behind expandable sections

### 2. Font Loading Performance
Dynamic font loading can delay first render.

Mitigation:
- bound Google family list
- keep heading/body pairs minimal
- inline resolved theme but lazy-load font CSS where possible

### 3. Responsive Drift
Desktop theme may look good while mobile becomes unusable.

Mitigation:
- built-in screen preview tabs
- bounded responsive override fields
- fallback inheritance from desktop to smaller breakpoints

### 4. Page/Layout/Theme Split Confusion
Operators may not understand what belongs to theme vs layout vs widget configuration.

Mitigation:
- theme controls look-and-feel
- layout controls structure
- widgets control content and actions
- reflect that division in both UI copy and docs

## Validation Requirements
### Authoring
- themes can be listed, created, duplicated, edited, deleted
- five defaults appear on clean install
- exactly one global default can exist
- Pages theme selector shows real saved themes

### Preview
- changing font/palette/type scale updates preview immediately
- desktop/tablet/mobile preview modes visibly differ when overridden

### Deployed Reader
- first render uses resolved theme without waiting for later fetches
- post-to-post same-theme navigation keeps current styling
- navigation to a page with a different theme updates styling in place

## Acceptance Criteria
This ticket is complete when:
1. a new Themes route exists in the app
2. five predefined themes are seeded automatically
3. one theme is marked default global
4. Pages can inherit global default or select a specific theme
5. the deployed reader consumes a resolved theme document
6. live deployed pages visibly change when page/global theme changes
7. the theme preview allows the operator to understand desktop/tablet/mobile implications before release

## Immediate Delivery Strategy
V1 should be delivered in phases:
1. Theme module authority and seeded records
2. Pages selection and global default resolution
3. Reader theme application
4. Themes live preview and responsive editing
5. deployment/runtime verification
