# Add Global Environment Variables API

**Change Type**: implementation

## Problem / Context

The application stores environment variables in the `env_vars` table, but there is no
API to manage global-scoped variables and no mechanism to regenerate the stacked dotenv
file used by agents. We need server-side APIs to list, upsert, and delete global
variables and to regenerate a canonical dotenv file on disk whenever globals change.

## Proposed Solution

Implement Next.js API routes under `app/api/globals/` with the following behavior:

- `GET /api/globals` — list all rows from `env_vars` where `scope = 'global'`
- `POST /api/globals` — upsert a { key, value } pair at scope = 'global'
- `DELETE /api/globals?key=...` — remove a global-scoped variable

Server-side side-effect: whenever globals are written (POST or DELETE), regenerate the
file `/Users/tumf/services/hermes-agents/globals/.env` from the DB using dotenvx-
compatible key=value lines. The file will be consumed via stacked `-f` arguments.

## Acceptance Criteria

1. `GET /api/globals` returns JSON array of all global env vars with `id`, `scope`,
   `key`, `value`.
2. `POST /api/globals` with `{ key, value }` inserts or updates the global variable,
   returns the upserted row, and rewrites `globals/.env` with all current globals.
3. `DELETE /api/globals?key=FOO` removes that global key and rewrites `globals/.env`.
4. The written `globals/.env` contains one KEY=VALUE per line with proper escaping for
   newlines and equals as needed to be dotenvx-compatible.

## Out of Scope

- Agent-scoped env vars (future work)
- UI for editing globals (can be added later)
- Authentication/authorization
