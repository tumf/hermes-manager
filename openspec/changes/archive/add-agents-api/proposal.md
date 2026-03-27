# Add Agents REST API

**Change Type**: implementation

## Problem / Context

The hermes-agents webapp needs a REST API layer to manage Hermes gateway agents.
Currently there is a SQLite schema (`db/schema.ts`) with `agents`, `env_vars`, and
`skill_links` tables and a DB client (`src/lib/db.ts`), but no API routes exist.
Operators cannot create, list, copy, or delete agents programmatically or via the
forthcoming UI.

## Proposed Solution

Implement Next.js App Router API route handlers under `app/api/agents/` that expose
full agent lifecycle management:

- `GET /api/agents` — return all agents with their key fields
- `POST /api/agents` — create a new agent: validate name, scaffold the agent's
  HERMES_HOME directory (`{PROJECT_ROOT}/agents/{name}`), and insert a DB row
- `DELETE /api/agents?name=...` — stop the agent's launchd service, remove its DB
  row, and optionally purge the filesystem with `?purge=true`
- `POST /api/agents/copy` — deep-copy an existing agent directory to a new name and
  insert a new DB row

All handlers use Zod for input validation and Drizzle ORM for DB access.

## Acceptance Criteria

1. `GET /api/agents` returns JSON array with `id`, `name`, `home`, `label`, `enabled`,
   `createdAt` for every row in the agents table.
2. `POST /api/agents` with a valid `name` creates the directory structure, inserts a
   row with `label = "ai.hermes.gateway.{name}"`, and returns the created agent.
3. `POST /api/agents` with an invalid name (e.g. contains spaces or special chars)
   returns HTTP 400.
4. `DELETE /api/agents?name=foo` removes the DB row (and stops launchd if running).
   Without `?purge=true` the filesystem is left intact.
5. `DELETE /api/agents?name=foo&purge=true` also removes the agent directory.
6. `POST /api/agents/copy` with `{from, to}` deep-copies the directory and inserts a
   new DB row for `to`.

## Out of Scope

- Authentication / authorization (handled separately)
- Agent environment variable management (see `add-globals-api`)
- Agent list UI (see `add-agents-list-ui`)
- launchd plist generation (assumed to already exist or be handled externally)
