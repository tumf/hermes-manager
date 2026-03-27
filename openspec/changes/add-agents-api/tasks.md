# Tasks: add-agents-api

## Implementation Tasks

- [ ] Create `app/api/agents/route.ts` implementing GET and POST handlers (verification: `src/` file exists and exports `GET`, `POST` named exports)
- [ ] Implement GET handler: query all agents via Drizzle, return JSON array with id/name/home/label/enabled/createdAt (verification: `npm run build` succeeds; route file contains `db.select()` from agents table)
- [ ] Implement POST handler: validate `name` with Zod regex `/^[a-zA-Z0-9_-]+$/`, scaffold agent HERMES_HOME dir with AGENTS.md, SOUL.md, config.yaml, .env, logs/ subdirectory, insert DB row with `label = "ai.hermes.gateway." + name` (verification: `app/api/agents/route.ts` contains fs scaffold logic and Drizzle `insert`)
- [ ] Return HTTP 400 with error message when POST body fails Zod validation (verification: route handler returns `NextResponse.json({ error: ... }, { status: 400 })` on ZodError)
- [ ] Create `app/api/agents/route.ts` DELETE handler: accept `?name=` query param, stop launchd service via `launchctl unload` (best-effort, ignore errors), remove DB row (verification: route exports `DELETE`, calls `db.delete()` on agents table)
- [ ] Support `?purge=true` in DELETE to additionally remove the agent directory with `fs.rm` recursive (verification: DELETE handler reads `purge` query param and conditionally calls `fs.rm`)
- [ ] Create `app/api/agents/copy/route.ts` implementing POST handler: validate `{from, to}` with Zod, deep-copy agent dir via `fs.cp` recursive, insert new DB row for `to` (verification: file exists at `app/api/agents/copy/route.ts`, exports `POST`)
- [ ] Add Zod schema definitions for all request bodies in `src/lib/validators/agents.ts` (verification: file exists and exports named schemas)
- [ ] Write integration tests in `tests/api/agents.test.ts` covering list, create, delete, copy happy paths and the invalid-name 400 case (verification: `npm test` passes with tests in `tests/api/agents.test.ts`)

## Future Work

- Implement launchd plist generation for newly created agents
- Add agent-level env var scoping via the `env_vars` table
- Manual QA of launchctl integration on a real macOS host
