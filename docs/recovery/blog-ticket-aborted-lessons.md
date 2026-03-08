# Blog Ticket Aborted Lessons

Date: 2026-03-07

1. Start with contracts, not implementation.
   - The first artifact for this repo should be module contracts derived from `docs/templates/module-contract.md`.

2. Module-first is a hard constraint, not a preference.
   - Level 1: manifests and schema
   - Level 2: module-local adapters and views
   - Level 3: shared primitive extraction only after repetition is proven
   - Level 4: core edits only by explicit waiver

3. Additive tickets must avoid collisions by design.
   - Do not delete permanent baseline modules.
   - Use namespaced internal IDs where coexistence would otherwise collide.

4. Do not change runtime defaults to hide unfinished additive work.
   - If unfinished modules cannot coexist cleanly yet, keep working in module-local slices until they can.

5. Reuse existing capabilities before inventing new blog-specific infrastructure.
   - Existing field types and module-local runtime hooks cover much of this ticket already.

6. Baseline tests are not the place to absorb ticket-specific instability.
   - Only touch existing tests when the change is clearly a real repo bug fix.
   - Otherwise add focused blog tests in lane-owned locations.

7. A recovery handoff must clearly separate:
   - committed baseline
   - abandoned prototype
   - approved restart plan
