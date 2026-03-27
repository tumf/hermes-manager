# Add Per-Agent .env Management API

**Change Type**: implementation

## Problem / Context

Hermes agents are configured through `.env` files in their home directories. A global
`.env` at `{HERMES_HOME}/.env` supplies shared variables, while per-agent `.env` files
provide overrides. Currently there is no API to read, add, update, or remove these
variables without direct filesystem access, and no way to see the resolved (merged) view
of effective environment variables for an agent.

## Proposed Solution

Introduce four endpoints under `/api/env` and one under `/api/env/resolved`:

- `GET /api/env?agent=...` — parse the agent's `.env` and return a list of
  `{key, value, masked: true}` entries (values masked by default).
- `GET /api/env?agent=...&reveal=true` — return unmasked values. Acceptable because
  this is an intranet-only application with no public exposure.
- `POST /api/env` — body `{agent, key, value}` — upsert a key in the agent's `.env` file.
- `DELETE /api/env?agent=...&key=...` — remove a key from the agent's `.env` file.
- `GET /api/env/resolved?agent=...` — return the merged view of global + agent variables
  with a `source` annotation (`'global'` | `'agent'` | `'agent-override'`).

The `.env` format is `KEY=VALUE` lines; `#` comments are preserved on reads but stripped
on writes for simplicity. The agent's home path is resolved from the SQLite `agents` table;
`HERMES_HOME` is read from `process.env`.

## Acceptance Criteria

1. `GET /api/env?agent=<name>` returns a list of `{key, value, masked: true}` entries.
2. `GET /api/env?agent=<name>&reveal=true` returns entries with real values.
3. `POST /api/env` upserts a key and persists the change to the `.env` file.
4. `DELETE /api/env?agent=<name>&key=<KEY>` removes the key from the `.env` file.
5. `GET /api/env/resolved?agent=<name>` returns merged entries with `source` annotation.
6. Missing agent returns HTTP 404; malformed body returns HTTP 400.

## Out of Scope

- UI components for variable management — a separate frontend change.
- Encryption of `.env` values at rest — out of scope for this iteration.
- Authentication / authorization — intranet-only application.
