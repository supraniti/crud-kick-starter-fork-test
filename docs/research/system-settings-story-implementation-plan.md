# System Settings Story Implementation Plan

## Goal
Make `System Settings` feel quiet, narrow in purpose, and safe to use.

This desk should not compete with `Remotes`, `Domains`, or daily editorial work. It should explain that it exists for product-wide fallbacks and repair work, then expose only a small set of advanced default groups.

## Current Problems
- too many cards repeat the same message in different words
- setup guidance, health reporting, and default editing are scattered
- the route reads more like remote plumbing than product inheritance
- field labels describe targets, not the effect of the setting

## Implementation Direction

### 1. Tell The Truth First
- start the page by saying most setup happens in `Remotes` and `Domains`
- make it clear this desk is for inheritance and repair, not day-to-day work

### 2. Collapse Setup Noise
- merge setup guidance and remote readiness into one calmer card
- keep only the useful signals:
  - remote ready or not
  - delivery fallback chosen or not
  - quick links to `Remotes` and `Domains`

### 3. Show One Quiet Snapshot
- replace long binding summaries with three product groups:
  - public page defaults
  - published data defaults
  - media library default
- each group should say what is currently inherited and where to go if the operator wants to work deeper

### 4. Hide Advanced Defaults By Default
- keep editing behind `Show Advanced Defaults`
- expose only three groups:
  - public page defaults
  - published data defaults
  - media library default

### 5. Rewrite Field Labels In Product Language
- `Fallback Public HTML Target`
- `Fallback Public Delivery`
- `Fallback Posts Data Target`
- `Fallback Categories Data Target`
- `Fallback Tags Data Target`
- `Fallback Media Library Target`

### 6. Explain Effect And Override
- each advanced group should say:
  - what this default affects
  - where it can be overridden

## Validation
The desk is successful when a user can:

1. open `System Settings`
2. understand why the screen exists
3. understand that setup belongs in `Remotes` and `Domains`
4. see the current inherited defaults quickly
5. open advanced groups only when needed
6. save one group without fear of changing unrelated parts
