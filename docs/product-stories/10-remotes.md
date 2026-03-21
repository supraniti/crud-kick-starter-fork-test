# Remotes

The user opens `Remotes` because they need the product to connect to the outside world, and that experience should feel guided from the first click.

This desk should not look like an internal control panel for infrastructure people. It should look like a connection and readiness desk for a publishing system. The user picks a provider, brings the right key or credential, gives the environment a name, and then expects the system to explain what is ready and what is missing in plain language.

The first success should come quickly. The user uploads a credential, the screen reads it, and useful details appear: project name, environment, account identity, maybe region or billing visibility. A strong confirmation tells the user whether the connection is good. If the key is wrong or expired, the same screen should help fix it. Not send the user on a scavenger hunt across the app.

Once the connection is real, the desk should become a readiness board. Data store ready or not. Media storage ready or not. HTML publishing ready or not. Public application endpoint ready or not. Billing visible or not. The user should be able to scan a few cards and understand the state of the remote world immediately.

Repair work should also live here in a humane way. If the stored key is missing, the user should be able to re-import it from the same screen. If a permission is missing, the desk should say what it blocks in product language, not just surface a raw cloud error and walk away. If the user needs to prepare missing pieces, the desk should offer that action intentionally and explain what it will do.

This desk is also where trust around cost begins. A user should be able to see whether billing is linked, whether budgets exist, and whether the product can safely continue. The point is not perfect cost accounting. The point is that no one should feel blind while they are wiring a remote environment into publishing.

Advanced controls can exist, but they should never be the first thing a normal user sees. The main story of `Remotes` is connection, validation, readiness, and repair.

What would make the user happy:
- The first connection is easy to validate.
- Missing keys and broken credentials can be repaired in place.
- Readiness is shown as a set of plain-language service cards.
- Costs and billing visibility are not hidden.
- The desk makes the remote feel manageable, not mysterious.

What would make the user angry:
- A screen built around internal target jargon instead of user goals.
- Being told something is broken without being told where to fix it.
- Having to leave the desk just to repair the same credential.
- No distinction between essential setup and advanced detail.
- Raw cloud terminology with no product translation.
