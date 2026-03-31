## Implementation Tasks

- [x] Task 1: Create `src/lib/constants.ts` with `PLATFORM_TOKEN_KEYS` array (verification: file exists, exports the array, `npm run typecheck` passes)
- [x] Task 2: Add `clearTokenValues(envPath: string, keys: string[]): Promise<void>` helper in `src/lib/dotenv-parser.ts` that reads `.env`, sets matching keys' values to empty string, writes back (verification: unit test in `tests/lib/dotenv-parser.test.ts`)
- [x] Task 3: Update `app/api/agents/copy/route.ts` to call `clearTokenValues()` after `fs.cp()` (verification: unit test in `tests/api/agents-copy.test.ts`)
- [x] Task 4: Add unit tests for `clearTokenValues` — keys present/absent, mixed, empty file (verification: `npm run test`)
- [x] Task 5: Add integration test for copy route — verify copied `.env` has empty token values (verification: `npm run test`)
- [x] Task 6: Run `npm run lint && npm run typecheck` (verification: zero errors)

## Future Work

- Add UI indicator on Env tab when a platform token is empty (prompt user to configure)
- Runtime token-lock at launchd start (cross-agent duplicate detection)
