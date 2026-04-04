## Specification Tasks

- [x] Update `docs/requirements.md` §8 to remove stale SQLite/drizzle references and align with filesystem-based runtime
- [x] Align backup, monitoring, migration wording with current runtime layout per `docs/design.md`
- [x] Validate proposal and spec delta for archive readiness

## Future Work

- ほかの古い運用記述がないかの横断監査

## Acceptance #1 Failure Follow-up

- [x] Remove or ignore `.cflx/acceptance-state.json` so `git status --porcelain` is clean during acceptance and archive preparation
- [x] Exclude or format `.cflx/acceptance-state.json` so `npm run format:check` passes under repository quality gates

## Acceptance #3 Failure Follow-up

- [x] Prevent acceptance execution from leaving `.cflx/acceptance-state.json` modified in the tracked working tree, or stop tracking this runtime state file so `git status --porcelain` is clean during acceptance/archive preparation
- [x] Run Prettier on `openspec/specs/documentation/spec.md` so `npm run format:check` passes
- [x] Correct the completed Acceptance #1 follow-up checklist items or replace them with truthful remediation tasks, because `.gitignore` still does not ignore `.cflx/` and the current fix did not make the working tree clean
