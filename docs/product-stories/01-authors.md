# Authors

The user opens `Authors` because they want to manage real people, not records.

What they see first is a confident roster. Faces, names, roles, status, and signs of life. It is obvious who is active, who is a guest, who has not written in a while, and who is carrying the publication. The list feels edited. It does not dump every internal detail on the screen. It shows what a working editorial team would actually care about.

The table is the kind of table a user wants to stay in. It can be filtered by role, status, language, and name. It can be sorted by activity, name, newest, or most-published. When the user refreshes the page, nothing is lost. The exact filter, page number, sort order, and search stay in the address, so the user comes back to the same place with the same mental context.

One small detail makes the desk feel intelligent: every author row shows how much work is attached to that person. The user can see how many posts belong to that author, how many are published, how many are still drafts, and whether the author is missing essentials such as an avatar or a short bio. Clicking that post count should not feel like a detour. It should open the posts desk already narrowed to that author so the user instantly lands on the related work.

Editing an author should feel calm. The user clicks a row and a drawer or side panel appears. The list stays visible in the background, so the user never feels thrown out of the flow. In that panel, the user can replace a headshot, adjust the public name, fix the legal name, update the biography, add a website, add social links, and choose the role and status. They can also decide what kind of expertise this author is associated with, because that matters later when content is assigned and displayed.

The avatar experience matters. This must not feel like selecting a foreign key from a technical list. The user should open a gallery, browse images visually, pick one, and if the right image does not exist yet, upload a new one right there from the same panel. The new image should appear immediately in the gallery and be selectable without the user leaving the author screen.

The user should also feel safe. If they try to save an author with bad data, the form should explain what is wrong in the place where the mistake happened. If the name would collide with another author, the user should see that before the save completes. If an author is already tied to published posts, deletion should not behave like a trap. The screen should say what will be affected and offer a sane next move.

When the user saves, they should get a clear answer. Not a blinking state they have to guess about, but a clean success message or a precise failure. If they bulk archive, bulk restore, or bulk delete, the action should feel deliberate and visible.

The happy version of this screen is simple to describe: the user feels like they are managing an author roster for a publication. They can find people, inspect people, update people, connect them to their work, and handle portraits without ever feeling pushed into another module just to finish a basic task.

What would make the user happy:
- They can spot weak author profiles quickly.
- They can jump from an author to that author's posts in one click.
- They can change a portrait without leaving the author flow.
- They can trust that refresh and back or forward navigation preserve their place.
- They can do bulk operations without fear.

What would make the user angry:
- A generic, noisy table that treats authors like raw database rows.
- An edit flow that opens a whole different page and loses the list context.
- A portrait picker that is just a text field or a raw multi-select.
- Validation that happens only after save and gives vague errors.
- Deleting an author without showing what published work depends on that person.
