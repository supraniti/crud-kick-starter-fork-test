# Intent File

This file is the canonical intent for the next layout-builder and editor-to-deployment transformation work.

Operational rule:

- Review this file before execution of every implementation pass.
- Review this file again before declaring any pass complete.
- Treat it as the authority when tradeoffs appear between ease of implementation and product intent.

## Intent Text

Improved layout builder, widget configuration and overall transformation between editor (app) to deployed content

1. To achieve a 100% match between what we see in the editor and what we see on the deployed app, we cannot assume two css environments (one in the app, one in the deployed page) so conclusion is that the deployed page should display MUI components, and run with MUI framework as a dependency

2. Our layout building is not good in terms of usability
I would suggest the following 'all in one' builder
We are talking about a canvas, one that takes most of the available space we have on screen, with the same ruler widgets and resizing zoom in out change to mobile etc we have to day
But will also remove the left side bar for it is taking space off our canvas
We will have one fab to control the builder state
it will have three states
A - Infra
B - Layout
C - Widgets
D - Preview

Infra state -
Will include the following sections:
URL/Link/slug - where we define the page url, and possible query params
Data section, clicking it will popup our Query options window, where we can choose one or more queries that will be injected into this page, Query can use dynamic data from url params defined earlierlayour
SEO section, clicking it will popup our SEO options window, we can edit predefined and user defined tags, insert values, add new tags, and also add pointers to query result defined earlier (for example if its a blog post page we can define the seo title tag to get its content from post.title)
Client section - We can chose which js client will run on this deployed page (data layer, test client, our new Mui client, maybe more in the future) those options will be hard coded in the app, based on what we have to offer

Layout state -
This will expose only the layout of the page
Use gridstackjs to make it a layout builder, where user can add blocks to create the page layout
blocks are resizable, movable, and so on
Each block gets a serialized name (B-0001... etc) and a unique color tone
This part should be VERY CAREFULLY DESIGNED! for we dont want the actual girdstack classes polluting our final deployment, we use it on for how slick and easy it is to make the task of layout building with it
our actual result of the actual layout should be calculated based on the user configuration and transformed to MUI layout blocks (rows, columns, whatever classes needed) to look exactly the same
Layout should also account for different screen sizes. If a user create a layout, than select the mobile screen size and than make an adjustment he should be able to save this adjustment of layout only to this specific screen size
This part of our design in particular - must be VERY CAREFULLY PLANNED - you should spend at least a full pass only on planning this
making sure intent is delivered by all aspects

Widget State -
This is where user can adjust the created blocks into actual widgets (no drag and drop or resize or change of layout are possible here) blocks will lose their color tone on this display and will appear as empty frames with name showing up on hover (B-0001...etc)
User can configure exactly one widget on each block
Widget configurator will be a popup with the available widgets, once you select a widget it instantly injected into the block
when hovering above a widget it is possible to edit /configure it
configuration of a widget is also in a popup
you chose props, and can also use dynamic content from way was defined on the infra state
widgets can also expose action such as navigation, or emiting an event
This should essentially include what we already done, but done much better
Now that we decouple our MUI into the deployed pages, we will also decouple our available widgets
since deployed app is also MUI it will not render html, it will render MUI components, defined for the page, with the exact same props and data
This part should also be done with great care and thought. For it is the actual END GAME of the deployment process
We must maintain 100% compatability between - editor and deployed app
We also must have a lib of our wrapper components which will be the available widgets
We must use the selected theme to override some of the widgets props

Preview state -
this state will basically show us exactly what we are going to see on the live page
It should expose some kind of option to change the url params so we can see different results for different settings
PREVIEW === LIVE deployment
