# Widget Builder UX Intent File

Date: 2026-03-29

Purpose:
- This file is the canonical intent for the next widget-configuration and builder-usability program.
- Review this file before every implementation pass for this program.
- Review this file again before declaring any pass complete.

## Intent

Widget configuration is currently not user friendly, not displaying any reason or flow.

What we should have:
- A lib of widgets, displayed as grid of tiles, each with its own icon and title
- Maybe also sorted or categorized
- This all should still happen in a popup

Once a widget is chosen user should be able to configure it.

Configuration should be a straight forward process, easy to reason and understand.

It should expose:
- content props from infra
- display / behaviour props
- action props when appropriate, for example for buttons

There should be a hierarchy between:
- theme configuration
- default configuration
- specific widget configuration

That hierarchy should apply especially to:
- colors
- typography
- similar visual settings

Reminder:
- all widgets should be wrappers for MUI components, or combinations of them, with our own prop wiring
- those components should live both in our app and on the remote deployment for consistency
- remote gets the widget name and props and can display it
- remote deployment should be able to dynamically fill content for the relevant data item, for example post title from the data layer

Additional hard requirement:
- users should be able to create user custom widgets using the same layout, widget, and preview configuration tools
- those custom widgets should then be reusable as widgets for pages
- this should enable a growing library of custom widgets and extend page-building ability

Persistence requirement:
- all of those configurations should persist in the database

Overall expectations:
1. play along seamlessly
2. be very user friendly in terms of flow
3. be visually pleasant

## Required work for this planning pass

A.
- Save this intent as a hard file for future reference

B.
- Search for complex content webpages, for example newspaper or editorial sites with multiple articles and sections
- Try to recreate something similar with our current available building capabilities
- Figure out:
  - what is missing
  - what is going well
  - what is impossible to recreate
  - what is hard to reason about

C.
- Write a detailed plan for making the builder much more powerful and easy to use based on:
  - this intent
  - the hands-on builder exercise

D.
- Approve that plan with the operator before execution
