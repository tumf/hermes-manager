# Remove SQLite — Use Filesystem as Source of Truth

## Problem / Context

The webapp currently maintains a SQLite database (`runtime/data/app.db`) with four tables: `agents`, `env_vars`, `skill_links`, and `templates`. The `templates` table is already being migrated to the filesystem (`move-templates-to-filesystem`).

The remaining three tables store data that is fully derivable from the `runtime/` directory structure:

- **`agents`**: directory listing of `runtime/agents/` + naming conventions
- **`env_vars`**: `.env` files already exist; DB adds only `visibility` metadata and creates a second source of truth
- **`skill_links`**: symlinks on the filesystem already represent the data; DB is a redundant index

This dual-write pattern causes:

1. Migration/schema management overhead (`drizzle/`, `scripts/migrate.js`, worktree DB copy)
2. Potential inconsistency between DB and filesystem
3. Extra dependencies (`drizzle-orm`, `drizzle-kit`, `better-sqlite3`)

## Proposed Solution

Eliminate the `agents`, `env_vars`, and `skill_links` tables and make `runtime/` the sole source of truth.

### agents → directory scan

| DB column    | Filesystem equivalent                          |
| ------------ | ---------------------------------------------- |
| `agent_id`   | Directory name under `runtime/agents/`         |
| `home`       | `path.resolve(RUNTIME_DIR, 'agents', agentId)` |
| `label`      | Convention: `ai.hermes.gateway.{agentId}`      |
| `enabled`    | New `enabled` field in `config.yaml`           |
| `created_at` | `fs.stat().birthtime`                          |
| `updated_at` | `fs.stat().mtime`                              |

### env_vars → `.env` + `.env.meta.json`

- Key/value pairs: already stored in `.env` files (both global and per-agent)
- Visibility metadata (`plain` / `secure`): stored in a new `.env.meta.json` sidecar file
- `regenerateGlobalsEnv()` becomes unnecessary (no DB→file sync needed)

`.env.meta.json` format:

```json
{
  "OPENROUTER_API_KEY": { "visibility": "secure" },
  "APP_NAME": { "visibility": "plain" }
}
```

### skill_links → symlink scan

- List: recursively scan `runtime/agents/{agentId}/skills/` for symlinks
- Create: `fs.symlink()` only
- Delete: `fs.unlink()` only

### Cleanup

Once all tables are removed, delete the entire DB layer:

- `db/schema.ts`, `src/lib/db.ts`, `src/lib/globals-env.ts`
- `scripts/migrate.js`, `drizzle/` directory
- `runtime/data/` directory
- Dependencies: `drizzle-orm`, `drizzle-kit`, `better-sqlite3`, `@types/better-sqlite3`

## Acceptance Criteria

1. All 14 API routes that reference the `agents` table use filesystem-based helpers instead
2. Environment variable CRUD (global + per-agent) reads/writes `.env` + `.env.meta.json` without any DB operations
3. Skill links CRUD operates solely on filesystem symlinks
4. No SQLite database file is created or required at runtime
5. `npm run test && npm run typecheck && npm run lint` pass
6. `.wt/setup` no longer copies or migrates a database
7. `scripts/start-prod.sh` no longer runs migrations
8. Existing `runtime/agents/` data continues to work without a migration script (backward compatible)

## Out of Scope

- `templates` table migration (handled by `move-templates-to-filesystem`)
- UI changes (API contracts remain the same; only the data layer changes)
- Changes to `run-agent-gateway.sh` or launchd plist files
