## Implementation Tasks

- [x] Add an `Env` tab to `app/agents/[name]/page.tsx` and wire it into the existing tab layout (verification: `app/agents/[name]/page.tsx` renders `Env` alongside `Memory`, `Config`, and `Logs`).
- [x] Implement agent-local env list/loading state using `GET /api/env?agent=...` with masked values by default (verification: UI fetches `/api/env` and renders returned keys without exposing values by default).
- [x] Implement add/update/delete actions for agent-local variables using existing `/api/env` POST and DELETE endpoints (verification: UI code issues POST/DELETE calls and refreshes the rendered list after success).
- [x] Implement reveal-on-demand for agent-local values using `GET /api/env?agent=...&reveal=true` (verification: UI toggles from masked to unmasked values without navigating away).
- [x] Implement a read-only resolved environment section using `GET /api/env/resolved?agent=...` and render the source label for each row (verification: UI displays `global`, `agent`, or `agent-override` per returned item).
- [x] Add or update UI tests covering the Env tab rendering and operator flows for add/delete/reveal/resolved display (verification: test files under `tests/` cover these interactions and pass under `npm run test`).
- [x] Update `docs/requirements.md` and `docs/design.md` so the documented agent detail UI and env workflow match the implementation (verification: docs mention the Env tab and per-agent UI management, and diffs reference these files).
- [x] Run validation commands for the changed UI/docs (`npm run test`, `npm run typecheck`, `npm run lint`) (verification: commands complete successfully and no unresolved failures remain).

## Future Work

- Consider inline editing for existing rows if operators need a faster bulk editing workflow.
- Consider a diff-focused presentation for resolved values when many global keys exist.
