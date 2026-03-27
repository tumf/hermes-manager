# Tasks: add-env-management-api

## Implementation Tasks

- [x] Create `src/lib/dotenv-parser.ts` — utility functions for parsing and serializing `.env` files (KEY=VALUE lines, preserve comments on read, strip on write) (verification: src/lib/dotenv-parser.ts exports parse and serialize functions)
- [x] Create `src/app/api/env/route.ts` — Next.js App Router GET, POST, DELETE handlers (verification: app/api/env/route.ts exists and exports GET, POST, DELETE functions)
- [x] Implement GET handler without `reveal`: return `[{key, value: '***', masked: true}]` for each entry (verification: src/app/api/env/route.ts masks values when reveal param absent)
- [x] Implement GET handler with `reveal=true`: return `[{key, value, masked: false}]` with real values (verification: src/app/api/env/route.ts returns real values when reveal=true)
- [x] Implement POST handler: zod validate `{agent, key, value}`, upsert key in agent `.env` file, return `{ok: true}` (verification: src/app/api/env/route.ts contains POST with upsert logic)
- [x] Implement DELETE handler: remove key line from agent `.env` file, return `{ok: true}` (verification: src/app/api/env/route.ts contains DELETE with key removal)
- [x] Create `src/app/api/env/resolved/route.ts` — GET handler merging global + agent `.env` with source annotation (verification: app/api/env/resolved/route.ts exists and exports GET function)
- [x] Implement resolved GET: parse `{HERMES_HOME}/.env` as global, parse agent `.env`, produce merged list with `source: 'global'|'agent'|'agent-override'` (verification: src/app/api/env/resolved/route.ts contains merge logic with source annotation)
- [x] Return HTTP 404 when agent is not found in the database (verification: both route files return 404 for missing agent)
- [x] Return HTTP 400 for invalid request body or missing required query params (verification: route files return 400 on zod parse failure)
- [x] Add unit tests for dotenv-parser (parse, serialize, upsert, delete key) (verification: tests/lib/dotenv-parser.test.ts passes with `npm test`)
- [x] Add integration tests for GET/POST/DELETE/resolved endpoints with fixture `.env` files (verification: tests/api/env.test.ts passes with `npm test`)
- [x] Run `npm run build` and confirm no TypeScript errors (verification: `npm run build` exits 0)

## Future Work

- Build UI components for browsing and editing env variables (separate frontend change)
- Consider encryption at rest for sensitive values
