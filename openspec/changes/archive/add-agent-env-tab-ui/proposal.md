# Add Agent Environment Variables Tab UI

## Problem/Context

- The repository already provides per-agent environment variable APIs via `/api/env` and `/api/env/resolved`.
- The current agent detail page only exposes `Memory`, `Config`, and `Logs` tabs in `app/agents/[name]/page.tsx`.
- Operators can currently manage shared variables from `/globals`, but cannot manage agent-specific `.env` values from the UI.
- This creates a mismatch between the documented product behavior and the actual operator workflow.

## Proposed Solution

- Add an `Env` tab to the agent detail page.
- In that tab, provide CRUD UI for the selected agent's `.env` entries using the existing `/api/env` API.
- Show masked values by default and allow reveal-on-demand using the existing `reveal=true` API mode.
- Add a read-only resolved view using `/api/env/resolved` so operators can confirm whether a value comes from `global`, `agent`, or `agent-override`.
- Keep global variable editing scoped to `/globals`; the new agent Env tab only edits agent-local variables.

## Acceptance Criteria

- The agent detail page shows an `Env` tab alongside the existing tabs.
- The `Env` tab lists agent-local environment variables and supports add, update, and delete operations through existing APIs.
- Variable values are masked by default and can be revealed on demand without leaving the page.
- The page shows a read-only resolved environment section that identifies `global`, `agent`, and `agent-override` sources.
- Documentation and specs are updated so the described UI matches the implemented UI.

## Out of Scope

- Changing the global variable management page into a mixed global/per-agent editor.
- Encrypting environment variables at rest.
- Adding audit logging beyond the current behavior.
