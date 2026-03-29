# Implementation Tasks

## Phase 1: New Helpers

- [x] Create `src/lib/agents.ts` with filesystem-based agent helpers (verification: `listAgents()`, `getAgent()`, `createAgent()`, `deleteAgent()` — unit tests in `tests/lib/agents.test.ts`)
- [x] Create `src/lib/env-meta.ts` with `.env.meta.json` read/write helpers (verification: unit tests in `tests/lib/env-meta.test.ts`)
- [x] Create `src/lib/skill-links.ts` with symlink scan/create/delete helpers (verification: unit tests in `tests/lib/skill-links.test.ts`)

## Phase 2: Migrate API Routes

- [x] Update `app/api/agents/route.ts` — replace DB select/insert/delete with `src/lib/agents.ts` helpers (verification: `npm run typecheck`, existing behavior preserved)
- [x] Update `app/api/agents/copy/route.ts` — replace DB select/insert with filesystem helpers (verification: `npm run typecheck`)
- [x] Update `app/api/env/route.ts` — replace DB operations with `.env` + `.env.meta.json` helpers (verification: `npm run typecheck`)
- [x] Update `app/api/env/resolved/route.ts` — replace DB select with filesystem reads (verification: `npm run typecheck`)
- [x] Update `app/api/globals/route.ts` — replace DB operations with `.env` + `.env.meta.json` helpers, remove `regenerateGlobalsEnv()` call (verification: `npm run typecheck`)
- [x] Update `app/api/files/route.ts` — replace `db.select(agents)` with `getAgent()` (verification: `npm run typecheck`)
- [x] Update `app/api/launchd/route.ts` — replace `db.select(agents)` with `getAgent()` (verification: `npm run typecheck`)
- [x] Update `app/api/logs/route.ts` — replace `db.select(agents)` with `getAgent()` (verification: `npm run typecheck`)
- [x] Update `app/api/logs/stream/route.ts` — replace `db.select(agents)` with `getAgent()` (verification: `npm run typecheck`)
- [x] Update `app/api/skills/links/route.ts` — replace DB operations with `src/lib/skill-links.ts` helpers (verification: `npm run typecheck`)
- [x] Update `app/api/cron/route.ts` — replace `db.select(agents)` with `getAgent()` (verification: `npm run typecheck`)
- [x] Update `app/api/cron/output/route.ts` — replace `db.select(agents)` with `getAgent()` (verification: `npm run typecheck`)
- [x] Update `app/api/cron/action/route.ts` — replace `db.select(agents)` with `getAgent()` (verification: `npm run typecheck`)

## Phase 3: Cleanup

- [x] Delete `db/schema.ts` (verification: no imports remain — `rg "db/schema" --type ts`)
- [x] Delete `src/lib/db.ts` (verification: no imports remain — `rg "src/lib/db" --type ts`)
- [x] Delete `src/lib/globals-env.ts` (verification: no imports remain — `rg "globals-env" --type ts`)
- [x] Delete `scripts/migrate.js` (verification: not referenced in `package.json` or `start-prod.sh`)
- [x] Delete `drizzle/` directory (verification: directory removed)
- [x] Remove `runtime/data/` from `.wt/setup` DB copy logic (verification: `.wt/setup` has no DB references)
- [x] Remove migrate call from `scripts/start-prod.sh` (verification: `grep migrate scripts/start-prod.sh` returns nothing)
- [x] Remove DB dependencies from `package.json`: `drizzle-orm`, `drizzle-kit`, `better-sqlite3`, `@types/better-sqlite3` (verification: `npm install` succeeds, `npm run build` succeeds)

## Phase 4: Update Tests

- [x] Update `tests/api/env.test.ts` — replace in-memory DB setup with tmpdir-based fixtures (verification: `npm run test`)
- [x] Update `tests/api/globals.test.ts` — replace in-memory DB setup with tmpdir-based fixtures (verification: `npm run test`)
- [x] Remove or update `tests/schema.test.ts` — schema no longer exists (verification: `npm run test`)

## Phase 5: Documentation

- [x] Update `docs/design.md` §3 (Database Design) — document filesystem-based data layer (verification: section reflects new architecture)
- [x] Update `docs/design.md` §5 (API Design) — remove DB references from internal implementation notes (verification: no stale DB references)
- [x] Update `AGENTS.md` — remove schema change flow and migration instructions, simplify worktree section (verification: no stale DB references)

## Phase 6: Final Verification

- [x] `npm run test` passes (verification: exit code 0)
- [x] `npm run typecheck` passes (verification: exit code 0)
- [x] `npm run lint` passes (verification: exit code 0)
- [x] `npm run build` passes (verification: exit code 0)

## Future Work

- Manual smoke test: create agent, set env vars, add skill link, delete agent (verification: all operations work without DB)
- Remove `runtime/data/app.db` from deployed environment after confirming no rollback needed
- Consider adding `.env.meta.json` to `.gitignore` if visibility metadata contains sensitive patterns
