## Implementation Tasks

- [x] Replace fixed shared temp paths in filesystem-based tests such as `tests/api/cron.test.ts` with per-test unique temp directories (verification: code review shows `mkdtemp`/`os.tmpdir()` style isolation and the test still covers the same behavior).
- [x] Make environment-derived path assumptions explicit in tests such as `tests/api/skills.test.ts` by stubbing or injecting the expected root instead of relying on ambient `process.env.HOME` (verification: the test sets its own environment premise and no longer depends on the machine user's home directory).
- [x] Remove arbitrary sleep-based waiting from any retained browser test and replace it with deterministic UI or DOM conditions when possible (verification: affected Playwright test uses selector or state-based waiting rather than raw timeout fallback).
- [x] Preserve the original behavioral assertions while improving fixture determinism and isolation (verification: the same test cases remain meaningful after fixture refactoring).
- [x] Run project verification after implementation (verification: `npm run test && npm run typecheck && npm run lint`, plus the documented Playwright command for any retained browser test).

## Future Work

- Consider centralizing common temp-directory setup utilities if more filesystem-backed tests adopt the same pattern.
