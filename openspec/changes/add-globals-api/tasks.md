# Tasks: add-globals-api

## Implementation Tasks

- [x] Create `app/api/globals/route.ts` with GET handler querying env_vars where scope='global' (verification: file exists, exports `GET`, uses Drizzle `.where(eq(envVars.scope, 'global'))`)
- [x] Implement POST handler: validate `{key, value}` with Zod, upsert into env_vars (scope='global'), trigger globals file regeneration (verification: `app/api/globals/route.ts` exports `POST` with Drizzle upsert and regeneration call)
- [x] Implement DELETE handler: accept `?key=` param, remove matching row from env_vars where scope='global', trigger regeneration (verification: route exports `DELETE`, calls `db.delete()` on env_vars with scope+key filter)
- [x] Create `src/lib/globals-env.ts` containing `regenerateGlobalsEnv()` that reads all global env_vars from DB and writes `globals/.env` as dotenvx-compatible KEY=VALUE lines (verification: file exists at `src/lib/globals-env.ts`, exports `regenerateGlobalsEnv`)
- [x] Ensure `globals/` directory exists (create at startup or in the regenerate function) (verification: `regenerateGlobalsEnv()` calls `fs.mkdirSync` or `fs.mkdir` with recursive option)
- [x] Add Zod schema in `src/lib/validators/globals.ts` for the POST body `{key: string, value: string}` (verification: file exists, exports schema)
- [x] Write integration tests in `tests/api/globals.test.ts` covering list, upsert, delete and file-regeneration assertions (verification: `npm test` passes with tests in `tests/api/globals.test.ts`)

## Future Work

- Agent-scoped env var API
- UI panel for editing global variables
- Encryption of sensitive values with dotenvx public key
