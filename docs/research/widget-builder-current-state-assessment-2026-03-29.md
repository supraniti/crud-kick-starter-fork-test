# Widget Builder Current State Assessment

Date: 2026-03-29

Related intent:
- [widget-builder-ux-intent-file-2026-03-29.md](C:/Users/cmsin/2026/crud-kick-starter-fork-test/docs/research/widget-builder-ux-intent-file-2026-03-29.md)

## Purpose

This document records a hands-on assessment of the current widget builder and Page Studio flow before any new implementation work begins. The goal is to measure the current product against the operator intent, not against the underlying code ambitions.

## Reference patterns reviewed

Editorial references reviewed for structure, not for visual imitation:
- The Guardian World: https://www.theguardian.com/world
- AP News home: https://apnews.com/
- The Verge home: https://www.theverge.com/

Patterns repeatedly visible in those references:
- multiple editorial sections on the same page
- strong section headers with compact lists beneath them
- hero stories mixed with smaller teaser cards
- repeated content cards composed from image + title + metadata + summary
- layout regions that are reused repeatedly across topics
- article/detail pages that still share common building blocks with homepage cards
- clear information hierarchy without asking the operator to think in raw binding trees

## Hands-on builder exercise

Routes exercised:
- `http://localhost:3000/app/page-studio?studioMode=infra`
- `http://localhost:3000/app/page-studio?studioMode=widgets`
- `http://localhost:3000/app/page-studio?studioMode=preview`

Specific product flows exercised:
1. inspected the current query popup in Infra
2. inspected the current widget chooser popup from Widgets
3. inspected the current widget configuration popup for `Post Title`
4. compared current capabilities to a realistic editorial article page
5. compared current capabilities to a multi-section newspaper-style front page

## What is going well

1. The architectural direction is sound.
- Widgets are already MUI wrappers in local preview/runtime.
- The remote runtime already renders named widget contracts instead of generic HTML fragments.
- Canonical `context.*` bindings already exist.

2. The current builder already has the right primitive concepts.
- page-owned queries
- widget content bindings
- widget display props
- widget action definitions
- compatibility by page kind / primary source type

3. The popup-based editing model is still viable.
- The operator intent explicitly keeps selection and configuration inside popups.
- The current product already uses popup/dialog flows, so this can evolve instead of being replaced.

4. Detail/article pages are much closer to viable than editorial front pages.
- Post title, body, media, author, breadcrumbs, related stories, and navigation are all present.

## What is missing

1. The widget library is not a library experience.
- It is a vertical list of repetitive cards.
- It does not feel browsable.
- It has no iconography.
- It has no real categorization or filtering.
- It does not help the user discover what to use next.

2. The configuration flow is not stepwise.
- Selection and configuration are mixed together.
- The operator is not clearly told what order to follow.
- The flow does not explain which fields are content, which are display, and which are actions.

3. The configuration hierarchy is present in code, but not legible in product.
- Theme influence exists.
- Descriptor defaults exist.
- Widget instance props exist.
- But the operator is not shown a clear precedence model such as:
  - theme default
  - widget default
  - widget override
- As a result, typography and color decisions feel opaque.

4. The widget set is too narrow for complex editorial composition.
Missing or insufficiently expressed building blocks include:
- buttons and calls to action
- reusable card/teaser widgets
- hero story widget
- section heading widget
- metadata widget
- divider / rule / spacer primitives
- newsletter or promo blocks
- repeatable story-row templates
- generic collection renderer with multiple presentation variants

5. Multi-section pages are not realistically buildable yet.
Current query types are limited to:
- current post from URL param
- current category from URL param
- posts from author/category/tag
- more posts from primary author/category/tag

This is enough for detail pages and some listing pages, but not enough for a true newspaper or front-page layout with multiple independent sections.

6. Custom widgets do not exist yet as a product capability.
- There is no persisted custom-widget document model.
- There is no authoring flow to design a widget, name it, icon it, categorize it, version it, and later reuse it.
- There is no publication pipeline for custom-widget definitions to remote runtime.

7. Persistence does not yet satisfy the stated requirement.
- Current Page Studio draft state is primarily local-storage driven.
- The new intent explicitly requires the relevant configuration to persist in the database.

## What is hard to reason about right now

1. Which widget should I choose?
- The library does not visually communicate use case or structure.

2. What exactly can this widget read from the page?
- The context explanation exists, but the relationship between Infra query definitions and widget fields is still too abstract.

3. What is theme-controlled versus widget-controlled?
- The operator sees a theme override mode, but not a full readable hierarchy.

4. What is content versus behavior?
- For widgets with navigation or emitted actions, the product does not elevate those concepts enough.

5. Why is a widget unavailable?
- Compatibility filtering exists, but the explanation is weak and reactive.

## What is currently impossible or not credible to recreate

1. A true newspaper-style homepage with multiple independently sourced sections.
Reason:
- not enough query source types
- no reusable section/template widgets
- no custom widgets
- no multi-query section orchestration model

2. A reusable branded teaser/card system created by the user and then reused across pages.
Reason:
- custom widget authoring/persistence/publication does not exist yet

3. A clear theme-first design system workflow.
Reason:
- theme/default/instance precedence is not expressed clearly in the UI

## Conclusion

Current Page Studio is a workable proof for detail pages, but not yet a user-friendly widget authoring system and not yet a reusable widget platform. The next implementation program must address both product UX and system architecture together:
- better library UX
- better configuration flow
- explicit precedence model
- larger widget vocabulary
- database-backed custom widget documents
- remote runtime support for both built-in and user-defined widgets
