# Layouts Story Implementation Plan

## Story Bar
- The route should feel like a studio, not a technical form.
- Starting a layout should begin with a sensible frame.
- The canvas should show believable publishing content, not abstract bars.
- The support dock should stay quiet and useful.
- The user should understand where a layout is already in use before changing it.

## Current Problems
- `New Layout` still starts from an empty page and a top bar action.
- Placeholder blocks are too abstract to convey page feel.
- The details dock still leans technical with raw preview/JSON pressure.
- Usage awareness exists as counts, but not as a strong page-impact surface.

## Implementation Shape
1. Preset-first start flow
- starter frames in the library rail
- one click should create a believable initial layout

2. Richer sample-content rendering
- hero reads like a hero
- content reads like an article body
- sidebar reads like sidebar modules
- CTA and feature blocks read like publishing components

3. Calmer details dock
- layout basics
- in-use-by pages
- selected node controls
- advanced JSON demoted

4. Better page continuity
- if opened from a page, say so clearly
- show affected pages with direct open actions

## Acceptance Bar
- A user can open Layouts and start from a page shape without thinking in structure jargon.
- The canvas communicates page feeling immediately.
- The right dock helps without shouting.
- The user can tell where a layout is already used before saving risky changes.
